const express = require('express');
const { generateSecret, generateURI, verifySync } = require('otplib');
const QRCode = require('qrcode');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/auth/totp/setup — generate secret + QR code
router.get('/setup', authenticate, asyncHandler(async (req, res) => {
  const secret = generateSecret();
  const otpauth = generateURI({ issuer: 'IndParkDocs', label: req.user.username, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  // Save secret temporarily (not enabled yet)
  await pool.query('UPDATE users SET totp_secret=$1 WHERE id=$2', [secret, req.user.id]);

  res.json({ secret, qrDataUrl });
}));

// POST /api/auth/totp/verify — verify code and enable TOTP
router.post('/verify', authenticate, asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Введите код' });

  const { rows } = await pool.query('SELECT totp_secret FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]?.totp_secret) return res.status(400).json({ error: 'Сначала настройте TOTP' });

  const result = verifySync({ token: code, secret: rows[0].totp_secret });
  if (!result.valid) return res.status(400).json({ error: 'Неверный код. Попробуйте ещё раз.' });

  await pool.query('UPDATE users SET totp_enabled=true WHERE id=$1', [req.user.id]);
  res.json({ success: true, message: '2FA включена' });
}));

// POST /api/auth/totp/disable — disable TOTP
router.post('/disable', authenticate, asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Введите текущий код для отключения' });

  const { rows } = await pool.query('SELECT totp_secret FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]?.totp_secret) return res.status(400).json({ error: 'TOTP не настроен' });

  const result = verifySync({ token: code, secret: rows[0].totp_secret });
  if (!result.valid) return res.status(400).json({ error: 'Неверный код' });

  await pool.query('UPDATE users SET totp_enabled=false, totp_secret=NULL WHERE id=$1', [req.user.id]);
  res.json({ success: true, message: '2FA отключена' });
}));

// GET /api/auth/totp/status — check if TOTP is enabled for current user
router.get('/status', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT totp_enabled FROM users WHERE id=$1', [req.user.id]);
  res.json({ enabled: rows[0]?.totp_enabled || false });
}));

module.exports = router;
