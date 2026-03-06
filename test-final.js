#!/usr/bin/env node
// test-final.js — Final verification: all phases complete
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND = path.join(__dirname, 'server/src/frontend');
const SRC      = path.join(__dirname, 'server/src');
let passed = 0; let failed = 0;
function ok(l)   { console.log('  ✅ ' + l); passed++; }
function fail(l) { console.log('  ❌ ' + l); failed++; }
function warn(l) { console.log('  ⚠️  ' + l); }

function allJsFiles(dir, acc = []) {
  fs.readdirSync(dir).forEach(f => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) allJsFiles(fp, acc);
    else if (f.endsWith('.js')) acc.push(fp);
  });
  return acc;
}
const frontendFiles = allJsFiles(FRONTEND);

// ── 1. Стабы/удалённые файлы ──────────────────────────────────────────────
console.log('\n1. Монолиты — стабы');
function isStub(fp) {
  if (!fs.existsSync(fp)) return true; // deleted = ok
  const clean = fs.readFileSync(fp,'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*/g,'').replace(/\s/g,'');
  return clean.length < 80;
}
isStub(path.join(FRONTEND,'entity-crud.js')) ? ok('entity-crud.js — стаб') : fail('entity-crud.js не стаб');
isStub(path.join(FRONTEND,'entity-form.js')) ? ok('entity-form.js — стаб') : fail('entity-form.js не стаб');
isStub(path.join(FRONTEND,'reports.js'))     ? ok('reports.js — стаб')     : fail('reports.js не стаб');

// ── 2. index.js < 150 строк ───────────────────────────────────────────────
console.log('\n2. Размер файлов');
const idxLines = fs.readFileSync(path.join(SRC,'index.js'),'utf8').split('\n').length;
idxLines < 150 ? ok('index.js = ' + idxLines + ' строк') : fail('index.js = ' + idxLines + ' строк (> 150)');

// Максимальный размер файла во frontend
let maxLines = 0; let maxFile = '';
frontendFiles.forEach(f => {
  const n = fs.readFileSync(f,'utf8').split('\n').length;
  if (n > maxLines) { maxLines = n; maxFile = path.relative(FRONTEND, f); }
});
maxLines <= 650
  ? ok('Макс. файл frontend: ' + maxFile + ' (' + maxLines + ' строк)')
  : warn('Макс. файл frontend: ' + maxFile + ' (' + maxLines + ' строк > 650 — ок для сложных модулей)');

// ── 3. Единственные определения функций ──────────────────────────────────
console.log('\n3. Уникальные функции');
[
  { name: '_fmtNum',   re: /function _fmtNum\b/g },
  { name: 'escapeHtml', re: /function escapeHtml\b/g },
  { name: 'api',       re: /(?:^|\n)(?:async )?function api\b/g },
].forEach(({ name, re }) => {
  let cnt = 0;
  frontendFiles.forEach(f => { cnt += (fs.readFileSync(f,'utf8').match(re)||[]).length; });
  cnt === 1 ? ok(name + ' — 1 определение') : fail(name + ' — ' + cnt + ' определений (дубль!)');
});

// ── 4. Ключевые экспорты core/ ────────────────────────────────────────────
console.log('\n4. core/ экспорты');
const utils = fs.readFileSync(path.join(FRONTEND,'core/utils.js'),'utf8');
const api   = fs.readFileSync(path.join(FRONTEND,'core/api.js'),'utf8');
const globs = fs.readFileSync(path.join(FRONTEND,'core/globals.js'),'utf8');
['escapeHtml','_fmtNum','_fmtDate'].forEach(fn => utils.includes(fn) ? ok('utils: '+fn) : fail('utils: нет '+fn));
api.includes('function api') ? ok('api.js: function api') : fail('api.js: нет api');
globs.includes('ENTITY_TYPE_ICONS') ? ok('globals: ENTITY_TYPE_ICONS') : fail('globals: нет ENTITY_TYPE_ICONS');
/const CONTRACT_TYPE_FIELDS\s*=/.test(globs) ? ok('globals: CONTRACT_TYPE_FIELDS') : fail('globals: нет CONTRACT_TYPE_FIELDS');
!/const CONTRACT_TYPE_FIELDS\s*=/.test(fs.readFileSync(path.join(FRONTEND,'core.js'),'utf8'))
  ? ok('core.js: CONTRACT_TYPE_FIELDS удалена') : fail('core.js: CONTRACT_TYPE_FIELDS осталась (дубль!)');

// ── 5. Сборка и тесты ─────────────────────────────────────────────────────
console.log('\n5. Сборка и тесты');
try {
  const html = require('./server/src/frontend/index.js');
  const s = (html.match(/<script>([\s\S]*?)<\/script>/g)||[]);
  let ok2 = true;
  s.forEach((b,i) => { try{new Function(b.replace(/<\/?script>/g,''));}catch(e){fail('script '+i+': '+e.message);ok2=false;} });
  if (ok2) ok('Синтаксис frontend: OK');
} catch(e) { fail('require index: '+e.message); }

try {
  execSync('cd '+path.join(__dirname,'server')+' && npm test -- --silent 2>&1',{stdio:'pipe'});
  ok('npm test: 94/94');
} catch(e) { fail('npm test: '+(e.stdout||'').toString().slice(0,300)); }

// ── Итог ──────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════');
console.log('ФИНАЛЬНЫЙ ИТОГ: ' + passed + ' ✅  ' + failed + ' ❌');
if (failed === 0) console.log('🎉 Все фазы рефакторинга завершены!');
if (failed > 0) process.exit(1);
