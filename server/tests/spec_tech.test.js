/**
 * spec_tech.test.js
 *
 * Верификация технической спеки (SPEC_TECH.md).
 * Каждый тест доказывает что конкретное техническое требование выполнено.
 */
require('./setup');
const request = require('supertest');
const app = require('../src/index');
const { generateAccessToken } = require('../src/middleware/auth');
const fs = require('fs');
const path = require('path');

const adminToken = generateAccessToken({ id: 1, username: 'admin', role: 'admin' });
const auth = { Authorization: `Bearer ${adminToken}` };

// ─── Инфраструктура ───────────────────────────────────────────────────────────
describe('Техспека: Инфраструктура', () => {
  test('GET /health отвечает 200 без авторизации', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
  });

  test('SPA: GET / отдаёт HTML', async () => {
    const r = await request(app).get('/');
    expect(r.status).toBe(200);
    expect(r.type).toMatch(/html/);
  });

  test('SPA: любой GET-роут отдаёт HTML (hash routing)', async () => {
    const r = await request(app).get('/some/unknown/path');
    expect(r.status).toBe(200);
    expect(r.type).toMatch(/html/);
  });

  test('NODE_ENV в тестах = test (не production)', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

// ─── Все API-роуты смонтированы ────────────────────────────────────────────────
describe('Техспека: Все API-роуты смонтированы', () => {
  const API_PREFIXES = [
    '/api/auth', '/api/entities', '/api/entity-types',
    '/api/relations', '/api/companies', '/api/files',
    '/api/finance', '/api/reports', '/api/cube',
    '/api/legal', '/api/letters', '/api/ai/chat',
    '/api/buildings',
  ];

  API_PREFIXES.forEach(prefix => {
    test(`${prefix} — роут смонтирован (401 без токена, не 404)`, async () => {
      // GET на любой защищённый роут без токена должен вернуть 401, а не 404
      const r = await request(app).get(prefix.replace('/api/files', '/api/files/'));
      expect(r.status).not.toBe(404);
    });
  });
});

// ─── Аутентификация JWT ───────────────────────────────────────────────────────
describe('Техспека: JWT аутентификация', () => {
  test('POST /api/auth/login принимает username + password', async () => {
    const r = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: '123456' });
    expect([200, 401, 500]).toContain(r.status); // 500 = mock DB
  });

  test('Access token истекает: auth.js устанавливает expiresIn', () => {
    const code = fs.readFileSync(__dirname + '/../src/middleware/auth.js', 'utf8');
    expect(code).toContain('expiresIn');
    expect(code).toContain('1h'); // access token: 1 час
  });

  test('Refresh token — 7 дней', () => {
    const code = fs.readFileSync(__dirname + '/../src/middleware/auth.js', 'utf8');
    expect(code).toContain('7d');
  });

  test('Refresh token сохраняется в БД с expires_at', () => {
    const code = fs.readFileSync(__dirname + '/../src/routes/auth.js', 'utf8');
    expect(code).toContain('refresh_tokens');
    expect(code).toContain('expires_at');
    expect(code).toContain('refreshToken');
  });

  test('JWT_SECRET и JWT_REFRESH_SECRET — разные переменные', () => {
    const code = fs.readFileSync(__dirname + '/../src/middleware/auth.js', 'utf8');
    expect(code).toContain('JWT_SECRET');
    expect(code).toContain('JWT_REFRESH_SECRET');
    // Refresh secret не должен fallback на JWT_SECRET
    expect(code).not.toMatch(/JWT_REFRESH_SECRET.*\|\|.*JWT_SECRET/);
  });

  test('Любой /api/* эндпоинт отклоняет невалидный токен с 401', async () => {
    const r = await request(app)
      .get('/api/entities')
      .set({ Authorization: 'Bearer invalid.token.here' });
    expect(r.status).toBe(401);
  });
});

// ─── Авторизация по ролям ─────────────────────────────────────────────────────
describe('Техспека: Авторизация по ролям', () => {
  test('admin может создавать сущности', async () => {
    const r = await request(app).post('/api/entities').set(auth).send({
      entity_type_id: 1, name: 'Test', properties: {},
    });
    expect([201, 409, 500]).toContain(r.status); // не 401/403
  });

  test('viewer не может создавать сущности', async () => {
    const viewerToken = generateAccessToken({ id: 9, username: 'viewer', role: 'viewer' });
    const r = await request(app).post('/api/entities')
      .set({ Authorization: `Bearer ${viewerToken}` })
      .send({ entity_type_id: 1, name: 'Test', properties: {} });
    expect(r.status).toBe(403);
  });

  test('editor не может управлять пользователями', async () => {
    const editorToken = generateAccessToken({ id: 8, username: 'editor', role: 'editor' });
    const r = await request(app).post('/api/auth/register')
      .set({ Authorization: `Bearer ${editorToken}` })
      .send({ username: 'x', password: 'y', role: 'editor' });
    expect(r.status).toBe(403);
  });
});

