#!/usr/bin/env node
// test-phase-1.js — Проверка Фазы 1: core-модули и устранение дублей

const path = require('path');
const fs = require('fs');

const FRONTEND_DIR = path.join(__dirname, 'server/src/frontend');
const results = [];
let pass = 0, fail = 0;

function check(name, condition, detail) {
  const ok = !!condition;
  if (ok) { pass++; console.log('✅', name); }
  else { fail++; console.error('❌', name, detail ? '(' + detail + ')' : ''); }
  results.push({ name, ok });
}

// Собираем весь HTML через index.js
const html = require(path.join(FRONTEND_DIR, 'index'));
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const allJS = scriptMatch ? scriptMatch[1] : '';

// ── 1. Файлы созданы ─────────────────────────────────────────────────────
console.log('\n─── 1. ФАЙЛЫ ───────────────────────────────────────────────');
check('core/utils.js существует',    fs.existsSync(path.join(FRONTEND_DIR, 'core/utils.js')));
check('core/api.js существует',      fs.existsSync(path.join(FRONTEND_DIR, 'core/api.js')));
check('core/globals.js существует',  fs.existsSync(path.join(FRONTEND_DIR, 'core/globals.js')));

// ── 2. Дублирование функций ───────────────────────────────────────────────
console.log('\n─── 2. ДУБЛИ ФУНКЦИЙ ───────────────────────────────────────');
const fmtNumMatches = (allJS.match(/function _fmtNum/g) || []).length;
check('_fmtNum определена ровно 1 раз', fmtNumMatches === 1, 'нашли: ' + fmtNumMatches);

const escHtmlMatches = (allJS.match(/function escHtml\b/g) || []).length;
check('escHtml (старая) не определена нигде', escHtmlMatches === 0, 'нашли: ' + escHtmlMatches);

const escapeHtmlMatches = (allJS.match(/function escapeHtml/g) || []).length;
check('escapeHtml определена ровно 1 раз', escapeHtmlMatches === 1, 'нашли: ' + escapeHtmlMatches);

const apiMatches = (allJS.match(/^async function api\b/mg) || []).length;
check('api() определена ровно 1 раз', apiMatches === 1, 'нашли: ' + apiMatches);

const entityIconsMatches = (allJS.match(/var ENTITY_TYPE_ICONS/g) || []).length;
check('ENTITY_TYPE_ICONS определена ровно 1 раз', entityIconsMatches === 1, 'нашли: ' + entityIconsMatches);

// ── 3. Порядок загрузки ───────────────────────────────────────────────────
console.log('\n─── 3. ПОРЯДОК ЗАГРУЗКИ ────────────────────────────────────');
const escapeHtmlPos = allJS.indexOf('function escapeHtml');
const apiPos        = allJS.indexOf('async function api(');
const entityCrudPos = allJS.indexOf('function showLegalZachety'); // первая функция entity-crud

check('core/utils.js загружается до core/api.js', escapeHtmlPos < apiPos,
  'utils:' + escapeHtmlPos + ' api:' + apiPos);
check('core/* загружается до entity-crud.js', Math.max(escapeHtmlPos, apiPos) < entityCrudPos,
  'core:' + Math.max(escapeHtmlPos, apiPos) + ' crud:' + entityCrudPos);

// ── 4. Синтаксис JS ──────────────────────────────────────────────────────
console.log('\n─── 4. СИНТАКСИС ───────────────────────────────────────────');
try {
  new Function(allJS);
  check('Весь JS парсится без ошибок', true);
} catch(e) {
  check('Весь JS парсится без ошибок', false, e.message.split('\n')[0]);
}

// ── 5. Размер сборки ─────────────────────────────────────────────────────
console.log('\n─── 5. РАЗМЕР ──────────────────────────────────────────────');
check('HTML собирается (длина > 100KB)', html.length > 100000, 'длина: ' + html.length);
check('HTML содержит DOCTYPE', html.startsWith('<!DOCTYPE html>'));

// ── Итог ──────────────────────────────────────────────────────────────────
console.log('\n─── ИТОГ ───────────────────────────────────────────────────');
console.log(pass + ' прошло, ' + fail + ' провалено');
if (fail > 0) process.exit(1);
