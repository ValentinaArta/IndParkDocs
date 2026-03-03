/**
 * Relations CRUD tests
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
function viewerToken() {
  return generateAccessToken({ id: 2, username: 'viewer', role: 'viewer' });
}

const SAMPLE_RELATION = {
  id: 1,
  from_entity_id: 10,
  to_entity_id: 20,
  relation_type: 'party_to',
  properties: {},
  created_at: '2026-01-01T00:00:00Z',
};

const SAMPLE_TYPE = {
  id: 1,
  name: 'party_to',
  name_ru: 'Является стороной договора',
  color: '#6366F1',
};

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
});

// ─── GET /relations/types ──────────────────────────────────────────────────
describe('GET /api/relations/types', () => {
  it('возвращает массив типов связей', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [SAMPLE_TYPE] });

    const res = await request(app)
      .get('/api/relations/types')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('name');
    }
  });

  it('возвращает 401 без авторизации', async () => {
    const res = await request(app).get('/api/relations/types');
    expect(res.status).toBe(401);
  });
});

// ─── POST /relations ───────────────────────────────────────────────────────
describe('POST /api/relations', () => {
  it('создаёт связь (admin)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [SAMPLE_RELATION] });

    const res = await request(app)
      .post('/api/relations')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ from_entity_id: 10, to_entity_id: 20, relation_type: 'party_to', properties: {} });

    expect(res.status).toBe(201);
    expect(res.body.relation_type).toBe('party_to');
    expect(res.body.from_entity_id).toBe(10);
    expect(res.body.to_entity_id).toBe(20);
  });

  it('создаёт связь (editor)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [SAMPLE_RELATION] });
    const editorToken = generateAccessToken({ id: 3, username: 'editor', role: 'editor' });

    const res = await request(app)
      .post('/api/relations')
      .set('Authorization', 'Bearer ' + editorToken)
      .send({ from_entity_id: 10, to_entity_id: 20, relation_type: 'party_to', properties: {} });

    expect(res.status).toBe(201);
  });

  it('запрещает viewer создавать связи', async () => {
    const res = await request(app)
      .post('/api/relations')
      .set('Authorization', 'Bearer ' + viewerToken())
      .send({ from_entity_id: 10, to_entity_id: 20, relation_type: 'party_to', properties: {} });

    expect(res.status).toBe(403);
  });

  it('возвращает 400 при отсутствии обязательных полей', async () => {
    const res = await request(app)
      .post('/api/relations')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ from_entity_id: 10 }); // нет to_entity_id и relation_type

    expect(res.status).toBe(400);
  });

  it('возвращает 400 без relation_type', async () => {
    const res = await request(app)
      .post('/api/relations')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ from_entity_id: 10, to_entity_id: 20 });

    expect(res.status).toBe(400);
  });

  it('возвращает 401 без авторизации', async () => {
    const res = await request(app)
      .post('/api/relations')
      .send({ from_entity_id: 10, to_entity_id: 20, relation_type: 'party_to', properties: {} });

    expect(res.status).toBe(401);
  });
});

// ─── DELETE /relations/:id ─────────────────────────────────────────────────
describe('DELETE /api/relations/:id', () => {
  it('мягко удаляет связь (admin)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/relations/1')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('возвращает 404 для несуществующей связи', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/relations/9999')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(404);
  });

  it('запрещает viewer удалять связи', async () => {
    const res = await request(app)
      .delete('/api/relations/1')
      .set('Authorization', 'Bearer ' + viewerToken());

    expect(res.status).toBe(403);
  });

  it('возвращает 401 без авторизации', async () => {
    const res = await request(app).delete('/api/relations/1');
    expect(res.status).toBe(401);
  });
});
