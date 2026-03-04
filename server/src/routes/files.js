/**
 * files.js
 * Прикреплённые файлы к сущностям (договора, ДС и т.д.).
 * POST   /api/entities/:id/files       — загрузить файл (multipart/form-data, field: file)
 * GET    /api/entities/:id/files       — список файлов
 * GET    /api/entities/:id/files/:fid  — скачать файл
 * DELETE /api/entities/:id/files/:fid  — удалить файл
 */
const express  = require('express');
const router   = express.Router({ mergeParams: true });
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');
const pool     = require('../db');
const { authenticate } = require('../middleware/auth');
const logger   = require('../logger');
const asyncH   = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const MAX_SIZE   = 20 * 1024 * 1024; // 20 MB

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Minimal multipart parser (no multer dependency) ─────────────────────────
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const ct = req.headers['content-type'] || '';
    const boundaryMatch = ct.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) return reject(new Error('No boundary in Content-Type'));
    const boundary = '--' + boundaryMatch[1];

    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        const body  = Buffer.concat(chunks);
        const bBuf  = Buffer.from(boundary);
        const parts = [];
        let start   = 0;

        // Split by boundary
        while (true) {
          const idx = body.indexOf(bBuf, start);
          if (idx === -1) break;
          if (start > 0) parts.push(body.slice(start, idx - 2)); // strip trailing \r\n
          start = idx + bBuf.length + 2; // skip \r\n after boundary
        }

        let file = null;
        for (const part of parts) {
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd === -1) continue;
          const header  = part.slice(0, headerEnd).toString();
          const content = part.slice(headerEnd + 4);

          const nameMatch = header.match(/name="([^"]+)"/);
          const fileMatch = header.match(/filename="([^"]+)"/);
          if (nameMatch && nameMatch[1] === 'file' && fileMatch) {
            const ctMatch = header.match(/Content-Type:\s*([^\r\n]+)/i);
            file = {
              originalName: Buffer.from(fileMatch[1], 'latin1').toString('utf8'),
              mimetype:     (ctMatch ? ctMatch[1].trim() : 'application/octet-stream'),
              buffer:       content,
              size:         content.length,
            };
          }
        }
        resolve(file);
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// ── POST /api/entities/:id/files ─────────────────────────────────────────────
router.post('/', authenticate, asyncH(async (req, res) => {
  const entityId = parseInt(req.params.id);
  if (!entityId) return res.status(400).json({ error: 'Invalid entity id' });

  // Verify entity exists
  const eRes = await pool.query('SELECT id FROM entities WHERE id = $1 AND deleted_at IS NULL', [entityId]);
  if (!eRes.rows.length) return res.status(404).json({ error: 'Entity not found' });

  let file;
  try { file = await parseMultipart(req); }
  catch (e) { return res.status(400).json({ error: 'Failed to parse upload: ' + e.message }); }

  if (!file) return res.status(400).json({ error: 'No file in request' });
  if (file.size > MAX_SIZE) return res.status(413).json({ error: 'File too large (max 20 MB)' });
  if (file.size === 0) return res.status(400).json({ error: 'Empty file' });

  // Generate unique filename on disk
  const ext      = path.extname(file.originalName) || '';
  const diskName = crypto.randomBytes(16).toString('hex') + ext;
  const filePath = path.join(UPLOAD_DIR, diskName);

  fs.writeFileSync(filePath, file.buffer);

  const ins = await pool.query(
    `INSERT INTO entity_files (entity_id, filename, original_name, size, mimetype)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, original_name, size, mimetype, uploaded_at`,
    [entityId, diskName, file.originalName, file.size, file.mimetype]
  );

  logger.info({ msg: 'file uploaded', entityId, name: file.originalName, size: file.size });
  res.json(ins.rows[0]);
}));

// ── GET /api/entities/:id/files ──────────────────────────────────────────────
router.get('/', authenticate, asyncH(async (req, res) => {
  const entityId = parseInt(req.params.id);
  const rows = await pool.query(
    `SELECT id, original_name, size, mimetype, uploaded_at
     FROM entity_files WHERE entity_id = $1 ORDER BY uploaded_at`,
    [entityId]
  );
  res.json(rows.rows);
}));

// ── GET /api/entities/:id/files/:fid ─────────────────────────────────────────
router.get('/:fid', authenticate, asyncH(async (req, res) => {
  const entityId = parseInt(req.params.id);
  const fid      = parseInt(req.params.fid);
  const row = await pool.query(
    'SELECT * FROM entity_files WHERE id = $1 AND entity_id = $2',
    [fid, entityId]
  );
  if (!row.rows.length) return res.status(404).json({ error: 'File not found' });

  const f        = row.rows[0];
  const filePath = path.join(UPLOAD_DIR, f.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing on disk' });

  res.setHeader('Content-Type', f.mimetype);
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(f.original_name)}`);
  res.setHeader('Content-Length', f.size);
  fs.createReadStream(filePath).pipe(res);
}));

// ── DELETE /api/entities/:id/files/:fid ──────────────────────────────────────
router.delete('/:fid', authenticate, asyncH(async (req, res) => {
  const entityId = parseInt(req.params.id);
  const fid      = parseInt(req.params.fid);
  const row = await pool.query(
    'SELECT * FROM entity_files WHERE id = $1 AND entity_id = $2',
    [fid, entityId]
  );
  if (!row.rows.length) return res.status(404).json({ error: 'File not found' });

  const filePath = path.join(UPLOAD_DIR, row.rows[0].filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await pool.query('DELETE FROM entity_files WHERE id = $1', [fid]);
  logger.info({ msg: 'file deleted', entityId, fid });
  res.json({ ok: true });
}));

module.exports = router;
