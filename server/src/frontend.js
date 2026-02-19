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
    document.getElementById('sidebar').style.display = '';
    document.querySelector('.main').style.display = '';
    startApp();
  } catch (e) { errEl.textContent = 'Ошибка подключения'; }
}

async function startApp() {
  if (!CURRENT_USER) {
    try { CURRENT_USER = await api('/auth/me'); } catch { logout(); return; }
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
    startApp();
  } else {
    showLogin();
  }
}

function renderTypeNav() {
  const nav = document.getElementById('typeNav');
  nav.innerHTML = entityTypes.map(t =>
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
    fields.forEach(f => {
      const val = props[f.name];
      html += '<div class="prop-item"><div class="prop-label">' + (f.name_ru || f.name) + '</div>' +
        '<div class="prop-value">' + (val ? escapeHtml(String(val)) : '—') + '</div></div>';
    });
    html += '</div></div>';
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
  const type = entityTypes.find(t => t.name === typeName);
  const fields = await api('/entity-types/' + type.id + '/fields');
  const allEntities = await api('/entities');

  let html = '<h3>Новый: ' + type.name_ru + '</h3>';
  html += '<div class="form-group"><label>Название</label><input id="f_name" required></div>';

  // Parent selector
  html += '<div class="form-group"><label>Родитель (вложен в)</label><select id="f_parent"><option value="">— нет —</option>';
  allEntities.forEach(e => {
    html += '<option value="' + e.id + '">' + e.icon + ' ' + escapeHtml(e.name) + ' (' + e.type_name_ru + ')</option>';
  });
  html += '</select></div>';

  fields.forEach(f => {
    html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>';
    if (f.field_type === 'select') {
      const opts = f.options || [];
      html += '<select id="f_' + f.name + '"><option value="">—</option>';
      opts.forEach(o => { html += '<option>' + o + '</option>'; });
      html += '</select>';
    } else if (f.field_type === 'date') {
      html += '<input type="date" id="f_' + f.name + '">';
    } else if (f.field_type === 'number') {
      html += '<input type="number" id="f_' + f.name + '">';
    } else {
      html += '<input id="f_' + f.name + '">';
    }
    html += '</div>';
  });

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreate(\\'' + typeName + '\\')">Создать</button></div>';

  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
  document.getElementById('f_name').focus();
}

async function submitCreate(typeName) {
  const type = entityTypes.find(t => t.name === typeName);
  const fields = await api('/entity-types/' + type.id + '/fields');
  const name = document.getElementById('f_name').value.trim();
  if (!name) return alert('Введите название');

  const parent_id = document.getElementById('f_parent').value || null;
  const properties = {};
  fields.forEach(f => {
    const el = document.getElementById('f_' + f.name);
    if (el && el.value) properties[f.name] = el.value;
  });

  await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: type.id, name, properties, parent_id }) });
  closeModal();
  showEntityList(typeName);
}

async function openEditModal(id) {
  const e = await api('/entities/' + id);
  const fields = e.fields || [];
  const allEntities = await api('/entities');

  let html = '<h3>Редактировать: ' + escapeHtml(e.name) + '</h3>';
  html += '<div class="form-group"><label>Название</label><input id="f_name" value="' + escapeHtml(e.name) + '"></div>';

  html += '<div class="form-group"><label>Родитель</label><select id="f_parent"><option value="">— нет —</option>';
  allEntities.filter(x => x.id !== id).forEach(x => {
    html += '<option value="' + x.id + '"' + (x.id === e.parent_id ? ' selected' : '') + '>' + x.icon + ' ' + escapeHtml(x.name) + '</option>';
  });
  html += '</select></div>';

  const props = e.properties || {};
  fields.forEach(f => {
    const val = props[f.name] || '';
    html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>';
    if (f.field_type === 'select') {
      const opts = f.options || [];
      html += '<select id="f_' + f.name + '"><option value="">—</option>';
      opts.forEach(o => { html += '<option' + (o === val ? ' selected' : '') + '>' + o + '</option>'; });
      html += '</select>';
    } else if (f.field_type === 'date') {
      html += '<input type="date" id="f_' + f.name + '" value="' + val + '">';
    } else if (f.field_type === 'number') {
      html += '<input type="number" id="f_' + f.name + '" value="' + val + '">';
    } else {
      html += '<input id="f_' + f.name + '" value="' + escapeHtml(String(val)) + '">';
    }
    html += '</div>';
  });

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitEdit(' + id + ')">Сохранить</button></div>';

  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
}

async function submitEdit(id) {
  const e = await api('/entities/' + id);
  const fields = e.fields || [];
  const name = document.getElementById('f_name').value.trim();
  const parent_id = document.getElementById('f_parent').value || null;
  const properties = {};
  fields.forEach(f => {
    const el = document.getElementById('f_' + f.name);
    if (el) properties[f.name] = el.value || null;
  });
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
