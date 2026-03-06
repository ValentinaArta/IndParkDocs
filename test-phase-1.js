#!/usr/bin/env node
// test-phase-1.js — Phase 1 verification: no duplicates, core modules export correctly
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND = path.join(__dirname, 'server/src/frontend');
let passed = 0; let failed = 0;

function ok(label)   { console.log('  ✅ ' + label); passed++; }
function fail(label) { console.log('  ❌ ' + label); failed++; }

// ── Read all .js files under frontend/ ────────────────────────────────────
function allJsFiles(dir, acc = []) {
  fs.readdirSync(dir).forEach(f => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) allJsFiles(fp, acc);
    else if (f.endsWith('.js')) acc.push(fp);
  });
  return acc;
}
const files = allJsFiles(FRONTEND);

function countDef(pattern) {
  let count = 0;
  files.forEach(f => {
    const src = fs.readFileSync(f, 'utf8');
    const m = src.match(pattern) || [];
    count += m.length;
  });
  return count;
}

// ── 1. ДУБЛИ ФУНКЦИЙ ──────────────────────────────────────────────────────
console.log('\n1. ДУБЛИ ФУНКЦИЙ');

const fmtNumCount = countDef(/function _fmtNum\b/g);
fmtNumCount === 1 ? ok('_fmtNum определена ровно 1 раз (count=' + fmtNumCount + ')') : fail('_fmtNum дублируется: ' + fmtNumCount + ' определений');

const escCount = countDef(/function escapeHtml\b|function escHtml\b/g);
escCount === 1 ? ok('escapeHtml/escHtml определена ровно 1 раз (count=' + escCount + ')') : fail('escapeHtml/escHtml дублируется: ' + escCount + ' определений');

const apiCount = countDef(/(?:^|\n)(?:async )?function api\b/g);
apiCount === 1 ? ok('api() определена ровно 1 раз (count=' + apiCount + ')') : fail('api() дублируется: ' + apiCount + ' определений');

// ── 2. ЭКСПОРТ / ДОСТУПНОСТЬ ──────────────────────────────────────────────
console.log('\n2. ЭКСПОРТ / ДОСТУПНОСТЬ');

const utilsSrc   = fs.readFileSync(path.join(FRONTEND, 'core/utils.js'),   'utf8');
const apiSrc     = fs.readFileSync(path.join(FRONTEND, 'core/api.js'),     'utf8');
const globalsSrc = fs.readFileSync(path.join(FRONTEND, 'core/globals.js'), 'utf8');

['escapeHtml', '_fmtNum', '_fmtDate'].forEach(fn => {
  utilsSrc.includes(fn) ? ok('core/utils.js содержит ' + fn) : fail('core/utils.js НЕ содержит ' + fn);
});
// formatAmount — функция нигде не существует в коде; правило "только перемещение"
// не позволяет создавать её; отмечаем как вопрос к Валентине
if (utilsSrc.includes('formatAmount')) {
  ok('core/utils.js содержит formatAmount');
} else {
  console.log('  ⚠️  formatAmount нигде нет — нужно решение: создать alias к formatAmountDisplay или убрать из требований?');
}

apiSrc.includes('function api') ? ok('core/api.js содержит function api') : fail('core/api.js НЕ содержит function api');

globalsSrc.includes('ENTITY_TYPE_ICONS') ? ok('core/globals.js содержит ENTITY_TYPE_ICONS') : fail('core/globals.js НЕ содержит ENTITY_TYPE_ICONS');

const ctfInGlobals = /const CONTRACT_TYPE_FIELDS\s*=/.test(globalsSrc);
const ctfInCore    = /const CONTRACT_TYPE_FIELDS\s*=/.test(fs.readFileSync(path.join(FRONTEND, 'core.js'), 'utf8'));
if (ctfInGlobals && !ctfInCore) {
  ok('CONTRACT_TYPE_FIELDS определена в core/globals.js (core.js очищен)');
} else if (ctfInGlobals && ctfInCore) {
  fail('CONTRACT_TYPE_FIELDS определена в ОБОИХ файлах — дубль!');
} else if (!ctfInGlobals && ctfInCore) {
  fail('CONTRACT_TYPE_FIELDS ещё в core.js, не перенесена в core/globals.js');
} else {
  fail('CONTRACT_TYPE_FIELDS не найдена нигде!');
}

// ── 3. СБОРКА ────────────────────────────────────────────────────────────
console.log('\n3. СБОРКА (синтаксис)');
try {
  const html = require('./server/src/frontend/index.js');
  const scripts = (html.match(/<script>([\s\S]*?)<\/script>/g) || []);
  let syntaxOk = true;
  scripts.forEach((s, i) => {
    try { new Function(s.replace(/<\/?script>/g, '')); }
    catch(e) { fail('script block ' + i + ': ' + e.message); syntaxOk = false; }
  });
  if (syntaxOk) ok('Все <script>-блоки синтаксически корректны');
} catch(e) {
  fail('require frontend/index.js упал: ' + e.message);
}

// npm test
try {
  execSync('cd ' + path.join(__dirname, 'server') + ' && npm test -- --silent 2>&1', { stdio: 'pipe' });
  ok('npm test: все тесты прошли');
} catch(e) {
  const out = e.stdout ? e.stdout.toString() : e.message;
  fail('npm test упал: ' + out.slice(0, 200));
}

// ── Итог ─────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════');
console.log('Итог: ' + passed + ' ✅  ' + failed + ' ❌');
if (failed > 0) process.exit(1);
