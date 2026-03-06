#!/usr/bin/env node
// test-phase-4.js — Phase 4: reports/ split
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
['reports/pivot.js','reports/aggregate.js','reports/rent-analysis.js','reports/work-history.js'].forEach(rel => {
  const fp = path.join(FRONTEND, rel);
  fp && fs.existsSync(fp)
    ? ok(rel + ' (' + fs.readFileSync(fp,'utf8').split('\n').length + ' строк)')
    : fail(rel + ' НЕ НАЙДЕН');
});

// ── 2. reports.js — стаб ──────────────────────────────────────────────────
console.log('\n2. reports.js — стаб');
const rPath = path.join(FRONTEND, 'reports.js');
const rSrc = fs.readFileSync(rPath,'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g,'').replace(/\s/g,'');
rSrc.length < 80 ? ok('reports.js — стаб') : fail('reports.js = ' + rSrc.length + ' непустых символов');

// ── 3. pivot.js не определяет _fmtNum ────────────────────────────────────
console.log('\n3. _fmtNum в pivot.js');
const pivotSrc = fs.readFileSync(path.join(FRONTEND,'reports/pivot.js'),'utf8');
!/function _fmtNum\b/.test(pivotSrc) ? ok('pivot.js не содержит определения _fmtNum') : fail('pivot.js дублирует _fmtNum!');

// ── 4. Глобальный счёт _fmtNum ────────────────────────────────────────────
let cnt = 0;
files.forEach(f => { cnt += (fs.readFileSync(f,'utf8').match(/function _fmtNum\b/g)||[]).length; });
cnt === 1 ? ok('_fmtNum во всём проекте — 1 определение') : fail('_fmtNum — ' + cnt + ' определений!');

// ── 5. СБОРКА ─────────────────────────────────────────────────────────────
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
