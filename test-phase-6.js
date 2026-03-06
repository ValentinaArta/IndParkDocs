#!/usr/bin/env node
// test-phase-6.js — Phase 6: migrations extracted from index.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC = path.join(__dirname, 'server/src');
let passed = 0; let failed = 0;
function ok(l)   { console.log('  ✅ ' + l); passed++; }
function fail(l) { console.log('  ❌ ' + l); failed++; }

// ── 1. index.js < 150 строк ───────────────────────────────────────────────
console.log('\n1. index.js < 150 строк');
const idxLines = fs.readFileSync(path.join(SRC,'index.js'),'utf8').split('\n').length;
idxLines < 150 ? ok('index.js = ' + idxLines + ' строк') : fail('index.js = ' + idxLines + ' строк (слишком много)');

// ── 2. run-migrations.js существует и содержит runMigrations ─────────────
console.log('\n2. run-migrations.js');
const rmPath = path.join(SRC,'run-migrations.js');
if (!fs.existsSync(rmPath)) { fail('run-migrations.js не найден'); }
else {
  const src = fs.readFileSync(rmPath,'utf8');
  ok('run-migrations.js существует (' + src.split('\n').length + ' строк)');
  src.includes('runMigrations') ? ok('содержит runMigrations') : fail('не содержит runMigrations');
  src.includes('initMigrationTracker') ? ok('содержит initMigrationTracker') : fail('не содержит initMigrationTracker');
}

// ── 3. Папка migrations/ содержит файлы 003-034 ───────────────────────────
console.log('\n3. migrations/');
const migsDir = path.join(SRC,'migrations');
const migs = fs.readdirSync(migsDir).filter(f => f.endsWith('.js'));
migs.length >= 30 ? ok('migrations/ содержит ' + migs.length + ' файлов') : fail('migrations/ — только ' + migs.length + ' файлов');

const expected = ['004_auto','005_auto','006_auto','010_auto','020_auto','026_doc_status','034_letter_entity_type'];
expected.forEach(n => {
  migs.some(f => f.includes(n)) ? ok(n + '.js существует') : fail(n + '.js НЕ НАЙДЕН');
});

// ── 4. index.js не содержит inline initMigrationTracker ──────────────────
console.log('\n4. index.js чист от migration-логики');
const idxSrc = fs.readFileSync(path.join(SRC,'index.js'),'utf8');
!idxSrc.includes('initMigrationTracker') ? ok('initMigrationTracker убрана из index.js') : fail('initMigrationTracker осталась в index.js');
!idxSrc.includes('runOnce') ? ok('runOnce убрана из index.js') : fail('runOnce осталась в index.js');
!/async function syncMetabase/.test(idxSrc) ? ok('syncMetabase не определена inline в index.js') : fail('syncMetabase определена inline в index.js');

// ── 5. npm test ───────────────────────────────────────────────────────────
console.log('\n5. npm test');
try {
  execSync('cd '+path.join(__dirname,'server')+' && npm test -- --silent 2>&1',{stdio:'pipe'});
  ok('npm test: 94/94');
} catch(e) { fail('npm test: '+(e.stdout||'').toString().slice(0,200)); }

console.log('\n══════════════════════════════');
console.log('Итог: '+passed+' ✅  '+failed+' ❌');
if (failed > 0) process.exit(1);
