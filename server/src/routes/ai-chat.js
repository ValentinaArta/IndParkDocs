const express = require('express');
const rateLimit = require('express-rate-limit');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/auth');

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Слишком много запросов к AI. Подождите минуту.' } });

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-5'; // upgraded for AI Sandbox
const DAILY_TOKEN_LIMIT = 300000;

// ─── Системный промпт ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Ты — AI-ассистент встроенный в систему IndParkDocs управляющей компании «АО Индустриальный Парк Звезда» (ИПЗ).

Ты умеешь отвечать на вопросы о:
1. Договорах аренды, субаренды, подряда, обслуживания
2. Помещениях и корпусах парка
3. Оборудовании и его состоянии
4. Компаниях — арендаторах и контрагентах
5. Бюджете 2026 (БДР и БДДС) — факт, план, отклонения
6. Дебиторской задолженности (по данным 1С)

Когда нужны конкретные данные из БД — вызови инструмент run_sql с SQL-запросом.

Структура базы данных:
- entities(id, name, entity_type_id, properties JSONB, parent_id, created_at)
  * entity_type_id ссылается на entity_types(id, name) где name: company, contract, supplement, building, room, equipment, land_plot, act, order, document
  * properties содержит все поля: contract_type, our_legal_entity, contractor_name, rent_objects(JSON), amount, status, equipment_category, inv_number, etc.
- relations(id, from_entity_id, to_entity_id, relation_type) — типы: party_to, located_in, supplement_to, subject_of, on_balance, located_on
- budget_data(id, budget_type, cfo, article, level, fact NUMERIC[12], plan NUMERIC[12], total_fact, total_plan)
  * budget_type: БДР или БДДС; cfo: ИП (ИПЗ) и другие; level 0=итого, 1=раздел, 2=секция, 3=категория, 4=лист
  * fact[0..1] = январь-февраль 2026 (актуальные), plan[2..11] = март-декабрь 2026 (план)

Правила ответов:
- Отвечай кратко и по делу, на русском
- Числа — в миллионах/тысячах с единицами (5.3 млн, 340 тыс)
- Если вопрос требует данных — вызови run_sql ПЕРЕД ответом
- Не придумывай данные; если не знаешь — так и скажи
- Форматируй списки через • для читаемости
- Используй эмодзи умеренно

