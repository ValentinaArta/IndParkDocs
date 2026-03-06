module.exports = `// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  frontend.js — Table of Contents                                        ║
// ║  Search for "// ============ SECTION ============" to jump to sections  ║
// ║                                                                         ║
// ║  ICON HELPER & GLOBALS .............. line ~270                          ║
// ║  SEARCHABLE SELECT / ENTITY CACHE ... line ~350                         ║
// ║  LAND PLOT SELECTOR ................. line ~580                          ║
// ║  RENT OBJECT SELECTS ................ line ~660                          ║
// ║  ADVANCES BLOCK ..................... line ~735                          ║
// ║  EQUIPMENT LIST FIELD ............... line ~785                          ║
// ║  ACT ITEMS .......................... line ~984                          ║
// ║  MULTI COMMENTS ..................... line ~1537                         ║
// ║  ENTITY SELECT HANDLERS ............. line ~2229                        ║
// ║  CONTRACT PARTY ROLES ............... line ~2323                        ║
// ║  AUTH / INIT ........................ line ~2560                         ║
// ║  NAVIGATION (sidebar, accordion) .... line ~2657                        ║
// ║  INTERACTIVE MAP .................... line ~2792                        ║
// ║  DASHBOARD .......................... line ~3261                        ║
// ║  ENTITY LIST ........................ line ~3293                        ║
// ║  ENTITY DETAIL ...................... line ~3420                        ║
// ║  REPORTS ............................ line ~3799                        ║
// ║  AGGREGATE REPORT ................... line ~4064                        ║
// ║  PIVOT TABLE ........................ line ~4319                        ║
// ║  MODALS (create/edit forms) ......... line ~4902                        ║
// ║  SUPPLEMENTS ........................ line ~5821                        ║
// ║  LAND PLOT PART ..................... line ~5969                        ║
// ║  ACTS ............................... line ~6019                        ║
// ║  RENT ANALYSIS REPORT ............... line ~6112                        ║
// ║  WORK HISTORY REPORT ................ line ~6659                        ║
// ║  RELATIONS .......................... line ~6818                        ║
// ║  SETTINGS ........................... line ~6855                        ║
// ║  SETTINGS: СПРАВОЧНИКИ .............. line ~6973                        ║
// ║  UTILS .............................. line ~7155                        ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

// ── Icon helper (Lucide) ──────────────────────────────────────────────────
function icon(name, size) {
  var s = size ? ' style="width:' + size + 'px;height:' + size + 'px"' : '';
  return '<i data-lucide="' + name + '" class="lucide"' + s + '></i>';
}
function renderIcons() { if (window.lucide) lucide.createIcons(); }
// ─────────────────────────────────────────────────────────────────────────

const API = window.location.origin + '/api';
let entityTypes = [];
let relationTypes = [];
let currentView = 'dashboard';
let currentTypeFilter = null;
let currentEntityId = null;
let TOKEN = localStorage.getItem('accessToken');
let REFRESH = localStorage.getItem('refreshToken');
let CURRENT_USER = null;

// CONTRACT_TYPE_FIELDS moved to core/globals.js


// Cache of all contract/supplement entities for extracting used values
let _allContractEntities = [];
var _entityCache = {};

async function loadContractEntities() {
  const contracts = await api('/entities?type=contract');
  const supplements = await api('/entities?type=supplement');
  _allContractEntities = contracts.concat(supplements);
}

async function loadEntitiesByType(typeName, extraParams) {
  var url = '/entities?type=' + encodeURIComponent(typeName) + '&limit=1000';
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
    h += '<option value="' + e.id + '"' + sel + '>' + escapeHtml(e.name) + '</option>';
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

// Searchable select — text input + filtered dropdown + "Другое..." inline create`;
