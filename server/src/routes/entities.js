const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAction } = require('../middleware/audit');
const xss = require('xss');

const router = express.Router();

function sanitizeObj(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    clean[k] = typeof v === 'string' ? xss(v) : v;
  }
  return clean;
}

// GET /api/entities
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { type, parent_id, search, limit = 50, offset = 0 } = req.query;
  const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);

  let sql = `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color,
    p.name as parent_name,
    (SELECT lp.name FROM relations r
     JOIN entities lp ON r.to_entity_id = lp.id
     WHERE r.from_entity_id = e.id AND r.relation_type = 'located_on'
       AND lp.deleted_at IS NULL LIMIT 1) as land_plot_name,
    (SELECT string_agg(COALESCE(NULLIF(b.properties->>'short_name',''), b.name), ', ' ORDER BY b.name)
     FROM relations r
     JOIN entities b ON r.from_entity_id = b.id
     JOIN entity_types bet ON b.entity_type_id = bet.id
     WHERE r.to_entity_id = e.id AND r.relation_type = 'located_on'
       AND bet.name IN ('building','workshop') AND b.deleted_at IS NULL) as buildings_on_plot,
    (SELECT c.properties->>'contractor_name'
     FROM relations r JOIN entities c ON r.to_entity_id = c.id
     JOIN entity_types ct ON c.entity_type_id = ct.id
     WHERE r.from_entity_id = e.id AND r.relation_type = 'subject_of'
       AND ct.name = 'contract'
       AND c.properties->>'contract_type' IN ('Аренды','Субаренды')
       AND c.deleted_at IS NULL LIMIT 1) as equipment_tenant
    FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id
    LEFT JOIN entities p ON e.parent_id = p.id
    WHERE e.deleted_at IS NULL`;
  const params = [];

  if (type) {
    params.push(type);
    sql += ` AND et.name = $${params.length}`;
  }
  if (parent_id) {
    params.push(parseInt(parent_id));
    sql += ` AND e.parent_id = $${params.length}`;
  }
  if (search) {
    const pi = params.push('%' + search.replace(/[%_]/g, '\\$&') + '%');
    sql += ` AND (e.name ILIKE $${pi}
      OR e.properties->>'subtenant_name' ILIKE $${pi}
      OR e.properties->>'contractor_name' ILIKE $${pi}
      OR e.properties->>'our_legal_entity' ILIKE $${pi}
      OR e.properties->>'contractor_role_label' ILIKE $${pi})`;
  }
  if (req.query.is_own === 'true') {
    sql += ` AND (e.properties->>'is_own' = 'true')`;
  } else if (req.query.is_own === 'false') {
    sql += ` AND (e.properties->>'is_own' IS DISTINCT FROM 'true')`;
  }
  sql += ' ORDER BY e.name';
  params.push(safeLimit);
  sql += ` LIMIT $${params.length}`;
  params.push(safeOffset);
  sql += ` OFFSET $${params.length}`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
}));

