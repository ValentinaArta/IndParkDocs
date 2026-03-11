const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

// List notes (newest first)
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, updated_at, created_at FROM notes WHERE created_by = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /notes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single note
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM notes WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /notes/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create note
router.post('/', authenticate, async (req, res) => {
  try {
    var title = req.body.title || 'Новая заметка';
    var content = req.body.content_json || [];
    const { rows } = await pool.query(
      'INSERT INTO notes (title, content_json, created_by) VALUES ($1, $2, $3) RETURNING *',
      [title, JSON.stringify(content), req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST /notes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update note (autosave)
router.put('/:id', authenticate, async (req, res) => {
  try {
    var title = req.body.title;
    var content = req.body.content_json;
    const { rows } = await pool.query(
      'UPDATE notes SET title = COALESCE($1, title), content_json = COALESCE($2, content_json), updated_at = NOW() WHERE id = $3 AND created_by = $4 RETURNING id, title, updated_at',
      [title, content ? JSON.stringify(content) : null, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /notes/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete note
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM notes WHERE id = $1 AND created_by = $2',
      [req.params.id, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /notes/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
