require('dotenv').config({ path: __dirname + '/../.env' });
const express = require('express');
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

runMigration003().then(() => runMigration004()).then(() => runMigration005()).then(() => runMigration006()).then(() => runMigration007()).then(() => runMigration008()).then(() => {
  app.listen(PORT, () => console.log(`IndParkDocs running on port ${PORT}`));
});

module.exports = app; // for testing
