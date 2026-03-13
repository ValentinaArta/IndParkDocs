/* eslint-disable */
module.exports = `
// Subject-only version for new 3-section layout
function renderRentSubjectOnly(container, allFields, props) {
  props = props || {};
  var objects = Array.isArray(props.rent_objects) ? props.rent_objects : [];
  if (objects.length === 0) objects = [{}];
  _rentObjectCounter = objects.length;

  var html = '<div id="rent_objects_container">';
  objects.forEach(function(obj, i) { html += renderRentObjectBlock(i, obj); });
  html += '</div>';
  html += '<div style="display:flex;gap:8px;margin-bottom:16px">';
  html += '<button type="button" class="btn btn-sm" onclick="addRentObject()">+ Помещение</button>';
  html += '<button type="button" class="btn btn-sm" onclick="addRentObjectLand()">+ Земельный участок</button>';
  html += '</div>';

  // Equipment is now managed in React (/app/) — removed legacy transfer_equipment UI

  container.innerHTML = html;
  recalcRentMonthly();
}

function renderRentFields(container, allFields, props) {
  props = props || {};
  var hasExtra = props.extra_services === 'true' || props.extra_services === true;
  var durationType = props.duration_type || '';

  var objects = Array.isArray(props.rent_objects) ? props.rent_objects : [];
  if (objects.length === 0) objects = [{}];
  _rentObjectCounter = objects.length;

  var html = '';
  html += '<div id="rent_objects_container">';
  objects.forEach(function(obj, i) { html += renderRentObjectBlock(i, obj); });
  html += '</div>';
  html += '<div style="display:flex;gap:8px;margin-bottom:16px">';
  html += '<button type="button" class="btn btn-sm" onclick="addRentObject()">+ Помещение</button>';
  html += '<button type="button" class="btn btn-sm" onclick="addRentObjectLand()">+ Земельный участок</button>';
  html += '</div>';

  var rentMonthly = props.rent_monthly || '';
  html += '<div class="form-group"><label>Арендная плата в месяц</label>' +
    '<input type="number" id="f_rent_monthly" value="' + rentMonthly + '" readonly style="background:#f1f5f9;font-weight:600">' +
    '</div>';

  var vatVal = props.vat_rate || '22';
  html += '<div class="form-group"><label>НДС (%)</label>' +
    '<div style="display:flex;gap:6px;align-items:center">' +
    '<input type="number" id="f_vat_rate" value="' + vatVal + '" style="width:80px" oninput="updateVatDisplay()">' +
    '<span id="vat_display" style="font-size:12px;color:var(--text-secondary)"></span>' +
    '</div></div>';

  html += '<div style="margin:12px 0"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;white-space:nowrap">' +
    '<input type="checkbox" id="f_extra_services"' + (hasExtra ? ' checked' : '') +
    ' onchange="onRentFieldChange()"> Доп. услуги</label></div>';

  if (hasExtra) {
    html += '<div class="form-group"><label>Описание доп. услуг</label>' +
      '<input id="f_extra_services_desc" value="' + escapeHtml(props.extra_services_desc || '') + '"></div>';
    html += '<div class="form-group"><label>Стоимость в месяц</label>' +
      '<input type="number" id="f_extra_services_cost" value="' + (props.extra_services_cost || '') + '" oninput="recalcRentMonthly()"></div>';
  }

  html += '<div class="form-group"><label>Комментарии</label>' + renderCommentsBlock(props.rent_comments) + '</div>';
  html += '<input type="hidden" id="f_external_rental" value="auto">';

  var hasPower = props.has_power_allocation === 'true' || props.has_power_allocation === true;
  html += '<div style="margin:8px 0"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;white-space:nowrap">' +
    '<input type="checkbox" id="f_has_power_allocation"' + (hasPower ? ' checked' : '') +
    ' onchange="onPowerAllocationToggle()"> Выделена эл. мощность</label></div>';
  html += '<div id="power_allocation_fields" style="' + (hasPower ? '' : 'display:none;') + 'margin-bottom:12px">';
  html += '<div class="form-group"><label>Эл. мощность по договору (ДС), кВт</label>' +
    '<input type="number" id="f_power_allocation_kw" value="' + escapeHtml(props.power_allocation_kw || '') + '" step="0.1" placeholder="0"></div>';
  html += '</div>';

  // Equipment is now managed in React (/app/) — removed legacy transfer_equipment UI

  if (_contractFormTypeName !== 'supplement') html += renderDurationSection(props);
  container.innerHTML = html;
  recalcRentMonthly();
  updateVatDisplay();
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

function _getRoomById(roomId) {
  if (!roomId) return null;
  return (_rooms || []).find(function(r) { return r.id === parseInt(roomId); }) || null;
}

function _getRoomBuilding(room) {
  if (!room || !room.parent_id) return '';
  var bld = (_buildings || []).find(function(b) { return b.id === room.parent_id; });
  return bld ? bld.name : '';
}

function renderRentObjectBlock(index, obj) {
  obj = obj || {};
  var objectType = obj.object_type || '';
  if (!objectType && obj.item_type) {
    if (obj.item_type === 'land_plot') objectType = 'ЗУ';
  }
  var isLandPlot = (objectType === 'ЗУ');
  var typeOptions = OBJECT_TYPES.slice();
  if (objectType && typeOptions.indexOf(objectType) < 0) typeOptions.push(objectType);
  var blockTitle = isLandPlot ? ('Участок ' + (index + 1)) : ('Помещение ' + (index + 1));

  var room = _getRoomById(obj.room_id);
  var roomArea = room ? (room.properties || {}).area : (obj.area || '');
  var roomType = room ? (room.properties || {}).room_type : (obj.room_type || '');
  var roomBuilding = room ? _getRoomBuilding(room) : (obj.building_name || '');

  var h = '<div class="rent-object-block" id="rent_obj_' + index + '" style="border-left:3px solid var(--accent);padding:12px 12px 12px 15px;margin-bottom:12px;position:relative;background:var(--bg-secondary);border-radius:6px">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<strong>' + blockTitle + '</strong>';
  h += '<button type="button" class="btn btn-sm btn-danger" onclick="removeRentObject(' + index + ')" style="padding:2px 8px;font-size:11px">\\u2715</button>';
  h += '</div>';

  if (isLandPlot) {
    h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="object_type" value="\\u0417\\u0423">';
    var _lpItems = [];
    (_landPlots || []).forEach(function(lp) {
      var cad = (lp.properties||{}).cadastral_number;
      _lpItems.push({ id: 'lp_' + lp.id, name: lp.name + (cad ? ' ['+cad+']' : '') + ' (\\u0446\\u0435\\u043b\\u0438\\u043a\\u043e\\u043c)', _lpId: lp.id, _partId: null });
      (_landPlotParts || []).filter(function(p) { return p.parent_id === lp.id; }).forEach(function(p) {
        var pArea = (p.properties||{}).area;
        _lpItems.push({ id: 'lpp_' + p.id, name: p.name + (pArea ? ' ('+pArea+' \\u043c\\u00b2)' : '') + ' \\u2014 ' + lp.name, _lpId: lp.id, _partId: p.id });
      });
    });
    var _curSelId = '';
    var _curSelName = '';
    if (obj.land_plot_part_id) {
      var _sp = _lpItems.find(function(x) { return x._partId === parseInt(obj.land_plot_part_id); });
      if (_sp) { _curSelId = _sp.id; _curSelName = _sp.name; }
    } else if (obj.land_plot_id) {
      var _sl = _lpItems.find(function(x) { return x._lpId === parseInt(obj.land_plot_id) && !x._partId; });
      if (_sl) { _curSelId = _sl.id; _curSelName = _sl.name; }
    }
    var lpCombinedId = 'ro_lp_combined_' + index;
    h += '<div class="form-group"><label>\\u0417\\u0435\\u043c\\u0435\\u043b\\u044c\\u043d\\u044b\\u0439 \\u0443\\u0447\\u0430\\u0441\\u0442\\u043e\\u043a / \\u0447\\u0430\\u0441\\u0442\\u044c \\u0417\\u0423</label>';
    h += renderSearchableSelect(lpCombinedId, _lpItems.map(function(x) { return {id: x.id, name: x.name}; }), _curSelId, _curSelName, '\\u043d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u0435 \\u0438\\u043b\\u0438 \\u043a\\u0430\\u0434. \\u043d\\u043e\\u043c\\u0435\\u0440...', 'rent_lp_combined');
    h += '<button type="button" class="btn btn-sm" style="font-size:11px;margin-top:4px" onclick="toggleLpPartCreate(' + index + ')">+ \\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c \\u0447\\u0430\\u0441\\u0442\\u044c \\u0417\\u0423</button>';
    h += '</div>';
    var _initLpId = obj.land_plot_id || '';
    var _initLppId = obj.land_plot_part_id || '';
    h += '<input type="hidden" id="ro_lp_id_' + index + '" class="ro-field" data-idx="' + index + '" data-name="land_plot_id" value="' + _initLpId + '">';
    h += '<input type="hidden" id="ro_lpp_id_' + index + '" class="ro-field" data-idx="' + index + '" data-name="land_plot_part_id" value="' + _initLppId + '">';

    h += '<div id="ro_lpp_create_' + index + '" style="display:none;border:1px dashed var(--accent);border-radius:6px;padding:12px;margin-bottom:8px;background:var(--bg)">';
    h += '<div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--accent)">\\u041d\\u043e\\u0432\\u0430\\u044f \\u0447\\u0430\\u0441\\u0442\\u044c \\u0417\\u0423</div>';
    var lpCreateId = 'ro_lpp_parent_' + index;
    var lpCreateList = (_landPlots || []).map(function(lp) { return { id: lp.id, name: _lpLabel(lp) }; });
    h += '<div class="form-group"><label>\\u0417\\u0435\\u043c\\u0435\\u043b\\u044c\\u043d\\u044b\\u0439 \\u0443\\u0447\\u0430\\u0441\\u0442\\u043e\\u043a</label>';
    h += renderSearchableSelect(lpCreateId, lpCreateList, '', '', '\\u0432\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u0417\\u0423...', 'rent_land_plot');
    h += '</div>';
    h += '<div class="form-group"><label>\\u041d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u0435 \\u0447\\u0430\\u0441\\u0442\\u0438</label><input id="ro_lpp_name_' + index + '" placeholder="\\u041d\\u0430\\u043f\\u0440. \\u0427\\u0430\\u0441\\u0442\\u044c 1 (\\u0441\\u043a\\u043b\\u0430\\u0434)" style="width:100%"></div>';
    h += '<div class="form-group"><label>\\u041f\\u043b\\u043e\\u0449\\u0430\\u0434\\u044c, \\u043c\\u00b2</label><input type="number" id="ro_lpp_area_' + index + '" style="width:100%"></div>';
    h += '<div class="form-group"><label>\\u041e\\u043f\\u0438\\u0441\\u0430\\u043d\\u0438\\u0435</label><input id="ro_lpp_desc_' + index + '" style="width:100%" placeholder="\\u0414\\u043e\\u043f. \\u0438\\u043d\\u0444\\u043e\\u0440\\u043c\\u0430\\u0446\\u0438\\u044f"></div>';
    h += '<div style="display:flex;gap:8px;margin-top:8px">';
    h += '<button type="button" class="btn btn-primary btn-sm" onclick="submitLpPartCreate(' + index + ')">\\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c \\u0438 \\u0432\\u044b\\u0431\\u0440\\u0430\\u0442\\u044c</button>';
    h += '<button type="button" class="btn btn-sm" onclick="toggleLpPartCreate(' + index + ')">\\u041e\\u0442\\u043c\\u0435\\u043d\\u0430</button>';
    h += '</div></div>';

    var _partArea = '';
    if (obj.land_plot_part_id) {
      var _pp = (_landPlotParts || []).find(function(p) { return p.id === parseInt(obj.land_plot_part_id); });
      if (_pp && _pp.properties) _partArea = _pp.properties.area || '';
    }
    var _calcObj = Object.assign({}, obj);
    if (_partArea && !_calcObj.area) _calcObj.area = _partArea;
    h += _roCalcFields(index, _calcObj, obj.calc_mode || 'area_rate');
  } else if (obj.room_name && !obj.room_id) {
    // Legacy: rent object without room_id (text description)
    h += '<div style="font-size:13px;color:var(--text-muted);margin-bottom:8px">';
    h += '<div><b>\\u041a\\u043e\\u0440\\u043f\\u0443\\u0441:</b> ' + escapeHtml(obj.building_name || '\\u2014') + '</div>';
    h += '<div><b>\\u041f\\u043e\\u043c\\u0435\\u0449\\u0435\\u043d\\u0438\\u0435:</b> ' + escapeHtml(obj.room_name || '\\u2014') + '</div>';
    h += '<div><b>\\u0422\\u0438\\u043f:</b> ' + escapeHtml(obj.room_type || '\\u2014') + ' | <b>\\u041f\\u043b\\u043e\\u0449\\u0430\\u0434\\u044c:</b> ' + escapeHtml(obj.area || '\\u2014') + ' \\u043c\\u00b2</div>';
    h += '</div>';
    h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="room_name" value="' + escapeHtml(obj.room_name || '') + '">';
    h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="area" value="' + escapeHtml(obj.area || '') + '">';
    h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="building_name" value="' + escapeHtml(obj.building_name || '') + '">';
    h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="room_type" value="' + escapeHtml(obj.room_type || '') + '">';
    h += '<div class="form-group"><label>\\u0421\\u0442\\u0430\\u0432\\u043a\\u0430 (\\u0440\\u0443\\u0431/\\u043c\\u00b2/\\u043c\\u0435\\u0441)</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="rent_rate" value="' + (obj.rent_rate || '') + '" oninput="recalcRentMonthly()"></div>';
    var legacyTotal = Math.round((parseFloat(obj.area) || 0) * (parseFloat(obj.rent_rate) || 0) * 100) / 100;
    if (legacyTotal > 0) h += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">= ' + _fmtNum(legacyTotal) + ' \\u0440\\u0443\\u0431/\\u043c\\u0435\\u0441</div>';
    var hasCmt = !!(obj.comment && obj.comment.trim());
    h += '<div id="ro_cmt_wrap_' + index + '">';
    h += '<div id="ro_cmt_block_' + index + '"' + (hasCmt ? '' : ' style="display:none"') + '><label style="font-size:12px;color:var(--text-secondary)">\\u041a\\u043e\\u043c\\u043c\\u0435\\u043d\\u0442\\u0430\\u0440\\u0438\\u0439</label>';
    h += '<input class="ro-field" data-idx="' + index + '" data-name="comment" value="' + escapeHtml(obj.comment || '') + '" style="width:100%"></div>';
    h += '<button type="button" id="ro_cmt_btn_' + index + '" onclick="showRoComment(' + index + ')" style="font-size:11px;background:none;border:1px dashed var(--border);color:var(--text-secondary);border-radius:4px;padding:2px 10px;cursor:pointer;margin-top:2px' + (hasCmt ? ';display:none' : '') + '">\\u0414\\u043e\\u0431\\u0430\\u0432\\u0438\\u0442\\u044c \\u043a\\u043e\\u043c\\u043c\\u0435\\u043d\\u0442\\u0430\\u0440\\u0438\\u0439</button>';
    h += '</div>';
  } else {
    // NEW: Room from registry — searchable select
    var roSrchId = 'ro_room_sel_' + index;
    var roomList = (_rooms || []).map(function(r) {
      var bld = _getRoomBuilding(r);
      return { id: r.id, name: r.name + (bld ? ' (' + bld + ')' : '') };
    });
    var selRoomName = '';
    if (room) { var _bld = _getRoomBuilding(room); selRoomName = room.name + (_bld ? ' (' + _bld + ')' : ''); }
    h += '<div class="form-group"><label>\\u041f\\u043e\\u043c\\u0435\\u0449\\u0435\\u043d\\u0438\\u0435</label>';
    h += renderSearchableSelect(roSrchId, roomList, obj.room_id || '', selRoomName, '\\u043d\\u0430\\u0447\\u043d\\u0438\\u0442\\u0435 \\u0432\\u0432\\u043e\\u0434\\u0438\\u0442\\u044c...', 'rent_room');
    h += '<button type="button" class="btn btn-sm" style="font-size:11px;margin-top:4px" onclick="toggleRentRoomCreate(this,' + index + ')">+ \\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c \\u043f\\u043e\\u043c\\u0435\\u0449\\u0435\\u043d\\u0438\\u0435</button>';
    h += '</div>';
    h += _roRoomCreateMiniForm(index);
    h += '<div id="ro_room_info_' + index + '" style="' + (room ? '' : 'display:none;') + 'font-size:13px;color:var(--text-secondary);margin-bottom:10px;padding:8px;background:var(--bg);border-radius:6px">';
    h += '<div><b>\\u041a\\u043e\\u0440\\u043f\\u0443\\u0441:</b> <span id="ro_room_building_' + index + '">' + escapeHtml(roomBuilding) + '</span></div>';
    h += '<div><b>\\u0422\\u0438\\u043f:</b> <span id="ro_room_type_' + index + '">' + escapeHtml(roomType) + '</span></div>';
    h += '<div><b>\\u041f\\u043b\\u043e\\u0449\\u0430\\u0434\\u044c:</b> <span id="ro_room_area_' + index + '">' + escapeHtml(String(roomArea)) + '</span> \\u043c\\u00b2</div>';
    h += '</div>';
    h += '<div class="form-group"><label>\\u0421\\u0442\\u0430\\u0432\\u043a\\u0430 (\\u0440\\u0443\\u0431/\\u043c\\u00b2/\\u043c\\u0435\\u0441)</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="rent_rate" value="' + (obj.rent_rate || '') + '" oninput="recalcRentMonthly()"></div>';
    var monthlyTotal = (parseFloat(roomArea) || 0) * (parseFloat(obj.rent_rate) || 0);
    h += '<div id="ro_monthly_' + index + '" style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">' + (monthlyTotal > 0 ? '= ' + _fmtNum(monthlyTotal) + ' \\u0440\\u0443\\u0431/\\u043c\\u0435\\u0441' : '') + '</div>';
    var hasCmt = !!(obj.comment && obj.comment.trim());
    h += '<div id="ro_cmt_wrap_' + index + '">';
    h += '<div id="ro_cmt_block_' + index + '"' + (hasCmt ? '' : ' style="display:none"') + '>';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">' +
      '<label style="font-size:12px;margin:0;color:var(--text-secondary)">\\u041a\\u043e\\u043c\\u043c\\u0435\\u043d\\u0442\\u0430\\u0440\\u0438\\u0439</label>' +
      '<button type="button" onclick="closeRoComment(' + index + ')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0 4px;font-size:13px">\\u2715</button></div>';
    h += '<input class="ro-field" data-idx="' + index + '" data-name="comment" id="ro_cmt_in_' + index + '" value="' + escapeHtml(obj.comment || '') + '" style="width:100%;box-sizing:border-box">';
    h += '</div>';
    h += '<button type="button" id="ro_cmt_btn_' + index + '" onclick="showRoComment(' + index + ')"' +
      ' style="font-size:11px;background:none;border:1px dashed var(--border);color:var(--text-secondary);border-radius:4px;padding:2px 10px;cursor:pointer;margin-top:2px' + (hasCmt ? ';display:none' : '') + '">\\u0414\\u043e\\u0431\\u0430\\u0432\\u0438\\u0442\\u044c \\u043a\\u043e\\u043c\\u043c\\u0435\\u043d\\u0442\\u0430\\u0440\\u0438\\u0439</button>';
    h += '</div>';
  }
  h += '</div>';
  return h;
}

function onRentRoomSelected(index) {
  var hiddenEl = document.getElementById('ro_room_sel_' + index);
  var roomId = hiddenEl ? hiddenEl.value : '';
  var room = _getRoomById(roomId);
  var infoDiv = document.getElementById('ro_room_info_' + index);
  if (room) {
    var props = room.properties || {};
    var bld = _getRoomBuilding(room);
    document.getElementById('ro_room_building_' + index).textContent = bld || '\\u2014';
    document.getElementById('ro_room_type_' + index).textContent = props.room_type || '\\u2014';
    document.getElementById('ro_room_area_' + index).textContent = props.area || '\\u2014';
    if (infoDiv) infoDiv.style.display = '';
  } else {
    if (infoDiv) infoDiv.style.display = 'none';
  }
  recalcRentMonthly();
}

function addRentObjectType(index) {
  var name = prompt('\\u0412\\u0432\\u0435\\u0434\\u0438\\u0442\\u0435 \\u0442\\u0438\\u043f \\u043f\\u043e\\u043c\\u0435\\u0449\\u0435\\u043d\\u0438\\u044f:');
  if (!name || !name.trim()) return;
  name = name.trim();
  if (OBJECT_TYPES.indexOf(name) < 0) OBJECT_TYPES.push(name);
  var sel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="object_type"]');
  if (sel) {
    var existing = Array.from(sel.options).find(function(o) { return o.value === name; });
    if (!existing) { var opt = document.createElement('option'); opt.value = name; opt.text = name; sel.appendChild(opt); }
    sel.value = name;
  }
}

function addRentObject() {
  var container = document.getElementById('rent_objects_container');
  if (!container) return;
  var div = document.createElement('div');
  div.innerHTML = renderRentObjectBlock(_rentObjectCounter, {});
  container.appendChild(div.firstChild);
  _rentObjectCounter++;
  _srchInitAll();
}

function addRentObjectLand() {
  var container = document.getElementById('rent_objects_container');
  if (!container) return;
  var div = document.createElement('div');
  div.innerHTML = renderRentObjectBlock(_rentObjectCounter, { object_type: '\\u0417\\u0423' });
  container.appendChild(div.firstChild);
  _rentObjectCounter++;
  _srchInitAll();
}

function removeRentObject(index) {
  var el = document.getElementById('rent_obj_' + index);
  if (el) { el.remove(); recalcRentMonthly(); }
}

function onRentItemTypeChange(index) {
  var obj = collectRentObjectData(index);
  var block = document.getElementById('rent_obj_' + index);
  if (block) {
    var div = document.createElement('div');
    div.innerHTML = renderRentObjectBlock(index, obj);
    block.replaceWith(div.firstChild);
    recalcRentMonthly();
  }
}

function onRentObjectTypeChange(index) {
  var sel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="object_type"]');
  if (!sel) return;
  var obj = collectRentObjectData(index);
  if (sel.value === '__custom__') {
    obj._showCustomInput = true;
    obj.object_type = obj.object_type_custom || '';
  } else {
    obj.object_type = sel.value;
    delete obj._showCustomInput;
  }
  var block = document.getElementById('rent_obj_' + index);
  if (block) {
    var div = document.createElement('div');
    div.innerHTML = renderRentObjectBlock(index, obj);
    block.replaceWith(div.firstChild);
    if (obj._showCustomInput) {
      var customIn = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="object_type_custom"]');
      if (customIn) customIn.focus();
    }
  }
}

function onRentObjectCalcChange(index) {
  var obj = collectRentObjectData(index);
  var block = document.getElementById('rent_obj_' + index);
  if (block) {
    var div = document.createElement('div');
    div.innerHTML = renderRentObjectBlock(index, obj);
    block.replaceWith(div.firstChild);
    recalcRentMonthly();
  }
}

function renderRoRoomSelect(index, selectedId) {
  var selId = parseInt(selectedId) || 0;
  var h = '<select class="ro-field" data-idx="' + index + '" data-name="room_id" style="width:100%" onchange="onRoRoomSelect(this,' + index + ')">';
  h += '<option value="">\\u2014 \\u0432\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u043f\\u043e\\u043c\\u0435\\u0449\\u0435\\u043d\\u0438\\u0435 \\u2014</option>';
  _rooms.forEach(function(e) {
    var sel = (e.id === selId) ? ' selected' : '';
    h += '<option value="' + e.id + '"' + sel + '>' + escapeHtml(e.name) + '</option>';
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
  if (room.parent_id) {
    var bldSel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="building_id"]');
    if (bldSel && !bldSel.value) {
      bldSel.value = room.parent_id;
      bldSel.dispatchEvent(new Event('change'));
    }
  }
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
  var roomType = typeEl ? typeEl.value : '';
  var bldEl = block.querySelector('.ro-room-building');
  var descEl = block.querySelector('.ro-room-desc');
  var areaEl = block.querySelector('.ro-room-area');
  var floorEl = block.querySelector('.ro-room-floor');
  var buildingId = bldEl ? (parseInt(bldEl.value) || null) : null;
  var building = buildingId ? (_buildings.find(function(b) { return b.id === buildingId; }) || {}).name || '' : '';
  var roomName = nameEl && nameEl.value.trim() ? nameEl.value.trim() : '';
  if (!roomName) {
    var parts = [];
    if (roomType) parts.push(roomType);
    if (floorEl && floorEl.value.trim()) parts.push('\\u044d\\u0442.' + floorEl.value.trim());
    if (building) parts.push(building);
    roomName = parts.join(', ') || '\\u041d\\u043e\\u0432\\u043e\\u0435 \\u043f\\u043e\\u043c\\u0435\\u0449\\u0435\\u043d\\u0438\\u0435';
  }
  if (!roomName.trim()) return;
  var roomTypeObj = entityTypes.find(function(t) { return t.name === 'room'; });
  if (!roomTypeObj) return alert('\\u0422\\u0438\\u043f \\u041f\\u043e\\u043c\\u0435\\u0449\\u0435\\u043d\\u0438\\u0435 \\u043d\\u0435 \\u043d\\u0430\\u0439\\u0434\\u0435\\u043d');
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
    _srchPick('ro_room_sel_' + index, newRoom.id);
    block.style.display = 'none';
  } catch(e) { alert('\\u041e\\u0448\\u0438\\u0431\\u043a\\u0430: ' + (e.message || e)); }
  finally { btn.disabled = false; btn.textContent = '\\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c \\u0438 \\u0432\\u044b\\u0431\\u0440\\u0430\\u0442\\u044c'; }
}

function onObjectTypeCustomBlur(input, index) {
  var val = input.value.trim();
  if (!val) return;
  if (OBJECT_TYPES.indexOf(val) < 0) OBJECT_TYPES.push(val);
  document.querySelectorAll('.ro-field[data-name="object_type"]').forEach(function(sel) {
    if (!Array.from(sel.options).some(function(o) { return o.value === val; })) {
      var customOpt = sel.querySelector('option[value="__custom__"]');
      var newOpt = document.createElement('option');
      newOpt.value = val; newOpt.textContent = val;
      if (customOpt) sel.insertBefore(newOpt, customOpt); else sel.appendChild(newOpt);
    }
    if (sel.getAttribute('data-idx') === String(index)) sel.value = val;
  });
  onRentObjectTypeChange(index);
}

function collectRentObjectData(index) {
  var obj = {};
  document.querySelectorAll('.ro-field[data-idx="' + index + '"]').forEach(function(el) {
    var name = el.getAttribute('data-name');
    if (!name) return;
    if (el.tagName === 'SELECT' && el.value === '__new__') return;
    if (el.type === 'checkbox') { obj[name] = el.checked ? 'true' : 'false'; return; }
    obj[name] = el.value;
  });
  var roRoomHidden = document.getElementById('ro_room_sel_' + index);
  if (roRoomHidden && roRoomHidden.value) obj.room_id = roRoomHidden.value;
  return _enrichFromRegistry(obj);
}

function onRoLandPlotChange(index) {
  var lpSel = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="land_plot_id"]');
  var partSel = document.getElementById('ro_lp_part_' + index);
  if (!lpSel || !partSel) return;
  var lpId = parseInt(lpSel.value) || 0;
  var parts = (_landPlotParts || []).filter(function(p) { return p.parent_id === lpId; });
  partSel.innerHTML = '<option value="">\\u2014 \\u0432\\u0435\\u0441\\u044c \\u0443\\u0447\\u0430\\u0441\\u0442\\u043e\\u043a \\u2014</option>';
  parts.forEach(function(p) {
    var opt = document.createElement('option');
    opt.value = p.id; opt.text = p.name;
    partSel.appendChild(opt);
  });
}

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
    if (part && part.properties && part.properties.area) {
      var areaEl = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="area"]');
      if (areaEl) { areaEl.value = part.properties.area; recalcRentMonthly(); }
    }
  } else if (val.indexOf('lp_') === 0) {
    var lpId = parseInt(val.replace('lp_', ''));
    if (lpIdEl) lpIdEl.value = lpId;
    if (lppIdEl) lppIdEl.value = '';
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
    alert('\\u0412\\u044b\\u0431\\u0435\\u0440\\u0438\\u0442\\u0435 \\u0437\\u0435\\u043c\\u0435\\u043b\\u044c\\u043d\\u044b\\u0439 \\u0443\\u0447\\u0430\\u0441\\u0442\\u043e\\u043a');
    return;
  }
  var name = (document.getElementById('ro_lpp_name_' + index).value || '').trim();
  if (!name) { alert('\\u0423\\u043a\\u0430\\u0436\\u0438\\u0442\\u0435 \\u043d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u0435'); return; }
  var area = (document.getElementById('ro_lpp_area_' + index).value || '').trim();
  var desc = (document.getElementById('ro_lpp_desc_' + index).value || '').trim();
  var lpPartType = entityTypes.find(function(t) { return t.name === 'land_plot_part'; });
  if (!lpPartType) { alert('\\u0422\\u0438\\u043f "\\u0427\\u0430\\u0441\\u0442\\u044c \\u0417\\u0423" \\u043d\\u0435 \\u043d\\u0430\\u0439\\u0434\\u0435\\u043d'); return; }
  var properties = {};
  if (area) properties.area = area;
  if (desc) properties.description = desc;
  try {
    var created = await api('/entities', {
      method: 'POST',
      body: JSON.stringify({ entity_type_id: lpPartType.id, name: name, properties: properties, parent_id: parentLpId })
    });
    _landPlotParts.push(created);
    var parentLp = (_landPlots || []).find(function(lp) { return lp.id === parentLpId; });
    var combinedHidden = document.getElementById('ro_lp_combined_' + index);
    var combinedText = document.getElementById('ro_lp_combined_' + index + '_text');
    var label = name + (area ? ' (' + area + ' \\u043c\\u00b2)' : '') + (parentLp ? ' \\u2014 ' + parentLp.name : '');
    if (combinedHidden) combinedHidden.value = 'lpp_' + created.id;
    if (combinedText) combinedText.value = label;
    var lpIdEl = document.getElementById('ro_lp_id_' + index);
    var lppIdEl = document.getElementById('ro_lpp_id_' + index);
    if (lpIdEl) lpIdEl.value = parentLpId;
    if (lppIdEl) lppIdEl.value = created.id;
    if (area) {
      var areaEl = document.querySelector('.ro-field[data-idx="' + index + '"][data-name="area"]');
      if (areaEl) { areaEl.value = area; recalcRentMonthly(); }
    }
    toggleLpPartCreate(index);
  } catch(e) { alert('\\u041e\\u0448\\u0438\\u0431\\u043a\\u0430: ' + (e.message || e)); }
}
`;
