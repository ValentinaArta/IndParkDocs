// Inline frontend served as HTML
// This keeps the MVP simple — one deploy, no build step

const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>IndParkDocs</title>
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1E293B">
<style>
:root {
  --bg: #F8FAFC; --bg-card: #FFFFFF; --bg-sidebar: #1E293B; --bg-hover: #F1F5F9;
  --text: #0F172A; --text-secondary: #64748B; --text-muted: #94A3B8;
  --border: #E2E8F0; --accent: #6366F1; --accent-hover: #4F46E5;
  --red: #EF4444; --green: #10B981; --yellow: #F59E0B; --blue: #3B82F6;
  --radius: 8px; --shadow: 0 1px 3px rgba(0,0,0,0.08);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--text); height: 100vh; overflow: hidden; }

.app { display: flex; height: 100vh; }
.sidebar { width: 260px; background: var(--bg-sidebar); color: white; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.sidebar-header h1 { font-size: 18px; font-weight: 700; }
.sidebar-header p { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px; }
.sidebar-nav { flex: 1; overflow-y: auto; padding: 8px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.7); transition: all 0.15s; }
.nav-item:hover { background: rgba(255,255,255,0.08); color: white; }
.nav-item.active { background: var(--accent); color: white; }
.nav-item .icon { font-size: 16px; width: 24px; text-align: center; }
.nav-item .count { margin-left: auto; background: rgba(255,255,255,0.15); padding: 1px 8px; border-radius: 10px; font-size: 11px; }
.nav-section { padding: 16px 12px 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.3); }

.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.topbar { padding: 16px 24px; background: var(--bg-card); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
.topbar h2 { font-size: 18px; font-weight: 600; }
.topbar .breadcrumb { font-size: 13px; color: var(--text-secondary); }
.topbar .actions { margin-left: auto; display: flex; gap: 8px; }

.btn { padding: 8px 16px; border-radius: var(--radius); border: 1px solid var(--border); background: white; color: var(--text); font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
.btn:hover { background: var(--bg-hover); }
.btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
.btn-primary:hover { background: var(--accent-hover); }
.btn-danger { color: var(--red); border-color: #FCA5A5; }
.btn-danger:hover { background: #FEF2F2; }
.btn-sm { padding: 5px 10px; font-size: 12px; }

.content { flex: 1; overflow-y: auto; padding: 24px; }

/* Entity list */
.entity-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.entity-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; cursor: pointer; transition: all 0.15s; }
.entity-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(99,102,241,0.1); transform: translateY(-1px); }
.entity-card .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.entity-card .card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.entity-card .card-title { font-weight: 600; font-size: 14px; }
.entity-card .card-type { font-size: 11px; color: var(--text-muted); }
.entity-card .card-props { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.entity-card .prop-tag { font-size: 11px; padding: 2px 8px; background: var(--bg); border-radius: 4px; color: var(--text-secondary); }

/* Entity detail */
.detail-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.detail-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
.detail-title { font-size: 24px; font-weight: 700; }
.detail-type { font-size: 13px; color: var(--text-secondary); }

.detail-section { margin-bottom: 24px; }
.detail-section h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.props-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.prop-item { background: var(--bg); padding: 12px; border-radius: var(--radius); }
.prop-label { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.prop-value { font-size: 14px; font-weight: 500; }

.relation-list { display: flex; flex-direction: column; gap: 8px; }
.relation-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.15s; }
.relation-item:hover { border-color: var(--accent); }
.relation-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; color: white; }
.relation-name { font-weight: 500; font-size: 13px; }
.relation-type-label { font-size: 11px; color: var(--text-muted); }

/* Dashboard */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; text-align: center; cursor: pointer; transition: all 0.15s; }
.stat-card:hover { border-color: var(--accent); }
.stat-icon { font-size: 24px; margin-bottom: 4px; }
.stat-count { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--text-secondary); }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: none; align-items: center; justify-content: center; z-index: 100; }
.modal-overlay.show { display: flex; }
.modal { background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.modal h3 { font-size: 16px; margin-bottom: 16px; }
.modal .form-group { margin-bottom: 14px; }
.modal label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500; }
.modal input, .modal select, .modal textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; font-family: inherit; }
.modal input:focus, .modal select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

/* Search */
.search-bar { padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; width: 240px; font-family: inherit; }
.search-bar:focus { outline: none; border-color: var(--accent); }

/* Children list */
.children-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.child-card { display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--bg); border-radius: var(--radius); cursor: pointer; transition: all 0.15s; }
.child-card:hover { background: var(--bg-hover); }

/* Responsive */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .sidebar.open { display: flex; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; }
  .topbar { padding: 12px 16px; }
  .content { padding: 16px; }
  .entity-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
</head>
<body>

<div id="loginScreen" style="display:flex;align-items:center;justify-content:center;height:100vh;background:var(--bg)">
  <div style="background:white;padding:32px;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.1);width:340px">
    <h2 style="margin-bottom:4px">IndParkDocs</h2>
    <p style="color:var(--text-secondary);font-size:13px;margin-bottom:24px">Документы и связи</p>
    <div class="form-group"><label>Логин</label><input id="loginUser" placeholder="username" onkeydown="if(event.key==='Enter')document.getElementById('loginPass').focus()"></div>
    <div class="form-group"><label>Пароль</label><input id="loginPass" type="password" placeholder="••••••" onkeydown="if(event.key==='Enter')doLogin()"></div>
    <div id="loginError" style="color:var(--red);font-size:12px;margin-bottom:8px"></div>
    <button class="btn btn-primary" style="width:100%" onclick="doLogin()">Войти</button>
  </div>
</div>

<div class="app" style="display:none">
  <div class="sidebar" id="sidebar">
    <div class="sidebar-header">
      <h1>IndParkDocs</h1>
      <p>Документы и связи</p>
    </div>
    <div class="sidebar-nav" id="sidebarNav">
      <div class="nav-item active" onclick="showDashboard()">
        <span class="icon">📊</span> Обзор
      </div>
      <div class="nav-section">Типы сущностей</div>
      <div id="typeNav"></div>
      <div class="nav-section" style="margin-top:12px">Настройки</div>
      <div class="nav-item" onclick="showSettings()">
        <span class="icon">⚙️</span> Типы и поля
      </div>
      <div class="nav-item" onclick="logout()" style="margin-top:auto;color:rgba(255,255,255,0.4)">
        <span class="icon">🚪</span> Выход
      </div>
    </div>
  </div>

  <div class="main">
    <div class="topbar" id="topbar">
      <button class="btn btn-sm" onclick="toggleSidebar()" style="display:none" id="menuBtn">☰</button>
      <h2 id="pageTitle">Обзор</h2>
      <div class="breadcrumb" id="breadcrumb"></div>
      <div class="actions" id="topActions"></div>
    </div>
    <div class="content" id="content"></div>
  </div>
</div>

<div class="modal-overlay" id="modalOverlay" onclick="if(event.target===this)closeModal()">
  <div class="modal" id="modal"></div>
</div>

<script>
const API = window.location.origin + '/api';
let entityTypes = [];
let relationTypes = [];
let currentView = 'dashboard';
let currentTypeFilter = null;
let currentEntityId = null;
let TOKEN = localStorage.getItem('accessToken');
let REFRESH = localStorage.getItem('refreshToken');
let CURRENT_USER = null;

// Conditional fields shown when contract_type matches
const CONTRACT_TYPE_FIELDS = {
  'Подряда': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'building', name_ru: 'Корпус', field_type: 'select_or_custom', options: [] },
    { name: 'equipment', name_ru: 'Оборудование', field_type: 'select_or_custom', options: [] },
    { name: 'tenant', name_ru: 'Арендатор', field_type: 'select_or_custom', options: [] },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number' },
    { name: 'advances', name_ru: 'Авансы', field_type: 'advances' },
    { name: 'completion_deadline', name_ru: 'Срок выполнения', field_type: 'text' },
  ],
  'Субаренды': [
    { name: 'rent_objects', name_ru: 'Объекты', field_type: 'rent_objects' },
    { name: 'rent_monthly', name_ru: 'Арендная плата в месяц', field_type: 'number', _group: 'all', _readonly: true },
    { name: 'vat_rate', name_ru: 'НДС (%)', field_type: 'number', _group: 'all' },
    { name: 'extra_services', name_ru: 'Доп. услуги', field_type: 'checkbox', _group: 'all' },
    { name: 'extra_services_desc', name_ru: 'Описание доп. услуг', field_type: 'text', _group: 'extra' },
    { name: 'extra_services_cost', name_ru: 'Стоимость в месяц', field_type: 'number', _group: 'extra' },
    { name: 'duration_type', name_ru: 'Срок действия', field_type: 'select', options: ['Дата', 'Текст'], _group: 'all' },
    { name: 'duration_date', name_ru: 'Дата окончания', field_type: 'date', _group: 'duration_date' },
    { name: 'duration_text', name_ru: 'Срок действия (текст)', field_type: 'text', _group: 'duration_text' },
  ],
  'Аренды': [
    { name: 'rent_objects', name_ru: 'Объекты', field_type: 'rent_objects' },
    { name: 'rent_monthly', name_ru: 'Арендная плата в месяц', field_type: 'number', _group: 'all', _readonly: true },
    { name: 'vat_rate', name_ru: 'НДС (%)', field_type: 'number', _group: 'all' },
    { name: 'extra_services', name_ru: 'Доп. услуги', field_type: 'checkbox', _group: 'all' },
    { name: 'extra_services_desc', name_ru: 'Описание доп. услуг', field_type: 'text', _group: 'extra' },
    { name: 'extra_services_cost', name_ru: 'Стоимость в месяц', field_type: 'number', _group: 'extra' },
    { name: 'duration_type', name_ru: 'Срок действия', field_type: 'select', options: ['Дата', 'Текст'], _group: 'all' },
    { name: 'duration_date', name_ru: 'Дата окончания', field_type: 'date', _group: 'duration_date' },
    { name: 'duration_text', name_ru: 'Срок действия (текст)', field_type: 'text', _group: 'duration_text' },
  ]
};

