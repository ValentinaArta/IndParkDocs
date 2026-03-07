/* eslint-disable */
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
    '<button type="button" class="btn btn-sm btn-danger" onclick="removeCommentRow(' + index + ')" style="padding:4px 8px;font-size:11px">\\u2715</button>' +
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
  var hasCmt = !!(obj.comment && obj.comment.trim());
  h += '<div id="ro_cmt_wrap_' + index + '" style="margin-top:4px">';
  h += '<div id="ro_cmt_block_' + index + '"' + (hasCmt ? '' : ' style="display:none"') + '>';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">' +
    '<label style="font-size:12px;margin:0;color:var(--text-secondary)">Комментарий</label>' +
    '<button type="button" onclick="closeRoComment(' + index + ')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:0 4px;font-size:13px">\\u2715</button></div>';
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
`;
