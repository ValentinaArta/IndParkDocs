/**
 * Auth endpoints tests
 * Uses mocked DB pool — no real database required.
 */
require('./setup');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock the DB pool before requiring the app
const mockQuery = jest.fn().mockResolvedValue({ rows: [] });
jest.mock('../src/db', () => ({ query: mockQuery }));

// Mock audit to avoid DB calls
jest.mock('../src/middleware/audit', () => ({
  logAction: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../src/index');
const { generateAccessToken } = require('../src/middleware/auth');

const TEST_USER = {
  id: 1,
  username: 'testuser',
  password_hash: bcrypt.hashSync('password123', 10),
  role: 'admin',
  display_name: 'Test User',
  deleted_at: null,
};

function adminToken() {
  return generateAccessToken({ id: 1, username: 'testuser', role: 'admin' });
}

beforeEach(() => {
  mockQuery.mockReset();
  mockQuery.mockResolvedValue({ rows: [] });
});

describe('POST /api/auth/login', () => {
  it('returns tokens on valid credentials', async () => {
    mockQuery.mockImplementation((sql) => {
      if (typeof sql === 'string' && sql.includes('FROM users WHERE username')) {
        return Promise.resolve({ rows: [TEST_USER] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.username).toBe('testuser');
  });

  it('returns 401 on wrong password', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TEST_USER] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('returns 400 on missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'x' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns new access token', async () => {
    const refreshToken = jwt.sign(
      { id: 1, username: 'testuser', role: 'admin' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    mockQuery
      .mockResolvedValueOnce({ rows: [{ token: refreshToken }] }) // SELECT refresh_token
      .mockResolvedValueOnce({ rows: [TEST_USER] });              // SELECT user

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('returns 401 on expired/missing token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'expired-token' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when no token provided', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  it('deletes refresh token and returns ok', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // DELETE refresh_token

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ refreshToken: 'some-token' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/register', () => {
  it('creates user (admin only)', async () => {
    const newUser = { id: 2, username: 'newuser', role: 'viewer', display_name: null };
    mockQuery.mockResolvedValueOnce({ rows: [newUser] }); // INSERT

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ username: 'newuser', password: 'secure123', role: 'viewer' });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe('newuser');
  });

  it('returns 403 for non-admin', async () => {
    const viewerToken = generateAccessToken({ id: 2, username: 'viewer', role: 'viewer' });

    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', 'Bearer ' + viewerToken)
      .send({ username: 'newuser', password: 'secure123', role: 'viewer' });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/auth/change-password', () => {
  it('changes password with correct old password', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [TEST_USER] })   // SELECT user
      .mockResolvedValueOnce({ rows: [] });            // UPDATE

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ old_password: 'password123', new_password: 'newpass456' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 400 on wrong old password', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [TEST_USER] });

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', 'Bearer ' + adminToken())
      .send({ old_password: 'wrong', new_password: 'newpass456' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('returns current user info', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, username: 'testuser', role: 'admin', display_name: 'Test User' }],
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer ' + adminToken());

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('testuser');
    expect(res.body.role).toBe('admin');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
