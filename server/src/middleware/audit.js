const logger = require('../logger');
const pool = require('../db');

async function logAction(userId, action, entityType, entityId, details, ip) {
  try {
    await pool.query(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip) VALUES ($1,$2,$3,$4,$5,$6)',
      [userId, action, entityType, entityId, details || null, ip || null]
    );
  } catch (e) {
    logger.error('Audit log error:', e.message);
  }
}

module.exports = { logAction };
