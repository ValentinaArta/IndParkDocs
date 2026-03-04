/* eslint-disable */
module.exports = `
// === NAVIGATION / AUTH / INIT ===

function setActiveNav(name) {
  document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
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
  const totpInput = document.getElementById('loginTotp');
  const totp_code = totpInput ? totpInput.value.trim() : '';
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const body = { username, password };
    if (totp_code) body.totp_code = totp_code;
    const r = await fetch(API + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Ошибка'; return; }
    // If TOTP required — show code input
    if (data.requireTotp) {
      document.getElementById('totpGroup').style.display = '';
      document.getElementById('loginTotp').focus();
      errEl.textContent = '';
      return;
    }
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
  } catch (e) {
    console.error('Login error:', e);
    errEl.textContent = 'Ошибка подключения: ' + (e.message || e);
  }
}

async function startApp() {
  if (!CURRENT_USER) {
    try { CURRENT_USER = await api('/auth/me'); } catch (e) { logout(); return; }
  }
  entityTypes = await api('/entity-types');
  relationTypes = await api('/relations/types');
  // Загружаем справочники — единственный источник истины для OBJECT_TYPES, EQUIPMENT_CATEGORIES и т.д.
  try {
    _settingsLists = await api('/entity-types/settings/lists');
    _settingsLists.forEach(function(f) {
      var items = Array.isArray(f.options) ? f.options : [];
      try { if (typeof f.options === 'string') items = JSON.parse(f.options); } catch(ex) {}
      if (f.name === 'object_type' || f.name === 'room_type') { OBJECT_TYPES.length = 0; items.forEach(function(i){ OBJECT_TYPES.push(i); }); }
      else if (f.name === 'equipment_category') { EQUIPMENT_CATEGORIES.length = 0; items.forEach(function(i){ EQUIPMENT_CATEGORIES.push(i); }); }
      else if (f.name === 'status' && f.entity_type_name === 'equipment') { EQUIPMENT_STATUSES.length = 0; items.forEach(function(i){ EQUIPMENT_STATUSES.push(i); }); }
    });
  } catch(e) { console.warn('Failed to load справочники on startup:', e.message); }
  renderTypeNav();
  // URL routing — restore last page on reload
  _routeFromHash(window.location.hash);
  // menuBtn visibility now handled by CSS media query
}

// Write current page to URL hash (replaceState — no browser history entry, no hashchange event)
function _setNavHash(h) {
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', h ? '#' + h : window.location.pathname);
  }
}

// Parse hash and navigate to the corresponding page
function _routeFromHash(hash) {
  if (!hash || hash === '#' || hash === '#dashboard') { showDashboard(); return; }
  var m;
  var _reEntity = new RegExp('^#entity/(\\d+)$');
  var _reDetail = new RegExp('^#detail/(\\d+)$');
  var _reList   = new RegExp('^#list/(.+)$');
  if ((m = hash.match(_reEntity)))  { showEntity(parseInt(m[1])); return; }
  if ((m = hash.match(_reDetail)))  { showEntity(parseInt(m[1]), true); return; }
  if ((m = hash.match(_reList)))    { showEntityList(decodeURIComponent(m[1])); return; }
  if (hash === '#map')      { showMapPage();      return; }
  if (hash === '#bi')       { showBIPage();       return; }
  if (hash === '#budget')   { showBudgetPage();   return; }
  if (hash === '#finance')  { showFinancePage();  return; }
  if (hash === '#settings') { showSettings();     return; }
  if (hash === '#zachety')  { showLegalZachety(); return; }
  if (hash === '#meters')   { showMetersPage();   return; }
  if (hash === '#reports')  { showReports();      return; }
  showDashboard();
}

// Listen for hash changes (back/forward browser buttons)
window.addEventListener('hashchange', function() {
  _routeFromHash(window.location.hash);
});

// Listen for messages from iframes (e.g. budget-dashboard openEntityCard)
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'openEntity' && event.data.id) {
    showEntity(parseInt(event.data.id));
  }
});

async function init() {
  renderIcons(); // Initialize Lucide icons in static sidebar HTML
  if (TOKEN) {
    document.getElementById('loginScreen').style.display = 'none';
    document.querySelector('.app').style.display = 'flex';
    startApp();
  } else {
    showLogin();
  }
}

// Navigation tree state
var _navParentType = { room: 'building', land_plot_part: 'land_plot' };

function _navGroupHtml(name, iconName, label) {
  return '<div style="margin:0 4px 1px">' +
    '<div class="nav-item" data-type="' + name + '" style="display:flex;align-items:center;padding:0">' +
      '<span id="navArrow_' + name + '" data-group="' + name + '"' +
        ' onclick="event.stopPropagation();toggleNavGroup(this.dataset.group)"' +
        ' style="width:22px;text-align:center;font-size:10px;color:rgba(255,255,255,0.4);cursor:pointer;flex-shrink:0;padding:8px 0">▶</span>' +
      '<span style="flex:1;padding:8px 4px 8px 2px;cursor:pointer;display:flex;align-items:center;gap:8px" data-etype="' + name + '"' +
        ' onclick="showEntityList(this.dataset.etype)">' + icon(iconName) + ' ' + label + '</span>' +
    '</div>' +
    '<div id="navgroup_' + name + '" style="display:none"></div>' +
  '</div>';
}

async function toggleNavGroup(name) {
  var children = document.getElementById('navgroup_' + name);
  var arrow = document.getElementById('navArrow_' + name);
  if (!children) return;
  var isOpen = children.style.display !== 'none';
  children.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
  if (!isOpen && children.innerHTML.trim() === '') {
    children.innerHTML = '<div style="padding:4px 8px 4px 28px;font-size:11px;color:rgba(255,255,255,0.3)">Загрузка...</div>';
    try { await _navLoadGroupChildren(name, children); }
    catch(e) { children.innerHTML = '<div style="padding:4px 8px 4px 28px;font-size:11px;color:rgba(255,255,255,0.3)">Ошибка загрузки</div>'; }
  }
}

async function _navLoadGroupChildren(name, container) {
  var h = '';
  if (name === 'building') {
    var buildings = await api('/entities?type=building');
    // "Все помещения" — всегда первым, чтобы помещения без корпуса были доступны
    h += '<div class="nav-sub-item" data-etype="room" data-title="" onclick="navSubClick(this)" style="color:rgba(255,255,255,0.45);font-style:italic">' +
      '<span style="font-size:9px;color:rgba(255,255,255,0.2)">▸</span> все помещения</div>';
    if (buildings.length === 0) {
      container.innerHTML = h + '<div style="padding:4px 8px 4px 28px;font-size:11px;color:rgba(255,255,255,0.3)">Нет корпусов</div>';
      return;
    }
    buildings.forEach(function(b) {
      h += '<div class="nav-sub-item" data-etype="room" data-parent="' + b.id + '" data-title="' + escapeHtml(b.name) + '" onclick="navSubClick(this)">' +
        '<span style="font-size:9px;color:rgba(255,255,255,0.3)">▸</span> ' + escapeHtml(b.name) + '</div>';
    });
  } else if (name === 'company') {
    h = '<div class="nav-sub-item" data-etype="company" data-isown="true" onclick="navSubClick(this)">' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.3)">▸</span> Наши</div>' +
        '<div class="nav-sub-item" data-etype="company" data-isown="false" data-no1c="true" onclick="navSubClick(this)">' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.3)">▸</span> Сторонние</div>' +
        '<div class="nav-sub-item" data-etype="company" data-isown="false" data-only1c="true" onclick="navSubClick(this)" style="color:rgba(255,255,255,0.35)">' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.2)">▸</span> Из 1С (справочник)</div>';
  } else if (name === 'land_plot') {
    var plots = await api('/entities?type=land_plot');
    // "Все части ЗУ" — всегда первым, аналогично "все помещения" у корпусов
    h += '<div class="nav-sub-item" data-etype="land_plot_part" data-title="" onclick="navSubClick(this)" style="color:rgba(255,255,255,0.45);font-style:italic">' +
      '<span style="font-size:9px;color:rgba(255,255,255,0.2)">▸</span> все части ЗУ</div>';
    if (plots.length === 0) {
      container.innerHTML = h + '<div style="padding:4px 8px 4px 28px;font-size:11px;color:rgba(255,255,255,0.3)">Нет участков</div>';
      return;
    }
    plots.forEach(function(p) {
      h += '<div class="nav-sub-item" data-etype="land_plot_part" data-parent="' + p.id + '" data-title="' + escapeHtml(p.name) + '" onclick="navSubClick(this)">' +
        '<span style="font-size:9px;color:rgba(255,255,255,0.3)">▸</span> ' + escapeHtml(p.name) + '</div>';
    });
  }
  if (name === 'contract') {
    var contractTypes = ['Аренды', 'Субаренды', 'Аренда оборудования', 'Подряда', 'Услуг', 'Купли-продажи', 'Обслуживания', 'Эксплуатации'];
    h += '<div class="nav-sub-item" data-etype="contract" onclick="navSubClick(this)" style="color:rgba(255,255,255,0.45);font-style:italic">' +
      '<span style="font-size:9px;color:rgba(255,255,255,0.2)">▸</span> все договоры</div>';
    contractTypes.forEach(function(ct) {
      h += '<div class="nav-sub-item" data-etype="contract" data-contract-type="' + escapeHtml(ct) + '" onclick="navSubClick(this)">' +
        '<span style="font-size:9px;color:rgba(255,255,255,0.3)">▸</span> ' + escapeHtml(ct) + '</div>';
    });
  }
  container.innerHTML = h;
}

function navSubClick(el) {
  document.querySelectorAll('.nav-sub-item').forEach(function(i) { i.classList.remove('active'); });
  el.classList.add('active');
  var type = el.dataset.etype;
  var parentId = el.dataset.parent ? parseInt(el.dataset.parent) : null;
  var isOwn = el.dataset.isown;
  var contractType = el.dataset.contractType || null;
  var opts = {};
  if (parentId) opts.parentId = parentId;
  if (el.dataset.title) opts.subtitle = el.dataset.title;
  if (isOwn === 'true') opts.isOwn = true;
  else if (isOwn === 'false') opts.isOwn = false;
  if (contractType) opts.contractType = contractType;
  if (el.dataset.no1c === 'true') opts.no1c = true;
  if (el.dataset.only1c === 'true') opts.only1c = true;
  showEntityList(type, opts);
}

// Lucide icon mapping for entity types
// ENTITY_TYPE_ICONS and entityIcon() moved to core/globals.js

function renderTypeNav() {
  const nav = document.getElementById('typeNav');
  const T = function(name) { return entityTypes.find(function(t) { return t.name === name; }) || {name: name, icon: '', name_ru: name}; };

  var html = '<div class="nav-section" style="padding-top:12px">Документы</div>';

  // Документы: договоры (с аккордеоном по типам), ДС, акты, приказы
  html += _navGroupHtml('contract', 'file-text', 'Договоры');
  ['supplement', 'act', 'order'].forEach(function(tn) {
    var t = T(tn);
    html += '<div class="nav-item" data-type="' + tn + '" data-etype="' + tn + '" onclick="showEntityList(this.dataset.etype)">' +
      entityIcon(tn) + ' ' + escapeHtml(t.name_ru || tn) + '</div>';
  });

  // Реестры: корпуса (дерево), компании, ЗУ (дерево), оборудование
  html += '<div class="nav-section" style="margin-top:8px">Реестры</div>';
  html += _navGroupHtml('building', 'building-2', 'Корпуса');
  html += _navGroupHtml('company', 'landmark', 'Компании');
  html += _navGroupHtml('land_plot', 'map-pin', 'Земельные участки');

  var eq = T('equipment');
  html += '<div class="nav-item" data-type="equipment" data-etype="equipment" onclick="showEntityList(this.dataset.etype)">' +
    entityIcon('equipment') + ' ' + escapeHtml(eq.name_ru || 'Оборудование') + '</div>';

  html += '<div class="nav-item" onclick="showMetersPage()" style="padding-left:14px">🔢 Счётчики</div>';

  nav.innerHTML = html;
  renderIcons();
}

function setActive(selector) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (selector) {
    const el = document.querySelector(selector);
    if (el) el.classList.add('active');
  }
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
`;
