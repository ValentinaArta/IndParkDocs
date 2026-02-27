const logger = require('./logger');
require('dotenv').config({ path: __dirname + '/../.env' });
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const xssClean = require('./middleware/xssClean');

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://benthic-hull.metabaseapp.com"],
    },
  },
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
app.use(xssClean);

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

// Finance dashboard (demo)
app.get('/finance', (req, res) => {
  res.sendFile(path.join(__dirname, 'finance-dashboard.html'));
});

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

// Migration tracker — run each migration only once
async function initMigrationTracker() {
  const pool = require('./db');
  await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (
    name VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}

async function runOnce(name, fn) {
  const pool = require('./db');
  const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE name=$1', [name]);
  if (rows.length > 0) return;
  await fn();
  await pool.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
  logger.info(`Migration ${name} applied`);
}

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

    logger.info('Migration 003 applied successfully');
  } catch(e) {
    logger.error('Migration 003 error (non-fatal):', e.message);
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

    logger.info('Migration 004 applied successfully');
  } catch(e) {
    logger.error('Migration 004 error (non-fatal):', e.message);
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
    logger.info('Migration 005 applied successfully');
  } catch(e) {
    logger.error('Migration 005 error (non-fatal):', e.message);
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
    logger.info('Migration 006 applied successfully');
  } catch(e) {
    logger.error('Migration 006 error (non-fatal):', e.message);
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
    logger.info('Migration 007 applied successfully');
  } catch(e) {
    logger.error('Migration 007 error (non-fatal):', e.message);
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
    logger.info('Migration 008 applied successfully');
  } catch(e) {
    logger.error('Migration 008 error (non-fatal):', e.message);
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

    logger.info('Migration 009 applied successfully');
  } catch(e) {
    logger.error('Migration 009 error (non-fatal):', e.message);
  }
}

async function runMigration010() {
  const pool = require('./db');
  try {
    const actId = (await pool.query("SELECT id FROM entity_types WHERE name='act'")).rows[0]?.id;
    if (!actId) { logger.info('Migration 010: act type not found, skipping'); return; }
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
    logger.info('Migration 010 applied successfully');
  } catch(e) {
    logger.error('Migration 010 error (non-fatal):', e.message);
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
    logger.info('Migration 011 applied: added Аварийное status for equipment');
  } catch(e) {
    logger.error('Migration 011 error (non-fatal):', e.message);
  }
}

async function runMigration012() {
  const pool = require('./db');
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { logger.info('Migration 012: room type not found, skipping'); return; }
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
    logger.info('Migration 012 applied: room fields added');
  } catch(e) {
    logger.error('Migration 012 error (non-fatal):', e.message);
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
    logger.info('Migration 013 applied: land_plot_part entity type added');
  } catch(e) {
    logger.error('Migration 013 error (non-fatal):', e.message);
  }
}

async function runMigration014() {
  const pool = require('./db');
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { logger.info('Migration 014: room type not found, skipping'); return; }
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
    logger.info('Migration 014 applied: room object_type field added');
  } catch(e) {
    logger.error('Migration 014 error (non-fatal):', e.message);
  }
}

async function runMigration015() {
  const pool = require('./db');
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { logger.info('Migration 015: room type not found, skipping'); return; }
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

    logger.info('Migration 015 applied: room object_type options populated from DB:', merged);
  } catch(e) {
    logger.error('Migration 015 error (non-fatal):', e.message);
  }
}

async function runMigration016() {
  const pool = require('./db');
  try {
    const roomRow = await pool.query("SELECT id FROM entity_types WHERE name='room'");
    if (roomRow.rows.length === 0) { logger.info('Migration 016: room type not found, skipping'); return; }
    const roomId = roomRow.rows[0].id;
    // Hide room_number (duplicates name) and room_type (old text field, replaced by object_type from справочник)
    await pool.query(
      `UPDATE field_definitions SET sort_order = 999 WHERE entity_type_id = $1 AND name IN ('room_number', 'room_type')`,
      [roomId]);
    logger.info('Migration 016 applied: room_number and room_type hidden (sort_order=999)');
  } catch(e) {
    logger.error('Migration 016 error (non-fatal):', e.message);
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
      if (exists.rows.length > 0) { logger.info(`Migration 017: short_name already exists for ${typeName}`); continue; }
      // Get max sort_order to insert after all existing fields (but before hidden ones)
      const maxRes = await pool.query(
        "SELECT MAX(sort_order) as mx FROM field_definitions WHERE entity_type_id=$1 AND sort_order < 900", [typeId]);
      const nextOrder = (maxRes.rows[0].mx || 0) + 1;
      await pool.query(
        `INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, sort_order)
         VALUES ($1, 'short_name', 'Короткое имя для карты (только код, напр. 12к)', 'text', $2)
         ON CONFLICT (entity_type_id, name) DO UPDATE SET name_ru=EXCLUDED.name_ru`,
        [typeId, nextOrder]);
      logger.info(`Migration 017: added short_name to ${typeName} at sort_order ${nextOrder}`);
    }
  } catch(e) {
    logger.error('Migration 017 error (non-fatal):', e.message);
  }
}

