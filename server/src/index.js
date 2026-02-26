require('dotenv').config({ path: __dirname + '/../.env' });
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // We serve inline frontend
  crossOriginEmbedderPolicy: false,
}));

// CORS — restrict in production
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3001'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('CORS not allowed'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Rate limiting
app.use('/api', apiLimiter);

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  });
}

// Static files (maps, etc.)
app.use('/maps', express.static(path.join(__dirname, '../public/maps')));

// Inline frontend
const FRONTEND_HTML = require('./frontend');
app.get('/', (req, res) => { res.type('html').send(FRONTEND_HTML); });

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/entity-types', require('./routes/entityTypes'));
app.use('/api/entities', require('./routes/entities'));
app.use('/api/relations', require('./routes/relations'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/health', require('./routes/health'));

// SPA fallback
app.get('*', (req, res) => { res.type('html').send(FRONTEND_HTML); });

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Run migration 003 at startup
async function runMigration003() {
  const pool = require('./db');
  try {
    // contractor_name -> select_or_custom
    await pool.query("UPDATE field_definitions SET field_type = 'select_or_custom', options = '[]'::jsonb WHERE name = 'contractor_name' AND field_type = 'text'");

    // Add Аренды + Субаренды to contract_type options
    const ctRows = await pool.query("SELECT id, options FROM field_definitions WHERE name = 'contract_type'");
    for (const row of ctRows.rows) {
      let opts = Array.isArray(row.options) ? row.options : [];
      let changed = false;
      if (!opts.includes('Аренды')) { opts.splice(1, 0, 'Аренды'); changed = true; }
      if (!opts.includes('Субаренды')) { const i = opts.indexOf('Аренды'); opts.splice(i >= 0 ? i+1 : 2, 0, 'Субаренды'); changed = true; }
      if (changed) await pool.query('UPDATE field_definitions SET options = $1::jsonb WHERE id = $2', [JSON.stringify(opts), row.id]);
    }

    // Add changes_description to supplements
    const suppType = await pool.query("SELECT id FROM entity_types WHERE name = 'supplement'");
    if (suppType.rows.length > 0) {
      await pool.query("INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,sort_order) VALUES ($1,'changes_description','Что поменялось','text',12) ON CONFLICT (entity_type_id,name) DO NOTHING", [suppType.rows[0].id]);
    }

    // Reorder + add new fields for contract & supplement
    for (const tn of ['contract', 'supplement']) {
      const typeRes = await pool.query("SELECT id FROM entity_types WHERE name = $1", [tn]);
      if (typeRes.rows.length === 0) continue;
      const tid = typeRes.rows[0].id;

      const reorder = [['contract_type',0],['our_legal_entity',4],['contractor_name',6],['number',10],['contract_date',11]];
      for (const [fname,ord] of reorder) await pool.query("UPDATE field_definitions SET sort_order=$1 WHERE entity_type_id=$2 AND name=$3",[ord,tid,fname]);

      const newFields = [['our_role_label','Роль нашей стороны','text',3],['contractor_role_label','Роль контрагента','text',5],['subtenant_name','Субарендатор','select_or_custom',7]];
      for (const [fname,fru,ftype,ord] of newFields) {
        await pool.query("INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order) VALUES ($1,$2,$3,$4,'[]'::jsonb,$5) ON CONFLICT (entity_type_id,name) DO UPDATE SET sort_order=$5", [tid,fname,fru,ftype,ord]);
      }
    }

    // Add is_own to companies
    const compType = await pool.query("SELECT id FROM entity_types WHERE name = 'company'");
    if (compType.rows.length > 0) {
      await pool.query("INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,sort_order) VALUES ($1,'is_own','Наше юр. лицо','boolean',0) ON CONFLICT (entity_type_id,name) DO NOTHING", [compType.rows[0].id]);
    }

    console.log('Migration 003 applied successfully');
  } catch(e) {
    console.error('Migration 003 error (non-fatal):', e.message);
  }
}

async function runMigration004() {
  const pool = require('./db');
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

    console.log('Migration 004 applied successfully');
  } catch(e) {
    console.error('Migration 004 error (non-fatal):', e.message);
  }
}

async function runMigration005() {
  const pool = require('./db');
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
    console.log('Migration 005 applied successfully');
  } catch(e) {
    console.error('Migration 005 error (non-fatal):', e.message);
  }
}

