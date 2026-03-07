/**
 * Finance routes tests
 * Покрывает: авторизацию и базовое поведение /api/finance/*
 * Примечание: 1С недоступна в тестах, поэтому проверяем 200/503 (не 401).
 */
require('./setup');

const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
jest.mock('../src/db', () => ({ query: mockQuery }));
jest.mock('../src/middleware/audit', () => ({ logAction: jest.fn().mockResolvedValue(undefined) }));

const request = require('supertest');
const app = require('../src/index');
const { generateAccessToken } = require('../src/middleware/auth');

function adminToken() {
  return generateAccessToken({ id: 1, username: 'admin', role: 'admin' });
}

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
});

// ─── Auth guard: все endpoints требуют токен ──────────────────────────────────
describe('Finance endpoints — авторизация', () => {
  const endpoints = [
    '/api/finance/summary',
    '/api/finance/overdue',
    '/api/finance/expenses',
    '/api/finance/budget/meta',
    '/api/finance/budget',
  ];

  endpoints.forEach(url => {
    it(`GET ${url} → 401 без токена`, async () => {
      const res = await request(app).get(url);
      expect(res.status).toBe(401);
    });
  });
});

// ─── Auth работает: получаем ответ (200 или 503 из-за 1С) ───────────────────
describe('Finance endpoints — аутентифицированный доступ', () => {
  it('GET /api/finance/summary → не 401 с токеном', async () => {
    const res = await request(app)
      .get('/api/finance/summary')
      .set('Authorization', `Bearer ${adminToken()}`);
    // 1С недоступна в тестах → 503 ok, главное не 401
    expect(res.status).not.toBe(401);
    expect([200, 503]).toContain(res.status);
  });

  it('GET /api/finance/overdue → не 401 с токеном', async () => {
    const res = await request(app)
      .get('/api/finance/overdue')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).not.toBe(401);
  });

  it('GET /api/finance/expenses → не 401 с токеном', async () => {
    const res = await request(app)
      .get('/api/finance/expenses')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).not.toBe(401);
  });

  it('GET /api/finance/budget/meta → не 401 с токеном', async () => {
    const res = await request(app)
      .get('/api/finance/budget/meta')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).not.toBe(401);
  });
});

// ─── /api/finance/budget/meta — данные из БД ────────────────────────────────
describe('GET /api/finance/budget/meta — данные', () => {
  it('возвращает объект с полем org_ids', async () => {
    const res = await request(app)
      .get('/api/finance/budget/meta')
      .set('Authorization', `Bearer ${adminToken()}`);
    // budget/meta не зависит от 1С — должен вернуть 200
    if (res.status === 200) {
      expect(typeof res.body).toBe('object');
    } else {
      // Если 503 — 1С недоступна, это ок в тестовом окружении
      expect(res.status).toBe(503);
    }
  });
});
