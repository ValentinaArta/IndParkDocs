/**
 * letters.js — API routes for letter topics and letter-specific queries
 *
 * GET  /api/letter-topics         — list all topics
 * POST /api/letter-topics         — create a new topic
 * GET  /api/letters/by-topic/:topicId — letters filtered by topic (for fire-safety page)
 */
const { Router } = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = Router();

// ── GET /api/letter-topics ──────────────────────────────────────────────────
router.get('/letter-topics', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, sort_order FROM letter_topics ORDER BY sort_order, name'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/letter-topics ─────────────────────────────────────────────────
router.post('/letter-topics', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
    const { rows } = await db.query(
      'INSERT INTO letter_topics (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING *',
      [name.trim()]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/letters/by-topic/:topicName ────────────────────────────────────
// Returns letters filtered by topic name, optionally filtered by company IDs
// Query params: ?companies=11,12,63 (comma-separated company IDs)
router.get('/letters/by-topic/:topicName', authenticate, async (req, res) => {
  try {
    const topicName = req.params.topicName;
    const companyIds = req.query.companies
      ? req.query.companies.split(',').map(Number).filter(Boolean)
      : [];

    let query = `
      SELECT e.id, e.name, e.properties, e.created_at,
        COALESCE(
          (SELECT json_agg(json_build_object('id',ef.id,'filename',ef.original_name,'size',ef.size))
           FROM entity_files ef WHERE ef.entity_id = e.id), '[]'
        ) as files
      FROM entities e
      WHERE e.entity_type_id = (SELECT id FROM entity_types WHERE name = 'letter')
        AND e.deleted_at IS NULL
        AND e.properties->>'topic_name' = $1
    `;
    const params = [topicName];

    if (companyIds.length > 0) {
      // Filter: from_company_id or to_company_id is one of the given companies
      query += ` AND (
        (e.properties->>'from_company_id')::int = ANY($2)
        OR (e.properties->>'to_company_id')::int = ANY($2)
      )`;
      params.push(companyIds);
    }

    query += ` ORDER BY e.properties->>'letter_date' ASC, e.created_at ASC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/letters/tenants/:companyId ─────────────────────────────────────
// Returns tenants/subtenants for a given company (from contracts)
router.get('/letters/tenants/:companyId', authenticate, async (req, res) => {
  try {
    const companyId = req.params.companyId;
    const { rows } = await db.query(`
      SELECT DISTINCT
        COALESCE(
          CASE WHEN properties->>'contractor_id' = $1 THEN properties->>'subtenant_id'
               ELSE properties->>'contractor_id' END,
          ''
        ) as tenant_id,
        COALESCE(
          CASE WHEN properties->>'contractor_id' = $1 THEN properties->>'subtenant_name'
               ELSE properties->>'contractor_name' END,
          ''
        ) as tenant_name
      FROM entities
      WHERE entity_type_id = (SELECT id FROM entity_types WHERE name = 'contract')
        AND deleted_at IS NULL
        AND (properties->>'contractor_id' = $1 OR properties->>'subtenant_id' IS NOT NULL)
        AND (properties->>'contract_type' IN ('Аренды', 'Субаренды'))
      ORDER BY tenant_name
    `, [companyId]);
    res.json(rows.filter(r => r.tenant_id && r.tenant_name));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
