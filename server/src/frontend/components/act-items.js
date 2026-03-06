/* eslint-disable */
module.exports = `
// === ACT ITEMS — moved from entity-form.js ===

var _actItemCounter = 0;
var _actEquipmentList = null;  // filtered to contract's equipment when creating act

function _isEquipmentActive(eq) {
  var status = (eq.properties || {}).status || '';
  if (status === 'Списано' || status === 'Законсервировано') return false;
  if ((eq.name || '').toUpperCase().indexOf('АРХИВ') !== -1) return false;
  return true;
}

function _renderActItem(item, rowId, bgIdx) {
  var eqList = (_actEquipmentList || _equipment).filter(_isEquipmentActive);
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
    var actItem = {
      equipment_id: eqId,
      amount:       parseFloat(amtEl ? amtEl.value : 0) || 0,
      description:  descEl ? descEl.value.trim() : '',
      comment:      cmtEl  ? cmtEl.value.trim()  : '',
      broken:       brkEl  ? brkEl.checked        : false,
    };
    _enrichFromRegistry(actItem); // добавляет equipment_name, inv_number, category, kind, status, manufacturer
    result.push(actItem);
  });
  return result;
}

`;
