'use strict';
// Reports router — assembled from sub-modules
// Each sub-module handles a logical group of routes:
//   pivot.js        — /pivot, /fields, /linked, /aggregate
//   rent.js         — /rent-analysis, /area-stats
//   work.js         — /work-history, /broken-equipment
//   contract-card.js — /contract-card/:id, /contract-card/:id/advance-status
const express = require('express');

const router = express.Router();

router.use('/', require('./pivot'));
router.use('/', require('./rent'));
router.use('/', require('./work'));
router.use('/', require('./contract-card'));

module.exports = router;