async function runMigration018() {
  const pool = require('./db');
  try {
    // Update area field label to кв.м. for land_plot
    const res = await pool.query("SELECT id FROM entity_types WHERE name='land_plot'");
    if (res.rows.length === 0) return;
    const typeId = res.rows[0].id;
    await pool.query(
      `UPDATE field_definitions SET name_ru = 'Площадь, кв.м.'
       WHERE entity_type_id=$1 AND name='area' AND name_ru != 'Площадь, кв.м.'`,
      [typeId]);
    logger.info('Migration 018: area field unit updated to кв.м.');
  } catch(e) {
    logger.error('Migration 018 error (non-fatal):', e.message);
  }
}

// One-time data fix: merge "ОРР Веста" → "ОРР Веста, АО"
async function runMigration019() {
  const pool = require('./db');
  try {
    // Add payment_frequency field to contract entity type
    const ct = await pool.query(`SELECT id FROM entity_types WHERE name='contract'`);
    if (!ct.rows.length) return;
    const ctId = ct.rows[0].id;
    await pool.query(`
      INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
      VALUES ($1, 'payment_frequency', 'Периодичность оплаты', 'select_or_custom',
        '["Единовременно","Ежемесячно","Ежеквартально","Раз в полгода","Ежегодно"]'::jsonb, 14)
      ON CONFLICT DO NOTHING
    `, [ctId]);
    logger.info('runMigration019: payment_frequency field added');
  } catch(e) { logger.error('runMigration019 error (non-fatal):', e.message); }
}

async function mergeORRVesta() {
  const pool = require('./db');
  try {
    // Find both companies
    const { rows: src } = await pool.query(
      `SELECT id, properties FROM entities WHERE LOWER(name) = LOWER('ОРР Веста') AND entity_type_id=(SELECT id FROM entity_types WHERE name='company') LIMIT 1`);
    const { rows: dst } = await pool.query(
      `SELECT id, properties FROM entities WHERE LOWER(name) = LOWER('ОРР Веста, АО') AND entity_type_id=(SELECT id FROM entity_types WHERE name='company') LIMIT 1`);
    if (src.length === 0) { logger.info('mergeORRVesta: source not found, skipping'); return; }
    if (dst.length === 0) { logger.info('mergeORRVesta: destination not found, skipping'); return; }
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
    logger.info(`mergeORRVesta: merged entity ${srcId} into ${dstId}, deleted source`);
  } catch(e) {
    logger.error('mergeORRVesta error (non-fatal):', e.message);
  }
}

