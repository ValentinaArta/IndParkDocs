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
`;
