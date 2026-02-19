const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticate, authorize, generateAccessToken, generateRefreshToken, JWT_SECRET } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { authLimiter } = require('../middleware/rateLimiter');
const { logAction } = require('../middleware/audit');

const router = express.Router();

// POST /api/auth/login
router.post('/login', authLimiter, validate(schemas.login), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE username=$1 AND deleted_at IS NULL', [username]);
  if (rows.length === 0) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Save refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)', [user.id, refreshToken, expiresAt]);

  await logAction(user.id, 'login', 'user', user.id, null, req.ip);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name }
  });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Токен не предоставлен' });

  const { rows } = await pool.query('SELECT * FROM refresh_tokens WHERE token=$1 AND expires_at > NOW()', [refreshToken]);
  if (rows.length === 0) return res.status(401).json({ error: 'Токен истёк или недействителен' });

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const { rows: users } = await pool.query('SELECT * FROM users WHERE id=$1 AND deleted_at IS NULL', [payload.id]);
    if (users.length === 0) return res.status(401).json({ error: 'Пользователь не найден' });

    const newAccessToken = generateAccessToken(users[0]);
    res.json({ accessToken: newAccessToken });
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
}));

// POST /api/auth/logout
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await pool.query('DELETE FROM refresh_tokens WHERE token=$1', [refreshToken]);
  }
  res.json({ ok: true });
}));

// POST /api/auth/register (admin only)
router.post('/register', authenticate, authorize('admin'), validate(schemas.register), asyncHandler(async (req, res) => {
  const { username, password, role, display_name } = req.body;
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    'INSERT INTO users (username, password_hash, role, display_name) VALUES ($1,$2,$3,$4) RETURNING id, username, role, display_name',
    [username, hash, role, display_name || null]
  );
  await logAction(req.user.id, 'create_user', 'user', rows[0].id, { username, role }, req.ip);
  res.status(201).json(rows[0]);
}));

// POST /api/auth/change-password
router.post('/change-password', authenticate, validate(schemas.changePassword), asyncHandler(async (req, res) => {
  const { old_password, new_password } = req.body;
  const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });

  const valid = await bcrypt.compare(old_password, rows[0].password_hash);
  if (!valid) return res.status(400).json({ error: 'Неверный текущий пароль' });

  const hash = await bcrypt.hash(new_password, 12);
  await pool.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
  await logAction(req.user.id, 'change_password', 'user', req.user.id, null, req.ip);
  res.json({ ok: true });
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT id, username, role, display_name FROM users WHERE id=$1 AND deleted_at IS NULL', [req.user.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(rows[0]);
}));

// GET /api/auth/users (admin only)
router.get('/users', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT id, username, role, display_name, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at');
  res.json(rows);
}));

module.exports = router;