async function createBIViews() {
  const pool = require('./db');
  try {
    // v_bi_contracts — all contracts, JSONB flattened to columns
    await pool.query(`CREATE OR REPLACE VIEW v_bi_contracts AS
      SELECT
        e.id, e.name, e.created_at,
        e.properties->>'contract_type'       AS contract_type,
        e.properties->>'number'              AS contract_number,
        e.properties->>'our_legal_entity'    AS our_legal_entity,
        e.properties->>'our_role_label'      AS our_role,
        e.properties->>'contractor_name'     AS contractor_name,
        e.properties->>'contractor_role_label' AS contractor_role,
        e.properties->>'subtenant_name'      AS subtenant_name,
        e.properties->>'contract_date'       AS contract_date,
        e.properties->>'contract_end_date'   AS contract_end_date,
        NULLIF(e.properties->>'contract_amount','')::numeric  AS contract_amount,
        NULLIF(e.properties->>'rent_monthly','')::numeric     AS rent_monthly,
        NULLIF(e.properties->>'advance_amount','')::numeric   AS advance_amount,
        NULLIF(e.properties->>'vat_rate','')::numeric         AS vat_rate,
        e.properties->>'subject'             AS subject,
        e.properties->>'service_subject'     AS service_subject,
        e.properties->>'building'            AS building,
        e.properties->>'completion_deadline' AS completion_deadline
      FROM entities e
      JOIN entity_types et ON e.entity_type_id = et.id
      WHERE et.name = 'contract' AND e.deleted_at IS NULL`);

    // v_bi_supplements — all supplements flat
    await pool.query(`CREATE OR REPLACE VIEW v_bi_supplements AS
      SELECT
        e.id, e.name, e.parent_id AS contract_id, e.created_at,
        e.properties->>'contract_type'       AS contract_type,
        e.properties->>'number'              AS supplement_number,
        e.properties->>'our_legal_entity'    AS our_legal_entity,
        e.properties->>'contractor_name'     AS contractor_name,
        e.properties->>'subtenant_name'      AS subtenant_name,
        e.properties->>'contract_date'       AS contract_date,
        e.properties->>'contract_end_date'   AS contract_end_date,
        NULLIF(e.properties->>'contract_amount','')::numeric  AS contract_amount,
        NULLIF(e.properties->>'rent_monthly','')::numeric     AS rent_monthly,
        NULLIF(e.properties->>'vat_rate','')::numeric         AS vat_rate,
        e.properties->>'changes_description' AS changes_description
      FROM entities e
      JOIN entity_types et ON e.entity_type_id = et.id
      WHERE et.name = 'supplement' AND e.deleted_at IS NULL`);

    // v_bi_rent_objects — rent objects array exploded (one row per rented object)
    // Fix: rent_objects stored as JSON string → cast via ->>'rent_objects')::jsonb
    // Fix: correct field names: area (not total_area), room (not object_name)
    await pool.query(`CREATE OR REPLACE VIEW v_bi_rent_objects AS
      SELECT
        e.id AS contract_id,
        e.name AS contract_name,
        e.properties->>'contract_type'    AS contract_type,
        e.properties->>'contractor_name'  AS tenant_name,
        e.properties->>'our_legal_entity' AS landlord_name,
        e.properties->>'contract_date'    AS contract_date,
        e.properties->>'contract_end_date' AS contract_end_date,
        COALESCE(NULLIF(e.properties->>'vat_rate','')::numeric, 22) AS vat_rate,
        obj->>'room'        AS room_name,
        obj->>'building'    AS building_name,
        obj->>'object_type' AS object_type,
        obj->>'comment'     AS comment,
        NULLIF(obj->>'area','')::numeric       AS area_sqm,
        NULLIF(obj->>'rent_rate','')::numeric   AS rate_per_sqm,
        ROUND(
          COALESCE(NULLIF(obj->>'area','')::numeric, 0)
          * COALESCE(NULLIF(obj->>'rent_rate','')::numeric, 0),
          2
        ) AS monthly_amount_net
      FROM entities e
      JOIN entity_types et ON e.entity_type_id = et.id
      CROSS JOIN LATERAL jsonb_array_elements(
        (e.properties->>'rent_objects')::jsonb
      ) AS obj
      WHERE et.name IN ('contract','supplement')
        AND e.deleted_at IS NULL
        AND e.properties->>'rent_objects' IS NOT NULL
        AND e.properties->>'rent_objects' != ''
        AND e.properties->>'rent_objects' != '[]'`);

    // v_bi_equipment — equipment with building, owner, all fields
    await pool.query(`CREATE OR REPLACE VIEW v_bi_equipment AS
      SELECT
        e.id, e.name, e.created_at,
        e.properties->>'equipment_category' AS category,
        e.properties->>'equipment_kind'     AS kind,
        e.properties->>'status'             AS status,
        e.properties->>'inv_number'         AS inv_number,
        e.properties->>'serial_number'      AS serial_number,
        e.properties->>'year'               AS manufacture_year,
        e.properties->>'manufacturer'       AS manufacturer,
        e.properties->>'balance_owner_name' AS owner,
        e.properties->>'note'               AS note,
        bld.name  AS building_name,
        par.name  AS parent_name
      FROM entities e
      JOIN entity_types et ON e.entity_type_id = et.id
      LEFT JOIN relations r_loc ON r_loc.from_entity_id = e.id
        AND r_loc.relation_type = 'located_in' AND r_loc.deleted_at IS NULL
      LEFT JOIN entities bld ON bld.id = r_loc.to_entity_id AND bld.deleted_at IS NULL
      LEFT JOIN entities par ON par.id = e.parent_id AND par.deleted_at IS NULL
      WHERE et.name = 'equipment' AND e.deleted_at IS NULL`);

    // v_bi_buildings — buildings with owner, land plot, all cadastral fields
    await pool.query(`CREATE OR REPLACE VIEW v_bi_buildings AS
      SELECT
        e.id, e.name, e.created_at,
        e.properties->>'address'            AS address,
        e.properties->>'short_name'         AS short_name,
        NULLIF(e.properties->>'total_area','')::numeric       AS total_area_sqm,
        e.properties->>'cadastral_number'   AS cadastral_number,
        NULLIF(e.properties->>'cadastral_value','')::numeric  AS cadastral_value,
        e.properties->>'cadastral_value_date' AS cadastral_value_date,
        e.properties->>'balance_owner_name' AS owner,
        lp.name AS land_plot_name,
        lp.properties->>'cadastral_number'  AS land_cadastral_number,
        NULLIF(lp.properties->>'area','')::numeric AS land_area_sqm
      FROM entities e
      JOIN entity_types et ON e.entity_type_id = et.id
      LEFT JOIN relations r_loc ON r_loc.from_entity_id = e.id
        AND r_loc.relation_type = 'located_on' AND r_loc.deleted_at IS NULL
      LEFT JOIN entities lp ON lp.id = r_loc.to_entity_id AND lp.deleted_at IS NULL
      WHERE et.name = 'building' AND e.deleted_at IS NULL`);

    // v_bi_land_plots — land plots with all fields
    await pool.query(`CREATE OR REPLACE VIEW v_bi_land_plots AS
      SELECT
        e.id, e.name, e.created_at,
        e.properties->>'address'              AS address,
        e.properties->>'short_name'           AS short_name,
        e.properties->>'cadastral_number'     AS cadastral_number,
        NULLIF(e.properties->>'area','')::numeric               AS area_sqm,
        NULLIF(e.properties->>'cadastral_value','')::numeric    AS cadastral_value,
        e.properties->>'cadastral_value_date' AS cadastral_value_date,
        e.properties->>'purpose'              AS purpose,
        e.properties->>'balance_owner_name'   AS owner,
        e.properties->>'owner_name'           AS owner_alt
      FROM entities e
      JOIN entity_types et ON e.entity_type_id = et.id
      WHERE et.name = 'land_plot' AND e.deleted_at IS NULL`);

    // v_bi_companies — companies (contractors + own legal entities)
    await pool.query(`CREATE OR REPLACE VIEW v_bi_companies AS
      SELECT
        e.id, e.name, e.created_at,
        CASE WHEN (e.properties->>'is_own') = 'true' THEN 'Наше юрлицо' ELSE 'Контрагент' END AS company_type,
        e.properties->>'inn'            AS inn,
        e.properties->>'contact_person' AS contact_person,
        e.properties->>'phone'          AS phone,
        e.properties->>'email'          AS email
      FROM entities e
      JOIN entity_types et ON e.entity_type_id = et.id
      WHERE et.name = 'company' AND e.deleted_at IS NULL`);

    // v_bi_rooms — rooms with building and type
    await pool.query(`CREATE OR REPLACE VIEW v_bi_rooms AS
      SELECT
        e.id, e.name, e.created_at,
        e.properties->>'object_type'  AS room_type,
        e.properties->>'description'  AS description,
        NULLIF(e.properties->>'area','')::numeric AS area_sqm,
        e.properties->>'floor'        AS floor,
        par.name AS building_name,
        par.id   AS building_id
      FROM entities e
      JOIN entity_types et ON e.entity_type_id = et.id
      LEFT JOIN entities par ON par.id = e.parent_id AND par.deleted_at IS NULL
      WHERE et.name = 'room' AND e.deleted_at IS NULL`);

    // v_bi_acts — acts with contract, amounts, all fields
    await pool.query(`CREATE OR REPLACE VIEW v_bi_acts AS
      SELECT
        e.id AS act_id, e.name AS act_name, e.created_at,
        e.properties->>'act_number'    AS act_number,
        e.properties->>'act_date'      AS act_date,
        NULLIF(e.properties->>'total_amount','')::numeric AS total_amount,
        e.properties->>'comment'       AS comment,
        e.properties->>'conclusion'    AS conclusion,
        e.properties->>'parent_contract_name' AS parent_contract_name,
        ctr.id   AS contract_id,
        ctr.name AS contract_name,
        ctr.properties->>'contractor_name'  AS contractor_name,
        ctr.properties->>'contract_type'    AS contract_type
      FROM entities e
      JOIN entity_types et ON e.entity_type_id = et.id
      LEFT JOIN relations r_s ON r_s.from_entity_id = e.id
        AND r_s.relation_type = 'supplement_to' AND r_s.deleted_at IS NULL
      LEFT JOIN entities ctr ON ctr.id = r_s.to_entity_id AND ctr.deleted_at IS NULL
      WHERE et.name = 'act' AND e.deleted_at IS NULL`);

    // Russian display names for Metabase (COMMENT ON VIEW/COLUMN)
    const comments = [
      `COMMENT ON VIEW v_bi_contracts IS 'Договоры'`,
      `COMMENT ON VIEW v_bi_supplements IS 'Доп. соглашения'`,
      `COMMENT ON VIEW v_bi_rent_objects IS 'Объекты аренды'`,
      `COMMENT ON VIEW v_bi_equipment IS 'Оборудование'`,
      `COMMENT ON VIEW v_bi_buildings IS 'Корпуса'`,
      `COMMENT ON VIEW v_bi_land_plots IS 'Земельные участки'`,
      `COMMENT ON VIEW v_bi_companies IS 'Компании'`,
      `COMMENT ON VIEW v_bi_rooms IS 'Помещения'`,
      `COMMENT ON VIEW v_bi_acts IS 'Акты выполненных работ'`,
      // contracts columns
      `COMMENT ON COLUMN v_bi_contracts.id IS 'ID'`,
      `COMMENT ON COLUMN v_bi_contracts.name IS 'Название'`,
      `COMMENT ON COLUMN v_bi_contracts.created_at IS 'Дата создания'`,
      `COMMENT ON COLUMN v_bi_contracts.contract_type IS 'Тип договора'`,
      `COMMENT ON COLUMN v_bi_contracts.contract_number IS '№ договора'`,
      `COMMENT ON COLUMN v_bi_contracts.our_legal_entity IS 'Наше юрлицо'`,
      `COMMENT ON COLUMN v_bi_contracts.our_role IS 'Роль нашей стороны'`,
      `COMMENT ON COLUMN v_bi_contracts.contractor_name IS 'Контрагент'`,
      `COMMENT ON COLUMN v_bi_contracts.contractor_role IS 'Роль контрагента'`,
      `COMMENT ON COLUMN v_bi_contracts.subtenant_name IS 'Субарендатор'`,
      `COMMENT ON COLUMN v_bi_contracts.contract_date IS 'Дата договора'`,
      `COMMENT ON COLUMN v_bi_contracts.contract_end_date IS 'Срок действия до'`,
      `COMMENT ON COLUMN v_bi_contracts.contract_amount IS 'Сумма договора'`,
      `COMMENT ON COLUMN v_bi_contracts.rent_monthly IS 'Аренда в мес.'`,
      `COMMENT ON COLUMN v_bi_contracts.advance_amount IS 'Аванс'`,
      `COMMENT ON COLUMN v_bi_contracts.vat_rate IS 'НДС, %'`,
      `COMMENT ON COLUMN v_bi_contracts.subject IS 'Предмет договора'`,
      `COMMENT ON COLUMN v_bi_contracts.service_subject IS 'Описание работ'`,
      `COMMENT ON COLUMN v_bi_contracts.building IS 'Корпус'`,
      `COMMENT ON COLUMN v_bi_contracts.completion_deadline IS 'Срок выполнения'`,
      // rent_objects columns
      `COMMENT ON COLUMN v_bi_rent_objects.contract_id IS 'ID договора'`,
      `COMMENT ON COLUMN v_bi_rent_objects.contract_name IS 'Договор'`,
      `COMMENT ON COLUMN v_bi_rent_objects.contract_type IS 'Тип'`,
      `COMMENT ON COLUMN v_bi_rent_objects.tenant_name IS 'Арендатор'`,
      `COMMENT ON COLUMN v_bi_rent_objects.landlord_name IS 'Арендодатель'`,
      `COMMENT ON COLUMN v_bi_rent_objects.contract_date IS 'Дата договора'`,
      `COMMENT ON COLUMN v_bi_rent_objects.contract_end_date IS 'Срок до'`,
      `COMMENT ON COLUMN v_bi_rent_objects.vat_rate IS 'НДС, %'`,
      `COMMENT ON COLUMN v_bi_rent_objects.room_name IS 'Помещение'`,
      `COMMENT ON COLUMN v_bi_rent_objects.building_name IS 'Корпус'`,
      `COMMENT ON COLUMN v_bi_rent_objects.object_type IS 'Тип помещения'`,
      `COMMENT ON COLUMN v_bi_rent_objects.comment IS 'Комментарий'`,
      `COMMENT ON COLUMN v_bi_rent_objects.area_sqm IS 'Площадь, кв.м.'`,
      `COMMENT ON COLUMN v_bi_rent_objects.rate_per_sqm IS 'Ставка за кв.м.'`,
      `COMMENT ON COLUMN v_bi_rent_objects.monthly_amount_net IS 'Сумма в мес. (без НДС)'`,
      // equipment columns
      `COMMENT ON COLUMN v_bi_equipment.id IS 'ID'`,
      `COMMENT ON COLUMN v_bi_equipment.name IS 'Название'`,
      `COMMENT ON COLUMN v_bi_equipment.created_at IS 'Дата создания'`,
      `COMMENT ON COLUMN v_bi_equipment.category IS 'Категория'`,
      `COMMENT ON COLUMN v_bi_equipment.kind IS 'Вид'`,
      `COMMENT ON COLUMN v_bi_equipment.status IS 'Статус'`,
      `COMMENT ON COLUMN v_bi_equipment.inv_number IS 'Инв. номер'`,
      `COMMENT ON COLUMN v_bi_equipment.serial_number IS 'Серийный номер'`,
      `COMMENT ON COLUMN v_bi_equipment.manufacture_year IS 'Год выпуска'`,
      `COMMENT ON COLUMN v_bi_equipment.manufacturer IS 'Производитель'`,
      `COMMENT ON COLUMN v_bi_equipment.owner IS 'Собственник'`,
      `COMMENT ON COLUMN v_bi_equipment.note IS 'Примечание'`,
      `COMMENT ON COLUMN v_bi_equipment.building_name IS 'Корпус'`,
      `COMMENT ON COLUMN v_bi_equipment.parent_name IS 'Родительский объект'`,
      // buildings columns
      `COMMENT ON COLUMN v_bi_buildings.id IS 'ID'`,
      `COMMENT ON COLUMN v_bi_buildings.name IS 'Название'`,
      `COMMENT ON COLUMN v_bi_buildings.created_at IS 'Дата создания'`,
      `COMMENT ON COLUMN v_bi_buildings.address IS 'Адрес'`,
      `COMMENT ON COLUMN v_bi_buildings.short_name IS 'Краткое имя'`,
      `COMMENT ON COLUMN v_bi_buildings.total_area_sqm IS 'Общая площадь, кв.м.'`,
      `COMMENT ON COLUMN v_bi_buildings.cadastral_number IS 'Кадастровый номер'`,
      `COMMENT ON COLUMN v_bi_buildings.cadastral_value IS 'Кадастровая стоимость'`,
      `COMMENT ON COLUMN v_bi_buildings.cadastral_value_date IS 'Дата кад. стоимости'`,
      `COMMENT ON COLUMN v_bi_buildings.owner IS 'Собственник'`,
      `COMMENT ON COLUMN v_bi_buildings.land_plot_name IS 'Земельный участок'`,
      `COMMENT ON COLUMN v_bi_buildings.land_cadastral_number IS 'Кадастровый номер ЗУ'`,
      `COMMENT ON COLUMN v_bi_buildings.land_area_sqm IS 'Площадь ЗУ, кв.м.'`,
      // land_plots columns
      `COMMENT ON COLUMN v_bi_land_plots.id IS 'ID'`,
      `COMMENT ON COLUMN v_bi_land_plots.name IS 'Название'`,
      `COMMENT ON COLUMN v_bi_land_plots.address IS 'Адрес'`,
      `COMMENT ON COLUMN v_bi_land_plots.short_name IS 'Краткое имя'`,
      `COMMENT ON COLUMN v_bi_land_plots.cadastral_number IS 'Кадастровый номер'`,
      `COMMENT ON COLUMN v_bi_land_plots.area_sqm IS 'Площадь, кв.м.'`,
      `COMMENT ON COLUMN v_bi_land_plots.cadastral_value IS 'Кадастровая стоимость'`,
      `COMMENT ON COLUMN v_bi_land_plots.cadastral_value_date IS 'Дата кад. стоимости'`,
      `COMMENT ON COLUMN v_bi_land_plots.purpose IS 'Разрешённое использование'`,
      `COMMENT ON COLUMN v_bi_land_plots.owner IS 'Собственник'`,
      // companies columns
      `COMMENT ON COLUMN v_bi_companies.id IS 'ID'`,
      `COMMENT ON COLUMN v_bi_companies.name IS 'Название'`,
      `COMMENT ON COLUMN v_bi_companies.company_type IS 'Тип'`,
      `COMMENT ON COLUMN v_bi_companies.inn IS 'ИНН'`,
      `COMMENT ON COLUMN v_bi_companies.contact_person IS 'Контактное лицо'`,
      `COMMENT ON COLUMN v_bi_companies.phone IS 'Телефон'`,
      `COMMENT ON COLUMN v_bi_companies.email IS 'Email'`,
      // rooms columns
      `COMMENT ON COLUMN v_bi_rooms.id IS 'ID'`,
      `COMMENT ON COLUMN v_bi_rooms.name IS 'Название'`,
      `COMMENT ON COLUMN v_bi_rooms.room_type IS 'Тип помещения'`,
      `COMMENT ON COLUMN v_bi_rooms.description IS 'Описание'`,
      `COMMENT ON COLUMN v_bi_rooms.area_sqm IS 'Площадь, кв.м.'`,
      `COMMENT ON COLUMN v_bi_rooms.floor IS 'Этаж'`,
      `COMMENT ON COLUMN v_bi_rooms.building_name IS 'Корпус'`,
      `COMMENT ON COLUMN v_bi_rooms.building_id IS 'ID корпуса'`,
      // acts columns
      `COMMENT ON COLUMN v_bi_acts.act_id IS 'ID акта'`,
      `COMMENT ON COLUMN v_bi_acts.act_name IS 'Название'`,
      `COMMENT ON COLUMN v_bi_acts.created_at IS 'Дата создания'`,
      `COMMENT ON COLUMN v_bi_acts.act_number IS 'Номер акта'`,
      `COMMENT ON COLUMN v_bi_acts.act_date IS 'Дата акта'`,
      `COMMENT ON COLUMN v_bi_acts.total_amount IS 'Сумма'`,
      `COMMENT ON COLUMN v_bi_acts.comment IS 'Комментарий'`,
      `COMMENT ON COLUMN v_bi_acts.conclusion IS 'Заключение'`,
      `COMMENT ON COLUMN v_bi_acts.parent_contract_name IS 'Договор-основание'`,
      `COMMENT ON COLUMN v_bi_acts.contract_id IS 'ID договора'`,
      `COMMENT ON COLUMN v_bi_acts.contract_name IS 'Договор'`,
      `COMMENT ON COLUMN v_bi_acts.contractor_name IS 'Исполнитель'`,
      `COMMENT ON COLUMN v_bi_acts.contract_type IS 'Тип договора'`,
      // supplements columns
      `COMMENT ON COLUMN v_bi_supplements.id IS 'ID'`,
      `COMMENT ON COLUMN v_bi_supplements.name IS 'Название'`,
      `COMMENT ON COLUMN v_bi_supplements.contract_id IS 'ID договора'`,
      `COMMENT ON COLUMN v_bi_supplements.created_at IS 'Дата создания'`,
      `COMMENT ON COLUMN v_bi_supplements.contract_type IS 'Тип договора'`,
      `COMMENT ON COLUMN v_bi_supplements.supplement_number IS '№ ДС'`,
      `COMMENT ON COLUMN v_bi_supplements.our_legal_entity IS 'Наше юрлицо'`,
      `COMMENT ON COLUMN v_bi_supplements.contractor_name IS 'Контрагент'`,
      `COMMENT ON COLUMN v_bi_supplements.subtenant_name IS 'Субарендатор'`,
      `COMMENT ON COLUMN v_bi_supplements.contract_date IS 'Дата ДС'`,
      `COMMENT ON COLUMN v_bi_supplements.contract_end_date IS 'Срок до'`,
      `COMMENT ON COLUMN v_bi_supplements.contract_amount IS 'Сумма'`,
      `COMMENT ON COLUMN v_bi_supplements.rent_monthly IS 'Аренда в мес.'`,
      `COMMENT ON COLUMN v_bi_supplements.vat_rate IS 'НДС, %'`,
      `COMMENT ON COLUMN v_bi_supplements.changes_description IS 'Что поменялось'`,
    ];
    for (const sql of comments) {
      try { await pool.query(sql); } catch(e) { /* ignore if view not ready */ }
    }

    logger.info('BI views created/updated: contracts, supplements, rent_objects, equipment, buildings, land_plots, companies, rooms, acts');
  } catch(e) {
    logger.error('createBIViews error (non-fatal):', e.message);
  }
}

