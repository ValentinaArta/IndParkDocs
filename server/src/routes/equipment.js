/**
 * equipment.js — Equipment tree API
 * GET /api/equipment/tree?view=building|category|balance|hierarchy
 */
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// ─── Fetch all equipment data ──────────────────────────────────────────────

async function fetchEquipmentData() {
  // All active equipment
  const { rows: equipment } = await pool.query(`
    SELECT e.id, e.name, e.parent_id,
           e.properties->>'equipment_category'  AS category,
           e.properties->>'equipment_kind'       AS kind,
           e.properties->>'status'               AS status,
           e.properties->>'inv_number'           AS inv_number,
           e.properties->>'balance_owner_id'     AS balance_owner_id,
           e.properties->>'balance_owner_name'   AS balance_owner_name
    FROM entities e
    WHERE e.entity_type_id = (SELECT id FROM entity_types WHERE name = 'equipment')
      AND e.deleted_at IS NULL
    ORDER BY e.name
  `);

  // All relations involving equipment (as source)
  const eqIds = equipment.map(e => e.id);
  let relations = [];
  if (eqIds.length > 0) {
    const { rows } = await pool.query(`
      SELECT r.from_entity_id, r.to_entity_id, r.relation_type,
             target.name AS target_name, target.entity_type_id AS target_type
      FROM relations r
      JOIN entities target ON target.id = r.to_entity_id
      WHERE r.deleted_at IS NULL
        AND r.from_entity_id = ANY($1)
    `, [eqIds]);
    relations = rows;
  }

  // Parent entities (buildings, land plots, etc.)
  const parentIds = [...new Set(equipment.filter(e => e.parent_id).map(e => e.parent_id))];
  let parents = [];
  if (parentIds.length > 0) {
    const { rows } = await pool.query(
      'SELECT id, name, entity_type_id FROM entities WHERE id = ANY($1) AND deleted_at IS NULL',
      [parentIds]
    );
    parents = rows;
  }

  return { equipment, relations, parents };
}

// ─── Build part_of hierarchy maps ──────────────────────────────────────────

function buildPartOfMaps(relations) {
  const partOfParent = {};  // child_id  → parent_id
  const partOfChildren = {}; // parent_id → [child_id, ...]
  relations
    .filter(r => r.relation_type === 'part_of')
    .forEach(r => {
      partOfParent[r.from_entity_id] = r.to_entity_id;
      if (!partOfChildren[r.to_entity_id]) partOfChildren[r.to_entity_id] = [];
      partOfChildren[r.to_entity_id].push(r.from_entity_id);
    });
  return { partOfParent, partOfChildren };
}

// ─── Recursively build equipment subtree ───────────────────────────────────

function buildEquipmentSubtree(eqId, equipMap, partOfChildren) {
  const eq = equipMap[eqId];
  if (!eq) return null;
  const childIds = partOfChildren[eqId] || [];
  const children = childIds
    .map(cid => buildEquipmentSubtree(cid, equipMap, partOfChildren))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return {
    type: 'equipment',
    id: eq.id,
    name: eq.name,
    category: eq.category || '',
    kind: eq.kind || '',
    status: eq.status || '',
    inv_number: eq.inv_number || '',
    balance_owner: eq.balance_owner_name || '',
    children,
  };
}

// ─── Tree builders per view ────────────────────────────────────────────────

function buildBuildingTree(equipment, equipMap, partOfParent, partOfChildren, parentMap) {
  const groups = {};
  equipment
    .filter(e => !partOfParent[e.id]) // only root equipment
    .forEach(e => {
      const p = parentMap[e.parent_id];
      const key = p ? String(p.id) : '__none';
      const label = p ? p.name : 'Без корпуса';
      if (!groups[key]) groups[key] = { type: 'group', id: key, name: label, children: [] };
      const node = buildEquipmentSubtree(e.id, equipMap, partOfChildren);
      if (node) groups[key].children.push(node);
    });
  return Object.values(groups)
    .sort((a, b) => {
      if (a.id === '__none') return 1;
      if (b.id === '__none') return -1;
      return a.name.localeCompare(b.name, 'ru');
    });
}

function buildCategoryTree(equipment, equipMap, partOfParent, partOfChildren) {
  const groups = {};
  equipment
    .filter(e => !partOfParent[e.id])
    .forEach(e => {
      const cat = e.category || 'Без категории';
      if (!groups[cat]) groups[cat] = { type: 'group', id: 'cat_' + cat, name: cat, children: [] };
      const node = buildEquipmentSubtree(e.id, equipMap, partOfChildren);
      if (node) groups[cat].children.push(node);
    });
  return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function buildBalanceTree(equipment, equipMap, partOfParent, partOfChildren, relations) {
  const balMap = {};
  relations
    .filter(r => r.relation_type === 'on_balance')
    .forEach(r => { balMap[r.from_entity_id] = { id: r.to_entity_id, name: r.target_name }; });

  const groups = {};
  equipment
    .filter(e => !partOfParent[e.id])
    .forEach(e => {
      const bal = balMap[e.id];
      const key = bal ? String(bal.id) : '__none';
      const label = bal ? bal.name : (e.balance_owner_name || 'Без балансодержателя');
      if (!groups[key]) groups[key] = { type: 'group', id: key, name: label, children: [] };
      const node = buildEquipmentSubtree(e.id, equipMap, partOfChildren);
      if (node) groups[key].children.push(node);
    });
  return Object.values(groups)
    .sort((a, b) => {
      if (a.id === '__none') return 1;
      if (b.id === '__none') return -1;
      return a.name.localeCompare(b.name, 'ru');
    });
}

function buildHierarchyTree(equipment, equipMap, partOfParent, partOfChildren) {
  // Root = equipment with no part_of relation
  const roots = equipment.filter(e => !partOfParent[e.id]);
  return roots
    .map(e => buildEquipmentSubtree(e.id, equipMap, partOfChildren))
    .filter(Boolean);
}

// ─── Route ─────────────────────────────────────────────────────────────────

router.get('/tree', authenticate, asyncHandler(async (req, res) => {
  const view = ['building', 'category', 'balance', 'hierarchy'].includes(req.query.view)
    ? req.query.view
    : 'building';

  const { equipment, relations, parents } = await fetchEquipmentData();

  const equipMap = {};
  equipment.forEach(e => { equipMap[e.id] = e; });
  const parentMap = {};
  parents.forEach(p => { parentMap[p.id] = p; });
  const { partOfParent, partOfChildren } = buildPartOfMaps(relations);

  let tree;
  if (view === 'building')   tree = buildBuildingTree(equipment, equipMap, partOfParent, partOfChildren, parentMap);
  else if (view === 'category') tree = buildCategoryTree(equipment, equipMap, partOfParent, partOfChildren);
  else if (view === 'balance')  tree = buildBalanceTree(equipment, equipMap, partOfParent, partOfChildren, relations);
  else                          tree = buildHierarchyTree(equipment, equipMap, partOfParent, partOfChildren);

  res.json({ view, tree });
}));

module.exports = router;
