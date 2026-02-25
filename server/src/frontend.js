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
.modal { position: relative; background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); transition: max-width 0.15s, width 0.15s, height 0.15s, max-height 0.15s, border-radius 0.15s; }
.modal.modal--wide { max-width: min(860px, 95vw); }
.modal.modal--full { width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; border-radius: 0; }
.modal h3 { font-size: 16px; margin-bottom: 16px; padding-right: 80px; }
.modal .form-group { margin-bottom: 14px; }
.modal label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500; }
.modal input, .modal select, .modal textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; font-family: inherit; }
.modal input:focus, .modal select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
/* Modal resize controls */
.modal-resize-bar { position: sticky; top: 0; float: right; margin: -4px -4px 0 8px; display: flex; gap: 2px; z-index: 10; background: transparent; }
.modal-resize-btn { background: none; border: 1px solid transparent; border-radius: 5px; cursor: pointer; padding: 3px 6px; font-size: 13px; color: var(--text-muted); line-height: 1.2; transition: all 0.1s; }
.modal-resize-btn:hover { background: var(--bg-hover); border-color: var(--border); color: var(--text-primary); }
.modal-resize-btn.is-active { background: var(--accent); color: white; border-color: var(--accent); }

/* Search */
.search-bar { padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; width: 240px; font-family: inherit; }
.search-bar:focus { outline: none; border-color: var(--accent); }