// Cache of all contract/supplement entities for extracting used values
let _allContractEntities = [];

async function loadContractEntities() {
  const contracts = await api('/entities?type=contract');
  const supplements = await api('/entities?type=supplement');
  _allContractEntities = contracts.concat(supplements);
}

function getUsedValues(fieldName) {
  const vals = new Set();
  _allContractEntities.forEach(function(e) {
    const v = (e.properties || {})[fieldName];
    if (v && v.trim()) vals.add(v.trim());
  });
  return Array.from(vals).sort();
}

function enrichFieldOptions(f) {
  if (f.field_type === 'select_or_custom') {
    const used = getUsedValues(f.name);
    const existing = f.options || [];
    const merged = Array.from(new Set(existing.concat(used))).sort();
    return Object.assign({}, f, { options: merged });
  }
  return f;
}

let _advanceCounter = 0;

function renderAdvancesBlock(existingAdvances) {
  const advances = existingAdvances || [];
  _advanceCounter = advances.length;
  let h = '<div id="advances_container">';
  advances.forEach(function(adv, i) {
    h += renderAdvanceRow(i, adv.amount || '', adv.date || '');
  });
  h += '</div>';
  h += '<button type="button" class="btn btn-sm" onclick="addAdvanceRow()" style="margin-top:6px">+ Добавить аванс</button>';
  return h;
}

function renderAdvanceRow(index, amount, date) {
  return '<div class="advance-row" id="advance_row_' + index + '" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">' +
    '<input type="number" placeholder="Сумма" value="' + (amount || '') + '" class="advance-amount" style="flex:1">' +
    '<input type="date" value="' + (date || '') + '" class="advance-date" style="flex:1">' +
    '<button type="button" class="btn btn-sm btn-danger" onclick="removeAdvanceRow(' + index + ')" style="padding:4px 8px;font-size:11px">✕</button>' +
    '</div>';
}

function addAdvanceRow() {
  const container = document.getElementById('advances_container');
  if (!container) return;
  const div = document.createElement('div');
  div.innerHTML = renderAdvanceRow(_advanceCounter, '', '');
  container.appendChild(div.firstChild);
  _advanceCounter++;
}

function removeAdvanceRow(index) {
  const row = document.getElementById('advance_row_' + index);
  if (row) row.remove();
}

function collectAdvances() {
  const container = document.getElementById('advances_container');
  if (!container) return [];
  const rows = container.querySelectorAll('.advance-row');
  const result = [];
  rows.forEach(function(row) {
    const amount = row.querySelector('.advance-amount').value;
    const date = row.querySelector('.advance-date').value;
    if (amount || date) result.push({ amount: amount || '', date: date || '' });
  });
  return result;
}

function renderFieldInput(f, value) {
  const val = value || '';
  const id = 'f_' + f.name;
  if (f.field_type === 'rent_objects') {
    return ''; // Rendered by renderRentFields
  } else if (f.field_type === 'advances') {
    var advances = [];
    try { if (typeof val === 'string' && val) advances = JSON.parse(val); else if (Array.isArray(val)) advances = val; } catch(e) {}
    return renderAdvancesBlock(advances);
  } else if (f.field_type === 'select_or_custom') {
    const opts = f.options || [];
    const isCustom = val && !opts.includes(val);
    let h = '<div style="display:flex;gap:6px;align-items:center">';
    h += '<select id="' + id + '" onchange="toggleCustomInput(this)" style="flex:1"><option value="">—</option>';
    opts.forEach(function(o) { h += '<option value="' + escapeHtml(o) + '"' + (o === val ? ' selected' : '') + '>' + escapeHtml(o) + '</option>'; });
    h += '<option value="__custom__"' + (isCustom ? ' selected' : '') + '>Другое...</option></select>';
    h += '<input id="' + id + '_custom" placeholder="Введите значение" value="' + (isCustom ? escapeHtml(String(val)) : '') + '" style="flex:1;' + (isCustom ? '' : 'display:none') + '">';
    h += '</div>';
    return h;
  } else if (f.field_type === 'select') {
    const opts = f.options || [];
    let h = '<select id="' + id + '"><option value="">—</option>';
    opts.forEach(function(o) { h += '<option' + (o === val ? ' selected' : '') + '>' + escapeHtml(o) + '</option>'; });
    h += '</select>';
    return h;
  } else if (f.field_type === 'boolean') {
    var checked = (val === 'true' || val === true) ? ' checked' : '';
    return '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="' + id + '"' + checked + '> Да</label>';
  } else if (f.field_type === 'date') {
    return '<input type="date" id="' + id + '" value="' + val + '">';
  } else if (f.field_type === 'number') {
    return '<input type="number" id="' + id + '" value="' + val + '">';
  } else {
    return '<input id="' + id + '" value="' + escapeHtml(String(val)) + '">';
  }
}

function toggleCustomInput(sel) {
  const customInput = document.getElementById(sel.id + '_custom');
  if (customInput) customInput.style.display = sel.value === '__custom__' ? '' : 'none';
}

function getFieldValue(f) {
  if (f.field_type === 'advances') {
    const adv = collectAdvances();
    return adv.length > 0 ? JSON.stringify(adv) : null;
  }
  if (f.field_type === 'rent_objects') {
    var objs = collectAllRentObjects();
    return objs.length > 0 ? JSON.stringify(objs) : null;
  }
  if (f.field_type === 'checkbox' || f.field_type === 'boolean') {
    const cb = document.getElementById('f_' + f.name);
    return cb ? String(cb.checked) : 'false';
  }
  const el = document.getElementById('f_' + f.name);
  if (!el) return null;
  if (f.field_type === 'select_or_custom') {
    if (el.value === '__custom__') {
      const customEl = document.getElementById('f_' + f.name + '_custom');
      return customEl ? customEl.value || null : null;
    }
    return el.value || null;
  }
  return el.value || null;
}

function renderDynamicFields(contractType, props) {
  const container = document.getElementById('dynamicFieldsContainer');
  if (!container) return;
  const extraFields = CONTRACT_TYPE_FIELDS[contractType] || [];
  if (extraFields.length === 0) { container.innerHTML = ''; return; }

  if (contractType === 'Аренды') {
    renderRentFields(container, extraFields, props);
    return;
  }

  let html = '';
  extraFields.forEach(function(f) {
    const val = props ? (props[f.name] || '') : '';
    html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(enrichFieldOptions(f), val) + '</div>';
  });
  container.innerHTML = html;
}

var _rentObjectCounter = 0;
var OBJECT_TYPES = ['Производство класс B', 'Производство класс С', 'Офис', 'Административно-бытовые', 'Земельный участок'];

