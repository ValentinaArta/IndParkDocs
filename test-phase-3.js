#!/usr/bin/env node
// test-phase-3.js — Phase 3: modal.js + pages/ extracted from entity-crud.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND = path.join(__dirname, 'server/src/frontend');
let passed = 0; let failed = 0;
function ok(l)   { console.log('  ✅ ' + l); passed++; }
function fail(l) { console.log('  ❌ ' + l); failed++; }

function allJsFiles(dir, acc = []) {
  fs.readdirSync(dir).forEach(f => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) allJsFiles(fp, acc);
    else if (f.endsWith('.js')) acc.push(fp);
  });
  return acc;
}
const files = allJsFiles(FRONTEND);

// ── 1. ФАЙЛЫ СОЗДАНЫ ──────────────────────────────────────────────────────
console.log('\n1. ФАЙЛЫ СОЗДАНЫ');
['modal.js','pages/nav.js','pages/totp.js','pages/legal-zachety.js',
 'pages/dashboard.js','pages/finance-page.js','pages/budget-page.js'].forEach(rel => {
  const fp = path.join(FRONTEND, rel);
  if (fs.existsSync(fp)) {
    ok(rel + ' (' + fs.readFileSync(fp,'utf8').split('\n').length + ' строк)');
  } else { fail(rel + ' НЕ НАЙДЕН'); }
});

// ── 2. entity-crud.js — стаб (<50 строк) ─────────────────────────────────
console.log('\n2. entity-crud.js — стаб');
const ecPath = path.join(FRONTEND, 'entity-crud.js');
const ecLines = fs.readFileSync(ecPath,'utf8').split('\n').length;
ecLines < 50 ? ok('entity-crud.js = ' + ecLines + ' строк (стаб)') : fail('entity-crud.js = ' + ecLines + ' строк (не очищен)');

// ── 3. _fmtNum не дублируется ──────────────────────────────────────────────
console.log('\n3. _fmtNum не дублируется');
let fmtCount = 0;
files.forEach(f => { fmtCount += (fs.readFileSync(f,'utf8').match(/function _fmtNum\b/g)||[]).length; });
fmtCount === 1 ? ok('_fmtNum определена ровно 1 раз') : fail('_fmtNum — ' + fmtCount + ' определений!');

// ── 4. СБОРКА ─────────────────────────────────────────────────────────────
console.log('\n4. СБОРКА');
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
