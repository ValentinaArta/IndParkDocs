const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { computeAndSaveVgo } = require('../utils/contractDirection');
const { logAction } = require('../middleware/audit');
const router = express.Router();

// ─── Line-items helpers ──────────────────────────────────────────────────────

function parseArr(v) {
  if (!v) return null;
  if (Array.isArray(v)) return v.length ? v : null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || s === 'null' || s === '[]') return null;
    try { const a = JSON.parse(s); return Array.isArray(a) && a.length ? a : null; } catch (_) { return null; }
  }
  return null;
}

async function loadLineItems(pool, entityId, typeName) {
  const result = {};

  if (typeName === 'contract' || typeName === 'supplement') {
    const { rows: ri } = await pool.query(
      `SELECT ri.*, e.name as entity_name
       FROM rent_items ri
       LEFT JOIN entities e ON e.id = ri.entity_id AND e.deleted_at IS NULL
       WHERE ri.contract_id = $1
       ORDER BY ri.sort_order`, [entityId]
    );
    if (ri.length) result.rent_objects = ri;

    const { rows: cli } = await pool.query(
      'SELECT * FROM contract_line_items WHERE contract_id=$1 ORDER BY sort_order', [entityId]
    );
    if (cli.length) result.contract_items = cli;

    const { rows: adv } = await pool.query(
      'SELECT * FROM contract_advances WHERE contract_id=$1 ORDER BY sort_order', [entityId]
    );
    if (adv.length) result.advances = adv;

    const { rows: ceq } = await pool.query(
      `SELECT ce.*, e.name as equipment_name,
         e.properties->>'inv_number'        as inv_number,
         e.properties->>'equipment_category' as equipment_category,
         e.properties->>'equipment_kind'     as equipment_kind,
         e.properties->>'status'             as status,
         e.properties->>'manufacturer'       as manufacturer
       FROM contract_equipment ce
       JOIN entities e ON e.id = ce.equipment_id AND e.deleted_at IS NULL
       WHERE ce.contract_id = $1
       ORDER BY ce.sort_order`, [entityId]
    );
    if (ceq.length) result.equipment_list = ceq;
  }

  if (typeName === 'act') {
    const { rows: ali } = await pool.query(
      `SELECT ali.*, e.name as equipment_name,
         e.properties->>'inv_number'        as inv_number,
         e.properties->>'equipment_category' as equipment_category,
         e.properties->>'equipment_kind'     as equipment_kind
       FROM act_line_items ali
       LEFT JOIN entities e ON e.id = ali.equipment_id AND e.deleted_at IS NULL
       WHERE ali.act_id = $1
       ORDER BY ali.sort_order`, [entityId]
    );
    if (ali.length) result.act_items = ali;
  }

  return result;
}

