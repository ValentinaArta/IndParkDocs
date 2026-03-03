module.exports = `function renderLandPlotSelectorField(selectedId) {
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

function quickCreateLandPlot() {
  var panel = document.getElementById('lp_quick_panel');
  if (panel) { panel.style.display = panel.style.display === 'none' ? '' : 'none'; return; }
  // Insert inline form after the button
  var btn = document.querySelector('[onclick*="quickCreateLandPlot"]');
  if (!btn) return;
  var wrap = btn.parentElement;
  var ownerOpts = (_ownCompanies||[]).map(function(c) {
    return '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>';
  }).join('');
  var formHtml = '<div id="lp_quick_panel" style="border:1px solid var(--border);border-radius:6px;padding:12px;margin-top:8px;background:var(--bg-hover)">';
  formHtml += '<div style="font-weight:600;margin-bottom:8px;font-size:13px">Новый земельный участок</div>';
  formHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  formHtml += '<div class="form-group" style="margin:0"><label style="font-size:12px">Название *</label><input id="qlp_name" placeholder="ЗУ кад.номер"></div>';
  formHtml += '<div class="form-group" style="margin:0"><label style="font-size:12px">Кадастровый номер</label><input id="qlp_cadastral"></div>';
  formHtml += '<div class="form-group" style="margin:0"><label style="font-size:12px">Площадь, кв.м.</label><input id="qlp_area" type="number"></div>';
  formHtml += '<div class="form-group" style="margin:0"><label style="font-size:12px">Собственник</label><select id="qlp_owner"><option value="">—</option>' + ownerOpts + '</select></div>';
  formHtml += '</div>';
  formHtml += '<div class="form-group" style="margin:8px 0 0"><label style="font-size:12px">Адрес</label><input id="qlp_address" placeholder="адрес"></div>';
  formHtml += '<div style="margin-top:8px;display:flex;gap:6px"><button type="button" class="btn btn-primary btn-sm" onclick="submitQuickLandPlot()">Создать ЗУ</button>';
  formHtml += '<button type="button" class="btn btn-sm" data-action="hide-lp-panel">Отмена</button></div>';
  formHtml += '</div>';
  wrap.insertAdjacentHTML('afterend', formHtml);
  var hideBtn = document.querySelector('[data-action="hide-lp-panel"]');
  if (hideBtn) hideBtn.addEventListener('click', function() { document.getElementById('lp_quick_panel').style.display = 'none'; });
}

async function submitQuickLandPlot() {
  var nameEl = document.getElementById('qlp_name');
  var name = nameEl ? nameEl.value.trim() : '';
  if (!name) return alert('Введите название');
  var lpType = entityTypes.find(function(t) { return t.name === 'land_plot'; });
  if (!lpType) { alert('Тип ЗУ не найден'); return; }
  var props = {};
  var cn = document.getElementById('qlp_cadastral'); if (cn && cn.value.trim()) props.cadastral_number = cn.value.trim();
  var ar = document.getElementById('qlp_area'); if (ar && ar.value) props.area = ar.value;
  var ad = document.getElementById('qlp_address'); if (ad && ad.value.trim()) props.address = ad.value.trim();
  var ow = document.getElementById('qlp_owner');
  if (ow && ow.value) {
    var owEnt = (_ownCompanies||[]).find(function(c){ return c.id === parseInt(ow.value); });
    if (owEnt) { props.balance_owner_id = owEnt.id; props.balance_owner_name = owEnt.name; }
  }
  try {
    var created = await api('/entities', { method: 'POST', body: JSON.stringify({
      entity_type_id: lpType.id, name: name, properties: props
    }) });
    _landPlots = await loadEntitiesByType('land_plot');
    var sel = document.getElementById('f_land_plot_id');
    if (sel) {
      sel.innerHTML = '<option value="">— не указано —</option>' + _landPlots.map(function(lp) {
        var c = (lp.properties || {}).cadastral_number;
        var label = c ? c + ' — ' + escapeHtml(lp.name) : escapeHtml(lp.name);
        var s = lp.id === created.id ? ' selected' : '';
        return '<option value="' + lp.id + '"' + s + '>' + label + '</option>';
      }).join('');
    }
    var panel = document.getElementById('lp_quick_panel');
    if (panel) panel.style.display = 'none';
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
    h += '<option value="' + e.id + '"' + sel + '>' + escapeHtml(e.name) + '</option>';
  });
  h += '<option value="__new__">+ Создать новый...</option>';
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

// Render a select_or_custom dropdown backed by a registry (entities list)
// Stores entity NAME as value (backward compat with string fields like building, tenant)
function renderRegistrySelectField(fieldId, entities, val, placeholder) {
  var inList = entities.find(function(e) { return e.name === val; });
  var isCustom = val && !inList;
  var h = '<div style="display:flex;gap:6px;align-items:center">';
  h += '<select id="' + fieldId + '" onchange="toggleCustomInput(this)" style="flex:1">';
  h += '<option value="">—</option>';
  entities.forEach(function(ent) {
    var name = ent.name || '';
    h += '<option value="' + escapeHtml(name) + '"' + (name === val ? ' selected' : '') + '>' + escapeHtml(name) + '</option>';
  });
  h += '<option value="__custom__"' + (isCustom ? ' selected' : '') + '>Другое...</option>';
  h += '</select>';
  h += '<input id="' + fieldId + '_custom" placeholder="' + escapeHtml(placeholder || 'Введите значение') + '" value="' + (isCustom ? escapeHtml(val) : '') + '" style="flex:1;' + (isCustom ? '' : 'display:none') + '">';
  h += '</div>';
  return h;
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
  h += '<div style="font-size:12px;font-weight:600;margin-bottom:8px">Новое оборудование</div>';
  h += '<div class="form-group"><label>Название *</label><input class="eq-create-name" data-row="' + rowId + '" placeholder="Введите название" style="width:100%"></div>';
  h += '<div class="form-group"><label>Категория</label><select class="eq-create-cat" data-row="' + rowId + '" onchange="onEqCatChange(this)"><option value="">—</option>';
  getEquipmentCategories().forEach(function(c) { h += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
  h += '<option value="__custom__">Другое...</option></select>';
  h += '<input class="eq-create-cat-custom" data-row="' + rowId + '" placeholder="Введите категорию" style="display:none;margin-top:4px;width:100%"></div>';
  h += '<div class="form-group"><label>Корпус</label><select class="eq-create-building" data-row="' + rowId + '" style="width:100%" onchange="onEqInlineBuildingChange(this)"><option value="">—</option>';
  _buildings.forEach(function(b) { h += '<option value="' + b.id + '">' + escapeHtml(b.name) + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label>Помещение</label><select class="eq-create-room" data-row="' + rowId + '" style="width:100%"><option value="">— не указано —</option>';
  (_rooms || []).forEach(function(r) { h += '<option value="' + r.id + '">' + escapeHtml(r.name) + '</option>'; });
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
  var roomEl = document.querySelector('.eq-create-room[data-row="' + rowId + '"]');
  var roomId = roomEl && roomEl.value ? parseInt(roomEl.value) : null;
  var body = { entity_type_id: eqTypeId, name: nameEl.value.trim(), properties: props };
  if (parentId) body.parent_id = parentId;
  try {
    var newEq = await api('/entities', { method: 'POST', body: JSON.stringify(body) });
    // Create located_in relation if room selected
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

// ============ ACT ITEMS ============

var _actItemCounter = 0;
var _actEquipmentList = null;  // filtered to contract's equipment when creating act

function _renderActItem(item, rowId, bgIdx) {
  var eqList = _actEquipmentList || _equipment;
  var rowBg = item.broken ? 'rgba(239,68,68,.08)' : 'var(--bg-primary)';
  var rowBorder = item.broken ? '#dc2626' : 'var(--border)';
  var h = '<div class="act-item-row" data-row="' + rowId + '" style="margin-bottom:8px;padding:10px;border:1px solid ' + rowBorder + ';border-radius:8px;background:' + rowBg + ';box-shadow:0 1px 3px rgba(0,0,0,.06)">';
  // Row 1: equipment + amount + delete
  h += '<div style="display:grid;grid-template-columns:2fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px">';
  h += '<div><label style="font-size:11px;color:var(--text-muted)">Оборудование *</label>';
  h += '<select class="act-item-eq" style="width:100%;margin-top:2px"><option value="">— выберите —</option>';
  eqList.forEach(function(e) {
    var sel = (e.id === parseInt(item.equipment_id)) ? ' selected' : '';
    h += '<option value="' + e.id + '"' + sel + '>' + escapeHtml(e.name) + '</option>';
  });
  h += '</select></div>';
  h += '<div><label style="font-size:11px;color:var(--text-muted)">Сумма, ₽</label>';
  h += '<input type="number" class="act-item-amount" value="' + (item.amount || '') + '" placeholder="0" style="width:100%;margin-top:2px" oninput="recalcActTotal()"></div>';
  h += '<button type="button" class="btn btn-sm" style="color:var(--danger)" onclick="actItemRemove(this)">×</button>';
  h += '</div>';
  // Row 2: description + comment stacked (full width, both-resizable)
  h += '<div style="display:flex;flex-direction:column;gap:6px">';
  h += '<div><label style="font-size:11px;color:var(--text-muted)">Описание работ</label>';
  h += '<textarea class="act-item-desc" placeholder="что выполнено..." style="width:100%;margin-top:2px;resize:both;min-height:56px;font-size:12px;box-sizing:border-box">' + escapeHtml(item.description || '') + '</textarea></div>';
  var brokenChecked = item.broken ? ' checked' : '';
  var brokenBorder = item.broken ? 'var(--danger)' : 'var(--border)';
  var brokenBg = item.broken ? 'rgba(239,68,68,.08)' : 'transparent';
  h += '<div><label style="font-size:11px;color:var(--text-muted)">Работы/замечания</label>';
  h += '<div style="display:flex;gap:6px;align-items:flex-end;margin-top:2px">';
  h += '<textarea class="act-item-comment" placeholder="состояние, замечания..." style="flex:1;resize:both;min-height:56px;font-size:12px;box-sizing:border-box">' + escapeHtml(item.comment || '') + '</textarea>';
  h += '<label class="act-item-broken-label" style="display:inline-flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-size:11px;padding:4px 7px;border-radius:5px;border:1px solid ' + brokenBorder + ';background:' + brokenBg + ';transition:all .15s;color:' + (item.broken ? 'var(--danger)' : 'var(--text-muted)') + ';text-align:center;min-width:70px;white-space:nowrap;flex-shrink:0">';
  h += '<input type="checkbox" class="act-item-broken"' + brokenChecked + ' onchange="_onActItemBrokenChange(this)">';
  h += '⚠️ Нерабочий/<br>аварийный</label>';
  h += '</div></div>';
  h += '</div>';  // closes row2
  h += '</div>';  // closes act-item-row outer div
  return h;
}

function renderActItemsField(items) {
  if (!Array.isArray(items) || items.length === 0) items = [{}];
  _actItemCounter = items.length;
  var h = '<div id="f_act_items" style="background:transparent;padding:0;margin-top:4px">';
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
  } else if (f.field_type === 'contacts') {
    var contacts = [];
    try { if (typeof val === 'string' && val) contacts = JSON.parse(val); } catch(ex) {}
    if (!Array.isArray(contacts)) contacts = [];
    if (contacts.length === 0) contacts = [{}];
    return _renderContactsList(id, contacts);
  } else {
    return '<input id="' + id + '" value="' + escapeHtml(String(val)) + '">';
  }
}

var _contactsCounter = 0;
function _renderContactsList(id, contacts) {
  _contactsCounter = contacts.length;
  var h = '<div id="' + id + '_wrap">';
  contacts.forEach(function(c, i) { h += _renderContactBlock(id, i, c); });
  h += '</div>';
  h += '<button type="button" class="btn btn-sm" style="margin-top:4px;font-size:11px" onclick="_addContact(\\''+id+'\\')">+ Добавить контакт</button>';
  h += '<input type="hidden" id="' + id + '">';
  return h;
}

function _renderContactBlock(fieldId, index, c) {
  c = c || {};
  var h = '<div class="contact-block" data-field="' + fieldId + '" data-idx="' + index + '" style="border-left:3px solid var(--accent);padding:8px 10px;margin-bottom:8px;background:var(--bg);border-radius:4px;position:relative">';
  if (index > 0) h += '<button type="button" onclick="_removeContact(\\''+fieldId+'\\','+index+')" style="position:absolute;top:4px;right:6px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px">✕</button>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  h += '<div><label style="font-size:11px;color:var(--text-secondary)">ФИО</label><input class="ct-name" data-idx="'+index+'" value="'+escapeHtml(c.name||'')+'" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px"></div>';
  h += '<div><label style="font-size:11px;color:var(--text-secondary)">Должность</label><input class="ct-position" data-idx="'+index+'" value="'+escapeHtml(c.position||'')+'" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px"></div>';
  h += '<div><label style="font-size:11px;color:var(--text-secondary)">Телефон</label><input class="ct-phone" data-idx="'+index+'" value="'+escapeHtml(c.phone||'')+'" placeholder="+7..." style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px"></div>';
  h += '<div><label style="font-size:11px;color:var(--text-secondary)">Email</label><input class="ct-email" data-idx="'+index+'" value="'+escapeHtml(c.email||'')+'" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px"></div>';
  h += '</div></div>';
  return h;
}

function _addContact(fieldId) {
  var wrap = document.getElementById(fieldId + '_wrap');
  if (!wrap) return;
  var div = document.createElement('div');
  div.innerHTML = _renderContactBlock(fieldId, _contactsCounter, {});
  wrap.appendChild(div.firstElementChild);
  _contactsCounter++;
}

function _removeContact(fieldId, index) {
  var block = document.querySelector('.contact-block[data-field="'+fieldId+'"][data-idx="'+index+'"]');
  if (block) block.remove();
}

function _collectContacts(fieldId) {
  var blocks = document.querySelectorAll('.contact-block[data-field="'+fieldId+'"]');
  var arr = [];
  blocks.forEach(function(b) {
    var name = (b.querySelector('.ct-name') || {}).value || '';
    var position = (b.querySelector('.ct-position') || {}).value || '';
    var phone = (b.querySelector('.ct-phone') || {}).value || '';
    var email = (b.querySelector('.ct-email') || {}).value || '';
    if (name || phone || email) arr.push({name:name, position:position, phone:phone, email:email});
  });
  return arr;
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
  if (f.field_type === 'contacts') {
    var cts = _collectContacts('f_' + f.name);
    return cts.length > 0 ? JSON.stringify(cts) : null;
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

// ── Contract items field (Подряда / Услуг / Купли-продажи) ──────────────────
function renderContractItemsField(items, isSale) {
  if (!Array.isArray(items) || !items.length) items = [{}];
  var h = '<div id="f_contract_items_wrapper" data-sale="' + (isSale ? '1' : '0') + '">';
  h += '<div id="f_contract_items_list">';
  items.forEach(function(item, i) { h += _renderContractItem(item, i, isSale); });
  h += '</div>';
  h += '<button type="button" class="btn btn-sm" onclick="contractItemAdd()" style="margin-top:4px">+ Добавить позицию</button>';
  h += '</div>';
  return h;
}

function _renderContractItem(item, idx, isSale) {
  var h = '<div class="contract-item" data-idx="' + idx + '" style="display:flex;gap:6px;align-items:center;margin-bottom:6px">';
  if (isSale) {
    h += '<input class="ci-name" data-idx="' + idx + '" placeholder="Наименование" value="' + escapeHtml(item.name||'') + '" style="flex:2;min-width:0" oninput="recalcContractAmount()">';
    h += '<input class="ci-qty" data-idx="' + idx + '" type="number" min="0" placeholder="Кол-во" value="' + escapeHtml(String(item.qty||1)) + '" style="width:65px" oninput="recalcContractAmount()">';
    h += '<input class="ci-uprice" data-idx="' + idx + '" type="number" min="0" placeholder="Цена, ₽" value="' + escapeHtml(String(item.unit_price||'')) + '" style="width:100px" oninput="recalcContractAmount()">';
    h += '<span class="ci-total" data-idx="' + idx + '" style="width:90px;font-size:12px;color:var(--text-secondary);white-space:nowrap">' + (item.amount ? item.amount + ' ₽' : '') + '</span>';
  } else {
    h += '<input class="ci-name" data-idx="' + idx + '" placeholder="Наименование работ/услуг" value="' + escapeHtml(item.name||'') + '" style="flex:2;min-width:0" oninput="recalcContractAmount()">';
    h += '<input class="ci-amount" data-idx="' + idx + '" type="number" min="0" placeholder="Сумма, ₽" value="' + escapeHtml(String(item.amount||'')) + '" style="width:120px" oninput="recalcContractAmount()">';
  }
  h += '<button type="button" onclick="contractItemRemove(this)" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:18px;padding:0 4px;line-height:1">×</button>';
  h += '</div>';
  return h;
}

function contractItemAdd() {
  var wrapper = document.getElementById('f_contract_items_wrapper');
  var list = document.getElementById('f_contract_items_list');
  if (!wrapper || !list) return;
  var isSale = wrapper.getAttribute('data-sale') === '1';
  var items = list.querySelectorAll('.contract-item');
  var idx = items.length;
  var div = document.createElement('div');
  div.innerHTML = _renderContractItem({}, idx, isSale);
  list.appendChild(div.firstElementChild);
}

function contractItemRemove(btn) {
  var item = btn.closest('.contract-item');
  if (item) item.remove();
  recalcContractAmount();
  // Renumber indices
  var list = document.getElementById('f_contract_items_list');
  if (list) list.querySelectorAll('.contract-item').forEach(function(el, i) {
    el.setAttribute('data-idx', i);
    el.querySelectorAll('[data-idx]').forEach(function(inp) { inp.setAttribute('data-idx', i); });
  });
}

function recalcContractAmount() {
  var wrapper = document.getElementById('f_contract_items_wrapper');
  if (!wrapper) return;
  var isSale = wrapper.getAttribute('data-sale') === '1';
  var total = 0;
  var list = document.getElementById('f_contract_items_list');
  if (!list) return;
  list.querySelectorAll('.contract-item').forEach(function(item) {
    if (isSale) {
      var qty = parseFloat(item.querySelector('.ci-qty').value) || 0;
      var up = parseFloat(item.querySelector('.ci-uprice').value) || 0;
      var rowAmt = qty * up;
      var totalEl = item.querySelector('.ci-total');
      if (totalEl) totalEl.textContent = rowAmt ? rowAmt.toLocaleString('ru-RU') + ' ₽' : '';
      total += rowAmt;
    } else {
      var amt = parseFloat(item.querySelector('.ci-amount').value) || 0;
      total += amt;
    }
  });
  var amtEl = document.getElementById('f_contract_amount');
  if (amtEl) amtEl.value = total || '';
}

function getContractItemsValue() {
  var wrapper = document.getElementById('f_contract_items_wrapper');
  if (!wrapper) return null;
  var isSale = wrapper.getAttribute('data-sale') === '1';
  var list = document.getElementById('f_contract_items_list');
  if (!list) return [];
  var items = [];
  list.querySelectorAll('.contract-item').forEach(function(item) {
    var name = (item.querySelector('.ci-name') || {}).value || '';
    if (isSale) {
      var qty = parseFloat((item.querySelector('.ci-qty') || {}).value) || 0;
      var up = parseFloat((item.querySelector('.ci-uprice') || {}).value) || 0;
      items.push({ name: name.trim(), qty: qty, unit_price: up, amount: qty * up });
    } else {
      var amt = parseFloat((item.querySelector('.ci-amount') || {}).value) || 0;
      if (name.trim() || amt) items.push({ name: name.trim(), amount: amt });
    }
  });
  return items;
}

// ── Duration (Срок действия) collapsible section ─────────────────────────────
function renderDurationSection(props) {
  props = props || {};
  var dType = props.duration_type || '';
  var dDate = props.duration_date || props.contract_end_date || '';
  var dText = props.duration_text || '';
  var hasValue = !!(dDate || dText || dType);
  var h = '<div id="duration_section" style="margin-top:4px">';
  if (hasValue) {
    h += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Срок действия';
    h += ' <button type="button" onclick="clearDurationSection()" style="background:none;border:none;color:var(--text-muted);font-size:11px;cursor:pointer;padding:0 4px">✕ убрать</button></div>';
    h += '<div id="duration_fields">' + _renderDurationFields(props) + '</div>';
  } else {
    h += '<div id="duration_fields" style="display:none">' + _renderDurationFields(props) + '</div>';
    h += '<button type="button" class="btn btn-sm" onclick="toggleDurationSection()" style="font-size:12px;color:var(--text-secondary)">+ Добавить срок действия</button>';
  }
  h += '</div>';
  return h;
}

function _renderDurationFields(props) {
  props = props || {};
  var dType = props.duration_type || '';
  var dDate = props.duration_date || props.contract_end_date || '';
  var dText = props.duration_text || '';
  var h = '<div class="form-group"><label style="font-size:12px">Тип срока</label>';
  h += '<select id="f_duration_type" onchange="onDurationTypeChange()" style="width:100%">';
  h += '<option value="">— выберите —</option>';
  h += '<option value="Дата"' + (dType === 'Дата' ? ' selected' : '') + '>Дата окончания</option>';
  h += '<option value="Текст"' + (dType === 'Текст' ? ' selected' : '') + '>Произвольный текст</option>';
  h += '</select></div>';
  var showDate = (dType === 'Дата' || dDate);
  var showText = (dType === 'Текст' || dText);
  h += '<div id="dur_date_wrap" class="form-group" style="' + (showDate ? '' : 'display:none') + '">';
  h += '<label style="font-size:12px">Дата окончания</label>';
  h += '<input type="date" id="f_duration_date" value="' + escapeHtml(dDate) + '"></div>';
  h += '<div id="dur_text_wrap" class="form-group" style="' + (showText ? '' : 'display:none') + '">';
  h += '<label style="font-size:12px">Описание срока</label>';
  h += '<input id="f_duration_text" value="' + escapeHtml(dText) + '" placeholder="например: 1 год с момента подписания"></div>';
  return h;
}

function toggleDurationSection() {
  var fields = document.getElementById('duration_fields');
  var btn = document.querySelector('[onclick*="toggleDurationSection"]');
  if (!fields) return;
  fields.style.display = '';
  if (btn) btn.style.display = 'none';
  // Add "убрать" label
  var sec = document.getElementById('duration_section');
  if (sec) {
    var lbl = sec.querySelector('[onclick*="clearDurationSection"]');
    if (!lbl) {
      var h = document.createElement('div');
      h.style.cssText = 'font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px';
      h.innerHTML = 'Срок действия <button type="button" onclick="clearDurationSection()" style="background:none;border:none;color:var(--text-muted);font-size:11px;cursor:pointer;padding:0 4px">✕ убрать</button>';
      sec.insertBefore(h, fields);
    }
  }
}

function onDurationTypeChange() {
  var sel = document.getElementById('f_duration_type');
  var v = sel ? sel.value : '';
  var dw = document.getElementById('dur_date_wrap');
  var tw = document.getElementById('dur_text_wrap');
  if (dw) dw.style.display = (v === 'Дата') ? '' : 'none';
  if (tw) tw.style.display = (v === 'Текст') ? '' : 'none';
}

function clearDurationSection() {
  var sec = document.getElementById('duration_section');
  if (!sec) return;
  var dt = document.getElementById('f_duration_type'); if (dt) dt.value = '';
  var dd = document.getElementById('f_duration_date'); if (dd) dd.value = '';
  var dtt = document.getElementById('f_duration_text'); if (dtt) dtt.value = '';
  var fields = document.getElementById('duration_fields');
  if (fields) fields.style.display = 'none';
  var lbl = sec.querySelector('[onclick*="clearDurationSection"]');
  if (lbl && lbl.parentElement) lbl.parentElement.remove();
  var addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn btn-sm';
  addBtn.setAttribute('onclick', 'toggleDurationSection()');
  addBtn.style.cssText = 'font-size:12px;color:var(--text-secondary)';
  addBtn.textContent = '+ Добавить срок действия';
  sec.appendChild(addBtn);
}

function renderDynamicFields(contractType, props) {
  const container = document.getElementById('dynamicFieldsContainer');
  if (!container) return;
  const extraFields = CONTRACT_TYPE_FIELDS[contractType] || [];
  if (extraFields.length === 0) {
    if (_contractFormTypeName !== 'supplement') container.innerHTML = renderDurationSection(props || {});
    return;
  }

  if (contractType === 'Аренды' || contractType === 'Субаренды') {
    renderRentFields(container, extraFields, props);
    _srchInitAll();
    return;
  }

  if (contractType === 'Аренда оборудования') {
    renderEquipmentRentFields(container, extraFields, props || {});
    _srchInitAll();
    return;
  }

  let html = '';
  extraFields.forEach(function(f) {
    const val = props ? (props[f.name] || '') : '';
    if (f.name === 'building') {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderRegistrySelectField('f_building', _buildings, val, 'Введите название корпуса') + '</div>';
    } else if (f.name === 'tenant') {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderRegistrySelectField('f_tenant', _allCompanies, val, 'Введите название арендатора') + '</div>';
    } else if (f.field_type === 'contract_items' || f.field_type === 'contract_items_sale') {
      var isSale = (f.field_type === 'contract_items_sale');
      var items = [];
      try { items = JSON.parse(val || '[]'); } catch(ex) {}
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderContractItemsField(items, isSale) + '</div>';
    } else if (f.name === 'contract_amount' && f._readonly) {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + ' (авто)</label><input type="number" id="f_contract_amount" value="' + escapeHtml(String(val)) + '" readonly style="background:var(--bg-secondary);font-weight:600;color:var(--accent)"></div>';
    } else {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(f, val) + '</div>';
    }
  });
  if (_contractFormTypeName !== 'supplement') html += renderDurationSection(props || {});
  container.innerHTML = html;
}`;
