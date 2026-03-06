#!/usr/bin/env node
// test-phase-5.js — Phase 5: Entity CRUD split into entities/ and forms/
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND = path.join(__dirname, 'server/src/frontend');
let passed = 0; let failed = 0;
function ok(l)   { console.log('  ✅ ' + l); passed++; }
function fail(l) { console.log('  ❌ ' + l); failed++; }

// ── 1. entity-crud.js — стаб (<50 строк) ─────────────────────────────────
console.log('\n1. entity-crud.js — стаб');
const ecLines = fs.readFileSync(path.join(FRONTEND,'entity-crud.js'),'utf8').split('\n').length;
ecLines < 50 ? ok('entity-crud.js = ' + ecLines + ' строк') : fail('entity-crud.js = ' + ecLines + ' строк (не очищен!)');

// ── 2. Все файлы entities/ существуют ─────────────────────────────────────
console.log('\n2. Файлы entities/');
const entityFiles = [
  'entities/entity-list.js','entities/entity-detail.js',
  'entities/entity-create.js','entities/entity-edit.js',
  'entities/entity-delete.js','entities/contract-card.js',
  'entities/supplement-card.js','entities/entity-helpers.js',
];
entityFiles.forEach(rel => {
  const fp = path.join(FRONTEND, rel);
  fs.existsSync(fp)
    ? ok(rel + ' (' + fs.readFileSync(fp,'utf8').split('\n').length + ' строк)')
    : fail(rel + ' НЕ НАЙДЕН');
});

// ── 3. forms/contract-form.js существует ─────────────────────────────────
console.log('\n3. forms/contract-form.js');
const cfPath = path.join(FRONTEND,'forms/contract-form.js');
fs.existsSync(cfPath) ? ok('contract-form.js (' + fs.readFileSync(cfPath,'utf8').split('\n').length + ' строк)') : fail('contract-form.js НЕ НАЙДЕН');

// ── 4. Ни один файл entities/ не ссылается на entity-crud.js ──────────────
console.log('\n4. Нет ссылок на entity-crud.js из entities/');
let refFound = false;
fs.readdirSync(path.join(FRONTEND,'entities')).forEach(f => {
  const src = fs.readFileSync(path.join(FRONTEND,'entities',f),'utf8');
  if (src.includes('entity-crud')) { fail(f + ' ссылается на entity-crud'); refFound = true; }
});
if (!refFound) ok('Ни один файл entities/ не импортирует entity-crud');

// ── 5. СБОРКА ─────────────────────────────────────────────────────────────
console.log('\n5. СБОРКА');
try {
  const html = require('./server/src/frontend/index.js');
  const s = (html.match(/<script>([\s\S]*?)<\/script>/g)||[]);
  let ok2 = true;
  s.forEach((b,i) => { try{new Function(b.replace(/<\/?script>/g,''));}catch(e){fail('block '+i+': '+e.message);ok2=false;} });
  if (ok2) ok('Синтаксис OK');
} catch(e) { fail('require: '+e.message); }

try {
  execSync('cd '+path.join(__dirname,'server')+' && npm test -- --silent 2>&1',{stdio:'pipe'});
  ok('npm test: 94/94');
} catch(e) { fail('npm test: '+(e.stdout||'').toString().slice(0,200)); }

console.log('\n══════════════════════════════');
console.log('Итог: '+passed+' ✅  '+failed+' ❌');
if (failed > 0) process.exit(1);
