/**
 * floorplan.js
 * GET /api/buildings/:id/room-status   — список помещений корпуса со статусами аренды
 * PUT /api/buildings/:id/floor-plans   — сохранить разметку полигонов поэтажных планов
 */
const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const { authenticate } = require('../middleware/auth');
const asyncH  = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * GET /api/buildings/:id/room-status
 * Возвращает все помещения корпуса с их статусом:
 *   rented    — есть активный (не архивный) договор аренды/субаренды
 *   tech      — тип помещения содержит "тех"
 *   available — свободно
 */
router.get('/:id/room-status', authenticate, asyncH(async (req, res) => {
  const buildingId = parseInt(req.params.id);
  if (!buildingId) return res.status(400).json({ error: 'invalid id' });

  // Все помещения корпуса (дети по parent_id или через located_in)
  const roomsRes = await pool.query(`
    SELECT DISTINCT e.id, e.name, e.properties
    FROM entities e
    JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'room'
    WHERE e.deleted_at IS NULL
      AND (
        e.parent_id = $1
        OR EXISTS (
          SELECT 1 FROM relations r
          WHERE r.from_entity_id = e.id AND r.to_entity_id = $1
            AND r.relation_type = 'located_in'
        )
      )
    ORDER BY e.name
  `, [buildingId]);

  if (!roomsRes.rows.length) return res.json([]);

  const roomIds = roomsRes.rows.map(r => r.id);

  // ID наших юрлиц — для определения ВГО (внутренних арендаторов)
  const ownRes = await pool.query(
    `SELECT e.id FROM entities e
     JOIN entity_types et ON et.id = e.entity_type_id AND et.name = 'company'
     WHERE e.deleted_at IS NULL AND e.properties->>'is_own' = 'true'`);
  const ownIds = new Set(ownRes.rows.map(r => String(r.id)));

  // Все активные договоры аренды/субаренды для этих помещений
  const contractsRes = await pool.query(`
    SELECT DISTINCT
      r.to_entity_id  AS room_id,
      c.id            AS contract_id,
      c.name          AS contract_name,
      c.properties->>'contractor_name' AS contractor_name,
      c.properties->>'contractor_id'   AS contractor_id,
      c.properties->>'subtenant_name'  AS subtenant_name,
      c.properties->>'subtenant_id'    AS subtenant_id,
      c.properties->>'contract_type'   AS contract_type
    FROM relations r
    JOIN entities c ON c.id = r.from_entity_id
    JOIN entity_types cet ON cet.id = c.entity_type_id AND cet.name = 'contract'
    WHERE r.to_entity_id = ANY($1::int[])
      AND r.relation_type = 'located_in'
      AND c.deleted_at IS NULL
      AND COALESCE(c.properties->>'doc_status', 'Подписан') != 'Архив'
      AND c.properties->>'contract_type' IN ('Аренды','Субаренды','Аренда оборудования')
    ORDER BY r.to_entity_id, c.id DESC
  `, [roomIds]);

  // Для каждого помещения: ищем "финального" (внешнего) арендатора.
  // Приоритет: 1) субарендатор (subtenant_name) 2) внешний контрагент 3) любой контрагент
  const allByRoom = {};
  contractsRes.rows.forEach(row => {
    if (!allByRoom[row.room_id]) allByRoom[row.room_id] = [];
    allByRoom[row.room_id].push(row);
  });
  const rentedMap = {};
  Object.entries(allByRoom).forEach(([roomId, rows]) => {
    // 1. Ищем договор с субарендатором (финальный внешний арендатор)
    const withSubtenant = rows.find(r => r.subtenant_name);
    if (withSubtenant) { rentedMap[roomId] = { ...withSubtenant, display_name: withSubtenant.subtenant_name }; return; }
    // 2. Ищем договор с внешним контрагентом (не наше юрлицо)
    const external = rows.find(r => r.contractor_id && !ownIds.has(String(r.contractor_id)));
    if (external) { rentedMap[roomId] = { ...external, display_name: external.contractor_name }; return; }
    // 3. Любой (ВГО / внутренний)
    const row = rows[0];
    rentedMap[roomId] = { ...row, display_name: row.contractor_name };
  });

  const result = roomsRes.rows.map(room => {
    const props   = room.properties || {};
    const objType = props.object_type || props.room_type || '';
    const isTech  = objType.toLowerCase().includes('тех');
    let status = 'available';
    if (isTech) {
      status = 'tech';
    } else if (rentedMap[room.id]) {
      status = 'rented';
    }
    return {
      room_id:         room.id,
      room_name:       room.name,
      object_type:     objType,
      status,
      contract_id:      rentedMap[room.id] ? rentedMap[room.id].contract_id      : null,
      contract_name:    rentedMap[room.id] ? rentedMap[room.id].contract_name     : null,
      contractor_name:  rentedMap[room.id] ? (rentedMap[room.id].display_name || rentedMap[room.id].contractor_name) : null,
    };
  });

  res.json(result);
}));

/**
 * PUT /api/buildings/:id/floor-plans
 * body: { floor_plans: [{file_id, floor_name, polygons:[{room_id, pts:[[x,y],...]}]}] }
 */
router.put('/:id/floor-plans', authenticate, asyncH(async (req, res) => {
  const buildingId = parseInt(req.params.id);
  if (!buildingId) return res.status(400).json({ error: 'invalid id' });

  const { floor_plans } = req.body;
  if (!Array.isArray(floor_plans)) return res.status(400).json({ error: 'floor_plans must be array' });

  await pool.query(`
    UPDATE entities
    SET properties = properties || jsonb_build_object('floor_plans', $1::jsonb),
        updated_at = NOW()
    WHERE id = $2
  `, [JSON.stringify(floor_plans), buildingId]);

  res.json({ ok: true });
}));

module.exports = router;