function renderRentFields(container, allFields, props) {
  props = props || {};
  var hasExtra = props.extra_services === 'true' || props.extra_services === true;
  var durationType = props.duration_type || '';

  // Parse rent_objects
  var objects = [];
  try {
    var ro = props.rent_objects;
    if (typeof ro === 'string' && ro) objects = JSON.parse(ro);
    else if (Array.isArray(ro)) objects = ro;
  } catch(e) {}
  if (objects.length === 0) objects = [{}];
  _rentObjectCounter = objects.length;

  var html = '';

  // Render objects
  html += '<div id="rent_objects_container">';
  objects.forEach(function(obj, i) { html += renderRentObjectBlock(i, obj); });
  html += '</div>';
  html += '<button type="button" class="btn btn-sm" onclick="addRentObject()" style="margin-bottom:16px">+ Добавить объект</button>';

  // Rent monthly (auto-calculated, readonly)
  var rentMonthly = props.rent_monthly || '';
  html += '<div class="form-group"><label>Арендная плата в месяц</label>' +
    '<input type="number" id="f_rent_monthly" value="' + rentMonthly + '" readonly style="background:#f1f5f9;font-weight:600">' +
    '</div>';

  // VAT
  var vatVal = props.vat_rate || '20';
  html += '<div class="form-group"><label>НДС (%)</label>' +
    '<div style="display:flex;gap:6px;align-items:center">' +
    '<input type="number" id="f_vat_rate" value="' + vatVal + '" style="width:80px" oninput="updateVatDisplay()">' +
    '<span id="vat_display" style="font-size:12px;color:var(--text-secondary)"></span>' +
    '</div></div>';

  // Extra services checkbox
  html += '<div class="form-group"><label style="display:flex;align-items:center;gap:8px">' +
    '<input type="checkbox" id="f_extra_services"' + (hasExtra ? ' checked' : '') +
    ' onchange="onRentFieldChange()"> Доп. услуги</label></div>';

  if (hasExtra) {
    html += '<div class="form-group"><label>Описание доп. услуг</label>' +
      '<input id="f_extra_services_desc" value="' + escapeHtml(props.extra_services_desc || '') + '"></div>';
    html += '<div class="form-group"><label>Стоимость в месяц</label>' +
      '<input type="number" id="f_extra_services_cost" value="' + (props.extra_services_cost || '') + '" oninput="recalcRentMonthly()"></div>';
  }

  // Duration
  html += '<div class="form-group"><label>Срок действия</label>' +
    '<select id="f_duration_type" onchange="onRentFieldChange()">' +
    '<option value="">—</option>' +
    '<option value="Дата"' + (durationType === 'Дата' ? ' selected' : '') + '>Дата</option>' +
    '<option value="Текст"' + (durationType === 'Текст' ? ' selected' : '') + '>Свободный ввод</option>' +
    '</select></div>';

  if (durationType === 'Дата') {
    html += '<div class="form-group"><label>Дата окончания</label>' +
      '<input type="date" id="f_duration_date" value="' + (props.duration_date || '') + '"></div>';
  }
  if (durationType === 'Текст') {
    html += '<div class="form-group"><label>Срок действия (текст)</label>' +
      '<input id="f_duration_text" value="' + escapeHtml(props.duration_text || '') + '"></div>';
  }

  container.innerHTML = html;
  recalcRentMonthly();
  updateVatDisplay();
}

function renderRoSelectOrCustom(index, fieldName, label, value, options) {
  options = options || [];
  var isCustom = value && !options.includes(value);
  var h = '<div class="form-group"><label>' + escapeHtml(label) + '</label>';
  h += '<div style="display:flex;gap:6px;align-items:center">';
  h += '<select class="ro-field" data-idx="' + index + '" data-name="' + fieldName + '" onchange="toggleRoCustom(this,' + index + ',&quot;' + fieldName + '&quot;)" style="flex:1">';
  h += '<option value="">—</option>';
  options.forEach(function(o) { h += '<option value="' + escapeHtml(o) + '"' + (o === value ? ' selected' : '') + '>' + escapeHtml(o) + '</option>'; });
  h += '<option value="__custom__"' + (isCustom ? ' selected' : '') + '>Другое...</option>';
  h += '</select>';
  h += '<input class="ro-field ro-custom-input" data-idx="' + index + '" data-name="' + fieldName + '_custom" placeholder="Введите значение" value="' + (isCustom ? escapeHtml(value) : '') + '" style="flex:1;' + (isCustom ? '' : 'display:none') + '">';
  h += '</div></div>';
  return h;
}

function toggleRoCustom(sel, index, fieldName) {
  var customEl = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="' + fieldName + '_custom"]');
  if (customEl) customEl.style.display = sel.value === '__custom__' ? '' : 'none';
}

function renderRentObjectBlock(index, obj) {
  obj = obj || {};
  var isLand = (obj.object_type === 'Земельный участок');
  var calcMode = obj.calc_mode || 'area_rate';

  var h = '<div class="rent-object-block" id="rent_obj_' + index + '" style="border-left:3px solid var(--accent);padding-left:12px;margin-bottom:12px;position:relative">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<strong>Объект ' + (index + 1) + '</strong>';
  h += '<button type="button" class="btn btn-sm btn-danger" onclick="removeRentObject(' + index + ')" style="padding:2px 8px;font-size:11px">✕</button>';
  h += '</div>';

  // Object type
  h += '<div class="form-group"><label>Тип объекта</label>';
  h += '<select class="ro-field" data-idx="' + index + '" data-name="object_type" onchange="onRentObjectTypeChange(' + index + ')">';
  h += '<option value="">—</option>';
  OBJECT_TYPES.forEach(function(ot) { h += '<option value="' + escapeHtml(ot) + '"' + (obj.object_type === ot ? ' selected' : '') + '>' + escapeHtml(ot) + '</option>'; });
  h += '<option value="__custom__"' + (obj.object_type && !OBJECT_TYPES.includes(obj.object_type) ? ' selected' : '') + '>Другое...</option></select>';
  if (obj.object_type && !OBJECT_TYPES.includes(obj.object_type)) {
    h += '<input class="ro-field" data-idx="' + index + '" data-name="object_type_custom" value="' + escapeHtml(obj.object_type) + '" placeholder="Введите тип" style="margin-top:4px">';
  }
  h += '</div>';

  if (obj.object_type) {
    if (!isLand) {
      // Building fields (select_or_custom)
      h += renderRoSelectOrCustom(index, 'building', 'Корпус', obj.building || '', getUsedValues('building'));
      h += renderRoSelectOrCustom(index, 'room', 'Помещение', obj.room || '', getUsedValues('room'));
      h += '<div class="form-group"><label>Часть/Целиком</label><select class="ro-field" data-idx="' + index + '" data-name="rent_scope">';
      h += '<option value="">—</option><option value="Целиком"' + (obj.rent_scope === 'Целиком' ? ' selected' : '') + '>Целиком</option>';
      h += '<option value="Часть"' + (obj.rent_scope === 'Часть' ? ' selected' : '') + '>Часть</option></select></div>';
    } else {
      h += '<div class="form-group"><label>Местоположение ЗУ</label><input class="ro-field" data-idx="' + index + '" data-name="land_location" value="' + escapeHtml(obj.land_location || '') + '"></div>';
    }

    // Calc mode toggle
    h += '<div class="form-group"><label>Расчёт</label><select class="ro-field" data-idx="' + index + '" data-name="calc_mode" onchange="onRentObjectCalcChange(' + index + ')">';
    h += '<option value="area_rate"' + (calcMode === 'area_rate' ? ' selected' : '') + '>Площадь × Ставка</option>';
    h += '<option value="fixed"' + (calcMode === 'fixed' ? ' selected' : '') + '>Фиксированная аренда</option></select></div>';

    if (calcMode === 'area_rate') {
      h += '<div class="form-group"><label>Площадь (м²)</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="area" value="' + (obj.area || '') + '" oninput="recalcRentMonthly()"></div>';
      h += '<div class="form-group"><label>Арендная ставка (руб/м²)</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="rent_rate" value="' + (obj.rent_rate || '') + '" oninput="recalcRentMonthly()"></div>';
      var objTotal = (parseFloat(obj.area) || 0) * (parseFloat(obj.rent_rate) || 0);
      if (objTotal > 0) h += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">= ' + objTotal.toFixed(2) + ' руб.</div>';
    } else {
      h += '<div class="form-group"><label>Арендная плата</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="fixed_rent" value="' + (obj.fixed_rent || '') + '" oninput="recalcRentMonthly()"></div>';
    }

    // Comment
    h += '<div class="form-group"><label>Комментарий</label><input class="ro-field" data-idx="' + index + '" data-name="comment" value="' + escapeHtml(obj.comment || '') + '"></div>';
  }

  h += '</div>';
  return h;
}

function addRentObject() {
  var container = document.getElementById('rent_objects_container');
  if (!container) return;
  var div = document.createElement('div');
  div.innerHTML = renderRentObjectBlock(_rentObjectCounter, {});
  container.appendChild(div.firstChild);
  _rentObjectCounter++;
}

function removeRentObject(index) {
  var el = document.getElementById('rent_obj_' + index);
  if (el) { el.remove(); recalcRentMonthly(); }
}

function onRentObjectTypeChange(index) {
  var sel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="object_type"]');
  if (!sel) return;
  var obj = collectRentObjectData(index);
  if (sel.value === '__custom__') {
    obj.object_type = '';
  } else {
    obj.object_type = sel.value;
  }
  var block = document.getElementById('rent_obj_' + index);
  if (block) {
    var div = document.createElement('div');
    div.innerHTML = renderRentObjectBlock(index, obj);
    block.replaceWith(div.firstChild);
  }
}

function onRentObjectCalcChange(index) {
  var obj = collectRentObjectData(index);
  var block = document.getElementById('rent_obj_' + index);
  if (block) {
    var div = document.createElement('div');
    div.innerHTML = renderRentObjectBlock(index, obj);
    block.replaceWith(div.firstChild);
    recalcRentMonthly();
  }
}

