// Migration mergeORRVesta — extracted from index.js
const logger = require('../logger');

module.exports = async function mergeORRVesta(pool) {
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
};
