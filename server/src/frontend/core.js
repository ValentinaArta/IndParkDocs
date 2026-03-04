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

// Conditional fields shown when contract_type matches
const CONTRACT_TYPE_FIELDS = {
  'Подряда': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'building', name_ru: 'Корпус', field_type: 'select_or_custom', options: [] },
    { name: 'contract_items', name_ru: 'Перечень работ', field_type: 'contract_items' },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number', _readonly: true },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'tenant', name_ru: 'Арендатор', field_type: 'select_or_custom', options: [] },
    { name: 'advances', name_ru: 'Авансы', field_type: 'advances' },
    { name: 'completion_deadline', name_ru: 'Срок выполнения', field_type: 'text' },
  ],
  'Услуг': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_items', name_ru: 'Перечень услуг', field_type: 'contract_items' },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number', _readonly: true },
    { name: 'payment_frequency', name_ru: 'Периодичность оплаты', field_type: 'select_or_custom', options: ['Единовременно','Ежемесячно','Ежеквартально','Раз в полгода','Ежегодно'] },
    { name: 'advances', name_ru: 'Авансы', field_type: 'advances' },
  ],
  'ТО и ППР': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_items', name_ru: 'Перечень работ', field_type: 'contract_items' },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number', _readonly: true },
    { name: 'payment_frequency', name_ru: 'Периодичность оплаты', field_type: 'select_or_custom', options: ['Единовременно','Ежемесячно','Ежеквартально','Раз в полгода','Ежегодно'] },
    { name: 'advances', name_ru: 'Авансы', field_type: 'advances' },
  ],
  'Купли-продажи': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_items', name_ru: 'Перечень товаров', field_type: 'contract_items_sale' },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number', _readonly: true },
  ],
  'Эксплуатации': [
    { name: 'subject', name_ru: 'Предмет договора', field_type: 'text' },
    { name: 'subject_buildings', name_ru: 'Корпуса', field_type: 'subject_buildings' },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
    { name: 'equipment_list', name_ru: 'Оборудование', field_type: 'equipment_list' },
    { name: 'contract_items', name_ru: 'Перечень работ/услуг', field_type: 'contract_items' },
    { name: 'contract_amount', name_ru: 'Сумма договора', field_type: 'number', _readonly: true },
    { name: 'payment_frequency', name_ru: 'Периодичность оплаты', field_type: 'select_or_custom', options: ['Единовременно','Ежемесячно','Ежеквартально','Раз в полгода','Ежегодно'] },
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
  'Аренда оборудования': [
    { name: 'equipment_rent_items', name_ru: 'Предметы аренды', field_type: 'equipment_rent_items' },
    { name: 'rent_monthly', name_ru: 'Стоимость аренды в месяц', field_type: 'number', _group: 'all', _readonly: true },
    { name: 'vat_rate', name_ru: 'НДС (%)', field_type: 'number', _group: 'all' },
    { name: 'duration_type', name_ru: 'Срок действия', field_type: 'select', options: ['Дата', 'Текст'], _group: 'all' },
    { name: 'duration_date', name_ru: 'Дата окончания', field_type: 'date', _group: 'duration_date' },
    { name: 'duration_text', name_ru: 'Срок действия (текст)', field_type: 'text', _group: 'duration_text' },
  ],
  'Обслуживания': [
    { name: 'service_subject', name_ru: 'Описание работ / предмет', field_type: 'text' },
    { name: 'building', name_ru: 'Корпус', field_type: 'select_or_custom', options: [] },
    { name: 'subject_rooms', name_ru: 'Помещения', field_type: 'subject_rooms' },
    { name: 'subject_land_plots', name_ru: 'Земельные участки', field_type: 'subject_land_plots' },
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
