module.exports = `
var _rentObjectCounter = 0;
var OBJECT_TYPES = []; // populated from справочник on startup
var EQUIPMENT_CATEGORIES = []; // populated from справочник on startup
var EQUIPMENT_STATUSES = [];   // populated from справочник on startup

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
  html += '<div style="display:flex;gap:8px;margin-bottom:16px">';
  html += '<button type="button" class="btn btn-sm" onclick="addRentObject()">+ Помещение</button>';
  html += '<button type="button" class="btn btn-sm" onclick="addRentObjectLand()">+ Земельный участок</button>';
  html += '</div>';

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
  html += '<div style="margin:12px 0"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;white-space:nowrap">' +
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

  // External rental — auto-calculated, hidden from user
  html += '<input type="hidden" id="f_external_rental" value="auto">';

  // Electrical power allocation
  var hasPower = props.has_power_allocation === 'true' || props.has_power_allocation === true;
  html += '<div style="margin:8px 0"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;white-space:nowrap">' +
    '<input type="checkbox" id="f_has_power_allocation"' + (hasPower ? ' checked' : '') +
    ' onchange="onPowerAllocationToggle()"> Выделена эл. мощность</label></div>';
  html += '<div id="power_allocation_fields" style="' + (hasPower ? '' : 'display:none;') + 'margin-bottom:12px">';
  html += '<div class="form-group"><label>Эл. мощность по договору (ДС), кВт</label>' +
    '<input type="number" id="f_power_allocation_kw" value="' + escapeHtml(props.power_allocation_kw || '') + '" step="0.1" placeholder="0"></div>';
  html += '</div>';

  // Transfer equipment — button instead of checkbox (#6)
  var hasTransfer = props.transfer_equipment === 'true' || props.transfer_equipment === true;
  html += '<input type="checkbox" id="f_transfer_equipment"' + (hasTransfer ? ' checked' : '') + ' style="display:none">';
  if (hasTransfer) {
    var transferItems = [];
    try {
      if (typeof props.equipment_list === 'string' && props.equipment_list) transferItems = JSON.parse(props.equipment_list);
      else if (Array.isArray(props.equipment_list)) transferItems = props.equipment_list;
    } catch(ex) {}
    html += '<div class="form-group" style="margin-top:8px;border-left:3px solid var(--accent);padding-left:12px">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
    html += '<label style="font-weight:600">Передача оборудования</label>';
    html += '<button type="button" onclick="disableEquipmentTransfer()" style="background:none;border:1px solid var(--border);border-radius:4px;padding:2px 8px;font-size:11px;color:var(--text-muted);cursor:pointer">✕ Убрать</button>';
    html += '</div>';
    html += renderEquipmentListField(transferItems);
    html += '</div>';
  } else {
    html += '<div style="margin-top:10px"><button type="button" onclick="enableEquipmentTransfer()" class="btn btn-sm">+ Передача оборудования по договору</button></div>';
  }

  if (_contractFormTypeName !== 'supplement') html += renderDurationSection(props);
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
    h += '<div class="form-group"><label>Арендная ставка (руб/м²/мес)</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="rent_rate" value="' + (obj.rent_rate || '') + '" oninput="recalcRentMonthly();_autoFillNetRate(this)"></div>';
    // Net rate and utility rate right after rent_rate (#3)
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    var _netRatePrefill = obj.net_rate !== undefined && obj.net_rate !== '' ? obj.net_rate : (obj.rent_rate || '');
    h += '<div class="form-group"><label style="font-size:12px">Ставка чистая (руб/м²/мес)</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="net_rate" value="' + escapeHtml(String(_netRatePrefill)) + '" placeholder="0" oninput="this._netManual=true"></div>';
    h += '<div class="form-group"><label style="font-size:12px">КУ в платеже/ставке</label><input class="ro-field" data-idx="' + index + '" data-name="utility_rate" value="' + escapeHtml(obj.utility_rate || '') + '" placeholder="опишите или сумма"></div>';
    h += '</div>';
    var objTotal = (parseFloat(obj.area) || 0) * (parseFloat(obj.rent_rate) || 0);
    h += '<div id="ro_monthly_' + index + '" style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">' + (objTotal > 0 ? '= ' + _fmtNum(objTotal) + ' руб/мес' : '') + '</div>';
  } else {
    h += '<div class="form-group"><label>Арендная плата</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="fixed_rent" value="' + (obj.fixed_rent || '') + '" oninput="recalcRentMonthly()"></div>';
  }
  // Comment: toggle button (#1)
  var hasCmt = !!(obj.comment && obj.comment.trim());
  h += '<div id="ro_cmt_wrap_' + index + '" style="margin-top:4px">';
  h += '<div id="ro_cmt_block_' + index + '"' + (hasCmt ? '' : ' style="display:none"') + '>';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">' +
    '<label style="font-size:12px;margin:0;color:var(--text-secondary)">Комментарий</label>' +
    '<button type="button" onclick="closeRoComment(' + index + ')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0 4px;font-size:13px">✕</button></div>';
  h += '<input class="ro-field" data-idx="' + index + '" data-name="comment" id="ro_cmt_in_' + index + '" value="' + escapeHtml(obj.comment || '') + '" style="width:100%;box-sizing:border-box">';
  h += '</div>';
  h += '<button type="button" id="ro_cmt_btn_' + index + '" onclick="showRoComment(' + index + ')"' +
    ' style="font-size:11px;background:none;border:1px dashed var(--border);color:var(--text-secondary);border-radius:4px;padding:2px 10px;cursor:pointer;margin-top:2px' + (hasCmt ? ';display:none' : '') + '">Добавить комментарий</button>';
  h += '</div>';
  return h;
}

function showRoComment(index) {
  var block = document.getElementById('ro_cmt_block_' + index);
  var btn = document.getElementById('ro_cmt_btn_' + index);
  if (block) block.style.display = '';
  if (btn) btn.style.display = 'none';
  var inp = document.getElementById('ro_cmt_in_' + index);
  if (inp) inp.focus();
}

function closeRoComment(index) {
  var block = document.getElementById('ro_cmt_block_' + index);
  var btn = document.getElementById('ro_cmt_btn_' + index);
  var inp = document.getElementById('ro_cmt_in_' + index);
  if (inp) inp.value = '';
  if (block) block.style.display = 'none';
  if (btn) btn.style.display = '';
}

function _roRoomCreateMiniForm(index) {
  var h = '<div id="ro_room_create_' + index + '" style="display:none;border:1px dashed var(--accent);border-radius:6px;padding:12px;margin-bottom:8px;background:var(--bg-secondary)">';
  h += '<div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--accent)">Новое помещение — полная форма</div>';
  h += '<div class="form-group"><label>Название / Номер помещения</label><input class="ro-room-name" data-idx="' + index + '" placeholder="Кабинет 101, Склад №3..." style="width:100%"></div>';
  h += '<div class="form-group"><label>Тип помещения</label>';
  h += '<select class="ro-room-type" data-idx="' + index + '" style="width:100%"><option value="">—</option>';
  OBJECT_TYPES.forEach(function(rt) { h += '<option value="' + escapeHtml(rt) + '">' + escapeHtml(rt) + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label>Корпус</label><select class="ro-room-building" data-idx="' + index + '" style="width:100%"><option value="">— не указан —</option>';
  _buildings.forEach(function(b) { h += '<option value="' + b.id + '">' + escapeHtml(b.name) + '</option>'; });
  h += '</select></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  h += '<div class="form-group"><label>Площадь, м²</label><input type="number" class="ro-room-area" data-idx="' + index + '" style="width:100%"></div>';
  h += '<div class="form-group"><label>Этаж</label><input class="ro-room-floor" data-idx="' + index + '" style="width:100%"></div>';
  h += '</div>';
  h += '<div class="form-group"><label>Описание / примечание</label><input class="ro-room-desc" data-idx="' + index + '" style="width:100%"></div>';
  h += '<div style="display:flex;gap:8px;margin-top:8px">';
  h += '<button type="button" class="btn btn-primary btn-sm" onclick="submitRentRoomCreate(this,' + index + ')">Создать и выбрать</button>';
  h += '<button type="button" class="btn btn-sm" onclick="toggleRentRoomCreate(this,' + index + ')">Отмена</button>';
  h += '</div></div>';
  return h;
}


// ─── Room select (no __new__ — uses dedicated create button) ───
function renderRoRoomSelect(index, selectedId) {
  var selId = parseInt(selectedId) || 0;
  var h = '<select class="ro-field" data-idx="' + index + '" data-name="room_id" style="width:100%" onchange="onRoRoomSelect(this,' + index + ')">';
  h += '<option value="">— выберите помещение —</option>';
  _rooms.forEach(function(e) {
    var sel = (e.id === selId) ? ' selected' : '';
    h += '<option value="' + e.id + '"' + sel + '>'+escapeHtml(e.name) + '</option>';
  });
  h += '</select>';
  return h;
}

function onRoRoomSelect(sel, index) {
  var roomId = parseInt(sel.value) || 0;
  if (!roomId) return;
  var room = _rooms.find(function(r) { return r.id === roomId; });
  if (!room || !room.properties) return;
  var objType = room.properties.object_type || '';
  // Auto-fill type
  if (objType) {
    var typeSel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="object_type"]');
    if (typeSel) {
      if (!Array.from(typeSel.options).some(function(o) { return o.value === objType; })) {
        var opt = document.createElement('option');
        opt.value = objType; opt.textContent = objType;
        typeSel.appendChild(opt);
      }
      typeSel.value = objType;
    }
    var typeWrap = document.getElementById('ro_type_wrap_' + index);
    if (typeWrap) typeWrap.style.display = '';
  }
  // Auto-fill building from room parent
  if (room.parent_id) {
    var bldSel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="building_id"]');
    if (bldSel && !bldSel.value) {
      bldSel.value = room.parent_id;
      bldSel.dispatchEvent(new Event('change'));
    }
  }
  // Auto-fill area from room
  var roomArea = room.properties.area || '';
  if (roomArea) {
    var areaEl = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="area"]');
    if (areaEl) { areaEl.value = roomArea; recalcRentMonthly(); }
  }
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
  var nameEl = block.querySelector('.ro-room-name');
  var typeEl = block.querySelector('.ro-room-type');
  var typeCustomEl = block.querySelector('.ro-room-type-custom');
  var roomType = typeEl ? typeEl.value : '';
  var bldEl = block.querySelector('.ro-room-building');
  var descEl = block.querySelector('.ro-room-desc');
  var areaEl = block.querySelector('.ro-room-area');
  var floorEl = block.querySelector('.ro-room-floor');
  var buildingId = bldEl ? (parseInt(bldEl.value) || null) : null;
  var building = buildingId ? (_buildings.find(function(b) { return b.id === buildingId; }) || {}).name || '' : '';
  // Use explicit name field, or auto-generate from type+floor+building
  var roomName = nameEl && nameEl.value.trim() ? nameEl.value.trim() : '';
  if (!roomName) {
    var parts = [];
    if (roomType) parts.push(roomType);
    if (floorEl && floorEl.value.trim()) parts.push('эт.' + floorEl.value.trim());
    if (building) parts.push(building);
    roomName = parts.join(', ') || 'Новое помещение';
  }
  if (!roomName.trim()) return;
  var roomTypeObj = entityTypes.find(function(t) { return t.name === 'room'; });
  if (!roomTypeObj) return alert('Тип Помещение не найден');
  var props = {};
  if (roomType) props.object_type = roomType;
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
    // Select new room in searchable-select component
    _srchPick('ro_room_sel_' + index, newRoom.id);
    block.style.display = 'none';
  } catch(e) { alert('Ошибка: ' + (e.message || e)); }
  finally { btn.disabled = false; btn.textContent = 'Создать и выбрать'; }
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
  // Read from searchable select hidden inputs
  var roRoomHidden = document.getElementById('ro_room_sel_' + index);
  if (roRoomHidden && roRoomHidden.value) obj.room_id = roRoomHidden.value;
  // land_plot_id and land_plot_part_id are read from hidden .ro-field inputs (ro_lp_id_N, ro_lpp_id_N)
  // Resolve entity names from IDs
  if (obj.building_id) {
    var b = _buildings.find(function(e) { return e.id === parseInt(obj.building_id); });
    if (b) obj.building = b.name;
  }
  if (obj.room_id) {
    var r = _rooms.find(function(e) { return e.id === parseInt(obj.room_id); });
    if (r) {
      obj.room = r.name;
      // Always save room area from DB so reports.js and future edits have it
      if (!obj.area && r.properties && r.properties.area) obj.area = String(r.properties.area);
    }
  }
  if (obj.equipment_id) {
    var eq = _equipment.find(function(e) { return e.id === parseInt(obj.equipment_id); });
    if (eq) obj.equipment_name = eq.name;
  }
  if (obj.land_plot_id) {
    var lp = (_landPlots || []).find(function(e) { return e.id === parseInt(obj.land_plot_id); });
    if (lp) obj.land_plot_name = lp.name;
  }
  if (obj.land_plot_part_id) {
    var lpp = (_landPlotParts || []).find(function(e) { return e.id === parseInt(obj.land_plot_part_id); });
    if (lpp) obj.land_plot_part_name = lpp.name;
  }
  return obj;
}

function onRoLandPlotChange(index) {
  var lpSel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="land_plot_id"]');
  var partSel = document.getElementById('ro_lp_part_' + index);
  if (!lpSel || !partSel) return;
  var lpId = parseInt(lpSel.value) || 0;
  var parts = (_landPlotParts || []).filter(function(p) { return p.parent_id === lpId; });
  partSel.innerHTML = '<option value="">— весь участок —</option>';
  parts.forEach(function(p) {
    var opt = document.createElement('option');
    opt.value = p.id; opt.text = p.name;
    partSel.appendChild(opt);
  });
}

// Called when combined land plot/part is picked
function onRoLpCombinedPick(index) {
  var combinedHidden = document.getElementById('ro_lp_combined_' + index);
  var val = combinedHidden ? combinedHidden.value : '';
  var lpIdEl = document.getElementById('ro_lp_id_' + index);
  var lppIdEl = document.getElementById('ro_lpp_id_' + index);
  if (val.indexOf('lpp_') === 0) {
    var partId = parseInt(val.replace('lpp_', ''));
    var part = (_landPlotParts || []).find(function(p) { return p.id === partId; });
    if (lppIdEl) lppIdEl.value = partId;
    if (lpIdEl) lpIdEl.value = part ? part.parent_id : '';
    // Auto-fill area
    if (part && part.properties && part.properties.area) {
      var areaEl = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="area"]');
      if (areaEl) { areaEl.value = part.properties.area; recalcRentMonthly(); }
    }
  } else if (val.indexOf('lp_') === 0) {
    var lpId = parseInt(val.replace('lp_', ''));
    if (lpIdEl) lpIdEl.value = lpId;
    if (lppIdEl) lppIdEl.value = '';
    // Auto-fill area from whole plot
    var lp = (_landPlots || []).find(function(p) { return p.id === lpId; });
    if (lp && lp.properties && lp.properties.area) {
      var areaEl = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="area"]');
      if (areaEl) { areaEl.value = lp.properties.area; recalcRentMonthly(); }
    }
  } else {
    if (lpIdEl) lpIdEl.value = '';
    if (lppIdEl) lppIdEl.value = '';
  }
}

function toggleLpPartCreate(index) {
  var div = document.getElementById('ro_lpp_create_' + index);
  if (div) {
    var show = div.style.display === 'none';
    div.style.display = show ? '' : 'none';
    if (show) setTimeout(function() { _srchInitAll(); }, 50);
  }
}

async function submitLpPartCreate(index) {
  var lpHidden = document.getElementById('ro_lpp_parent_' + index);
  var parentLpId = lpHidden ? parseInt(lpHidden.value) : 0;
  if (!parentLpId) {
    var lpText = document.getElementById('ro_lpp_parent_' + index + '_text');
    if (lpText) { lpText.style.border = '2px solid red'; lpText.focus(); }
    alert('Выберите земельный участок');
    return;
  }

  var name = (document.getElementById('ro_lpp_name_' + index).value || '').trim();
  if (!name) { alert('Укажите название'); return; }
  var area = (document.getElementById('ro_lpp_area_' + index).value || '').trim();
  var desc = (document.getElementById('ro_lpp_desc_' + index).value || '').trim();

  var lpPartType = entityTypes.find(function(t) { return t.name === 'land_plot_part'; });
  if (!lpPartType) { alert('Тип "Часть ЗУ" не найден'); return; }

  var properties = {};
  if (area) properties.area = area;
  if (desc) properties.description = desc;

  try {
    var created = await api('/entities', {
      method: 'POST',
      body: JSON.stringify({ entity_type_id: lpPartType.id, name: name, properties: properties, parent_id: parentLpId })
    });
    _landPlotParts.push(created);

    // Select the new part in combined dropdown
    var parentLp = (_landPlots || []).find(function(lp) { return lp.id === parentLpId; });
    var combinedHidden = document.getElementById('ro_lp_combined_' + index);
    var combinedText = document.getElementById('ro_lp_combined_' + index + '_text');
    var label = name + (area ? ' (' + area + ' м²)' : '') + (parentLp ? ' — ' + parentLp.name : '');
    if (combinedHidden) combinedHidden.value = 'lpp_' + created.id;
    if (combinedText) combinedText.value = label;

    // Set hidden IDs
    var lpIdEl = document.getElementById('ro_lp_id_' + index);
    var lppIdEl = document.getElementById('ro_lpp_id_' + index);
    if (lpIdEl) lpIdEl.value = parentLpId;
    if (lppIdEl) lppIdEl.value = created.id;

    // Auto-fill area
    if (area) {
      var areaEl = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="area"]');
      if (areaEl) { areaEl.value = area; recalcRentMonthly(); }
    }

    toggleLpPartCreate(index);
  } catch(e) { alert('Ошибка: ' + (e.message || e)); }
}
`;
