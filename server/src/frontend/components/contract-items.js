/* eslint-disable */
module.exports = `
// === CONTRACT ITEMS — moved from entity-form.js ===

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

`;