async function runMigration006() {
  const pool = require('./db');
  try {
    // Rename 'Эксплуатации' → 'Обслуживания' in contract_type options
    const ctRows = await pool.query("SELECT id, options FROM field_definitions WHERE name = 'contract_type'");
    for (const row of ctRows.rows) {
      let opts = Array.isArray(row.options) ? row.options : [];
      const idx = opts.indexOf('Эксплуатации');
      if (idx !== -1) {
        opts[idx] = 'Обслуживания';
        await pool.query('UPDATE field_definitions SET options = $1::jsonb WHERE id = $2', [JSON.stringify(opts), row.id]);
      }
    }
    // Update existing contracts that have contract_type = 'Эксплуатации'
    await pool.query(`
      UPDATE entities
      SET properties = jsonb_set(properties, '{contract_type}', '"Обслуживания"')
      WHERE entity_type_id = (SELECT id FROM entity_types WHERE name = 'contract')
        AND properties->>'contract_type' = 'Эксплуатации'
    `);
    console.log('Migration 006 applied successfully');
  } catch(e) {
    console.error('Migration 006 error (non-fatal):', e.message);
  }
}

async function runMigration007() {
  const pool = require('./db');
  try {
    // Add contract_end_date to common contract fields (shown for all contract types)
    const contractTypeRow = await pool.query("SELECT id FROM entity_types WHERE name = 'contract'");
    if (contractTypeRow.rows.length > 0) {
      const tid = contractTypeRow.rows[0].id;
      await pool.query(`INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, 'contract_end_date', 'Срок действия (до)', 'date', 12)
        ON CONFLICT (entity_type_id, name) DO NOTHING`, [tid]);
    }
    // Same for supplement type
    const suppTypeRow = await pool.query("SELECT id FROM entity_types WHERE name = 'supplement'");
    if (suppTypeRow.rows.length > 0) {
      const tid = suppTypeRow.rows[0].id;
      await pool.query(`INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, 'contract_end_date', 'Срок действия (до)', 'date', 12)
        ON CONFLICT (entity_type_id, name) DO NOTHING`, [tid]);
    }
    console.log('Migration 007 applied successfully');
  } catch(e) {
    console.error('Migration 007 error (non-fatal):', e.message);
  }
}

async function runMigration008() {
  const pool = require('./db');
  try {
    // Add vat_rate to common contract fields (shown for all types except Аренды/Субаренды
    // where it's handled in CONTRACT_TYPE_FIELDS with special rent calculation logic)
    const contractTypeRow = await pool.query("SELECT id FROM entity_types WHERE name = 'contract'");
    if (contractTypeRow.rows.length > 0) {
      const tid = contractTypeRow.rows[0].id;
      await pool.query(`INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
        VALUES ($1, 'vat_rate', 'в т.ч. НДС, %', 'number', 13)
        ON CONFLICT (entity_type_id, name) DO UPDATE SET name_ru = 'в т.ч. НДС, %', sort_order = 13`, [tid]);
    }
    console.log('Migration 008 applied successfully');
  } catch(e) {
    console.error('Migration 008 error (non-fatal):', e.message);
  }
}

async function runMigration009() {
  const pool = require('./db');
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

    console.log('Migration 009 applied successfully');
  } catch(e) {
    console.error('Migration 009 error (non-fatal):', e.message);
  }
}

async function runMigration010() {
  const pool = require('./db');
  try {
    const actId = (await pool.query("SELECT id FROM entity_types WHERE name='act'")).rows[0]?.id;
    if (!actId) { console.log('Migration 010: act type not found, skipping'); return; }
    // Add conclusion field to act (sort_order 7)
    await pool.query(
      `INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order)
       VALUES ($1,'conclusion','Заключение','textarea',NULL,7)
       ON CONFLICT (entity_type_id,name) DO NOTHING`,
      [actId]
    );
    // Change comment field to textarea for better UX on long texts
    await pool.query(
      `UPDATE field_definitions SET field_type='textarea' WHERE entity_type_id=$1 AND name='comment'`,
      [actId]
    );
    console.log('Migration 010 applied successfully');
  } catch(e) {
    console.error('Migration 010 error (non-fatal):', e.message);
  }
}

async function runMigration011() {
  const pool = require('./db');
  try {
    await pool.query(
      `UPDATE field_definitions
       SET options = $1
       WHERE name = 'status'
         AND entity_type_id = (SELECT id FROM entity_types WHERE name = 'equipment')
         AND NOT (options::jsonb @> '"Аварийное"'::jsonb)`,
      [JSON.stringify(['В работе','На ремонте','Законсервировано','Списано','Аварийное'])]
    );
    console.log('Migration 011 applied: added Аварийное status for equipment');
  } catch(e) {
    console.error('Migration 011 error (non-fatal):', e.message);
  }
}

