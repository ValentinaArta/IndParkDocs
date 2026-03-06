/* eslint-disable */
module.exports = `
// === Subject Objects — rooms / buildings / land_plots for contract subjects ===

var _subjRoomCnt = 0;
var _subjBldCnt  = 0;
var _subjLpCnt   = 0;
var _subjLppCnt  = 0;

// ── Generic row renderer ────────────────────────────────────────────────────

function _renderSubjRow(type, item, rowId) {
  var srchId = 'subj_' + type + '_' + rowId;
  var list = [];
  var srchField = type;
  if (type === 'room') {
    list = (_rooms || []).map(function(r) {
      var b = (_buildings || []).find(function(b) { return b.id === r.parent_id; });
      return { id: r.id, name: r.name + (b ? ' (' + escapeHtml(b.name) + ')' : '') };
    });
    srchField = 'rent_room';
  } else if (type === 'bld') {
    list = (_buildings || []).map(function(b) { return { id: b.id, name: b.name }; });
    srchField = 'building';
  } else if (type === 'lp') {
    list = (_landPlots || []).map(function(l) { return { id: l.id, name: _lpLabel(l) }; });
    srchField = 'land_plot';
  } else if (type === 'lpp') {
    list = (_landPlotParts || []).map(function(p) { return { id: p.id, name: p.name }; });
    srchField = 'land_plot_part';
  }
  var selId = item ? item.id : '';
  var selName = item ? item.name : '';
  var h = '<div class="subj-row" style="display:flex;align-items:flex-start;gap:6px;margin-bottom:6px">';
  h += '<div style="flex:1">' + renderSearchableSelect(srchId, list, selId, selName, 'начните вводить...', srchField) + '</div>';
  h += '<button type="button" class="btn btn-sm" style="padding:4px 8px;flex-shrink:0" data-subj-type="' + type + '" onclick="removeSubjectRow(this)">✕</button>';
  if (type === 'room') {
    h += '</div>';
    h += '<div style="padding-left:4px">';
    h += '<button type="button" class="btn btn-sm" style="font-size:11px;margin-bottom:4px" data-row="' + rowId + '" onclick="toggleSubjectRoomCreate(this)">+ Создать помещение</button>';
    h += _renderSubjRoomCreateForm(rowId);
  }
  h += '</div>';
  return h;
}

// ── Inline room create mini-form ────────────────────────────────────────────

function _renderSubjRoomCreateForm(rowId) {
  var h = '<div id="subj_room_create_' + rowId + '" style="display:none;border:1px dashed var(--accent);border-radius:6px;padding:10px;margin-bottom:8px;background:var(--bg-secondary)">';
  h += '<div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--accent)">Новое помещение</div>';
  h += '<div class="form-group"><label>Название</label><input id="subj_room_name_' + rowId + '" style="width:100%" placeholder="Кабинет 101..."></div>';
  h += '<div class="form-group"><label>Тип помещения</label><select id="subj_room_type_' + rowId + '" style="width:100%"><option value="">—</option>';
  (OBJECT_TYPES || []).forEach(function(t) { h += '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label>Корпус</label><select id="subj_room_bld_' + rowId + '" style="width:100%"><option value="">— не указан —</option>';
  (_buildings || []).forEach(function(b) { h += '<option value="' + b.id + '">' + escapeHtml(b.name) + '</option>'; });
  h += '</select></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  h += '<div class="form-group"><label>Площадь, м²</label><input type="number" id="subj_room_area_' + rowId + '" style="width:100%"></div>';
  h += '<div class="form-group"><label>Этаж</label><input id="subj_room_floor_' + rowId + '" style="width:100%"></div>';
  h += '</div>';
  h += '<div style="display:flex;gap:8px;margin-top:6px">';
  h += '<button type="button" class="btn btn-primary btn-sm" data-row="' + rowId + '" onclick="submitSubjectRoomCreate(this)">Создать и выбрать</button>';
  h += '<button type="button" class="btn btn-sm" data-row="' + rowId + '" onclick="toggleSubjectRoomCreate(this)">Отмена</button>';
  h += '</div></div>';
  return h;
}

// ── Public render functions ─────────────────────────────────────────────────

function renderSubjectRoomsField(ids) {
  var items = _idsToItems(ids, _rooms, 'room');
  if (!items.length) items = [null];
  _subjRoomCnt = items.length;
  var h = '<div id="f_subject_rooms">';
  items.forEach(function(item, i) { h += _renderSubjRow('room', item, i); });
  h += '<button type="button" class="btn btn-sm" style="margin-top:2px" data-subj-type="room" onclick="addSubjectRow(this)">+ Добавить помещение</button>';
  h += '</div>';
  return h;
}

function renderSubjectBuildingsField(ids) {
  var items = _idsToItems(ids, _buildings, 'bld');
  if (!items.length) items = [null];
  _subjBldCnt = items.length;
  var h = '<div id="f_subject_buildings">';
  items.forEach(function(item, i) { h += _renderSubjRow('bld', item, i); });
  h += '<button type="button" class="btn btn-sm" style="margin-top:2px" data-subj-type="bld" onclick="addSubjectRow(this)">+ Добавить корпус</button>';
  h += '</div>';
  return h;
}

function renderSubjectLandPlotsField(ids) {
  var items = _idsToItems(ids, _landPlots, 'lp');
  if (!items.length) items = [null];
  _subjLpCnt = items.length;
  var h = '<div id="f_subject_land_plots">';
  items.forEach(function(item, i) { h += _renderSubjRow('lp', item, i); });
  h += '<button type="button" class="btn btn-sm" style="margin-top:2px" data-subj-type="lp" onclick="addSubjectRow(this)">+ Добавить участок</button>';
  h += '</div>';
  return h;
}

function renderSubjectLandPlotPartsField(ids) {
  var items = _idsToItems(ids, _landPlotParts, 'lpp');
  if (!items.length) items = [null];
  _subjLppCnt = items.length;
  var h = '<div id="f_subject_land_plot_parts">';
  items.forEach(function(item, i) { h += _renderSubjRow('lpp', item, i); });
  h += '<button type="button" class="btn btn-sm" style="margin-top:2px" data-subj-type="lpp" onclick="addSubjectRow(this)">+ Добавить часть ЗУ</button>';
  h += '</div>';
  return h;
}

// ── Helper: IDs → items with names ─────────────────────────────────────────

function _idsToItems(ids, registry, type) {
  if (!Array.isArray(ids) || !ids.length) return [];
  return ids.map(function(id) {
    var ent = (registry || []).find(function(x) { return x.id === parseInt(id); });
    if (!ent) return { id: parseInt(id), name: String(id) };
    if (type === 'room') {
      var b = (_buildings || []).find(function(b) { return b.id === ent.parent_id; });
      return { id: ent.id, name: ent.name + (b ? ' (' + b.name + ')' : '') };
    }
    return { id: ent.id, name: ent.name };
  });
}

// ── Add / remove rows ───────────────────────────────────────────────────────

function _subjContainerId(type) {
  if (type === 'room') return 'f_subject_rooms';
  if (type === 'bld')  return 'f_subject_buildings';
  if (type === 'lp')   return 'f_subject_land_plots';
  if (type === 'lpp')  return 'f_subject_land_plot_parts';
  return 'f_subject_' + type;
}

function addSubjectRow(btn) {
  var type = btn.getAttribute('data-subj-type');
  var containerId = _subjContainerId(type);
  var container = document.getElementById(containerId);
  if (!container) return;
  var rowId;
  if      (type === 'room') rowId = _subjRoomCnt++;
  else if (type === 'bld')  rowId = _subjBldCnt++;
  else if (type === 'lp')   rowId = _subjLpCnt++;
  else if (type === 'lpp')  rowId = _subjLppCnt++;
  else                      rowId = Date.now();
  var div = document.createElement('div');
  div.innerHTML = _renderSubjRow(type, null, rowId);
  // lastElementChild = the "+ Добавить" button (always last in container);
  // do NOT use querySelector('[data-subj-type]') — remove (✕) buttons inside rows share the same attribute
  var addBtn = container.lastElementChild;
  var child = div.firstElementChild || div.firstChild;
  if (addBtn && addBtn.tagName === 'BUTTON') container.insertBefore(child, addBtn);
  else container.appendChild(child);
  _srchInitAll();
}

function removeSubjectRow(btn) {
  var type = btn.getAttribute('data-subj-type');
  var containerId = _subjContainerId(type);
  var container = document.getElementById(containerId);
  var row = btn.closest('.subj-row');
  var rows = container ? container.querySelectorAll('.subj-row') : [];
  if (rows.length <= 1) {
    var wrap = row ? row.querySelector('.srch-wrap') : null;
    if (wrap) {
      var hid = document.getElementById(wrap.getAttribute('data-srch-id'));
      var txt = document.getElementById(wrap.getAttribute('data-srch-id') + '_text');
      if (hid) hid.value = '';
      if (txt) txt.value = '';
    }
    return;
  }
  if (row) row.remove();
}

// ── Inline room create ──────────────────────────────────────────────────────

function toggleSubjectRoomCreate(btn) {
  var rowId = btn.getAttribute('data-row');
  var panel = document.getElementById('subj_room_create_' + rowId);
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? '' : 'none';
}

async function submitSubjectRoomCreate(btn) {
  var rowId = btn.getAttribute('data-row');
  var nameEl  = document.getElementById('subj_room_name_' + rowId);
  var typeEl  = document.getElementById('subj_room_type_' + rowId);
  var bldEl   = document.getElementById('subj_room_bld_' + rowId);
  var areaEl  = document.getElementById('subj_room_area_' + rowId);
  var floorEl = document.getElementById('subj_room_floor_' + rowId);
  if (!nameEl || !nameEl.value.trim()) return alert('Введите название помещения');
  var roomType = entityTypes.find(function(t) { return t.name === 'room'; });
  if (!roomType) return alert('Тип помещения не найден');
  var props = {};
  if (typeEl && typeEl.value) props.object_type = typeEl.value;
  if (areaEl && areaEl.value) props.area = areaEl.value;
  if (floorEl && floorEl.value) props.floor = floorEl.value;
  var parentId = bldEl && bldEl.value ? parseInt(bldEl.value) : null;
  try {
    var newRoom = await api('/entities', { method: 'POST', body: JSON.stringify({
      entity_type_id: roomType.id, name: nameEl.value.trim(), properties: props, parent_id: parentId
    }) });
    if (_rooms) _rooms.push(newRoom);
    _srchPick('subj_room_' + rowId, newRoom.id);
    var panel = document.getElementById('subj_room_create_' + rowId);
    if (panel) panel.style.display = 'none';
  } catch(err) {
    if (err.status === 409 && err.data && err.data.existing) {
      if (confirm('Помещение уже существует: ' + escapeHtml(err.data.existing.name) + '. Выбрать его?')) {
        _srchPick('subj_room_' + rowId, err.data.existing.id);
        var p2 = document.getElementById('subj_room_create_' + rowId);
        if (p2) p2.style.display = 'none';
      }
    } else { alert('Ошибка: ' + (err.message || err)); }
  }
}

// ── Collect IDs from a subject field container ──────────────────────────────

function collectSubjectIds(containerId) {
  var container = document.getElementById(containerId);
  if (!container) return [];
  var ids = [];
  container.querySelectorAll('.srch-wrap').forEach(function(wrap) {
    var hid = document.getElementById(wrap.getAttribute('data-srch-id'));
    if (hid && hid.value && hid.value !== '') {
      var n = parseInt(hid.value);
      if (!isNaN(n) && ids.indexOf(n) < 0) ids.push(n);
    }
  });
  return ids;
}
`;