// GET /api/entities/:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) return res.status(400).json({ error: 'Неверный ID' });

  const { rows: [entity] } = await pool.query(
    `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color
    FROM entities e JOIN entity_types et ON e.entity_type_id = et.id
    WHERE e.id=$1 AND e.deleted_at IS NULL`, [id]
  );
  if (!entity) return res.status(404).json({ error: 'Не найдено' });

  const { rows: children } = await pool.query(
    `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color
    FROM entities e JOIN entity_types et ON e.entity_type_id = et.id
    WHERE e.parent_id=$1 AND e.deleted_at IS NULL ORDER BY e.name`, [id]
  );

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
    WHERE (r.from_entity_id=$1 OR r.to_entity_id=$1) AND r.deleted_at IS NULL
    ORDER BY r.created_at DESC`, [id]
  );

  // Full ancestry chain via recursive CTE (root → ... → direct parent)
  let ancestry = [];
  if (entity.parent_id) {
    const { rows: ancestryRows } = await pool.query(
      `WITH RECURSIVE anc AS (
        SELECT e.id, e.name, e.parent_id, et.icon, et.name_ru as type_name_ru, 0 as depth
        FROM entities e JOIN entity_types et ON e.entity_type_id = et.id
        WHERE e.id = $1 AND e.deleted_at IS NULL
        UNION ALL
        SELECT e.id, e.name, e.parent_id, et.icon, et.name_ru as type_name_ru, a.depth + 1
        FROM entities e JOIN entity_types et ON e.entity_type_id = et.id
        JOIN anc a ON a.parent_id = e.id
        WHERE e.deleted_at IS NULL AND a.depth < 20
      )
      SELECT * FROM anc ORDER BY depth DESC`,
      [entity.parent_id]
    );
    ancestry = ancestryRows; // ordered root-first
  }
  const parent = ancestry.length > 0 ? ancestry[ancestry.length - 1] : null;

  const { rows: fields } = await pool.query(
    'SELECT * FROM field_definitions WHERE entity_type_id=$1 ORDER BY sort_order',
    [entity.entity_type_id]
  );

  res.json({ ...entity, children, relations, parent, ancestry, fields });
}));

// Auto-create relations from entity properties (contract → company, building, etc.)
async function autoLinkEntities(entityId, entityTypeName, properties) {
  if (!properties || (entityTypeName !== 'contract' && entityTypeName !== 'supplement' && entityTypeName !== 'act')) return;

  // Handle act: link to parent contract + link equipment items
  if (entityTypeName === 'act') {
    if (properties.parent_contract_id) {
      const cid = parseInt(properties.parent_contract_id);
      if (cid) {
        await pool.query(
          'INSERT INTO relations (from_entity_id, to_entity_id, relation_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
          [entityId, cid, 'supplement_to']
        ).catch(() => {});
      }
    }
    if (properties.act_items) {
      let items = [];
      try { items = typeof properties.act_items === 'string' ? JSON.parse(properties.act_items) : properties.act_items; } catch(e) {}
      for (const item of (Array.isArray(items) ? items : [])) {
        if (item.equipment_id) {
          await pool.query(
            'INSERT INTO relations (from_entity_id, to_entity_id, relation_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [parseInt(item.equipment_id), entityId, 'subject_of']
          ).catch(() => {});
        }
      }
    }
    return;
  }

  // Map: property name → { relation_type, entity_id_field }
  const linkMap = [
    { prop: 'our_legal_entity_id', relType: 'party_to' },
    { prop: 'contractor_id', relType: 'party_to' },
    { prop: 'subtenant_id', relType: 'party_to' },
  ];

  for (const link of linkMap) {
    const targetId = parseInt(properties[link.prop]);
    if (!targetId) continue;
    // Upsert relation
    await pool.query(
      `INSERT INTO relations (from_entity_id, to_entity_id, relation_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (from_entity_id, to_entity_id, relation_type) DO NOTHING`,
      [entityId, targetId, link.relType]
    ).catch(() => {}); // Ignore if entity doesn't exist
  }

  // Link rent objects (buildings/rooms/equipment from rental contracts)
  if (properties.rent_objects) {
    let objs = [];
    try { objs = typeof properties.rent_objects === 'string' ? JSON.parse(properties.rent_objects) : properties.rent_objects; } catch(e) {}
    if (Array.isArray(objs)) {
      for (const obj of objs) {
        if (obj.building_id) {
          await pool.query(
            'INSERT INTO relations (from_entity_id, to_entity_id, relation_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [entityId, parseInt(obj.building_id), 'located_in']
          ).catch(() => {});
        }
        if (obj.room_id) {
          await pool.query(
            'INSERT INTO relations (from_entity_id, to_entity_id, relation_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [entityId, parseInt(obj.room_id), 'located_in']
          ).catch(() => {});
        }
        if (obj.equipment_id) {
          // equipment → subject_of → contract
          await pool.query(
            'INSERT INTO relations (from_entity_id, to_entity_id, relation_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [parseInt(obj.equipment_id), entityId, 'subject_of']
          ).catch(() => {});
        }
      }
    }
  }

  // Link equipment_list (from Подряда and other non-rental contracts)
  if (properties.equipment_list) {
    let eqItems = [];
    try { eqItems = typeof properties.equipment_list === 'string' ? JSON.parse(properties.equipment_list) : properties.equipment_list; } catch(e) {}
    if (Array.isArray(eqItems)) {
      for (const item of eqItems) {
        if (item.equipment_id) {
          await pool.query(
            'INSERT INTO relations (from_entity_id, to_entity_id, relation_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [parseInt(item.equipment_id), entityId, 'subject_of']
          ).catch(() => {});
        }
      }
    }
  }
}

// POST /api/entities
router.post('/', authenticate, authorize('admin', 'editor'), validate(schemas.entity), asyncHandler(async (req, res) => {
  const { entity_type_id, name, properties, parent_id } = req.body;
  const cleanProps = sanitizeObj(properties);
  const cleanName = xss(name);

  // Duplicate check: same name + same type
  const dupCheck = await pool.query(
    'SELECT id, name FROM entities WHERE entity_type_id=$1 AND LOWER(name)=LOWER($2) AND deleted_at IS NULL',
    [entity_type_id, cleanName]
  );
  if (dupCheck.rows.length > 0) {
    return res.status(409).json({ error: 'duplicate', existing: dupCheck.rows[0], message: 'Запись с таким именем уже существует' });
  }

  const { rows } = await pool.query(
    'INSERT INTO entities (entity_type_id, name, properties, parent_id) VALUES ($1,$2,$3,$4) RETURNING *',
    [entity_type_id, cleanName, cleanProps, parent_id || null]
  );
  await logAction(req.user.id, 'create', 'entity', rows[0].id, { name: cleanName, entity_type_id }, req.ip);

  // Auto-link: get entity type name
  const { rows: [typeInfo] } = await pool.query('SELECT name FROM entity_types WHERE id=$1', [entity_type_id]);
  if (typeInfo) await autoLinkEntities(rows[0].id, typeInfo.name, cleanProps);

  res.status(201).json(rows[0]);
}));

// PUT /api/entities/:id
router.put('/:id', authenticate, authorize('admin', 'editor'), validate(schemas.entityUpdate), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, properties, parent_id } = req.body;
  const cleanProps = properties ? sanitizeObj(properties) : undefined;
  const cleanName = name ? xss(name) : undefined;

  // Build dynamic update
  const sets = [];
  const params = [];
  if (cleanName !== undefined) { params.push(cleanName); sets.push(`name=$${params.length}`); }
  if (cleanProps !== undefined) { params.push(cleanProps); sets.push(`properties=$${params.length}`); }
  if (parent_id !== undefined) { params.push(parent_id); sets.push(`parent_id=$${params.length}`); }
  sets.push('updated_at=NOW()');
  params.push(id);

  const { rows } = await pool.query(
    `UPDATE entities SET ${sets.join(',')} WHERE id=$${params.length} AND deleted_at IS NULL RETURNING *`, params
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
  await logAction(req.user.id, 'update', 'entity', id, { name: cleanName }, req.ip);

  // Auto-link on update
  if (cleanProps) {
    const { rows: [typeInfo] } = await pool.query(
      'SELECT et.name FROM entities e JOIN entity_types et ON e.entity_type_id=et.id WHERE e.id=$1', [id]
    );
    if (typeInfo) {
      // Clear old auto-relations, then re-create
      await pool.query("DELETE FROM relations WHERE from_entity_id=$1 AND relation_type IN ('party_to','located_in')", [id]);
      // Clear equipment subject_of relations pointing to this entity (contract or act)
      await pool.query("DELETE FROM relations WHERE to_entity_id=$1 AND relation_type='subject_of'", [id]);
      // For acts: clear supplement_to pointing from this act to contract
      if (typeInfo.name === 'act') {
        await pool.query("DELETE FROM relations WHERE from_entity_id=$1 AND relation_type='supplement_to'", [id]);
      }
      await autoLinkEntities(id, typeInfo.name, cleanProps);
    }
  }

  res.json(rows[0]);
}));

// PATCH /api/entities/:id — alias for PUT (partial update)
router.patch('/:id', authenticate, authorize('admin', 'editor'), validate(schemas.entityUpdate), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, properties, parent_id } = req.body;
  const cleanProps = properties ? sanitizeObj(properties) : undefined;
  const cleanName  = name ? xss(name) : undefined;
  const sets = [], params = [];
  if (cleanName  !== undefined) { params.push(cleanName);  sets.push(`name=$${params.length}`); }
  if (cleanProps !== undefined) { params.push(cleanProps); sets.push(`properties=$${params.length}`); }
  if (parent_id  !== undefined) { params.push(parent_id); sets.push(`parent_id=$${params.length}`); }
  sets.push('updated_at=NOW()');
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE entities SET ${sets.join(',')} WHERE id=$${params.length} AND deleted_at IS NULL RETURNING *`, params
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
  res.json(rows[0]);
}));

// DELETE /api/entities/:id (soft delete)
router.delete('/:id', authenticate, authorize('admin', 'editor'), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { rows } = await pool.query(
    'UPDATE entities SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id, name', [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
  await logAction(req.user.id, 'delete', 'entity', id, { name: rows[0].name }, req.ip);
  res.json({ ok: true });
}));

module.exports = router;
