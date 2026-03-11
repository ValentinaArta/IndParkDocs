/**
 * Notes CRUD API tests
 * Mocked DB pool — no real database required.
 */
require('./setup');

const mockQuery = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
jest.mock('../src/db', () => ({ query: mockQuery }));
jest.mock('../src/middleware/audit', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/index');
const { generateAccessToken } = require('../src/middleware/auth');

function userToken(id) {
  return generateAccessToken({ id: id || 1, username: 'testuser', role: 'admin' });
}

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ========== GET /api/notes ==========
describe('GET /api/notes', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(401);
  });

  it('returns empty list', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', 'Bearer ' + userToken());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns notes sorted by updated_at DESC', async () => {
    var notes = [
      { id: 2, title: 'Second', updated_at: '2026-03-11T10:00:00Z', created_at: '2026-03-11T09:00:00Z' },
      { id: 1, title: 'First', updated_at: '2026-03-11T09:00:00Z', created_at: '2026-03-11T08:00:00Z' },
    ];
    mockQuery.mockResolvedValue({ rows: notes });
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', 'Bearer ' + userToken());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe(2);
  });

  it('filters by created_by = user.id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await request(app)
      .get('/api/notes')
      .set('Authorization', 'Bearer ' + userToken(42));
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('created_by'),
      [42]
    );
  });
});

// ========== GET /api/notes/:id ==========
describe('GET /api/notes/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/notes/1');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent note', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .get('/api/notes/999')
      .set('Authorization', 'Bearer ' + userToken());
    expect(res.status).toBe(404);
  });

  it('returns note with content_json', async () => {
    var note = {
      id: 1, title: 'Test', content_json: [{ type: 'text', value: 'Hello' }],
      created_by: 1, created_at: '2026-03-11T09:00:00Z', updated_at: '2026-03-11T09:00:00Z'
    };
    mockQuery.mockResolvedValue({ rows: [note] });
    const res = await request(app)
      .get('/api/notes/1')
      .set('Authorization', 'Bearer ' + userToken());
    expect(res.status).toBe(200);
    expect(res.body.content_json).toEqual([{ type: 'text', value: 'Hello' }]);
  });

  it('queries with both note id and user id', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await request(app)
      .get('/api/notes/5')
      .set('Authorization', 'Bearer ' + userToken(3));
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('id = $1'),
      ['5', 3]
    );
  });
});

// ========== POST /api/notes ==========
describe('POST /api/notes', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/notes').send({ title: 'X' });
    expect(res.status).toBe(401);
  });

  it('creates note with title and content', async () => {
    var created = { id: 1, title: 'My Note', content_json: [{ type: 'text', value: '' }], created_by: 1 };
    mockQuery.mockResolvedValue({ rows: [created] });
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', 'Bearer ' + userToken())
      .send({ title: 'My Note', content_json: [{ type: 'text', value: '' }] });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('My Note');
  });

  it('uses default title when not provided', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, title: 'Новая заметка' }] });
    await request(app)
      .post('/api/notes')
      .set('Authorization', 'Bearer ' + userToken())
      .send({});
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      ['Новая заметка', '[]', 1]
    );
  });

  it('passes created_by from token', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }] });
    await request(app)
      .post('/api/notes')
      .set('Authorization', 'Bearer ' + userToken(7))
      .send({ title: 'Test' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      expect.arrayContaining([7])
    );
  });
});

// ========== PUT /api/notes/:id ==========
describe('PUT /api/notes/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).put('/api/notes/1').send({ title: 'X' });
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent note', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const res = await request(app)
      .put('/api/notes/999')
      .set('Authorization', 'Bearer ' + userToken())
      .send({ title: 'Updated' });
    expect(res.status).toBe(404);
  });

  it('updates title and content', async () => {
    var updated = { id: 1, title: 'Updated', updated_at: '2026-03-11T10:00:00Z' };
    mockQuery.mockResolvedValue({ rows: [updated] });
    const res = await request(app)
      .put('/api/notes/1')
      .set('Authorization', 'Bearer ' + userToken())
      .send({ title: 'Updated', content_json: [{ type: 'text', value: 'new' }] });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  it('uses COALESCE for partial updates (title only)', async () => {
    mockQuery.mockResolvedValue({ rows: [{ id: 1, title: 'New Title' }] });
    await request(app)
      .put('/api/notes/1')
      .set('Authorization', 'Bearer ' + userToken())
      .send({ title: 'New Title' });
    // content should be null (COALESCE keeps existing)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('COALESCE'),
      ['New Title', null, '1', 1]
    );
  });

  it('checks ownership (created_by = user.id)', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await request(app)
      .put('/api/notes/5')
      .set('Authorization', 'Bearer ' + userToken(3))
      .send({ title: 'X' });
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('created_by = $4'),
      expect.arrayContaining([3])
    );
  });
});

