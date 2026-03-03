const logger = require('../logger');

module.exports = async function runMigration004(pool) {
  try {
    // Add land_plot entity type
    await pool.query(`INSERT INTO entity_types (name,name_ru,icon,color,sort_order) VALUES ('land_plot','Земельный участок','🌍','#10B981',10) ON CONFLICT (name) DO UPDATE SET name_ru=EXCLUDED.name_ru,icon=EXCLUDED.icon`);
    const lpId = (await pool.query("SELECT id FROM entity_types WHERE name='land_plot'")).rows[0].id;
    const lpFields = [
      ['cadastral_number','Кадастровый номер','text',null,0],
      ['area','Площадь (га)','number',null,1],
      ['purpose','Разрешённое использование','text',null,2],
    ];
    for (const [n,r,t,o,s] of lpFields) await pool.query(`INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (entity_type_id,name) DO NOTHING`,[lpId,n,r,t,o,s]);

    // Add order entity type
    await pool.query(`INSERT INTO entity_types (name,name_ru,icon,color,sort_order) VALUES ('order','Приказ','📜','#6366F1',11) ON CONFLICT (name) DO UPDATE SET name_ru=EXCLUDED.name_ru,icon=EXCLUDED.icon`);
    const ordId = (await pool.query("SELECT id FROM entity_types WHERE name='order'")).rows[0].id;
    const ordFields = [
      ['order_number','Номер приказа','text',null,0],
      ['order_date','Дата','date',null,1],
      ['order_type','Тип','select',JSON.stringify(['Консервация','Расконсервация','Списание','Передача','Прочее']),2],
      ['issued_by','Кем выдан','text',null,3],
    ];
    for (const [n,r,t,o,s] of ordFields) await pool.query(`INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (entity_type_id,name) DO NOTHING`,[ordId,n,r,t,o,s]);

    // Update equipment fields
    const eqId = (await pool.query("SELECT id FROM entity_types WHERE name='equipment'")).rows[0].id;
    // Remove old fields
    await pool.query("DELETE FROM field_definitions WHERE entity_type_id=$1 AND name IN ('equipment_type','capacity')",[eqId]);
    // Add / update new fields
    const eqFields = [
      ['equipment_category','Категория','select',JSON.stringify(['Электрооборудование','Газовое','Тепловое','Крановое хозяйство','Машины и механизмы','ИК оборудование']),0],
      ['equipment_kind','Вид','text',null,1],
      ['inv_number','Инв. номер','text',null,2],
      ['serial_number','Серийный номер','text',null,3],
      ['year','Год выпуска','text',null,4],
      ['manufacturer','Производитель','text',null,5],
      ['status','Статус','select',JSON.stringify(['В работе','На ремонте','Законсервировано','Списано']),6],
      ['balance_owner','Балансодержатель','text',null,7],
      ['note','Примечание','text',null,8],
    ];
    for (const [n,r,t,o,s] of eqFields) await pool.query(`INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (entity_type_id,name) DO UPDATE SET name_ru=$3,field_type=$4,options=$5,sort_order=$6`,[eqId,n,r,t,o,s]);

    // Add on_balance relation type
    await pool.query(`INSERT INTO relation_types (name,name_ru,color) VALUES ('on_balance','на балансе','#3B82F6') ON CONFLICT (name) DO NOTHING`);

    logger.info('Migration 004 applied successfully');
  } catch(e) {
    logger.error('Migration 004 error (non-fatal):', e.message);
  }
};