function collectRentObjectData(index) {
  var obj = {};
  var customFields = {};
  document.querySelectorAll('.ro-field[data-idx="' + index + '"]').forEach(function(el) {
    var name = el.getAttribute('data-name');
    if (name.endsWith('_custom')) {
      customFields[name.replace('_custom', '')] = el.value;
    } else if (el.tagName === 'SELECT' && el.value === '__custom__') {
      // Will use custom value
    } else {
      obj[name] = el.value;
    }
  });
  // Apply custom values where select is __custom__
  document.querySelectorAll('select.ro-field[data-idx="' + index + '"]').forEach(function(sel) {
    var name = sel.getAttribute('data-name');
    if (sel.value === '__custom__' && customFields[name]) {
      obj[name] = customFields[name];
    }
  });
  return obj;
}

function collectAllRentObjects() {
  var objects = [];
  document.querySelectorAll('.rent-object-block').forEach(function(block) {
    var idx = block.id.replace('rent_obj_', '');
    objects.push(collectRentObjectData(idx));
  });
  return objects;
}

function recalcRentMonthly() {
  var total = 0;
  var objects = collectAllRentObjects();
  objects.forEach(function(obj) {
    if (obj.calc_mode === 'fixed') {
      total += parseFloat(obj.fixed_rent) || 0;
    } else {
      total += (parseFloat(obj.area) || 0) * (parseFloat(obj.rent_rate) || 0);
    }
  });
  // Add extra services
  var extraCost = document.getElementById('f_extra_services_cost');
  if (extraCost) total += parseFloat(extraCost.value) || 0;

  var rentEl = document.getElementById('f_rent_monthly');
  if (rentEl) rentEl.value = total > 0 ? total.toFixed(2) : '';
  updateVatDisplay();
}

function onRentFieldChange() {
  // Collect current state and re-render
  var container = document.getElementById('dynamicFieldsContainer');
  if (!container) return;
  var contractType = getSelectedContractType();
  var allFields = CONTRACT_TYPE_FIELDS[contractType] || CONTRACT_TYPE_FIELDS['Аренды'] || [];
  var currentProps = {};

  // Collect rent objects
  currentProps.rent_objects = collectAllRentObjects();

  // Collect other fields
  allFields.forEach(function(f) {
    if (f.name === 'rent_objects') return;
    if (f.field_type === 'checkbox') {
      var cb = document.getElementById('f_' + f.name);
      currentProps[f.name] = cb ? String(cb.checked) : 'false';
    } else {
      var el = document.getElementById('f_' + f.name);
      currentProps[f.name] = el ? el.value || '' : '';
    }
  });
  renderRentFields(container, allFields, currentProps);
}

function updateVatDisplay() {
  var rentEl = document.getElementById('f_rent_monthly');
  var vatEl = document.getElementById('f_vat_rate');
  var display = document.getElementById('vat_display');
  if (!display) return;
  var rent = parseFloat(rentEl ? rentEl.value : 0) || 0;
  var vat = parseFloat(vatEl ? vatEl.value : 20) || 0;
  if (rent > 0 && vat > 0) {
    var vatAmount = (rent * vat / (100 + vat)).toFixed(2);
    display.textContent = 'в т.ч. НДС (' + vat + '%) = ' + vatAmount + ' руб.';
  } else {
    display.textContent = '';
  }
}

// ============ CONTRACT PARTY ROLES ============

var CONTRACT_ROLES = {
  'Подряда':     { our: 'Заказчик',      contractor: 'Подрядчик' },
  'Аренды':      { our: 'Арендодатель',   contractor: 'Арендатор' },
  'Субаренды':   { our: 'Арендодатель',   contractor: 'Арендатор', hasSubtenant: true },
  'Услуг':       { our: 'Заказчик',      contractor: 'Исполнитель' },
  'Поставки':    { our: 'Покупатель',    contractor: 'Поставщик' },
  'Эксплуатации':{ our: 'Заказчик',      contractor: 'Исполнитель' },
  'Купли-продажи':{ our: 'Покупатель',   contractor: 'Продавец' },
  'Цессии':      { our: 'Цедент',        contractor: 'Цессионарий' },
};

var _contractFormTypeName = '';
var _contractFormFields = [];
var _contractFormProps = {};

function renderContractFormFields(fields, props, headerHtml) {
  _contractFormFields = fields;
  _contractFormProps = props || {};
  var contractType = props.contract_type || '';
  var roles = CONTRACT_ROLES[contractType] || { our: 'Наше юр. лицо', contractor: 'Контрагент' };

  var html = headerHtml || '';

  fields.forEach(function(f) {
    var val = props[f.name] || '';
    var ef = enrichFieldOptions(f);

    // contract_type — first, with onchange
    if (f.name === 'contract_type') {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
      return;
    }

    // Role label fields — small editable input with default
    if (f.name === 'our_role_label') {
      var defaultRole = roles.our;
      html += '<div class="form-group" id="wrap_our_role_label"><label>Роль нашей стороны</label>' +
        '<input id="f_our_role_label" value="' + escapeHtml(val || defaultRole) + '" placeholder="' + escapeHtml(defaultRole) + '" data-auto-set="true" data-auto-set="true" data-auto-set="true" style="font-size:12px;color:var(--text-secondary)"></div>';
      return;
    }
    if (f.name === 'contractor_role_label') {
      var defaultRole = roles.contractor;
      html += '<div class="form-group" id="wrap_contractor_role_label"><label>Роль контрагента</label>' +
        '<input id="f_contractor_role_label" value="' + escapeHtml(val || defaultRole) + '" placeholder="' + escapeHtml(defaultRole) + '" data-auto-set="true" data-auto-set="true" data-auto-set="true" style="font-size:12px;color:var(--text-secondary)"></div>';
      return;
    }

    // our_legal_entity — label from role
    if (f.name === 'our_legal_entity') {
      var label = (props.our_role_label || roles.our);
      html += '<div class="form-group" id="wrap_our_legal_entity"><label id="label_our_legal_entity">' + escapeHtml(label) + '</label>' + renderFieldInput(ef, val) + '</div>';
      return;
    }

    // contractor_name — label from role
    if (f.name === 'contractor_name') {
      var label = (props.contractor_role_label || roles.contractor);
      html += '<div class="form-group" id="wrap_contractor_name"><label id="label_contractor_name">' + escapeHtml(label) + '</label>' + renderFieldInput(ef, val) + '</div>';
      return;
    }

    // subtenant — only for Субаренды
    if (f.name === 'subtenant_name') {
      var show = (contractType === 'Субаренды') || (roles.hasSubtenant);
      html += '<div class="form-group" id="wrap_subtenant_name" style="' + (show ? '' : 'display:none') + '"><label>Субарендатор</label>' + renderFieldInput(ef, val) + '</div>';
      return;
    }

    // Regular fields
    html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
  });

  html += '<div id="dynamicFieldsContainer"></div>';

  // Determine typeName for submit button
  var isSupp = fields.some(function(f) { return f.name === 'changes_description'; });
  var typeName = isSupp ? 'supplement' : 'contract';
  if (_contractFormTypeName) typeName = _contractFormTypeName;

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreate(\\''+typeName+'\\')">Создать</button></div>';

  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');

  // Attach contract_type change handler
  var ctEl = document.getElementById('f_contract_type');
  if (ctEl) {
    ctEl.addEventListener('change', function() { onContractTypeChange(); });
    var ctCustom = document.getElementById('f_contract_type_custom');
    if (ctCustom) ctCustom.addEventListener('input', function() { onContractTypeChange(); });
  }

  // Attach manual edit handlers on role labels
  var ourRoleEl = document.getElementById('f_our_role_label');
  if (ourRoleEl) ourRoleEl.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });
  var contrRoleEl = document.getElementById('f_contractor_role_label');
  if (contrRoleEl) contrRoleEl.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });

  // Render dynamic fields if contract_type already set
  if (contractType) {
    renderDynamicFields(contractType, props);
  }
}

function getSelectedContractType() {
  var ctEl = document.getElementById('f_contract_type');
  if (!ctEl) return '';
  if (ctEl.value === '__custom__') {
    var ctCustom = document.getElementById('f_contract_type_custom');
    return ctCustom ? ctCustom.value : '';
  }
  return ctEl.value || '';
}

function onContractTypeChange() {
  var contractType = getSelectedContractType();
  var roles = CONTRACT_ROLES[contractType] || { our: 'Наше юр. лицо', contractor: 'Контрагент' };

  // Update role label inputs (only if auto-set, not manually edited)
  var ourRoleEl = document.getElementById('f_our_role_label');
  if (ourRoleEl && ourRoleEl.getAttribute('data-auto-set') !== 'false') {
    ourRoleEl.value = roles.our;
    ourRoleEl.placeholder = roles.our;
  }

  var contrRoleEl = document.getElementById('f_contractor_role_label');
  if (contrRoleEl && contrRoleEl.getAttribute('data-auto-set') !== 'false') {
    contrRoleEl.value = roles.contractor;
    contrRoleEl.placeholder = roles.contractor;
  }

  // Update labels on the entity fields
  updatePartyLabels();

  // Show/hide subtenant
  var subWrap = document.getElementById('wrap_subtenant_name');
  if (subWrap) {
    subWrap.style.display = (contractType === 'Субаренды') ? '' : 'none';
  }

  // Render dynamic fields
  renderDynamicFields(contractType, {});
}

