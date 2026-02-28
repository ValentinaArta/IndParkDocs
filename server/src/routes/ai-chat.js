const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

// POST /api/ai/chat — send a message
router.post('/', authenticate, async (req, res) => {
  try {
    const { message, session_id } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message required' });
    
    const sid = session_id || 'default';
    
    // Save user message
    const result = await pool.query(
      'INSERT INTO ai_messages (session_id, role, content) VALUES ($1, $2, $3) RETURNING id, created_at',
      [sid, 'user', message.trim()]
    );
    
    res.json({ id: result.rows[0].id, created_at: result.rows[0].created_at });
  } catch (e) {
    console.error('AI chat error:', e.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/ai/chat/messages — poll for messages
router.get('/messages', authenticate, async (req, res) => {
  try {
    const sid = req.query.session_id || 'default';
    const after = parseInt(req.query.after) || 0;
    
    const result = await pool.query(
      'SELECT id, role, content, metadata, created_at FROM ai_messages WHERE session_id = $1 AND id > $2 ORDER BY id ASC LIMIT 50',
      [sid, after]
    );
    
    res.json({ messages: result.rows });
  } catch (e) {
    console.error('AI chat poll error:', e.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/ai/chat/history — full history
router.get('/history', authenticate, async (req, res) => {
  try {
    const sid = req.query.session_id || 'default';
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    
    const result = await pool.query(
      'SELECT id, role, content, metadata, created_at FROM ai_messages WHERE session_id = $1 ORDER BY id DESC LIMIT $2',
      [sid, limit]
    );
    
    res.json({ messages: result.rows.reverse() });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/ai/chat/respond — AI responds (called by agent)
router.post('/respond', authenticate, async (req, res) => {
  try {
    const { message, session_id, metadata } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    
    const sid = session_id || 'default';
    const meta = metadata || {};
    
    const result = await pool.query(
      'INSERT INTO ai_messages (session_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
      [sid, 'assistant', message, JSON.stringify(meta)]
    );
    
    res.json({ id: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/ai/chat/pending — get unanswered user messages (for agent polling)
router.get('/pending', authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.session_id, m.content, m.created_at
      FROM ai_messages m
      WHERE m.role = 'user'
        AND NOT EXISTS (
          SELECT 1 FROM ai_messages a 
          WHERE a.session_id = m.session_id 
            AND a.role = 'assistant' 
            AND a.id > m.id
        )
      ORDER BY m.created_at ASC
      LIMIT 10
    `);
    res.json({ pending: result.rows });
  } catch (e) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
