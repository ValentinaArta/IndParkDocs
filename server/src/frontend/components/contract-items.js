/* eslint-disable */
module.exports = `
// === CONTRACT ITEMS — with charge_type per line ===

var _CI_CHARGE_TYPES = ['Повторяющийся', 'Разовый', 'Доп. услуги'];
var _CI_FREQUENCIES = ['Ежемесячно', 'Ежеквартально', 'Раз в полгода', 'Ежегодно'];

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
  var ct = item.charge_type || 'Повторяющийся';
  var freq = item.frequency || 'Ежемесячно';
  var pd = item.payment_date || '';

  // Color coding by charge type
  var _ciBg = ct === 'Разовый' ? '#fef3c720' : ct === 'Доп. услуги' ? '#f0fdf420' : '#eff6ff30';
  var _ciBorder = ct === 'Разовый' ? '#fbbf24' : ct === 'Доп. услуги' ? '#86efac' : '#93c5fd';

  var h = '<div class="contract-item" data-idx="' + idx + '" style="margin-bottom:6px;padding:6px 8px;border:1px solid ' + _ciBorder + ';border-left:3px solid ' + _ciBorder + ';border-radius:6px;background:' + _ciBg + '">';

  // Single row: name + amount + type + conditional + remove
  h += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">';
  if (isSale) {
    h += '<input class="ci-name" data-idx="' + idx + '" placeholder="Наименование" value="' + escapeHtml(item.name||'') + '" style="flex:2;min-width:120px" oninput="recalcContractAmount()">';
    h += '<input class="ci-qty" data-idx="' + idx + '" type="number" min="0" placeholder="Кол-во" value="' + escapeHtml(String(item.qty||1)) + '" style="width:60px" oninput="recalcContractAmount()">';
    h += '<input class="ci-uprice" data-idx="' + idx + '" type="number" min="0" placeholder="Цена" value="' + escapeHtml(String(item.unit_price||'')) + '" style="width:80px" oninput="recalcContractAmount()">';
    h += '<span class="ci-total" data-idx="' + idx + '" style="width:70px;font-size:12px;color:var(--text-secondary);white-space:nowrap">' + (item.amount ? Number(item.amount).toLocaleString('ru-RU') + ' \\u20BD' : '') + '</span>';
  } else {
    h += '<input class="ci-name" data-idx="' + idx + '" placeholder="Наименование работ/услуг" value="' + escapeHtml(item.name||'') + '" style="flex:2;min-width:120px" oninput="recalcContractAmount()">';
    h += '<input class="ci-amount" data-idx="' + idx + '" type="number" min="0" placeholder="Сумма" value="' + escapeHtml(String(item.amount||'')) + '" style="width:100px" oninput="recalcContractAmount()">';
  }

  // Type selector
  h += '<select class="ci-charge-type" data-idx="' + idx + '" onchange="_ciChargeTypeChanged(this)" style="font-size:11px;padding:2px 4px;border-radius:4px;border:1px solid var(--border);width:auto">';
  _CI_CHARGE_TYPES.forEach(function(t) {
    h += '<option value="' + escapeHtml(t) + '"' + (ct === t ? ' selected' : '') + '>' + escapeHtml(t) + '</option>';
  });
  h += '</select>';

  // Frequency (for Повторяющийся)
  h += '<select class="ci-frequency" data-idx="' + idx + '" style="font-size:11px;padding:2px 4px;border-radius:4px;border:1px solid var(--border)' + (ct !== 'Повторяющийся' ? ';display:none' : '') + '">';
  _CI_FREQUENCIES.forEach(function(f) {
    h += '<option value="' + escapeHtml(f) + '"' + (freq === f ? ' selected' : '') + '>' + escapeHtml(f) + '</option>';
  });
  h += '</select>';

  // Payment date (for Разовый)
  h += '<input class="ci-payment-date" data-idx="' + idx + '" type="date" value="' + escapeHtml(pd) + '" style="font-size:11px;padding:2px 4px;border-radius:4px;border:1px solid var(--border);width:auto' + (ct !== 'Разовый' ? ';display:none' : '') + '">';

  h += '<button type="button" onclick="contractItemRemove(this)" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:18px;padding:0 4px;line-height:1;flex-shrink:0">\\u00d7</button>';
  h += '</div></div>';
  return h;
}

function _ciChargeTypeChanged(sel) {
  var item = sel.closest('.contract-item');
  if (!item) return;
  var ct = sel.value;
  var freqEl = item.querySelector('.ci-frequency');
  var dateEl = item.querySelector('.ci-payment-date');
  if (freqEl) freqEl.style.display = ct === 'Повторяющийся' ? '' : 'none';
  if (dateEl) dateEl.style.display = ct === 'Разовый' ? '' : 'none';
  // Update colors
  var border = ct === 'Разовый' ? '#fbbf24' : ct === 'Доп. услуги' ? '#86efac' : '#93c5fd';
  var bg = ct === 'Разовый' ? '#fef3c720' : ct === 'Доп. услуги' ? '#f0fdf420' : '#eff6ff30';
  item.style.borderColor = border;
  item.style.borderLeftColor = border;
  item.style.background = bg;
  recalcContractAmount();
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
  var list = document.getElementById('f_contract_items_list');
  if (list) list.querySelectorAll('.contract-item').forEach(function(el, i) {
    el.setAttribute('data-idx', i);
    el.querySelectorAll('[data-idx]').forEach(function(inp) { inp.setAttribute('data-idx', i); });
  });
}

function recalcContractAmount() {
  var amtEl = document.getElementById('f_contract_amount');
  if (!amtEl) return;
  var total = 0;

  // Sum equipment prices
  document.querySelectorAll('#f_equipment_list .eq-list-price').forEach(function(inp) {
    total += parseFloat(inp.value) || 0;
  });

  // Sum contract items — only Повторяющийся
  var wrapper = document.getElementById('f_contract_items_wrapper');
  if (wrapper) {
    var isSale = wrapper.getAttribute('data-sale') === '1';
    var list = document.getElementById('f_contract_items_list');
    if (list) {
      list.querySelectorAll('.contract-item').forEach(function(item) {
        var ctSel = item.querySelector('.ci-charge-type');
        var ct = ctSel ? ctSel.value : 'Повторяющийся';
        if (isSale) {
          var qty = parseFloat(item.querySelector('.ci-qty').value) || 0;
          var up = parseFloat(item.querySelector('.ci-uprice').value) || 0;
          var rowAmt = qty * up;
          var totalEl = item.querySelector('.ci-total');
          if (totalEl) totalEl.textContent = rowAmt ? rowAmt.toLocaleString('ru-RU') + ' \\u20BD' : '';
          if (ct === 'Повторяющийся') total += rowAmt;
        } else {
          var amt = parseFloat(item.querySelector('.ci-amount').value) || 0;
          if (ct === 'Повторяющийся') total += amt;
        }
      });
    }
  }

  amtEl.value = total ? Math.round(total * 100) / 100 : '';
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
    var ctSel = item.querySelector('.ci-charge-type');
    var ct = ctSel ? ctSel.value : 'Повторяющийся';
    var freqSel = item.querySelector('.ci-frequency');
    var freq = freqSel ? freqSel.value : null;
    var pdEl = item.querySelector('.ci-payment-date');
    var pd = pdEl ? pdEl.value : null;

    if (isSale) {
      var qty = parseFloat((item.querySelector('.ci-qty') || {}).value) || 0;
      var up = parseFloat((item.querySelector('.ci-uprice') || {}).value) || 0;
      items.push({ name: name.trim(), qty: qty, unit_price: up, amount: qty * up, charge_type: ct, frequency: ct === 'Повторяющийся' ? freq : null, payment_date: ct === 'Разовый' ? pd : null });
    } else {
      var amt = parseFloat((item.querySelector('.ci-amount') || {}).value) || 0;
      if (name.trim() || amt) items.push({ name: name.trim(), amount: amt, charge_type: ct, frequency: ct === 'Повторяющийся' ? freq : null, payment_date: ct === 'Разовый' ? pd : null });
    }
  });
  return items;
}

`;
