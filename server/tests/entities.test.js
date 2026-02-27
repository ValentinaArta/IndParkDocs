/**
 * Entities CRUD tests
 * Uses mocked DB pool — no real database required.
 */
require('./setup');

const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
jest.mock('../src/db', () => ({ query: mockQuery }));
jest.mock('../src/middleware/audit', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/index');
const { generateAccessToken } = require('../src/middleware/auth');

function adminToken() {
  return generateAccessToken({ id: 1, username: 'admin', role: 'admin' });
}
function viewerToken() {
  return generateAccessToken({ id: 2, username: 'viewer', role: 'viewer' });
}

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
});

const SAMPLE_ENTITY = {
  id: 10,
  name: 'Test Building',
  entity_type_id: 1,
  properties: { address: '123 Main St' },
  parent_id: null,
  type_name: 'building',
  type_name_ru: 'Корпус',
  icon: '🏢',
  color: '#6366F1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
};

describe('GET /api/entities', () => {
  it('returns entity list', async () => {
    mockQuery.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.includes('FROM entities e')) {
        return Promise.resolve({ rows: [SAMPLE_ENTITY] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .get('/api/entities?type=building')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].name).toBe('Test Building');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/entities');
    expect(res.status).toBe(401);
  });

  it('supports search filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/entities?type=building&search=test')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    // Verify search param was passed to query
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toContain('ILIKE');
  });
});

describe('GET /api/entities/:id', () => {
  it('returns entity with children and relations', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [SAMPLE_ENTITY] })  // entity
      .mockResolvedValueOnce({ rows: [] })                 // children
      .mockResolvedValueOnce({ rows: [] })                 // relations
      .mockResolvedValueOnce({ rows: [] });                // fields

    const res = await request(app)
      .get('/api/entities/10')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test Building');
    expect(res.body).toHaveProperty('children');
    expect(res.body).toHaveProperty('relations');
  });

  it('returns 404 for non-existent entity', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/entities/9999')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid ID', async () => {
    const res = await request(app)
      .get('/api/entities/abc')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(400);
  });
});

describe('POST /api/entities', () => {
  it('creates entity', async () => {
    const created = { ...SAMPLE_ENTITY, id: 11 };
    mockQuery
      .mockResolvedValueOnce({ rows: [] })                 // dup check
      .mockResolvedValueOnce({ rows: [created] })          // INSERT
      .mockResolvedValueOnce({ rows: [{ name: 'building' }] }); // type lookup for autoLink

    const res = await request(app)
      .post('/api/entities')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ entity_type_id: 1, name: 'New Building', properties: {} });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(11);
  });

  it('returns 409 on duplicate name', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, name: 'Test Building' }] });

    const res = await request(app)
      .post('/api/entities')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ entity_type_id: 1, name: 'Test Building', properties: {} });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('duplicate');
  });

  it('returns 403 for viewer role', async () => {
    const res = await request(app)
      .post('/api/entities')
      .set('Authorization', 'Bearer ' + viewerToken())
      .send({ entity_type_id: 1, name: 'Building', properties: {} });

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/entities/:id', () => {
  it('updates entity', async () => {
    const updated = { ...SAMPLE_ENTITY, name: 'Updated' };
    mockQuery.mockResolvedValueOnce({ rows: [updated] }); // UPDATE

    const res = await request(app)
      .put('/api/entities/10')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated');
  });

  it('returns 404 for non-existent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/entities/9999')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ name: 'X' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/entities/:id', () => {
  it('soft-deletes entity', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, name: 'Test' }] });

    const res = await request(app)
      .delete('/api/entities/10')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 404 for already deleted', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/entities/10')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(404);
  });

  it('returns 403 for viewer', async () => {
    const res = await request(app)
      .delete('/api/entities/10')
      .set('Authorization', 'Bearer ' + viewerToken());

    expect(res.status).toBe(403);
  });
});
