/**
 * Floorplan routes tests
 * Покрывает: GET /api/buildings/:id/room-status, PUT /api/buildings/:id/floor-plans
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
describe('Floorplan endpoints — авторизация', () => {
  it('GET /api/buildings/1/room-status → 401 без токена', async () => {
    const res = await request(app).get('/api/buildings/1/room-status');
    expect(res.status).toBe(401);
  });

  it('PUT /api/buildings/1/floor-plans → 401 без токена', async () => {
    const res = await request(app).put('/api/buildings/1/floor-plans').send({});
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/buildings/:id/room-status ──────────────────────────────────────
describe('GET /api/buildings/:id/room-status', () => {
  it('возвращает 400 для невалидного id', async () => {
    const res = await request(app)
      .get('/api/buildings/abc/room-status')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
  });

  it('возвращает пустой массив если нет помещений', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .get('/api/buildings/1/room-status')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('возвращает помещения с полем status', async () => {
    mockQuery
      // rooms query
      .mockResolvedValueOnce({
        rows: [{ id: 10, name: 'Цех 1', properties: { object_type: 'Производство' } }],
      })
      // own companies
      .mockResolvedValueOnce({ rows: [] })
      // contracts for rooms
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/buildings/1/room-status')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('room_id', 10);
    expect(res.body[0]).toHaveProperty('status');
    expect(['available', 'rented', 'tech']).toContain(res.body[0].status);
  });
});

// ─── PUT /api/buildings/:id/floor-plans ──────────────────────────────────────
describe('PUT /api/buildings/:id/floor-plans', () => {
  it('возвращает 400 если floor_plans не массив', async () => {
    const res = await request(app)
      .put('/api/buildings/1/floor-plans')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ floor_plans: 'not-array' });
    expect(res.status).toBe(400);
  });

  it('возвращает 400 без body', async () => {
    const res = await request(app)
      .put('/api/buildings/1/floor-plans')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('сохраняет floor_plans и возвращает ok', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const floorPlans = [{ file_id: 1, polygons: [] }];
    const res = await request(app)
      .put('/api/buildings/1/floor-plans')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ floor_plans: floorPlans });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });
});