async function runMigration012() {
  const pool = require('./db');
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { console.log('Migration 012: room type not found, skipping'); return; }
    const roomId = roomRow.rows[0].id;
    const fields = [
      ['room_type',    'Тип помещения',      'text', null, 0],
      ['description',  'Описание помещения',  'text', null, 1],
      ['area',         'Площадь, м²',         'number', null, 2],
      ['floor',        'Этаж',                'text', null, 3],
    ];
    for (const [n,r,t,o,s] of fields) {
      await pool.query(
        `INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (entity_type_id,name) DO UPDATE SET name_ru=$3,field_type=$4,sort_order=$6`,
        [roomId,n,r,t,o,s]);
    }
    console.log('Migration 012 applied: room fields added');
  } catch(e) {
    console.error('Migration 012 error (non-fatal):', e.message);
  }
}

async function runMigration013() {
  const pool = require('./db');
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
    console.log('Migration 013 applied: land_plot_part entity type added');
  } catch(e) {
    console.error('Migration 013 error (non-fatal):', e.message);
  }
}

async function runMigration014() {
  const pool = require('./db');
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { console.log('Migration 014: room type not found, skipping'); return; }
    const roomId = roomRow.rows[0].id;
    const opts = JSON.stringify(['Производство класс В', 'Производство класс С', 'Офис', 'Склад', 'ЗУ', 'Вендомат']);
    await pool.query(
      `INSERT INTO field_definitions (entity_type_id,name,name_ru,field_type,options,sort_order)
       VALUES ($1,'object_type','Тип объекта','select',$2,-1)
       ON CONFLICT (entity_type_id,name) DO UPDATE SET name_ru=EXCLUDED.name_ru,field_type=EXCLUDED.field_type,options=EXCLUDED.options,sort_order=EXCLUDED.sort_order`,
      [roomId, opts]);
    await pool.query(
      `UPDATE field_definitions SET sort_order=99 WHERE entity_type_id=$1 AND name='room_type'`,
      [roomId]);
    console.log('Migration 014 applied: room object_type field added');
  } catch(e) {
    console.error('Migration 014 error (non-fatal):', e.message);
  }
}

async function runMigration015() {
  const pool = require('./db');
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { console.log('Migration 015: room type not found, skipping'); return; }
    const roomId = roomRow.rows[0].id;

    // Collect distinct object_type values actually used in room entities
    const { rows: usedRows } = await pool.query(`
      SELECT DISTINCT e.properties->>'object_type' AS val
      FROM entities e
      WHERE e.entity_type_id = $1
        AND e.deleted_at IS NULL
        AND e.properties->>'object_type' IS NOT NULL
        AND e.properties->>'object_type' != ''
      ORDER BY 1
    `, [roomId]);
    const used = usedRows.map(r => r.val);

    // Existing options in справочник
    const { rows: fdRows } = await pool.query(
      `SELECT options FROM field_definitions WHERE entity_type_id=$1 AND name='object_type'`, [roomId]);
    let existing = [];
    if (fdRows.length > 0 && fdRows[0].options) {
      try { existing = Array.isArray(fdRows[0].options) ? fdRows[0].options : JSON.parse(fdRows[0].options); } catch(e) {}
    }

    // Merge: existing + used, deduplicate, remove ЗУ/Вендомат (not room types)
    const notRoomTypes = ['ЗУ', 'Вендомат'];
    const merged = [...new Set([...existing, ...used])].filter(v => !notRoomTypes.includes(v)).sort();

    await pool.query(
      `UPDATE field_definitions SET name_ru='Тип помещения', field_type='select_or_custom', options=$1::jsonb
       WHERE entity_type_id=$2 AND name='object_type'`,
      [JSON.stringify(merged), roomId]);

    console.log('Migration 015 applied: room object_type options populated from DB:', merged);
  } catch(e) {
    console.error('Migration 015 error (non-fatal):', e.message);
  }
}

async function runMigration016() {
  const pool = require('./db');
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { console.log('Migration 016: room type not found, skipping'); return; }
    const roomId = roomRow.rows[0].id;
    // Hide room_number (duplicates name) and room_type (old text field, replaced by object_type from справочник)
    await pool.query(
      `UPDATE field_definitions SET sort_order = 999 WHERE entity_type_id = $1 AND name IN ('room_number', 'room_type')`,
      [roomId]);
    console.log('Migration 016 applied: room_number and room_type hidden (sort_order=999)');
  } catch(e) {
    console.error('Migration 016 error (non-fatal):', e.message);
  }
}

