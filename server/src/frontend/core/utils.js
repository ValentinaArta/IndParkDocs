module.exports = `
// === CORE UTILS — defined ONCE, used everywhere ===

function escapeHtml(s) {
  return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
}

function _fmtNum(v) {
  if (!v && v !== 0) return '\u2014';
  var n = parseFloat(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function _fmtDate(d) { return d ? d.split('-').reverse().join('.') : '\u2014'; }

function _docStatusBadge(status) {
  if (!status) return '';
  var style = status === 'Подписан'
    ? 'background:#dcfce7;color:#16a34a'
    : status === 'Архив'
      ? 'background:#fee2e2;color:#dc2626'
      : 'background:#e2e8f0;color:#64748b'; // Создан и прочее — серый
  return '<span style="' + style + ';font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap">' + escapeHtml(status) + '</span>';
}

function renderVatSelect(val, inputId) {
  inputId = inputId || 'f_vat_rate';
  var opts = [
    { v: 'exempt', l: 'НДС не облагается' },
    { v: '0',  l: '0%' },
    { v: '5',  l: '5%' },
    { v: '18', l: '18%' },
    { v: '20', l: '20%' },
    { v: '22', l: '22% (по умолчанию)' },
  ];
  var norm = String(val || '22').trim();
  if (!norm || norm === 'undefined' || norm === 'null') norm = '22';
  var h = '<select id="' + inputId + '" onchange="updateVatDisplay()" style="width:auto;min-width:160px">';
  opts.forEach(function(o) {
    h += '<option value="' + o.v + '"' + (norm === o.v ? ' selected' : '') + '>' + o.l + '</option>';
  });
  h += '</select>';
  return h;
}
`;
