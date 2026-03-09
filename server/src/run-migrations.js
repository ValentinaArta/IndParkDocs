// run-migrations.js — Migration runner (extracted from index.js in Phase 6)
// Runs all numbered migrations once using _migrations tracker table.
const logger = require('./logger');

const migrations = {
  '003':         require('./migrations/003_auto'),
  '004':         require('./migrations/004_auto'),
  '005':         require('./migrations/005_auto'),
  '006':         require('./migrations/006_auto'),
  '007':         require('./migrations/007_auto'),
  '008':         require('./migrations/008_auto'),
  '009':         require('./migrations/009_auto'),
  '010':         require('./migrations/010_auto'),
  '011':         require('./migrations/011_auto'),
  '012':         require('./migrations/012_auto'),
  '013':         require('./migrations/013_auto'),
  '014':         require('./migrations/014_auto'),
  '015':         require('./migrations/015_auto'),
  '016':         require('./migrations/016_auto'),
  '017':         require('./migrations/017_auto'),
  '018':         require('./migrations/018_auto'),
  '019':         require('./migrations/019_auto'),
  '020':         require('./migrations/020_auto'),
  '021':         require('./migrations/021_auto'),
  '022':         require('./migrations/022_auto'),
  '023':         require('./migrations/023_auto'),
  '024':         require('./migrations/024_auto'),
  '025':         require('./migrations/025_contacts_migrate'),
  '026':         require('./migrations/026_doc_status'),
  '027':         require('./migrations/027_vat_rate'),
  '028':         require('./migrations/028_equipment_price'),
  '029':         require('./migrations/029_entity_files'),
  '030':         require('./migrations/030_meter_entity_type'),
  '031':         require('./migrations/031_meter_status_field'),
  '032':         require('./migrations/032_building_fields'),
  '033':         require('./migrations/033_meter_connected_equipment'),
  '034':         require('./migrations/034_letter_entity_type'),
  'mergeORRVesta': require('./migrations/merge_orr_vesta'),
  '035':         require('./migrations/035_recompute_vgo'),
  '036':         require('./migrations/036_recompute_vgo2'),
  '037':         require('./migrations/037_subject_fields_for_acts_letters_orders'),
  '038':         require('./migrations/038_ai_token_usage'),
  '039':         require('./migrations/039_perf_indexes'),
  '040':         require('./migrations/040_backfill_located_in'),
  '041':         require('./migrations/041_normalize_json_arrays'),
  '042':         require('./migrations/042_field_option_values'),
  '043':         require('./migrations/043_supplement_inherit_type'),
  '044':         require('./migrations/044_remove_workshop_crane_track'),
  '045':         require('./migrations/045_restore_act_field_defs'),
  '046':         require('./migrations/046_typed_relations'),
  '047':         require('./migrations/047_equipment_relations'),
  '048':         require('./migrations/048_backfill_part_of'),
  '049':         require('./migrations/049_charge_type'),
  '050':         require('./migrations/050_contract_payments'),
};

async function initMigrationTracker(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (
    name VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

async function runOnce(pool, name, fn) {
  const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE name=$1', [name]);
  if (rows.length > 0) return;
  await fn();
  await pool.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
  logger.info(`Migration ${name} applied`);
}

async function runMigrations(pool) {
  await initMigrationTracker(pool);
  for (const [name, fn] of Object.entries(migrations)) {
    await runOnce(pool, name, () => fn(pool));
  }
}

module.exports = { runMigrations };
