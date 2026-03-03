/* eslint-disable */
module.exports = `
// === EQUIPMENT FORM — moved from entity-form.js ===

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
  h += '<div class="eq-list-create-panel" id="eq_create_' + rowId + '" style="display:none;border:1px dashed var(--accent);border-radius:6px;padding:12px;margin-bottom:8px;background:var(--bg-secondary)">';
  h += '<div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--accent)">Новая единица оборудования — полная форма</div>';
  h += '<div class="form-group"><label>Название *</label><input class="eq-create-name" data-row="' + rowId + '" placeholder="Введите название" style="width:100%"></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  h += '<div class="form-group"><label>Категория</label><select class="eq-create-cat" data-row="' + rowId + '" onchange="onEqCatChange(this)" style="width:100%"><option value="">—</option>';
  getEquipmentCategories().forEach(function(c) { h += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
  h += '<option value="__custom__">Другое...</option></select>';
  h += '<input class="eq-create-cat-custom" data-row="' + rowId + '" placeholder="Введите категорию" style="display:none;margin-top:4px;width:100%"></div>';
  h += '<div class="form-group"><label>Вид / тип</label><input class="eq-create-kind" data-row="' + rowId + '" placeholder="кран, насос, котёл..." style="width:100%"></div>';
  h += '<div class="form-group"><label>Инв. номер</label><input class="eq-create-inv" data-row="' + rowId + '" style="width:100%"></div>';
  h += '<div class="form-group"><label>Зав. номер</label><input class="eq-create-serial" data-row="' + rowId + '" style="width:100%"></div>';
  h += '<div class="form-group"><label>Год выпуска</label><input type="number" class="eq-create-year" data-row="' + rowId + '" placeholder="2010" style="width:100%"></div>';
  h += '<div class="form-group"><label>Производитель</label><input class="eq-create-mfr" data-row="' + rowId + '" style="width:100%"></div>';
  h += '<div class="form-group"><label>Статус</label><select class="eq-create-status" data-row="' + rowId + '" style="width:100%">';
  (EQUIPMENT_STATUSES.length ? EQUIPMENT_STATUSES : ['В работе','На ремонте','Законсервировано','Списано','Аварийное']).forEach(function(s) { h += '<option value="' + s + '">' + s + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label>Собственник</label><select class="eq-create-owner" data-row="' + rowId + '" style="width:100%"><option value="">—</option>';
  _ownCompanies.forEach(function(c) { h += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'; });
  h += '</select></div>';
  h += '</div>';
  // Location: Корпус/Помещение OR ЗУ (row-scoped via data-row)
  h += '<div class="form-group"><label>Тип расположения</label>';
  h += '<select class="eq-create-loc-type" data-row="' + rowId + '" style="width:100%" onchange="onEqInlineLocTypeChange(this)">';
  h += '<option value="building">Корпус / Помещение</option>';
  h += '<option value="land_plot">Земельный участок</option>';
  h += '</select></div>';
  h += '<div class="eq-create-bld-section" data-row="' + rowId + '">';
  h += '<div class="form-group"><label>Корпус</label><select class="eq-create-building" data-row="' + rowId + '" style="width:100%" onchange="onEqInlineBuildingChange(this)"><option value="">—</option>';
  _buildings.forEach(function(b) { h += '<option value="' + b.id + '">' + escapeHtml(b.name) + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label>Помещение</label><select class="eq-create-room" data-row="' + rowId + '" style="width:100%"><option value="">— не указано —</option>';
  (_rooms || []).forEach(function(r) { h += '<option value="' + r.id + '">' + escapeHtml(r.name) + '</option>'; });
  h += '</select></div>';
  h += '</div>';
  h += '<div class="eq-create-lp-section" data-row="' + rowId + '" style="display:none">';
  h += '<div class="form-group"><label>Земельный участок</label><select class="eq-create-lp" data-row="' + rowId + '" style="width:100%"><option value="">—</option>';
  (_landPlots || []).forEach(function(lp) { h += '<option value="' + lp.id + '">' + escapeHtml(lp.name) + '</option>'; });
  h += '</select></div>';
  h += '</div>';
  h += '<div style="display:flex;gap:8px;margin-top:8px">';
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

function onEqInlineBuildingChange(sel) {
  var rowId = sel.getAttribute('data-row');
  var bid = parseInt(sel.value) || 0;
  var roomSel = document.querySelector('.eq-create-room[data-row="' + rowId + '"]');
  if (!roomSel) return;
  var filteredRooms = bid ? (_rooms || []).filter(function(r) { return r.parent_id === bid; }) : (_rooms || []);
  roomSel.innerHTML = '<option value="">— не указано —</option>';
  filteredRooms.forEach(function(r) {
    roomSel.innerHTML += '<option value="' + r.id + '">' + escapeHtml(r.name) + '</option>';
  });
}

function onEqInlineLocTypeChange(sel) {
  var rowId = sel.getAttribute('data-row');
  var bldSec = document.querySelector('.eq-create-bld-section[data-row="' + rowId + '"]');
  var lpSec = document.querySelector('.eq-create-lp-section[data-row="' + rowId + '"]');
  if (sel.value === 'land_plot') {
    if (bldSec) bldSec.style.display = 'none';
    if (lpSec) lpSec.style.display = '';
  } else {
    if (bldSec) bldSec.style.display = '';
    if (lpSec) lpSec.style.display = 'none';
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
  // Collect all extra fields
  var kindEl   = document.querySelector('.eq-create-kind[data-row="' + rowId + '"]');
  var invEl    = document.querySelector('.eq-create-inv[data-row="' + rowId + '"]');
  var serialEl = document.querySelector('.eq-create-serial[data-row="' + rowId + '"]');
  var yearEl   = document.querySelector('.eq-create-year[data-row="' + rowId + '"]');
  var mfrEl    = document.querySelector('.eq-create-mfr[data-row="' + rowId + '"]');
  var statusEl = document.querySelector('.eq-create-status[data-row="' + rowId + '"]');
  if (kindEl && kindEl.value.trim()) props.equipment_kind = kindEl.value.trim();
  if (invEl && invEl.value.trim()) props.inv_number = invEl.value.trim();
  if (serialEl && serialEl.value.trim()) props.serial_number = serialEl.value.trim();
  if (yearEl && yearEl.value) props.year = yearEl.value;
  if (mfrEl && mfrEl.value.trim()) props.manufacturer = mfrEl.value.trim();
  if (statusEl && statusEl.value) props.status = statusEl.value;

  // Location: building or land plot
  var locTypeSel = document.querySelector('.eq-create-loc-type[data-row="' + rowId + '"]');
  var locType = locTypeSel ? locTypeSel.value : 'building';
  var ownerEl = document.querySelector('.eq-create-owner[data-row="' + rowId + '"]');
  var parentId = null;
  var roomId = null;
  if (locType === 'land_plot') {
    var lpEl = document.querySelector('.eq-create-lp[data-row="' + rowId + '"]');
    parentId = lpEl && lpEl.value ? parseInt(lpEl.value) : null;
  } else {
    var buildingEl = document.querySelector('.eq-create-building[data-row="' + rowId + '"]');
    parentId = buildingEl && buildingEl.value ? parseInt(buildingEl.value) : null;
    var roomEl = document.querySelector('.eq-create-room[data-row="' + rowId + '"]');
    roomId = roomEl && roomEl.value ? parseInt(roomEl.value) : null;
  }
  if (!props.equipment_category) { alert('Заполните обязательные поля: Категория'); return; }
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
    // Create located_in relation if room selected (building mode only)
    if (roomId && newEq && newEq.id) {
      await api('/relations', { method: 'POST', body: JSON.stringify({
        from_entity_id: newEq.id, to_entity_id: roomId, relation_type: 'located_in'
      }) }).catch(function() {});
    }
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

`;