async function runMigration017() {
  const pool = require('./db');
  try {
    for (const typeName of ['building', 'land_plot']) {
      const res = await pool.query("SELECT id FROM entity_types WHERE name=$1", [typeName]);
      if (res.rows.length === 0) continue;
      const typeId = res.rows[0].id;
      // Check if field already exists
      const exists = await pool.query(
        "SELECT id FROM field_definitions WHERE entity_type_id=$1 AND name='short_name'", [typeId]);
      if (exists.rows.length > 0) { console.log(`Migration 017: short_name already exists for ${typeName}`); continue; }
      // Get max sort_order to insert after all existing fields (but before hidden ones)
      const maxRes = await pool.query(
        "SELECT MAX(sort_order) as mx FROM field_definitions WHERE entity_type_id=$1 AND sort_order < 900", [typeId]);
      const nextOrder = (maxRes.rows[0].mx || 0) + 1;
      await pool.query(
        `INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
         VALUES ($1, 'short_name', 'Короткое имя (для карты)', 'text', $2)
         ON CONFLICT (entity_type_id, name) DO NOTHING`,
        [typeId, nextOrder]);
      console.log(`Migration 017: added short_name to ${typeName} at sort_order ${nextOrder}`);
    }
  } catch(e) {
    console.error('Migration 017 error (non-fatal):', e.message);
  }
}

// One-time data fix: merge "ОРР Веста" → "ОРР Веста, АО"
async function mergeORRVesta() {
  const pool = require('./db');
  try {
    // Find both companies
    const { rows: src } = await pool.query(
      `SELECT id, properties FROM entities WHERE LOWER(name) = LOWER('ОРР Веста') AND entity_type_id=(SELECT id FROM entity_types WHERE name='company') LIMIT 1`);
    const { rows: dst } = await pool.query(
      `SELECT id, properties FROM entities WHERE LOWER(name) = LOWER('ОРР Веста, АО') AND entity_type_id=(SELECT id FROM entity_types WHERE name='company') LIMIT 1`);
    if (src.length === 0) { console.log('mergeORRVesta: source not found, skipping'); return; }
    if (dst.length === 0) { console.log('mergeORRVesta: destination not found, skipping'); return; }
    const srcId = src[0].id, dstId = dst[0].id;
    const srcProps = src[0].properties || {}, dstProps = dst[0].properties || {};

    // Merge properties: copy src fields into dst where dst has no value
    const mergedProps = Object.assign({}, srcProps, dstProps); // dst takes priority
    await pool.query(`UPDATE entities SET properties=$1 WHERE id=$2`, [mergedProps, dstId]);

    // Reassign all relations
    await pool.query(`UPDATE relations SET from_entity_id=$1 WHERE from_entity_id=$2`, [dstId, srcId]);
    await pool.query(`UPDATE relations SET to_entity_id=$1 WHERE to_entity_id=$2`, [dstId, srcId]);

    // Update string references in contract properties (name-based fields)
    const nameFields = ['contractor_name', 'our_legal_entity', 'subtenant_name', 'balance_owner_name'];
    for (const field of nameFields) {
      await pool.query(
        `UPDATE entities SET properties = jsonb_set(properties, $1, $2)
         WHERE properties->>$3 ILIKE 'ОРР Веста'`,
        [[field], JSON.stringify('ОРР Веста, АО'), field]);
    }

    // Update ID-based references
    const idFields = ['contractor_id', 'our_legal_entity_id', 'balance_owner_id'];
    for (const field of idFields) {
      await pool.query(
        `UPDATE entities SET properties = jsonb_set(properties, $1, $2::jsonb)
         WHERE (properties->>$3)::int = $4`,
        [[field], String(dstId), field, srcId]);
    }

    // Delete source
    await pool.query(`DELETE FROM entities WHERE id=$1`, [srcId]);
    console.log(`mergeORRVesta: merged entity ${srcId} into ${dstId}, deleted source`);
  } catch(e) {
    console.error('mergeORRVesta error (non-fatal):', e.message);
  }
}

runMigration003().then(() => runMigration004()).then(() => runMigration005()).then(() => runMigration006()).then(() => runMigration007()).then(() => runMigration008()).then(() => runMigration009()).then(() => runMigration010()).then(() => runMigration011()).then(() => runMigration012()).then(() => runMigration013()).then(() => runMigration014()).then(() => runMigration015()).then(() => runMigration016()).then(() => runMigration017()).then(() => mergeORRVesta()).then(() => {
  app.listen(PORT, () => console.log(`IndParkDocs running on port ${PORT}`));
});

module.exports = app; // for testing
