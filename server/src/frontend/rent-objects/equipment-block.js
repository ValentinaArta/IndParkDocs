/* eslint-disable */
module.exports = `
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
  html += '<button type="button" class="btn btn-sm" onclick="addEquipmentRentItem()" style="margin-bottom:16px">+ \\u0414\\u043e\\u0431\\u0430\\u0432\\u0438\\u0442\\u044c \\u043e\\u0431\\u043e\\u0440\\u0443\\u0434\\u043e\\u0432\\u0430\\u043d\\u0438\\u0435</button>';

  html += '<div class="form-group"><label>\\u0421\\u0442\\u043e\\u0438\\u043c\\u043e\\u0441\\u0442\\u044c \\u0430\\u0440\\u0435\\u043d\\u0434\\u044b \\u0432 \\u043c\\u0435\\u0441\\u044f\\u0446 (\\u0438\\u0442\\u043e\\u0433\\u043e)</label><input type="number" id="f_rent_monthly" value="' + (props.rent_monthly || '') + '" readonly style="background:var(--bg-secondary);font-weight:600;color:var(--accent)"></div>';

  html += '<div class="form-group"><label>\\u041d\\u0414\\u0421 (%)</label><input type="number" id="f_vat_rate" value="' + escapeHtml(vatVal) + '" style="width:80px" min="0" max="100" oninput="updateVatDisplay()"></div>';
  html += '<div id="vat_display" style="font-size:12px;color:var(--text-secondary);margin-bottom:12px"></div>';

  html += '<div class="form-group"><label>\\u0421\\u0440\\u043e\\u043a \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f</label><select id="f_duration_type" onchange="onDurationTypeChange()">';
  html += '<option value="">\\u2014</option>';
  html += '<option value="\\u0414\\u0430\\u0442\\u0430"' + (durationType === '\\u0414\\u0430\\u0442\\u0430' ? ' selected' : '') + '>\\u0414\\u0430\\u0442\\u0430</option>';
  html += '<option value="\\u0422\\u0435\\u043a\\u0441\\u0442"' + (durationType === '\\u0422\\u0435\\u043a\\u0441\\u0442' ? ' selected' : '') + '>\\u0422\\u0435\\u043a\\u0441\\u0442</option>';
  html += '</select></div>';
  html += '<div id="duration_date_wrap" style="' + (durationType === '\\u0414\\u0430\\u0442\\u0430' ? '' : 'display:none') + '"><div class="form-group"><label>\\u0414\\u0430\\u0442\\u0430 \\u043e\\u043a\\u043e\\u043d\\u0447\\u0430\\u043d\\u0438\\u044f</label><input type="date" id="f_duration_date" value="' + (props.duration_date || '') + '"></div></div>';
  html += '<div id="duration_text_wrap" style="' + (durationType === '\\u0422\\u0435\\u043a\\u0441\\u0442' ? '' : 'display:none') + '"><div class="form-group"><label>\\u0421\\u0440\\u043e\\u043a \\u0434\\u0435\\u0439\\u0441\\u0442\\u0432\\u0438\\u044f (\\u0442\\u0435\\u043a\\u0441\\u0442)</label><input id="f_duration_text" value="' + escapeHtml(props.duration_text || '') + '"></div></div>';

  container.innerHTML = html;
  recalcEquipmentRentTotal();
}

function renderEqRentSubjectOnly(container, allFields, props) {
  var items = [];
  try { items = JSON.parse(props.equipment_rent_items || '[]'); } catch(ex) {}
  if (!items.length) items = [{}];
  var html = '<div id="eq_rent_items_container">';
  _eqRentCounter = 0;
  items.forEach(function(item, i) {
    html += renderEquipmentRentBlock(i, item);
    _eqRentCounter = i + 1;
  });
  html += '</div>';
  html += '<button type="button" class="btn btn-sm" onclick="addEquipmentRentItem()" style="margin-bottom:16px">+ \\u0414\\u043e\\u0431\\u0430\\u0432\\u0438\\u0442\\u044c \\u043e\\u0431\\u043e\\u0440\\u0443\\u0434\\u043e\\u0432\\u0430\\u043d\\u0438\\u0435</button>';
  container.innerHTML = html;
  recalcEquipmentRentTotal();
}

function renderEquipmentRentBlock(index, item) {
  item = item || {};
  var eq = item.equipment_id ? (_equipment || []).find(function(e) { return e.id === parseInt(item.equipment_id); }) : null;
  var eqProps = eq ? (eq.properties || {}) : {};

  var h = '<div class="eq-rent-block" id="eq_rent_' + index + '" style="border-left:3px solid var(--accent);padding:12px 12px 12px 15px;margin-bottom:12px;position:relative;background:var(--bg-secondary);border-radius:6px">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
  h += '<strong>\\u041e\\u0431\\u043e\\u0440\\u0443\\u0434\\u043e\\u0432\\u0430\\u043d\\u0438\\u0435 ' + (index + 1) + '</strong>';
  h += '<button type="button" class="btn btn-sm btn-danger" onclick="removeEquipmentRentItem(' + index + ')" style="padding:2px 8px;font-size:11px">\\u2715</button>';
  h += '</div>';

  var eqSrchId = 'eq_rent_sel_' + index;
  var eqSelName = eq ? eq.name : '';
  if (eq) { var _inv = (eq.properties || {}).inv_number; if (_inv) eqSelName += ' (\\u0438\\u043d\\u0432. ' + _inv + ')'; }
  h += '<div class="form-group"><label>\\u041e\\u0431\\u043e\\u0440\\u0443\\u0434\\u043e\\u0432\\u0430\\u043d\\u0438\\u0435</label>';
  h += renderSearchableSelect(eqSrchId, (_equipment || []).map(function(e) { var inv = (e.properties||{}).inv_number; return {id:e.id, name: e.name + (inv ? ' (\\u0438\\u043d\\u0432. '+inv+')' : '')}; }), item.equipment_id || '', eqSelName, '\\u043d\\u0430\\u0447\\u043d\\u0438\\u0442\\u0435 \\u0432\\u0432\\u043e\\u0434\\u0438\\u0442\\u044c...', 'equipment_rent');
  h += '</div>';

  h += '<div id="eq_rent_create_' + index + '" style="display:none;background:var(--bg);padding:10px;border-radius:6px;margin-bottom:8px">';
  h += '<div class="form-group"><label style="font-size:12px">\\u041d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u0435</label><input id="eq_rent_new_name_' + index + '" placeholder="\\u041d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u0435 \\u043e\\u0431\\u043e\\u0440\\u0443\\u0434\\u043e\\u0432\\u0430\\u043d\\u0438\\u044f"></div>';
  h += '<div class="form-group"><label style="font-size:12px">\\u0418\\u043d\\u0432. \\u043d\\u043e\\u043c\\u0435\\u0440</label><input id="eq_rent_new_inv_' + index + '" placeholder="\\u0418\\u043d\\u0432. \\u043d\\u043e\\u043c\\u0435\\u0440"></div>';
  h += '<div class="form-group"><label style="font-size:12px">\\u041a\\u0430\\u0442\\u0435\\u0433\\u043e\\u0440\\u0438\\u044f</label><select id="eq_rent_new_cat_' + index + '">';
  h += '<option value="">\\u2014</option>';
  getEquipmentCategories().forEach(function(c) { h += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
  h += '</select></div>';
  h += '<button type="button" class="btn btn-primary btn-sm" onclick="createEquipmentRentInline(' + index + ')">\\u0421\\u043e\\u0437\\u0434\\u0430\\u0442\\u044c</button> ';
  h += '<button type="button" class="btn btn-sm" onclick="toggleEqRentCreate(' + index + ')">\\u041e\\u0442\\u043c\\u0435\\u043d\\u0430</button>';
  h += '</div>';

  h += '<div id="eq_rent_info_' + index + '" style="' + (eq ? '' : 'display:none;') + 'font-size:13px;color:var(--text-secondary);margin-bottom:10px;padding:8px;background:var(--bg);border-radius:6px">';
  h += '<span id="eq_rent_cat_' + index + '">' + escapeHtml(eqProps.equipment_category || '') + '</span>';
  if (eqProps.inv_number) h += ' \\u00b7 \\u0418\\u043d\\u0432. ' + escapeHtml(eqProps.inv_number);
  if (eqProps.manufacturer) h += ' \\u00b7 ' + escapeHtml(eqProps.manufacturer);
  h += '</div>';

  h += '<div class="form-group"><label>\\u0421\\u0442\\u043e\\u0438\\u043c\\u043e\\u0441\\u0442\\u044c \\u0430\\u0440\\u0435\\u043d\\u0434\\u044b (\\u0440\\u0443\\u0431/\\u043c\\u0435\\u0441)</label><input type="number" class="eq-rent-field" data-idx="' + index + '" data-name="rent_cost" value="' + (item.rent_cost || '') + '" oninput="recalcEquipmentRentTotal()"></div>';

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
    if (p.inv_number) parts.push('\\u0418\\u043d\\u0432. ' + p.inv_number);
    if (p.manufacturer) parts.push(p.manufacturer);
    infoDiv.textContent = parts.join(' \\u00b7 ') || '\\u2014';
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
  if (!name) { alert('\\u0412\\u0432\\u0435\\u0434\\u0438\\u0442\\u0435 \\u043d\\u0430\\u0437\\u0432\\u0430\\u043d\\u0438\\u0435'); return; }
  var invNum = document.getElementById('eq_rent_new_inv_' + index).value.trim();
  var cat = document.getElementById('eq_rent_new_cat_' + index).value;
  var eqType = entityTypes.find(function(t) { return t.name === 'equipment'; });
  if (!eqType) { alert('\\u0422\\u0438\\u043f "\\u041e\\u0431\\u043e\\u0440\\u0443\\u0434\\u043e\\u0432\\u0430\\u043d\\u0438\\u0435" \\u043d\\u0435 \\u043d\\u0430\\u0439\\u0434\\u0435\\u043d'); return; }
  var properties = {};
  if (invNum) properties.inv_number = invNum;
  if (cat) properties.equipment_category = cat;
  try {
    var created = await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: eqType.id, name: name, properties: properties }) });
    _equipment.push(created);
    var eqLabel = name + (invNum ? ' (\\u0438\\u043d\\u0432. ' + invNum + ')' : '');
    var hiddenEl = document.getElementById('eq_rent_sel_' + index);
    var textEl = document.getElementById('eq_rent_sel_' + index + '_text');
    if (hiddenEl) hiddenEl.value = String(created.id);
    if (textEl) textEl.value = eqLabel;
    onEquipmentRentSelected(index);
    toggleEqRentCreate(index);
  } catch(e) { alert('\\u041e\\u0448\\u0438\\u0431\\u043a\\u0430: ' + (e.message || e)); }
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
    var eqHidden = document.getElementById('eq_rent_sel_' + idx);
    if (eqHidden && eqHidden.value) item.equipment_id = eqHidden.value;
    _enrichFromRegistry(item);
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
// ===== End \\u0410\\u0440\\u0435\\u043d\\u0434\\u0430 \\u043e\\u0431\\u043e\\u0440\\u0443\\u0434\\u043e\\u0432\\u0430\\u043d\\u0438\\u044f =====
`;
