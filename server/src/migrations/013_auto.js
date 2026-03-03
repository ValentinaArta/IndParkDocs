const logger = require('../logger');

module.exports = async function runMigration013(pool) {
  try {
    await pool.query(`INSERT INTO entity_types (name,name_ru,icon,color,sort_order)
      VALUES ('land_plot_part','Часть ЗУ','🗺','#059669',10)
      ON CONFLICT (name) DO UPDATE SET name_ru=EXCLUDED.name_ru,icon=EXCLUDED.icon`);
    const lpPartId = (await pool.query("SELECT id FROM entity_types WHERE name='land_plot_part'")).rows[0].id;
    const fields = [
      ['description', 'Описание',    'text',   null, 0],
      ['area',        'Площадь (га)','number', null, 1],
    ];
    for (const [n,r,t,o,s] of fields) {
      await pool.query(
        `INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (entity_type_id,name) DO NOTHING`,
        [lpPartId,n,r,t,o,s]);
    }
    logger.info('Migration 013 applied: land_plot_part entity type added');
  } catch(e) {
    logger.error('Migration 013 error (non-fatal):', e.message);
  }
};
