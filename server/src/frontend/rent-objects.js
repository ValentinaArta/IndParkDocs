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

function _roEqCreateMiniForm(index, eqTypeId) {
  var h = '<div id="ro_eq_create_' + index + '" style="display:none;border:1px dashed var(--accent);border-radius:6px;padding:12px;margin-bottom:8px;background:var(--bg-secondary)">';
  h += '<div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--accent)">Новая единица оборудования — полная форма</div>';
  h += '<div class="form-group"><label>Название *</label><input class="ro-eq-name" data-idx="' + index + '" placeholder="Название оборудования" style="width:100%"></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  h += '<div class="form-group"><label>Категория</label><select class="ro-eq-cat" data-idx="' + index + '" onchange="onEqCatChange(this)" style="width:100%"><option value="">—</option>';
  getEquipmentCategories().forEach(function(c) { h += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
  h += '<option value="__custom__">Другое...</option></select>';
  h += '<input class="ro-eq-cat-custom" data-idx="' + index + '" placeholder="Введите категорию" style="display:none;margin-top:4px;width:100%"></div>';
  h += '<div class="form-group"><label>Вид / тип</label><input class="ro-eq-kind" data-idx="' + index + '" placeholder="кран, насос, котёл..." style="width:100%"></div>';
  h += '<div class="form-group"><label>Инв. номер</label><input class="ro-eq-inv" data-idx="' + index + '" style="width:100%"></div>';
  h += '<div class="form-group"><label>Зав. номер</label><input class="ro-eq-serial" data-idx="' + index + '" style="width:100%"></div>';
  h += '<div class="form-group"><label>Год выпуска</label><input type="number" class="ro-eq-year" data-idx="' + index + '" placeholder="2010" style="width:100%"></div>';
  h += '<div class="form-group"><label>Производитель</label><input class="ro-eq-mfr" data-idx="' + index + '" style="width:100%"></div>';
  h += '<div class="form-group"><label>Статус</label><select class="ro-eq-status" data-idx="' + index + '" style="width:100%">';
  (EQUIPMENT_STATUSES.length ? EQUIPMENT_STATUSES : ['В работе','На ремонте','Законсервировано','Списано','Аварийное']).forEach(function(s) { h += '<option value="' + s + '">' + s + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label>Помещение</label><select class="ro-eq-room" data-idx="' + index + '" style="width:100%"><option value="">— не указано —</option>';
  (_rooms || []).forEach(function(r) { h += '<option value="' + r.id + '">' + escapeHtml(r.name) + '</option>'; });
  h += '</select></div>';
  h += '<div class="form-group"><label>Собственник</label><select class="ro-eq-owner" data-idx="' + index + '" style="width:100%"><option value="">—</option>';
  _ownCompanies.forEach(function(c) { h += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'; });
  h += '</select></div>';
  h += '</div>';
  h += '<div style="display:flex;gap:8px;margin-top:4px">';
  h += '<button type="button" class="btn btn-primary btn-sm" data-idx="' + index + '" data-eqtype="' + eqTypeId + '" onclick="submitRentEquipmentCreate(this)">Создать и выбрать</button>';
  h += '<button type="button" class="btn btn-sm" data-idx="' + index + '" onclick="toggleRentEquipmentCreate(this)">Отмена</button>';
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
  // Legacy: detect land plots
  if (!objectType && obj.item_type) {
    if (obj.item_type === 'land_plot') objectType = 'ЗУ';
  }
  var isLandPlot = (objectType === 'ЗУ');
  var typeOptions = OBJECT_TYPES.slice();
  if (objectType && typeOptions.indexOf(objectType) < 0) typeOptions.push(objectType);
  var blockTitle = isLandPlot ? ('Участок ' + (index + 1)) : ('Помещение ' + (index + 1));

  // Resolve room data for display
  var room = _getRoomById(obj.room_id);
  var roomArea = room ? (room.properties || {}).area : (obj.area || '');
  var roomType = room ? (room.properties || {}).room_type : (obj.room_type || '');
  var roomBuilding = room ? _getRoomBuilding(room) : (obj.building_name || '');

  var h = '<div class="rent-object-block" id="rent_obj_' + index + '" style="border-left:3px solid var(--accent);padding:12px 12px 12px 15px;margin-bottom:12px;position:relative;background:var(--bg-secondary);border-radius:6px">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<strong>' + blockTitle + '</strong>';
  h += '<button type="button" class="btn btn-sm btn-danger" onclick="removeRentObject(' + index + ')" style="padding:2px 8px;font-size:11px">✕</button>';
  h += '</div>';

  if (isLandPlot) {
    // Hidden field to store object_type
    h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="object_type" value="ЗУ">';

    // Unified: select existing part OR whole land plot
    // Build combined list: whole plots + parts (with parent name)
    var _lpItems = [];
    (_landPlots || []).forEach(function(lp) {
      var cad = (lp.properties||{}).cadastral_number;
      _lpItems.push({ id: 'lp_' + lp.id, name: lp.name + (cad ? ' ['+cad+']' : '') + ' (целиком)', _lpId: lp.id, _partId: null });
      (_landPlotParts || []).filter(function(p) { return p.parent_id === lp.id; }).forEach(function(p) {
        var pArea = (p.properties||{}).area;
        _lpItems.push({ id: 'lpp_' + p.id, name: p.name + (pArea ? ' ('+pArea+' м²)' : '') + ' — ' + lp.name, _lpId: lp.id, _partId: p.id });
      });
    });
    // Determine current selection
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
    h += '<div class="form-group"><label>Земельный участок / часть ЗУ</label>';
    h += renderSearchableSelect(lpCombinedId, _lpItems.map(function(x) { return {id: x.id, name: x.name}; }), _curSelId, _curSelName, 'название или кад. номер...', 'rent_lp_combined');
    h += '<button type="button" class="btn btn-sm" style="font-size:11px;margin-top:4px" onclick="toggleLpPartCreate(' + index + ')">+ Создать часть ЗУ</button>';
    h += '</div>';
    // Hidden fields for actual IDs (filled by callback)
    var _initLpId = obj.land_plot_id || '';
    var _initLppId = obj.land_plot_part_id || '';
    h += '<input type="hidden" id="ro_lp_id_' + index + '" class="ro-field" data-idx="' + index + '" data-name="land_plot_id" value="' + _initLpId + '">';
    h += '<input type="hidden" id="ro_lpp_id_' + index + '" class="ro-field" data-idx="' + index + '" data-name="land_plot_part_id" value="' + _initLppId + '">';

    // Inline create land plot part form (with ЗУ selector inside)
    h += '<div id="ro_lpp_create_' + index + '" style="display:none;border:1px dashed var(--accent);border-radius:6px;padding:12px;margin-bottom:8px;background:var(--bg)">';
    h += '<div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--accent)">Новая часть ЗУ</div>';
    var lpCreateId = 'ro_lpp_parent_' + index;
    var lpCreateList = (_landPlots || []).map(function(lp) { var cad = (lp.properties||{}).cadastral_number; return {id: lp.id, name: lp.name + (cad ? ' ['+cad+']' : '')}; });
    h += '<div class="form-group"><label>Земельный участок</label>';
    h += renderSearchableSelect(lpCreateId, lpCreateList, '', '', 'выберите ЗУ...', 'rent_land_plot');
    h += '</div>';
    h += '<div class="form-group"><label>Название части</label><input id="ro_lpp_name_' + index + '" placeholder="Напр. Часть 1 (склад)" style="width:100%"></div>';
    h += '<div class="form-group"><label>Площадь, м²</label><input type="number" id="ro_lpp_area_' + index + '" style="width:100%"></div>';
    h += '<div class="form-group"><label>Описание</label><input id="ro_lpp_desc_' + index + '" style="width:100%" placeholder="Доп. информация"></div>';
    h += '<div style="display:flex;gap:8px;margin-top:8px">';
    h += '<button type="button" class="btn btn-primary btn-sm" onclick="submitLpPartCreate(' + index + ')">Создать и выбрать</button>';
    h += '<button type="button" class="btn btn-sm" onclick="toggleLpPartCreate(' + index + ')">Отмена</button>';
    h += '</div></div>';

    // Auto-fill area from selected part
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
    h += '<div><b>Корпус:</b> ' + escapeHtml(obj.building_name || '—') + '</div>';
    h += '<div><b>Помещение:</b> ' + escapeHtml(obj.room_name || '—') + '</div>';
    h += '<div><b>Тип:</b> ' + escapeHtml(obj.room_type || '—') + ' | <b>Площадь:</b> ' + escapeHtml(obj.area || '—') + ' м²</div>';
    h += '</div>';
    h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="room_name" value="' + escapeHtml(obj.room_name || '') + '">';
    h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="area" value="' + escapeHtml(obj.area || '') + '">';
    h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="building_name" value="' + escapeHtml(obj.building_name || '') + '">';
    h += '<input type="hidden" class="ro-field" data-idx="' + index + '" data-name="room_type" value="' + escapeHtml(obj.room_type || '') + '">';
    h += '<div class="form-group"><label>Ставка (руб/м²/мес)</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="rent_rate" value="' + (obj.rent_rate || '') + '" oninput="recalcRentMonthly()"></div>';
    var legacyTotal = (parseFloat(obj.area) || 0) * (parseFloat(obj.rent_rate) || 0);
    if (legacyTotal > 0) h += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">= ' + _fmtNum(legacyTotal) + ' руб/мес</div>';
    // Comment
    var hasCmt = !!(obj.comment && obj.comment.trim());
    h += '<div id="ro_cmt_wrap_' + index + '">';
    h += '<div id="ro_cmt_block_' + index + '"' + (hasCmt ? '' : ' style="display:none"') + '><label style="font-size:12px;color:var(--text-secondary)">Комментарий</label>';
    h += '<input class="ro-field" data-idx="' + index + '" data-name="comment" value="' + escapeHtml(obj.comment || '') + '" style="width:100%"></div>';
    h += '<button type="button" id="ro_cmt_btn_' + index + '" onclick="showRoComment(' + index + ')" style="font-size:11px;background:none;border:1px dashed var(--border);color:var(--text-secondary);border-radius:4px;padding:2px 10px;cursor:pointer;margin-top:2px' + (hasCmt ? ';display:none' : '') + '">Добавить комментарий</button>';
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
    h += '<div class="form-group"><label>Помещение</label>';
    h += renderSearchableSelect(roSrchId, roomList, obj.room_id || '', selRoomName, 'начните вводить...', 'rent_room');
    h += '<button type="button" class="btn btn-sm" style="font-size:11px;margin-top:4px" onclick="toggleRentRoomCreate(this,' + index + ')">+ Создать помещение</button>';
    h += '</div>';

    // Inline form for creating a new room
    h += _roRoomCreateMiniForm(index);

    // Auto-filled room properties (read-only display)
    h += '<div id="ro_room_info_' + index + '" style="' + (room ? '' : 'display:none;') + 'font-size:13px;color:var(--text-secondary);margin-bottom:10px;padding:8px;background:var(--bg);border-radius:6px">';
    h += '<div><b>Корпус:</b> <span id="ro_room_building_' + index + '">' + escapeHtml(roomBuilding) + '</span></div>';
    h += '<div><b>Тип:</b> <span id="ro_room_type_' + index + '">' + escapeHtml(roomType) + '</span></div>';
    h += '<div><b>Площадь:</b> <span id="ro_room_area_' + index + '">' + escapeHtml(String(roomArea)) + '</span> м²</div>';
    h += '</div>';

    // Editable: rent rate only
    h += '<div class="form-group"><label>Ставка (руб/м²/мес)</label><input type="number" class="ro-field" data-idx="' + index + '" data-name="rent_rate" value="' + (obj.rent_rate || '') + '" oninput="recalcRentMonthly()"></div>';

    // Monthly total
    var monthlyTotal = (parseFloat(roomArea) || 0) * (parseFloat(obj.rent_rate) || 0);
    h += '<div id="ro_monthly_' + index + '" style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">' + (monthlyTotal > 0 ? '= ' + _fmtNum(monthlyTotal) + ' руб/мес' : '') + '</div>';

    // Comment (collapsible)
    var hasCmt = !!(obj.comment && obj.comment.trim());
    h += '<div id="ro_cmt_wrap_' + index + '">';
    h += '<div id="ro_cmt_block_' + index + '"' + (hasCmt ? '' : ' style="display:none"') + '>';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">' +
      '<label style="font-size:12px;margin:0;color:var(--text-secondary)">Комментарий</label>' +
      '<button type="button" onclick="closeRoComment(' + index + ')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0 4px;font-size:13px">✕</button></div>';
    h += '<input class="ro-field" data-idx="' + index + '" data-name="comment" id="ro_cmt_in_' + index + '" value="' + escapeHtml(obj.comment || '') + '" style="width:100%;box-sizing:border-box">';
    h += '</div>';
    h += '<button type="button" id="ro_cmt_btn_' + index + '" onclick="showRoComment(' + index + ')"' +
      ' style="font-size:11px;background:none;border:1px dashed var(--border);color:var(--text-secondary);border-radius:4px;padding:2px 10px;cursor:pointer;margin-top:2px' + (hasCmt ? ';display:none' : '') + '">Добавить комментарий</button>';
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
    document.getElementById('ro_room_building_' + index).textContent = bld || '—';
    document.getElementById('ro_room_type_' + index).textContent = props.room_type || '—';
    document.getElementById('ro_room_area_' + index).textContent = props.area || '—';
    if (infoDiv) infoDiv.style.display = '';
  } else {
    if (infoDiv) infoDiv.style.display = 'none';
  }
  recalcRentMonthly();
}

// ===== Аренда оборудования =====
var _eqRentCounter = 0;

function renderEquipmentRentFields(container, allFields, props) {
  var items = [];
  try { items = JSON.parse(props.equipment_rent_items || '[]'); } catch(ex) {}
  if (!items.length) items = [{}];

  var durationType = props.duration_type || '';
  var vatVal = props.vat_rate || '22';

  var html = '<div id="eq_rent_items_container">';
  _eqRentCounter = 0;
  items.forEach(function(item, i) {
    html += renderEquipmentRentBlock(i, item);
    _eqRentCounter = i + 1;
  });
  html += '</div>';
  html += '<button type="button" class="btn btn-sm" onclick="addEquipmentRentItem()" style="margin-bottom:16px">+ Добавить оборудование</button>';

  // Total (auto)
  html += '<div class="form-group"><label>Стоимость аренды в месяц (авто)</label><input type="number" id="f_rent_monthly" value="' + (props.rent_monthly || '') + '" readonly style="background:var(--bg-secondary);font-weight:600;color:var(--accent)"></div>';

  // НДС
  html += '<div class="form-group"><label>НДС (%)</label><input type="number" id="f_vat_rate" value="' + escapeHtml(vatVal) + '" style="width:80px" min="0" max="100" oninput="updateVatDisplay()"></div>';
  html += '<div id="vat_display" style="font-size:12px;color:var(--text-secondary);margin-bottom:12px"></div>';

  // Duration
  html += '<div class="form-group"><label>Срок действия</label><select id="f_duration_type" onchange="onDurationTypeChange()">';
  html += '<option value="">—</option>';
  html += '<option value="Дата"' + (durationType === 'Дата' ? ' selected' : '') + '>Дата</option>';
  html += '<option value="Текст"' + (durationType === 'Текст' ? ' selected' : '') + '>Текст</option>';
  html += '</select></div>';
  html += '<div id="duration_date_wrap" style="' + (durationType === 'Дата' ? '' : 'display:none') + '"><div class="form-group"><label>Дата окончания</label><input type="date" id="f_duration_date" value="' + (props.duration_date || '') + '"></div></div>';
  html += '<div id="duration_text_wrap" style="' + (durationType === 'Текст' ? '' : 'display:none') + '"><div class="form-group"><label>Срок действия (текст)</label><input id="f_duration_text" value="' + escapeHtml(props.duration_text || '') + '"></div></div>';

  container.innerHTML = html;
  recalcEquipmentRentTotal();
}

function renderEquipmentRentBlock(index, item) {
  item = item || {};
  var eq = item.equipment_id ? (_equipment || []).find(function(e) { return e.id === parseInt(item.equipment_id); }) : null;
  var eqProps = eq ? (eq.properties || {}) : {};

  var h = '<div class="eq-rent-block" id="eq_rent_' + index + '" style="border-left:3px solid var(--accent);padding:12px 12px 12px 15px;margin-bottom:12px;position:relative;background:var(--bg-secondary);border-radius:6px">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<strong>Оборудование ' + (index + 1) + '</strong>';
  h += '<button type="button" class="btn btn-sm btn-danger" onclick="removeEquipmentRentItem(' + index + ')" style="padding:2px 8px;font-size:11px">✕</button>';
  h += '</div>';

  // Equipment selector (searchable)
  var eqSrchId = 'eq_rent_sel_' + index;
  var eqSelName = eq ? eq.name : '';
  if (eq) { var _inv = (eq.properties || {}).inv_number; if (_inv) eqSelName += ' (инв. ' + _inv + ')'; }
  h += '<div class="form-group"><label>Оборудование</label>';
  h += renderSearchableSelect(eqSrchId, (_equipment || []).map(function(e) { var inv = (e.properties||{}).inv_number; return {id:e.id, name: e.name + (inv ? ' (инв. '+inv+')' : '')}; }), item.equipment_id || '', eqSelName, 'начните вводить...', 'equipment_rent');
  h += '</div>';

  // Create new inline form (hidden by default)
  h += '<div id="eq_rent_create_' + index + '" style="display:none;background:var(--bg);padding:10px;border-radius:6px;margin-bottom:8px">';
  h += '<div class="form-group"><label style="font-size:12px">Название</label><input id="eq_rent_new_name_' + index + '" placeholder="Название оборудования"></div>';
  h += '<div class="form-group"><label style="font-size:12px">Инв. номер</label><input id="eq_rent_new_inv_' + index + '" placeholder="Инв. номер"></div>';
  h += '<div class="form-group"><label style="font-size:12px">Категория</label><select id="eq_rent_new_cat_' + index + '">';
  h += '<option value="">—</option>';
  getEquipmentCategories().forEach(function(c) { h += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
  h += '</select></div>';
  h += '<button type="button" class="btn btn-primary btn-sm" onclick="createEquipmentRentInline(' + index + ')">Создать</button> ';
  h += '<button type="button" class="btn btn-sm" onclick="toggleEqRentCreate(' + index + ')">Отмена</button>';
  h += '</div>';

  // Auto-filled equipment info
  h += '<div id="eq_rent_info_' + index + '" style="' + (eq ? '' : 'display:none;') + 'font-size:13px;color:var(--text-secondary);margin-bottom:10px;padding:8px;background:var(--bg);border-radius:6px">';
  h += '<span id="eq_rent_cat_' + index + '">' + escapeHtml(eqProps.equipment_category || '') + '</span>';
  if (eqProps.inv_number) h += ' · Инв. ' + escapeHtml(eqProps.inv_number);
  if (eqProps.manufacturer) h += ' · ' + escapeHtml(eqProps.manufacturer);
  h += '</div>';

  // Rent cost
  h += '<div class="form-group"><label>Стоимость аренды (руб/мес)</label><input type="number" class="eq-rent-field" data-idx="' + index + '" data-name="rent_cost" value="' + (item.rent_cost || '') + '" oninput="recalcEquipmentRentTotal()"></div>';

  h += '</div>';
  return h;
}

function onEquipmentRentSelected(index) {
  var hiddenEl = document.getElementById('eq_rent_sel_' + index);
  var eqId = hiddenEl ? hiddenEl.value : '';
  var eq = eqId ? (_equipment || []).find(function(e) { return e.id === parseInt(eqId); }) : null;
  var infoDiv = document.getElementById('eq_rent_info_' + index);
  if (eq) {
    var p = eq.properties || {};
    var parts = [];
    if (p.equipment_category) parts.push(p.equipment_category);
    if (p.inv_number) parts.push('Инв. ' + p.inv_number);
    if (p.manufacturer) parts.push(p.manufacturer);
    infoDiv.textContent = parts.join(' · ') || '—';
    infoDiv.style.display = '';
  } else {
    infoDiv.style.display = 'none';
  }
}

function toggleEqRentCreate(index) {
  var div = document.getElementById('eq_rent_create_' + index);
  if (div) div.style.display = div.style.display === 'none' ? '' : 'none';
}

async function createEquipmentRentInline(index) {
  var name = document.getElementById('eq_rent_new_name_' + index).value.trim();
  if (!name) { alert('Введите название'); return; }
  var invNum = document.getElementById('eq_rent_new_inv_' + index).value.trim();
  var cat = document.getElementById('eq_rent_new_cat_' + index).value;
  var eqType = entityTypes.find(function(t) { return t.name === 'equipment'; });
  if (!eqType) { alert('Тип "Оборудование" не найден'); return; }
  var properties = {};
  if (invNum) properties.inv_number = invNum;
  if (cat) properties.equipment_category = cat;
  try {
    var created = await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: eqType.id, name: name, properties: properties }) });
    _equipment.push(created);
    // Select the new equipment in searchable select
    var eqLabel = name + (invNum ? ' (инв. ' + invNum + ')' : '');
    var hiddenEl = document.getElementById('eq_rent_sel_' + index);
    var textEl = document.getElementById('eq_rent_sel_' + index + '_text');
    if (hiddenEl) hiddenEl.value = String(created.id);
    if (textEl) textEl.value = eqLabel;
    onEquipmentRentSelected(index);
    toggleEqRentCreate(index);
  } catch(e) { alert('Ошибка: ' + (e.message || e)); }
}

function addEquipmentRentItem() {
  var container = document.getElementById('eq_rent_items_container');
  if (!container) return;
  _eqRentCounter++;
  var div = document.createElement('div');
  div.innerHTML = renderEquipmentRentBlock(_eqRentCounter, {});
  container.appendChild(div.firstChild);
  _srchInitAll();
}

function removeEquipmentRentItem(index) {
  var block = document.getElementById('eq_rent_' + index);
  if (block) block.remove();
  recalcEquipmentRentTotal();
}

function collectEquipmentRentItems() {
  var items = [];
  document.querySelectorAll('.eq-rent-block').forEach(function(block) {
    var idx = block.id.replace('eq_rent_', '');
    var item = {};
    block.querySelectorAll('.eq-rent-field').forEach(function(el) {
      item[el.dataset.name] = el.value;
    });
    // Read equipment_id from searchable select hidden input
    var eqHidden = document.getElementById('eq_rent_sel_' + idx);
    if (eqHidden && eqHidden.value) item.equipment_id = eqHidden.value;
    // Resolve equipment name
    if (item.equipment_id) {
      var eq = (_equipment || []).find(function(e) { return e.id === parseInt(item.equipment_id); });
      if (eq) item.equipment_name = eq.name;
    }
    if (item.equipment_id || item.rent_cost) items.push(item);
  });
  return items;
}

function recalcEquipmentRentTotal() {
  var total = 0;
  document.querySelectorAll('.eq-rent-block').forEach(function(block) {
    var costEl = block.querySelector('.eq-rent-field[data-name="rent_cost"]');
    total += parseFloat(costEl ? costEl.value : 0) || 0;
  });
  var rentEl = document.getElementById('f_rent_monthly');
  if (rentEl) rentEl.value = total > 0 ? total.toFixed(2) : '';
  updateVatDisplay();
}
// ===== End Аренда оборудования =====

function addRentObjectType(index) {
  var name = prompt('Введите тип помещения:');
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
  div.innerHTML = renderRentObjectBlock(_rentObjectCounter, { object_type: 'ЗУ' });
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

// kept for backward compat (old __custom__ path)
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

function toggleRentEquipmentCreate(el) {
  var idx = el.getAttribute('data-idx');
  var panel = document.getElementById('ro_eq_create_' + idx);
  if (!panel) return;
  var isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    // Auto-fill balance owner from contract's our_legal_entity_id
    var ownerSel = panel.querySelector('.ro-eq-owner');
    if (ownerSel && !ownerSel.value) {
      var ownerId = _contractFormProps && _contractFormProps.our_legal_entity_id;
      if (ownerId) ownerSel.value = String(ownerId);
    }
  }
}

async function submitRentEquipmentCreate(el) {
  var idx = el.getAttribute('data-idx');
  var eqTypeId = parseInt(el.getAttribute('data-eqtype'));
  var nameEl = document.querySelector('.ro-eq-name[data-idx="' + idx + '"]');
  var catEl  = document.querySelector('.ro-eq-cat[data-idx="' + idx + '"]');
  if (!nameEl || !nameEl.value.trim()) { alert('Введите название оборудования'); return; }
  var props = {};
  if (catEl && catEl.value) {
    if (catEl.value === '__custom__') {
      var catCustomEl = document.querySelector('.ro-eq-cat-custom[data-idx="' + idx + '"]');
      if (catCustomEl && catCustomEl.value.trim()) props.equipment_category = catCustomEl.value.trim();
    } else {
      props.equipment_category = catEl.value;
    }
  }
  // Collect all additional fields from expanded form
  var kindEl    = document.querySelector('.ro-eq-kind[data-idx="' + idx + '"]');
  var invEl     = document.querySelector('.ro-eq-inv[data-idx="' + idx + '"]');
  var serialEl  = document.querySelector('.ro-eq-serial[data-idx="' + idx + '"]');
  var yearEl    = document.querySelector('.ro-eq-year[data-idx="' + idx + '"]');
  var mfrEl     = document.querySelector('.ro-eq-mfr[data-idx="' + idx + '"]');
  var statusEl  = document.querySelector('.ro-eq-status[data-idx="' + idx + '"]');
  if (kindEl && kindEl.value.trim()) props.equipment_kind = kindEl.value.trim();
  if (invEl && invEl.value.trim()) props.inv_number = invEl.value.trim();
  if (serialEl && serialEl.value.trim()) props.serial_number = serialEl.value.trim();
  if (yearEl && yearEl.value) props.year = yearEl.value;
  if (mfrEl && mfrEl.value.trim()) props.manufacturer = mfrEl.value.trim();
  if (statusEl && statusEl.value) props.status = statusEl.value;

  var ownerElR = document.querySelector('.ro-eq-owner[data-idx="' + idx + '"]');
  var ownerEntR = null;
  if (ownerElR && ownerElR.value) {
    ownerEntR = _ownCompanies.find(function(c) { return c.id === parseInt(ownerElR.value); });
    if (ownerEntR) { props.balance_owner_id = ownerEntR.id; props.balance_owner_name = ownerEntR.name; }
  }
  // Use rent object's building as parent_id for the new equipment entity
  var buildingIdElR = document.querySelector('.ro-field[data-idx="' + idx + '"][data-name="building_id"]');
  var parentIdR = buildingIdElR && buildingIdElR.value ? parseInt(buildingIdElR.value) : null;
  // Validation: required fields
  var missingR = [];
  if (!props.equipment_category) missingR.push('Категория');
  if (!parentIdR) missingR.push('Корпус (выберите помещение или здание)');
  if (missingR.length) { alert('Заполните обязательные поля: ' + missingR.join(', ')); return; }
  function selectEquipment(ent) {
    if (!_equipment.find(function(e) { return e.id === ent.id; })) _equipment.push(ent);
    var sel = document.querySelector('.ro-field[data-idx="' + idx + '"][data-name="equipment_id"]');
    if (sel) {
      var opt = document.createElement('option');
      opt.value = ent.id; opt.textContent = ent.name; opt.selected = true;
      // deselect previous
      Array.from(sel.options).forEach(function(o) { o.selected = false; });
      sel.appendChild(opt);
    }
    var nameHidden = document.querySelector('.ro-field[data-idx="' + idx + '"][data-name="equipment_name"]');
    if (nameHidden) nameHidden.value = ent.name;
    var panel = document.getElementById('ro_eq_create_' + idx);
    if (panel) panel.style.display = 'none';
  }
  var roRoomEl = document.querySelector('.ro-eq-room[data-idx="' + idx + '"]');
  var roRoomId = roRoomEl && roRoomEl.value ? parseInt(roRoomEl.value) : null;
  try {
    var bodyR = { entity_type_id: eqTypeId, name: nameEl.value.trim(), properties: props };
    if (parentIdR) bodyR.parent_id = parentIdR;
    var newEq = await api('/entities', { method: 'POST', body: JSON.stringify(bodyR) });
    // Create located_in relation if room selected
    if (roRoomId && newEq && newEq.id) {
      await api('/relations', { method: 'POST', body: JSON.stringify({
        from_entity_id: newEq.id, to_entity_id: roRoomId, relation_type: 'located_in'
      }) }).catch(function() {});
    }
    selectEquipment(newEq);
  } catch(err) {
    if (err.status === 409 && err.data && err.data.existing) {
      if (confirm('Оборудование с таким названием уже существует. Выбрать существующую запись?')) {
        selectEquipment(err.data.existing);
      }
    } else {
      alert('Ошибка: ' + (err.message || String(err)));
    }
  }
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
    if (r) obj.room = r.name;
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
