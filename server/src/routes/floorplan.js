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

  // Активные договоры аренды/субаренды для этих помещений
  // Помещение считается сданным, если к нему есть located_in из договора (не Архив)
  const contractsRes = await pool.query(`
    SELECT DISTINCT
      r.to_entity_id  AS room_id,
      c.id            AS contract_id,
      c.name          AS contract_name,
      c.properties->>'contractor_name' AS contractor_name,
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

  // Берём первый договор для каждого помещения
  const rentedMap = {};
  contractsRes.rows.forEach(row => {
    if (!rentedMap[row.room_id]) rentedMap[row.room_id] = row;
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
      contractor_name:  rentedMap[room.id] ? rentedMap[room.id].contractor_name   : null,
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
