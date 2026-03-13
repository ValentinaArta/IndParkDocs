/* eslint-disable */
module.exports = `

// ══════════════════════════════════════════════════════════════════════════════
// CONTRACT TYPES DIRECTORY — admin page for managing contract_type_fields
// ══════════════════════════════════════════════════════════════════════════════

var _ctfData = [];       // flat array from /api/contract-type-fields/all
var _ctfTypes = [];      // distinct type names
var _ctfActiveType = ''; // currently selected type

async function showContractTypesPage() {
  showSettings('contract-types');
}

async function _ctfRenderInSettings() {
  var wrap = document.getElementById('ctfSettingsWrap');
  if (!wrap) return;
  wrap.innerHTML = '<div style="padding:24px"><div class="loading-spinner"></div></div>';

  try {
    _ctfData = await api('/contract-type-fields/all');
    _ctfTypes = [];
    var seen = {};
    _ctfData.forEach(function(r) {
      if (!seen[r.contract_type]) { seen[r.contract_type] = true; _ctfTypes.push(r.contract_type); }
    });
    _ctfTypes.sort();
  } catch(e) {
    wrap.innerHTML = '<div style="padding:24px;color:var(--red)">Ошибка загрузки: ' + escapeHtml(e.message || String(e)) + '</div>';
    return;
  }

  var h = '<div style="max-width:1100px">';
  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">';
  h += '<button class="btn btn-primary" onclick="_ctfAddType()" style="margin-left:auto">+ Новый тип</button>';
  h += '</div>';

  // Tabs for types
  h += '<div id="ctfTabs" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px"></div>';

  // Fields table
  h += '<div id="ctfBody"></div>';
  h += '</div>';
  wrap.innerHTML = h;

  _ctfRenderTabs();
  if (_ctfTypes.length) _ctfSelectType(_ctfActiveType && _ctfTypes.indexOf(_ctfActiveType) >= 0 ? _ctfActiveType : _ctfTypes[0]);
}

function _ctfRenderTabs() {
  var h = '';
  _ctfTypes.forEach(function(t) {
    var active = t === _ctfActiveType;
    h += '<button class="btn' + (active ? ' btn-primary' : '') + '" onclick="_ctfSelectType(\\'' + escapeHtml(t).replace(/'/g, "\\\\'") + '\\')" style="font-size:13px;padding:6px 14px">' + escapeHtml(t) + '</button>';
  });
  document.getElementById('ctfTabs').innerHTML = h;
}

function _ctfSelectType(type) {
  _ctfActiveType = type;
  _ctfRenderTabs();
  _ctfRenderFields();
}

function _ctfRenderFields() {
  var fields = _ctfData.filter(function(r) { return r.contract_type === _ctfActiveType; });
  fields.sort(function(a,b) { return (a.sort_order||0) - (b.sort_order||0); });

  var h = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">';
  h += '<span style="font-weight:600;font-size:15px">' + escapeHtml(_ctfActiveType) + '</span>';
  h += '<span style="color:var(--text-secondary);font-size:13px">(' + fields.length + ' полей)</span>';
  h += '<button class="btn" onclick="_ctfRenameType()" style="font-size:12px;padding:4px 10px">✏️ Переименовать</button>';
  h += '<button class="btn" onclick="_ctfDeleteType()" style="font-size:12px;padding:4px 10px;color:var(--red)">🗑 Удалить тип</button>';
  h += '<button class="btn btn-primary" onclick="_ctfAddField()" style="font-size:12px;padding:4px 10px;margin-left:auto">+ Поле</button>';
  h += '</div>';

  h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
  h += '<thead><tr style="background:var(--bg-secondary);text-align:left">';
  h += '<th style="padding:8px;width:40px">№</th>';
  h += '<th style="padding:8px">Имя поля</th>';
  h += '<th style="padding:8px">Название (RU)</th>';
  h += '<th style="padding:8px">Тип</th>';
  h += '<th style="padding:8px">Группа</th>';
  h += '<th style="padding:8px;width:50px">R/O</th>';
  h += '<th style="padding:8px">Опции</th>';
  h += '<th style="padding:8px;width:100px"></th>';
  h += '</tr></thead><tbody>';

  fields.forEach(function(f, i) {
    h += '<tr style="border-bottom:1px solid var(--border)">';
    h += '<td style="padding:6px 8px;color:var(--text-secondary)">' + (i+1) + '</td>';
    h += '<td style="padding:6px 8px;font-family:monospace;font-size:12px">' + escapeHtml(f.field_name) + '</td>';
    h += '<td style="padding:6px 8px">' + escapeHtml(f.name_ru) + '</td>';
    h += '<td style="padding:6px 8px"><code style="background:var(--bg-secondary);padding:2px 6px;border-radius:3px;font-size:11px">' + escapeHtml(f.field_type) + '</code></td>';
    h += '<td style="padding:6px 8px;color:var(--text-secondary)">' + escapeHtml(f.field_group || '—') + '</td>';
    h += '<td style="padding:6px 8px;text-align:center">' + (f.is_readonly ? '✓' : '') + '</td>';
    h += '<td style="padding:6px 8px;font-size:11px;color:var(--text-secondary)">' + (f.options ? escapeHtml(JSON.stringify(f.options)) : '—') + '</td>';
    h += '<td style="padding:6px 8px;display:flex;gap:4px">';
    if (i > 0) h += '<button class="btn" style="padding:2px 6px;font-size:11px" onclick="_ctfMoveField(' + f.id + ',-1)" title="Вверх">↑</button>';
    if (i < fields.length - 1) h += '<button class="btn" style="padding:2px 6px;font-size:11px" onclick="_ctfMoveField(' + f.id + ',1)" title="Вниз">↓</button>';
    h += '<button class="btn" style="padding:2px 6px;font-size:11px" onclick="_ctfEditField(' + f.id + ')" title="Редактировать">✏️</button>';
    h += '<button class="btn" style="padding:2px 6px;font-size:11px;color:var(--red)" onclick="_ctfDeleteField(' + f.id + ')" title="Удалить">✕</button>';
    h += '</td></tr>';
  });

  h += '</tbody></table>';
  document.getElementById('ctfBody').innerHTML = h;
}

// ── Add new contract type ────────────────────────────────────────────────────
function _ctfAddType() {
  var name = prompt('Название нового типа договора:');
  if (!name || !name.trim()) return;
  name = name.trim();
  if (_ctfTypes.indexOf(name) >= 0) { alert('Тип «' + name + '» уже существует'); return; }
  _ctfTypes.push(name);
  _ctfTypes.sort();
  _ctfActiveType = name;
  _ctfRenderTabs();
  _ctfRenderFields();
}

// ── Rename type ──────────────────────────────────────────────────────────────
async function _ctfRenameType() {
  var newName = prompt('Новое название для «' + _ctfActiveType + '»:', _ctfActiveType);
  if (!newName || !newName.trim() || newName.trim() === _ctfActiveType) return;
  newName = newName.trim();
  var fields = _ctfData.filter(function(r) { return r.contract_type === _ctfActiveType; });
  for (var i = 0; i < fields.length; i++) {
    var f = fields[i];
    await api('/contract-type-fields/' + f.id, { method: 'PUT', body: JSON.stringify(Object.assign({}, f, { contract_type: newName })) });
  }
  _ctfActiveType = newName;
  _ctfLoaded = false;
  _ctfRenderInSettings();
}

// ── Delete type ──────────────────────────────────────────────────────────────
async function _ctfDeleteType() {
  var fields = _ctfData.filter(function(r) { return r.contract_type === _ctfActiveType; });
  if (!confirm('Удалить тип «' + _ctfActiveType + '» и все ' + fields.length + ' полей?')) return;
  for (var i = 0; i < fields.length; i++) {
    await api('/contract-type-fields/' + fields[i].id, { method: 'DELETE' });
  }
  _ctfActiveType = '';
  _ctfLoaded = false;
  _ctfRenderInSettings();
}

// ── Field CRUD ───────────────────────────────────────────────────────────────
var _FIELD_TYPES = ['text','number','date','select','select_or_custom','checkbox','contract_items','contract_items_sale','advances','equipment_rent_items','rent_objects','multi_comments','subject_buildings','subject_rooms','subject_land_plots','subject_land_plot_parts'];

function _ctfFieldForm(f) {
  f = f || {};
  var h = '<div style="display:flex;flex-direction:column;gap:10px;min-width:400px">';
  h += '<label>Имя поля (латиница)<input type="text" id="_ctf_fn" value="' + escapeHtml(f.field_name || '') + '" style="width:100%;margin-top:4px"></label>';
  h += '<label>Название (RU)<input type="text" id="_ctf_nr" value="' + escapeHtml(f.name_ru || '') + '" style="width:100%;margin-top:4px"></label>';
  h += '<label>Тип поля<select id="_ctf_ft" style="width:100%;margin-top:4px">';
  _FIELD_TYPES.forEach(function(t) {
    h += '<option value="' + t + '"' + (t === f.field_type ? ' selected' : '') + '>' + t + '</option>';
  });
  h += '</select></label>';
  h += '<label>Группа<input type="text" id="_ctf_fg" value="' + escapeHtml(f.field_group || '') + '" placeholder="all, extra, transfer..." style="width:100%;margin-top:4px"></label>';
  h += '<label>Опции (JSON массив)<input type="text" id="_ctf_op" value="' + escapeHtml(f.options ? JSON.stringify(f.options) : '') + '" placeholder="[&quot;Вариант1&quot;,&quot;Вариант2&quot;]" style="width:100%;margin-top:4px"></label>';
  h += '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="_ctf_ro"' + (f.is_readonly ? ' checked' : '') + '> Только для чтения (readonly)</label>';
  h += '</div>';
  return h;
}

function _ctfReadForm() {
  var opStr = document.getElementById('_ctf_op').value.trim();
  var options = null;
  if (opStr) { try { options = JSON.parse(opStr); } catch(e) { alert('Ошибка в JSON опций: ' + e.message); return null; } }
  var fn = document.getElementById('_ctf_fn').value.trim();
  var nr = document.getElementById('_ctf_nr').value.trim();
  if (!fn || !nr) { alert('Имя поля и название обязательны'); return null; }
  return {
    contract_type: _ctfActiveType,
    field_name: fn,
    name_ru: nr,
    field_type: document.getElementById('_ctf_ft').value,
    field_group: document.getElementById('_ctf_fg').value.trim() || null,
    options: options,
    is_readonly: document.getElementById('_ctf_ro').checked,
  };
}

function _ctfAddField() {
  if (!_ctfActiveType) { alert('Сначала выберите тип'); return; }
  var fields = _ctfData.filter(function(r) { return r.contract_type === _ctfActiveType; });
  var maxSort = fields.reduce(function(m,f) { return Math.max(m, f.sort_order||0); }, 0);

  var h = '<h3 style="margin-top:0">Добавить поле → ' + escapeHtml(_ctfActiveType) + '</h3>';
  h += _ctfFieldForm({});
  h += '<div class="modal-actions" style="margin-top:16px"><button class="btn" onclick="closeModal()">Отмена</button>';
  h += '<button class="btn btn-primary" onclick="_ctfSaveNewField(' + maxSort + ')">Добавить</button></div>';
  setModalContent(h);
}

async function _ctfSaveNewField(maxSort) {
  var data = _ctfReadForm();
  if (!data) return;
  data.sort_order = maxSort + 10;
  await api('/contract-type-fields', { method: 'POST', body: JSON.stringify(data) });
  closeModal();
  await loadContractTypeFields(); // refresh cache
  _ctfRenderInSettings();
}

function _ctfEditField(id) {
  var f = _ctfData.find(function(r) { return r.id === id; });
  if (!f) return;
  var h = '<h3 style="margin-top:0">Редактировать поле</h3>';
  h += _ctfFieldForm(f);
  h += '<div class="modal-actions" style="margin-top:16px"><button class="btn" onclick="closeModal()">Отмена</button>';
  h += '<button class="btn btn-primary" onclick="_ctfSaveEditField(' + id + ',' + (f.sort_order||0) + ')">Сохранить</button></div>';
  setModalContent(h);
}

async function _ctfSaveEditField(id, sortOrder) {
  var data = _ctfReadForm();
  if (!data) return;
  data.sort_order = sortOrder;
  await api('/contract-type-fields/' + id, { method: 'PUT', body: JSON.stringify(data) });
  closeModal();
  await loadContractTypeFields(); // refresh cache
  _ctfRenderInSettings();
}

async function _ctfDeleteField(id) {
  var f = _ctfData.find(function(r) { return r.id === id; });
  if (!f) return;
  if (!confirm('Удалить поле «' + f.name_ru + '» (' + f.field_name + ')?')) return;
  await api('/contract-type-fields/' + id, { method: 'DELETE' });
  _ctfLoaded = false;
  _ctfRenderInSettings();
}

async function _ctfMoveField(id, dir) {
  var fields = _ctfData.filter(function(r) { return r.contract_type === _ctfActiveType; });
  fields.sort(function(a,b) { return (a.sort_order||0) - (b.sort_order||0); });
  var idx = fields.findIndex(function(r) { return r.id === id; });
  if (idx < 0) return;
  var swapIdx = idx + dir;
  if (swapIdx < 0 || swapIdx >= fields.length) return;

  var a = fields[idx], b = fields[swapIdx];
  var tmpSort = a.sort_order;
  a.sort_order = b.sort_order;
  b.sort_order = tmpSort;
  // If they have the same sort_order, nudge
  if (a.sort_order === b.sort_order) { a.sort_order += dir; }

  await api('/contract-type-fields/' + a.id, { method: 'PUT', body: JSON.stringify(a) });
  await api('/contract-type-fields/' + b.id, { method: 'PUT', body: JSON.stringify(b) });
  _ctfLoaded = false;
  _ctfRenderInSettings();
}

`;