function updatePartyLabels() {
  var ourRoleEl = document.getElementById('f_our_role_label');
  var contrRoleEl = document.getElementById('f_contractor_role_label');
  var ourLabel = document.getElementById('label_our_legal_entity');
  var contrLabel = document.getElementById('label_contractor_name');
  if (ourLabel && ourRoleEl) ourLabel.textContent = ourRoleEl.value || 'Наше юр. лицо';
  if (contrLabel && contrRoleEl) contrLabel.textContent = contrRoleEl.value || 'Контрагент';
}

function collectDynamicFieldValues(contractType) {
  const extraFields = CONTRACT_TYPE_FIELDS[contractType] || [];
  const result = {};
  extraFields.forEach(function(f) {
    result[f.name] = getFieldValue(f);
  });
  return result;
}

async function api(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  const r = await fetch(API + url, { ...opts, headers });
  if (r.status === 401 && REFRESH) {
    const ref = await fetch(API + '/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: REFRESH })
    });
    if (ref.ok) {
      const data = await ref.json();
      TOKEN = data.accessToken;
      localStorage.setItem('accessToken', TOKEN);
      headers['Authorization'] = 'Bearer ' + TOKEN;
      const r2 = await fetch(API + url, { ...opts, headers });
      return r2.json();
    } else {
      logout();
      return {};
    }
  }
  if (r.status === 401) { logout(); return {}; }
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: 'Ошибка сервера' }));
    alert(err.error || 'Ошибка');
    throw new Error(err.error);
  }
  return r.json();
}

function logout() {
  TOKEN = null; REFRESH = null; CURRENT_USER = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  showLogin();
}

function showLogin() {
  document.getElementById('sidebar').style.display = 'none';
  document.querySelector('.main').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const r = await fetch(API + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Ошибка'; return; }
    TOKEN = data.accessToken;
    REFRESH = data.refreshToken;
    CURRENT_USER = data.user;
    localStorage.setItem('accessToken', TOKEN);
    localStorage.setItem('refreshToken', REFRESH);
    document.getElementById('loginScreen').style.display = 'none';
    document.querySelector('.app').style.display = 'flex';
    document.getElementById('sidebar').style.display = '';
    document.querySelector('.main').style.display = '';
    startApp();
  } catch (e) { errEl.textContent = 'Ошибка подключения'; }
}

async function startApp() {
  if (!CURRENT_USER) {
    try { CURRENT_USER = await api('/auth/me'); } catch (e) { logout(); return; }
  }
  entityTypes = await api('/entity-types');
  relationTypes = await api('/relations/types');
  renderTypeNav();
  showDashboard();
  if (window.innerWidth <= 768) document.getElementById('menuBtn').style.display = '';
}

async function init() {
  if (TOKEN) {
    document.getElementById('loginScreen').style.display = 'none';
    document.querySelector('.app').style.display = 'flex';
    startApp();
  } else {
    showLogin();
  }
}

function renderTypeNav() {
  const nav = document.getElementById('typeNav');
  const visibleTypes = entityTypes.filter(t => t.name === 'contract' || t.name === 'supplement');
  nav.innerHTML = visibleTypes.map(t =>
    '<div class="nav-item" data-type="' + t.name + '" onclick="showEntityList(\\'' + t.name + '\\')">' +
    '<span class="icon">' + t.icon + '</span> ' + t.name_ru +
    '<span class="count" id="count_' + t.name + '">-</span></div>'
  ).join('');
}

function setActive(selector) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (selector) {
    const el = document.querySelector(selector);
    if (el) el.classList.add('active');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ============ DASHBOARD ============

async function showDashboard() {
  currentView = 'dashboard';
  currentTypeFilter = null;
  setActive('.nav-item:first-child');
  document.getElementById('pageTitle').textContent = 'Обзор';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';

  const stats = await api('/stats');
  const content = document.getElementById('content');

  let html = '<div class="stats-grid">';
  stats.types.forEach(t => {
    html += '<div class="stat-card" onclick="showEntityList(\\'' + t.name + '\\')">' +
      '<div class="stat-icon">' + t.icon + '</div>' +
      '<div class="stat-count" style="color:' + t.color + '">' + t.count + '</div>' +
      '<div class="stat-label">' + t.name_ru + '</div></div>';
    const countEl = document.getElementById('count_' + t.name);
    if (countEl) countEl.textContent = t.count;
  });
  html += '</div>';

  html += '<div class="stat-card" style="display:inline-block;padding:12px 20px">' +
    '<span style="font-size:20px;font-weight:700;color:var(--accent)">' + stats.totalRelations + '</span>' +
    ' <span style="color:var(--text-secondary);font-size:13px">связей</span></div>';

  content.innerHTML = html;
}

// ============ ENTITY LIST ============

async function showEntityList(typeName) {
  currentView = 'list';
  currentTypeFilter = typeName;
  const type = entityTypes.find(t => t.name === typeName);
  setActive('[data-type="' + typeName + '"]');
  document.getElementById('pageTitle').textContent = type ? type.name_ru : typeName;
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML =
    '<input class="search-bar" placeholder="Поиск..." oninput="searchEntities(this.value)">' +
    '<button class="btn btn-primary" onclick="openCreateModal(\\'' + typeName + '\\')">+ Добавить</button>';

  const entities = await api('/entities?type=' + typeName);
  renderEntityGrid(entities);
}

function renderEntityGrid(entities) {
  const content = document.getElementById('content');
  if (entities.length === 0) {
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)">Нет записей</div>';
    return;
  }
  let html = '<div class="entity-grid">';
  entities.forEach(e => {
    const props = e.properties || {};
    let tags = '';
    Object.entries(props).forEach(([k, v]) => {
      if (v && String(v).length < 40) tags += '<span class="prop-tag">' + escapeHtml(String(v)) + '</span>';
    });
    html += '<div class="entity-card" onclick="showEntity(' + e.id + ')">' +
      '<div class="card-header">' +
      '<div class="card-icon" style="background:' + e.color + '20;color:' + e.color + '">' + e.icon + '</div>' +
      '<div><div class="card-title">' + escapeHtml(e.name) + '</div>' +
      '<div class="card-type">' + e.type_name_ru + (e.parent_name ? ' · ' + escapeHtml(e.parent_name) : '') + '</div></div>' +
      '</div>' +
      (tags ? '<div class="card-props">' + tags + '</div>' : '') +
      '</div>';
  });
  html += '</div>';
  content.innerHTML = html;
}

let searchTimeout;
async function searchEntities(q) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const url = '/entities?' + (currentTypeFilter ? 'type=' + currentTypeFilter + '&' : '') + 'search=' + encodeURIComponent(q);
    const entities = await api(url);
    renderEntityGrid(entities);
  }, 300);
}

// ============ ENTITY DETAIL ============