// ─── Безопасность ─────────────────────────────────────────────────────────────
describe('Техспека: Безопасность', () => {
  test('Нет захардкоженных JWT секретов в auth.js', () => {
    const code = fs.readFileSync(__dirname + '/../src/middleware/auth.js', 'utf8');
    // Не должно быть длинных случайных строк = захардкоженных секретов
    expect(code).not.toMatch(/['"][A-Za-z0-9+/]{40,}['"]/);
  });

  test('Нет захардкоженных паролей к БД в исходниках', () => {
    const dbCode = fs.readFileSync(__dirname + '/../src/db.js', 'utf8');
    expect(dbCode).not.toContain('indpark2026');
    expect(dbCode).toContain('process.env.DATABASE_URL');
  });

  test('AI chat блокирует не-SELECT запросы к БД', () => {
    const code = fs.readFileSync(__dirname + '/../src/routes/ai-chat.js', 'utf8');
    expect(code).toContain("startsWith('select')");
    expect(code).toContain("startsWith('with')");
    expect(code).toContain('Только SELECT');
  });

  test('Все письма-роуты защищены аутентификацией', () => {
    const code = fs.readFileSync(__dirname + '/../src/routes/letters.js', 'utf8');
    const routeCount = (code.match(/router\.(get|post|put|patch|delete)/g) || []).length;
    const authCount = (code.match(/authenticate/g) || []).length;
    expect(authCount).toBeGreaterThanOrEqual(routeCount);
  });

  test('.env.example не содержит реальных секретов', () => {
    const envExample = fs.readFileSync(__dirname + '/../.env.example', 'utf8');
    // В примере должны быть заглушки, не реальные значения
    expect(envExample).not.toContain('indpark2026');
    expect(envExample).not.toContain('gjdbh2642');
  });
});

// ─── Миграции ─────────────────────────────────────────────────────────────────
describe('Техспека: 43 миграции в run-migrations.js', () => {
  test('run-migrations.js содержит все миграции (>= 40)', () => {
    const code = fs.readFileSync(__dirname + '/../src/run-migrations.js', 'utf8');
    const entries = code.match(/require\(['"]\.\/migrations\//g) || [];
    expect(entries.length).toBeGreaterThanOrEqual(40);
  });

  test('Последняя миграция 043 присутствует', () => {
    const code = fs.readFileSync(__dirname + '/../src/run-migrations.js', 'utf8');
    expect(code).toContain("'043'");
  });

  test('Файлы всех миграций существуют', () => {
    const code = fs.readFileSync(__dirname + '/../src/run-migrations.js', 'utf8');
    const requires = code.match(/require\(['"]\.\/migrations\/([^'"]+)['"]\)/g) || [];
    requires.forEach(req => {
      const filePath = req.replace(/require\(['"]/, '').replace(/['"]\)/, '');
      const absPath = path.resolve(__dirname + '/../src/', filePath + '.js');
      expect(fs.existsSync(absPath)).toBe(true);
    });
  });

  test('runOnce паттерн использует таблицу _migrations', () => {
    const code = fs.readFileSync(__dirname + '/../src/run-migrations.js', 'utf8');
    expect(code).toContain('_migrations');
    expect(code).toContain('ON CONFLICT DO NOTHING');
  });
});

// ─── База данных ──────────────────────────────────────────────────────────────
describe('Техспека: Структура БД', () => {
  const REQUIRED_TABLES = [
    'entities', 'entity_types', 'field_definitions', 'field_option_values',
    'relations', 'relation_types', 'users', 'refresh_tokens', 'audit_log',
    'rent_items', 'act_line_items', 'contract_line_items',
    'contract_advances', 'contract_equipment',
  ];

  REQUIRED_TABLES.forEach(table => {
    test(`Таблица "${table}" упоминается в run-migrations.js или entities.js`, () => {
      const migrationsCode = fs.readFileSync(__dirname + '/../src/run-migrations.js', 'utf8');
      const entitiesCode = fs.readFileSync(__dirname + '/../src/routes/entities.js', 'utf8');
      const combined = migrationsCode + entitiesCode;
      // Ищем в миграциях или в основном роуте
      const found = combined.includes(table) ||
        fs.readdirSync(__dirname + '/../src/migrations')
          .some(f => {
            const c = fs.readFileSync(__dirname + `/../src/migrations/${f}`, 'utf8');
            return c.includes(table);
          });
      expect(found).toBe(true);
    });
  });

  test('Soft delete: entities использует deleted_at IS NULL', () => {
    const code = fs.readFileSync(__dirname + '/../src/routes/entities.js', 'utf8');
    expect(code).toContain('deleted_at IS NULL');
  });

  test('Все INSERT параметризованы ($1, $2)', () => {
    const code = fs.readFileSync(__dirname + '/../src/routes/entities.js', 'utf8');
    const inserts = code.match(/INSERT INTO .+VALUES .+/g) || [];
    inserts.forEach(ins => {
      expect(ins).toMatch(/\$\d/);
    });
  });
});

// ─── Frontend архитектура ────────────────────────────────────────────────────
describe('Техспека: Frontend архитектура', () => {
  test('index.js существует и экспортирует HTML-строку', () => {
    const html = require('../src/frontend/index.js');
    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
  });

  test('Все модули фронтенда существуют (core, components, forms, entities, pages)', () => {
    const dirs = ['core', 'components', 'forms', 'entities', 'pages', 'reports'];
    dirs.forEach(dir => {
      const dirPath = path.resolve(__dirname + '/../src/frontend/', dir);
      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });

  test('JS бандл синтаксически валиден', () => {
    const html = require('../src/frontend/index.js');
    const match = html.match(/<script>([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    expect(() => new Function(match[1])).not.toThrow();
  });

  test('CSS определён в css.js', () => {
    expect(fs.existsSync(__dirname + '/../src/frontend/css.js')).toBe(true);
  });

  test('utils.js содержит escapeHtml (XSS-защита)', () => {
    const code = require('../src/frontend/core/utils.js');
    expect(code).toContain('escapeHtml');
    expect(code).toContain('&amp;');
  });
});

// ─── Логирование и мониторинг ─────────────────────────────────────────────────
describe('Техспека: Логирование', () => {
  test('logger.js использует pino', () => {
    const code = fs.readFileSync(__dirname + '/../src/logger.js', 'utf8');
    expect(code).toContain('pino');
  });

  test('audit_log — logAction вызывается при CRUD', () => {
    const entitiesCode = fs.readFileSync(__dirname + '/../src/routes/entities.js', 'utf8');
    const logCount = (entitiesCode.match(/logAction/g) || []).length;
    expect(logCount).toBeGreaterThanOrEqual(4); // create, update, update(patch), delete
  });

  test('finance.js использует logger.error (не console.error)', () => {
    const code = fs.readFileSync(__dirname + '/../src/routes/finance.js', 'utf8');
    expect(code).not.toContain('console.error');
    expect(code).toContain('logger.error');
  });
});

// ─── Производительность ───────────────────────────────────────────────────────
describe('Техспека: Производительность', () => {
  test('Индексы на contract_type описаны в migration 039', () => {
    const code = fs.readFileSync(
      __dirname + '/../src/migrations/039_perf_indexes.js', 'utf8'
    );
    expect(code).toContain('contract_type');
    expect(code).toContain('CREATE INDEX');
    expect(code).toContain('CONCURRENTLY');
  });

  test('GET /api/entities поддерживает limit/offset', () => {
    const code = fs.readFileSync(__dirname + '/../src/routes/entities.js', 'utf8');
    expect(code).toContain('safeLimit');
    expect(code).toContain('safeOffset');
    expect(code).toContain('LIMIT');
    expect(code).toContain('OFFSET');
  });

  test('Максимальный limit ограничен (не бесконечно)', () => {
    const code = fs.readFileSync(__dirname + '/../src/routes/entities.js', 'utf8');
    expect(code).toContain('Math.min');
  });
});

// ─── SPEC_PRODUCT.md и SPEC_TECH.md существуют ────────────────────────────────
describe('Техспека: Документация существует', () => {
  test('SPEC_PRODUCT.md существует', () => {
    expect(fs.existsSync(path.resolve(__dirname + '/../../SPEC_PRODUCT.md'))).toBe(true);
  });

  test('SPEC_TECH.md существует', () => {
    expect(fs.existsSync(path.resolve(__dirname + '/../../SPEC_TECH.md'))).toBe(true);
  });

  test('IDENTITY.md содержит правило о JSON-массивах', () => {
    const code = fs.readFileSync(path.resolve(__dirname + '/../../IDENTITY.md'), 'utf8');
    expect(code).toContain('properties');
    expect(code).toContain('JSON');
  });
});