async function saveLineItems(pool, entityId, typeName, props) {
  if (!props) return;

  if (typeName === 'contract' || typeName === 'supplement') {
    // rent_objects → rent_items
    const ro = parseArr(props.rent_objects);
    if (ro !== null) {
      await pool.query('DELETE FROM rent_items WHERE contract_id=$1', [entityId]);
      for (let i = 0; i < ro.length; i++) {
        const it = ro[i];
        let entityRef = null, objectType = 'room';
        if (it.land_plot_part_id && parseInt(it.land_plot_part_id)) {
          entityRef = parseInt(it.land_plot_part_id); objectType = 'land_plot_part';
        } else if (it.land_plot_id && parseInt(it.land_plot_id)) {
          entityRef = parseInt(it.land_plot_id); objectType = 'land_plot';
        } else if (it.room_id && parseInt(it.room_id)) {
          entityRef = parseInt(it.room_id); objectType = 'room';
        } else if (it.entity_id) {
          entityRef = parseInt(it.entity_id);
          objectType = it.object_type || 'room';
        }
        function sn(v) { if (v === '' || v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; }
        await pool.query(
          `INSERT INTO rent_items (contract_id,entity_id,object_type,area,rent_rate,net_rate,utility_rate,calc_mode,comment,sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [entityId, entityRef, objectType, sn(it.area), sn(it.rent_rate), sn(it.net_rate), sn(it.utility_rate),
           it.calc_mode || 'area_rate', it.comment || '', i]
        );
      }
    }

    // contract_items → contract_line_items
    const ci = parseArr(props.contract_items) || parseArr(props.service_items);
    if (ci !== null) {
      await pool.query('DELETE FROM contract_line_items WHERE contract_id=$1', [entityId]);
      for (let i = 0; i < ci.length; i++) {
        const it = ci[i];
        const nm = it.name || it.subject || ''; if (!nm) continue;
        function sn2(v) { if (v === '' || v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; }
        await pool.query(
          `INSERT INTO contract_line_items (contract_id,name,unit,quantity,price,amount,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [entityId, nm, it.unit || '', sn2(it.quantity), sn2(it.price), sn2(it.amount), i]
        );
      }
    }

    // advances → contract_advances
    const adv = parseArr(props.advances);
    if (adv !== null) {
      await pool.query('DELETE FROM contract_advances WHERE contract_id=$1', [entityId]);
      for (let i = 0; i < adv.length; i++) {
        const it = adv[i];
        function sn3(v) { if (v === '' || v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; }
        const amt = sn3(it.amount); if (amt === null) continue;
        await pool.query(
          `INSERT INTO contract_advances (contract_id,amount,date,sort_order) VALUES ($1,$2,$3,$4)`,
          [entityId, amt, (it.date && it.date !== '') ? it.date : null, i]
        );
      }
    }

    // equipment_list → contract_equipment
    const el = parseArr(props.equipment_list);
    if (el !== null) {
      await pool.query('DELETE FROM contract_equipment WHERE contract_id=$1', [entityId]);
      for (let i = 0; i < el.length; i++) {
        const it = el[i];
        const eqId = parseInt(it.equipment_id || it.id || 0); if (!eqId) continue;
        function sn4(v) { if (v === '' || v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; }
        await pool.query(
          `INSERT INTO contract_equipment (contract_id,equipment_id,rent_cost,sort_order) VALUES ($1,$2,$3,$4)
           ON CONFLICT (contract_id,equipment_id) DO UPDATE SET rent_cost=EXCLUDED.rent_cost, sort_order=EXCLUDED.sort_order`,
          [entityId, eqId, sn4(it.rent_cost), i]
        );
      }
    }
  }

  if (typeName === 'act') {
    const ai = parseArr(props.act_items);
    if (ai !== null) {
      await pool.query('DELETE FROM act_line_items WHERE act_id=$1', [entityId]);
      for (let i = 0; i < ai.length; i++) {
        const it = ai[i];
        const eqId = parseInt(it.equipment_id || 0) || null;
        function sn5(v) { if (v === '' || v == null) return null; const n = parseFloat(v); return isNaN(n) ? null : n; }
        await pool.query(
          `INSERT INTO act_line_items (act_id,equipment_id,name,amount,description,comment,broken,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [entityId, eqId, it.equipment_name || it.name || '', sn5(it.amount) || 0,
           it.description || '', it.comment || '', it.broken === true || it.broken === 'true', i]
        );
      }
    }
  }
}

// GET /api/entities
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { type, parent_id, search, limit = 50, offset = 0 } = req.query;
  const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 2000);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);

  let sql = `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color,
    p.name as parent_name,
    (SELECT COALESCE(
       NULLIF(s.properties->>'contract_amount',''),
       NULLIF(s.properties->>'rent_monthly','')
     )
     FROM entities s
     JOIN entity_types st ON st.id = s.entity_type_id AND st.name = 'supplement'
     WHERE s.parent_id = e.id AND s.deleted_at IS NULL
       AND (
         s.properties->>'contract_date' IS NULL
         OR s.properties->>'contract_date' = ''
         OR (s.properties->>'contract_date')::date <= CURRENT_DATE
       )
       AND COALESCE(NULLIF(s.properties->>'contract_amount',''), NULLIF(s.properties->>'rent_monthly','')) IS NOT NULL
     ORDER BY COALESCE(NULLIF(s.properties->>'contract_date',''), '0001-01-01') DESC, s.id DESC
     LIMIT 1) as effective_amount,
    (SELECT lp.name FROM relations r
     JOIN entities lp ON r.to_entity_id = lp.id
     WHERE r.from_entity_id = e.id AND r.relation_type = 'located_on'
       AND lp.deleted_at IS NULL LIMIT 1) as land_plot_name,
    (SELECT string_agg(COALESCE(NULLIF(b.properties->>'short_name',''), b.name), ', ' ORDER BY b.name)
     FROM relations r
     JOIN entities b ON r.from_entity_id = b.id
     JOIN entity_types bet ON b.entity_type_id = bet.id
     WHERE r.to_entity_id = e.id AND r.relation_type = 'located_on'
       AND bet.name IN ('building') AND b.deleted_at IS NULL) as buildings_on_plot,
    (SELECT c.properties->>'contractor_name'
     FROM relations r JOIN entities c ON r.to_entity_id = c.id
     JOIN entity_types ct ON c.entity_type_id = ct.id
     WHERE r.from_entity_id = e.id AND r.relation_type = 'subject_of'
       AND ct.name = 'contract'
       AND c.properties->>'contract_type' IN ('Аренды','Субаренды')
       AND c.deleted_at IS NULL LIMIT 1) as equipment_tenant,
    COALESCE(NULLIF(e.properties->>'our_legal_entity',''), p.properties->>'our_legal_entity') as effective_our_legal_entity,
    COALESCE(NULLIF(e.properties->>'contractor_name',''), p.properties->>'contractor_name') as effective_contractor_name,
    COALESCE(NULLIF(e.properties->>'contract_type',''), p.properties->>'contract_type') as effective_contract_type,
    (SELECT string_agg(loc.name, ', ' ORDER BY loc.name)
     FROM relations r
     JOIN entities loc ON r.to_entity_id = loc.id
     WHERE r.from_entity_id = e.id AND r.relation_type = 'located_in'
       AND loc.deleted_at IS NULL) as located_in_names
    FROM entities e
    JOIN entity_types et ON e.entity_type_id = et.id
    LEFT JOIN entities p ON e.parent_id = p.id
    WHERE e.deleted_at IS NULL`;
  const params = [];

  if (req.query.types) {
    var typeList = req.query.types.split(',').map(function(t) { return t.trim(); });
    params.push(typeList);
    sql += ` AND et.name = ANY($${params.length})`;
  } else if (type) {
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
      OR e.properties->>'number' ILIKE $${pi}
      OR e.properties->>'act_number' ILIKE $${pi}
      OR e.properties->>'doc_number' ILIKE $${pi}
      OR e.properties->>'order_number' ILIKE $${pi}
      OR e.properties->>'inv_number' ILIKE $${pi}
      OR e.properties->>'meter_number' ILIKE $${pi}
      OR e.properties->>'outgoing_number' ILIKE $${pi}
      OR e.properties->>'room_number' ILIKE $${pi}
      OR e.properties->>'cadastral_number' ILIKE $${pi}
      OR e.properties->>'subject' ILIKE $${pi}
      OR e.properties->>'service_subject' ILIKE $${pi}
      OR EXISTS (SELECT 1 FROM relations r JOIN entities loc ON r.to_entity_id = loc.id AND loc.deleted_at IS NULL WHERE r.from_entity_id = e.id AND r.relation_type = 'located_in' AND loc.name ILIKE $${pi})
      OR e.properties->>'subtenant_name' ILIKE $${pi}
      OR e.properties->>'contractor_name' ILIKE $${pi}
      OR e.properties->>'our_legal_entity' ILIKE $${pi}
      OR e.properties->>'contractor_role_label' ILIKE $${pi})`;
  }
  if (req.query.is_own === 'true') {
    sql += ` AND (e.properties->>'is_own' = 'true')`;
  } else if (req.query.is_own === 'false') {
    sql += ` AND (e.properties->>'is_own' IS DISTINCT FROM 'true')`;
    // Без 1С-импортированных (только ручные)
    if (req.query.no_1c === 'true') {
      sql += ` AND (e.properties->>'odata_ref_key' IS NULL OR e.properties->>'odata_ref_key' = '')`;
    }
    // Только 1С-импортированные
    if (req.query.only_1c === 'true') {
      sql += ` AND e.properties->>'odata_ref_key' IS NOT NULL AND e.properties->>'odata_ref_key' != ''`;
    }
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

  // Inject line items from normalized tables into properties
  const lineItems = await loadLineItems(pool, entity.id, entity.type_name);
  if (Object.keys(lineItems).length) {
    entity.properties = Object.assign({}, entity.properties, lineItems);
  }

  const { rows: children } = await pool.query(
    `SELECT e.*, et.name as type_name, et.name_ru as type_name_ru, et.icon, et.color
    FROM entities e JOIN entity_types et ON e.entity_type_id = et.id
    WHERE e.parent_id=$1 AND e.deleted_at IS NULL ORDER BY e.name`, [id]
  );

  const { rows: relations } = await pool.query(
    `SELECT r.*,
      fe.name as from_name, fet.icon as from_icon, fet.name_ru as from_type_ru, fet.name as from_type_name,
      te.name as to_name, tet.icon as to_icon, tet.name_ru as to_type_ru, tet.name as to_type_name,
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
      const isSaleContract = (properties.contract_type === 'Купли-продажи');
      for (const item of eqItems) {
        if (item.equipment_id) {
          const eqId = parseInt(item.equipment_id);
          await pool.query(
            'INSERT INTO relations (from_entity_id, to_entity_id, relation_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [eqId, entityId, 'subject_of']
          ).catch(() => {});
          // Write back purchase_price to equipment card from sale contract
          if (isSaleContract && item.price != null && item.price !== '') {
            await pool.query(
              `UPDATE entities SET properties = properties || jsonb_build_object('purchase_price', $1::text)
               WHERE id = $2 AND deleted_at IS NULL`,
              [String(item.price), eqId]
            ).catch(() => {});
          }
        }
      }
    }
  }

  // Link subject_rooms / subject_buildings / subject_land_plots / subject_land_plot_parts → located_in
  for (const prop of ['subject_rooms', 'subject_buildings', 'subject_land_plots', 'subject_land_plot_parts']) {
    if (!properties[prop]) continue;
    let ids = [];
    try { ids = typeof properties[prop] === 'string' ? JSON.parse(properties[prop]) : properties[prop]; } catch(e) {}
    if (!Array.isArray(ids)) continue;
    for (const targetId of ids) {
      const tid = parseInt(targetId);
      if (!tid) continue;
      await pool.query(
        'INSERT INTO relations (from_entity_id, to_entity_id, relation_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [entityId, tid, 'located_in']
      ).catch(() => {});
    }
  }
}

// GET /api/entities/:id/work-history — акты с работами по данной единице оборудования
router.get('/:id/work-history', authenticate, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) return res.status(400).json({ error: 'Неверный ID' });

  const { rows } = await pool.query(`
    SELECT
      e.id,
      e.name,
      e.properties->>'act_date'   AS act_date,
      e.properties->>'act_number' AS act_number,
      e.properties->>'doc_status' AS doc_status,
      e.parent_id                 AS contract_id,
      p.name                      AS contract_name,
      item->>'description'        AS item_description,
      item->>'amount'             AS item_amount,
      (item->>'broken')::boolean  AS item_broken
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'act'
    LEFT JOIN entities p ON p.id = e.parent_id AND p.deleted_at IS NULL
    JOIN LATERAL jsonb_array_elements(
      CASE
        WHEN e.properties->>'act_items' IS NOT NULL
         AND e.properties->>'act_items' NOT IN ('', 'null')
         AND e.properties->>'act_items' ~ '^\\s*\\['
        THEN (e.properties->>'act_items')::jsonb
        ELSE '[]'::jsonb
      END
    ) AS item ON (item->>'equipment_id')::int = $1
    WHERE e.deleted_at IS NULL
    ORDER BY COALESCE(NULLIF(e.properties->>'act_date',''), '0001-01-01') DESC, e.id DESC
  `, [id]);

  res.json(rows);
}));

// GET /api/entities/:id/equipment — оборудование, связанное с договором через relations (subject_of)
router.get('/:id/equipment', authenticate, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || id < 1) return res.status(400).json({ error: 'Неверный ID' });

  // Оборудование договора + всех его ДС (supplement_to)
  const { rows } = await pool.query(`
    SELECT DISTINCT e.id, e.name, e.properties
    FROM relations r
    JOIN entities e ON e.id = r.from_entity_id
    WHERE r.relation_type = 'subject_of'
      AND e.entity_type_id = 6
      AND (r.to_entity_id = $1
        OR r.to_entity_id IN (
          SELECT from_entity_id FROM relations WHERE to_entity_id = $1 AND relation_type = 'supplement_to'
        ))
    ORDER BY e.name
  `, [id]);

  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    inv_number: (r.properties || {}).inv_number || '',
    category: (r.properties || {}).equipment_category || '',
    kind: (r.properties || {}).equipment_kind || '',
    status: (r.properties || {}).status || '',
  })));
}));

// POST /api/entities
router.post('/', authenticate, authorize('admin', 'editor'), validate(schemas.entity), asyncHandler(async (req, res) => {
  const { entity_type_id, name, properties, parent_id } = req.body;
  const cleanProps = properties;
  const cleanName = name;

  // Duplicate check: same name + same type + same parent (if parent_id provided)
  const dupQuery = parent_id
    ? 'SELECT id, name FROM entities WHERE entity_type_id=$1 AND LOWER(name)=LOWER($2) AND parent_id=$3 AND deleted_at IS NULL'
    : 'SELECT id, name FROM entities WHERE entity_type_id=$1 AND LOWER(name)=LOWER($2) AND parent_id IS NULL AND deleted_at IS NULL';
  const dupParams = parent_id ? [entity_type_id, cleanName, parent_id] : [entity_type_id, cleanName];
  const dupCheck = await pool.query(dupQuery, dupParams);
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
  if (typeInfo) {
    await autoLinkEntities(rows[0].id, typeInfo.name, cleanProps);
    if (typeInfo.name === 'contract') await computeAndSaveVgo(rows[0].id, cleanProps, pool);
    await saveLineItems(pool, rows[0].id, typeInfo.name, cleanProps);
  }

  res.status(201).json(rows[0]);
}));

// PUT /api/entities/:id
router.put('/:id', authenticate, authorize('admin', 'editor'), validate(schemas.entityUpdate), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, properties, parent_id } = req.body;
  const cleanProps = properties;
  const cleanName = name;

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
      if (typeInfo.name === 'contract') await computeAndSaveVgo(id, cleanProps, pool);
      await saveLineItems(pool, id, typeInfo.name, cleanProps);
    }
  }

  res.json(rows[0]);
}));

// PATCH /api/entities/:id — alias for PUT (partial update)
router.patch('/:id', authenticate, authorize('admin', 'editor'), validate(schemas.entityUpdate), asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, properties, parent_id } = req.body;
  const cleanProps = properties;
  const cleanName = name;
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
  await logAction(req.user.id, 'update', 'entity', id, { name: cleanName, via: 'patch' }, req.ip);

  // Auto-link on patch (same logic as PUT)
  if (cleanProps) {
    const { rows: [typeInfo] } = await pool.query(
      'SELECT et.name FROM entities e JOIN entity_types et ON e.entity_type_id=et.id WHERE e.id=$1', [id]
    );
    if (typeInfo) {
      await pool.query("DELETE FROM relations WHERE from_entity_id=$1 AND relation_type IN ('party_to','located_in')", [id]);
      await pool.query("DELETE FROM relations WHERE to_entity_id=$1 AND relation_type='subject_of'", [id]);
      if (typeInfo.name === 'act') {
        await pool.query("DELETE FROM relations WHERE from_entity_id=$1 AND relation_type='supplement_to'", [id]);
      }
      await autoLinkEntities(id, typeInfo.name, cleanProps);
      if (typeInfo.name === 'contract') await computeAndSaveVgo(id, cleanProps, pool);
      await saveLineItems(pool, id, typeInfo.name, cleanProps);
    }
  }

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