ВИЗУАЛИЗАЦИИ И ДАШБОРДЫ (Canvas-режим):
Когда пользователь просит визуализацию, дашборд, график, отчёт или таблицу:
1. Сначала получи данные через run_sql
2. Затем верни ПОЛНЫЙ HTML-документ внутри тега <canvas-html>...</canvas-html>
3. HTML должен быть самодостаточным (inline CSS + JS, все данные встроены)
4. Используй Chart.js (CDN: https://cdn.jsdelivr.net/npm/chart.js) для графиков
5. Дизайн: градиенты, тени, плавные анимации, современный премиальный стиль
6. Цветовая палитра: #6366F1 (индиго), #8B5CF6 (фиолетовый), #06B6D4 (циан), #10B981 (зелёный), #F59E0B (янтарь)
7. Шрифт: Inter (подключи через Google Fonts)
8. Карточки с метриками: большие числа, подписи, маленькие иконки, тень
9. Адаптивность: используй CSS Grid и Flexbox
10. Анимации: fade-in при загрузке, hover-эффекты на карточках
11. Тёмный фон (#0F172A) с белым текстом — выглядит премиально
12. Для таблиц: zebra-striping, hover на строках, закруглённые углы

Для простых вопросов без визуализации — отвечай текстом как обычно.`;

// ─── Вызов Anthropic API ─────────────────────────────────────────────────────
async function callClaude(messages, tools = []) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY не настроен');

  const body = {
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages,
  };
  if (tools.length) body.tools = tools;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.status } }));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Выполнить SQL (только SELECT, read-only транзакция) ─────────────────────
async function runSql(sql) {
  const clean = sql.trim().toLowerCase();
  // Блокируем всё кроме SELECT/WITH ... SELECT
  if (!clean.startsWith('select') && !clean.startsWith('with')) {
    throw new Error('Только SELECT запросы разрешены');
  }
  // Блокируем точку с запятой (multi-statement) и опасные ключевые слова
  if (/;/.test(clean)) throw new Error('Multi-statement запросы запрещены');
  if (/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/.test(clean)) {
    throw new Error('Модифицирующие запросы запрещены');
  }
  // Выполняем в read-only транзакции для гарантии
  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION READ ONLY');
    const result = await client.query(sql);
    await client.query('COMMIT');
    return result.rows.slice(0, 50);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// ─── Инструменты для Claude ───────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'run_sql',
    description: 'Выполнить SELECT-запрос к базе данных IndParkDocs. Используй для получения реальных данных о договорах, компаниях, оборудовании, бюджете.',
    input_schema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'SQL SELECT запрос. Только чтение.'
        },
        description: {
          type: 'string',
          description: 'Краткое описание что ищем'
        }
      },
      required: ['sql']
    }
  }
];

// ─── Проверка дневного лимита токенов ─────────────────────────────────────────
async function checkTokenLimit(userId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(tokens_in + tokens_out), 0)::int AS total
     FROM ai_token_usage WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId]
  );
  return result.rows[0].total;
}

async function recordTokenUsage(userId, tokensIn, tokensOut) {
  await pool.query(
    `INSERT INTO ai_token_usage (user_id, date, tokens_in, tokens_out)
     VALUES ($1, CURRENT_DATE, $2, $3)`,
    [userId, tokensIn, tokensOut]
  );
}

// ─── Основная логика ответа ───────────────────────────────────────────────────
async function generateReply(userMessage, sessionId, userId) {
  // Проверяем лимит
  const usedToday = await checkTokenLimit(userId);
  if (usedToday >= DAILY_TOKEN_LIMIT) {
    throw new Error('Дневной лимит токенов исчерпан (300K). Попробуйте завтра.');
  }

  // Загружаем последние 10 сообщений для контекста
  const history = await pool.query(
    `SELECT role, content FROM ai_messages
     WHERE session_id = $1 ORDER BY id DESC LIMIT 10`,
    [sessionId]
  );
  const histMessages = history.rows.reverse().map(r => ({
    role: r.role,
    content: r.content,
  }));
  histMessages.push({ role: 'user', content: userMessage });

  let totalIn = 0, totalOut = 0;

  // Первый вызов Claude
  let response = await callClaude(histMessages, TOOLS);
  totalIn += response.usage?.input_tokens || 0;
  totalOut += response.usage?.output_tokens || 0;

  // Обработка tool_use (может быть несколько шагов)
  let maxSteps = 5;
  while (response.stop_reason === 'tool_use' && maxSteps-- > 0) {
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    const toolResults = [];

    for (const tu of toolUses) {
      if (tu.name === 'run_sql') {
        let result;
        try {
          const rows = await runSql(tu.input.sql);
          result = rows.length === 0
            ? 'Нет данных'
            : JSON.stringify(rows, null, 2);
          if (result.length > 8000) result = result.slice(0, 8000) + '\n...(truncated)';
        } catch (e) {
          result = `Ошибка: ${e.message}`;
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: result,
        });
      }
    }

    histMessages.push({ role: 'assistant', content: response.content });
    histMessages.push({ role: 'user', content: toolResults });
    response = await callClaude(histMessages, TOOLS);
    totalIn += response.usage?.input_tokens || 0;
    totalOut += response.usage?.output_tokens || 0;
  }

  // Записываем использование токенов
  await recordTokenUsage(userId, totalIn, totalOut);

  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock ? textBlock.text : 'Не удалось получить ответ';
}

// ─── POST /api/ai/chat — отправить сообщение и получить ответ ─────────────────
router.post('/', authenticate, aiLimiter, async (req, res) => {
  try {
    const { message, session_id } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });

    const sid = session_id || 'default';

    const userId = req.user?.id || 0;

    // Сохраняем сообщение пользователя
    const userRow = await pool.query(
      'INSERT INTO ai_messages (session_id, role, content, user_id) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
      [sid, 'user', message.trim(), userId]
    );

    // Генерируем ответ
    let replyText;
    try {
      replyText = await generateReply(message.trim(), sid, userId);
    } catch (e) {
      console.error('AI generate error:', e.message);
      replyText = `⚠️ ${e.message}`;
    }

    // Сохраняем ответ ассистента
    const aiRow = await pool.query(
      'INSERT INTO ai_messages (session_id, role, content, user_id) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
      [sid, 'assistant', replyText, userId]
    );

    res.json({
      user_id: userRow.rows[0].id,
      reply: {
        id: aiRow.rows[0].id,
        content: replyText,
        created_at: aiRow.rows[0].created_at,
      }
    });
  } catch (e) {
    console.error('AI chat error:', e.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── GET /api/ai/chat/messages — история сообщений ───────────────────────────
router.get('/messages', authenticate, async (req, res) => {
  try {
    const sid   = req.query.session_id || 'default';
    const after = parseInt(req.query.after) || 0;
    const result = await pool.query(
      'SELECT id, role, content, metadata, created_at FROM ai_messages WHERE session_id=$1 AND id>$2 ORDER BY id ASC LIMIT 50',
      [sid, after]
    );
    res.json({ messages: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── GET /api/ai/chat/history — полная история ───────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  try {
    const sid   = req.query.session_id || 'default';
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const result = await pool.query(
      'SELECT id, role, content, metadata, created_at FROM ai_messages WHERE session_id=$1 ORDER BY id DESC LIMIT $2',
      [sid, limit]
    );
    res.json({ messages: result.rows.reverse() });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── GET /api/ai/chat/pending — для внешних агентов (совместимость) ───────────
router.get('/pending', authenticate, async (req, res) => {
  // Нет pending — ответы генерируются inline
  res.json({ pending: [] });
});

// ─── GET /api/ai/chat/usage — использование токенов за сегодня ────────────────
router.get('/usage', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || 0;
    const used = await checkTokenLimit(userId);
    res.json({ used, limit: DAILY_TOKEN_LIMIT, remaining: Math.max(0, DAILY_TOKEN_LIMIT - used) });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── POST /api/ai/chat/respond — для внешних агентов (совместимость) ─────────
router.post('/respond', authenticate, async (req, res) => {
  try {
    const { message, session_id, metadata } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const sid  = session_id || 'default';
    const meta = metadata || {};
    const result = await pool.query(
      'INSERT INTO ai_messages (session_id, role, content, metadata) VALUES ($1,$2,$3,$4) RETURNING id',
      [sid, 'assistant', message, JSON.stringify(meta)]
    );
    res.json({ id: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
