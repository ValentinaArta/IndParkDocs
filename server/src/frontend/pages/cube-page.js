/* eslint-disable */
module.exports = `
// === CUBE PAGE ===

async function showCubePage() {
  currentView = 'cube';
  _setNavHash('cube');
  setActive('[onclick*="showCubePage"]');
  document.getElementById('pageTitle').textContent = 'Куб';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';

  var content = document.getElementById('content');
  content.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted)"><div class="spinner-ring" style="margin:0 auto 16px"></div>Загрузка данных куба...</div>';

  try {
    await _cubeRender();
  } catch(e) {
    content.innerHTML = '<div style="padding:24px;color:var(--red)">Ошибка: ' + escapeHtml(e.message || String(e)) + '</div>';
  }
}

// ── State ───────────────────────────────────────────────────────────────────

var _cubeState = {
  rowDim:    'contract_type',   // Строки
  colDim:    'period_month',    // Колонки
  measure:   'amount',          // Мера
  filters:   {}
};

var _CUBE_DIMS = [
  { id: 'contract_type',  label: 'Тип договора' },
  { id: 'counterparty',   label: 'Контрагент' },
  { id: 'building',       label: 'Корпус' },
  { id: 'our_company',    label: 'Наша организация' },
  { id: 'period_month',   label: 'Период (месяц)' },
  { id: 'period_quarter', label: 'Период (квартал)' },
  { id: 'period_year',    label: 'Период (год)' },
];

var _CUBE_MEASURES = [
  { id: 'amount',  label: 'Сумма, ₽' },
  { id: 'count',   label: 'Количество' },
  { id: 'area',    label: 'Площадь, м²' },
];

// ── Main render ─────────────────────────────────────────────────────────────

async function _cubeRender() {
  var data = await api('/cube/data?' + _cubeBuildQuery());
  var content = document.getElementById('content');
  content.innerHTML = _cubeRenderLayout(data);
  renderIcons();
}

function _cubeBuildQuery() {
  var p = 'rowDim=' + encodeURIComponent(_cubeState.rowDim) +
          '&colDim=' + encodeURIComponent(_cubeState.colDim) +
          '&measure=' + encodeURIComponent(_cubeState.measure);
  Object.keys(_cubeState.filters).forEach(function(k) {
    if (_cubeState.filters[k]) p += '&filter_' + encodeURIComponent(k) + '=' + encodeURIComponent(_cubeState.filters[k]);
  });
  return p;
}

function _cubeRenderLayout(data) {
  var rows = (data && data.rows) || [];
  var cols = (data && data.cols) || [];
  var cells = (data && data.cells) || {};
  var totalsRow = (data && data.totalsRow) || {};
  var totalsCol = (data && data.totalsCol) || {};
  var grand = (data && data.grand) || 0;

  var measureLabel = (_CUBE_MEASURES.find(function(m) { return m.id === _cubeState.measure; }) || {}).label || _cubeState.measure;

  var html = '<div style="max-width:100%;padding:0 0 24px">';

  // ── Controls ──
  html += '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin-bottom:20px;padding:16px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">';

  html += '<div style="display:flex;flex-direction:column;gap:4px">';
  html += '<label style="font-size:11px;color:var(--text-secondary);font-weight:500">СТРОКИ</label>';
  html += '<select data-cube-axis="row" style="font-size:13px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-secondary);color:var(--text)" onchange="_cubeSetDim(this.dataset.cubeAxis,this.value)">';
  _CUBE_DIMS.forEach(function(d) {
    html += '<option value="' + d.id + '"' + (d.id === _cubeState.rowDim ? ' selected' : '') + '>' + escapeHtml(d.label) + '</option>';
  });
  html += '</select></div>';

  html += '<div style="display:flex;flex-direction:column;gap:4px">';
  html += '<label style="font-size:11px;color:var(--text-secondary);font-weight:500">КОЛОНКИ</label>';
  html += '<select data-cube-axis="col" style="font-size:13px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-secondary);color:var(--text)" onchange="_cubeSetDim(this.dataset.cubeAxis,this.value)">';
  _CUBE_DIMS.forEach(function(d) {
    html += '<option value="' + d.id + '"' + (d.id === _cubeState.colDim ? ' selected' : '') + '>' + escapeHtml(d.label) + '</option>';
  });
  html += '</select></div>';

  html += '<div style="display:flex;flex-direction:column;gap:4px">';
  html += '<label style="font-size:11px;color:var(--text-secondary);font-weight:500">МЕРА</label>';
  html += '<select style="font-size:13px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--bg-secondary);color:var(--text)" onchange="_cubeSetMeasure(this.value)">';
  _CUBE_MEASURES.forEach(function(m) {
    html += '<option value="' + m.id + '"' + (m.id === _cubeState.measure ? ' selected' : '') + '>' + escapeHtml(m.label) + '</option>';
  });
  html += '</select></div>';

  html += '<button class="btn btn-primary btn-sm" onclick="_cubeRender()"><i data-lucide="refresh-cw" class="lucide" style="width:14px;height:14px"></i> Обновить</button>';
  html += '</div>';

  // ── Table ──
  if (!rows.length || !cols.length) {
    html += '<div style="padding:40px;text-align:center;color:var(--text-muted);background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius)">Нет данных для выбранных параметров</div>';
    html += '</div>';
    return html;
  }

  html += '<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;font-size:13px;background:var(--bg-card);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow)">';

  // Header row
  html += '<thead><tr style="background:var(--bg-sidebar);color:white">';
  html += '<th style="padding:10px 14px;text-align:left;font-weight:600;border-right:1px solid rgba(255,255,255,0.1)">' + escapeHtml(_dimLabel(_cubeState.rowDim)) + ' \\ ' + escapeHtml(_dimLabel(_cubeState.colDim)) + '</th>';
  cols.forEach(function(c) {
    html += '<th style="padding:10px 14px;text-align:right;font-weight:500;border-right:1px solid rgba(255,255,255,0.1);white-space:nowrap">' + escapeHtml(String(c.label || c.key)) + '</th>';
  });
  html += '<th style="padding:10px 14px;text-align:right;font-weight:700;background:rgba(0,0,0,0.2)">Итого</th>';
  html += '</tr></thead>';

  // Data rows
  html += '<tbody>';
  rows.forEach(function(r, ri) {
    var bg = ri % 2 === 0 ? '' : 'background:var(--bg-secondary)';
    html += '<tr style="border-top:1px solid var(--border);' + bg + '">';
    html += '<td style="padding:8px 14px;font-weight:500;border-right:1px solid var(--border)">' + escapeHtml(String(r.label || r.key)) + '</td>';
    cols.forEach(function(c) {
      var v = (cells[r.key] || {})[c.key];
      html += '<td style="padding:8px 14px;text-align:right;border-right:1px solid var(--border);color:' + (v ? 'var(--text)' : 'var(--text-muted)') + '">' + _cubeFmt(v, _cubeState.measure) + '</td>';
    });
    html += '<td style="padding:8px 14px;text-align:right;font-weight:600;background:var(--bg-secondary)">' + _cubeFmt(totalsRow[r.key], _cubeState.measure) + '</td>';
    html += '</tr>';
  });

  // Totals row
  html += '<tr style="border-top:2px solid var(--border);background:var(--bg-secondary);font-weight:700">';
  html += '<td style="padding:10px 14px;border-right:1px solid var(--border)">Итого</td>';
  cols.forEach(function(c) {
    html += '<td style="padding:10px 14px;text-align:right;border-right:1px solid var(--border)">' + _cubeFmt(totalsCol[c.key], _cubeState.measure) + '</td>';
  });
  html += '<td style="padding:10px 14px;text-align:right;font-size:14px;color:var(--accent)">' + _cubeFmt(grand, _cubeState.measure) + '</td>';
  html += '</tr>';

  html += '</tbody></table></div>';
  html += '</div>';
  return html;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function _dimLabel(dimId) {
  var d = _CUBE_DIMS.find(function(x) { return x.id === dimId; });
  return d ? d.label : dimId;
}

function _cubeFmt(v, measure) {
  if (v === undefined || v === null || v === 0) return '<span style="color:var(--text-muted)">—</span>';
  if (measure === 'amount') return _fmtNum(v) + ' ₽';
  if (measure === 'area')   return _fmtNum(v) + ' м²';
  return String(v);
}

function _cubeSetDim(axis, value) {
  if (axis === 'row') _cubeState.rowDim = value;
  else _cubeState.colDim = value;
}

function _cubeSetMeasure(value) {
  _cubeState.measure = value;
}
`;
