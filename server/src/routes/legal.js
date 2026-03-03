const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// ========== ZACHETY ==========

// GET /api/legal/zachety — list all with line totals
router.get('/zachety', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT z.*,
      (SELECT COALESCE(SUM(l.amount),0) FROM legal_zachety_lines l WHERE l.zachet_id=z.id AND l.section='before' AND l.direction='ip_owes_pao') as before_ip_owes,
      (SELECT COALESCE(SUM(l.amount),0) FROM legal_zachety_lines l WHERE l.zachet_id=z.id AND l.section='before' AND l.direction='pao_owes_ip') as before_pao_owes
    FROM legal_zachety z ORDER BY z.date DESC NULLS LAST, z.id DESC
  `);
  res.json(rows);
}));

// GET /api/legal/zachety/:id — get one with lines
router.get('/zachety/:id', authenticate, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM legal_zachety WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Не найдено' });
  const zachet = rows[0];
  const lines = await pool.query('SELECT * FROM legal_zachety_lines WHERE zachet_id=$1 ORDER BY section, direction, sort_order', [zachet.id]);
  zachet.lines = lines.rows;
  res.json(zachet);
}));

// POST /api/legal/zachety — create with lines
router.post('/zachety', authenticate, asyncHandler(async (req, res) => {
  const { number, date, zachet_amount, status, comment, lines } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO legal_zachety (number, date, zachet_amount, status, comment, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [number, date, zachet_amount, status || 'черновик', comment, req.user.id]
    );
    const zachet = rows[0];
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await client.query(
          `INSERT INTO legal_zachety_lines (zachet_id, section, direction, contract_name, amount, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [zachet.id, l.section, l.direction, l.contract_name, l.amount, i]
        );
      }
    }
    await client.query('COMMIT');
    zachet.lines = lines || [];
    res.json(zachet);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// PUT /api/legal/zachety/:id — update with lines
router.put('/zachety/:id', authenticate, asyncHandler(async (req, res) => {
  const { number, date, zachet_amount, status, comment, lines } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `UPDATE legal_zachety SET number=$1, date=$2, zachet_amount=$3, status=$4, comment=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [number, date, zachet_amount, status, comment, req.params.id]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Не найдено' }); }
    // Replace lines
    await client.query('DELETE FROM legal_zachety_lines WHERE zachet_id=$1', [req.params.id]);
    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await client.query(
          `INSERT INTO legal_zachety_lines (zachet_id, section, direction, contract_name, amount, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [req.params.id, l.section, l.direction, l.contract_name, l.amount, i]
        );
      }
    }
    await client.query('COMMIT');
    rows[0].lines = lines || [];
    res.json(rows[0]);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}));

// DELETE /api/legal/zachety/:id
router.delete('/zachety/:id', authenticate, asyncHandler(async (req, res) => {
  await pool.query('DELETE FROM legal_zachety WHERE id=$1', [req.params.id]);
  res.json({ success: true });
}));

// ========== CONTRACT REGISTRY ==========

// GET /api/legal/contracts — search
router.get('/contracts', authenticate, asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  const { rows } = await pool.query(
    `SELECT * FROM legal_contracts WHERE number ILIKE $1 OR name ILIKE $1 ORDER BY number LIMIT 20`,
    ['%' + q + '%']
  );
  res.json(rows);
}));

// POST /api/legal/contracts — add new
router.post('/contracts', authenticate, asyncHandler(async (req, res) => {
  const { number, name, counterparty } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO legal_contracts (number, name, counterparty) VALUES ($1,$2,$3) RETURNING *`,
    [number, name || null, counterparty || 'ПАО Звезда']
  );
  res.json(rows[0]);
}));

module.exports = router;