async function showEntity(id) {
  currentView = 'detail';
  currentEntityId = id;
  const e = await api('/entities/' + id);

  setActive('[data-type="' + e.type_name + '"]');
  document.getElementById('pageTitle').textContent = '';
  document.getElementById('breadcrumb').innerHTML =
    (e.parent ? '<a href="#" onclick="showEntity(' + e.parent.id + ');return false" style="color:var(--accent)">' + e.parent.icon + ' ' + escapeHtml(e.parent.name) + '</a> → ' : '') +
    e.icon + ' ' + escapeHtml(e.name);
  document.getElementById('topActions').innerHTML =
    '<button class="btn btn-sm" onclick="openEditModal(' + id + ')">Редактировать</button>' +
    '<button class="btn btn-sm" onclick="openRelationModal(' + id + ')">+ Связь</button>' +
    '<button class="btn btn-sm btn-danger" onclick="deleteEntity(' + id + ')">Удалить</button>';

  let html = '';

  // Properties
  const props = e.properties || {};
  const fields = e.fields || [];
  if (fields.length > 0) {
    html += '<div class="detail-section"><h3>Свойства</h3><div class="props-grid">';
    var detailRoles = CONTRACT_ROLES[props.contract_type] || {};
    fields.forEach(f => {
      const val = props[f.name];
      // Skip internal role fields in display
      if (f.name === 'our_role_label' || f.name === 'contractor_role_label') return;
      // Hide subtenant if not Субаренды
      if (f.name === 'subtenant_name' && props.contract_type !== 'Субаренды') return;
      // Custom labels for parties
      var label = f.name_ru || f.name;
      if (f.name === 'our_legal_entity') label = props.our_role_label || detailRoles.our || label;
      if (f.name === 'contractor_name') label = props.contractor_role_label || detailRoles.contractor || label;
      // Boolean display
      if (f.field_type === 'boolean') {
        html += '<div class="prop-item"><div class="prop-label">' + label + '</div>' +
          '<div class="prop-value">' + (val === 'true' ? '✅ Да' : '—') + '</div></div>';
        return;
      }
      html += '<div class="prop-item"><div class="prop-label">' + escapeHtml(label) + '</div>' +
        '<div class="prop-value">' + (val ? escapeHtml(String(val)) : '—') + '</div></div>';
    });
    // Show dynamic contract-type fields in detail
    if ((e.type_name === 'contract' || e.type_name === 'supplement') && props.contract_type) {
      const extraFields = CONTRACT_TYPE_FIELDS[props.contract_type] || [];
      var isLand = (props.object_type === 'Земельный участок');
      var hasExtra = (props.extra_services === 'true');
      var durType = props.duration_type || '';
      extraFields.forEach(function(f) {
        var val = props[f.name];
        var group = f._group || '';
        // Filter conditional groups for display
        if (group === 'not_land' && isLand) return;
        if (group === 'land' && !isLand) return;
        if (group === 'extra' && !hasExtra) return;
        if (group === 'duration_date' && durType !== 'Дата') return;
        if (group === 'duration_text' && durType !== 'Текст') return;
        // Skip internal fields
        if (f.name === 'extra_services' || f.name === 'duration_type') return;

        if (f.field_type === 'rent_objects') {
          var robjs = [];
          try { if (typeof val === 'string' && val) robjs = JSON.parse(val); else if (Array.isArray(val)) robjs = val; } catch(ex) {}
          if (robjs.length > 0) {
            robjs.forEach(function(ro, ri) {
              html += '<div class="prop-item" style="border-left:2px solid var(--accent);padding-left:8px;margin-bottom:4px"><div class="prop-label">Объект ' + (ri+1) + ': ' + escapeHtml(ro.object_type || '') + '</div><div class="prop-value">';
              if (ro.building) html += 'Корпус: ' + escapeHtml(ro.building) + '<br>';
              if (ro.room) html += 'Помещение: ' + escapeHtml(ro.room) + '<br>';
              if (ro.rent_scope) html += escapeHtml(ro.rent_scope) + '<br>';
              if (ro.land_location) html += 'Местоположение: ' + escapeHtml(ro.land_location) + '<br>';
              if (ro.calc_mode === 'fixed') {
                html += 'Аренда: ' + (ro.fixed_rent || '—') + ' руб.<br>';
              } else {
                if (ro.area) html += 'Площадь: ' + escapeHtml(String(ro.area)) + ' м²<br>';
                if (ro.rent_rate) html += 'Ставка: ' + escapeHtml(String(ro.rent_rate)) + ' руб/м²<br>';
                var ot = (parseFloat(ro.area)||0) * (parseFloat(ro.rent_rate)||0);
                if (ot > 0) html += '= ' + ot.toFixed(2) + ' руб.<br>';
              }
              if (ro.comment) html += '<em>' + escapeHtml(ro.comment) + '</em>';
              html += '</div></div>';
            });
          }
          return;
        } else if (f.field_type === 'advances') {
          var advances = [];
          try { if (typeof val === 'string' && val) advances = JSON.parse(val); else if (Array.isArray(val)) advances = val; } catch(ex) {}
          html += '<div class="prop-item"><div class="prop-label">' + (f.name_ru || f.name) + '</div><div class="prop-value">';
          if (advances.length > 0) {
            advances.forEach(function(adv, i) {
              html += (i > 0 ? '<br>' : '') + (adv.amount ? escapeHtml(String(adv.amount)) + ' руб.' : '—') + (adv.date ? ' от ' + escapeHtml(adv.date) : '');
            });
          } else { html += '—'; }
          html += '</div></div>';
        } else if (f.name === 'vat_rate' && props.rent_monthly) {
          var rent = parseFloat(props.rent_monthly) || 0;
          var vat = parseFloat(val) || 0;
          var vatAmount = rent > 0 && vat > 0 ? (rent * vat / (100 + vat)).toFixed(2) : '—';
          html += '<div class="prop-item"><div class="prop-label">Арендная плата</div>' +
            '<div class="prop-value">' + escapeHtml(String(props.rent_monthly)) + ' руб./мес.' +
            (vat > 0 ? '<br><span style="font-size:12px;color:var(--text-secondary)">в т.ч. НДС (' + vat + '%) = ' + vatAmount + ' руб.</span>' : '') +
            '</div></div>';
        } else if (f.name === 'rent_monthly') {
          return; // shown together with vat_rate above
        } else {
          html += '<div class="prop-item"><div class="prop-label">' + (f.name_ru || f.name) + '</div>' +
            '<div class="prop-value">' + (val ? escapeHtml(String(val)) : '—') + '</div></div>';
        }
      });
    }
    html += '</div></div>';
  }

  // Supplements section for contracts
  if (e.type_name === 'contract') {
    const allEntities = await api('/entities?type=supplement');
    const supplements = allEntities.filter(function(s) { return s.parent_id === e.id; });
    html += '<div class="detail-section"><h3>Доп. соглашения</h3>';
    if (supplements.length > 0) {
      html += '<div class="children-grid">';
      supplements.forEach(function(s) {
        const sp = s.properties || {};
        html += '<div class="child-card" onclick="showEntity(' + s.id + ')">' +
          '<span style="font-size:18px">📎</span>' +
          '<div><div style="font-weight:500;font-size:13px">' + escapeHtml(s.name) + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + (sp.number || '') + (sp.contract_date ? ' от ' + sp.contract_date : '') + '</div></div></div>';
      });
      html += '</div>';
    }
    html += '<button class="btn btn-sm btn-primary" onclick="openCreateSupplementModal(' + e.id + ')" style="margin-top:8px">+ Доп. соглашение</button>';
    html += '</div>';
  }

  // Children
  if (e.children && e.children.length > 0) {
    html += '<div class="detail-section"><h3>Содержит</h3><div class="children-grid">';
    e.children.forEach(c => {
      html += '<div class="child-card" onclick="showEntity(' + c.id + ')">' +
        '<span style="font-size:18px">' + c.icon + '</span>' +
        '<div><div style="font-weight:500;font-size:13px">' + escapeHtml(c.name) + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted)">' + c.type_name_ru + '</div></div></div>';
    });
    html += '</div></div>';
  }

  // Relations
  if (e.relations && e.relations.length > 0) {
    html += '<div class="detail-section"><h3>Связи</h3><div class="relation-list">';
    e.relations.forEach(r => {
      const isFrom = r.from_entity_id === e.id;
      const linkedId = isFrom ? r.to_entity_id : r.from_entity_id;
      const linkedName = isFrom ? r.to_name : r.from_name;
      const linkedIcon = isFrom ? r.to_icon : r.from_icon;
      const linkedType = isFrom ? r.to_type_ru : r.from_type_ru;
      const relColor = r.relation_color || '#94A3B8';
      html += '<div class="relation-item" onclick="showEntity(' + linkedId + ')">' +
        '<span style="font-size:18px">' + linkedIcon + '</span>' +
        '<div><div class="relation-name">' + escapeHtml(linkedName) + '</div>' +
        '<div class="relation-type-label">' + linkedType + '</div></div>' +
        '<span class="relation-badge" style="background:' + relColor + '">' + (r.relation_name_ru || r.relation_type) + '</span>' +
        '<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteRelation(' + r.id + ',' + e.id + ')" style="margin-left:auto">×</button>' +
        '</div>';
    });
    html += '</div></div>';
  }

  document.getElementById('content').innerHTML = html;
}

// ============ MODALS ============

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

async function openCreateModal(typeName) {
  _contractFormTypeName = typeName;
  const type = entityTypes.find(t => t.name === typeName);
  const fields = await api('/entity-types/' + type.id + '/fields');
  const allEntities = await api('/entities');
  await loadContractEntities();

  const isContractLike = (typeName === 'contract' || typeName === 'supplement');
  let html = '<h3>Новый: ' + type.name_ru + '</h3>';
  if (isContractLike) {
    html += '<input type="hidden" id="f_name" value="">';
  } else {
    html += '<div class="form-group"><label>Название</label><input id="f_name" required></div>';
  }

  // Parent selector (hide for contracts)
  if (!isContractLike) {
    html += '<div class="form-group"><label>Родитель (вложен в)</label><select id="f_parent"><option value="">— нет —</option>';
    allEntities.forEach(e => {
      html += '<option value="' + e.id + '">' + e.icon + ' ' + escapeHtml(e.name) + ' (' + e.type_name_ru + ')</option>';
    });
    html += '</select></div>';
  }
  if (isContractLike) {
    renderContractFormFields(fields, {}, html);
    return;
  }

  fields.forEach(f => {
    html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(enrichFieldOptions(f), '') + '</div>';
  });

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreate(\\'' + typeName + '\\')">Создать</button></div>';

  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
  document.getElementById('f_name').focus();
}

let _submitting = false;

async function submitCreate(typeName) {
  if (_submitting) return;
  _submitting = true;
  try { await _doSubmitCreate(typeName); } finally { _submitting = false; }
}

