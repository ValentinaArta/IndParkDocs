/* eslint-disable */
module.exports = `
// === AMOUNT INPUT — moved from entity-crud.js ===

function parseAmount(str) {
  if (!str && str !== 0) return 0;
  return parseFloat(String(str).replace(/s/g, '').replace(',', '.')) || 0;
}

function formatAmountDisplay(val) {
  if (!val && val !== 0) return '';
  var n = parseFloat(String(val).replace(/s/g, '').replace(',', '.'));
  if (isNaN(n)) return '';
  var parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/B(?=(d{3})+(?!d))/g, ' ');
  return parts.join(',');
}

function formatAmountOnBlur(el) {
  var n = parseAmount(el.value);
  if (!n) return;
  el.value = formatAmountDisplay(n);
}

function initAmountFormatting() {
  document.querySelectorAll('.z-amount, #zZachetAmount').forEach(function(el) {
    if (el._blurBound) return;
    el._blurBound = true;
    el.addEventListener('blur', function() { formatAmountOnBlur(el); });
  });
}
`;
