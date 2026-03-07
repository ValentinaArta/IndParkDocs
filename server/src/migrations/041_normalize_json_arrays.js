/**
 * 041_normalize_json_arrays
 *
 * Нормализует 5 JSON-полей из properties в реляционные таблицы:
 *   rent_objects        → rent_items
 *   act_items           → act_line_items
 *   contract_items +
 *   service_items       → contract_line_items
 *   advances            → contract_advances
 *   equipment_list +
 *   equipment_rent_items→ contract_equipment
 */
module.exports = async function migration041(pool) {

  // ── 1. CREATE TABLES ─────────────────────────────────────────────────────

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rent_items (
      id           SERIAL PRIMARY KEY,
      contract_id  INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      entity_id    INTEGER REFERENCES entities(id),
      object_type  VARCHAR(20) NOT NULL DEFAULT 'room',
      area         NUMERIC(12,2),
      rent_rate    NUMERIC(12,2),
      net_rate     NUMERIC(12,2),
      utility_rate NUMERIC(12,2),
      calc_mode    VARCHAR(20) DEFAULT 'area_rate',
      comment      TEXT NOT NULL DEFAULT '',
      sort_order   INTEGER NOT NULL DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS act_line_items (
      id           SERIAL PRIMARY KEY,
      act_id       INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      equipment_id INTEGER REFERENCES entities(id),
      name         TEXT NOT NULL DEFAULT '',
      amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
      description  TEXT NOT NULL DEFAULT '',
      comment      TEXT NOT NULL DEFAULT '',
      broken       BOOLEAN NOT NULL DEFAULT false,
      sort_order   INTEGER NOT NULL DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contract_line_items (
      id          SERIAL PRIMARY KEY,
      contract_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      name        TEXT NOT NULL DEFAULT '',
      unit        VARCHAR(50) NOT NULL DEFAULT '',
      quantity    NUMERIC(12,3),
      price       NUMERIC(14,2),
      amount      NUMERIC(14,2),
      sort_order  INTEGER NOT NULL DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contract_advances (
      id          SERIAL PRIMARY KEY,
      contract_id INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      amount      NUMERIC(14,2),
      date        DATE,
      sort_order  INTEGER NOT NULL DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contract_equipment (
      id           SERIAL PRIMARY KEY,
      contract_id  INTEGER NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      equipment_id INTEGER NOT NULL REFERENCES entities(id),
      rent_cost    NUMERIC(14,2),
      sort_order   INTEGER NOT NULL DEFAULT 0,
      UNIQUE(contract_id, equipment_id)
    )
  `);

  // ── 2. HELPER ────────────────────────────────────────────────────────────

  function safeNum(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  function safeInt(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = parseInt(v);
    return isNaN(n) ? null : n;
  }

  function parseArr(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw) || []; } catch (_) { return []; }
  }

  // ── 3. BACKFILL rent_items (from rent_objects) ───────────────────────────

  const { rows: rentEntities } = await pool.query(`
    SELECT e.id, e.properties->>'rent_objects' as raw
    FROM entities e
    WHERE e.deleted_at IS NULL
      AND e.properties ? 'rent_objects'
      AND (e.properties->>'rent_objects') NOT IN ('', 'null', '[]')
  `);

  let ri = 0;
  for (const ent of rentEntities) {
    const items = parseArr(ent.raw);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      // Determine entity_id and object_type
      let entityId = null;
      let objectType = 'room';
      if (it.land_plot_part_id && parseInt(it.land_plot_part_id)) {
        entityId = parseInt(it.land_plot_part_id);
        objectType = 'land_plot_part';
      } else if (it.land_plot_id && parseInt(it.land_plot_id)) {
        entityId = parseInt(it.land_plot_id);
        objectType = 'land_plot';
      } else if (it.room_id && parseInt(it.room_id)) {
        entityId = parseInt(it.room_id);
        objectType = 'room';
      }

      // Verify entity exists
      if (entityId) {
        const { rows: ex } = await pool.query(
          'SELECT id FROM entities WHERE id=$1 AND deleted_at IS NULL', [entityId]
        );
        if (!ex.length) entityId = null;
      }

      await pool.query(`
        INSERT INTO rent_items
          (contract_id, entity_id, object_type, area, rent_rate, net_rate, utility_rate, calc_mode, comment, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
        ent.id,
        entityId,
        objectType,
        safeNum(it.area),
        safeNum(it.rent_rate),
        safeNum(it.net_rate),
        safeNum(it.utility_rate),
        it.calc_mode || 'area_rate',
        it.comment || '',
        i,
      ]);
      ri++;
    }
  }
  if (ri) console.log(`041: rent_items — ${ri} rows`);

  // ── 4. BACKFILL act_line_items (from act_items) ──────────────────────────

  const { rows: actEntities } = await pool.query(`
    SELECT id, properties->>'act_items' as raw
    FROM entities
    WHERE deleted_at IS NULL
      AND properties ? 'act_items'
      AND (properties->>'act_items') NOT IN ('', 'null', '[]')
  `);

  let al = 0;
  for (const ent of actEntities) {
    const items = parseArr(ent.raw);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const eqId = safeInt(it.equipment_id);
      if (eqId) {
        const { rows: ex } = await pool.query(
          'SELECT id FROM entities WHERE id=$1 AND deleted_at IS NULL', [eqId]
        );
        if (!ex.length) continue; // skip orphan
      }
      await pool.query(`
        INSERT INTO act_line_items
          (act_id, equipment_id, name, amount, description, comment, broken, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [
        ent.id,
        eqId,
        it.equipment_name || it.name || '',
        safeNum(it.amount) || 0,
        it.description || '',
        it.comment || '',
        it.broken === true || it.broken === 'true',
        i,
      ]);
      al++;
    }
  }
  if (al) console.log(`041: act_line_items — ${al} rows`);

  // ── 5. BACKFILL contract_line_items (from contract_items + service_items) ─

  const { rows: cliEntities } = await pool.query(`
    SELECT id,
      properties->>'contract_items' as ci_raw,
      properties->>'service_items'  as si_raw
    FROM entities
    WHERE deleted_at IS NULL
      AND (
        (properties ? 'contract_items' AND (properties->>'contract_items') NOT IN ('','null','[]'))
        OR
        (properties ? 'service_items'  AND (properties->>'service_items')  NOT IN ('','null','[]'))
      )
  `);

  let cli = 0;
  for (const ent of cliEntities) {
    // contract_items takes precedence; service_items as fallback
    const raw = (ent.ci_raw && ent.ci_raw !== '[]') ? ent.ci_raw : ent.si_raw;
    const items = parseArr(raw);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const name = it.name || it.subject || '';
      if (!name) continue;
      await pool.query(`
        INSERT INTO contract_line_items
          (contract_id, name, unit, quantity, price, amount, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [
        ent.id,
        name,
        it.unit || '',
        safeNum(it.quantity),
        safeNum(it.price),
        safeNum(it.amount),
        i,
      ]);
      cli++;
    }
  }
  if (cli) console.log(`041: contract_line_items — ${cli} rows`);

  // ── 6. BACKFILL contract_advances (from advances) ────────────────────────

  const { rows: advEntities } = await pool.query(`
    SELECT id, properties->>'advances' as raw
    FROM entities
    WHERE deleted_at IS NULL
      AND properties ? 'advances'
      AND (properties->>'advances') NOT IN ('','null','[]')
  `);

  let adv = 0;
  for (const ent of advEntities) {
    const items = parseArr(ent.raw);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const amt = safeNum(it.amount);
      if (amt === null) continue;
      await pool.query(`
        INSERT INTO contract_advances (contract_id, amount, date, sort_order)
        VALUES ($1,$2,$3,$4)
      `, [
        ent.id,
        amt,
        (it.date && it.date !== '') ? it.date : null,
        i,
      ]);
      adv++;
    }
  }
  if (adv) console.log(`041: contract_advances — ${adv} rows`);

  // ── 7. BACKFILL contract_equipment (from equipment_list + equipment_rent_items)

  const { rows: eqEntities } = await pool.query(`
    SELECT id,
      properties->>'equipment_list'         as el_raw,
      properties->>'equipment_rent_items'   as eri_raw
    FROM entities
    WHERE deleted_at IS NULL
      AND (
        (properties ? 'equipment_list'       AND (properties->>'equipment_list')       NOT IN ('','null','[]'))
        OR
        (properties ? 'equipment_rent_items' AND (properties->>'equipment_rent_items') NOT IN ('','null','[]'))
      )
  `);

  let eq = 0;
  for (const ent of eqEntities) {
    // Merge both lists; equipment_rent_items has rent_cost
    const elItems  = parseArr(ent.el_raw);
    const eriItems = parseArr(ent.eri_raw);
    const eriById  = {};
    for (const x of eriItems) {
      const id = safeInt(x.equipment_id);
      if (id) eriById[id] = safeNum(x.rent_cost);
    }

    for (let i = 0; i < elItems.length; i++) {
      const it = elItems[i];
      const eqId = safeInt(it.equipment_id || it.id);
      if (!eqId) continue;

      const { rows: ex } = await pool.query(
        'SELECT id FROM entities WHERE id=$1 AND deleted_at IS NULL', [eqId]
      );
      if (!ex.length) continue;

      const rentCost = eriById[eqId] !== undefined ? eriById[eqId] : null;

      await pool.query(`
        INSERT INTO contract_equipment (contract_id, equipment_id, rent_cost, sort_order)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (contract_id, equipment_id) DO UPDATE SET rent_cost=EXCLUDED.rent_cost
      `, [ent.id, eqId, rentCost, i]);
      eq++;
    }

    // Handle equipment_rent_items not in equipment_list
    for (const it of eriItems) {
      const eqId = safeInt(it.equipment_id);
      if (!eqId || eriById[eqId] === undefined) continue;
      const inList = elItems.some(x => safeInt(x.equipment_id || x.id) === eqId);
      if (inList) continue;

      const { rows: ex } = await pool.query(
        'SELECT id FROM entities WHERE id=$1 AND deleted_at IS NULL', [eqId]
      );
      if (!ex.length) continue;

      await pool.query(`
        INSERT INTO contract_equipment (contract_id, equipment_id, rent_cost, sort_order)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (contract_id, equipment_id) DO UPDATE SET rent_cost=EXCLUDED.rent_cost
      `, [ent.id, eqId, safeNum(it.rent_cost), elItems.length]);
      eq++;
    }
  }
  if (eq) console.log(`041: contract_equipment — ${eq} rows`);

  console.log('041_normalize_json_arrays: done');
};