async function _doSubmitCreate(typeName) {
  const type = entityTypes.find(t => t.name === typeName);
  const fields = await api('/entity-types/' + type.id + '/fields');
  const isContractLike = (typeName === 'contract' || typeName === 'supplement');
  const parent_id = isContractLike ? null : (document.getElementById('f_parent') ? document.getElementById('f_parent').value || null : null);
  const properties = {};
  fields.forEach(f => { const v = getFieldValue(f); if (v) properties[f.name] = v; });

  // Collect dynamic contract-type fields
  if (isContractLike && properties.contract_type) {
    Object.assign(properties, collectDynamicFieldValues(properties.contract_type));
  }

  // Auto-generate name for contracts
  let name = document.getElementById('f_name').value.trim();
  if (isContractLike) {
    const num = properties.number || '?';
    const contractor = properties.contractor_name || '';
    name = (typeName === 'supplement' ? 'ДС' : 'Договор') + ' №' + num + (contractor ? ' — ' + contractor : '');
  }
  if (!name) return alert('Введите название');

  await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: type.id, name, properties, parent_id }) });
  closeModal();
  showEntityList(typeName);
}

async function openEditModal(id) {
  const e = await api('/entities/' + id);
  const fields = e.fields || [];
  const allEntities = await api('/entities');
  await loadContractEntities();

  const props = e.properties || {};
  const isContractLike = (e.type_name === 'contract' || e.type_name === 'supplement');
  _contractFormTypeName = e.type_name;

  let html = '<h3>Редактировать: ' + escapeHtml(e.name) + '</h3>';
  if (isContractLike) {
    html += '<input type="hidden" id="f_name" value="' + escapeHtml(e.name) + '">';
  } else {
    html += '<div class="form-group"><label>Название</label><input id="f_name" value="' + escapeHtml(e.name) + '"></div>';
  }

  if (isContractLike) {
    // Use renderContractFormFields but with edit button
    var editHtml = html;
    _contractFormFields = fields;
    _contractFormProps = props;
    var contractType = props.contract_type || '';
    var roles = CONTRACT_ROLES[contractType] || { our: 'Наше юр. лицо', contractor: 'Контрагент' };

    fields.forEach(function(f) {
      var val = props[f.name] || '';
      var ef = enrichFieldOptions(f);

      if (f.name === 'contract_type') {
        editHtml += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
      } else if (f.name === 'our_role_label') {
        var defaultRole = roles.our;
        editHtml += '<div class="form-group" id="wrap_our_role_label"><label>Роль нашей стороны</label>' +
          '<input id="f_our_role_label" value="' + escapeHtml(val || defaultRole) + '" placeholder="' + escapeHtml(defaultRole) + '" data-auto-set="true" data-auto-set="true" style="font-size:12px;color:var(--text-secondary)"></div>';
      } else if (f.name === 'contractor_role_label') {
        var defaultRole = roles.contractor;
        editHtml += '<div class="form-group" id="wrap_contractor_role_label"><label>Роль контрагента</label>' +
          '<input id="f_contractor_role_label" value="' + escapeHtml(val || defaultRole) + '" placeholder="' + escapeHtml(defaultRole) + '" data-auto-set="true" data-auto-set="true" style="font-size:12px;color:var(--text-secondary)"></div>';
      } else if (f.name === 'our_legal_entity') {
        var label = (props.our_role_label || roles.our);
        editHtml += '<div class="form-group" id="wrap_our_legal_entity"><label id="label_our_legal_entity">' + escapeHtml(label) + '</label>' + renderFieldInput(ef, val) + '</div>';
      } else if (f.name === 'contractor_name') {
        var label = (props.contractor_role_label || roles.contractor);
        editHtml += '<div class="form-group" id="wrap_contractor_name"><label id="label_contractor_name">' + escapeHtml(label) + '</label>' + renderFieldInput(ef, val) + '</div>';
      } else if (f.name === 'subtenant_name') {
        var show = (contractType === 'Субаренды');
        editHtml += '<div class="form-group" id="wrap_subtenant_name" style="' + (show ? '' : 'display:none') + '"><label>Субарендатор</label>' + renderFieldInput(ef, val) + '</div>';
      } else {
        editHtml += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
      }
    });

    editHtml += '<div id="dynamicFieldsContainer"></div>';
    editHtml += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
      '<button class="btn btn-primary" onclick="submitEdit(' + id + ')">Сохранить</button></div>';

    document.getElementById('modal').innerHTML = editHtml;
    document.getElementById('modalOverlay').classList.add('show');

    var ctEl = document.getElementById('f_contract_type');
    if (ctEl) {
      ctEl.addEventListener('change', function() { onContractTypeChange(); });
      var ctCustom = document.getElementById('f_contract_type_custom');
      if (ctCustom) ctCustom.addEventListener('input', function() { onContractTypeChange(); });
    }
    var ourRE = document.getElementById('f_our_role_label');
    if (ourRE) ourRE.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });
    var contrRE = document.getElementById('f_contractor_role_label');
    if (contrRE) contrRE.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });
    if (contractType) renderDynamicFields(contractType, props);

    return;
  }

  // Non-contract edit
  html += '<div class="form-group"><label>Родитель</label><select id="f_parent"><option value="">— нет —</option>';
  allEntities.filter(x => x.id !== id).forEach(x => {
    html += '<option value="' + x.id + '"' + (x.id === e.parent_id ? ' selected' : '') + '>' + x.icon + ' ' + escapeHtml(x.name) + '</option>';
  });
  html += '</select></div>';
  fields.forEach(f => {
    const val = props[f.name] || '';
    html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(enrichFieldOptions(f), val) + '</div>';
  });

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitEdit(' + id + ')">Сохранить</button></div>';

  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
}

async function submitEdit(id) {
  if (_submitting) return;
  _submitting = true;
  try { await _doSubmitEdit(id); } finally { _submitting = false; }
}

async function _doSubmitEdit(id) {
  const e = await api('/entities/' + id);
  const fields = e.fields || [];
  const isContractLike = (e.type_name === 'contract' || e.type_name === 'supplement');
  const parent_id = isContractLike ? (e.parent_id || null) : (document.getElementById('f_parent') ? document.getElementById('f_parent').value || null : null);
  const properties = {};
  fields.forEach(f => { properties[f.name] = getFieldValue(f); });

  // Collect dynamic contract-type fields
  if (isContractLike && properties.contract_type) {
    Object.assign(properties, collectDynamicFieldValues(properties.contract_type));
  }

  // Auto-generate name for contracts
  let name = document.getElementById('f_name').value.trim();
  if (isContractLike) {
    const num = properties.number || '?';
    const contractor = properties.contractor_name || '';
    name = (e.type_name === 'supplement' ? 'ДС' : 'Договор') + ' №' + num + (contractor ? ' — ' + contractor : '');
  }

  await api('/entities/' + id, { method: 'PUT', body: JSON.stringify({ name, properties, parent_id }) });
  closeModal();
  showEntity(id);
}

async function deleteEntity(id) {
  if (!confirm('Удалить эту запись?')) return;
  await api('/entities/' + id, { method: 'DELETE' });
  if (currentTypeFilter) showEntityList(currentTypeFilter);
  else showDashboard();
}

// ============ SUPPLEMENTS ============

async function openCreateSupplementModal(parentContractId) {
  _contractFormTypeName = 'supplement';
  await loadContractEntities();
  const parentEntity = await api('/entities/' + parentContractId);
  const parentProps = parentEntity.properties || {};
  const suppType = entityTypes.find(t => t.name === 'supplement');
  if (!suppType) return alert('Тип "Доп. соглашение" не найден');
  const fields = await api('/entity-types/' + suppType.id + '/fields');

  var html = '<h3>Новое доп. соглашение</h3>';
  html += '<input type="hidden" id="f_name" value="">';
  html += '<input type="hidden" id="f_parent" value="' + parentContractId + '">';

  // Use the same contract form with role labels
  var contractType = parentProps.contract_type || '';
  var roles = CONTRACT_ROLES[contractType] || { our: 'Наше юр. лицо', contractor: 'Контрагент' };

  fields.forEach(function(f) {
    var val = parentProps[f.name] || '';
    var ef = enrichFieldOptions(f);

    if (f.name === 'contract_type') {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
    } else if (f.name === 'our_role_label') {
      html += '<div class="form-group" id="wrap_our_role_label"><label>Роль нашей стороны</label>' +
        '<input id="f_our_role_label" value="' + escapeHtml(val || roles.our) + '" data-auto-set="true" style="font-size:12px;color:var(--text-secondary)"></div>';
    } else if (f.name === 'contractor_role_label') {
      html += '<div class="form-group" id="wrap_contractor_role_label"><label>Роль контрагента</label>' +
        '<input id="f_contractor_role_label" value="' + escapeHtml(val || roles.contractor) + '" data-auto-set="true" style="font-size:12px;color:var(--text-secondary)"></div>';
    } else if (f.name === 'our_legal_entity') {
      var label = (parentProps.our_role_label || roles.our);
      html += '<div class="form-group" id="wrap_our_legal_entity"><label id="label_our_legal_entity">' + escapeHtml(label) + '</label>' + renderFieldInput(ef, val) + '</div>';
    } else if (f.name === 'contractor_name') {
      var label = (parentProps.contractor_role_label || roles.contractor);
      html += '<div class="form-group" id="wrap_contractor_name"><label id="label_contractor_name">' + escapeHtml(label) + '</label>' + renderFieldInput(ef, val) + '</div>';
    } else if (f.name === 'subtenant_name') {
      var show = (contractType === 'Субаренды');
      html += '<div class="form-group" id="wrap_subtenant_name" style="' + (show ? '' : 'display:none') + '"><label>Субарендатор</label>' + renderFieldInput(ef, val) + '</div>';
    } else {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
    }
  });

  html += '<div id="dynamicFieldsContainer"></div>';
  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreateSupplement(' + parentContractId + ')">Создать</button></div>';

  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');

  var ctEl = document.getElementById('f_contract_type');
  if (ctEl) {
    ctEl.addEventListener('change', function() { onContractTypeChange(); });
    var ctCustom = document.getElementById('f_contract_type_custom');
    if (ctCustom) ctCustom.addEventListener('input', function() { onContractTypeChange(); });
  }
  var ourRE2 = document.getElementById('f_our_role_label');
  if (ourRE2) ourRE2.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });
  var contrRE2 = document.getElementById('f_contractor_role_label');
  if (contrRE2) contrRE2.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });
  if (contractType) renderDynamicFields(contractType, parentProps);
}

