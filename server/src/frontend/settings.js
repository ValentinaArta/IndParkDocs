module.exports = `// ============ SETTINGS ============

function showSettings(tab) {
  currentView = 'settings';
  tab = tab || 'types';
  setActive(null);
  document.querySelectorAll('.nav-item').forEach(el => { if (el.textContent.includes('Типы и поля')) el.classList.add('active'); });
  document.getElementById('pageTitle').textContent = 'Настройки';
  document.getElementById('breadcrumb').textContent = '';

  // Tabs header
  var tabsHtml = '<div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid var(--border)">';
  tabsHtml += '<button id="stab_types" class="btn' + (tab==='types'?' btn-primary':'') + '" onclick="showSettings(\\'types\\')" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">Типы и поля</button>';
  tabsHtml += '<button id="stab_lists" class="btn' + (tab==='lists'?' btn-primary':'') + '" onclick="showSettings(\\'lists\\')" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">Справочники</button>';
  tabsHtml += '</div>';

  if (tab === 'types') {
    document.getElementById('topActions').innerHTML = '<button class="btn btn-primary" onclick="openAddTypeModal()">+ Новый тип</button>';
    let html = tabsHtml + '<div class="entity-grid">';
    entityTypes.forEach(t => {
      html += '<div class="entity-card" onclick="showTypeFields(' + t.id + ')">' +
        '<div class="card-header"><div class="card-icon" style="background:' + t.color + '20;color:' + t.color + '">' + entityIcon(t.name, 20) + '</div>' +
        '<div><div class="card-title">' + t.name_ru + '</div><div class="card-type">' + t.name + '</div></div></div></div>';
    });
    html += '</div>';
    document.getElementById('content').innerHTML = html;
    renderIcons();
  } else {
    document.getElementById('topActions').innerHTML = '';
    document.getElementById('content').innerHTML = tabsHtml + '<div id="settingsListsContent"><div style="padding:40px;text-align:center;color:var(--text-muted)">Загрузка...</div></div>';
    loadSettingsLists();
  }
}

async function showTypeFields(typeId) {
  const type = entityTypes.find(t => t.id === typeId);
  const fields = await api('/entity-types/' + typeId + '/fields');

  document.getElementById('pageTitle').textContent = type.name_ru + ' — Поля';
  document.getElementById('topActions').innerHTML =
    '<button class="btn" onclick="showSettings(\\'types\\')">← Назад</button>' +
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
  renderIcons();
}

function openAddTypeModal() {
  let html = '<h3>Новый тип сущности</h3>' +
    '<div class="form-group"><label>Системное имя (eng)</label><input id="t_name" placeholder="crane_track"></div>' +
    '<div class="form-group"><label>Название (рус)</label><input id="t_name_ru" placeholder="Подкрановый путь"></div>' +
    '<div class="form-group"><label>Иконка</label><input id="t_icon" placeholder="" maxlength="4"></div>' +
    '<div class="form-group"><label>Цвет</label><input type="color" id="t_color" value="#6366F1"></div>' +
    '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitAddType()">Создать</button></div>';
  setModalContent(html);
}

async function submitAddType() {
  const name = document.getElementById('t_name').value.trim();
  const name_ru = document.getElementById('t_name_ru').value.trim();
  const typeIcon = document.getElementById('t_icon').value || '';
  const color = document.getElementById('t_color').value;
  if (!name || !name_ru) return alert('Заполните имя');
  await api('/entity-types', { method: 'POST', body: JSON.stringify({ name, name_ru, icon: typeIcon, color }) });
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

// ============ SETTINGS: СПРАВОЧНИКИ ============

var _settingsLists = [];  // loaded lists from DB

async function loadSettingsLists() {
  try {
    _settingsLists = await api('/entity-types/settings/lists');
    renderSettingsLists();
  } catch(e) {
    var el = document.getElementById('settingsListsContent');
    if (el) el.innerHTML = '<div style="color:var(--danger);padding:20px">Ошибка загрузки: ' + escapeHtml(e.message || String(e)) + '</div>';
  }
}

// Группируем по entity type и рендерим карточки
function renderSettingsLists() {
  var el = document.getElementById('settingsListsContent');
  if (!el) return;

  // Сортируем и группируем по типу сущности
  var groups = {};
  var groupOrder = [];
  _settingsLists.forEach(function(f) {
    var key = f.entity_type_name;
    if (!groups[key]) { groups[key] = { icon: f.icon, name_ru: f.entity_type_name_ru, fields: [] }; groupOrder.push(key); }
    groups[key].fields.push(f);
  });

  // Особый порядок: помещения наверх как самое важное
  var priorityOrder = ['room','equipment','contract','supplement','order','document'];
  groupOrder.sort(function(a, b) {
    var ai = priorityOrder.indexOf(a), bi = priorityOrder.indexOf(b);
    if (ai < 0) ai = 99; if (bi < 0) bi = 99;
    return ai - bi;
  });

  var h = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">';
  groupOrder.forEach(function(typeName) {
    var g = groups[typeName];
    h += '<div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--bg-primary)">';
    h += '<div style="padding:12px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">';
    h += entityIcon(typeName, 18);
    h += '<span style="font-weight:600;font-size:14px">' + escapeHtml(g.name_ru) + '</span>';
    h += '</div>';
    h += '<div style="padding:8px">';
    g.fields.forEach(function(f) {
      var opts = [];
      opts = Array.isArray(f.options) ? f.options : []; try { if (typeof f.options === 'string') opts = JSON.parse(f.options); } catch(ex) {}
      h += '<div style="margin-bottom:8px;padding:10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-secondary)">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
      h += '<span style="font-size:13px;font-weight:600">' + escapeHtml(f.name_ru || f.name) + '</span>';
      h += '<button class="btn btn-sm btn-primary" style="font-size:11px;padding:3px 10px" onclick="openListEditor(' + f.id + ')">Редактировать</button>';
      h += '</div>';
      h += '<div style="display:flex;flex-wrap:wrap;gap:4px">';
      opts.forEach(function(opt) {
        h += '<span style="font-size:11px;padding:2px 8px;background:var(--bg-hover);border:1px solid var(--border);border-radius:20px;color:var(--text-secondary)">' + escapeHtml(opt) + '</span>';
      });
      if (opts.length === 0) h += '<span style="font-size:11px;color:var(--text-muted)">Список пуст</span>';
      h += '</div></div>';
    });
    h += '</div></div>';
  });
  h += '</div>';
  el.innerHTML = h;
}

function openListEditor(fieldId) {
  var field = _settingsLists.find(function(f) { return f.id === fieldId; });
  if (!field) return;
  var opts = [];
  opts = Array.isArray(field.options) ? field.options : []; try { if (typeof field.options === 'string') opts = JSON.parse(field.options); } catch(ex) {}

  var h = '<h3>' + escapeHtml(field.name_ru || field.name) + '</h3>';
  h += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Тип сущности: ' + escapeHtml(field.entity_type_name_ru) + '</div>';

  h += '<div id="listEditorItems" style="margin-bottom:12px">';
  opts.forEach(function(opt, i) {
    h += _renderListEditorItem(opt, i);
  });
  h += '</div>';

  h += '<div style="display:flex;gap:8px;margin-bottom:16px">';
  h += '<input id="listEditorNewItem" placeholder="Новый пункт..." style="flex:1" onkeydown="if(event.key===\\'Enter\\')listEditorAdd(' + fieldId + ')">';
  h += '<button class="btn btn-sm btn-primary" onclick="listEditorAdd(' + fieldId + ')">+ Добавить</button>';
  h += '</div>';

  h += '<div class="modal-actions">';
  h += '<button class="btn" onclick="closeModal()">Отмена</button>';
  h += '<button class="btn btn-primary" onclick="saveListEditor(' + fieldId + ')">Сохранить</button>';
  h += '</div>';

  setModalContent(h);
}

function _renderListEditorItem(text, idx) {
  return '<div class="list-editor-item" data-idx="' + idx + '" style="display:flex;align-items:center;gap:8px;padding:6px 8px;margin-bottom:4px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px">' +
    '<span style="color:var(--text-muted);cursor:grab;font-size:14px">⠿</span>' +
    '<span class="list-editor-text" style="flex:1;font-size:13px">' + escapeHtml(text) + '</span>' +
    '<button class="btn btn-sm" style="padding:2px 6px;font-size:11px" onclick="listEditorInlineEdit(this)">Ред.</button>' +
    '<button class="btn btn-sm btn-danger" style="padding:2px 6px;font-size:11px" onclick="listEditorRemove(this)">×</button>' +
    '</div>';
}

function listEditorInlineEdit(btn) {
  var item = btn.closest('.list-editor-item');
  var textEl = item.querySelector('.list-editor-text');
  var current = textEl.textContent;
  var input = document.createElement('input');
  input.value = current;
  input.style.flex = '1';
  input.style.fontSize = '13px';
  input.onblur = function() {
    if (input.value.trim()) textEl.textContent = input.value.trim();
    item.replaceChild(textEl, input);
    textEl.style.display = '';
  };
  input.onkeydown = function(e) { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = current; input.blur(); } };
  textEl.style.display = 'none';
  item.insertBefore(input, btn);
  input.focus(); input.select();
}

function listEditorRemove(btn) {
  btn.closest('.list-editor-item').remove();
}

function listEditorAdd(fieldId) {
  var inp = document.getElementById('listEditorNewItem');
  var val = inp ? inp.value.trim() : '';
  if (!val) return;
  var container = document.getElementById('listEditorItems');
  if (!container) return;
  var idx = container.querySelectorAll('.list-editor-item').length;
  container.insertAdjacentHTML('beforeend', _renderListEditorItem(val, idx));
  inp.value = '';
  inp.focus();
}

async function saveListEditor(fieldId) {
  var container = document.getElementById('listEditorItems');
  if (!container) return;
  var items = Array.from(container.querySelectorAll('.list-editor-item')).map(function(el) {
    // Check if there's an active inline input
    var input = el.querySelector('input');
    if (input) return input.value.trim();
    return (el.querySelector('.list-editor-text') || {}).textContent || '';
  }).filter(Boolean);

  try {
    var updated = await api('/entity-types/settings/lists/' + fieldId, {
      method: 'PATCH',
      body: JSON.stringify({ options: items })
    });
    // Update local cache
    var idx = _settingsLists.findIndex(function(f) { return f.id === fieldId; });
    if (idx >= 0) _settingsLists[idx].options = updated.options;
    closeModal();
    renderSettingsLists();
    // Sync frontend globals if needed
    _syncFrontendListsFromDB(fieldId, items);
  } catch(e) {
    alert('Ошибка сохранения: ' + escapeHtml(e.message || String(e)));
  }
}

// Синхронизируем фронтенд-переменные после сохранения
function _syncFrontendListsFromDB(fieldId, items) {
  var field = _settingsLists.find(function(f) { return f.id === fieldId; });
  if (!field) return;
  if (field.name === 'object_type' || field.name === 'room_type') {
    // Обновляем OBJECT_TYPES
    OBJECT_TYPES.length = 0;
    items.forEach(function(i) { OBJECT_TYPES.push(i); });
  } else if (field.name === 'equipment_category') {
    EQUIPMENT_CATEGORIES.length = 0;
    items.forEach(function(i) { EQUIPMENT_CATEGORIES.push(i); });
  } else if (field.name === 'status' && field.entity_type_name === 'equipment') {
    EQUIPMENT_STATUSES.length = 0;
    items.forEach(function(i) { EQUIPMENT_STATUSES.push(i); });
  }
}

// ============ UTILS ============

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

init();
`;
