/**
 * 042_field_option_values
 *
 * Нормализует f.options (JSON-массив строк в field_definitions)
 * в отдельную таблицу field_option_values.
 *
 * field_definitions.options остаётся нетронутым (резервная копия).
 * API начнёт читать/писать из новой таблицы.
 */
module.exports = async function migration042(pool) {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS field_option_values (
      id                  SERIAL PRIMARY KEY,
      field_definition_id INTEGER NOT NULL REFERENCES field_definitions(id) ON DELETE CASCADE,
      value               TEXT NOT NULL,
      sort_order          INTEGER NOT NULL DEFAULT 0,
      UNIQUE(field_definition_id, value)
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_fov_field_id ON field_option_values(field_definition_id)`);

  // Backfill from existing options jsonb arrays
  const { rows } = await pool.query(`
    SELECT id, options
    FROM field_definitions
    WHERE options IS NOT NULL
      AND jsonb_typeof(options) = 'array'
      AND jsonb_array_length(options) > 0
  `);

  let count = 0;
  for (const fd of rows) {
    let vals = [];
    try { vals = Array.isArray(fd.options) ? fd.options : JSON.parse(fd.options); } catch (_) {}
    for (let i = 0; i < vals.length; i++) {
      const v = typeof vals[i] === 'string' ? vals[i] : String(vals[i]);
      if (!v.trim()) continue;
      await pool.query(
        `INSERT INTO field_option_values (field_definition_id, value, sort_order)
         VALUES ($1,$2,$3) ON CONFLICT (field_definition_id, value) DO NOTHING`,
        [fd.id, v, i]
      );
      count++;
    }
  }

  console.log(`042_field_option_values: ${count} option values migrated`);
};