async function submitCreateSupplement(parentContractId) {
  if (_submitting) return;
  _submitting = true;
  try { await _doSubmitCreateSupplement(parentContractId); } finally { _submitting = false; }
}

async function _doSubmitCreateSupplement(parentContractId) {
  const suppType = entityTypes.find(t => t.name === 'supplement');
  const fields = await api('/entity-types/' + suppType.id + '/fields');
  const properties = {};
  fields.forEach(f => { const v = getFieldValue(f); if (v) properties[f.name] = v; });

  if (properties.contract_type) {
    Object.assign(properties, collectDynamicFieldValues(properties.contract_type));
  }

  const num = properties.number || '?';
  const contractor = properties.contractor_name || '';
  const name = 'ДС №' + num + (contractor ? ' — ' + contractor : '');

  await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: suppType.id, name, properties, parent_id: parentContractId }) });
  closeModal();
  showEntity(parentContractId);
}

// ============ RELATIONS ============

async function openRelationModal(entityId) {
  const allEntities = await api('/entities');

  let html = '<h3>Добавить связь</h3>';
  html += '<div class="form-group"><label>Тип связи</label><select id="r_type">';
  relationTypes.forEach(rt => {
    html += '<option value="' + rt.name + '">' + rt.name_ru + '</option>';
  });
  html += '</select></div>';

  html += '<div class="form-group"><label>Связать с</label><select id="r_target">';
  allEntities.filter(e => e.id !== entityId).forEach(e => {
    html += '<option value="' + e.id + '">' + e.icon + ' ' + escapeHtml(e.name) + ' (' + e.type_name_ru + ')</option>';
  });
  html += '</select></div>';

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitRelation(' + entityId + ')">Создать</button></div>';

  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
}

async function submitRelation(entityId) {
  const relation_type = document.getElementById('r_type').value;
  const to_entity_id = document.getElementById('r_target').value;
  await api('/relations', { method: 'POST', body: JSON.stringify({ from_entity_id: entityId, to_entity_id: parseInt(to_entity_id), relation_type }) });
  closeModal();
  showEntity(entityId);
}

async function deleteRelation(relId, entityId) {
  await api('/relations/' + relId, { method: 'DELETE' });
  showEntity(entityId);
}

// ============ SETTINGS ============

function showSettings() {
  currentView = 'settings';
  setActive(null);
  document.querySelectorAll('.nav-item').forEach(el => { if (el.textContent.includes('Типы и поля')) el.classList.add('active'); });
  document.getElementById('pageTitle').textContent = 'Настройки: Типы и поля';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML =
    '<button class="btn btn-primary" onclick="openAddTypeModal()">+ Новый тип</button>';

  let html = '<div class="entity-grid">';
  entityTypes.forEach(t => {
    html += '<div class="entity-card" onclick="showTypeFields(' + t.id + ')">' +
      '<div class="card-header"><div class="card-icon" style="background:' + t.color + '20;color:' + t.color + '">' + t.icon + '</div>' +
      '<div><div class="card-title">' + t.name_ru + '</div><div class="card-type">' + t.name + '</div></div></div></div>';
  });
  html += '</div>';
  document.getElementById('content').innerHTML = html;
}

async function showTypeFields(typeId) {
  const type = entityTypes.find(t => t.id === typeId);
  const fields = await api('/entity-types/' + typeId + '/fields');

  document.getElementById('pageTitle').textContent = type.name_ru + ' — Поля';
  document.getElementById('topActions').innerHTML =
    '<button class="btn" onclick="showSettings()">← Назад</button>' +
    '<button class="btn btn-primary" onclick="openAddFieldModal(' + typeId + ')">+ Добавить поле</button>';

  let html = '<div style="max-width:600px">';
  if (fields.length === 0) {
    html += '<div style="padding:40px;text-align:center;color:var(--text-muted)">Нет полей</div>';
  }
  fields.forEach(f => {
    html += '<div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;background:white">' +
      '<div style="flex:1"><div style="font-weight:500">' + (f.name_ru || f.name) + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted)">' + f.field_type + (f.required ? ' · обязательное' : '') + '</div></div>' +
      '<button class="btn btn-sm btn-danger" onclick="deleteField(' + f.id + ',' + typeId + ')">×</button></div>';
  });
  html += '</div>';
  document.getElementById('content').innerHTML = html;
}

function openAddTypeModal() {
  let html = '<h3>Новый тип сущности</h3>' +
    '<div class="form-group"><label>Системное имя (eng)</label><input id="t_name" placeholder="crane_track"></div>' +
    '<div class="form-group"><label>Название (рус)</label><input id="t_name_ru" placeholder="Подкрановый путь"></div>' +
    '<div class="form-group"><label>Иконка</label><input id="t_icon" placeholder="🛤" maxlength="4"></div>' +
    '<div class="form-group"><label>Цвет</label><input type="color" id="t_color" value="#6366F1"></div>' +
    '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitAddType()">Создать</button></div>';
  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
}

async function submitAddType() {
  const name = document.getElementById('t_name').value.trim();
  const name_ru = document.getElementById('t_name_ru').value.trim();
  const icon = document.getElementById('t_icon').value || '📄';
  const color = document.getElementById('t_color').value;
  if (!name || !name_ru) return alert('Заполните имя');
  await api('/entity-types', { method: 'POST', body: JSON.stringify({ name, name_ru, icon, color }) });
  entityTypes = await api('/entity-types');
  renderTypeNav();
  closeModal();
  showSettings();
}

function openAddFieldModal(typeId) {
  let html = '<h3>Новое поле</h3>' +
    '<div class="form-group"><label>Системное имя</label><input id="fd_name" placeholder="phone"></div>' +
    '<div class="form-group"><label>Название (рус)</label><input id="fd_name_ru" placeholder="Телефон"></div>' +
    '<div class="form-group"><label>Тип</label><select id="fd_type">' +
    '<option value="text">Текст</option><option value="number">Число</option><option value="date">Дата</option>' +
    '<option value="select">Выбор из списка</option><option value="boolean">Да/Нет</option></select></div>' +
    '<div class="form-group" id="fd_options_group" style="display:none"><label>Варианты (через запятую)</label><input id="fd_options" placeholder="Вариант 1, Вариант 2"></div>' +
    '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitAddField(' + typeId + ')">Создать</button></div>';
  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
  document.getElementById('fd_type').onchange = function() {
    document.getElementById('fd_options_group').style.display = this.value === 'select' ? '' : 'none';
  };
}

async function submitAddField(typeId) {
  const name = document.getElementById('fd_name').value.trim();
  const name_ru = document.getElementById('fd_name_ru').value.trim();
  const field_type = document.getElementById('fd_type').value;
  let options = null;
  if (field_type === 'select') {
    options = document.getElementById('fd_options').value.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!name) return alert('Введите имя поля');
  await api('/entity-types/' + typeId + '/fields', { method: 'POST', body: JSON.stringify({ name, name_ru, field_type, options }) });
  showTypeFields(typeId);
  closeModal();
}

async function deleteField(fieldId, typeId) {
  if (!confirm('Удалить поле?')) return;
  await api('/field-definitions/' + fieldId, { method: 'DELETE' });
  showTypeFields(typeId);
}

// ============ UTILS ============

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

init();
</script>
</body>
</html>`;

module.exports = FRONTEND_HTML;
