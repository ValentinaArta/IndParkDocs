/**
 * AI Chat endpoint tests
 * Мокаем глобальный fetch — не ходим в реальный Anthropic API
 */
require('./setup');

process.env.ANTHROPIC_API_KEY = 'test-key-for-tests';

const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
jest.mock('../src/db', () => ({ query: mockQuery }));
jest.mock('../src/middleware/audit', () => ({ logAction: jest.fn().mockResolvedValue(undefined) }));

const request = require('supertest');
const app = require('../src/index');
const { generateAccessToken } = require('../src/middleware/auth');

function adminToken() {
  return generateAccessToken({ id: 1, username: 'admin', role: 'admin' });
}

// Фейковый ответ Anthropic API (без tool_use — просто текст)
const ANTHROPIC_TEXT_RESPONSE = {
  id: 'msg_test123',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'В системе 42 договора аренды.' }],
  stop_reason: 'end_turn',
  model: 'claude-haiku-4-5',
  usage: { input_tokens: 100, output_tokens: 20 },
};

function mockFetchSuccess(body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  });
}

function mockFetchError(status = 500) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ error: { message: 'API error' } }),
  });
}

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] }); // дефолт для всех запросов
});

afterEach(() => {
  if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
  delete global.fetch;
});

// ─── Auth guard ───────────────────────────────────────────────────────────────
describe('AI Chat — авторизация', () => {
  it('POST /api/ai/chat → 401 без токена', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'Привет', user_id: 1 });

    expect(res.status).toBe(401);
  });

  it('GET /api/ai/chat/messages → 401 без токена', async () => {
    const res = await request(app).get('/api/ai/chat/messages');
    expect(res.status).toBe(401);
  });

  it('GET /api/ai/chat/pending → 401 без токена', async () => {
    const res = await request(app).get('/api/ai/chat/pending');
    expect(res.status).toBe(401);
  });
});

// ─── Валидация входных данных ────────────────────────────────────────────────
describe('POST /api/ai/chat — валидация', () => {
  it('возвращает 400 при пустом message', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ message: '', user_id: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('возвращает 400 без поля message', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ user_id: 1 });

    expect(res.status).toBe(400);
  });

  it('возвращает 400 для message из одних пробелов', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ message: '   ', user_id: 1 });

    expect(res.status).toBe(400);
  });
});

// ─── Успешный ответ ───────────────────────────────────────────────────────────
describe('POST /api/ai/chat — успешный ответ', () => {
  it('возвращает ответ ассистента', async () => {
    mockFetchSuccess(ANTHROPIC_TEXT_RESPONSE);

    // Мокаем сохранение сообщений в БД
    mockQuery.mockImplementation((sql) => {
      if (typeof sql === 'string' && (sql.includes('INSERT') || sql.includes('SELECT'))) {
        return Promise.resolve({
          rows: [{ id: 1, content: 'В системе 42 договора аренды.', created_at: new Date().toISOString() }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ message: 'Сколько договоров в системе?', user_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reply');
    expect(res.body.reply).toHaveProperty('content');
    expect(typeof res.body.reply.content).toBe('string');
    expect(res.body.reply.content.length).toBeGreaterThan(0);
  });

  it('возвращает структуру с user_id и reply', async () => {
    mockFetchSuccess(ANTHROPIC_TEXT_RESPONSE);

    mockQuery.mockImplementation(() =>
      Promise.resolve({ rows: [{ id: 1, content: 'Ответ', created_at: new Date().toISOString() }] })
    );

    const res = await request(app)
      .post('/api/ai/chat')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ message: 'Тест', user_id: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user_id');
    expect(res.body).toHaveProperty('reply');
    expect(res.body.reply).toHaveProperty('id');
    expect(res.body.reply).toHaveProperty('created_at');
  });
});

// ─── История сообщений ────────────────────────────────────────────────────────
describe('GET /api/ai/chat/messages', () => {
  it('возвращает историю сообщений в формате { messages: [] }', async () => {
    const msgs = [
      { id: 1, content: 'Привет', role: 'user', created_at: '2026-03-01T10:00:00Z' },
      { id: 2, content: 'Здравствуйте!', role: 'assistant', created_at: '2026-03-01T10:00:01Z' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: msgs });

    const res = await request(app)
      .get('/api/ai/chat/messages')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('messages');
    expect(Array.isArray(res.body.messages)).toBe(true);
  });
});
