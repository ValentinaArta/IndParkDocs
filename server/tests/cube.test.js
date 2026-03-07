/**
 * Cube (OLAP) routes tests
 * Покрывает: POST /api/cube/query, GET /api/cube/filter-values, /drilldown
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

// ─── Auth guard ───────────────────────────────────────────────────────────────
describe('Cube endpoints — авторизация', () => {
  it('POST /api/cube/query → 401 без токена', async () => {
    const res = await request(app).post('/api/cube/query').send({});
    expect(res.status).toBe(401);
  });

  it('GET /api/cube/filter-values → 401 без токена', async () => {
    const res = await request(app).get('/api/cube/filter-values');
    expect(res.status).toBe(401);
  });

  it('GET /api/cube/drilldown → 401 без токена', async () => {
    const res = await request(app).get('/api/cube/drilldown');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/cube/query ────────────────────────────────────────────────────
describe('POST /api/cube/query', () => {
  it('возвращает 400 без rowDims/colDims', async () => {
    const res = await request(app)
      .post('/api/cube/query')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('возвращает 400 для неизвестного dimension', async () => {
    const res = await request(app)
      .post('/api/cube/query')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ rowDims: ['unknown_field'], colDims: ['doc_status'] });
    expect(res.status).toBe(400);
  });

  it('возвращает 200 с корректными rowDims и colDims', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .post('/api/cube/query')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ rowDims: ['contract_type'], colDims: ['doc_status'] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rowDims');
    expect(res.body).toHaveProperty('colDims');
  });
});

// ─── GET /api/cube/filter-values ─────────────────────────────────────────────
describe('GET /api/cube/filter-values', () => {
  it('возвращает объект с contract_types и doc_statuses', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ contract_types: ['Аренды', 'Подряда'], doc_statuses: ['Подписан'] }],
    });
    const res = await request(app)
      .get('/api/cube/filter-values')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contract_types');
    expect(res.body).toHaveProperty('doc_statuses');
  });

  it('возвращает дефолтный объект при пустом результате', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .get('/api/cube/filter-values')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('contract_types');
  });
});

// ─── GET /api/cube/drilldown ─────────────────────────────────────────────────
describe('GET /api/cube/drilldown', () => {
  it('возвращает пустой массив без ids', async () => {
    const res = await request(app)
      .get('/api/cube/drilldown')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('возвращает данные для указанных contractIds', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ id: 1, name: 'Договор №1', type_name: 'contract', contract_type: 'Аренды' }],
    });
    const res = await request(app)
      .get('/api/cube/drilldown?contractIds=1,2')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