// ========== DELETE /api/notes/:id ==========
describe('DELETE /api/notes/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/notes/1');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent note', async () => {
    mockQuery.mockResolvedValue({ rowCount: 0 });
    const res = await request(app)
      .delete('/api/notes/999')
      .set('Authorization', 'Bearer ' + userToken());
    expect(res.status).toBe(404);
  });

  it('deletes note and returns ok', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 });
    const res = await request(app)
      .delete('/api/notes/1')
      .set('Authorization', 'Bearer ' + userToken());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('checks ownership on delete', async () => {
    mockQuery.mockResolvedValue({ rowCount: 1 });
    await request(app)
      .delete('/api/notes/5')
      .set('Authorization', 'Bearer ' + userToken(3));
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('DELETE'),
      ['5', 3]
    );
  });
});

// ========== Frontend ==========
describe('Notes frontend', () => {
  it('notes-page.js is included in frontend HTML', () => {
    const html = require('../src/frontend/index.js');
    expect(html).toContain('showNotesPage');
    expect(html).toContain('_noteCreate');
    expect(html).toContain('_noteOpen');
    expect(html).toContain('_noteSaveNow');
  });

  it('sidebar contains Заметки link', () => {
    const html = require('../src/frontend/index.js');
    expect(html).toContain('notebook-pen');
    expect(html).toContain('Заметки');
  });

  it('nav.js routes #notes hash', () => {
    const nav = require('../src/frontend/pages/nav.js');
    expect(nav).toContain("'#notes'");
    expect(nav).toContain('showNotesPage');
  });

  it('supports text, drawing, and image block types', () => {
    const page = require('../src/frontend/pages/notes-page.js');
    expect(page).toContain('"text"');
    expect(page).toContain('"drawing"');
    expect(page).toContain('"image"');
  });

  it('has autosave with debounce', () => {
    const page = require('../src/frontend/pages/notes-page.js');
    expect(page).toContain('_noteSaveTimer');
    expect(page).toContain('setTimeout');
    expect(page).toContain('3000');
  });

  it('has drawing tools (pen, eraser, color, size)', () => {
    const page = require('../src/frontend/pages/notes-page.js');
    expect(page).toContain('_noteSetDrawTool');
    expect(page).toContain('_noteSetDrawColor');
    expect(page).toContain('_noteSetDrawSize');
    expect(page).toContain('eraser');
  });

  it('handles clipboard image paste', () => {
    const page = require('../src/frontend/pages/notes-page.js');
    expect(page).toContain('_noteHandlePaste');
    expect(page).toContain('clipboardData');
    expect(page).toContain('readAsDataURL');
  });

  it('uses correct api() call signature (opts object)', () => {
    const page = require('../src/frontend/pages/notes-page.js');
    // Should use { method: "POST", body: ... } not positional args
    expect(page).toContain('{ method: "POST"');
    expect(page).toContain('{ method: "PUT"');
    expect(page).toContain('{ method: "DELETE" }');
  });
});

// ========== Migration ==========
describe('Migration 057 (notes)', () => {
  it('creates notes table', async () => {
    var calls = [];
    var fakePool = { query: function(sql) { calls.push(sql); return Promise.resolve({ rows: [] }); } };
    var migration = require('../src/migrations/057_notes');
    await migration(fakePool);
    var allSql = calls.join(' ');
    expect(allSql).toContain('CREATE TABLE IF NOT EXISTS notes');
    expect(allSql).toContain('content_json JSONB');
    expect(allSql).toContain('created_by INTEGER');
    expect(allSql).toContain('idx_notes_created_by');
    expect(allSql).toContain('idx_notes_updated_at');
  });
});
