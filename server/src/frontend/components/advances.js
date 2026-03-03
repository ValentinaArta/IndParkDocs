/* eslint-disable */
module.exports = `
// === ADVANCES — moved from entity-form.js ===

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
`;
