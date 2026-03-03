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
app.set('trust proxy', 1); // Trust nginx proxy

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
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
if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false') {
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
const FRONTEND_HTML = require('./frontend/index');
app.get('/', (req, res) => { res.type('html').send(FRONTEND_HTML); });

// Finance dashboard (demo)
app.get('/finance', (req, res) => {
  res.sendFile(path.join(__dirname, 'finance-dashboard.html'));
});

app.get('/budget', (req, res) => {
  res.sendFile(path.join(__dirname, 'budget-dashboard.html'));
});
app.get('/chart.min.js', (req, res) => {
  res.type('application/javascript').sendFile(path.join(__dirname, 'chart.min.js'));
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/entity-types', require('./routes/entityTypes'));
app.use('/api/entities', require('./routes/entities'));
app.use('/api/relations', require('./routes/relations'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/health', require('./routes/health'));
app.use('/api/ai/chat', require('./routes/ai-chat'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/auth/totp', require('./routes/totp'));
app.use('/api/legal', require('./routes/legal'));

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

// migrations moved to server/src/migrations/
const migrations = {
  '003': require('./migrations/003_auto'),
  '004': require('./migrations/004_auto'),
  '005': require('./migrations/005_auto'),
  '006': require('./migrations/006_auto'),
  '007': require('./migrations/007_auto'),
  '008': require('./migrations/008_auto'),
  '009': require('./migrations/009_auto'),
  '010': require('./migrations/010_auto'),
  '011': require('./migrations/011_auto'),
  '012': require('./migrations/012_auto'),
  '013': require('./migrations/013_auto'),
  '014': require('./migrations/014_auto'),
  '015': require('./migrations/015_auto'),
  '016': require('./migrations/016_auto'),
  '017': require('./migrations/017_auto'),
  '018': require('./migrations/018_auto'),
  '019': require('./migrations/019_auto'),
  '020': require('./migrations/020_auto'),
  '021': require('./migrations/021_auto'),
  '022': require('./migrations/022_auto'),
  '023': require('./migrations/023_auto'),
  '024': require('./migrations/024_auto'),
  'mergeORRVesta': require('./migrations/mergeORRVesta'),
};

const pool = require('./db');


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




initMigrationTracker()
  .then(() => runOnce('003', () => migrations['003'](pool)))
  .then(() => runOnce('004', () => migrations['004'](pool)))
  .then(() => runOnce('005', () => migrations['005'](pool)))
  .then(() => runOnce('006', () => migrations['006'](pool)))
  .then(() => runOnce('007', () => migrations['007'](pool)))
  .then(() => runOnce('008', () => migrations['008'](pool)))
  .then(() => runOnce('009', () => migrations['009'](pool)))
  .then(() => runOnce('010', () => migrations['010'](pool)))
  .then(() => runOnce('011', () => migrations['011'](pool)))
  .then(() => runOnce('012', () => migrations['012'](pool)))
  .then(() => runOnce('013', () => migrations['013'](pool)))
  .then(() => runOnce('014', () => migrations['014'](pool)))
  .then(() => runOnce('015', () => migrations['015'](pool)))
  .then(() => runOnce('016', () => migrations['016'](pool)))
  .then(() => runOnce('017', () => migrations['017'](pool)))
  .then(() => runOnce('018', () => migrations['018'](pool)))
  .then(() => runOnce('019', () => migrations['019'](pool)))
  .then(() => runOnce('020', () => migrations['020'](pool)))
  .then(() => runOnce('021', () => migrations['021'](pool)))
  .then(() => runOnce('022', () => migrations['022'](pool)))
  .then(() => runOnce('023', () => migrations['023'](pool)))
  .then(() => runOnce('024', () => migrations['024'](pool)))
  .then(() => runOnce('mergeORRVesta', () => migrations['mergeORRVesta'](pool)))
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
