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
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:", "https://cdnjs.cloudflare.com"],
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
app.use('/api/companies', require('./routes/companies'));
app.use('/api/entities/:id/files', require('./routes/files'));
app.use('/api/cube',      require('./routes/cube'));
app.use('/api/buildings', require('./routes/floorplan'));
app.use('/api', require('./routes/letters'));

// SPA fallback
app.get('*', (req, res) => { res.type('html').send(FRONTEND_HTML); });

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Migrations (extracted to server/src/migrations/)
const migration003 = require('./migrations/003_auto');
const migration004 = require('./migrations/004_auto');
const migration005 = require('./migrations/005_auto');
const migration006 = require('./migrations/006_auto');
const migration007 = require('./migrations/007_auto');
const migration008 = require('./migrations/008_auto');
const migration009 = require('./migrations/009_auto');
const migration010 = require('./migrations/010_auto');
const migration011 = require('./migrations/011_auto');
const migration012 = require('./migrations/012_auto');
const migration013 = require('./migrations/013_auto');
const migration014 = require('./migrations/014_auto');
const migration015 = require('./migrations/015_auto');
const migration016 = require('./migrations/016_auto');
const migration017 = require('./migrations/017_auto');
const migration018 = require('./migrations/018_auto');
const migration019 = require('./migrations/019_auto');
const migration020 = require('./migrations/020_auto');
const migration021 = require('./migrations/021_auto');
const migration022 = require('./migrations/022_auto');
const migration023 = require('./migrations/023_auto');
const migration024 = require('./migrations/024_auto');
const migration025 = require('./migrations/025_contacts_migrate');
const migration026 = require('./migrations/026_doc_status');
const migration027 = require('./migrations/027_vat_rate');
const migration028 = require('./migrations/028_equipment_price');
const migration029 = require('./migrations/029_entity_files');
const migration030 = require('./migrations/030_meter_entity_type');
const migration031 = require('./migrations/031_meter_status_field');
const migration032 = require('./migrations/032_building_fields');
const migration033 = require('./migrations/033_meter_connected_equipment');
const migration034 = require('./migrations/034_letter_entity_type');
const mergeORRVesta = require('./migrations/merge_orr_vesta');

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

const createBIViews = require('./bi-views');


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
  .then(() => { const pool = require('./db'); return pool; })
  .then((pool) => {
    return Promise.resolve()
      .then(() => runOnce('003', () => migration003(pool)))
      .then(() => runOnce('004', () => migration004(pool)))
      .then(() => runOnce('005', () => migration005(pool)))
      .then(() => runOnce('006', () => migration006(pool)))
      .then(() => runOnce('007', () => migration007(pool)))
      .then(() => runOnce('008', () => migration008(pool)))
      .then(() => runOnce('009', () => migration009(pool)))
      .then(() => runOnce('010', () => migration010(pool)))
      .then(() => runOnce('011', () => migration011(pool)))
      .then(() => runOnce('012', () => migration012(pool)))
      .then(() => runOnce('013', () => migration013(pool)))
      .then(() => runOnce('014', () => migration014(pool)))
      .then(() => runOnce('015', () => migration015(pool)))
      .then(() => runOnce('016', () => migration016(pool)))
      .then(() => runOnce('017', () => migration017(pool)))
      .then(() => runOnce('018', () => migration018(pool)))
      .then(() => runOnce('019', () => migration019(pool)))
      .then(() => runOnce('020', () => migration020(pool)))
      .then(() => runOnce('021', () => migration021(pool)))
      .then(() => runOnce('022', () => migration022(pool)))
      .then(() => runOnce('023', () => migration023(pool)))
      .then(() => runOnce('024', () => migration024(pool)))
      .then(() => runOnce('025', () => migration025(pool)))
      .then(() => runOnce('026', () => migration026(pool)))
      .then(() => runOnce('027', () => migration027(pool)))
      .then(() => runOnce('028', () => migration028(pool)))
      .then(() => runOnce('029', () => migration029(pool)))
      .then(() => runOnce('030', () => migration030(pool)))
      .then(() => runOnce('031', () => migration031(pool)))
      .then(() => runOnce('032', () => migration032(pool)))
      .then(() => runOnce('033', () => migration033(pool)))
      .then(() => runOnce('034', () => migration034(pool)))
      .then(() => runOnce('mergeORRVesta', () => mergeORRVesta(pool)));
  })
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
