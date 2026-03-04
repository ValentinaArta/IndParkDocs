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
`;