async function syncMetabase() {
  const url = process.env.METABASE_URL;
  const email = process.env.METABASE_EMAIL;
  const password = process.env.METABASE_PASSWORD;
  if (!url || !email || !password) {
    logger.info('syncMetabase: skipped (METABASE_URL/EMAIL/PASSWORD not set)');
    return;
  }
  try {
    // 1. Get session token (using Node 22 built-in fetch)
    const sessRes = await fetch(`${url}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    if (!sessRes.ok) { logger.info('syncMetabase: auth failed', sessRes.status); return; }
    const { id: token } = await sessRes.json();

    // 2. Find IndParkDocs database
    const dbRes = await fetch(`${url}/api/database`, {
      headers: { 'X-Metabase-Session': token }
    });
    const dbData = await dbRes.json();
    const databases = dbData.data || dbData;
    const db = databases.find(d => d.details && (
      (d.details.host || '').includes('neon.tech') ||
      (d.details.dbname || '') === 'neondb'
    ));
    if (!db) { logger.info('syncMetabase: database not found in Metabase'); return; }

    // 3. Trigger sync
    await fetch(`${url}/api/database/${db.id}/sync_schema`, {
      method: 'POST',
      headers: { 'X-Metabase-Session': token }
    });
    logger.info(`syncMetabase: sync triggered for database ${db.id} (${db.name})`);
  } catch(e) {
    logger.error('syncMetabase error (non-fatal):', e.message);
  }
}

async function runMigration020() {
  const pool = require('./db');
  try {
    const { rows } = await pool.query(`SELECT id FROM entity_types WHERE name='company'`);
    if (!rows.length) return;
    const cId = rows[0].id;
    await pool.query(`
      INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
      VALUES
        ($1, 'ownership_structure', 'Структура владения', 'text', '[]'::jsonb, 20),
        ($1, 'contacts', 'Контактные лица', 'contacts', '[]'::jsonb, 21)
      ON CONFLICT DO NOTHING
    `, [cId]);
    logger.info('runMigration020: company ownership_structure + contacts added');
  } catch(e) { logger.error('runMigration020 error (non-fatal):', e.message); }
}

async function runMigration021() {
  const pool = require('./db');
  try {
    const { rows } = await pool.query(`SELECT id FROM entity_types WHERE name='equipment'`);
    if (!rows.length) return;
    const eId = rows[0].id;
    await pool.query(`
      INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
      VALUES ($1, 'supplier', 'Поставщик', 'company_name_ref', '[]'::jsonb, 11)
      ON CONFLICT DO NOTHING
    `, [eId]);
    logger.info('runMigration021: equipment supplier field added');
  } catch(e) { logger.error('runMigration021 error (non-fatal):', e.message); }
}

async function runMigration022() {
  const pool = require('./db');
  try {
    const { rows } = await pool.query(`SELECT id FROM entity_types WHERE name='contract'`);
    if (!rows.length) return;
    const ctId = rows[0].id;
    await pool.query(`
      INSERT INTO field_definitions (entity_type_id, name, name_ru, field_type, options, sort_order)
      VALUES ($1, 'sale_item_type', 'Типы предметов КП', 'select',
        '["Оборудование","Корпус","Прочее"]'::jsonb, 999)
      ON CONFLICT DO NOTHING
    `, [ctId]);
    logger.info('runMigration022: sale_item_type справочник field added');
  } catch(e) { logger.error('runMigration022 error (non-fatal):', e.message); }
}


initMigrationTracker()
  .then(() => runOnce('003', runMigration003))
  .then(() => runOnce('004', runMigration004))
  .then(() => runOnce('005', runMigration005))
  .then(() => runOnce('006', runMigration006))
  .then(() => runOnce('007', runMigration007))
  .then(() => runOnce('008', runMigration008))
  .then(() => runOnce('009', runMigration009))
  .then(() => runOnce('010', runMigration010))
  .then(() => runOnce('011', runMigration011))
  .then(() => runOnce('012', runMigration012))
  .then(() => runOnce('013', runMigration013))
  .then(() => runOnce('014', runMigration014))
  .then(() => runOnce('015', runMigration015))
  .then(() => runOnce('016', runMigration016))
  .then(() => runOnce('017', runMigration017))
  .then(() => runOnce('018', runMigration018))
  .then(() => runOnce('019', runMigration019))
  .then(() => runOnce('020', runMigration020))
  .then(() => runOnce('021', runMigration021))
  .then(() => runOnce('022', runMigration022))
  .then(() => runOnce('mergeORRVesta', mergeORRVesta))
  .then(() => createBIViews())
  .then(() => syncMetabase())
  .then(() => {
    // Cleanup expired refresh tokens on startup and every 24h
    const pool = require('./db');
    const cleanupTokens = () => pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()').catch(() => {});
    cleanupTokens();
    setInterval(cleanupTokens, 24 * 60 * 60 * 1000);

    app.listen(PORT, () => logger.info(`IndParkDocs running on port ${PORT}`));
  });


module.exports = app; // for testing
