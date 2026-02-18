require('dotenv').config({ path: __dirname + '/../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Serve inline frontend
const FRONTEND_HTML = require('./frontend');
app.get('/', (req, res) => { res.type('html').send(FRONTEND_HTML); });

// ============ ENTITY TYPES ============

app.get('/api/entity-types', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM entity_types ORDER BY sort_order');
  res.json(rows);
});

app.post('/api/entity-types', async (req, res) => {
  const { name, name_ru, icon, color } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO entity_types (name, name_ru, icon, color) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, name_ru, icon || '📄', color || '#6366F1']
  );
  res.json(rows[0]);
});

app.put('/api/entity-types/:id', async (req, res) => {
  const { name_ru, icon, color } = req.body;
  const { rows } = await pool.query(
    'UPDATE entity_types SET name_ru=$1, icon=$2, color=$3 WHERE id=$4 RETURNING *',
    [name_ru, icon, color, req.params.id]
  );
  res.json(rows[0]);
});

// ============ FIELD DEFINITIONS ============

app.get('/api/entity-types/:typeId/fields', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM field_definitions WHERE entity_type_id=$1 ORDER BY sort_order',
    [req.params.typeId]
  );
  res.json(rows);
});

app.post('/api/entity-types/:typeId/fields', async (req, res) => {
  const { name, name_ru, field_type, options, required } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, required) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.params.typeId, name, name_ru, field_type || 'text', options || null, required || false]
  );
  res.json(rows[0]);
});

app.delete('/api/field-definitions/:id', async (req, res) => {
  await pool.query('DELETE FROM field_definitions WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ============ ENTITIES ============

app.get('/api/entities', async (req, res) => {
  const { type, parent_id, search } = req.query;
  let sql = `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color,
    p.name as parent_name
    FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id
    LEFT JOIN entities p ON e.parent_id = p.id
    WHERE 1=1`;
  const params = [];

  if (type) {
    params.push(type);
    sql += ` AND et.name = $${params.length}`;
  }
  if (parent_id) {
    params.push(parent_id);
    sql += ` AND e.parent_id = $${params.length}`;
  }
  if (search) {
    params.push('%' + search + '%');
    sql += ` AND (e.name ILIKE $${params.length} OR e.properties::text ILIKE $${params.length})`;
  }
  sql += ' ORDER BY e.name';
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

app.get('/api/entities/:id', async (req, res) => {
  // Entity with type info
  const { rows: [entity] } = await pool.query(
    `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color
    FROM entities e JOIN entity_types et ON e.entity_type_id = et.id WHERE e.id=$1`,
    [req.params.id]
  );
  if (!entity) return res.status(404).json({ error: 'Not found' });

  // Children
  const { rows: children } = await pool.query(
    `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color
    FROM entities e JOIN entity_types et ON e.entity_type_id = et.id
    WHERE e.parent_id=$1 ORDER BY e.name`,
    [req.params.id]
  );

  // Relations (both directions)
  const { rows: relations } = await pool.query(
    `SELECT r.*,
      fe.name as from_name, fet.icon as from_icon, fet.name_ru as from_type_ru,
      te.name as to_name, tet.icon as to_icon, tet.name_ru as to_type_ru,
      rt.name_ru as relation_name_ru, rt.color as relation_color
    FROM relations r
    JOIN entities fe ON r.from_entity_id = fe.id
    JOIN entity_types fet ON fe.entity_type_id = fet.id
    JOIN entities te ON r.to_entity_id = te.id
    JOIN entity_types tet ON te.entity_type_id = tet.id
    LEFT JOIN relation_types rt ON r.relation_type = rt.name
    WHERE r.from_entity_id=$1 OR r.to_entity_id=$1
    ORDER BY r.created_at DESC`,
    [req.params.id]
  );

  // Parent chain
  let parent = null;
  if (entity.parent_id) {
    const { rows: [p] } = await pool.query(
      `SELECT e.*, et.icon, et.name_ru as type_name_ru FROM entities e JOIN entity_types et ON e.entity_type_id = et.id WHERE e.id=$1`,
      [entity.parent_id]
    );
    parent = p;
  }

  // Field definitions
  const { rows: fields } = await pool.query(
    'SELECT * FROM field_definitions WHERE entity_type_id=$1 ORDER BY sort_order',
    [entity.entity_type_id]
  );

  res.json({ ...entity, children, relations, parent, fields });
});

app.post('/api/entities', async (req, res) => {
  const { entity_type_id, name, properties, parent_id } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO entities (entity_type_id, name, properties, parent_id) VALUES ($1,$2,$3,$4) RETURNING *',
    [entity_type_id, name, properties || {}, parent_id || null]
  );
  res.json(rows[0]);
});

app.put('/api/entities/:id', async (req, res) => {
  const { name, properties, parent_id } = req.body;
  const { rows } = await pool.query(
    'UPDATE entities SET name=$1, properties=$2, parent_id=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
    [name, properties, parent_id || null, req.params.id]
  );
  res.json(rows[0]);
});

app.delete('/api/entities/:id', async (req, res) => {
  await pool.query('DELETE FROM entities WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ============ RELATIONS ============

app.get('/api/relation-types', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM relation_types ORDER BY name_ru');
  res.json(rows);
});

app.post('/api/relation-types', async (req, res) => {
  const { name, name_ru, color } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO relation_types (name, name_ru, color) VALUES ($1,$2,$3) RETURNING *',
    [name, name_ru, color || '#94A3AF']
  );
  res.json(rows[0]);
});

app.post('/api/relations', async (req, res) => {
  const { from_entity_id, to_entity_id, relation_type, properties } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO relations (from_entity_id, to_entity_id, relation_type, properties) VALUES ($1,$2,$3,$4) RETURNING *',
    [from_entity_id, to_entity_id, relation_type, properties || {}]
  );
  res.json(rows[0]);
});

app.delete('/api/relations/:id', async (req, res) => {
  await pool.query('DELETE FROM relations WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ============ STATS ============

app.get('/api/stats', async (req, res) => {
  const { rows: typeCounts } = await pool.query(
    `SELECT et.name, et.name_ru, et.icon, et.color, COUNT(e.id)::int as count
    FROM entity_types et LEFT JOIN entities e ON et.id = e.entity_type_id
    GROUP BY et.id ORDER BY et.sort_order`
  );
  const { rows: [{ count: relationCount }] } = await pool.query('SELECT COUNT(*)::int as count FROM relations');
  res.json({ types: typeCounts, totalRelations: relationCount });
});

// SPA fallback
app.get('*', (req, res) => { res.type('html').send(FRONTEND_HTML); });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`IndParkDocs API running on port ${PORT}`));
