const logger = require('./logger');
require('dotenv').config({ path: __dirname + '/../.env' });
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const xssClean = require('./middleware/xssClean');
const { runMigrations } = require('./run-migrations');
const { syncMetabase } = require('./sync-metabase');
const createBIViews = require('./bi-views');

const app = express();
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "blob:"],
      workerSrc: ["'self'", "blob:", "https://cdnjs.cloudflare.com"],
      frameSrc: ["'self'", "https://benthic-hull.metabaseapp.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
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

// Body parsing & middleware
app.use('/api/notes', express.json({ limit: '10mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(xssClean);
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

// Static files
app.use('/maps', express.static(path.join(__dirname, '../public/maps')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Frontend SPA
const FRONTEND_HTML = require('./frontend/index');
app.get('/', (req, res) => { res.set('Cache-Control', 'no-cache, no-store, must-revalidate').type('html').send(FRONTEND_HTML); });
app.get('/finance', (req, res) => { res.sendFile(path.join(__dirname, 'finance-dashboard.html')); });
app.get('/budget',  (req, res) => { res.sendFile(path.join(__dirname, 'budget-dashboard.html')); });
app.get('/chart.min.js', (req, res) => { res.type('application/javascript').sendFile(path.join(__dirname, 'chart.min.js')); });

// API routes
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/entity-types',    require('./routes/entityTypes'));
app.use('/api/entities',        require('./routes/entities'));
app.use('/api/relations',       require('./routes/relations'));
app.use('/api/stats',           require('./routes/stats'));
app.use('/api/reports',         require('./routes/reports'));
app.use('/api/health',          require('./routes/health'));
app.use('/api/ai/chat',         require('./routes/ai-chat'));
app.use('/api/finance',         require('./routes/finance'));
app.use('/api/auth/totp',       require('./routes/totp'));
app.use('/api/legal',           require('./routes/legal'));
app.use('/api/companies',       require('./routes/companies'));
app.use('/api/entities/:id/files', require('./routes/files'));
app.use('/api/cube',            require('./routes/cube'));
app.use('/api/contract-type-fields', require('./routes/contract-type-fields'));
app.use('/api/buildings',       require('./routes/floorplan'));
app.use('/api/equipment',       require('./routes/equipment'));
app.use('/api/notes',           require('./routes/notes'));
app.use('/api',                 require('./routes/letters'));

// React frontend (/app/) — no CSP restrictions (Excalidraw needs broad permissions)
const reactDistPath = path.join(__dirname, '../../frontend/dist');
app.use('/app', (req, res, next) => {
  res.removeHeader('Content-Security-Policy');
  next();
}, express.static(reactDistPath));
app.get('/app/*', (req, res) => {
  res.removeHeader('Content-Security-Policy');
  res.sendFile(path.join(reactDistPath, 'index.html'));
});

// SPA fallback (old frontend)
app.get('*', (req, res) => { res.set('Cache-Control', 'no-cache, no-store, must-revalidate').type('html').send(FRONTEND_HTML); });
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
const pool = require('./db');

// Startup: run migrations → create BI views → sync Metabase → listen
runMigrations(pool)
  .then(() => createBIViews())
  .then(() => syncMetabase())
  .then(() => {
    // Cleanup expired tokens on startup and every 24h
    const cleanupTokens = () => pool.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()').catch(() => {});
    cleanupTokens();
    setInterval(cleanupTokens, 24 * 60 * 60 * 1000);
    app.listen(PORT, () => logger.info(`IndParkDocs running on port ${PORT}`));
  })
  .catch(err => { logger.error('Startup error:', err); process.exit(1); });

module.exports = app; // for testing
