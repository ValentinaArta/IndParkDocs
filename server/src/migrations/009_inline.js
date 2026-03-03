// Migration 009 — extracted from index.js
const logger = require('../logger');

module.exports = async function runMigration009(pool) {
  try {
    // 1. Rename "Балансодержатель" → "Собственник" for equipment balance_owner field
    await pool.query(`UPDATE field_definitions SET name_ru='Собственник' WHERE name='balance_owner'`);

    // 2. Update land_plot fields: add owner, address, cadastral_value, cadastral_value_date
    const lpRow = await pool.query("SELECT id FROM entity_types WHERE name='land_plot'");
    if (lpRow.rows.length > 0) {
      const lpId = lpRow.rows[0].id;
      const lpFields = [
        ['owner',                 'Собственник',              'text',   null, 0],
        ['address',               'Адрес',                    'text',   null, 1],
        ['cadastral_number',      'Кадастровый номер',        'text',   null, 2],
        ['area',                  'Площадь (га)',             'number', null, 3],
        ['cadastral_value',       'Кадастровая стоимость',   'number', null, 4],
        ['cadastral_value_date',  'Дата кад. стоимости',     'date',   null, 5],
        ['purpose',               'Разрешённое использование','text',  null, 6],
      ];
      for (const [n,r,t,o,s] of lpFields) {
        await pool.query(
          `INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order) VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (entity_type_id,name) DO UPDATE SET name_ru=$3,field_type=$4,options=$5,sort_order=$6`,
          [lpId,n,r,t,o,s]);
      }
    }

    // 3. Add building fields: cadastral_number, cadastral_value, cadastral_value_date
    const bldRow = await pool.query("SELECT id FROM entity_types WHERE name='building'");
    if (bldRow.rows.length > 0) {
      const bldId = bldRow.rows[0].id;
      const bldFields = [
        ['cadastral_number',     'Кадастровый номер здания',  'text',   null, 10],
        ['cadastral_value',      'Кадастровая стоимость',     'number', null, 11],
        ['cadastral_value_date', 'Дата кад. стоимости',       'date',   null, 12],
      ];
      for (const [n,r,t,o,s] of bldFields) {
        await pool.query(
          `INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order) VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (entity_type_id,name) DO UPDATE SET name_ru=$3,field_type=$4,options=$5,sort_order=$6`,
          [bldId,n,r,t,o,s]);
      }
    }

    // 4. Add relation type 'located_on' for building → land_plot
    await pool.query(`INSERT INTO relation_types (name,name_ru,color) VALUES ('located_on','расположен на','#10B981') ON CONFLICT (name) DO NOTHING`);

    logger.info('Migration 009 applied successfully');
  } catch(e) {
    logger.error('Migration 009 error (non-fatal):', e.message);
  }
};
