const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/auth');

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-haiku-4-5'; // быстрая модель для чата

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
- Используй эмодзи умеренно`;

// ─── Вызов Anthropic API ─────────────────────────────────────────────────────
async function callClaude(messages, tools = []) {
  if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_API_KEY не настроен');

  const body = {
    model: MODEL,
    max_tokens: 1024,
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

// ─── Выполнить SQL (только SELECT) ───────────────────────────────────────────
async function runSql(sql) {
  // Безопасность: только SELECT
  const clean = sql.trim().toLowerCase();
  if (!clean.startsWith('select') && !clean.startsWith('with')) {
    throw new Error('Только SELECT запросы разрешены');
  }
  const result = await pool.query(sql);
  // Возвращаем не более 50 строк
  return result.rows.slice(0, 50);
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

// ─── Основная логика ответа ───────────────────────────────────────────────────
async function generateReply(userMessage, sessionId) {
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
  // Добавляем текущее сообщение
  histMessages.push({ role: 'user', content: userMessage });

  // Первый вызов Claude
  let response = await callClaude(histMessages, TOOLS);

  // Обработка tool_use (может быть несколько шагов)
  let maxSteps = 3;
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
          if (result.length > 4000) result = result.slice(0, 4000) + '\n...(truncated)';
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

    // Продолжаем диалог с результатами инструментов
    histMessages.push({ role: 'assistant', content: response.content });
    histMessages.push({ role: 'user', content: toolResults });
    response = await callClaude(histMessages, TOOLS);
  }

  // Извлекаем текст ответа
  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock ? textBlock.text : 'Не удалось получить ответ';
}

// ─── POST /api/ai/chat — отправить сообщение и получить ответ ─────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { message, session_id } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });

    const sid = session_id || 'default';

    // Сохраняем сообщение пользователя
    const userRow = await pool.query(
      'INSERT INTO ai_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, created_at',
      [sid, 'user', message.trim()]
    );

    // Генерируем ответ
    let replyText;
    try {
      replyText = await generateReply(message.trim(), sid);
    } catch (e) {
      console.error('AI generate error:', e.message);
      replyText = `⚠️ Ошибка ИИ: ${e.message}`;
    }

    // Сохраняем ответ ассистента
    const aiRow = await pool.query(
      'INSERT INTO ai_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, created_at',
      [sid, 'assistant', replyText]
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
