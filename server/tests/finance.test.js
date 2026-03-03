/**
 * Finance routes tests
 *
 * - /api/finance/overdue, /summary, /expenses — зависят от 1С OData (мокаем http)
 * - /api/finance/budget — зависит только от PostgreSQL (мокаем db)
 */
require('./setup');

// ─── Мок http — симулирует недоступность 1С ─────────────────────────────────
// Переопределяем только http.get, остальное берём из реального модуля
jest.mock('http', () => {
  const actual = jest.requireActual('http');
  const { EventEmitter } = require('events');
  return {
    ...actual,
    get: jest.fn((url, opts, cb) => {
      const req = new EventEmitter();
      req.setTimeout = jest.fn();
      req.destroy = jest.fn();
      // Немедленно ECONNREFUSED — 1С недоступна
      setImmediate(() => req.emit('error', new Error('ECONNREFUSED')));
      return req;
    }),
  };
});

// ─── Мок DB ──────────────────────────────────────────────────────────────────
const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
jest.mock('../src/db', () => ({ query: mockQuery }));
jest.mock('../src/middleware/audit', () => ({ logAction: jest.fn().mockResolvedValue(undefined) }));

const request = require('supertest');
const app = require('../src/index');
const { generateAccessToken } = require('../src/middleware/auth');

function adminToken() {
  return generateAccessToken({ id: 1, username: 'admin', role: 'admin' });
}

// Строка бюджета для мока
const BUDGET_ROW = {
  article: 'ИТОГО ЦФО',
  level: 0,
  fact: Array(12).fill(500000),
  plan: Array(12).fill(500000),
  total_fact: 6000000,
  total_plan: 6000000,
};

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
});

// ─── Auth guard — все finance endpoints требуют авторизации ─────────────────
describe('Finance endpoints — авторизация', () => {
  const endpoints = [
    '/api/finance/overdue',
    '/api/finance/summary',
    '/api/finance/expenses',
    '/api/finance/budget?cfo=%D0%98%D0%9F',
    '/api/finance/budget/meta',
  ];

  endpoints.forEach(url => {
    it(`GET ${url} → 401 без токена`, async () => {
      const res = await request(app).get(url);
      expect(res.status).toBe(401);
    });
  });
});

// ─── /api/finance/budget ─────────────────────────────────────────────────────
describe('GET /api/finance/budget', () => {
  it('возвращает 400 без параметра cfo', async () => {
    const res = await request(app)
      .get('/api/finance/budget')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('cfo');
  });

  it('возвращает 404 когда нет данных для cfo', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // пустой результат

    const res = await request(app)
      .get('/api/finance/budget?cfo=НЕСУЩЕСТВУЮЩИЙ')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(404);
  });

  it('возвращает корректную структуру бюджета', async () => {
    // Первый запрос — данные бюджета, второй — список cfo
    mockQuery
      .mockResolvedValueOnce({ rows: [BUDGET_ROW] })
      .mockResolvedValueOnce({ rows: [{ cfo: 'ИП' }, { cfo: 'ЭК' }] });

    const res = await request(app)
      .get('/api/finance/budget?cfo=%D0%98%D0%9F') // ИП
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('months');
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('cfo');
    expect(res.body).toHaveProperty('current_month');
    expect(res.body).toHaveProperty('cfos_available');

    // months — 12 элементов
    expect(res.body.months).toHaveLength(12);
    expect(res.body.months[0]).toHaveProperty('name');
    expect(res.body.months[0]).toHaveProperty('is_past');

    // data содержит строки с blended/deviation
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).toHaveProperty('article');
    expect(res.body.data[0]).toHaveProperty('blended_total');
    expect(res.body.data[0]).toHaveProperty('plan_total');
    expect(res.body.data[0]).toHaveProperty('deviation');
    expect(res.body.data[0]).toHaveProperty('deviation_pct');
  });

  it('blended = факт для прошлых месяцев, план для будущих', async () => {
    const now = new Date();
    const currentMonth = now.getMonth();

    // Факт 100, план 200 для каждого месяца
    const row = {
      article: 'Тест',
      level: 1,
      fact: Array(12).fill(100),
      plan: Array(12).fill(200),
      total_fact: 1200,
      total_plan: 2400,
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [{ cfo: 'ИП' }] });

    const res = await request(app)
      .get('/api/finance/budget?cfo=%D0%98%D0%9F')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    const d = res.body.data[0];

    // Прошлые месяцы должны содержать факт (100), будущие — план (200)
    for (let i = 0; i < 12; i++) {
      if (i < currentMonth) {
        expect(d.blended[i]).toBe(100);
      } else {
        expect(d.blended[i]).toBe(200);
      }
    }
  });
});

// ─── /api/finance/budget/meta ─────────────────────────────────────────────────
describe('GET /api/finance/budget/meta', () => {
  it('возвращает объект с типами бюджетов и ЦФО', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { budget_type: 'БДР', cfos: ['ИП', 'ЭК'] },
        { budget_type: 'БДДС', cfos: ['ИП', 'ЭК'] },
      ],
    });

    const res = await request(app)
      .get('/api/finance/budget/meta')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });
});

// ─── 1С-зависимые endpoints — должны возвращать 503 когда 1С недоступна ──────
describe('Finance endpoints — обработка ошибки 1С', () => {
  // http.get замокан выше — всегда ECONNREFUSED

  it('GET /api/finance/overdue → 503 когда 1С недоступна', async () => {
    const res = await request(app)
      .get('/api/finance/overdue')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('error');
  }, 10000); // timeout 10s

  it('GET /api/finance/summary → 503 когда 1С недоступна', async () => {
    const res = await request(app)
      .get('/api/finance/summary')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(503);
  }, 10000);

  it('GET /api/finance/expenses → 503 когда 1С недоступна', async () => {
    const res = await request(app)
      .get('/api/finance/expenses')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(503);
  }, 10000);
});
