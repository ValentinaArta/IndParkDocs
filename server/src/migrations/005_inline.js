// Migration 005 — extracted from index.js
const logger = require('../logger');

module.exports = async function runMigration005(pool) {
  try {
    // Add 'act' entity type (Акт)
    await pool.query(`INSERT INTO entity_types (name,name_ru,icon,color,sort_order) VALUES ('act','Акт','📝','#F59E0B',12) ON CONFLICT (name) DO UPDATE SET name_ru=EXCLUDED.name_ru,icon=EXCLUDED.icon`);
    const actId = (await pool.query("SELECT id FROM entity_types WHERE name='act'")).rows[0].id;
    const actFields = [
      ['act_number',         'Номер акта',         'text',   null, 0],
      ['act_date',           'Дата акта',           'date',   null, 1],
      ['comment',            'Комментарий',         'text',   null, 2],
      ['parent_contract_id', 'ID договора',         'text',   null, 3],
      ['parent_contract_name','Договор-основание',  'text',   null, 4],
      ['act_items',          'Позиции акта',        'act_items', null, 5],
      ['total_amount',       'Итого по акту',       'number', null, 6],
    ];
    for (const [n,r,t,o,s] of actFields) {
      await pool.query(`INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (entity_type_id,name) DO NOTHING`, [actId,n,r,t,o,s]);
    }
    // Ensure supplement_to relation type exists
    await pool.query(`INSERT INTO relation_types (name,name_ru,color) VALUES ('supplement_to','акт к договору','#F59E0B') ON CONFLICT (name) DO NOTHING`);
    logger.info('Migration 005 applied successfully');
  } catch(e) {
    logger.error('Migration 005 error (non-fatal):', e.message);
  }
};