/* Children list */
.children-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.pivot-field-pool { display: flex; flex-wrap: wrap; gap: 6px; min-height: 44px; padding: 8px; background: var(--bg-secondary); border-radius: var(--radius); border: 2px dashed var(--border); }
.pivot-zone { min-height: 60px; padding: 8px; background: var(--bg-secondary); border-radius: var(--radius); border: 2px dashed var(--border); display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; transition: border-color 0.15s, background 0.15s; }
.pivot-zone.drag-over { border-color: var(--accent); background: rgba(99,102,241,0.08); }
.pivot-chip { background: var(--bg-hover); border: 1px solid var(--border); border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.pivot-chip:active { cursor: grabbing; opacity: 0.7; }
.pivot-chip-row { background: #4ade80; color: #14532d; border-color: #16a34a; }
.pivot-chip-col { background: #60a5fa; color: #1e3a5f; border-color: #2563eb; }
.pivot-chip-remove { font-size: 14px; line-height: 1; cursor: pointer; opacity: 0.7; margin-left: 2px; }
.pivot-type-btn { background: var(--bg-secondary); border: 1px solid var(--border); color: var(--text-secondary); }
.pivot-type-btn:hover { border-color: var(--accent); color: var(--accent); }
.pivot-type-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
.agg-tree-row { display:flex;align-items:center;gap:8px;padding:5px 8px;border-bottom:1px solid var(--border);cursor:pointer;border-radius:4px; }
.agg-tree-row:hover { background:var(--bg-hover); }
.agg-tree-leaf { display:flex;align-items:center;gap:8px;padding:4px 8px;cursor:pointer;color:var(--text-secondary);font-size:13px; }
.agg-tree-leaf:hover { background:var(--bg-hover);border-radius:4px; }
.agg-total { color:var(--accent);font-weight:600;white-space:nowrap; }
.pivot-chip-remove:hover { opacity: 1; }
.pivot-zone-hint { color: var(--text-muted); font-size: 12px; padding: 4px; width: 100%; text-align: center; }
.pivot-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
.pivot-table th, .pivot-table td { border: 1px solid var(--border); padding: 7px 12px; }
.pivot-table thead th { background: var(--bg-hover); font-weight: 600; text-align: left; }
.pivot-table thead th:not(:first-child) { text-align: center; }
.pivot-table tfoot th { background: var(--bg-hover); font-weight: 600; text-align: center; }
.pivot-table tfoot th:first-child { text-align: left; }
.pivot-table tbody tr:hover { background: var(--bg-hover); }
.pivot-table td:not(:first-child) { text-align: center; }
.pivot-table .cell-empty { color: var(--text-muted); }
.pivot-table .cell-value { font-weight: 600; color: var(--accent); cursor: pointer; }
.pivot-table .cell-value:hover { text-decoration: underline; }
.pivot-table .row-total { font-weight: 600; border-left: 2px solid var(--border); }
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
.rent-filter-dropdown { position:absolute;top:100%;left:0;z-index:100;background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:220px;max-width:320px;padding:6px 0; }
.rent-filter-dropdown label { display:flex;align-items:center;gap:6px;padding:4px 10px;cursor:pointer;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.rent-filter-dropdown label:hover { background:var(--bg-hover); }
.rent-th { position:relative;white-space:nowrap;padding:6px 8px 6px 8px;background:var(--bg-secondary);border:1px solid var(--border);font-size:12px;font-weight:600;user-select:none; }
.rent-th-inner { display:flex;align-items:center;gap:4px;cursor:pointer;padding-right:4px; }
.rent-th-inner:hover { color:var(--accent); }
.rent-filter-btn { background:none;border:none;cursor:pointer;padding:1px 3px;color:var(--text-muted);font-size:11px;line-height:1;border-radius:3px; }
.rent-filter-btn.active { color:var(--accent);background:rgba(99,102,241,.12); }
.rent-col-resizer { position:absolute;right:0;top:0;bottom:0;width:5px;cursor:col-resize;z-index:2;background:transparent;transition:background 0.1s; }
.rent-col-resizer:hover { background:var(--accent);opacity:.4; }
.rent-col-resizer.resizing { background:var(--accent);opacity:.7; }
.rent-filter-search { width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:4px;padding:4px 7px;font-size:12px;margin-bottom:4px;outline:none; }
.rent-filter-search:focus { border-color:var(--accent); }
.rent-group-tag { display:flex;align-items:center;gap:4px;padding:3px 8px 3px 10px;background:var(--accent);color:white;border-radius:12px;font-size:12px; }
.rent-group-tag button { background:none;border:none;color:white;cursor:pointer;font-size:14px;line-height:1;padding:0 0 1px; }
.rent-field-btn { font-size:11px;padding:3px 8px;border-radius:12px; }
.eq-broken-row td, .eq-broken-cell { background:rgba(239,68,68,.10) !important; color:var(--text-primary); }
.eq-broken-row td:first-child a, .eq-broken-cell a { color:#dc2626 !important; }
.eq-broken-badge { display:inline-block;font-size:10px;background:#dc2626;color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px;vertical-align:middle; }
.eq-emergency-badge { display:inline-block;font-size:10px;background:#b85c5c;color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px;vertical-align:middle; }
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
      <div class="nav-section" style="margin-top:12px">Аналитика</div>
      <div class="nav-item" onclick="showReports()">
        <span class="icon">📋</span> Отчёты
      </div>
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
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'tenant', name_ru: 'Арендатор', field_type: 'select_or_custom', options: [] },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number' },
    { name: 'advances', name_ru: 'Авансы', field_type: 'advances' },
    { name: 'completion_deadline', name_ru: 'Срок выполнения', field_type: 'text' },
  ],
  'Субаренды': [
    { name: 'rent_objects', name_ru: 'Объекты', field_type: 'rent_objects' },
    { name: 'rent_monthly', name_ru: 'Арендная плата в месяц', field_type: 'number', _group: 'all', _readonly: true },
    { name: 'rent_comments', name_ru: 'Комментарии', field_type: 'multi_comments', _group: 'all' },
    { name: 'vat_rate', name_ru: 'НДС (%)', field_type: 'number', _group: 'all' },
    { name: 'external_rental', name_ru: 'Аренда внешняя', field_type: 'checkbox', _group: 'all' },
    { name: 'extra_services', name_ru: 'Доп. услуги', field_type: 'checkbox', _group: 'all' },
    { name: 'extra_services_desc', name_ru: 'Описание доп. услуг', field_type: 'text', _group: 'extra' },
    { name: 'extra_services_cost', name_ru: 'Стоимость в месяц', field_type: 'number', _group: 'extra' },
    { name: 'duration_type', name_ru: 'Срок действия', field_type: 'select', options: ['Дата', 'Текст'], _group: 'all' },
    { name: 'duration_date', name_ru: 'Дата окончания', field_type: 'date', _group: 'duration_date' },
    { name: 'duration_text', name_ru: 'Срок действия (текст)', field_type: 'text', _group: 'duration_text' },
    { name: 'transfer_equipment', name_ru: 'Передача оборудования', field_type: 'checkbox', _group: 'all' },
    { name: 'equipment_list', name_ru: 'Передаваемое оборудование', field_type: 'equipment_list', _group: 'transfer' },
  ],
  'Обслуживания': [
    { name: 'service_subject', name_ru: 'Описание работ / предмет', field_type: 'text' },
    { name: 'building', name_ru: 'Корпус', field_type: 'select_or_custom', options: [] },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_amount', name_ru: 'Стоимость', field_type: 'number' },
    { name: 'service_comment', name_ru: 'Комментарий', field_type: 'text' },
  ],
  'Аренды': [
    { name: 'rent_objects', name_ru: 'Объекты', field_type: 'rent_objects' },
    { name: 'rent_monthly', name_ru: 'Арендная плата в месяц', field_type: 'number', _group: 'all', _readonly: true },
    { name: 'rent_comments', name_ru: 'Комментарии', field_type: 'multi_comments', _group: 'all' },
    { name: 'vat_rate', name_ru: 'НДС (%)', field_type: 'number', _group: 'all' },
    { name: 'external_rental', name_ru: 'Аренда внешняя', field_type: 'checkbox', _group: 'all' },
    { name: 'extra_services', name_ru: 'Доп. услуги', field_type: 'checkbox', _group: 'all' },
    { name: 'extra_services_desc', name_ru: 'Описание доп. услуг', field_type: 'text', _group: 'extra' },
    { name: 'extra_services_cost', name_ru: 'Стоимость в месяц', field_type: 'number', _group: 'extra' },
    { name: 'duration_type', name_ru: 'Срок действия', field_type: 'select', options: ['Дата', 'Текст'], _group: 'all' },
    { name: 'duration_date', name_ru: 'Дата окончания', field_type: 'date', _group: 'duration_date' },
    { name: 'duration_text', name_ru: 'Срок действия (текст)', field_type: 'text', _group: 'duration_text' },
    { name: 'transfer_equipment', name_ru: 'Передача оборудования', field_type: 'checkbox', _group: 'all' },
    { name: 'equipment_list', name_ru: 'Передаваемое оборудование', field_type: 'equipment_list', _group: 'transfer' },
  ]
};

// Cache of all contract/supplement entities for extracting used values
let _allContractEntities = [];
var _entityCache = {};

async function loadContractEntities() {
  const contracts = await api('/entities?type=contract');
  const supplements = await api('/entities?type=supplement');
  _allContractEntities = contracts.concat(supplements);
}

async function loadEntitiesByType(typeName, extraParams) {
  var url = '/entities?type=' + encodeURIComponent(typeName) + '&limit=200';
  if (extraParams) url += '&' + extraParams;
  var key = url;
  if (!_entityCache[key]) _entityCache[key] = await api(url);
  return _entityCache[key];
}

function clearEntityCache() { _entityCache = {}; }

function renderEntitySelect(id, entities, selectedId, selectedName, placeholder, onchangeAttr) {
  var selId = parseInt(selectedId) || 0;
  var fieldName = id.replace(/^f_/, '');
  var h = '<div style="display:flex;gap:6px;align-items:center">';
  h += '<select id="' + id + '" onchange="onEntitySelectChange(&quot;' + fieldName + '&quot;)" style="flex:1">';
  h += '<option value="">— ' + (placeholder || 'выберите') + ' —</option>';
  entities.forEach(function(e) {
    var sel = (e.id === selId) ? ' selected' : '';
    h += '<option value="' + e.id + '"' + sel + '>' + (e.icon || '') + ' ' + escapeHtml(e.name) + '</option>';
  });
  h += '<option value="__new__">Другое...</option>';
  h += '</select>';
  h += '<input id="' + id + '_custom" placeholder="Введите название" style="flex:1;display:none" ' +
    'data-field="' + fieldName + '" ' +
    'onkeydown="onEntityCustomKeydown(event,this)" ' +
    'onblur="onEntityCustomConfirm(this.dataset.field)">';
  h += '</div>';
  return h;
}

function renderLandPlotSelectorField(selectedId) {
  var lpOptions = '<option value="">— не указано —</option>';
  (_landPlots || []).forEach(function(lp) {
    var cn = (lp.properties || {}).cadastral_number;
    var label = cn ? cn + ' — ' + escapeHtml(lp.name) : escapeHtml(lp.name);
    var sel = (lp.id === selectedId) ? ' selected' : '';
    lpOptions += '<option value="' + lp.id + '"' + sel + '>' + label + '</option>';
  });
  var h = '<div class="form-group">';
  h += '<label>Находится на земельном участке</label>';
  h += '<div style="display:flex;gap:8px;align-items:center">';
  h += '<select id="f_land_plot_id" style="flex:1">' + lpOptions + '</select>';
  h += '<button type="button" class="btn btn-sm" onclick="quickCreateLandPlot()" style="white-space:nowrap">+ Новый участок</button>';
  h += '</div></div>';
  return h;
}

async function quickCreateLandPlot() {
  var cn = prompt('Введите кадастровый номер нового земельного участка:');
  if (!cn || !cn.trim()) return;
  var lpType = entityTypes.find(function(t) { return t.name === 'land_plot'; });
  if (!lpType) { alert('Тип ЗУ не найден'); return; }
  var name = 'ЗУ ' + cn.trim();
  try {
    var created = await api('/entities', { method: 'POST', body: JSON.stringify({
      entity_type_id: lpType.id, name: name,
      properties: { cadastral_number: cn.trim() }
    }) });
    _landPlots = await loadEntitiesByType('land_plot');
    var sel = document.getElementById('f_land_plot_id');
    if (sel) {
      sel.innerHTML = '<option value="">— не указано —</option>' + _landPlots.map(function(lp) {
        var c = (lp.properties || {}).cadastral_number;
        var label = c ? c + ' \u2014 ' + escapeHtml(lp.name) : escapeHtml(lp.name);
        var s = lp.id === created.id ? ' selected' : '';
        return '<option value="' + lp.id + '"' + s + '>' + label + '</option>';
      }).join('');
    }
  } catch(err) {
    if (err.status === 409) alert('Земельный участок с таким именем уже существует');
    else alert('Ошибка: ' + (err.message || String(err)));
  }
}

function renderRoEntitySelect(index, fieldName, entities, selectedId, placeholder) {
  var selId = parseInt(selectedId) || 0;
  var entityType = fieldName.replace('_id', ''); // building_id → building
  var h = '<select class="ro-field" data-idx="' + index + '" data-name="' + fieldName +
    '" onchange="onRoEntityChange(this,' + index + ',&quot;' + entityType + '&quot;)" style="width:100%">';
  h += '<option value="">— ' + (placeholder || 'выберите') + ' —</option>';
  entities.forEach(function(e) {
    var sel = (e.id === selId) ? ' selected' : '';
    h += '<option value="' + e.id + '"' + sel + '>' + (e.icon || '') + ' ' + escapeHtml(e.name) + '</option>';
  });
  h += '<option value="__new__">➕ Создать новый...</option>';
  h += '</select>';
  return h;
}

function onRoEntityChange(sel, index, entityType) {
  if (sel.value !== '__new__') return;
  var name = prompt('Название нового объекта (' + entityType + '):');
  if (!name || !name.trim()) { sel.value = ''; return; }
  var typeObj = entityTypes.find(function(t) { return t.name === entityType; });
  if (!typeObj) { alert('Тип не найден: ' + entityType); sel.value = ''; return; }
  api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: typeObj.id, name: name.trim(), properties: {} }) })
    .then(function(newEnt) {
      var opt = document.createElement('option');
      opt.value = newEnt.id;
      opt.textContent = (typeObj.icon || '') + ' ' + name.trim();
      opt.selected = true;
      sel.insertBefore(opt, sel.querySelector('option[value="__new__"]'));
      clearEntityCache();
      if (entityType === 'building') _buildings.push(newEnt);
      else if (entityType === 'room') _rooms.push(newEnt);
    }).catch(function(e) { alert('Ошибка: ' + e.message); sel.value = ''; });
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

var _eqListRowCounter = 0;

function _renderEqListItem(item, rowId) {
  var eqTypeObj = entityTypes ? entityTypes.find(function(t) { return t.name === 'equipment'; }) : null;
  var eqTypeId = eqTypeObj ? eqTypeObj.id : '';
  var h = '<div class="eq-list-item" data-row="' + rowId + '">';
  h += '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">';
  h += '<select class="eq-list-sel" style="flex:1"><option value="">— выберите из реестра —</option>';
  _equipment.forEach(function(e) {
    var sel = (e.id === parseInt(item.equipment_id)) ? ' selected' : '';
    h += '<option value="' + e.id + '"' + sel + '>' + escapeHtml(e.name) + '</option>';
  });
  h += '</select>';
  h += '<button type="button" class="btn btn-sm" style="font-size:11px;white-space:nowrap" data-row="' + rowId + '" data-eqtype="' + eqTypeId + '" onclick="eqListCreateShow(this)">+ Создать</button>';
  h += '<button type="button" class="btn btn-sm" style="color:var(--danger)" onclick="eqListRemove(this)">×</button>';
  h += '</div>';
  // Inline create panel (hidden)
  h += '<div class="eq-list-create-panel" id="eq_create_' + rowId + '" style="display:none;border:1px dashed var(--border);border-radius:6px;padding:10px;margin-bottom:8px;background:var(--bg-secondary)">';
  h += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">⚙️ Новое оборудование</div>';
  h += '<div class="form-group"><label>Название *</label><input class="eq-create-name" data-row="' + rowId + '" placeholder="Введите название" style="width:100%"></div>';
  h += '<div class="form-group"><label>Категория</label><select class="eq-create-cat" data-row="' + rowId + '" onchange="onEqCatChange(this)"><option value="">—</option>';
  getEquipmentCategories().forEach(function(c) { h += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
  h += '<option value="__custom__">Другое...</option></select>';
  h += '<input class="eq-create-cat-custom" data-row="' + rowId + '" placeholder="Введите категорию" style="display:none;margin-top:4px;width:100%"></div>';
  h += '<div class="form-group"><label>Корпус</label><select class="eq-create-building" data-row="' + rowId + '" style="width:100%"><option value="">—</option>';
  _buildings.forEach(function(b) { h += '<option value="' + b.id + '">' + escapeHtml(b.name) + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label>Собственник</label><select class="eq-create-owner" data-row="' + rowId + '" style="width:100%"><option value="">—</option>';
  _ownCompanies.forEach(function(c) { h += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'; });
  h += '</select></div>';
  h += '<div style="display:flex;gap:8px;margin-top:4px">';
  h += '<button type="button" class="btn btn-primary btn-sm" data-row="' + rowId + '" data-eqtype="' + eqTypeId + '" onclick="eqListCreateSubmit(this)">Создать и выбрать</button>';
  h += '<button type="button" class="btn btn-sm" data-row="' + rowId + '" onclick="eqListCreateShow(this)">Отмена</button>';
  h += '</div>';
  h += '</div>';
  h += '</div>';
  return h;
}

function renderEquipmentListField(items) {
  if (!Array.isArray(items) || items.length === 0) items = [{ equipment_id: '', equipment_name: '' }];
  _eqListRowCounter = items.length;
  var h = '<div id="f_equipment_list">';
  items.forEach(function(item, i) { h += _renderEqListItem(item, i); });
  h += '<button type="button" class="btn btn-sm eq-list-add-btn" style="margin-top:4px" onclick="eqListAdd()">+ Добавить оборудование</button>';
  h += '</div>';
  return h;
}

function eqListAdd() {
  var container = document.getElementById('f_equipment_list');
  if (!container) { console.error('eqListAdd: container not found'); return; }
  var rowId = _eqListRowCounter++;
  var div = document.createElement('div');
  div.innerHTML = _renderEqListItem({ equipment_id: '', equipment_name: '' }, rowId);
  var child = div.firstElementChild || div.firstChild;
  var addBtn = container.querySelector('.eq-list-add-btn');
  if (addBtn) container.insertBefore(child, addBtn);
  else container.appendChild(child);
}

function eqListRemove(btn) {
  var container = document.getElementById('f_equipment_list');
  if (!container) return;
  var item = btn.closest('.eq-list-item');
  var items = container.querySelectorAll('.eq-list-item');
  if (items.length <= 1) {
    var sel = item ? item.querySelector('select') : null;
    if (sel) sel.value = '';
    var panel = item ? item.querySelector('.eq-list-create-panel') : null;
    if (panel) panel.style.display = 'none';
    return;
  }
  if (item) item.remove();
}

function onEqCatChange(sel) {
  var parent = sel.parentElement;
  if (!parent) return;
  var custom = parent.querySelector('.eq-create-cat-custom, .ro-eq-cat-custom');
  if (custom) custom.style.display = sel.value === '__custom__' ? '' : 'none';
}

function eqListCreateShow(btn) {
  var rowId = btn.getAttribute('data-row');
  var panel = document.getElementById('eq_create_' + rowId);
  if (!panel) return;
  var isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    // Auto-fill building from contract form (select_or_custom field)
    var buildingSel = panel.querySelector('.eq-create-building');
    if (buildingSel && !buildingSel.value) {
      var fBuilding = document.getElementById('f_building');
      if (fBuilding && fBuilding.value && fBuilding.value !== '__custom__') {
        var matchB = _buildings.find(function(b) { return b.name.toLowerCase() === fBuilding.value.toLowerCase(); });
        if (matchB) buildingSel.value = String(matchB.id);
      }
    }
    // Auto-fill balance owner from contract's our_legal_entity_id
    var ownerSel = panel.querySelector('.eq-create-owner');
    if (ownerSel && !ownerSel.value) {
      var ownerId = _contractFormProps && _contractFormProps.our_legal_entity_id;
      if (ownerId) ownerSel.value = String(ownerId);
    }
  }
}

async function eqListCreateSubmit(btn) {
  var rowId = btn.getAttribute('data-row');
  var eqTypeId = parseInt(btn.getAttribute('data-eqtype'));
  var nameEl = document.querySelector('.eq-create-name[data-row="' + rowId + '"]');
  var catEl  = document.querySelector('.eq-create-cat[data-row="' + rowId + '"]');
  if (!nameEl || !nameEl.value.trim()) { alert('Введите название оборудования'); return; }
  var props = {};
  if (catEl && catEl.value) {
    if (catEl.value === '__custom__') {
      var catCustomEl = document.querySelector('.eq-create-cat-custom[data-row="' + rowId + '"]');
      if (catCustomEl && catCustomEl.value.trim()) props.equipment_category = catCustomEl.value.trim();
    } else {
      props.equipment_category = catEl.value;
    }
  }
  var buildingEl = document.querySelector('.eq-create-building[data-row="' + rowId + '"]');
  var ownerEl = document.querySelector('.eq-create-owner[data-row="' + rowId + '"]');
  var parentId = buildingEl && buildingEl.value ? parseInt(buildingEl.value) : null;
  // Validation: required fields
  var missing = [];
  if (!props.equipment_category) missing.push('Категория');
  if (!ownerEl || !ownerEl.value) missing.push('Собственник');
  if (!parentId) missing.push('Корпус');
  if (missing.length) { alert('Заполните обязательные поля: ' + missing.join(', ')); return; }
  if (ownerEl && ownerEl.value) {
    var ownerEnt = _ownCompanies.find(function(c) { return c.id === parseInt(ownerEl.value); });
    if (ownerEnt) { props.balance_owner_id = ownerEnt.id; props.balance_owner_name = ownerEnt.name; }
  }
  function selectNewEq(ent) {
    if (!_equipment.find(function(e) { return e.id === ent.id; })) _equipment.push(ent);
    var item = btn.closest('.eq-list-item');
    var sel = item ? item.querySelector('.eq-list-sel') : null;
    if (sel) {
      var opt = document.createElement('option');
      opt.value = ent.id; opt.textContent = ent.name; opt.selected = true;
      Array.from(sel.options).forEach(function(o) { o.selected = false; });
      sel.appendChild(opt);
    }
    var panel = document.getElementById('eq_create_' + rowId);
    if (panel) panel.style.display = 'none';
  }
  var body = { entity_type_id: eqTypeId, name: nameEl.value.trim(), properties: props };
  if (parentId) body.parent_id = parentId;
  try {
    var newEq = await api('/entities', { method: 'POST', body: JSON.stringify(body) });
    selectNewEq(newEq);
  } catch(err) {
    if (err.status === 409 && err.data && err.data.existing) {
      if (confirm('Оборудование с таким названием уже существует. Выбрать существующую запись?')) {
        selectNewEq(err.data.existing);
      }
    } else {
      alert('Ошибка: ' + (err.message || String(err)));
    }
  }
}

function getEqListValue() {
  var container = document.getElementById('f_equipment_list');
  if (!container) return [];
  var result = [];
  container.querySelectorAll('.eq-list-item').forEach(function(item) {
    var sel = item.querySelector('select');
    if (sel && sel.value) {
      var eqId = parseInt(sel.value);
      var eqEntity = _equipment.find(function(e) { return e.id === eqId; });
      result.push({ equipment_id: eqId, equipment_name: eqEntity ? eqEntity.name : '' });
    }
  });
  return result;
}

// ============ ACT ITEMS ============

var _actItemCounter = 0;
var _actEquipmentList = null;  // filtered to contract's equipment when creating act

function _renderActItem(item, rowId, bgIdx) {
  var eqList = _actEquipmentList || _equipment;
  var _bgIdx = (bgIdx !== undefined) ? bgIdx : rowId;
  var altBg = (_bgIdx % 2 === 0) ? 'var(--bg-primary)' : 'rgba(99,102,241,0.05)';
  var rowBg = item.broken ? 'rgba(239,68,68,.08)' : altBg;
  var rowBorder = item.broken ? '#dc2626' : 'var(--border)';
  var h = '<div class="act-item-row" data-row="' + rowId + '" style="margin-bottom:4px;padding:10px;border:1px solid ' + rowBorder + ';border-radius:6px;background:' + rowBg + '">';
  // Row 1: equipment + amount + delete
  h += '<div style="display:grid;grid-template-columns:2fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px">';
  h += '<div><label style="font-size:11px;color:var(--text-muted)">\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 *</label>';
  h += '<select class="act-item-eq" style="width:100%;margin-top:2px"><option value="">— выберите —</option>';
  eqList.forEach(function(e) {
    var sel = (e.id === parseInt(item.equipment_id)) ? ' selected' : '';
    h += '<option value="' + e.id + '"' + sel + '>' + escapeHtml(e.name) + '</option>';
  });
  h += '</select></div>';
  h += '<div><label style="font-size:11px;color:var(--text-muted)">\u0421\u0443\u043c\u043c\u0430, \u20bd</label>';
  h += '<input type="number" class="act-item-amount" value="' + (item.amount || '') + '" placeholder="0" style="width:100%;margin-top:2px" oninput="recalcActTotal()"></div>';
  h += '<button type="button" class="btn btn-sm" style="color:var(--danger)" onclick="actItemRemove(this)">\xd7</button>';
  h += '</div>';
  // Row 2: description + comment stacked (full width, both-resizable)
  h += '<div style="display:flex;flex-direction:column;gap:6px">';
  h += '<div><label style="font-size:11px;color:var(--text-muted)">\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0440\u0430\u0431\u043e\u0442</label>';
  h += '<textarea class="act-item-desc" placeholder="\u0447\u0442\u043e \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e..." style="width:100%;margin-top:2px;resize:both;min-height:56px;font-size:12px;box-sizing:border-box">' + escapeHtml(item.description || '') + '</textarea></div>';
  var brokenChecked = item.broken ? ' checked' : '';
  var brokenBorder = item.broken ? 'var(--danger)' : 'var(--border)';
  var brokenBg = item.broken ? 'rgba(239,68,68,.08)' : 'transparent';
  h += '<div><label style="font-size:11px;color:var(--text-muted)">\u0420\u0430\u0431\u043e\u0442\u044b/\u0437\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u044f</label>';
  h += '<div style="display:flex;gap:6px;align-items:flex-end;margin-top:2px">';
  h += '<textarea class="act-item-comment" placeholder="\u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435, \u0437\u0430\u043c\u0435\u0447\u0430\u043d\u0438\u044f..." style="flex:1;resize:both;min-height:56px;font-size:12px;box-sizing:border-box">' + escapeHtml(item.comment || '') + '</textarea>';
  h += '<label class="act-item-broken-label" style="display:inline-flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-size:11px;padding:4px 7px;border-radius:5px;border:1px solid ' + brokenBorder + ';background:' + brokenBg + ';transition:all .15s;color:' + (item.broken ? 'var(--danger)' : 'var(--text-muted)') + ';text-align:center;min-width:70px;white-space:nowrap;flex-shrink:0">';
  h += '<input type="checkbox" class="act-item-broken"' + brokenChecked + ' onchange="_onActItemBrokenChange(this)">';
  h += '\u26a0\ufe0f \u041d\u0435\u0440\u0430\u0431\u043e\u0447\u0438\u0439/<br>\u0430\u0432\u0430\u0440\u0438\u0439\u043d\u044b\u0439</label>';
  h += '</div></div>';
  h += '</div>';
  return h;
}

function renderActItemsField(items) {
  if (!Array.isArray(items) || items.length === 0) items = [{}];
  _actItemCounter = items.length;
  var h = '<div id="f_act_items" style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:8px;margin-top:4px">';
  items.forEach(function(item, i) { h += _renderActItem(item, i, i); });
  h += '<button type="button" class="btn btn-sm act-item-add-btn" style="margin-top:4px" onclick="actItemAdd()">+ Добавить оборудование</button>';
  h += '</div>';
  return h;
}

function actItemAdd() {
  var container = document.getElementById('f_act_items');
  if (!container) { console.error('actItemAdd: container not found'); return; }
  var rowId = _actItemCounter++;
  var bgIdx = container.querySelectorAll('.act-item-row').length;
  var div = document.createElement('div');
  div.innerHTML = _renderActItem({}, rowId, bgIdx);
  var child = div.firstElementChild || div.firstChild;
  var addBtn = container.querySelector('.act-item-add-btn');
  if (addBtn) container.insertBefore(child, addBtn);
  else container.appendChild(child);
}

function _onActItemBrokenChange(cb) {
  var label = cb.closest('.act-item-broken-label');
  var row = cb.closest('.act-item-row');
  if (cb.checked) {
    if (label) { label.style.borderColor = 'var(--danger)'; label.style.background = 'rgba(239,68,68,.15)'; label.style.color = 'var(--danger)'; }
    if (row) { row.style.background = 'rgba(239,68,68,.08)'; row.style.borderColor = '#dc2626'; }
  } else {
    if (label) { label.style.borderColor = 'var(--border)'; label.style.background = 'transparent'; label.style.color = 'var(--text-muted)'; }
    if (row) { row.style.background = ''; row.style.borderColor = 'var(--border)'; }
  }
}

function actItemRemove(btn) {
  var container = document.getElementById('f_act_items');
  if (!container) return;
  var rows = container.querySelectorAll('.act-item-row');
  if (rows.length <= 1) {
    var row0 = btn.closest('.act-item-row');
    if (row0) { row0.querySelector('.act-item-eq').value = ''; row0.querySelector('.act-item-amount').value = ''; row0.querySelector('.act-item-desc').value = ''; var cmt = row0.querySelector('.act-item-comment'); if (cmt) cmt.value = ''; var brk = row0.querySelector('.act-item-broken'); if (brk) { brk.checked = false; _onActItemBrokenChange(brk); } }
    recalcActTotal(); return;
  }
  var row = btn.closest('.act-item-row');
  if (row) { row.remove(); recalcActTotal(); }
}

function recalcActTotal() {
  var total = 0;
  document.querySelectorAll('.act-item-amount').forEach(function(el) { total += parseFloat(el.value) || 0; });
  var totalEl = document.getElementById('f_total_amount');
  if (totalEl) totalEl.value = total;
}

function getActItemsValue() {
  var container = document.getElementById('f_act_items');
  if (!container) return [];
  var result = [];
  container.querySelectorAll('.act-item-row').forEach(function(row) {
    var eqSel = row.querySelector('.act-item-eq');
    var amtEl = row.querySelector('.act-item-amount');
    var descEl = row.querySelector('.act-item-desc');
    if (!eqSel || !eqSel.value) return;
    var eqId = parseInt(eqSel.value);
    var eqEnt = _equipment.find(function(e) { return e.id === eqId; });
    var cmtEl = row.querySelector('.act-item-comment');
    var brkEl = row.querySelector('.act-item-broken');
    result.push({ equipment_id: eqId, equipment_name: eqEnt ? eqEnt.name : '', amount: parseFloat(amtEl ? amtEl.value : 0) || 0, description: descEl ? descEl.value.trim() : '', comment: cmtEl ? cmtEl.value.trim() : '', broken: brkEl ? brkEl.checked : false });
  });
  return result;
}

function renderFieldInput(f, value) {
  const val = value || '';
  const id = 'f_' + f.name;
  if (f.field_type === 'act_items') {
    var actItemsVal = [];
    try { if (typeof val === 'string' && val) actItemsVal = JSON.parse(val); else if (Array.isArray(val)) actItemsVal = val; } catch(e) {}
    return renderActItemsField(actItemsVal);
  } else if (f.field_type === 'equipment_list') {
    var eqItems = [];
    try { if (typeof val === 'string' && val) eqItems = JSON.parse(val); else if (Array.isArray(val)) eqItems = val; } catch(e) {}
    return renderEquipmentListField(eqItems);
  } else if (f.field_type === 'rent_objects') {
    return '';
  } else if (f.field_type === 'multi_comments') {
    return renderCommentsBlock(val);
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
  } else if (f.field_type === 'textarea') {
    return '<textarea id="' + id + '" style="width:100%;resize:both;min-height:72px;box-sizing:border-box">' + escapeHtml(String(val)) + '</textarea>';
  } else {
    return '<input id="' + id + '" value="' + escapeHtml(String(val)) + '">';
  }
}

function toggleCustomInput(sel) {
  const customInput = document.getElementById(sel.id + '_custom');
  if (customInput) customInput.style.display = sel.value === '__custom__' ? '' : 'none';
}

function getFieldValue(f) {
  if (f.field_type === 'act_items') {
    var actItems = getActItemsValue();
    var total = actItems.reduce(function(s, i) { return s + (i.amount || 0); }, 0);
    var totalEl = document.getElementById('f_total_amount');
    if (totalEl) totalEl.value = total;
    return actItems.length > 0 ? JSON.stringify(actItems) : null;
  }
  if (f.field_type === 'equipment_list') {
    var eqItems = getEqListValue();
    return eqItems.length > 0 ? JSON.stringify(eqItems) : null;
  }
  if (f.field_type === 'advances') {
    const adv = collectAdvances();
    return adv.length > 0 ? JSON.stringify(adv) : null;
  }
  if (f.field_type === 'rent_objects') {
    var objs = collectAllRentObjects();
    return objs.length > 0 ? JSON.stringify(objs) : null;
  }
  if (f.field_type === 'multi_comments') {
    var cmts = collectComments();
    return cmts.length > 0 ? JSON.stringify(cmts) : null;
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

  if (contractType === 'Аренды' || contractType === 'Субаренды') {
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
var OBJECT_TYPES = ['Производство класс В', 'Производство класс С', 'Офис', 'Склад', 'ЗУ', 'Вендомат'];
var ROOM_TYPES = ['Производственное', 'Офисное', 'Складское', 'Административно-бытовое', 'Техническое'];
var EQUIPMENT_CATEGORIES = ['Электрооборудование','Газовое','Тепловое','Крановое хозяйство','Машины и механизмы','ИК оборудование'];

// Returns base categories + any custom ones already saved in the registry
function getEquipmentCategories() {
  var extra = [];
  _equipment.forEach(function(e) {
    var cat = (e.properties || {}).equipment_category;
    if (cat && EQUIPMENT_CATEGORIES.indexOf(cat) < 0 && extra.indexOf(cat) < 0) extra.push(cat);
  });
  return EQUIPMENT_CATEGORIES.concat(extra.sort());
}

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
  var vatVal = props.vat_rate || '22';
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

  // Comments
  html += '<div class="form-group"><label>Комментарии</label>' + renderCommentsBlock(props.rent_comments) + '</div>';

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

  // External rental checkbox (contract-level, not per object)
  var externalRental = props.external_rental === 'true' || props.external_rental === true;
  html += '<div class="form-group" style="margin-top:8px"><label style="display:flex;align-items:center;gap:8px;cursor:pointer">' +
    '<input type="checkbox" id="f_external_rental"' + (externalRental ? ' checked' : '') + '> Аренда внешняя</label></div>';

  // Transfer equipment section
  var hasTransfer = props.transfer_equipment === 'true' || props.transfer_equipment === true;
  html += '<div class="form-group" style="margin-top:8px"><label style="display:flex;align-items:center;gap:8px">' +
    '<input type="checkbox" id="f_transfer_equipment"' + (hasTransfer ? ' checked' : '') +
    ' onchange="onRentFieldChange()"> Передача оборудования по договору</label></div>';
  if (hasTransfer) {
    var transferItems = [];
    try {
      if (typeof props.equipment_list === 'string' && props.equipment_list) transferItems = JSON.parse(props.equipment_list);
      else if (Array.isArray(props.equipment_list)) transferItems = props.equipment_list;
    } catch(ex) {}
    html += '<div class="form-group"><label>Передаваемое оборудование</label>' + renderEquipmentListField(transferItems) + '</div>';
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

// ============ MULTI COMMENTS ============
var _commentCounter = 0;

function renderCommentsBlock(existingComments) {
  var comments = [];
  try {
    if (typeof existingComments === 'string' && existingComments) comments = JSON.parse(existingComments);
    else if (Array.isArray(existingComments)) comments = existingComments;
  } catch(e) {}
  _commentCounter = comments.length;
  var h = '<div id="comments_container">';
  comments.forEach(function(c, i) { h += renderCommentRow(i, c); });
  h += '</div>';
  h += '<button type="button" class="btn btn-sm" onclick="addCommentRow()" style="margin-top:4px">+ Добавить комментарий</button>';
  return h;
}

function renderCommentRow(index, text) {
  return '<div class="comment-row" id="comment_row_' + index + '" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">' +
    '<input class="comment-text" value="' + escapeHtml(text || '') + '" placeholder="Комментарий" style="flex:1">' +
    '<button type="button" class="btn btn-sm btn-danger" onclick="removeCommentRow(' + index + ')" style="padding:4px 8px;font-size:11px">✕</button>' +
    '</div>';
}

function addCommentRow() {
  var container = document.getElementById('comments_container');
  if (!container) return;
  var div = document.createElement('div');
  div.innerHTML = renderCommentRow(_commentCounter, '');
  container.appendChild(div.firstChild);
  _commentCounter++;
}

function removeCommentRow(index) {
  var row = document.getElementById('comment_row_' + index);
  if (row) row.remove();
}

function collectComments() {
  var container = document.getElementById('comments_container');
  if (!container) return [];
  var result = [];
  container.querySelectorAll('.comment-text').forEach(function(el) {
    if (el.value.trim()) result.push(el.value.trim());
  });
  return result;
}

function _roCalcFields(index, obj, calcMode) {
  var h = '';
  h += '<div class="form-group"><label>Расчёт</label><select class="ro-field" data-idx="' + index + '" data-name="calc_mode" onchange="onRentObjectCalcChange(' + index + ')">';
  h += '<option value="area_rate"' + (calcMode === 'area_rate' ? ' selected' : '') + '>Площадь × Ставка</option>';
  h += '<option value="fixed"' + (calcMode === 'fixed' ? ' selected' : '') + '>Фиксированная аренда</option></select></div>';
  if (calcMode === 'area_rate') {
    h += '<div class="form-group"><label>Площадь (м²)</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="area" value="' + (obj.area || '') + '" oninput="recalcRentMonthly()"></div>';
    h += '<div class="form-group"><label>Арендная ставка (руб/м²/мес)</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="rent_rate" value="' + (obj.rent_rate || '') + '" oninput="recalcRentMonthly()"></div>';
    var objTotal = (parseFloat(obj.area) || 0) * (parseFloat(obj.rent_rate) || 0);
    if (objTotal > 0) h += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">= ' + _fmtNum(objTotal) + ' руб.</div>';
  } else {
    h += '<div class="form-group"><label>Арендная плата</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="fixed_rent" value="' + (obj.fixed_rent || '') + '" oninput="recalcRentMonthly()"></div>';
  }
  h += '<div class="form-group"><label>Комментарий</label><input class="ro-field" data-idx="' + index + '" data-name="comment" value="' + escapeHtml(obj.comment || '') + '"></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  h += '<div class="form-group"><label style="font-size:12px">Ставка чистая, руб/м²/мес</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="net_rate" value="' + escapeHtml(obj.net_rate || '') + '" placeholder="0"></div>';
  h += '<div class="form-group"><label style="font-size:12px">КУ в платеже/ставке</label><input class="ro-field" data-idx="' + index + '" data-name="utility_rate" value="' + escapeHtml(obj.utility_rate || '') + '" placeholder="опишите или сумма"></div>';
  h += '</div>';
  return h;
}

function _roRoomCreateMiniForm(index) {
  var h = '<div id="ro_room_create_' + index + '" style="display:none;border:1px dashed var(--border);border-radius:6px;padding:10px;margin-bottom:8px;background:var(--bg-secondary)">';
  h += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">🚪 Новое помещение</div>';
  h += '<div class="form-group"><label>Тип помещения</label>';
  h += '<select class="ro-room-type" data-idx="' + index + '" style="width:100%" onchange="onRoRoomTypeChange(this,' + index + ')"><option value="">—</option>';
  ROOM_TYPES.forEach(function(rt) { h += '<option value="' + escapeHtml(rt) + '">' + escapeHtml(rt) + '</option>'; });
  h += '<option value="__custom__">Другое...</option></select>';
  h += '<input class="ro-room-type-custom" data-idx="' + index + '" placeholder="Введите тип" style="display:none;margin-top:4px;width:100%"></div>';
  h += '<div class="form-group"><label>Корпус</label><select class="ro-room-building" data-idx="' + index + '" style="width:100%"><option value="">— не указан —</option>';
  _buildings.forEach(function(b) { h += '<option value="' + b.id + '">' + escapeHtml(b.name) + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label>Описание помещения</label><input class="ro-room-desc" data-idx="' + index + '" style="width:100%"></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  h += '<div class="form-group"><label>Площадь, м²</label><input type="number" class="ro-room-area" data-idx="' + index + '" style="width:100%"></div>';
  h += '<div class="form-group"><label>Этаж</label><input class="ro-room-floor" data-idx="' + index + '" style="width:100%"></div>';
  h += '</div>';
  h += '<div style="display:flex;gap:8px;margin-top:8px">';
  h += '<button type="button" class="btn btn-primary btn-sm" onclick="submitRentRoomCreate(this,' + index + ')">Создать и выбрать</button>';
  h += '<button type="button" class="btn btn-sm" onclick="toggleRentRoomCreate(this,' + index + ')">Отмена</button>';
  h += '</div></div>';
  return h;
}

function _roEqCreateMiniForm(index, eqTypeId) {
  var h = '<div id="ro_eq_create_' + index + '" style="display:none;border:1px dashed var(--border);border-radius:6px;padding:10px;margin-bottom:8px;background:var(--bg-secondary)">';
  h += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">⚙️ Новая единица оборудования</div>';
  h += '<div class="form-group"><label>Название *</label><input class="ro-eq-name" data-idx="' + index + '" placeholder="Название оборудования" style="width:100%"></div>';
  h += '<div class="form-group"><label>Категория</label><select class="ro-eq-cat" data-idx="' + index + '" onchange="onEqCatChange(this)"><option value="">—</option>';
  getEquipmentCategories().forEach(function(c) { h += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
  h += '<option value="__custom__">Другое...</option></select>';
  h += '<input class="ro-eq-cat-custom" data-idx="' + index + '" placeholder="Введите категорию" style="display:none;margin-top:4px;width:100%"></div>';
  h += '<div class="form-group"><label>Собственник</label><select class="ro-eq-owner" data-idx="' + index + '" style="width:100%"><option value="">—</option>';
  _ownCompanies.forEach(function(c) { h += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'; });
  h += '</select></div>';
  h += '<div style="display:flex;gap:8px">';
  h += '<button type="button" class="btn btn-primary btn-sm" data-idx="' + index + '" data-eqtype="' + eqTypeId + '" onclick="submitRentEquipmentCreate(this)">Создать и выбрать</button>';
  h += '<button type="button" class="btn btn-sm" data-idx="' + index + '" onclick="toggleRentEquipmentCreate(this)">Отмена</button>';
  h += '</div></div>';
  return h;
}

function renderRentObjectBlock(index, obj) {
  obj = obj || {};
  // Resolve object_type: prefer new field, fallback from old item_type
  var objectType = obj.object_type || '';
  if (!objectType && obj.item_type) {
    if (obj.item_type === 'land_plot') objectType = 'ЗУ';
    else if (obj.item_type === 'equipment') objectType = 'Оборудование';
  }
  // If objectType is not in OBJECT_TYPES, add it temporarily for display
  var typeOptions = OBJECT_TYPES.slice();
  if (objectType && typeOptions.indexOf(objectType) < 0) typeOptions.push(objectType);
  var calcMode = obj.calc_mode || 'area_rate';

  var h = '<div class="rent-object-block" id="rent_obj_' + index + '" style="border-left:3px solid var(--accent);padding-left:12px;margin-bottom:12px;position:relative">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<strong>Помещение ' + (index + 1) + '</strong>';
  h += '<button type="button" class="btn btn-sm btn-danger" onclick="removeRentObject(' + index + ')" style="padding:2px 8px;font-size:11px">✕</button>';
  h += '</div>';

  // Тип помещения — open select
  h += '<div class="form-group"><label>Тип помещения</label>';
  h += '<select class="ro-field" data-idx="' + index + '" data-name="object_type">';
  h += '<option value="">—</option>';
  typeOptions.forEach(function(t) {
    h += '<option value="' + escapeHtml(t) + '"' + (objectType === t ? ' selected' : '') + '>' + escapeHtml(t) + '</option>';
  });
  h += '</select>';
  h += '<button type="button" class="btn btn-sm" style="font-size:11px;margin-top:4px" onclick="addRentObjectType(' + index + ')">+ Добавить тип помещения</button>';
  h += '</div>';

  // Корпус
  h += '<div class="form-group"><label>Корпус</label>' + renderRoEntitySelect(index, 'building_id', _buildings, obj.building_id, 'выберите корпус') +
    '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="building" value="' + escapeHtml(obj.building || '') + '"></div>';

  // Помещение
  h += '<div class="form-group"><label>Помещение</label>';
  h += renderRoRoomSelect(index, obj.room_id);
  h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="room" value="' + escapeHtml(obj.room || '') + '">';
  h += '<button type="button" class="btn btn-sm" style="font-size:11px;margin-top:4px" onclick="toggleRentRoomCreate(this,' + index + ')">+ Создать помещение</button>';
  h += '</div>';
  h += _roRoomCreateMiniForm(index);

  // Calc fields
  h += _roCalcFields(index, obj, calcMode);

  h += '</div>';
  return h;
}

function addRentObjectType(index) {
  var name = prompt('Введите тип помещения:');
  if (!name || !name.trim()) return;
  name = name.trim();
  if (OBJECT_TYPES.indexOf(name) < 0) OBJECT_TYPES.push(name);
  var sel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="object_type"]');
  if (sel) {
    var existing = Array.from(sel.options).find(function(o) { return o.value === name; });
    if (!existing) { var opt = document.createElement('option'); opt.value = name; opt.text = name; sel.appendChild(opt); }
    sel.value = name;
  }
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

function onRentItemTypeChange(index) {
  var obj = collectRentObjectData(index);
  var block = document.getElementById('rent_obj_' + index);
  if (block) {
    var div = document.createElement('div');
    div.innerHTML = renderRentObjectBlock(index, obj);
    block.replaceWith(div.firstChild);
    recalcRentMonthly();
  }
}

// kept for backward compat (old __custom__ path)
function onRentObjectTypeChange(index) {
  var sel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="object_type"]');
  if (!sel) return;
  var obj = collectRentObjectData(index);
  if (sel.value === '__custom__') {
    obj._showCustomInput = true;
    obj.object_type = obj.object_type_custom || '';
  } else {
    obj.object_type = sel.value;
    delete obj._showCustomInput;
  }
  var block = document.getElementById('rent_obj_' + index);
  if (block) {
    var div = document.createElement('div');
    div.innerHTML = renderRentObjectBlock(index, obj);
    block.replaceWith(div.firstChild);
    if (obj._showCustomInput) {
      var customIn = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="object_type_custom"]');
      if (customIn) customIn.focus();
    }
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

function toggleRentEquipmentCreate(el) {
  var idx = el.getAttribute('data-idx');
  var panel = document.getElementById('ro_eq_create_' + idx);
  if (!panel) return;
  var isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    // Auto-fill balance owner from contract's our_legal_entity_id
    var ownerSel = panel.querySelector('.ro-eq-owner');
    if (ownerSel && !ownerSel.value) {
      var ownerId = _contractFormProps && _contractFormProps.our_legal_entity_id;
      if (ownerId) ownerSel.value = String(ownerId);
    }
  }
}

async function submitRentEquipmentCreate(el) {
  var idx = el.getAttribute('data-idx');
  var eqTypeId = parseInt(el.getAttribute('data-eqtype'));
  var nameEl = document.querySelector('.ro-eq-name[data-idx="' + idx + '"]');
  var catEl  = document.querySelector('.ro-eq-cat[data-idx="' + idx + '"]');
  if (!nameEl || !nameEl.value.trim()) { alert('Введите название оборудования'); return; }
  var props = {};
  if (catEl && catEl.value) {
    if (catEl.value === '__custom__') {
      var catCustomEl = document.querySelector('.ro-eq-cat-custom[data-idx="' + idx + '"]');
      if (catCustomEl && catCustomEl.value.trim()) props.equipment_category = catCustomEl.value.trim();
    } else {
      props.equipment_category = catEl.value;
    }
  }
  var ownerElR = document.querySelector('.ro-eq-owner[data-idx="' + idx + '"]');
  var ownerEntR = null;
  if (ownerElR && ownerElR.value) {
    ownerEntR = _ownCompanies.find(function(c) { return c.id === parseInt(ownerElR.value); });
    if (ownerEntR) { props.balance_owner_id = ownerEntR.id; props.balance_owner_name = ownerEntR.name; }
  }
  // Use rent object's building as parent_id for the new equipment entity
  var buildingIdElR = document.querySelector('.ro-field[data-idx="' + idx + '"][data-name="building_id"]');
  var parentIdR = buildingIdElR && buildingIdElR.value ? parseInt(buildingIdElR.value) : null;
  // Validation: required fields
  var missingR = [];
  if (!props.equipment_category) missingR.push('Категория');
  if (!ownerEntR) missingR.push('Собственник');
  if (!parentIdR) missingR.push('Корпус');
  if (missingR.length) { alert('Заполните обязательные поля: ' + missingR.join(', ')); return; }
  function selectEquipment(ent) {
    if (!_equipment.find(function(e) { return e.id === ent.id; })) _equipment.push(ent);
    var sel = document.querySelector('.ro-field[data-idx="' + idx + '"][data-name="equipment_id"]');
    if (sel) {
      var opt = document.createElement('option');
      opt.value = ent.id; opt.textContent = ent.name; opt.selected = true;
      // deselect previous
      Array.from(sel.options).forEach(function(o) { o.selected = false; });
      sel.appendChild(opt);
    }
    var nameHidden = document.querySelector('.ro-field[data-idx="' + idx + '"][data-name="equipment_name"]');
    if (nameHidden) nameHidden.value = ent.name;
    var panel = document.getElementById('ro_eq_create_' + idx);
    if (panel) panel.style.display = 'none';
  }
  try {
    var bodyR = { entity_type_id: eqTypeId, name: nameEl.value.trim(), properties: props };
    if (parentIdR) bodyR.parent_id = parentIdR;
    var newEq = await api('/entities', { method: 'POST', body: JSON.stringify(bodyR) });
    selectEquipment(newEq);
  } catch(err) {
    if (err.status === 409 && err.data && err.data.existing) {
      if (confirm('Оборудование с таким названием уже существует. Выбрать существующую запись?')) {
        selectEquipment(err.data.existing);
      }
    } else {
      alert('Ошибка: ' + (err.message || String(err)));
    }
  }
}

// ─── Room select (no __new__ — uses dedicated create button) ───
function renderRoRoomSelect(index, selectedId) {
  var selId = parseInt(selectedId) || 0;
  var h = '<select class="ro-field" data-idx="' + index + '" data-name="room_id" style="width:100%">';
  h += '<option value="">— выберите помещение —</option>';
  _rooms.forEach(function(e) {
    var sel = (e.id === selId) ? ' selected' : '';
    h += '<option value="' + e.id + '"' + sel + '>🚪 ' + escapeHtml(e.name) + '</option>';
  });
  h += '</select>';
  return h;
}

function onRoRoomTypeChange(sel, index) {
  var customEl = document.querySelector('.ro-room-type-custom[data-idx="' + index + '"]');
  if (customEl) customEl.style.display = (sel.value === '__custom__') ? '' : 'none';
}

function toggleRentRoomCreate(btn, index) {
  var block = document.getElementById('ro_room_create_' + index);
  if (!block) return;
  var isOpen = block.style.display !== 'none';
  block.style.display = isOpen ? 'none' : '';
  if (!isOpen) {
    // Pre-fill building from the rent object's currently selected building
    var bldSel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="building_id"]');
    var roomBldSel = block.querySelector('.ro-room-building');
    if (bldSel && roomBldSel && bldSel.value) roomBldSel.value = bldSel.value;
  }
}

async function submitRentRoomCreate(btn, index) {
  var block = document.getElementById('ro_room_create_' + index);
  if (!block) return;
  var typeEl = block.querySelector('.ro-room-type');
  var typeCustomEl = block.querySelector('.ro-room-type-custom');
  var roomType = (typeEl && typeEl.value === '__custom__') ? (typeCustomEl ? typeCustomEl.value.trim() : '') : (typeEl ? typeEl.value : '');
  var bldEl = block.querySelector('.ro-room-building');
  var descEl = block.querySelector('.ro-room-desc');
  var areaEl = block.querySelector('.ro-room-area');
  var floorEl = block.querySelector('.ro-room-floor');
  var buildingId = bldEl ? (parseInt(bldEl.value) || null) : null;
  var building = buildingId ? (_buildings.find(function(b) { return b.id === buildingId; }) || {}).name || '' : '';
  // Build a default name
  var parts = [];
  if (roomType) parts.push(roomType);
  if (floorEl && floorEl.value.trim()) parts.push('\u044d\u0442.' + floorEl.value.trim()); // эт.N
  if (building) parts.push(building);
  var defaultName = parts.join(', ') || '\u041d\u043e\u0432\u043e\u0435 \u043f\u043e\u043c\u0435\u0449\u0435\u043d\u0438\u0435';
  var roomName = prompt('\u041d\u0430\u0437\u0432\u0430\u043d\u0438\u0435 \u043f\u043e\u043c\u0435\u0449\u0435\u043d\u0438\u044f:', defaultName);
  if (!roomName || !roomName.trim()) return;
  var roomTypeObj = entityTypes.find(function(t) { return t.name === 'room'; });
  if (!roomTypeObj) return alert('\u0422\u0438\u043f \u041f\u043e\u043c\u0435\u0449\u0435\u043d\u0438\u0435 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d');
  var props = {};
  if (roomType) props.room_type = roomType;
  if (descEl && descEl.value.trim()) props.description = descEl.value.trim();
  if (areaEl && areaEl.value) props.area = parseFloat(areaEl.value) || 0;
  if (floorEl && floorEl.value.trim()) props.floor = floorEl.value.trim();
  if (building) props.building = building;
  btn.disabled = true; btn.textContent = '...';
  try {
    var body = { entity_type_id: roomTypeObj.id, name: roomName.trim(), properties: props };
    if (buildingId) body.parent_id = buildingId;
    var newRoom = await api('/entities', { method: 'POST', body: JSON.stringify(body) });
    _rooms.push(newRoom); clearEntityCache();
    var roomSel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="room_id"]');
    if (roomSel) {
      var opt = document.createElement('option');
      opt.value = newRoom.id; opt.textContent = '\ud83d\udeaa ' + roomName.trim(); opt.selected = true;
      Array.from(roomSel.options).forEach(function(o) { o.selected = false; });
      roomSel.appendChild(opt);
    }
    block.style.display = 'none';
  } catch(e) { alert('\u041e\u0448\u0438\u0431\u043a\u0430: ' + (e.message || e)); }
  finally { btn.disabled = false; btn.textContent = '\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0438 \u0432\u044b\u0431\u0440\u0430\u0442\u044c'; }
}

function onObjectTypeCustomBlur(input, index) {
  var val = input.value.trim();
  if (!val) return;
  if (OBJECT_TYPES.indexOf(val) < 0) OBJECT_TYPES.push(val);
  // Add option to all object_type selects
  document.querySelectorAll('.ro-field[data-name="object_type"]').forEach(function(sel) {
    if (!Array.from(sel.options).some(function(o) { return o.value === val; })) {
      var customOpt = sel.querySelector('option[value="__custom__"]');
      var newOpt = document.createElement('option');
      newOpt.value = val; newOpt.textContent = val;
      if (customOpt) sel.insertBefore(newOpt, customOpt); else sel.appendChild(newOpt);
    }
    if (sel.getAttribute('data-idx') === String(index)) sel.value = val;
  });
  // Re-render the block with the new selected type
  onRentObjectTypeChange(index);
}

// ─────────────────────────────────────────────

function collectRentObjectData(index) {
  var obj = {};
  document.querySelectorAll('.ro-field[data-idx="' + index + '"]').forEach(function(el) {
    var name = el.getAttribute('data-name');
    if (!name) return;
    if (el.tagName === 'SELECT' && el.value === '__new__') return;
    if (el.type === 'checkbox') { obj[name] = el.checked ? 'true' : 'false'; return; }
    obj[name] = el.value;
  });
  // Resolve entity names from IDs
  if (obj.building_id) {
    var b = _buildings.find(function(e) { return e.id === parseInt(obj.building_id); });
    if (b) obj.building = b.name;
  }
  if (obj.room_id) {
    var r = _rooms.find(function(e) { return e.id === parseInt(obj.room_id); });
    if (r) obj.room = r.name;
  }
  if (obj.equipment_id) {
    var eq = _equipment.find(function(e) { return e.id === parseInt(obj.equipment_id); });
    if (eq) obj.equipment_name = eq.name;
  }
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

  // Collect rent objects and comments
  currentProps.rent_objects = collectAllRentObjects();
  currentProps.rent_comments = collectComments();

  // Collect other fields
  allFields.forEach(function(f) {
    if (f.name === 'rent_objects' || f.name === 'rent_comments') return;
    if (f.field_type === 'equipment_list') {
      // Preserve current equipment list before re-render
      var eqItems = getEqListValue();
      currentProps[f.name] = eqItems.length > 0 ? JSON.stringify(eqItems) : '';
      return;
    }
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
  var vat = parseFloat(vatEl ? vatEl.value : 22) || 0;
  if (rent > 0 && vat > 0) {
    var vatAmount = rent * vat / (100 + vat);
    display.textContent = 'в т.ч. НДС (' + vat + '%) = ' + _fmtNum(vatAmount) + ' руб.';
  } else {
    display.textContent = '';
  }
}

function collectEntityIds(properties) {
  // Map select element → id field + name field
  var mappings = [
    { selectId: 'f_our_legal_entity', idProp: 'our_legal_entity_id', nameProp: 'our_legal_entity', list: _ownCompanies },
    { selectId: 'f_contractor_name', idProp: 'contractor_id', nameProp: 'contractor_name', list: _allCompanies },
    { selectId: 'f_subtenant_name', idProp: 'subtenant_id', nameProp: 'subtenant_name', list: _allCompanies },
  ];
  mappings.forEach(function(m) {
    var el = document.getElementById(m.selectId);
    if (!el || !el.value || el.value === '__new__') return;
    var entId = parseInt(el.value);
    if (entId) {
      properties[m.idProp] = entId;
      var ent = m.list.find(function(e) { return e.id === entId; });
      if (ent) properties[m.nameProp] = ent.name;
    }
  });
}

function collectEquipmentIds(properties) {
  var el = document.getElementById('f_balance_owner');
  if (!el || !el.value || el.value === '__new__') return;
  var entId = parseInt(el.value);
  if (entId) {
    properties.balance_owner_id = entId;
    var ent = _ownCompanies.find(function(c) { return c.id === entId; });
    if (ent) properties.balance_owner_name = ent.name;
    // delete plain text field to avoid duplication
    delete properties.balance_owner;
  }
}

// ============ ENTITY SELECT HANDLERS ============

function onEntitySelectChange(fieldName) {
  var el = document.getElementById('f_' + fieldName);
  var customEl = document.getElementById('f_' + fieldName + '_custom');
  if (!el) return;
  if (customEl) {
    customEl.style.display = (el.value === '__new__') ? '' : 'none';
    if (el.value === '__new__') { customEl.value = ''; customEl.focus(); }
  }
}

function onEntityCustomKeydown(event, input) {
  if (event.key === 'Enter') {
    event.preventDefault();
    onEntityCustomConfirm(input.dataset.field);
  }
}

function onEntityCustomConfirm(fieldName) {
  var el = document.getElementById('f_' + fieldName);
  var customEl = document.getElementById('f_' + fieldName + '_custom');
  if (!el || !customEl) return;
  if (el.value !== '__new__') return;
  var name = customEl.value.trim();
  if (!name) return; // empty — keep visible, user still typing

  var entityType = 'company';
  if (fieldName === 'building' || fieldName === 'building_id') entityType = 'building';
  else if (fieldName === 'room' || fieldName === 'room_id') entityType = 'room';

  var typeObj = entityTypes.find(function(t) { return t.name === entityType; });
  if (!typeObj) return;

  var props = {};
  if (entityType === 'company' && fieldName === 'our_legal_entity') props.is_own = 'true';

  // Disable input while creating
  customEl.disabled = true;

  api('/entities', {
    method: 'POST',
    body: JSON.stringify({ entity_type_id: typeObj.id, name: name, properties: props })
  }).then(function(newEntity) {
    var opt = document.createElement('option');
    opt.value = newEntity.id;
    opt.textContent = (typeObj.icon || '') + ' ' + name;
    opt.selected = true;
    var newOpt = el.querySelector('option[value="__new__"]');
    el.insertBefore(opt, newOpt);
    el.value = String(newEntity.id);
    customEl.style.display = 'none';
    customEl.disabled = false;
    clearEntityCache();
    if (entityType === 'company') {
      _allCompanies.push(newEntity);
      if (props.is_own === 'true') _ownCompanies.push(newEntity);
    } else if (entityType === 'building') {
      _buildings.push(newEntity);
    } else if (entityType === 'room') {
      _rooms.push(newEntity);
    }
  }).catch(function(err) {
    alert('Ошибка: ' + (err.message || err));
    el.value = '';
    customEl.style.display = 'none';
    customEl.disabled = false;
  });
}

// ============ CONTRACT PARTY ROLES ============

var CONTRACT_ROLES = {
  'Подряда':     { our: 'Заказчик',      contractor: 'Подрядчик' },
  'Аренды':      { our: 'Арендодатель',   contractor: 'Арендатор' },
  'Субаренды':   { our: 'Арендодатель',   contractor: 'Арендатор', hasSubtenant: true },
  'Услуг':       { our: 'Заказчик',      contractor: 'Исполнитель' },
  'Поставки':    { our: 'Покупатель',    contractor: 'Поставщик' },
  'Обслуживания': { our: 'Заказчик',      contractor: 'Исполнитель' },
  'Эксплуатации': { our: 'Заказчик',      contractor: 'Исполнитель' },  // backward compat
  'Купли-продажи':{ our: 'Покупатель',   contractor: 'Продавец' },
  'Цессии':      { our: 'Цедент',        contractor: 'Цессионарий' },
};

var _contractFormTypeName = '';
var _contractFormFields = [];
var _contractFormProps = {};

var _ownCompanies = [];
var _allCompanies = [];
var _brokenEqIds = new Set(); // equipment IDs marked broken/emergency in their latest act
var _buildings = [];
var _rooms = [];
var _equipment = [];
var _landPlots = [];

async function loadEntityLists() {
  _ownCompanies = await loadEntitiesByType('company', 'is_own=true');
  _allCompanies = await loadEntitiesByType('company');
  _buildings = await loadEntitiesByType('building');
  _rooms = await loadEntitiesByType('room');
  _equipment = await loadEntitiesByType('equipment');
  _landPlots = await loadEntitiesByType('land_plot');
  loadBrokenEquipment(); // background load, no await
}

async function loadBrokenEquipment() {
  try {
    var ids = await api('/reports/broken-equipment');
    _brokenEqIds = new Set(ids.map(function(id) { return parseInt(id); }));
  } catch(e) { /* non-fatal */ }
}

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

    // our_legal_entity — entity selector from companies with is_own
    if (f.name === 'our_legal_entity') {
      var label = (props.our_role_label || roles.our);
      html += '<div class="form-group" id="wrap_our_legal_entity"><label id="label_our_legal_entity">' + escapeHtml(label) + '</label>' +
        renderEntitySelect('f_our_legal_entity', _ownCompanies, props.our_legal_entity_id, val, 'выберите', 'onEntitySelectChange(&quot;our_legal_entity&quot;)') + '</div>';
      return;
    }

    // contractor_name — entity selector from all companies
    if (f.name === 'contractor_name') {
      var label = (props.contractor_role_label || roles.contractor);
      html += '<div class="form-group" id="wrap_contractor_name"><label id="label_contractor_name">' + escapeHtml(label) + '</label>' +
        renderEntitySelect('f_contractor_name', _allCompanies, props.contractor_id, val, 'выберите', 'onEntitySelectChange(&quot;contractor_name&quot;)') + '</div>';
      return;
    }

    // subtenant — entity selector, only for Субаренды
    if (f.name === 'subtenant_name') {
      var show = (contractType === 'Субаренды') || (roles.hasSubtenant);
      html += '<div class="form-group" id="wrap_subtenant_name" style="' + (show ? '' : 'display:none') + '"><label>Субарендатор</label>' +
        renderEntitySelect('f_subtenant_name', _allCompanies, props.subtenant_id, '', 'выберите', 'onEntitySelectChange(&quot;subtenant_name&quot;)') + '</div>';
      return;
    }

    // Skip fields already covered by CONTRACT_TYPE_FIELDS for this type (e.g. vat_rate for Аренды)
    var ctTypeFields = CONTRACT_TYPE_FIELDS[contractType] || [];
    if (ctTypeFields.find(function(cf) { return cf.name === f.name; })) return;

    // Default vat_rate to 22
    if (f.name === 'vat_rate' && !val) val = '22';

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

  setModalContent(html);

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
    const errData = await r.json().catch(() => ({ error: 'Ошибка сервера' }));
    const err = new Error(errData.error || 'Ошибка');
    err.status = r.status;
    err.data = errData;
    if (r.status !== 409) alert(errData.error || 'Ошибка');
    throw err;
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
  // Documents first, then the rest
  const docTypes = entityTypes.filter(t => t.name === 'contract' || t.name === 'supplement');
  const otherTypes = entityTypes.filter(t => t.name !== 'contract' && t.name !== 'supplement');

  var html = '';
  if (docTypes.length > 0) {
    docTypes.forEach(function(t) {
      html += '<div class="nav-item" data-type="' + t.name + '" onclick="showEntityList(\\'' + t.name + '\\')">' +
        '<span class="icon">' + t.icon + '</span> ' + t.name_ru +
        '<span class="count" id="count_' + t.name + '">-</span></div>';
    });
  }
  if (otherTypes.length > 0) {
    html += '<div class="nav-section" style="margin-top:8px">Реестры</div>';
    otherTypes.forEach(function(t) {
      html += '<div class="nav-item" data-type="' + t.name + '" onclick="showEntityList(\\'' + t.name + '\\')">' +
        '<span class="icon">' + t.icon + '</span> ' + t.name_ru +
        '<span class="count" id="count_' + t.name + '">-</span></div>';
    });
  }
  nav.innerHTML = html;
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

function toggleParentEdit(entityId) {
  var block = document.getElementById('parentEditBlock');
  if (!block) return;
  block.style.display = block.style.display === 'none' ? 'block' : 'none';
}

async function saveParent(entityId) {
  var sel = document.getElementById('parentSelectInline');
  if (!sel) return;
  var newParentId = sel.value ? parseInt(sel.value) : null;
  try {
    await api('/entities/' + entityId, { method: 'PUT', body: JSON.stringify({ parent_id: newParentId }) });
    await showEntity(entityId);
  } catch(ex) {
    alert('Ошибка сохранения: ' + (ex.message || ex));
  }
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
    var isEqBroken = (e.type_name === 'equipment') && _brokenEqIds.has(e.id);
    var isEmergency = (e.type_name === 'equipment') && (props.status === 'Аварийное');
    var cardStyle = isEqBroken ? ' style="border-left:3px solid #dc2626;background:rgba(239,68,68,.06)"'
      : (isEmergency ? ' style="border-left:3px solid #b85c5c;background:rgba(184,92,92,.05)"' : '');
    var nameBadge = isEqBroken ? ' <span class="eq-broken-badge">\u26a0 \u041d\u0435\u0440\u0430\u0431\u043e\u0447\u0438\u0439</span>'
      : (isEmergency ? ' <span class="eq-emergency-badge">\u26a0 \u0410\u0432\u0430\u0440\u0438\u044f</span>' : '');
    var titleStyle = (!isEqBroken && isEmergency) ? ' style="color:#b85c5c"' : '';
    html += '<div class="entity-card"' + cardStyle + ' onclick="showEntity(' + e.id + ')">' +
      '<div class="card-header">' +
      '<div class="card-icon" style="background:' + e.color + '20;color:' + e.color + '">' + e.icon + '</div>' +
      '<div><div class="card-title"' + titleStyle + '>' + escapeHtml(e.name) + nameBadge + '</div>' +
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

var _allEntitiesForParent = [];

async function showEntity(id) {
  currentView = 'detail';
  currentEntityId = id;
  const e = await api('/entities/' + id);
  // Load all non-contract entities for parent selector
  if (e.type_name !== 'contract' && e.type_name !== 'supplement') {
    try {
      var allForParent = await api('/entities?limit=200');
      _allEntitiesForParent = allForParent.filter(function(x) {
        return x.type_name !== 'contract' && x.type_name !== 'supplement' && x.id !== id;
      });
    } catch(ex) { _allEntitiesForParent = []; }
  }

  setActive('[data-type="' + e.type_name + '"]');
  document.getElementById('pageTitle').textContent = '';
  var bcParts = (e.ancestry || []).map(function(a) {
    return '<a href="#" onclick="showEntity(' + a.id + ');return false" style="color:var(--accent)">' + a.icon + ' ' + escapeHtml(a.name) + '</a>';
  });
  var _eProps = e.properties || {};
  var _eEmergencyBadge = (e.type_name === 'equipment' && _eProps.status === 'Аварийное')
    ? ' <span class="eq-emergency-badge">\u26a0 \u0410\u0432\u0430\u0440\u0438\u044f</span>' : '';
  bcParts.push(e.icon + ' ' + escapeHtml(e.name) + _eEmergencyBadge);
  document.getElementById('breadcrumb').innerHTML = bcParts.join(' › ');
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
      if (f.field_type === 'textarea') {
        html += '<div class="prop-item"><div class="prop-label">' + escapeHtml(label) + '</div>' +
          '<div class="prop-value" style="white-space:pre-wrap">' + (val ? escapeHtml(String(val)) : '—') + '</div></div>';
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

        if (f.field_type === 'multi_comments') {
          var cmts = [];
          try { if (typeof val === 'string' && val) cmts = JSON.parse(val); else if (Array.isArray(val)) cmts = val; } catch(ex) {}
          if (cmts.length > 0) {
            html += '<div class="prop-item"><div class="prop-label">' + (f.name_ru || f.name) + '</div><div class="prop-value">';
            cmts.forEach(function(c, ci) { html += (ci > 0 ? '<br>' : '') + '• ' + escapeHtml(c); });
            html += '</div></div>';
          }
          return;
        } else if (f.field_type === 'rent_objects') {
          var robjs = [];
          try { if (typeof val === 'string' && val) robjs = JSON.parse(val); else if (Array.isArray(val)) robjs = val; } catch(ex) {}
          if (robjs.length > 0) {
            robjs.forEach(function(ro, ri) {
              html += '<div class="prop-item" style="border-left:2px solid var(--accent);padding-left:8px;margin-bottom:4px"><div class="prop-label">Объект ' + (ri+1) + ': ' + escapeHtml(ro.object_type || '') + '</div><div class="prop-value">';
              if (ro.building) html += 'Корпус: ' + escapeHtml(ro.building) + '<br>';
              if (ro.room) html += 'Помещение: ' + escapeHtml(ro.room) + '<br>';
              // rent_scope removed
              if (ro.land_location) html += 'Местоположение: ' + escapeHtml(ro.land_location) + '<br>';
              if (ro.calc_mode === 'fixed') {
                html += 'Аренда: ' + (ro.fixed_rent || '—') + ' руб.<br>';
              } else {
                if (ro.area) html += 'Площадь: ' + escapeHtml(String(ro.area)) + ' м²<br>';
                if (ro.rent_rate) html += 'Ставка: ' + escapeHtml(String(ro.rent_rate)) + ' руб/м²<br>';
                var ot = (parseFloat(ro.area)||0) * (parseFloat(ro.rent_rate)||0);
                if (ot > 0) html += '= ' + _fmtNum(ot) + ' руб.<br>';
              }
              if (ro.comment) html += '<em>' + escapeHtml(ro.comment) + '</em>';
              html += '</div></div>';
            });
          }
          return;
        } else if (f.field_type === 'act_items') {
          var actView = [];
          try { if (typeof val === 'string' && val) actView = JSON.parse(val); else if (Array.isArray(val)) actView = val; } catch(ex) {}
          if (actView.length > 0) {
            html += '<div class="detail-section"><h3>Позиции акта</h3>';
            html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
            html += '<thead><tr style="border-bottom:2px solid var(--border)"><th style="text-align:left;padding:6px">\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435</th><th style="text-align:right;padding:6px">\u0421\u0443\u043c\u043c\u0430, \u20bd</th><th style="text-align:left;padding:6px">\u041a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u0439</th></tr></thead><tbody>';
            var actTotal = 0;
            actView.forEach(function(item) {
              actTotal += item.amount || 0;
              html += '<tr style="border-bottom:1px solid var(--border)">';
              html += '<td style="padding:6px"><a href="#" onclick="showEntity(' + (item.equipment_id || 0) + ');return false" style="color:var(--accent)">⚙️ ' + escapeHtml(item.equipment_name || '—') + '</a></td>';
              html += '<td style="text-align:right;padding:6px;font-weight:500">' + _fmtNum(item.amount || 0) + ' ₽</td>';
              html += '<td style="padding:6px;color:var(--text-secondary)">' + escapeHtml(item.description || '—') + '</td>';
              html += '</tr>';
            });
            html += '<tr style="font-weight:600;background:var(--bg-hover)"><td style="padding:6px">Итого</td><td style="text-align:right;padding:6px">' + _fmtNum(actTotal) + ' ₽</td><td></td></tr>';
            html += '</tbody></table></div>';
          }
          return;
        } else if (f.field_type === 'equipment_list') {
          var eqView = [];
          try { if (typeof val === 'string' && val) eqView = JSON.parse(val); else if (Array.isArray(val)) eqView = val; } catch(ex) {}
          // Fallback: show old plain-text equipment value if no equipment_list
          var oldEqText = props.equipment || '';
          html += '<div class="prop-item"><div class="prop-label">' + (f.name_ru || f.name) + '</div><div class="prop-value">';
          if (eqView.length > 0) {
            eqView.forEach(function(eq, i) {
              if (i > 0) html += '<br>';
              html += '⚙️ <a href="#" onclick="showEntity(' + eq.equipment_id + ');return false" style="color:var(--accent);text-decoration:underline">' + escapeHtml(eq.equipment_name || ('ID:' + eq.equipment_id)) + '</a>';
            });
          } else if (oldEqText) {
            html += '<span style="color:var(--text-muted);font-size:12px">' + escapeHtml(oldEqText) + ' <em>(текст, не связан с реестром)</em></span>';
          } else {
            html += '—';
          }
          html += '</div></div>';
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
          var vatAmount = rent > 0 && vat > 0 ? _fmtNum(rent * vat / (100 + vat)) : '—';
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

  // Supplements + Acts sections for contracts
  if (e.type_name === 'contract') {
    const allSupplements = await api('/entities?type=supplement');
    const supplements = allSupplements.filter(function(s) { return s.parent_id === e.id; });
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

    // Acts section
    const allActs = await api('/entities?type=act&limit=200');
    const acts = allActs.filter(function(a) {
      if (a.parent_id === e.id) return true;
      var pc = (a.properties || {}).parent_contract_id;
      return pc && parseInt(pc) === e.id;
    });
    html += '<div class="detail-section"><h3>Акты</h3>';
    if (acts.length > 0) {
      html += '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px">';
      html += '<thead><tr style="border-bottom:2px solid var(--border)"><th style="text-align:left;padding:6px">Акт</th><th style="text-align:left;padding:6px">Дата</th><th style="text-align:right;padding:6px">Сумма</th></tr></thead><tbody>';
      acts.forEach(function(a) {
        var ap = a.properties || {};
        var items = [];
        try { items = JSON.parse(ap.act_items || '[]'); } catch(ex) {}
        var total = items.reduce(function(s, i) { return s + (parseFloat(i.amount) || 0); }, 0);
        html += '<tr style="border-bottom:1px solid var(--border);cursor:pointer" onclick="showEntity(' + a.id + ')">';
        html += '<td style="padding:6px">📝 ' + escapeHtml(a.name) + '</td>';
        html += '<td style="padding:6px;color:var(--text-muted)">' + (ap.act_date || '—') + '</td>';
        html += '<td style="text-align:right;padding:6px;font-weight:500">' + (total > 0 ? _fmtNum(total) + ' ₽' : '—') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<div style="color:var(--text-muted);font-size:13px;margin-bottom:8px">Нет актов</div>';
    }
    html += '<button class="btn btn-sm btn-primary" onclick="openCreateActModal(' + e.id + ')" style="margin-top:4px">+ Акт</button>';
    html += '</div>';
  }

  // Work history section for equipment
  if (e.type_name === 'equipment') {
    const actRels = (e.relations || []).filter(function(r) { return r.relation_type === 'subject_of' && r.from_entity_id === e.id && r.to_type_name === 'act'; });
    if (actRels.length > 0) {
      html += '<div class="detail-section"><h3>История работ</h3>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      html += '<thead><tr style="border-bottom:2px solid var(--border)"><th style="text-align:left;padding:6px">Акт</th><th style="text-align:left;padding:6px">Дата</th><th style="text-align:right;padding:6px">Сумма</th><th style="text-align:left;padding:6px">Описание</th></tr></thead><tbody>';
      for (var ai = 0; ai < actRels.length; ai++) {
        var actData = await api('/entities/' + actRels[ai].to_entity_id);
        var ap = actData.properties || {};
        var items = [];
        try { items = JSON.parse(ap.act_items || '[]'); } catch(ex) {}
        var myItem = items.find(function(it) { return parseInt(it.equipment_id) === e.id; });
        var contractRel = (actData.relations || []).find(function(r) { return r.relation_type === 'supplement_to' && r.from_entity_id === actData.id; });
        html += '<tr style="border-bottom:1px solid var(--border);cursor:pointer" onclick="showEntity(' + actData.id + ')">';
        html += '<td style="padding:6px">📝 ' + escapeHtml(actData.name) + (contractRel ? '<br><span style="font-size:11px;color:var(--text-muted)">→ ' + escapeHtml(contractRel.to_entity_name || '') + '</span>' : '') + '</td>';
        html += '<td style="padding:6px;color:var(--text-muted)">' + (ap.act_date || '—') + '</td>';
        html += '<td style="text-align:right;padding:6px;font-weight:500">' + (myItem && myItem.amount ? _fmtNum(myItem.amount) + ' ₽' : '—') + '</td>';
        html += '<td style="padding:6px;color:var(--text-secondary);font-size:12px">' + escapeHtml(myItem ? (myItem.description || '') : '') + '</td>';
        html += '</tr>';
      }
      html += '</tbody></table></div>';
    }
  }

  // Location block (for non-contract entities)
  if (e.type_name !== 'contract' && e.type_name !== 'supplement') {
    var isBuildingType = (e.type_name === 'building' || e.type_name === 'workshop');
    var locationTitle = isBuildingType ? 'Собственник' : 'Расположение';

    // For buildings: also show land plot from relations
    if (isBuildingType) {
      var lpRels = (e.relations || []).filter(function(r) { return r.relation_type === 'located_on' && r.from_entity_id === e.id; });
      if (lpRels.length > 0) {
        var lpRel = lpRels[0];
        html += '<div class="detail-section">';
        html += '<h3>Земельный участок</h3>';
        html += '<a href="#" onclick="showEntity(' + lpRel.to_entity_id + ');return false" style="color:var(--accent)">🌍 ' + escapeHtml(lpRel.to_name || 'Земельный участок') + '</a>';
        html += '</div>';
      }
    }

    html += '<div class="detail-section" id="locationBlock">';
    html += '<h3 style="display:flex;justify-content:space-between;align-items:center">' + locationTitle;
    html += '<button class="btn btn-sm" onclick="toggleParentEdit(' + e.id + ')">✏️ Изменить</button></h3>';
    if (e.ancestry && e.ancestry.length > 0) {
      html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
      e.ancestry.forEach(function(a, i) {
        if (i > 0) html += '<span style="color:var(--text-muted)">›</span>';
        html += '<a href="#" onclick="showEntity(' + a.id + ');return false" style="display:flex;align-items:center;gap:4px;color:var(--accent);text-decoration:none">' +
          '<span>' + a.icon + '</span><span>' + escapeHtml(a.name) + '</span></a>';
      });
      html += '<span style="color:var(--text-muted)">›</span><strong>' + e.icon + ' ' + escapeHtml(e.name) + '</strong>';
      html += '</div>';
    } else {
      html += '<span style="color:var(--text-muted);font-size:13px">Не привязано ни к какому объекту</span>';
    }
    html += '<div id="parentEditBlock" style="display:none;margin-top:12px">';
    if (isBuildingType) {
      html += '<div class="form-group"><label>Собственник</label>';
      html += '<select id="parentSelectInline" style="width:100%"><option value="">— не указано —</option>';
      (_allCompanies || []).forEach(function(c) {
        html += '<option value="' + c.id + '"' + (e.parent_id === c.id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
      });
      html += '</select></div>';
    } else {
      html += '<div class="form-group"><label>Входит в</label>';
      html += '<select id="parentSelectInline" style="width:100%"><option value="">— нет (корневой объект) —</option>';
      (_allEntitiesForParent || []).forEach(function(x) {
        if (x.id === e.id) return; // can't be own parent
        html += '<option value="' + x.id + '"' + (e.parent_id === x.id ? ' selected' : '') + '>' + x.icon + ' ' + escapeHtml(x.name) + ' (' + x.type_name_ru + ')</option>';
      });
      html += '</select></div>';
    }
    html += '<div style="display:flex;gap:8px">';
    html += '<button class="btn btn-primary btn-sm" onclick="saveParent(' + e.id + ')">Сохранить</button>';
    html += '<button class="btn btn-sm" onclick="toggleParentEdit(' + e.id + ')">Отмена</button>';
    html += '</div></div>';
    html += '</div>';
  }

  // Children
  if (e.children && e.children.length > 0) {
    html += '<div class="detail-section"><h3>Содержит (' + e.children.length + ')</h3><div class="children-grid">';
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

// ============ REPORTS ============

var _reportFields = [];
// Fields available for manual grouping
var AGG_HIERARCHY_FIELDS = [
  { name: 'contract_our_legal_entity', label: 'Наше юрлицо' },
  { name: 'eq_balance_owner',          label: 'Собственник' },
  { name: 'eq_building',               label: 'Корпус' },
  { name: 'eq_category',               label: 'Категория оборудования' },
  { name: 'eq_name',                   label: 'Оборудование' },
  { name: 'contract_contractor',       label: 'Контрагент' },
  { name: 'contract_type',             label: 'Тип договора' },
  { name: 'contract_year',             label: 'Год' },
];
// No auto drill — user controls grouping fully
var AGG_AUTO_DRILL = [];
// All fields for label lookup in tree rendering
var AGG_ALL_FIELDS = AGG_HIERARCHY_FIELDS;
var AGG_CONTRACT_TYPES = ['Подряда','Услуг','Купли-продажи','Обслуживания'];
var _aggHierarchy = []; // ordered list of field names

var _pivotRowFields = [];
var _pivotColFields = [];
var _pivotDragField = null;
var _pivotDragSource = null;
var _reportFieldLabels = {
  building: 'Корпус', room: 'Помещение', object_type: 'Тип объекта',
  contractor_name: 'Контрагент', our_legal_entity: 'Наше юр. лицо',
  contract_type: 'Тип договора', tenant: 'Арендатор',
  equipment: 'Оборудование', rent_scope: 'Часть/Целиком',
  our_role_label: 'Роль нашей стороны', contractor_role_label: 'Роль контрагента',
};

async function showReports() {
  currentView = 'reports';
  setActive(null);
  document.getElementById('pageTitle').textContent = 'Отчёты';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';

  _reportFields = await api('/reports/fields');

  var content = document.getElementById('content');
  var html = '<div style="max-width:900px;margin:0 auto">';

  // Tabs
  html += '<div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border)">';
  html += '<button id="tabPivot" class="btn" data-tab="pivot" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">Сводная таблица</button>';
  html += '<button id="tabLinked" class="btn" data-tab="linked" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">По связям</button>';
  html += '<button id="tabAgg" class="btn btn-primary" data-tab="agg" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">Анализ затрат</button>';
  html += '<button id="tabWorkHistory" class="btn" data-tab="workHistory" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">История работ</button>';
  html += '<button id="tabRentAnalysis" class="btn" data-tab="rentAnalysis" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">\u0410\u043d\u0430\u043b\u0438\u0437 \u0430\u0440\u0435\u043d\u0434\u044b</button>';
  html += '</div>';

  // Pivot section (drag-and-drop)
  _pivotRowFields = [];
  _pivotColFields = [];
  html += '<div id="sectionPivot" style="display:none">';
  html += '<div class="detail-section">';
  html += '<h3>Сводная таблица</h3>';

  // Field pool — all document fields flat
  html += '<div style="margin-bottom:16px">';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Поля — перетащите в Строки или Столбцы</div>';
  html += '<div class="pivot-field-pool" id="pivotFieldPool" ondragover="event.preventDefault()" ondrop="onPivotDrop(event,this)"></div>';
  html += '</div>';

  // Drop zones
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';
  html += '<div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">↕ Строки</div>';
  html += '<div class="pivot-zone" id="pivotRowZone" data-zone="rows" ondragover="onPivotDragOver(event,this)" ondragleave="onPivotDragLeave(this)" ondrop="onPivotDrop(event,this)">';
  html += '<div class="pivot-zone-hint">Перетащите поле сюда</div>';
  html += '</div></div>';
  html += '<div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">↔ Столбцы</div>';
  html += '<div class="pivot-zone" id="pivotColZone" data-zone="cols" ondragover="onPivotDragOver(event,this)" ondragleave="onPivotDragLeave(this)" ondrop="onPivotDrop(event,this)">';
  html += '<div class="pivot-zone-hint">Перетащите поле сюда (необязательно)</div>';
  html += '</div></div>';
  html += '</div>';

  html += '<button class="btn btn-primary" onclick="buildPivotTable()">Построить таблицу</button>';
  html += '</div>';
  html += '<div id="pivotResults"></div>';
  html += '</div>';

  // Linked reports section
  html += '<div id="sectionLinked">';
  html += '<div class="detail-section"><h3>Отчёты по связям</h3>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:16px">';
  var linkedReports = [
    { type: 'equipment_by_location', icon: '🏢', title: 'Оборудование по корпусам', desc: 'Где установлено каждое оборудование' },
    { type: 'equipment_by_tenant',   icon: '🏛', title: 'Оборудование у арендаторов', desc: 'Какое оборудование в арендуемых помещениях' },
  ];
  linkedReports.forEach(function(r) {
    html += '<div class="child-card" onclick="runLinkedReport(&quot;' + r.type + '&quot;)" style="cursor:pointer;padding:14px">';
    html += '<div style="font-size:24px;margin-bottom:6px">' + r.icon + '</div>';
    html += '<div style="font-weight:600;margin-bottom:4px">' + r.title + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted)">' + r.desc + '</div>';
    html += '</div>';
  });
  html += '</div></div>';
  html += '<div id="linkedResults"></div>';
  html += '</div>';

  // Aggregate report section
  _aggHierarchy = [];
  html += '<div id="sectionAgg" style="display:none">';
  html += '<div class="detail-section"><h3>Анализ затрат по оборудованию</h3>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px">';

  // Left: filters
  html += '<div>';
  html += '<div class="form-group"><label>Типы договоров *</label><div id="aggTypeFilter" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">';
  AGG_CONTRACT_TYPES.forEach(function(t) {
    html += '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-weight:normal">';
    html += '<input type="checkbox" class="agg-type-cb" value="' + t + '" checked> ' + t;
    html += '</label>';
  });
  html += '</div></div>';
  html += '<div class="form-group"><label>Период</label>';
  html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">от&nbsp;<input type="date" id="aggDateFrom" style="flex:1;min-width:120px">&nbsp;до&nbsp;<input type="date" id="aggDateTo" style="flex:1;min-width:120px"></div></div>';
  html += '<div class="form-group"><label>Контрагент</label><select id="aggContractor" style="width:100%"><option value="">— Все —</option>';
  _allCompanies.forEach(function(c) { html += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'; });
  html += '</select></div>';
  html += '<div class="form-group"><label>Суммировать</label><select id="aggMetric" style="width:100%">';
  html += '<option value="contract_amount">Сумма договора</option>';
  html += '<option value="rent_monthly">Аренда в месяц</option>';
  html += '</select></div>';
  html += '</div>';

  // Right: hierarchy builder
  html += '<div>';
  html += '<div class="form-group"><label>Группировка строк</label>';
  html += '<div id="aggHierarchyList" style="min-height:50px;border:2px dashed var(--border);border-radius:6px;padding:8px;background:var(--bg-secondary);margin-bottom:8px">';
  html += '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:6px">Добавьте поля из списка ниже</div>';
  html += '</div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Доступные поля (нажмите чтобы добавить):</div>';
  html += '<div id="aggFieldPool" style="display:flex;flex-wrap:wrap;gap:6px">';
  AGG_HIERARCHY_FIELDS.forEach(function(f) {
    html += '<button type="button" class="btn btn-sm agg-pool-btn" data-name="' + f.name + '" onclick="aggAddField(this.dataset.name)" style="font-size:11px">' + escapeHtml(f.label) + ' +</button>';
  });
  html += '</div></div>';
  html += '</div>';

  html += '</div>'; // end grid
  html += '<button class="btn btn-primary" onclick="buildAggregateReport()">Построить отчёт</button>';
  html += '</div>'; // end detail-section
  html += '<div id="aggResults"></div>';
  html += '</div>'; // end sectionAgg

  // Work History section
  html += '<div id="sectionWorkHistory" style="display:none">';
  html += '<div class="detail-section"><h3>История работ по оборудованию</h3>';
  html += '<p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Матрица: строки — оборудование, столбцы — виды работ из актов</p>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">';
  html += '<div class="form-group"><label>Категория</label><select id="whCategory" style="width:100%"><option value="">— Все категории —</option>';
  EQUIPMENT_CATEGORIES.forEach(function(c) { html += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
  html += '</select></div>';
  html += '<div class="form-group"><label>Корпус</label><select id="whBuilding" style="width:100%"><option value="">— Все корпуса —</option>';
  (_buildings || []).forEach(function(b) { html += '<option value="' + b.id + '">' + escapeHtml(b.name) + '</option>'; });
  html += '</select></div>';
  html += '<div class="form-group"><label>Период (акты)</label><div style="display:flex;gap:6px;align-items:center">от&nbsp;<input type="date" id="whDateFrom" style="flex:1">&nbsp;до&nbsp;<input type="date" id="whDateTo" style="flex:1"></div></div>';
  html += '</div>';
  html += '<button class="btn btn-primary" onclick="buildWorkHistoryReport()">Построить таблицу</button>';
  html += '</div>'; // end detail-section
  html += '<div id="whResults"></div>';
  html += '</div>'; // end sectionWorkHistory

  // Rent Analysis section
  html += '<div id="sectionRentAnalysis" style="display:none">';
  html += '<div class="detail-section">';
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px">';
  html += '<div>';
  html += '<h3 style="margin:0 0 4px">\u0410\u043d\u0430\u043b\u0438\u0437 \u0430\u0440\u0435\u043d\u0434\u044b</h3>';
  html += '<p style="margin:0;font-size:12px;color:var(--text-muted)">\u0424\u0438\u043b\u044c\u0442\u0440\u044b + \u0433\u0440\u0443\u043f\u043f\u0438\u0440\u043e\u0432\u043a\u0430 \u043f\u043e \u043b\u044e\u0431\u044b\u043c \u043f\u043e\u043b\u044f\u043c</p>';
  html += '</div>';
  html += '<button class="btn btn-primary" onclick="buildRentAnalysis()">\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u0434\u0430\u043d\u043d\u044b\u0435</button>';
  html += '</div>';
  // Group-by zone
  html += '<div style="margin-bottom:12px">';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">\u0413\u0440\u0443\u043f\u043f\u0438\u0440\u043e\u0432\u043a\u0430 \u0441\u0442\u0440\u043e\u043a \u043f\u043e:</div>';
  html += '<div id="rentGroupZone" style="display:flex;flex-wrap:wrap;gap:6px;min-height:32px;padding:6px;border:2px dashed var(--border);border-radius:6px;background:var(--bg-secondary)">';
  html += '<span style="color:var(--text-muted);font-size:12px;align-self:center">\u041d\u0430\u0436\u043c\u0438\u0442\u0435 + \u043f\u043e\u043b\u0435 \u043d\u0438\u0436\u0435 \u0447\u0442\u043e\u0431\u044b \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0443\u0440\u043e\u0432\u0435\u043d\u044c \u0433\u0440\u0443\u043f\u043f\u0438\u0440\u043e\u0432\u043a\u0438</span>';
  html += '</div>';
  html += '<div id="rentGroupFieldBtns" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>';
  html += '</div>';
  html += '</div>';
  html += '<div id="rentResults"></div>';
  html += '</div>'; // end sectionRentAnalysis

  html += '</div>';
  content.innerHTML = html;
  switchReportTab('agg');
  updatePivotFieldPool(); // fill pool for default entity type
}

function switchReportTab(tab) {
  var tabs = ['pivot','linked','agg','workHistory','rentAnalysis'];
  tabs.forEach(function(t) {
    var btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
    var sec = document.getElementById('section' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) { btn.className = (t === tab) ? 'btn btn-primary' : 'btn'; btn.style.cssText = 'border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px'; }
    if (sec) sec.style.display = (t === tab) ? '' : 'none';
  });
}

// ============ AGGREGATE REPORT ============

function aggAddField(name) {
  if (_aggHierarchy.indexOf(name) >= 0) return;
  _aggHierarchy.push(name);
  renderAggHierarchyUI();
}

function aggRemoveField(name) {
  _aggHierarchy = _aggHierarchy.filter(function(n) { return n !== name; });
  renderAggHierarchyUI();
}

function aggMoveField(name, dir) {
  var idx = _aggHierarchy.indexOf(name);
  if (idx < 0) return;
  var newIdx = idx + (dir === 'up' ? -1 : 1);
  if (newIdx < 0 || newIdx >= _aggHierarchy.length) return;
  _aggHierarchy.splice(idx, 1);
  _aggHierarchy.splice(newIdx, 0, name);
  renderAggHierarchyUI();
}

function renderAggHierarchyUI() {
  var listEl = document.getElementById('aggHierarchyList');
  var poolEl = document.getElementById('aggFieldPool');
  if (!listEl || !poolEl) return;

  if (_aggHierarchy.length === 0) {
    listEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:6px">Добавьте поля из списка ниже</div>';
  } else {
    listEl.innerHTML = _aggHierarchy.map(function(name, i) {
      var f = AGG_ALL_FIELDS.find(function(x) { return x.name === name; });
      var label = f ? f.label : name;
      var isFirst = (i === 0), isLast = (i === _aggHierarchy.length - 1);
      return '<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">' +
        '<span style="color:var(--text-muted);font-size:11px;width:18px;text-align:right">' + (i+1) + '.</span>' +
        '<span style="flex:1;padding:4px 10px;background:var(--bg-hover);border-radius:4px;font-size:13px">' + escapeHtml(label) + '</span>' +
        '<button type="button" class="btn btn-sm" style="padding:2px 7px" data-name="' + name + '" data-dir="up" onclick="aggMoveField(this.dataset.name,this.dataset.dir)"' + (isFirst?' disabled':'') + '>↑</button>' +
        '<button type="button" class="btn btn-sm" style="padding:2px 7px" data-name="' + name + '" data-dir="down" onclick="aggMoveField(this.dataset.name,this.dataset.dir)"' + (isLast?' disabled':'') + '>↓</button>' +
        '<button type="button" class="btn btn-sm" style="padding:2px 7px;color:var(--danger)" data-name="' + name + '" onclick="aggRemoveField(this.dataset.name)">×</button>' +
        '</div>';
    }).join('');
  }

  poolEl.innerHTML = AGG_HIERARCHY_FIELDS.filter(function(f) {
    return _aggHierarchy.indexOf(f.name) < 0;
  }).map(function(f) {
    return '<button type="button" class="btn btn-sm agg-pool-btn" data-name="' + f.name + '" onclick="aggAddField(this.dataset.name)" style="font-size:11px">' + escapeHtml(f.label) + ' +</button>';
  }).join(' ');
}

async function buildAggregateReport() {
  if (_aggHierarchy.length === 0) { alert('Добавьте хотя бы одно поле в группировку'); return; }
  var types = Array.from(document.querySelectorAll('.agg-type-cb:checked')).map(function(cb) { return cb.value; });
  if (types.length === 0) { alert('Выберите хотя бы один тип договора'); return; }

  var metric      = document.getElementById('aggMetric').value;
  var dateFrom    = document.getElementById('aggDateFrom').value;
  var dateTo      = document.getElementById('aggDateTo').value;
  var contractorId = document.getElementById('aggContractor').value;

  var p = new URLSearchParams();
  p.set('contract_types', types.join('|'));
  p.set('metric', metric);
  if (dateFrom) p.set('date_from', dateFrom);
  if (dateTo)   p.set('date_to', dateTo);
  if (contractorId) p.set('contractor_id', contractorId);

  var resultsEl = document.getElementById('aggResults');
  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';

  var data;
  try { data = await api('/reports/aggregate?' + p.toString()); }
  catch(e) { resultsEl.innerHTML = '<div style="color:var(--danger);padding:12px">Ошибка: ' + escapeHtml(String(e.message || e)) + '</div>'; return; }

  if (!data.length) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных по выбранным параметрам</div>';
    return;
  }
  var metricLabel = (metric === 'rent_monthly') ? 'Аренда в мес.' : 'Сумма договора';
  // Auto-extend hierarchy: [user grouping] → Категория → Вид → Оборудование → Договор
  var autoHierarchy = _aggHierarchy.slice();
  AGG_AUTO_DRILL.forEach(function(f) {
    if (autoHierarchy.indexOf(f) < 0) autoHierarchy.push(f);
  });
  resultsEl.innerHTML = renderAggTree(data, autoHierarchy, metric, metricLabel);
}

function renderAggTree(rows, hierarchy, metric, metricLabel) {
  // Build nested tree from flat rows
  function buildLevel(data, depth) {
    var total = data.reduce(function(s, r) { return s + (r[metric] || 0); }, 0);
    if (depth >= hierarchy.length) return { contracts: data, total: total };
    var field = hierarchy[depth];
    var order = [], map = {};
    data.forEach(function(r) {
      var val = (r[field] || '—');
      if (!map[val]) { map[val] = []; order.push(val); }
      map[val].push(r);
    });
    order.sort(function(a,b) { return String(a).localeCompare(String(b),'ru'); });
    var children = order.map(function(key) { return Object.assign({ key: key }, buildLevel(map[key], depth + 1)); });
    return { children: children, total: total };
  }

  var tree = buildLevel(rows, 0);
  var _uid = 0;

  function renderNode(node, depth) {
    var h = '';
    if (node.children) {
      node.children.forEach(function(child) {
        var id = 'agg_' + (++_uid);
        var field = hierarchy[depth];
        var fDef = AGG_ALL_FIELDS.find(function(x) { return x.name === field; });
        var fLabel = fDef ? fDef.label : field;
        h += '<div style="margin-left:' + (depth * 18) + 'px">';
        h += '<div class="agg-tree-row" data-target="' + id + '" onclick="aggToggle(this.dataset.target)">';
        h += '<span id="' + id + '_ico" style="font-size:10px;color:var(--text-muted);width:12px">▶</span>';
        h += '<span style="font-size:11px;color:var(--text-muted);min-width:130px">' + escapeHtml(fLabel) + '</span>';
        h += '<span style="flex:1;font-weight:' + (depth < 2 ? '600' : '400') + '">' + escapeHtml(String(child.key)) + '</span>';
        h += '<span class="agg-total">' + _fmtNum(child.total) + ' ₽</span>';
        h += '</div>';
        h += '<div id="' + id + '" style="display:none">' + renderNode(child, depth + 1) + '</div>';
        h += '</div>';
      });
    }
    if (node.contracts) {
      // Group rows by equipment so each unit appears once with total, expandable per-document
      var eqGroups = {}, eqOrder = [];
      node.contracts.forEach(function(r) {
        var key = 'eq_' + (r.eq_id || r.contract_id);
        if (!eqGroups[key]) {
          eqGroups[key] = { eq_id: r.eq_id, contract_id: r.contract_id,
            eq_name: r.eq_name || r.contract_name, eq_status: r.eq_status, total: 0, docs: [] };
          eqOrder.push(key);
        }
        eqGroups[key].total += (r[metric] || 0);
        eqGroups[key].docs.push(r);
      });

      eqOrder.forEach(function(key) {
        var grp = eqGroups[key];
        var eqId = grp.eq_id || grp.contract_id;
        var isBroken = _brokenEqIds.has(parseInt(eqId));
        var isEmerg = (grp.eq_status === 'Аварийное');
        var leafBg = isBroken ? 'background:rgba(239,68,68,.09);border-radius:4px;'
          : (isEmerg ? 'background:rgba(184,92,92,.06);border-radius:4px;' : '');
        var leafColor = isBroken ? 'color:#dc2626;font-weight:500;' : (isEmerg ? 'color:#b85c5c;' : '');
        var hasMulti = grp.docs.length > 1;
        var detId = 'eqd_' + (++_uid);

        h += '<div style="margin-left:' + (depth * 18) + 'px">';
        // Summary row
        h += '<div class="agg-tree-leaf" style="' + leafBg + '" onclick="' +
          (hasMulti ? 'aggToggle(\'' + detId + '\')' : 'showEntity(' + eqId + ')') + '">';
        if (hasMulti) h += '<span id="' + detId + '_ico" style="font-size:10px;color:var(--text-muted);width:12px">\u25b6</span>';
        else h += '<span style="width:12px">\u2003</span>';
        h += '<span>\u2699\ufe0f</span>';
        h += '<span style="flex:1;' + leafColor + '">';
        h += escapeHtml(grp.eq_name);
        if (isBroken) h += '<span class="eq-broken-badge">\u26a0 \u041d\u0435\u0440\u0430\u0431\u043e\u0447\u0438\u0439</span>';
        else if (isEmerg) h += '<span class="eq-emergency-badge">\u26a0 \u0410\u0432\u0430\u0440\u0438\u044f</span>';
        if (hasMulti) {
          h += '<span style="font-size:11px;color:var(--text-muted);margin-left:6px">' + grp.docs.length + ' \u0434\u043e\u043a.</span>';
        } else {
          var r0 = grp.docs[0];
          if (r0.act_name) h += '<span style="font-size:11px;color:var(--text-muted);margin-left:6px">' + escapeHtml(r0.act_name) + '</span>';
        }
        h += '</span>';
        if (!hasMulti) {
          var r1 = grp.docs[0];
          if (r1.act_date || r1.contract_date) h += '<span style="font-size:11px;color:var(--text-muted);margin-right:8px">' + (r1.act_date || r1.contract_date) + '</span>';
        }
        h += '<span class="agg-total">' + _fmtNum(grp.total) + ' \u20bd</span>';
        h += '</div>';

        // Expandable detail rows
        if (hasMulti) {
          h += '<div id="' + detId + '" style="display:none">';
          grp.docs.forEach(function(r) {
            h += '<div class="agg-tree-leaf" style="margin-left:20px;opacity:.85" onclick="showEntity(' + (r.act_id || r.contract_id) + ')">';
            h += '<span style="width:12px"></span><span>\ud83d\udcc4</span>';
            h += '<span style="flex:1;font-size:12px;color:var(--text-secondary)">' + escapeHtml(r.act_name || r.contract_name) + '</span>';
            if (r.act_date || r.contract_date) h += '<span style="font-size:11px;color:var(--text-muted);margin-right:8px">' + (r.act_date || r.contract_date) + '</span>';
            h += '<span class="agg-total">' + _fmtNum(r[metric]) + ' \u20bd</span>';
            h += '</div>';
          });
          h += '</div>';
        }
        h += '</div>';
      });
    }
    return h;
  }

  var totalFmt = _fmtNum(tree.total);
  var h = '<div class="detail-section" style="margin-top:16px">';
  h += '<div style="display:flex;justify-content:space-between;margin-bottom:12px;font-weight:600">';
  var _uniqueEq = new Set(rows.map(function(r) { return r.eq_id || r.contract_id; })).size;
  h += '<span>' + _uniqueEq + ' \u0435\u0434. \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f (' + rows.length + ' \u0437\u0430\u043f\u0438\u0441\u0435\u0439)</span><span>' + escapeHtml(metricLabel) + ': ' + totalFmt + ' \u20bd</span>';
  h += '</div>';
  h += renderNode(tree, 0);
  h += '</div>';
  return h;
}

function aggToggle(id) {
  var el = document.getElementById(id);
  var ico = document.getElementById(id + '_ico');
  if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : '';
  if (ico) ico.textContent = open ? '▶' : '▼';
}

// ============ PIVOT TABLE (drag-and-drop) ============

var _pivotSkipFields = [
  'rent_objects','rent_comments','equipment_list','act_items','parent_contract_id','parent_contract_name',
  'our_legal_entity_id','contractor_id','subtenant_id','balance_owner_id','balance_owner_name',
  'extra_services','duration_type', // internal flags — not useful for pivot
];
var _pivotFieldLabels = {
  // Contract / supplement main fields
  contract_type: 'Тип договора', our_legal_entity: 'Наше юр. лицо', contractor_name: 'Контрагент',
  subtenant_name: 'Субарендатор', number: 'Номер договора', contract_date: 'Дата договора',
  our_role_label: 'Роль нашей стороны', contractor_role_label: 'Роль контрагента',
  changes_description: 'Что поменялось',
  // Dynamic contract fields
  subject: 'Предмет договора', service_subject: 'Описание работ / предмет', service_comment: 'Комментарий',
  contract_end_date: 'Срок действия (до)',
  contract_amount: 'Сумма договора',
  rent_monthly: 'Аренда в месяц', payment_date: 'Дата оплаты',
  duration_date: 'Дата окончания', duration_text: 'Срок действия',
  advances: 'Авансы (да/нет)', advance_amount: 'Сумма аванса',
  vat_rate: 'в т.ч. НДС, %', completion_deadline: 'Срок выполнения',
  extra_services_desc: 'Доп. услуги', extra_services_cost: 'Стоимость доп. услуг',
  // Rent object fields
  building: 'Корпус', room: 'Помещение', object_type: 'Тип объекта', tenant: 'Арендатор',
  equipment: 'Оборудование по договору',
  // Equipment entity fields
  equipment_category: 'Категория оборудования',
  status: 'Статус оборудования', inv_number: 'Инв. номер', balance_owner: 'Собственник',
  serial_number: 'Серийный номер', year: 'Год выпуска', manufacturer: 'Производитель',
  // Company fields
  is_own: 'Наша / чужая орг.', inn: 'ИНН',
  // Location fields
  area: 'Площадь', purpose: 'Назначение', cadastral_number: 'Кадастровый №',
  // Order fields
  order_type: 'Тип приказа', order_number: 'Номер приказа', order_date: 'Дата приказа',
  // Virtual equipment fields (available through contract rent_objects)
  eq_name: 'Оборудование', eq_category: 'Категория оборудования',
  eq_status: 'Статус оборудования',
  eq_inv_number: 'Инв. № оборудования', eq_manufacturer: 'Производитель оборудования',
};

// All document types shown in pivot pool
var _PIVOT_DOC_TYPES = ['contract', 'supplement', 'order', 'document'];

function updatePivotFieldPool() {
  var pool = document.getElementById('pivotFieldPool');
  if (!pool) return;
  var inZones = _pivotRowFields.concat(_pivotColFields).map(function(f) { return f.name; });

  function makeChip(f) {
    var label = _pivotFieldLabels[f.name] || f.name_ru || f.name;
    if (inZones.indexOf(f.name) >= 0) return '';
    return '<div class="pivot-chip" draggable="true" data-field="' + f.name + '" data-label="' + label.replace(/"/g, '&quot;') + '" data-entity-type="' + (f.entity_type || '') + '" ondragstart="onPivotDragStart(event,this)">' + label + '</div>';
  }

  // Build groups per document type
  var groups = {};
  _PIVOT_DOC_TYPES.forEach(function(tn) { groups[tn] = []; });

  // Fields from DB (field_definitions table)
  _reportFields.forEach(function(f) {
    if (_pivotSkipFields.indexOf(f.name) >= 0) return;
    if (f.name.charAt(0) === '_') return;
    var t = f.entity_type;
    if (!t || _PIVOT_DOC_TYPES.indexOf(t) < 0) return;
    if (!groups[t].find(function(x) { return x.name === f.name; }))
      groups[t].push(f);
  });

  // Contract extra fields (from rent_objects + virtual equipment)
  var contractExtra = ['building','room','object_type','rent_monthly','contract_amount','advances',
    'completion_deadline','subject','service_subject','service_comment','duration_date','duration_text','tenant','equipment','vat_rate'];
  contractExtra.forEach(function(name) {
    if (!groups.contract.find(function(f) { return f.name === name; }))
      groups.contract.push({ name: name, name_ru: _pivotFieldLabels[name] || name, entity_type: 'contract' });
  });
  // Virtual equipment fields via contract rent_objects
  ['eq_name','eq_category','eq_status','eq_inv_number','eq_manufacturer'].forEach(function(name) {
    groups.contract.push({ name: name, name_ru: _pivotFieldLabels[name] || name, entity_type: 'contract' });
  });

  // Render grouped
  var html = '';
  _PIVOT_DOC_TYPES.forEach(function(tn) {
    var tObj = entityTypes.find(function(t) { return t.name === tn; });
    var chips = groups[tn].map(makeChip).join('');
    if (!chips.trim()) return;
    html += '<div style="margin-bottom:8px">';
    if (tObj) html += '<span style="font-size:10px;color:var(--text-muted);margin-right:4px;text-transform:uppercase;letter-spacing:0.5px">' + tObj.icon + ' ' + tObj.name_ru + '</span>';
    html += chips + '</div>';
  });
  pool.innerHTML = html || '<div style="color:var(--text-muted);font-size:12px;padding:4px">Нет полей</div>';
}

function onPivotDragStart(event, el) {
  _pivotDragField = { name: el.dataset.field, label: el.dataset.label, entity_type: el.dataset.entityType || '' };
  var parent = el.parentElement;
  _pivotDragSource = parent ? parent.id : 'pivotFieldPool';
  event.dataTransfer.effectAllowed = 'move';
}

function onPivotDragOver(event, zone) {
  event.preventDefault();
  zone.classList.add('drag-over');
}

function onPivotDragLeave(zone) {
  zone.classList.remove('drag-over');
}

function onPivotDrop(event, zone) {
  event.preventDefault();
  zone.classList.remove('drag-over');
  if (!_pivotDragField) return;

  var targetZone = zone.dataset.zone || 'pool'; // 'rows', 'cols', or 'pool'
  var field = _pivotDragField;
  _pivotDragField = null;
  _pivotDragSource = null;

  // Remove from wherever the field was before
  _pivotRowFields = _pivotRowFields.filter(function(f) { return f.name !== field.name; });
  _pivotColFields = _pivotColFields.filter(function(f) { return f.name !== field.name; });

  if (targetZone === 'rows') _pivotRowFields.push(field);
  else if (targetZone === 'cols') _pivotColFields.push(field);
  // pool: already removed above

  updatePivotZones();
}

function pivotRemoveChip(el) {
  var field = el.dataset.field;
  var zone = el.dataset.zone;
  if (zone === 'rows') _pivotRowFields = _pivotRowFields.filter(function(f) { return f.name !== field; });
  if (zone === 'cols') _pivotColFields = _pivotColFields.filter(function(f) { return f.name !== field; });
  updatePivotZones();
}

function updatePivotZones() {
  updatePivotFieldPool(); // sync pool (chips removed from zones reappear here)
  var rowZone = document.getElementById('pivotRowZone');
  var colZone = document.getElementById('pivotColZone');

  if (rowZone) {
    if (_pivotRowFields.length === 0) {
      rowZone.innerHTML = '<div class="pivot-zone-hint">Перетащите поле сюда</div>';
    } else {
      rowZone.innerHTML = _pivotRowFields.map(function(f) {
        return '<div class="pivot-chip pivot-chip-row" draggable="true" data-field="' + f.name + '" data-label="' + f.label + '" data-entity-type="' + (f.entity_type || '') + '" ondragstart="onPivotDragStart(event,this)">' +
          escapeHtml(f.label) +
          '<span class="pivot-chip-remove" data-field="' + f.name + '" data-zone="rows" onclick="pivotRemoveChip(this)">×</span></div>';
      }).join('');
    }
  }

  if (colZone) {
    if (_pivotColFields.length === 0) {
      colZone.innerHTML = '<div class="pivot-zone-hint">Перетащите поле сюда (необязательно)</div>';
    } else {
      colZone.innerHTML = _pivotColFields.map(function(f) {
        return '<div class="pivot-chip pivot-chip-col" draggable="true" data-field="' + f.name + '" data-label="' + f.label + '" data-entity-type="' + (f.entity_type || '') + '" ondragstart="onPivotDragStart(event,this)">' +
          escapeHtml(f.label) +
          '<span class="pivot-chip-remove" data-field="' + f.name + '" data-zone="cols" onclick="pivotRemoveChip(this)">×</span></div>';
      }).join('');
    }
  }
}

function _getPivotVal(props, field) {
  var v = props[field];
  if (v === undefined || v === null || v === '') return '—';
  // Boolean fields — render as human-readable
  if (field === 'is_own') {
    var bv = String(v).toLowerCase();
    return bv === 'true' ? 'Наша организация' : 'Контрагент';
  }
  return String(v);
}

var _pivotCellData = {}; // stored for drill-down clicks

// Numeric fields — show sum instead of count when used as columns
var _numericFieldNames = new Set(['contract_amount','advance_amount','rent_monthly','extra_services_cost','total_area','area','vat_rate','payment_date']);

function _isNumericField(name) {
  if (_numericFieldNames.has(name)) return true;
  var f = _reportFields.find(function(r) { return r.name === name; });
  return f && f.field_type === 'number';
}

function _fmtNum(v) {
  if (!v && v !== 0) return '—';
  var n = parseFloat(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

var _pivotCellData = {}; // stored for drill-down clicks

async function buildPivotTable() {
  var rowFields = _pivotRowFields;
  var colFields = _pivotColFields;
  if (rowFields.length === 0) { alert('Перетащите хотя бы одно поле в Строки'); return; }

  // Split columns: categorical (cross-tab) vs numeric (sum)
  var catCols = colFields.filter(function(f) { return !_isNumericField(f.name); });
  var numCols = colFields.filter(function(f) { return _isNumericField(f.name); });

  // Equipment mode: if any row/col field is equipment-related, show equipment items not documents
  var _eqFields = new Set(['eq_name','eq_category','eq_status','eq_inv_number','eq_manufacturer','equipment']);
  var equipmentMode = rowFields.concat(colFields).some(function(f) { return _eqFields.has(f.name); });
  var unitLabel = equipmentMode ? 'единиц оборудования' : 'документов';

  var resultsEl = document.getElementById('pivotResults');
  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка данных...</div>';

  // Fetch all document types in parallel
  var allArrays = await Promise.all(
    _PIVOT_DOC_TYPES.map(function(tn) { return api('/entities?limit=2000&type=' + encodeURIComponent(tn)); })
  );
  var entities = [].concat.apply([], allArrays);

  // Expand rent_objects — keep original entity reference per row
  var rows = [];
  entities.forEach(function(e) {
    var props = Object.assign({}, e.properties || {});
    var ros = null;
    if (props.rent_objects) {
      try { ros = typeof props.rent_objects === 'string' ? JSON.parse(props.rent_objects) : props.rent_objects; } catch(ex) {}
    }
    if (ros && Array.isArray(ros) && ros.length > 0) {
      ros.forEach(function(ro) {
        var merged = Object.assign({}, props, ro);
        // Enrich with equipment entity fields (virtual eq_* fields)
        if (ro.equipment_id) {
          var eq = _equipment.find(function(x) { return x.id === parseInt(ro.equipment_id); });
          if (eq) {
            merged.eq_name = eq.name || '';
            var ep = eq.properties || {};
            merged.eq_category = ep.equipment_category || '';
            merged.eq_status   = ep.status || '';
            merged.eq_inv_number  = ep.inv_number || '';
            merged.eq_manufacturer = ep.manufacturer || '';
          }
        }
        rows.push({ props: merged, entity: e });
      });
    } else {
      rows.push({ props: props, entity: e });
    }
  });

  if (rows.length === 0) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных выбранного типа</div>';
    return;
  }

  var rowKeyMap = new Map();
  var catColKeyMap = new Map();
  var cells = {};  // cells[rk][catKey] = [entities...]
  var sums = {};   // sums[rk][fieldName] = total sum

  rows.forEach(function(row) {
    var rk = rowFields.map(function(f) { return _getPivotVal(row.props, f.name); }).join(' / ');
    var catKey = catCols.length > 0
      ? catCols.map(function(f) { return _getPivotVal(row.props, f.name); }).join(' / ')
      : '__total__';
    rowKeyMap.set(rk, rk);
    if (catCols.length > 0) catColKeyMap.set(catKey, catKey);

    if (!cells[rk]) cells[rk] = {};
    if (!cells[rk][catKey]) cells[rk][catKey] = [];
    if (equipmentMode) {
      // In equipment mode: store the equipment entity, not the document
      var eqId = parseInt(row.props.equipment_id);
      if (eqId) {
        var eqEnt = _equipment.find(function(x) { return x.id === eqId; });
        if (eqEnt && !cells[rk][catKey].find(function(x) { return x.id === eqEnt.id; }))
          cells[rk][catKey].push(eqEnt);
      }
    } else {
      if (!cells[rk][catKey].find(function(x) { return x.id === row.entity.id; }))
        cells[rk][catKey].push(row.entity);
    }

    // Accumulate numeric sums
    if (!sums[rk]) sums[rk] = {};
    numCols.forEach(function(f) {
      var v = parseFloat((row.props[f.name] || '').toString().replace(/\s/g,'').replace(',','.')) || 0;
      sums[rk][f.name] = (sums[rk][f.name] || 0) + v;
    });
  });

  var sortedRows = Array.from(rowKeyMap.keys()).sort(function(a, b) { return a.localeCompare(b, 'ru'); });
  var sortedCatCols = catCols.length > 0 ? Array.from(catColKeyMap.keys()).sort(function(a, b) { return a.localeCompare(b, 'ru'); }) : [];

  _pivotCellData = { rows: sortedRows, cols: sortedCatCols, cells: cells };

  var rowLabel = rowFields.map(function(f) { return f.label; }).join(' / ');
  var totalEntities = entities.length;
  var hasNum = numCols.length > 0;
  var hasCat = catCols.length > 0;

  var html = '<div class="detail-section" style="overflow-x:auto">';
  html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">' +
    totalEntities + ' ' + unitLabel.toLowerCase() + ' · ' + sortedRows.length + ' строк' +
    (sortedCatCols.length > 0 ? ' · ' + sortedCatCols.length + ' столбцов' : '') +
    (hasNum ? '' : ' <span style="opacity:0.6">— нажмите на цифру чтобы увидеть список</span>') + '</div>';
  html += '<table class="pivot-table">';

  // Header
  html += '<thead><tr><th>' + escapeHtml(rowLabel) + '</th>';
  sortedCatCols.forEach(function(ck) { html += '<th>' + escapeHtml(ck) + '</th>'; });
  numCols.forEach(function(f) { html += '<th>' + escapeHtml(f.label) + ', руб.</th>'; });
  if (!hasNum || hasCat) html += '<th>Итого, ' + escapeHtml(unitLabel.toLowerCase()) + '</th>';
  html += '</tr></thead>';

  // Body
  var grandCount = 0;
  var catColTotals = {};
  var numColTotals = {};
  html += '<tbody>';
  sortedRows.forEach(function(rk, ri) {
    var rowCells = cells[rk] || {};
    var rowCount = Object.values(rowCells).reduce(function(s, arr) { return s + arr.length; }, 0);
    grandCount += rowCount;
    html += '<tr><td><strong>' + escapeHtml(rk) + '</strong></td>';

    // Categorical columns (count)
    sortedCatCols.forEach(function(ck, ci) {
      var arr = rowCells[ck] || [];
      var v = arr.length;
      catColTotals[ck] = (catColTotals[ck] || 0) + v;
      html += v > 0
        ? '<td class="cell-value" data-ri="' + ri + '" data-ci="' + ci + '" onclick="showPivotCellDetail(this)">' + v + '</td>'
        : '<td class="cell-empty">—</td>';
    });

    // Numeric columns (sum)
    numCols.forEach(function(f) {
      var s = sums[rk] ? (sums[rk][f.name] || 0) : 0;
      numColTotals[f.name] = (numColTotals[f.name] || 0) + s;
      html += s > 0
        ? '<td style="text-align:right;font-weight:600;color:var(--accent)">' + _fmtNum(s) + '</td>'
        : '<td class="cell-empty">—</td>';
    });

    if (!hasNum || hasCat) {
      html += '<td class="row-total" data-ri="' + ri + '" data-ci="-1" onclick="showPivotCellDetail(this)" style="cursor:pointer">' + rowCount + '</td>';
    }
    html += '</tr>';
  });
  html += '</tbody>';

  // Footer
  html += '<tfoot><tr><th>Итого</th>';
  sortedCatCols.forEach(function(ck) { html += '<th>' + (catColTotals[ck] || 0) + '</th>'; });
  numCols.forEach(function(f) {
    html += '<th style="text-align:right">' + _fmtNum(numColTotals[f.name] || 0) + '</th>';
  });
  if (!hasNum || hasCat) html += '<th>' + grandCount + '</th>';
  html += '</tr></tfoot>';

  html += '</table></div>';
  html += '<div id="pivotDrillDown" style="margin-top:8px"></div>';
  resultsEl.innerHTML = html;
}

function showPivotCellDetail(el) {
  var ri = parseInt(el.dataset.ri);
  var ci = parseInt(el.dataset.ci);
  var rk = _pivotCellData.rows[ri];
  var allCols = _pivotCellData.cols;

  var entityList = [];
  if (ci === -1) {
    // Row total: collect all entities in this row
    var rowCells = _pivotCellData.cells[rk] || {};
    Object.values(rowCells).forEach(function(arr) {
      arr.forEach(function(e) { if (!entityList.find(function(x){ return x.id===e.id; })) entityList.push(e); });
    });
  } else {
    var ck = allCols[ci];
    entityList = (_pivotCellData.cells[rk] && _pivotCellData.cells[rk][ck]) ? _pivotCellData.cells[rk][ck] : [];
    if (allCols.length === 0) {
      // No columns, just row total
      var rowCells2 = _pivotCellData.cells[rk] || {};
      Object.values(rowCells2).forEach(function(arr) {
        arr.forEach(function(e) { if (!entityList.find(function(x){return x.id===e.id;})) entityList.push(e); });
      });
    }
  }

  var colLabel = ci >= 0 && allCols[ci] ? ' · ' + escapeHtml(allCols[ci]) : '';
  var html = '<div class="detail-section">';
  html += '<h3>' + escapeHtml(rk) + colLabel + ' <span style="font-size:13px;font-weight:400;color:var(--text-muted)">(' + entityList.length + ')</span></h3>';
  entityList.forEach(function(e) {
    html += '<div class="child-card" onclick="showEntity(' + e.id + ')" style="cursor:pointer;padding:8px 12px;margin-bottom:4px;display:flex;align-items:center;gap:8px">';
    html += '<span>' + (e.icon || '📄') + '</span>';
    html += '<span style="font-weight:500">' + escapeHtml(e.name) + '</span>';
    var p = e.properties || {};
    var tags = [];
    if (p.contract_date) tags.push(p.contract_date);
    if (p.contract_amount) tags.push(p.contract_amount + ' р.');
    if (p.status) tags.push(p.status);
    if (tags.length) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + escapeHtml(tags.join(' · ')) + '</span>';
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('pivotDrillDown').innerHTML = html;
  document.getElementById('pivotDrillDown').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function runLinkedReport(type) {
  var resultsEl = document.getElementById('linkedResults');
  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';
  var data = await api('/reports/linked?type=' + type);
  var groups = data.groups || [];

  if (groups.length === 0) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных. Добавьте оборудование и назначьте расположение через "Входит в".</div>';
    return;
  }

  var titles = { equipment_by_location: 'Оборудование по корпусам', equipment_by_tenant: 'Оборудование у арендаторов' };
  var html = '<div class="detail-section"><h3>' + (titles[type] || type) + '</h3>';

  if (type === 'equipment_by_location') {
    groups.forEach(function(g) {
      html += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
      html += '<div style="background:var(--bg-hover);padding:10px 14px;font-weight:600;display:flex;justify-content:space-between">';
      html += '<span>' + escapeHtml(g.icon || '🏢') + ' ' + escapeHtml(g.name) + ' <span style="font-size:11px;color:var(--text-muted);font-weight:400">(' + (g.type || '') + ')</span></span>';
      html += '<span style="font-size:12px;color:var(--text-muted)">' + g.items.length + ' ед.</span></div>';
      html += '<div style="padding:8px 14px">';
      if (g.items.length === 0) {
        html += '<div style="color:var(--text-muted);font-size:13px;padding:4px 0">Оборудование не указано</div>';
      } else {
        g.items.forEach(function(item) {
          var p = item.props || {};
          var isBroken = _brokenEqIds.has(item.id);
          var isEmerg = (p.status === 'Аварийное');
          var tags = [];
          if (p.equipment_category) tags.push(p.equipment_category);
          if (p.inv_number) tags.push('инв. ' + p.inv_number);
          if (p.status && p.status !== 'В работе') tags.push(p.status);
          var nameColor = isBroken ? '#dc2626' : (isEmerg ? '#b85c5c' : '');
          html += '<div class="child-card" onclick="showEntity(' + item.id + ')" style="margin-bottom:4px;cursor:pointer;padding:6px 10px;display:flex;align-items:center;gap:8px' + (isBroken ? ';background:rgba(239,68,68,.07)' : (isEmerg ? ';background:rgba(184,92,92,.05)' : '')) + '">';
          html += '<span>' + (item.icon || '⚙️') + '</span>';
          html += '<span style="font-weight:500;font-size:13px' + (nameColor ? ';color:' + nameColor : '') + '">' + escapeHtml(item.name) + (isBroken ? ' <span class="eq-broken-badge">\u26a0 \u041d\u0435\u0440\u0430\u0431\u043e\u0447\u0438\u0439</span>' : (isEmerg ? ' <span class="eq-emergency-badge">\u26a0 \u0410\u0432\u0430\u0440\u0438\u044f</span>' : '')) + '</span>';
          if (tags.length) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + escapeHtml(tags.join(' · ')) + '</span>';
          html += '</div>';
        });
      }
      html += '</div></div>';
    });
  }

  if (type === 'equipment_by_tenant') {
    groups.forEach(function(g) {
      html += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
      html += '<div style="background:var(--bg-hover);padding:10px 14px;font-weight:600;display:flex;justify-content:space-between">';
      html += '<span>🏛 ' + escapeHtml(g.name) + '</span>';
      html += '<span style="font-size:12px;color:var(--text-muted)">' + g.items.length + ' ед. оборудования · ' + (g.contracts || []).length + ' договоров</span></div>';
      html += '<div style="padding:8px 14px">';
      // Show contracts
      if (g.contracts && g.contracts.length > 0) {
        html += '<div style="margin-bottom:8px">';
        g.contracts.forEach(function(c) {
          html += '<div style="font-size:12px;color:var(--text-secondary);padding:2px 0">📄 <a href="#" onclick="showEntity(' + c.id + ');return false" style="color:var(--accent)">' + escapeHtml(c.name) + '</a></div>';
        });
        html += '</div>';
      }
      if (g.items.length === 0) {
        html += '<div style="color:var(--text-muted);font-size:13px;padding:4px 0">Оборудование в арендуемых помещениях не найдено</div>';
      } else {
        g.items.forEach(function(item) {
          var p = item.props || {};
          var isBroken = _brokenEqIds.has(item.id);
          var isEmerg = (p.status === 'Аварийное');
          var tags = [];
          if (p.equipment_category) tags.push(p.equipment_category);
          if (item.building_name) tags.push(item.building_name);
          if (p.status && p.status !== 'В работе') tags.push(p.status);
          var nameColor = isBroken ? '#dc2626' : (isEmerg ? '#b85c5c' : '');
          html += '<div class="child-card" onclick="showEntity(' + item.id + ')" style="margin-bottom:4px;cursor:pointer;padding:6px 10px;display:flex;align-items:center;gap:8px' + (isBroken ? ';background:rgba(239,68,68,.07)' : (isEmerg ? ';background:rgba(184,92,92,.05)' : '')) + '">';
          html += '<span>' + (item.icon || '⚙️') + '</span>';
          html += '<span style="font-weight:500;font-size:13px' + (nameColor ? ';color:' + nameColor : '') + '">' + escapeHtml(item.name) + (isBroken ? ' <span class="eq-broken-badge">\u26a0 \u041d\u0435\u0440\u0430\u0431\u043e\u0447\u0438\u0439</span>' : (isEmerg ? ' <span class="eq-emergency-badge">\u26a0 \u0410\u0432\u0430\u0440\u0438\u044f</span>' : '')) + '</span>';
          if (tags.length) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + escapeHtml(tags.join(' · ')) + '</span>';
          html += '</div>';
        });
      }
      html += '</div></div>';
    });
  }

  html += '</div>';
  resultsEl.innerHTML = html;
}

// Which entity type owns each groupBy field (fields inside contract props/rent_objects)
var _fieldEntityType = {
  building: 'contract', room: 'contract', object_type: 'contract',
  rent_scope: 'contract', contractor_name: 'contract', our_legal_entity: 'contract',
  contract_type: 'contract', subtenant_name: 'contract', our_role_label: 'contract',
  contractor_role_label: 'contract', tenant: 'contract', number: 'contract',
  contract_date: 'contract',
};

function onGroupByChange() {
  var groupBy = document.getElementById('reportGroupBy').value;
  var filterTypeEl = document.getElementById('reportFilterType');
  if (groupBy && _fieldEntityType[groupBy]) {
    filterTypeEl.value = _fieldEntityType[groupBy];
  }
  runReport();
}

async function runReport() {
  var groupBy = document.getElementById('reportGroupBy').value;
  var filterType = document.getElementById('reportFilterType').value;
  var resultsEl = document.getElementById('reportResults');
  if (!groupBy) { resultsEl.innerHTML = ''; return; }

  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';

  var url = '/reports/pivot?groupBy=' + encodeURIComponent(groupBy);
  if (filterType) url += '&filterType=' + encodeURIComponent(filterType);

  var data = await api(url);
  if (!data.groups || data.groups.length === 0) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных для группировки по этому полю</div>';
    return;
  }

  var label = _reportFieldLabels[groupBy] || groupBy;
  var html = '<div class="detail-section">';
  html += '<h3>' + escapeHtml(label) + ' (' + data.groups.length + ' значений)</h3>';

  data.groups.forEach(function(group) {
    html += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
    html += '<div style="background:var(--bg-hover);padding:10px 14px;font-weight:600;display:flex;justify-content:space-between;align-items:center">';
    html += '<span>' + escapeHtml(group.value) + '</span>';
    html += '<span style="font-size:12px;color:var(--text-muted)">' + group.entities.length + ' записей</span>';
    html += '</div>';

    // Group entities by type
    var byType = {};
    group.entities.forEach(function(e) {
      var key = e.type_name;
      if (!byType[key]) byType[key] = { name_ru: e.type_name_ru, icon: e.icon, color: e.color, items: [] };
      byType[key].items.push(e);
    });

    html += '<div style="padding:10px 14px">';
    Object.keys(byType).forEach(function(typeName) {
      var bt = byType[typeName];
      html += '<div style="margin-bottom:8px">';
      html += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px">' + bt.icon + ' ' + bt.name_ru + ' (' + bt.items.length + ')</div>';
      bt.items.forEach(function(e) {
        html += '<div class="child-card" onclick="showEntity(' + e.id + ')" style="margin-bottom:4px;cursor:pointer;padding:6px 10px">';
        html += '<span style="font-size:14px">' + bt.icon + '</span> ';
        html += '<span style="font-weight:500;font-size:13px">' + escapeHtml(e.name) + '</span>';
        // Show key properties
        var props = e.properties || {};
        var tags = [];
        if (props.number) tags.push('№' + props.number);
        if (props.contract_date) tags.push(props.contract_date);
        if (props.contract_type) tags.push(props.contract_type);
        if (tags.length) html += ' <span style="font-size:11px;color:var(--text-muted)">' + tags.join(' · ') + '</span>';
        html += '</div>';
      });
      html += '</div>';
    });
    html += '</div></div>';
  });

  html += '</div>';
  resultsEl.innerHTML = html;
}

// ============ MODALS ============

var _modalSize = 'normal';

function setModalContent(html) {
  var sizes = ['normal', 'wide', 'full'];
  var labels = {'normal': '▭', 'wide': '⊟', 'full': '⛶'};
  var titles = {'normal': 'Стандарт', 'wide': 'Широкий', 'full': 'На всю страницу'};
  var resizeBar = '<div class="modal-resize-bar">';
  sizes.forEach(function(s) {
    var active = (_modalSize === s) ? ' is-active' : '';
    resizeBar += '<button class="modal-resize-btn' + active + '" data-modal-size="' + s + '" title="' + titles[s] + '">' + labels[s] + '</button>';
  });
  resizeBar += '</div>';
  var el = document.getElementById('modal');
  el.innerHTML = resizeBar + html;
  el.classList.toggle('modal--wide', _modalSize === 'wide');
  el.classList.toggle('modal--full', _modalSize === 'full');
  document.getElementById('modalOverlay').classList.add('show');
  el.querySelectorAll('[data-modal-size]').forEach(function(btn) {
    btn.addEventListener('click', function() { setModalSize(btn.getAttribute('data-modal-size')); });
  });
}

function setModalSize(size) {
  _modalSize = size;
  var modal = document.getElementById('modal');
  modal.classList.toggle('modal--wide', size === 'wide');
  modal.classList.toggle('modal--full', size === 'full');
  document.querySelectorAll('[data-modal-size]').forEach(function(btn) {
    btn.classList.toggle('is-active', btn.getAttribute('data-modal-size') === size);
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  _actEquipmentList = null;
  _submitting = false;
}

async function openCreateModal(typeName) {
  _contractFormTypeName = typeName;
  clearEntityCache();
  const type = entityTypes.find(t => t.name === typeName);
  const fields = await api('/entity-types/' + type.id + '/fields');
  const allEntities = await api('/entities');
  await loadEntityLists();
  await loadContractEntities();

  const isContractLike = (typeName === 'contract' || typeName === 'supplement');
  let html = '<h3>Новый: ' + type.name_ru + '</h3>';
  if (isContractLike) {
    html += '<input type="hidden" id="f_name" value="">';
  } else {
    html += '<div class="form-group"><label>Название</label><input id="f_name" required></div>';
  }

  // Parent selector (hide for contracts; special label for buildings)
  if (!isContractLike) {
    if (typeName === 'building' || typeName === 'workshop') {
      html += '<div class="form-group"><label>Собственник</label><select id="f_parent"><option value="">— не указано —</option>';
      _allCompanies.forEach(function(c) {
        html += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>';
      });
      html += '</select></div>';
    } else {
      html += '<div class="form-group"><label>Входит в (родительский объект)</label><select id="f_parent"><option value="">— нет (корневой объект) —</option>';
      allEntities.filter(function(x) { return x.type_name !== 'contract' && x.type_name !== 'supplement'; }).forEach(function(x) {
        html += '<option value="' + x.id + '">' + x.icon + ' ' + escapeHtml(x.name) + ' (' + x.type_name_ru + ')</option>';
      });
      html += '</select></div>';
    }
  }
  if (isContractLike) {
    renderContractFormFields(fields, {}, html);
    return;
  }

  fields.forEach(f => {
    if (f.name === 'balance_owner' || f.name === 'owner') {
      var fieldId = f.name === 'owner' ? 'f_owner' : 'f_balance_owner';
      html += '<div class="form-group"><label>Собственник</label>' +
        renderEntitySelect(fieldId, _allCompanies, '', '', 'выберите организацию') + '</div>';
    } else {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(enrichFieldOptions(f), '') + '</div>';
    }
  });

  // Building: land plot selector
  if (typeName === 'building' || typeName === 'workshop') {
    html += renderLandPlotSelectorField(null);
  }

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreate(\\'' + typeName + '\\')">Создать</button></div>';

  setModalContent(html);
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

  // Collect entity IDs and names for linked fields
  if (isContractLike) {
    collectEntityIds(properties);
  }
  if (typeName === 'equipment') {
    collectEquipmentIds(properties);
  }
  // Collect owner entity for land_plot and building-like
  var ownerEl = document.getElementById('f_owner');
  if (ownerEl && ownerEl.value) {
    var ownerEnt = _allCompanies.find(function(c) { return c.id === parseInt(ownerEl.value); });
    if (ownerEnt) { properties.owner_id = ownerEnt.id; properties.owner_name = ownerEnt.name; }
    delete properties.owner;
  }

  // Auto-generate name for contracts
  let name = document.getElementById('f_name').value.trim();
  if (isContractLike) {
    const num = properties.number || '?';
    const contractor = properties.contractor_name || '';
    name = (typeName === 'supplement' ? 'ДС' : 'Договор') + ' №' + num + (contractor ? ' — ' + contractor : '');
  }
  if (!name) return alert('Введите название');

  var createdEntity;
  try {
    createdEntity = await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: type.id, name, properties, parent_id }) });
  } catch(err) {
    if (err.status === 409 && err.data && err.data.existing) {
      var ex = err.data.existing;
      if (confirm('Уже существует: ' + ex.name + '. Открыть существующую?')) {
        closeModal();
        showEntity(ex.id);
      }
      return;
    }
    throw err;
  }

  // Handle located_on relation for building/workshop
  if ((typeName === 'building' || typeName === 'workshop') && createdEntity && createdEntity.id) {
    var lpSel = document.getElementById('f_land_plot_id');
    if (lpSel && lpSel.value) {
      await api('/relations', { method: 'POST', body: JSON.stringify({
        from_entity_id: createdEntity.id, to_entity_id: parseInt(lpSel.value), relation_type: 'located_on'
      }) }).catch(function() {});
    }
  }

  closeModal();
  showEntityList(typeName);
}

async function openEditModal(id) {
  clearEntityCache();
  const e = await api('/entities/' + id);
  const fields = e.fields || [];
  const allEntities = await api('/entities');
  await loadContractEntities();
  await loadEntityLists();

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
        editHtml += '<div class="form-group" id="wrap_our_legal_entity"><label id="label_our_legal_entity">' + escapeHtml(label) + '</label>' +
          renderEntitySelect('f_our_legal_entity', _ownCompanies, props.our_legal_entity_id, val, 'выберите', 'onEntitySelectChange(&quot;our_legal_entity&quot;)') + '</div>';
      } else if (f.name === 'contractor_name') {
        var label = (props.contractor_role_label || roles.contractor);
        editHtml += '<div class="form-group" id="wrap_contractor_name"><label id="label_contractor_name">' + escapeHtml(label) + '</label>' +
          renderEntitySelect('f_contractor_name', _allCompanies, props.contractor_id, val, 'выберите', 'onEntitySelectChange(&quot;contractor_name&quot;)') + '</div>';
      } else if (f.name === 'subtenant_name') {
        var show = (contractType === 'Субаренды');
        editHtml += '<div class="form-group" id="wrap_subtenant_name" style="' + (show ? '' : 'display:none') + '"><label>Субарендатор</label>' +
          renderEntitySelect('f_subtenant_name', _allCompanies, props.subtenant_id, val, 'выберите', 'onEntitySelectChange(&quot;subtenant_name&quot;)') + '</div>';
      } else {
        // Skip fields already covered by CONTRACT_TYPE_FIELDS for this type (e.g. vat_rate for Аренды)
        var ctTypeFieldsEdit = CONTRACT_TYPE_FIELDS[contractType] || [];
        if (ctTypeFieldsEdit.find(function(cf) { return cf.name === f.name; })) return;
        // Default vat_rate to 22
        if (f.name === 'vat_rate' && !val) val = '22';
        editHtml += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
      }
    });

    editHtml += '<div id="dynamicFieldsContainer"></div>';
    editHtml += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
      '<button class="btn btn-primary" onclick="submitEdit(' + id + ')">Сохранить</button></div>';

    setModalContent(editHtml);

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
  var isAct = (e.type_name === 'act');
  var isBuildingLike = (e.type_name === 'building' || e.type_name === 'workshop');

  if (!isAct) {
    if (isBuildingLike) {
      html += '<div class="form-group"><label>Собственник</label><select id="f_parent"><option value="">— не указано —</option>';
      _allCompanies.forEach(function(c) {
        html += '<option value="' + c.id + '"' + (c.id === e.parent_id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
      });
      html += '</select></div>';
    } else {
      html += '<div class="form-group"><label>Входит в (родительский объект)</label><select id="f_parent"><option value="">— нет (корневой объект) —</option>';
      allEntities.filter(function(x) { return x.id !== id && x.type_name !== 'contract' && x.type_name !== 'supplement'; }).forEach(function(x) {
        html += '<option value="' + x.id + '"' + (x.id === e.parent_id ? ' selected' : '') + '>' + x.icon + ' ' + escapeHtml(x.name) + ' (' + x.type_name_ru + ')</option>';
      });
      html += '</select></div>';
    }
  }
  if (isAct && props.parent_contract_name) {
    html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;padding:8px;background:var(--bg-hover);border-radius:6px">Договор-основание: <strong>' + escapeHtml(props.parent_contract_name) + '</strong></div>';
  }

  // For buildings: find existing located_on relation
  var existingLandPlotId = null;
  if (isBuildingLike) {
    var eRels = e.relations || [];
    var lpRel = eRels.find(function(r) { return r.relation_type === 'located_on' && r.from_entity_id === id; });
    if (lpRel) existingLandPlotId = lpRel.to_entity_id || null;
  }

  fields.forEach(f => {
    const val = props[f.name] || '';
    // For acts: hide service fields, make total_amount readonly display
    if (isAct) {
      if (f.name === 'parent_contract_id' || f.name === 'parent_contract_name') return;
      if (f.name === 'total_amount') {
        var items = [];
        try { items = JSON.parse(props.act_items || '[]'); } catch(ex) {}
        var total = items.reduce(function(s, i) { return s + (parseFloat(i.amount) || 0); }, 0);
        html += '<div class="form-group"><label>Итого по акту, ₽</label><input type="number" id="f_total_amount" value="' + total + '" readonly style="background:var(--bg-hover);color:var(--text-muted)"></div>';
        return;
      }
    }
    if (f.name === 'balance_owner') {
      html += '<div class="form-group"><label>Собственник</label>' +
        renderEntitySelect('f_balance_owner', _ownCompanies, props.balance_owner_id || '', val, 'наше юр. лицо') + '</div>';
    } else if (f.name === 'owner') {
      html += '<div class="form-group"><label>Собственник</label>' +
        renderEntitySelect('f_owner', _allCompanies, props.owner_id || '', props.owner_name || '', 'выберите организацию') + '</div>';
    } else {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(enrichFieldOptions(f), val) + '</div>';
    }
  });

  // Building: land plot selector
  if (isBuildingLike) {
    html += renderLandPlotSelectorField(existingLandPlotId);
  }

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitEdit(' + id + ')">Сохранить</button></div>';

  setModalContent(html);
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
  const fParentEl = document.getElementById('f_parent');
  const parent_id = isContractLike ? (e.parent_id || null) : (e.type_name === 'act' ? e.parent_id : (fParentEl ? fParentEl.value || null : null));
  const properties = {};
  fields.forEach(f => { properties[f.name] = getFieldValue(f); });
  // For acts: preserve hidden service fields
  if (e.type_name === 'act') {
    var origProps = e.properties || {};
    if (origProps.parent_contract_id) properties.parent_contract_id = origProps.parent_contract_id;
    if (origProps.parent_contract_name) properties.parent_contract_name = origProps.parent_contract_name;
  }

  // Collect dynamic contract-type fields
  if (isContractLike && properties.contract_type) {
    Object.assign(properties, collectDynamicFieldValues(properties.contract_type));
  }

  // Collect entity IDs
  if (isContractLike) {
    collectEntityIds(properties);
  }
  if (e.type_name === 'equipment') {
    collectEquipmentIds(properties);
  }
  // Collect owner entity for land_plot / building-like
  var ownerEditEl = document.getElementById('f_owner');
  if (ownerEditEl && ownerEditEl.value) {
    var ownerEditEnt = _allCompanies.find(function(c) { return c.id === parseInt(ownerEditEl.value); });
    if (ownerEditEnt) { properties.owner_id = ownerEditEnt.id; properties.owner_name = ownerEditEnt.name; }
    delete properties.owner;
  } else if (e.properties && e.properties.owner_id) {
    // Preserve if not changed
    properties.owner_id = e.properties.owner_id;
    properties.owner_name = e.properties.owner_name;
  }

  // Auto-generate name for contracts and acts
  let name = document.getElementById('f_name').value.trim();
  if (isContractLike) {
    const num = properties.number || '?';
    const contractor = properties.contractor_name || '';
    name = (e.type_name === 'supplement' ? 'ДС' : 'Договор') + ' №' + num + (contractor ? ' — ' + contractor : '');
  }
  if (e.type_name === 'act') {
    var actNum = (properties.act_number || '').trim() || '\u0431/\u043d';
    var actDate = properties.act_date || '';
    var actContract = (properties.parent_contract_name || (e.properties || {}).parent_contract_name || '').trim();
    name = '\u0410\u043a\u0442 \u2116' + actNum + (actDate ? ' \u043e\u0442 ' + actDate : '') + (actContract ? ' \u2014 ' + actContract : '');
  }

  await api('/entities/' + id, { method: 'PUT', body: JSON.stringify({ name, properties, parent_id }) });

  // Handle located_on relation for building/workshop
  if (e.type_name === 'building' || e.type_name === 'workshop') {
    var lpSelEdit = document.getElementById('f_land_plot_id');
    if (lpSelEdit) {
      // Delete existing located_on from this building
      var existRels = e.relations || [];
      for (var ri = 0; ri < existRels.length; ri++) {
        if (existRels[ri].relation_type === 'located_on' && existRels[ri].from_entity_id === id) {
          await api('/relations/' + existRels[ri].id, { method: 'DELETE' }).catch(function() {});
        }
      }
      // Create new if selected
      if (lpSelEdit.value) {
        await api('/relations', { method: 'POST', body: JSON.stringify({
          from_entity_id: id, to_entity_id: parseInt(lpSelEdit.value), relation_type: 'located_on'
        }) }).catch(function() {});
      }
    }
  }

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
  clearEntityCache();
  await loadContractEntities();
  await loadEntityLists();
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
      html += '<div class="form-group" id="wrap_our_legal_entity"><label id="label_our_legal_entity">' + escapeHtml(label) + '</label>' +
        renderEntitySelect('f_our_legal_entity', _ownCompanies, parentProps.our_legal_entity_id, val, 'выберите', 'onEntitySelectChange(&quot;our_legal_entity&quot;)') + '</div>';
    } else if (f.name === 'contractor_name') {
      var label = (parentProps.contractor_role_label || roles.contractor);
      html += '<div class="form-group" id="wrap_contractor_name"><label id="label_contractor_name">' + escapeHtml(label) + '</label>' +
        renderEntitySelect('f_contractor_name', _allCompanies, parentProps.contractor_id, val, 'выберите', 'onEntitySelectChange(&quot;contractor_name&quot;)') + '</div>';
    } else if (f.name === 'subtenant_name') {
      var show = (contractType === 'Субаренды');
      html += '<div class="form-group" id="wrap_subtenant_name" style="' + (show ? '' : 'display:none') + '"><label>Субарендатор</label>' +
        renderEntitySelect('f_subtenant_name', _allCompanies, parentProps.subtenant_id, val, 'выберите', 'onEntitySelectChange(&quot;subtenant_name&quot;)') + '</div>';
    } else {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
    }
  });

  html += '<div id="dynamicFieldsContainer"></div>';
  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreateSupplement(' + parentContractId + ')">Создать</button></div>';

  setModalContent(html);

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

// ============ ACTS ============

async function openCreateActModal(parentContractId) {
  try {
  clearEntityCache();
  entityTypes = await api('/entity-types');  // принудительно обновить типы
  await loadEntityLists();
  const parentEntity = await api('/entities/' + parentContractId);
  const parentProps = parentEntity.properties || {};
  const actType = entityTypes.find(function(t) { return t.name === 'act'; });
  if (!actType) return alert('Тип "Акт" не найден. Возможно, сервер ещё не перезапустился после добавления миграции.');

  // Filter equipment to only those linked to this contract via equipment_list
  var contractEqItems = [];
  try { contractEqItems = JSON.parse(parentProps.equipment_list || '[]'); } catch(ex) {}
  var contractEqIds = contractEqItems.map(function(i) { return parseInt(i.equipment_id); }).filter(Boolean);
  _actEquipmentList = contractEqIds.length > 0
    ? _equipment.filter(function(e) { return contractEqIds.indexOf(e.id) !== -1; })
    : null;  // null = show all if contract has no equipment_list

  var eqNote = contractEqIds.length > 0
    ? '<span style="color:var(--accent)">' + (_actEquipmentList ? _actEquipmentList.length : 0) + ' ед. из договора</span>'
    : '<span style="color:var(--text-muted)">весь реестр (по договору нет оборудования)</span>';

  var html = '<h3>Новый акт</h3>';
  html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;padding:8px;background:var(--bg-hover);border-radius:6px">Договор-основание: <strong>' + escapeHtml(parentEntity.name) + '</strong><br>Оборудование: ' + eqNote + '</div>';
  html += '<div class="form-group"><label>Номер акта *</label><input id="f_act_number" placeholder="№ акта"></div>';
  html += '<div class="form-group"><label>Дата акта</label><input type="date" id="f_act_date"></div>';
  html += '<div class="form-group"><label>Комментарий</label><textarea id="f_comment" placeholder="примечание к акту" style="width:100%;resize:both;min-height:48px;box-sizing:border-box"></textarea></div>';
  html += '<div class="form-group"><label>Заключение</label><textarea id="f_conclusion" placeholder="итоговое заключение по акту..." style="width:100%;resize:both;min-height:72px;box-sizing:border-box"></textarea></div>';
  html += '<div class="form-group"><label>Итого по акту, ₽</label><input type="number" id="f_total_amount" value="0" readonly style="background:var(--bg-hover);color:var(--text-muted)"></div>';
  html += '<div class="form-group"><label>Оборудование и работы *</label>' + renderActItemsField([]) + '</div>';

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>';
  html += '<button class="btn btn-primary" onclick="if(!_submitting){_submitting=true;_doSubmitCreateAct(' + parentContractId + ').finally(function(){_submitting=false;})}">Создать акт</button></div>';

  setModalContent(html);
  } catch(err) { alert('Ошибка открытия формы акта: ' + (err && err.message ? err.message : String(err))); }
}

async function _doSubmitCreateAct(parentContractId) {
  try {
    var actNumber = (document.getElementById('f_act_number') || {}).value || '';
    if (!actNumber.trim()) { alert('Введите номер акта'); return; }
    var actItems = getActItemsValue();
    if (actItems.length === 0) { alert('Добавьте хотя бы одну единицу оборудования. Убедитесь что в строке выбрано оборудование из списка.'); return; }

    var actDate = (document.getElementById('f_act_date') || {}).value || '';
    var comment = (document.getElementById('f_comment') || {}).value || '';
    var conclusion = (document.getElementById('f_conclusion') || {}).value || '';
    var total = actItems.reduce(function(s, i) { return s + (i.amount || 0); }, 0);
    var parentEntity = await api('/entities/' + parentContractId);

    var properties = {
      act_number: actNumber.trim(),
      act_date: actDate,
      comment: comment,
      conclusion: conclusion,
      parent_contract_id: String(parentContractId),
      parent_contract_name: parentEntity.name,
      act_items: JSON.stringify(actItems),
      total_amount: String(total),
    };

    // Refresh entityTypes if act type missing
    if (!entityTypes.find(function(t) { return t.name === 'act'; })) {
      entityTypes = await api('/entity-types');
    }
    var actType = entityTypes.find(function(t) { return t.name === 'act'; });
    if (!actType) { alert('Тип "Акт" не найден в entity-types. Попробуйте обновить страницу.'); return; }

    var actName = 'Акт №' + actNumber.trim() + (actDate ? ' от ' + actDate : '') + ' — ' + parentEntity.name;
    var created;
    try {
      created = await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: actType.id, name: actName, properties: properties, parent_id: parentContractId }) });
    } catch(postErr) {
      if (postErr.status === 409 && postErr.data && postErr.data.existing) {
        var ex = postErr.data.existing;
        if (confirm('Акт с таким номером и датой уже существует: ' + ex.name + '. Открыть существующий акт?')) {
          closeModal();
          showEntity(ex.id);
        }
        return;
      }
      throw postErr;
    }
    closeModal();
    showEntity(parentContractId);
  } catch(err) {
    alert('Ошибка сохранения акта: ' + (err && err.message ? err.message : JSON.stringify(err)));
  }
}

// ============ RENT ANALYSIS REPORT ============

var _rentAllRows = [];
var _rentFilters = {};   // { field: Set<string> | null }  null = all selected
var _rentGroupBy = [];   // array of field keys
var _rentSortField = null;
var _rentSortAsc = true;
var _rentColWidths = {}; // col.key -> px width (user-resized)

var RENT_COLS = [
  { key: 'contract_name',    label: '\u2116 \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430',   w: 180, link: true },
  { key: 'contract_date',    label: '\u0414\u0430\u0442\u0430',                                   w: 90,  fmt: 'date' },
  { key: 'our_legal_entity', label: '\u0410\u0440\u0435\u043d\u0434\u043e\u0434\u0430\u0442\u0435\u043b\u044c',                             w: 160 },
  { key: 'contractor_name',  label: '\u0410\u0440\u0435\u043d\u0434\u0430\u0442\u043e\u0440',     w: 160 },
  { key: 'subtenant_name',   label: '\u0421\u0443\u0431\u0430\u0440\u0435\u043d\u0434\u0430\u0442\u043e\u0440',                             w: 130 },
  { key: 'object_type',      label: '\u0422\u0438\u043f',                                         w: 110 },
  { key: 'building',         label: '\u041a\u043e\u0440\u043f\u0443\u0441',                       w: 80  },
  { key: 'area',             label: '\u041f\u043b\u043e\u0449\u0430\u0434\u044c, \u043c\xb2',     w: 80,  fmt: 'num1' },
  { key: 'rent_rate',        label: '\u0421\u0442\u0430\u0432\u043a\u0430, \u20bd/\u043c\xb2/\u043c\u0435\u0441',                           w: 100, fmt: 'num0' },
  { key: 'net_rate',         label: '\u0421\u0442\u0430\u0432\u043a\u0430 \u0447\u0438\u0441\u0442\u0430\u044f, \u20bd/\u043c\xb2/\u043c\u0435\u0441', w: 120, fmt: 'num0' },
  { key: 'utility_rate',     label: '\u041a\u0423 \u0432 \u043f\u043b\u0430\u0442\u0435\u0436\u0435/\u0441\u0442\u0430\u0432\u043a\u0435',  w: 130 },
  { key: 'external_rental',  label: '\u0410\u0440\u0435\u043d\u0434\u0430 \u0432\u043d\u0435\u0448\u043d\u044f\u044f',                      w: 100, fmt: 'bool' },
  { key: 'monthly_amount',   label: '\u0421\u0443\u043c\u043c\u0430/\u043c\u0435\u0441, \u20bd', w: 110, fmt: 'num0' },
  { key: 'contract_end_date',label: '\u0421\u0440\u043e\u043a \u0434\u043e',                      w: 90,  fmt: 'date' },
  { key: 'comment',          label: '\u041f\u0440\u0438\u043c\u0435\u0447\u0430\u043d\u0438\u0435',                                         w: 180 },
];
var RENT_GROUP_FIELDS = [
  { key: 'our_legal_entity', label: '\u0410\u0440\u0435\u043d\u0434\u043e\u0434\u0430\u0442\u0435\u043b\u044c' },
  { key: 'contractor_name',  label: '\u0410\u0440\u0435\u043d\u0434\u0430\u0442\u043e\u0440' },
  { key: 'building',         label: '\u041a\u043e\u0440\u043f\u0443\u0441' },
  { key: 'object_type',      label: '\u0422\u0438\u043f \u043f\u043e\u043c\u0435\u0449\u0435\u043d\u0438\u044f' },
  { key: 'contract_type',    label: '\u0422\u0438\u043f \u0434\u043e\u0433\u043e\u0432\u043e\u0440\u0430' },
  { key: 'external_rental',  label: '\u0410\u0440\u0435\u043d\u0434\u0430 \u0432\u043d\u0435\u0448\u043d\u044f\u044f' },
];

async function buildRentAnalysis() {
  var resultsEl = document.getElementById('rentResults');
  resultsEl.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...</div>';
  try {
    _rentAllRows = await api('/reports/rent-analysis');
    _rentFilters = {};
    _rentGroupBy = [];
    _renderRentGroupZone();
    _renderRentGroupFieldBtns();
    _rentRender();
  } catch(err) {
    resultsEl.innerHTML = '<div style="color:red;padding:16px">\u041e\u0448\u0438\u0431\u043a\u0430: ' + escapeHtml(err.message || String(err)) + '</div>';
  }
}

function _rentGetVisible() {
  return _rentAllRows.filter(function(r) {
    return Object.keys(_rentFilters).every(function(field) {
      var set = _rentFilters[field];
      if (!set || set.size === 0) return true;
      return set.has(String(r[field] || ''));
    });
  });
}

function _rentRender() {
  var visible = _rentGetVisible();
  if (_rentSortField) {
    visible = visible.slice().sort(function(a,b) {
      var va = a[_rentSortField] || '', vb = b[_rentSortField] || '';
      var n = parseFloat(va) - parseFloat(vb);
      if (!isNaN(n)) return _rentSortAsc ? n : -n;
      return _rentSortAsc ? String(va).localeCompare(String(vb), 'ru') : String(vb).localeCompare(String(va), 'ru');
    });
  }
  document.getElementById('rentResults').innerHTML = _buildRentTableHtml(visible);
}

function _fmtRentNum(v, dec) {
  if (!v && v !== 0) return '\u2014';
  var n = parseFloat(v);
  if (isNaN(n) || n === 0) return '\u2014';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function _fmtRentDate(d) { return d ? d.split('-').reverse().join('.') : ''; }

function _buildRentTableHtml(rows) {
  var fmtVal = function(col, row) {
    var v = row[col.key];
    if (col.fmt === 'date') return _fmtRentDate(v);
    if (col.fmt === 'num0') return v ? _fmtRentNum(v, 0) : '<span style="color:var(--text-muted)">—</span>';
    if (col.fmt === 'num1') return v ? _fmtRentNum(v, 1) : '<span style="color:var(--text-muted)">—</span>';
    if (col.fmt === 'bool') return (v === true || v === 'true') ? '\u2705 \u0414\u0430' : '<span style="color:var(--text-muted)">\u041d\u0435\u0442</span>';
    if (col.link) {
      var badge = row.from_supplement
        ? '<div style="font-size:10px;color:var(--text-muted);margin-top:1px">\ud83d\udccb \u0414\u0421: ' + escapeHtml(row.supp_name || '') + (row.supp_date ? ' \u043e\u0442 ' + _fmtRentDate(row.supp_date) : '') + '</div>'
        : '';
      return '<a href="#" onclick="showEntity(' + row.contract_id + ');return false" style="color:var(--accent)">' + escapeHtml(v || '') + '</a>' + badge;
    }
    return escapeHtml(v || '');
  };

  // Summary
  var totalArea = rows.reduce(function(s,r){ return s + (r.area||0); }, 0);
  var totalMonthly = rows.reduce(function(s,r){ return s + (r.monthly_amount||0); }, 0);

  var h = '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">';
  h += '<div class="stat-card"><div class="stat-label">\u0421\u0442\u0440\u043e\u043a</div><div class="stat-value">' + rows.length + '</div></div>';
  h += '<div class="stat-card"><div class="stat-label">\u041f\u043b\u043e\u0449\u0430\u0434\u044c, \u043c\xb2</div><div class="stat-value">' + _fmtRentNum(totalArea, 1) + '</div></div>';
  h += '<div class="stat-card"><div class="stat-label">\u0421\u0443\u043c\u043c\u0430/\u043c\u0435\u0441, \u20bd</div><div class="stat-value">' + _fmtRentNum(totalMonthly, 0) + '</div></div>';
  h += '</div>';

  if (_rentGroupBy.length > 0) {
    h += _buildGroupedRentTable(rows);
  } else {
    h += _buildFlatRentTable(rows, fmtVal);
  }
  return h;
}

function _buildFlatRentTable(rows, fmtVal) {
  var totalW = 36 + RENT_COLS.reduce(function(s,c){ return s + (_rentColWidths[c.key] || c.w); }, 0);
  var h = '<div style="overflow-x:auto">';
  h += '<table style="border-collapse:collapse;font-size:12px;table-layout:fixed;width:' + totalW + 'px">';
  h += '<thead><tr>';
  h += '<th class="rent-th" style="min-width:36px;width:36px">#</th>';
  RENT_COLS.forEach(function(col) {
    var isFiltered = _rentFilters[col.key] && _rentFilters[col.key].size > 0;
    var sortIcon = _rentSortField === col.key ? (_rentSortAsc ? ' \u2191' : ' \u2193') : '';
    var w = (_rentColWidths[col.key] || col.w);
    h += '<th class="rent-th" style="width:' + w + 'px;min-width:40px">';
    h += '<div class="rent-th-inner" onclick="_rentSort(&quot;' + col.key + '&quot;)">';
    h += '<span>' + col.label + sortIcon + '</span>';
    h += '<button class="rent-filter-btn' + (isFiltered ? ' active' : '') + '" title="\u0424\u0438\u043b\u044c\u0442\u0440" onclick="event.stopPropagation();_rentOpenFilter(event,&quot;' + col.key + '&quot;)">\u25bc</button>';
    h += '</div>';
    h += '<div class="rent-col-resizer" onmousedown="event.stopPropagation();_rentStartResize(event,&quot;' + col.key + '&quot;)"></div>';
    h += '</th>';
  });
  h += '</tr></thead><tbody>';

  rows.forEach(function(row, i) {
    var bg = i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)';
    h += '<tr>';
    h += '<td style="padding:5px 8px;border:1px solid var(--border);background:' + bg + ';color:var(--text-muted);text-align:right">' + (i+1) + '</td>';
    RENT_COLS.forEach(function(col) {
      var align = (col.fmt === 'num0' || col.fmt === 'num1') ? 'right' : 'left';
      h += '<td style="padding:5px 8px;border:1px solid var(--border);background:' + bg + ';text-align:' + align + ';max-width:' + col.w + 'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(String(row[col.key] || '')) + '">';
      h += fmtVal(col, row) + '</td>';
    });
    h += '</tr>';
  });

  // Totals row — dynamic by RENT_COLS
  var SUMABLE = { area: 1, rent_rate: 0, net_rate: 0, monthly_amount: 0 };
  h += '<tr style="background:var(--bg-secondary);font-weight:700">';
  h += '<td style="padding:5px 8px;border:1px solid var(--border)">\u0418\u0442\u043e\u0433\u043e (' + rows.length + ' \u0441\u0442\u0440\u043e\u043a)</td>';
  RENT_COLS.forEach(function(col) {
    h += '<td style="padding:5px 8px;border:1px solid var(--border);text-align:right">';
    if (col.key in SUMABLE) {
      var tot = rows.reduce(function(s,r){ return s + (parseFloat(r[col.key])||0); }, 0);
      h += tot > 0 ? _fmtRentNum(tot, SUMABLE[col.key]) : '';
    }
    h += '</td>';
  });
  h += '</tr>';

  h += '</tbody></table></div>';
  return h;
}

function _buildGroupedRentTable(rows) {
  // Group rows hierarchically by _rentGroupBy fields
  function groupRows(arr, fields, depth) {
    if (fields.length === 0) return null;
    var field = fields[0];
    var rest = fields.slice(1);
    var groups = {};
    var order = [];
    arr.forEach(function(r) {
      var v = String(r[field] || '\u2014');
      if (!groups[v]) { groups[v] = []; order.push(v); }
      groups[v].push(r);
    });
    return order.map(function(v) {
      return { field: field, value: v, rows: groups[v], children: rest.length > 0 ? groupRows(groups[v], rest, depth+1) : null };
    });
  }

  var grouped = groupRows(rows, _rentGroupBy, 0);
  var fieldLabels = {};
  RENT_GROUP_FIELDS.forEach(function(f) { fieldLabels[f.key] = f.label; });
  RENT_COLS.forEach(function(c) { fieldLabels[c.key] = c.label; });

  var GC = [
    { key: 'gc0', label: '\u0414\u043e\u0433\u043e\u0432\u043e\u0440', w: 220 },
    { key: 'gc1', label: '\u0410\u0440\u0435\u043d\u0434\u0430\u0442\u043e\u0440', w: 170 },
    { key: 'gc2', label: '\u0422\u0438\u043f / \u041a\u043e\u0440\u043f\u0443\u0441', w: 160 },
    { key: 'gc3', label: '\u041f\u043b\u043e\u0449\u0430\u0434\u044c \u0438 \u0441\u0442\u0430\u0432\u043a\u0430', w: 170 },
  ];
  var gcTotalW = GC.reduce(function(s,c){ return s + (_rentColWidths[c.key] || c.w); }, 0);
  var h = '<div style="overflow-x:auto">';
  h += '<table style="border-collapse:collapse;font-size:12px;table-layout:fixed;width:' + gcTotalW + 'px">';
  // Resizable header
  h += '<thead><tr>';
  GC.forEach(function(col) {
    var w = _rentColWidths[col.key] || col.w;
    h += '<th class="rent-th" style="width:' + w + 'px;min-width:40px">';
    h += '<span>' + col.label + '</span>';
    h += '<div class="rent-col-resizer" onmousedown="event.stopPropagation();_rentStartResize(event,&quot;' + col.key + '&quot;)"></div>';
    h += '</th>';
  });
  h += '</tr></thead><tbody>';

  function renderGroup(g, depth) {
    var area = g.rows.reduce(function(s,r){return s+(r.area||0);}, 0);
    var mon = g.rows.reduce(function(s,r){return s+(r.monthly_amount||0);}, 0);
    var indent = depth * 20;
    h += '<tr style="background:var(--bg-secondary)">';
    h += '<td colspan="4" style="padding:6px 10px 6px ' + (10+indent) + 'px;border:1px solid var(--border);font-weight:600">';
    h += '<span style="color:var(--text-muted);font-size:11px">' + escapeHtml(fieldLabels[g.field] || g.field) + ': </span>';
    h += escapeHtml(g.value);
    h += ' <span style="font-size:11px;color:var(--text-muted)">(' + g.rows.length + ' \u0441\u0442\u0440.</span>';
    h += ', \u043f\u043b. ' + _fmtRentNum(area, 1) + ' \u043c\xb2';
    h += ', ' + _fmtRentNum(mon, 0) + ' \u20bd/\u043c\u0435\u0441)';
    h += '</td></tr>';
    if (g.children) {
      g.children.forEach(function(child) { renderGroup(child, depth+1); });
    } else {
      g.rows.forEach(function(row, i) {
        var bg = i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-hover)';
        h += '<tr>';
        h += '<td style="padding:4px 8px 4px ' + (10+indent+20) + 'px;border:1px solid var(--border);background:' + bg + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">';
        h += '<a href="#" onclick="showEntity(' + row.contract_id + ');return false" style="color:var(--accent)">' + escapeHtml(row.contract_name || '') + '</a>';
        if (row.contract_date) h += ' <span style="color:var(--text-muted)">(' + _fmtRentDate(row.contract_date) + ')</span>';
        if (row.from_supplement) h += '<div style="font-size:10px;color:var(--text-muted);margin-top:1px">\ud83d\udccb \u0414\u0421: ' + escapeHtml(row.supp_name || '') + (row.supp_date ? ' \u043e\u0442 ' + _fmtRentDate(row.supp_date) : '') + '</div>';
        h += '</td>';
        h += '<td style="padding:4px 8px;border:1px solid var(--border);background:' + bg + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(row.contractor_name || '') + '</td>';
        h += '<td style="padding:4px 8px;border:1px solid var(--border);background:' + bg + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(row.object_type || '') + ' / ' + escapeHtml(row.building || '') + '</td>';
        h += '<td style="padding:4px 8px;border:1px solid var(--border);background:' + bg + ';text-align:right;white-space:nowrap">';
        h += _fmtRentNum(row.area, 1) + ' \u043c\xb2 &middot; ' + _fmtRentNum(row.rent_rate, 0) + ' = ' + _fmtRentNum(row.monthly_amount, 0) + ' \u20bd/\u043c\u0435\u0441';
        h += '</td></tr>';
      });
    }
  }

  grouped.forEach(function(g) { renderGroup(g, 0); });
  h += '</tbody></table></div>';
  return h;
}

function _rentSort(field) {
  if (_rentSortField === field) { _rentSortAsc = !_rentSortAsc; }
  else { _rentSortField = field; _rentSortAsc = true; }
  _rentRender();
}

function _rentStartResize(e, key) {
  e.preventDefault();
  var th = e.currentTarget.parentNode;
  var startX = e.clientX;
  var startW = th.offsetWidth;
  var handle = e.currentTarget;
  handle.classList.add('resizing');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  function onMove(e2) {
    var w = Math.max(40, startW + e2.clientX - startX);
    _rentColWidths[key] = w;
    th.style.width = w + 'px';
    th.style.minWidth = w + 'px';
  }
  function onUp() {
    handle.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

var _rentFilterOpen = null;
function _rentOpenFilter(event, field) {
  // Close existing dropdown if any
  var existing = document.getElementById('rentFilterDrop');
  if (existing) { existing.parentNode.removeChild(existing); _rentFilterOpen = null; }
  if (_rentFilterOpen === field) { _rentFilterOpen = null; return; }
  _rentFilterOpen = field;

  var uniqueVals = [];
  var seen = {};
  _rentAllRows.forEach(function(r) {
    var v = String(r[field] || '');
    if (!seen[v]) { seen[v] = true; uniqueVals.push(v); }
  });
  uniqueVals.sort(function(a,b) { return a.localeCompare(b, 'ru'); });

  var active = _rentFilters[field] || null;
  var d = document.createElement('div');
  d.id = 'rentFilterDrop';
  d.className = 'rent-filter-dropdown';
  d.onclick = function(e) { e.stopPropagation(); };

  var allChecked = !active || active.size === 0;
  // Build HTML with search input + "Only this" buttons
  var labelsHtml = uniqueVals.map(function(v) {
    var chk = allChecked || (active && active.has(v));
    var display = escapeHtml(v || '(\u043f\u0443\u0441\u0442\u043e)');
    return '<div class="rf-row" data-val="' + escapeHtml(v) + '" style="display:flex;align-items:center;gap:0">' +
      '<label style="flex:1;display:flex;align-items:center;gap:6px;padding:3px 10px;cursor:pointer;font-size:12px;overflow:hidden">' +
      '<input type="checkbox" class="rfVal" value="' + escapeHtml(v) + '" ' + (chk ? 'checked' : '') + '>' +
      '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(v) + '">' + display + '</span></label>' +
      '<button onclick="_rentFilterOnly(&quot;' + escapeHtml(v) + '&quot;,&quot;' + field + '&quot;)" title="\u0422\u043e\u043b\u044c\u043a\u043e \u044d\u0442\u043e" style="background:none;border:none;cursor:pointer;padding:2px 8px 2px 2px;font-size:10px;color:var(--text-muted);flex-shrink:0;white-space:nowrap">' +
      '\u0442\u043e\u043b\u044c\u043a\u043e</button></div>';
  }).join('');

  d.innerHTML =
    '<div style="padding:4px 8px 4px">' +
    '<input class="rent-filter-search" id="rfSearch" placeholder="\u041f\u043e\u0438\u0441\u043a..." autocomplete="off">' +
    '</div>' +
    '<div style="padding:0 10px 4px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px">' +
    '<label style="font-weight:600;font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;flex:1">' +
    '<input type="checkbox" id="rfAll" ' + (allChecked ? 'checked' : '') + '> \u0412\u0441\u0435</label>' +
    '<button onclick="_rentFilterNone(&quot;' + field + '&quot;)" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--text-muted);white-space:nowrap">\u0421\u043d\u044f\u0442\u044c \u0432\u0441\u0451</button>' +
    '</div>' +
    '<div id="rfList" style="max-height:220px;overflow-y:auto">' + labelsHtml + '</div>' +
    '<div style="padding:6px 10px;border-top:1px solid var(--border);margin-top:2px;display:flex;gap:6px">' +
    '<button class="btn btn-primary btn-sm" onclick="_rentApplyFilter(&quot;' + field + '&quot;)">OK</button>' +
    '<button class="btn btn-sm" onclick="_rentClearFilter(&quot;' + field + '&quot;)">\u0421\u0431\u0440\u043e\u0441</button></div>';

  d.querySelector('#rfAll').addEventListener('change', function() {
    var checked = this.checked;
    d.querySelectorAll('.rfVal').forEach(function(cb) { cb.checked = checked; });
  });

  // Search handler — show/hide rows
  d.querySelector('#rfSearch').addEventListener('input', function() {
    var q = this.value.toLowerCase();
    d.querySelectorAll('.rf-row').forEach(function(row) {
      var val = row.getAttribute('data-val').toLowerCase();
      row.style.display = (q === '' || val.indexOf(q) >= 0) ? '' : 'none';
    });
  });

  // Position fixed relative to button, attached to body so it escapes table overflow
  var rect = event.currentTarget.getBoundingClientRect();
  d.style.position = 'fixed';
  d.style.top = (rect.bottom + 4) + 'px';
  var left = rect.left;
  // Adjust if would overflow right edge
  document.body.appendChild(d);
  var dropW = d.offsetWidth || 240;
  if (left + dropW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - dropW - 8);
  d.style.left = left + 'px';

  setTimeout(function() { var s = d.querySelector('#rfSearch'); if (s) s.focus(); }, 50);

  // Close on outside click
  setTimeout(function() {
    document.addEventListener('click', function handler() {
      if (document.getElementById('rentFilterDrop')) {
        document.getElementById('rentFilterDrop').remove();
      }
      _rentFilterOpen = null;
      document.removeEventListener('click', handler);
    });
  }, 0);
}

function _rentApplyFilter(field) {
  var d = document.getElementById('rentFilterDrop');
  if (!d) return;
  var allCb = d.querySelector('#rfAll');
  if (allCb && allCb.checked) {
    delete _rentFilters[field];
  } else {
    var checked = Array.from(d.querySelectorAll('.rfVal:checked')).map(function(cb) { return cb.value; });
    if (checked.length === 0) { delete _rentFilters[field]; }
    else { _rentFilters[field] = new Set(checked); }
  }
  d.remove();
  _rentFilterOpen = null;
  _rentRender();
}

function _rentClearFilter(field) {
  delete _rentFilters[field];
  var d = document.getElementById('rentFilterDrop');
  if (d) d.remove();
  _rentFilterOpen = null;
  _rentRender();
}

// Quick: uncheck everything and check only this value
function _rentFilterOnly(val, field) {
  var d = document.getElementById('rentFilterDrop');
  if (!d) return;
  d.querySelectorAll('.rfVal').forEach(function(cb) { cb.checked = cb.value === val; });
  var allCb = d.querySelector('#rfAll');
  if (allCb) allCb.checked = false;
}

// Quick: uncheck all
function _rentFilterNone(field) {
  var d = document.getElementById('rentFilterDrop');
  if (!d) return;
  d.querySelectorAll('.rfVal').forEach(function(cb) { cb.checked = false; });
  var allCb = d.querySelector('#rfAll');
  if (allCb) allCb.checked = false;
}

function _renderRentGroupZone() {
  var zone = document.getElementById('rentGroupZone');
  if (!zone) return;
  if (_rentGroupBy.length === 0) {
    zone.innerHTML = '<span style="color:var(--text-muted);font-size:12px;align-self:center">\u041d\u0430\u0436\u043c\u0438\u0442\u0435 + \u043f\u043e\u043b\u0435 \u043d\u0438\u0436\u0435 \u0447\u0442\u043e\u0431\u044b \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0443\u0440\u043e\u0432\u0435\u043d\u044c \u0433\u0440\u0443\u043f\u043f\u0438\u0440\u043e\u0432\u043a\u0438</span>';
    return;
  }
  var labels = {};
  RENT_GROUP_FIELDS.forEach(function(f) { labels[f.key] = f.label; });
  zone.innerHTML = _rentGroupBy.map(function(k) {
    return '<span class="rent-group-tag">' + escapeHtml(labels[k] || k) + '<button onclick="_rentRemoveGroup(&quot;' + k + '&quot;)">&times;</button></span>';
  }).join('');
}

function _renderRentGroupFieldBtns() {
  var el = document.getElementById('rentGroupFieldBtns');
  if (!el) return;
  el.innerHTML = RENT_GROUP_FIELDS.map(function(f) {
    var active = _rentGroupBy.indexOf(f.key) >= 0;
    return '<button class="btn btn-sm rent-field-btn' + (active ? ' btn-primary' : '') + '" onclick="_rentToggleGroup(&quot;' + f.key + '&quot;)">+ ' + escapeHtml(f.label) + '</button>';
  }).join('');
}

function _rentToggleGroup(field) {
  if (_rentGroupBy.indexOf(field) >= 0) { _rentRemoveGroup(field); }
  else { _rentGroupBy.push(field); _renderRentGroupZone(); _renderRentGroupFieldBtns(); _rentRender(); }
}

function _rentRemoveGroup(field) {
  _rentGroupBy = _rentGroupBy.filter(function(k) { return k !== field; });
  _renderRentGroupZone();
  _renderRentGroupFieldBtns();
  _rentRender();
}

// ============ WORK HISTORY REPORT ============

async function buildWorkHistoryReport() {
  var resultsEl = document.getElementById('whResults');
  resultsEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Загрузка...</div>';

  var category = (document.getElementById('whCategory') || {}).value || '';
  var buildingId = (document.getElementById('whBuilding') || {}).value || '';
  var dateFrom = (document.getElementById('whDateFrom') || {}).value || '';
  var dateTo = (document.getElementById('whDateTo') || {}).value || '';

  var params = new URLSearchParams();
  if (category) params.set('category', category);
  if (buildingId) params.set('building_id', buildingId);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);

  try {
    var rows = await api('/reports/work-history?' + params.toString());
    resultsEl.innerHTML = renderWorkHistoryTable(rows);
  } catch(err) {
    resultsEl.innerHTML = '<div style="color:red;padding:16px">Ошибка: ' + escapeHtml(err.message || String(err)) + '</div>';
  }
}

function renderWorkHistoryTable(rows) {
  if (!rows || rows.length === 0) {
    return '<div class="detail-section"><p style="color:var(--text-muted);padding:16px">\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445. \u0421\u043e\u0437\u0434\u0430\u0439\u0442\u0435 \u0430\u043a\u0442\u044b \u0438 \u0441\u0432\u044f\u0436\u0438\u0442\u0435 \u0438\u0445 \u0441 \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435\u043c.</p></div>';
  }

  var fmtDate = function(d) { return d ? d.split('-').reverse().join('.') : ''; };
  var fmt = function(v) { return v > 0 ? v.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' \u20bd' : ''; };

  // Collect unique sorted dates (columns)
  var dateSet = {};
  rows.forEach(function(r) { if (r.act_date) dateSet[r.act_date] = true; });
  var dates = Object.keys(dateSet).sort();

  // Collect unique equipment (rows), group cells by date
  // Cell = { descriptions: [], amount: 0, act_ids: [] }
  var eqMap = {};
  rows.forEach(function(r) {
    if (!eqMap[r.eq_id]) {
      eqMap[r.eq_id] = {
        eq_id: r.eq_id, eq_name: r.eq_name,
        eq_inv_number: r.eq_inv_number, eq_category: r.eq_category,
        eq_status: r.eq_status, building_name: r.building_name,
        cells: {}, totalAmount: 0
      };
    }
    var date = r.act_date || '';
    if (!eqMap[r.eq_id].cells[date]) {
      eqMap[r.eq_id].cells[date] = { descriptions: [], comments: [], amount: 0, actIds: [], actNames: [] };
    }
    var cell = eqMap[r.eq_id].cells[date];
    if (r.description && r.description.trim()) {
      if (cell.descriptions.indexOf(r.description.trim()) < 0) {
        cell.descriptions.push(r.description.trim());
      }
    }
    if (r.comment && r.comment.trim()) {
      if (cell.comments.indexOf(r.comment.trim()) < 0) {
        cell.comments.push(r.comment.trim());
      }
    }
    cell.amount += r.amount || 0;
    if (r.act_id && cell.actIds.indexOf(r.act_id) < 0) {
      cell.actIds.push(r.act_id);
      cell.actNames.push(r.act_name || '\u0410\u043a\u0442');
    }
    eqMap[r.eq_id].totalAmount += r.amount || 0;
  });

  var equipment = Object.values(eqMap).sort(function(a,b) { return a.eq_name.localeCompare(b.eq_name, 'ru'); });

  var h = '<div class="detail-section">';
  h += '<div style="margin-bottom:12px;font-size:13px;color:var(--text-muted)">';
  h += equipment.length + ' \u0435\u0434. \u043e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u044f &middot; ' + dates.length + ' \u0434\u0430\u0442';
  h += '</div>';
  h += '<div style="overflow-x:auto">';
  h += '<table style="border-collapse:collapse;font-size:13px;min-width:100%">';

  // Header row
  h += '<thead><tr>';
  h += '<th style="text-align:left;padding:8px 10px;background:var(--bg-secondary);border:1px solid var(--border);min-width:200px;position:sticky;left:0;z-index:2">\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435</th>';
  dates.forEach(function(d) {
    h += '<th style="text-align:center;padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);min-width:160px;white-space:nowrap">' + fmtDate(d) + '</th>';
  });
  h += '<th style="text-align:right;padding:8px 10px;background:var(--bg-secondary);border:1px solid var(--border);min-width:100px;font-weight:700;white-space:nowrap">\u0418\u0442\u043e\u0433\u043e, \u20bd</th>';
  h += '</tr></thead>';

  // Body
  h += '<tbody>';
  equipment.forEach(function(eq, idx) {
    var isBroken = _brokenEqIds.has(eq.eq_id);
    var isEmergencyRow = (eq.eq_status === 'Аварийное');
    var bg = isBroken ? 'rgba(239,68,68,.10)' : (isEmergencyRow ? 'rgba(184,92,92,.07)' : (idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'));
    h += '<tr' + (isBroken ? ' class="eq-broken-row"' : '') + '>';

    // Equipment cell (sticky)
    h += '<td style="padding:8px 10px;border:1px solid var(--border);background:' + bg + ';position:sticky;left:0;z-index:1;vertical-align:top">';
    var nameColor = isBroken ? '#dc2626' : (isEmergencyRow ? '#b85c5c' : 'var(--accent)');
    h += '<a href="#" onclick="showEntity(' + eq.eq_id + ');return false" style="font-weight:600;color:' + nameColor + ';display:block">' + escapeHtml(eq.eq_name) + '</a>';
    if (isBroken) h += '<span class="eq-broken-badge">\u26a0 \u041d\u0435\u0440\u0430\u0431\u043e\u0447\u0438\u0439</span>';
    else if (isEmergencyRow) h += '<span class="eq-emergency-badge">\u26a0 \u0410\u0432\u0430\u0440\u0438\u044f</span>';
    if (eq.eq_inv_number) h += '<div style="font-size:11px;color:var(--text-muted)">\u0438\u043d\u0432. ' + escapeHtml(eq.eq_inv_number) + '</div>';
    if (eq.building_name && eq.building_name !== '\u2014') h += '<div style="font-size:11px;color:var(--text-muted)">' + escapeHtml(eq.building_name) + '</div>';
    h += '</td>';

    // Date cells
    dates.forEach(function(date) {
      var cell = eq.cells[date];
      if (!cell || (cell.descriptions.length === 0 && (!cell.comments || cell.comments.length === 0) && cell.amount === 0)) {
        h += '<td style="padding:8px 12px;border:1px solid var(--border);background:' + bg + ';text-align:center;color:var(--text-muted);vertical-align:top">\u2014</td>';
      } else {
        h += '<td style="padding:8px 12px;border:1px solid var(--border);background:' + bg + ';vertical-align:top">';
        // Описание работ
        if (cell.descriptions.length > 0) {
          h += '<div style="font-size:12px;line-height:1.5">';
          cell.descriptions.forEach(function(desc) {
            h += '<div style="margin-bottom:2px">' + escapeHtml(desc) + '</div>';
          });
          h += '</div>';
        }
        // Комментарий
        if (cell.comments && cell.comments.length > 0) {
          h += '<div style="font-size:11px;color:var(--text-muted);margin-top:3px;font-style:italic">';
          cell.comments.forEach(function(c) {
            h += '<div>' + escapeHtml(c) + '</div>';
          });
          h += '</div>';
        }
        // Amount (if non-zero)
        if (cell.amount > 0) {
          h += '<div style="font-size:12px;color:var(--accent);font-weight:600;margin-top:4px">' + fmt(cell.amount) + '</div>';
        }
        // Link to act(s)
        if (cell.actIds.length > 0) {
          h += '<div style="font-size:11px;margin-top:3px">';
          cell.actIds.forEach(function(aid, i) {
            h += '<a href="#" onclick="showEntity(' + aid + ');return false" style="color:var(--text-muted)">\u2192 ' + escapeHtml(cell.actNames[i] || '\u0410\u043a\u0442') + '</a>';
            if (i < cell.actIds.length - 1) h += ' ';
          });
          h += '</div>';
        }
        h += '</td>';
      }
    });

    // Row total
    h += '<td style="padding:8px 10px;border:1px solid var(--border);background:' + bg + ';text-align:right;font-weight:600;vertical-align:top">';
    h += eq.totalAmount > 0 ? fmt(eq.totalAmount) : '\u2014';
    h += '</td>';
    h += '</tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
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

  setModalContent(html);
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
  setModalContent(html);
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
  setModalContent(html);
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
