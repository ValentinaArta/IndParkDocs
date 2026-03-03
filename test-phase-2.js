#!/usr/bin/env node
// test-phase-2.js — Проверка Фазы 2: компоненты из entity-form.js

const path = require('path');
const fs = require('fs');
const FRONTEND = path.join(__dirname, 'server/src/frontend');

let pass = 0, fail = 0;
function check(name, condition, detail) {
  if (condition) { pass++; console.log('✅', name); }
  else { fail++; console.error('❌', name, detail ? '(' + detail + ')' : ''); }
}

// Build full JS
const html = require(path.join(FRONTEND, 'index'));
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const allJS = m ? m[1] : '';

console.log('\n─── 1. ФАЙЛЫ СОЗДАНЫ ───────────────────────────────────────');
const newFiles = [
  'components/amount-input.js', 'components/advances.js', 'components/contacts.js',
  'components/duration.js', 'components/contract-items.js', 'components/act-items.js',
  'forms/field-input.js', 'forms/equipment-form.js', 'forms/land-plot-quick.js'
];
for (const f of newFiles) check(f + ' существует', fs.existsSync(path.join(FRONTEND, f)));

console.log('\n─── 2. ENTITY-FORM.JS ПУСТ ─────────────────────────────────');
const efContent = require(path.join(FRONTEND, 'entity-form'));
check('entity-form.js возвращает пустую строку', efContent === '' || efContent.length < 10, 'len=' + efContent.length);

console.log('\n─── 3. НЕТ ДУБЛЕЙ ФУНКЦИЙ ──────────────────────────────────');
const checkOnce = (fnName) => {
  const re = new RegExp('function ' + fnName + '\\b', 'g');
  const count = (allJS.match(re) || []).length;
  check(fnName + '() определена 1 раз', count === 1, 'нашли: ' + count);
};
['parseAmount','formatAmountDisplay','initAmountFormatting',
 'renderAdvancesBlock','collectAdvances','_renderContactsList',
 '_collectContacts','renderDurationSection','toggleDurationSection',
 'renderContractItemsField','recalcContractAmount',
 'renderActItemsField','actItemAdd','recalcActTotal',
 'renderFieldInput','getFieldValue','renderEquipmentListField',
 'eqListCreateSubmit','getEqListValue',
 'quickCreateLandPlot','submitQuickLandPlot'
].forEach(checkOnce);

console.log('\n─── 4. СИНТАКСИС ───────────────────────────────────────────');
try { new Function(allJS); check('Весь JS парсится без ошибок', true); }
catch(e) { check('Весь JS парсится без ошибок', false, e.message.split('\n')[0]); }

console.log('\n─── 5. РАЗМЕР ──────────────────────────────────────────────');
check('HTML собирается (> 100KB)', html.length > 100000, 'len: ' + html.length);
const efSize = fs.statSync(path.join(FRONTEND, 'entity-form.js')).size;
check('entity-form.js маленький (<400 bytes)', efSize < 400, 'size: ' + efSize);

console.log('\n─── ИТОГ ───────────────────────────────────────────────────');
console.log(pass + ' прошло, ' + fail + ' провалено');
if (fail > 0) process.exit(1);
