/* eslint-disable */
module.exports = `
// === CUBE PAGE ===

var CUBE_DIM_GROUPS = [
  { id: 'contract', label: 'Договор', icon: '📄', dims: [
    { id: 'contract_type',  label: 'Тип договора' },
    { id: 'our_company',    label: 'Наша организация' },
    { id: 'doc_status',     label: 'Статус документа' },
    { id: 'period_month',   label: 'Период (месяц)' },
    { id: 'period_quarter', label: 'Период (квартал)' },
    { id: 'period_year',    label: 'Период (год)' },
  ]},
  { id: 'contractor', label: 'Контрагент', icon: '🏛', dims: [
    { id: 'contractor_name', label: 'Название' },
  ]},
  { id: 'building', label: 'Корпус', icon: '🏢', dims: [
    { id: 'building_name', label: 'Название' },
  ]},
  { id: 'equipment', label: 'Оборудование', icon: '🔧', dims: [
    { id: 'equipment_status',   label: 'Статус' },
    { id: 'equipment_category', label: 'Категория' },
    { id: 'equipment_kind',     label: 'Вид' },
    { id: 'equipment_name',     label: 'Название' },
  ]},
];

// ── State ──────────────────────────────────────────────────────────────────
var _cubeRowDim      = null;
var _cubeColDim      = null;
var _cubeMeasure     = 'count';
var _cubeLastData    = null;
var _cubeFilters     = {};        // { contract_type: ['Аренды',...], doc_status: [...] }
var _cubeHideEmpty   = false;
var _cubeFilterMeta  = null;      // loaded from /api/cube/filter-values

// ── Entry point ────────────────────────────────────────────────────────────
async function showCubePage() {
  currentView = 'cube';
  _setNavHash('cube');
  setActive('[onclick*="showCubePage"]');
  document.getElementById('pageTitle').textContent = 'Куб';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';
  document.getElementById('content').innerHTML = _cubeLayout();
  renderIcons();
  _cubeRenderPool();
  _cubeLoadFilters();
  _cubeRenderCtrl();
}

function _cubeLayout() {
  return '<style>' +
    '.cube-di{padding:8px 14px;cursor:pointer;border-bottom:1px solid var(--border)}' +
    '.cube-di:hover{background:var(--bg-hover)}' +
    '.cube-chip{padding:3px 10px;border-radius:11px;font-size:12px;cursor:pointer;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text);transition:all .15s;white-space:nowrap}' +
    '.cube-chip.on{border-color:var(--accent);background:var(--accent);color:#fff}' +
    '</style>' +
    '<div id="cubeWrap" style="display:flex;flex-direction:column;height:100%;overflow:hidden">' +
    '<div id="cubeDimPool"  style="padding:12px 16px 10px;background:var(--bg-card);border-bottom:1px solid var(--border);flex-shrink:0"></div>' +
    '<div id="cubeFiltersBar" style="padding:8px 16px;background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0">' +
      '<span style="font-size:11px;color:var(--text-muted)">Загрузка фильтров\u2026</span>' +
    '</div>' +
    '<div id="cubeCtrl" style="display:flex;align-items:center;gap:10px;padding:8px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap"></div>' +
    '<div style="display:flex;flex:1;overflow:hidden">' +
      '<div id="cubeTableWrap" style="flex:1;overflow:auto;padding:16px"></div>' +
      '<div id="cubeDrill" style="width:0;overflow:hidden;border-left:1px solid var(--border);transition:width .25s;background:var(--bg-card);flex-shrink:0"></div>' +
    '</div></div>';
}

// ── Dimension pool ─────────────────────────────────────────────────────────
function _cubeRenderPool() {
  var el = document.getElementById('cubeDimPool');
  if (!el) return;
  var h = '<div style="display:flex;flex-wrap:wrap;gap:16px">';
  CUBE_DIM_GROUPS.forEach(function(g) {
    h += '<div><div style="font-size:10px;font-weight:700;color:var(--text-secondary);letter-spacing:.05em;text-transform:uppercase;margin-bottom:5px">' +
         escapeHtml(g.icon + ' ' + g.label) + '</div><div style="display:flex;flex-wrap:wrap;gap:4px">';
    g.dims.forEach(function(d) {
      var isRow  = _cubeRowDim === d.id;
      var isCol  = _cubeColDim === d.id;
      var active = isRow || isCol;
      var suffix = isRow ? ' \u2195' : (isCol ? ' \u2194' : '');
      h += '<button type="button" data-cube-dim="' + d.id + '" onclick="_cubeDimClick(this.dataset.cubeDim)" style="' +
           'padding:4px 10px;border-radius:12px;font-size:12px;cursor:pointer;white-space:nowrap;transition:all .15s;' +
           'border:1px solid ' + (active ? 'var(--accent)' : 'var(--border)') + ';' +
           'background:' + (active ? 'var(--accent)' : 'var(--bg-secondary)') + ';' +
           'color:' + (active ? 'white' : 'var(--text)') + '">' + escapeHtml(d.label + suffix) + '</button>';
    });
    h += '</div></div>';
  });
  h += '</div>';
  el.innerHTML = h;
}

// ── Filters bar ────────────────────────────────────────────────────────────
async function _cubeLoadFilters() {
  try {
    _cubeFilterMeta = await api('/cube/filter-values');
    _cubeRenderFilters();
  } catch(e) {
    var bar = document.getElementById('cubeFiltersBar');
    if (bar) bar.innerHTML = '';
  }
}

function _cubeRenderFilters() {
  var bar = document.getElementById('cubeFiltersBar');
  if (!bar || !_cubeFilterMeta) return;

  var types    = _cubeFilterMeta.contract_types   || [];
  var statuses = _cubeFilterMeta.doc_statuses     || [];
  var selTypes = _cubeFilters.contract_type || [];
  var selStat  = _cubeFilters.doc_status    || [];

  function chips(items, selArr, filterKey) {
    return items.map(function(v) {
      var on = selArr.indexOf(v) >= 0;
      return '<button type="button" class="cube-chip' + (on ? ' on' : '') + '" ' +
             'data-fk="' + filterKey + '" data-fv="' + escapeHtml(v) + '" ' +
             'onclick="_cubeToggleFilter(this.dataset.fk, this.dataset.fv)">' +
             escapeHtml(v) + '</button>';
    }).join('');
  }

  var h = '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">';

  if (types.length) {
    h += '<div><div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Тип договора</div>' +
         '<div style="display:flex;flex-wrap:wrap;gap:4px">' + chips(types, selTypes, 'contract_type') + '</div></div>';
  }

  if (statuses.length) {
    h += '<div><div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Статус документа</div>' +
         '<div style="display:flex;flex-wrap:wrap;gap:4px">' + chips(statuses, selStat, 'doc_status') + '</div></div>';
  }

  // Active filter summary
  var activeCount = selTypes.length + selStat.length;
  if (activeCount > 0) {
    h += '<div style="margin-left:auto;align-self:flex-end">' +
         '<button type="button" onclick="_cubeClearFilters()" style="font-size:11px;color:var(--accent);background:none;border:none;cursor:pointer;text-decoration:underline">Сбросить фильтры (' + activeCount + ')</button>' +
         '</div>';
  }

  // Hide empty toggle
  h += '<div style="' + (activeCount ? '' : 'margin-left:auto;') + 'align-self:center">' +
       '<label style="font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px">' +
       '<input type="checkbox" ' + (_cubeHideEmpty ? 'checked' : '') + ' onchange="_cubeSetHideEmpty(this.checked)" style="cursor:pointer">' +
       'Скрыть пустые</label></div>';

  h += '</div>';
  bar.innerHTML = h;
}

function _cubeToggleFilter(key, val) {
  if (!_cubeFilters[key]) _cubeFilters[key] = [];
  var idx = _cubeFilters[key].indexOf(val);
  if (idx >= 0) _cubeFilters[key].splice(idx, 1);
  else          _cubeFilters[key].push(val);
  _cubeRenderFilters();
}

function _cubeClearFilters() {
  _cubeFilters = {};
  _cubeRenderFilters();
}

function _cubeSetHideEmpty(v) {
  _cubeHideEmpty = !!v;
  _cubeRenderFilters();
  if (_cubeLastData) _cubeRun();
}

// ── Control bar ────────────────────────────────────────────────────────────
function _cubeRenderCtrl() {
  var el = document.getElementById('cubeCtrl');
  if (!el) return;

  function slot(axis) {
    var dimId = axis === 'row' ? _cubeRowDim : _cubeColDim;
    var icon  = axis === 'row' ? '\u2195 Строки' : '\u2194 Колонки';
    if (!dimId) {
      return '<div data-cube-axis="' + axis + '" onclick="_cubeFocusAxis(this.dataset.cubeAxis)" ' +
             'style="padding:5px 12px;border:1px dashed var(--border);border-radius:6px;font-size:12px;color:var(--text-muted);cursor:pointer;min-width:110px">' +
             icon + '...</div>';
    }
    return '<div style="display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid var(--accent);border-radius:6px;background:var(--accent);color:white;font-size:12px">' +
           '<span style="opacity:.7;font-size:10px">' + icon + '</span> ' + escapeHtml(_cubeDimLabel(dimId)) +
           '<button type="button" data-cube-axis="' + axis + '" onclick="_cubeClearAxis(this.dataset.cubeAxis)" ' +
           'style="background:none;border:none;color:white;opacity:.7;cursor:pointer;font-size:16px;padding:0 0 0 4px;line-height:1">\xd7</button></div>';
  }

  var mBtns = [['count','Количество'],['sum','Сумма \u20bd'],['list','Список']].map(function(m) {
    var on = _cubeMeasure === m[0];
    return '<button type="button" data-cube-measure="' + m[0] + '" onclick="_cubeSetMeasure(this.dataset.cubeMeasure)" ' +
           'style="padding:5px 10px;font-size:12px;border-radius:5px;cursor:pointer;' +
           'border:1px solid ' + (on ? 'var(--accent)' : 'var(--border)') + ';' +
           'background:' + (on ? 'var(--accent)' : 'var(--bg)') + ';' +
           'color:' + (on ? 'white' : 'var(--text)') + '">' + escapeHtml(m[1]) + '</button>';
  }).join('');

  var canRun = _cubeRowDim && _cubeColDim && _cubeRowDim !== _cubeColDim;
  el.innerHTML =
    slot('row') + slot('col') +
    '<div style="display:flex;gap:4px;margin-left:4px">' + mBtns + '</div>' +
    '<button type="button" onclick="_cubeRun()" ' + (canRun ? '' : 'disabled ') +
    'style="padding:6px 16px;border-radius:6px;border:none;font-size:13px;font-weight:600;margin-left:auto;white-space:nowrap;' +
    (canRun ? 'cursor:pointer;background:var(--accent);color:white' : 'cursor:not-allowed;background:var(--border);color:var(--text-muted)') +
    '">\u25b6 Построить</button>';
}

// ── Axis / measure controls ────────────────────────────────────────────────
var _cubeFocusedAxis = 'row';
function _cubeFocusAxis(a) { _cubeFocusedAxis = a; }

function _cubeDimClick(id) {
  if      (_cubeRowDim === id) { _cubeRowDim = null; }
  else if (_cubeColDim === id) { _cubeColDim = null; }
  else if (!_cubeRowDim || _cubeFocusedAxis === 'row') { _cubeRowDim = id; _cubeFocusedAxis = 'col'; }
  else                                                  { _cubeColDim = id; _cubeFocusedAxis = 'row'; }
  _cubeRenderPool();
  _cubeRenderCtrl();
}

function _cubeClearAxis(a) {
  if (a === 'row') _cubeRowDim = null; else _cubeColDim = null;
  _cubeRenderPool(); _cubeRenderCtrl();
}

function _cubeSetMeasure(m) {
  _cubeMeasure = m;
  _cubeRenderCtrl();
  if (_cubeLastData) _cubeRenderTable(_cubeLastData);
}

// ── Run query ─────────────────────────────────────────────────────────────
async function _cubeRun() {
  if (!_cubeRowDim || !_cubeColDim) return;
  var wrap = document.getElementById('cubeTableWrap');
  if (wrap) wrap.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text-muted)">' +
    '<div class="spinner-ring" style="margin:0 auto 12px"></div>Строю сводную\u2026</div>';
  var drill = document.getElementById('cubeDrill');
  if (drill) { drill.style.width = '0'; drill.innerHTML = ''; }

  // Build active filters (only non-empty arrays)
  var activeFilters = {};
  Object.keys(_cubeFilters).forEach(function(k) {
    if (_cubeFilters[k] && _cubeFilters[k].length) activeFilters[k] = _cubeFilters[k];
  });

  try {
    var body = JSON.stringify({ rowDim: _cubeRowDim, colDim: _cubeColDim, filters: activeFilters, hideEmpty: _cubeHideEmpty });
    var data = await api('/cube/query', { method: 'POST', body: body });
    _cubeLastData = data;
    _cubeRenderTable(data);
  } catch(e) {
    if (wrap) wrap.innerHTML = '<div style="padding:24px;color:var(--red)">Ошибка: ' + escapeHtml(String(e.message || e)) + '</div>';
  }
}

// ── Pivot table ────────────────────────────────────────────────────────────
function _cubeRenderTable(data) {
  var wrap = document.getElementById('cubeTableWrap');
  if (!wrap) return;
  var rows = data.rows || [], cols = data.cols || [], cells = data.cells || {};
  if (!rows.length || !cols.length) {
    wrap.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text-muted)">Нет данных для выбранных измерений и фильтров</div>';
    return;
  }

  var rLabel = _cubeDimLabel(data.rowDim), cLabel = _cubeDimLabel(data.colDim);

  // Active filters hint
  var activeFilters = Object.keys(_cubeFilters).filter(function(k) { return _cubeFilters[k] && _cubeFilters[k].length; });
  var filterHint = activeFilters.length
    ? ' &nbsp;<span style="color:var(--accent);font-style:italic">фильтр: ' + escapeHtml(activeFilters.map(function(k) { return _cubeFilters[k].join(', '); }).join('; ')) + '</span>'
    : '';

  var rowTotals = {}, colTotals = {};
  rows.forEach(function(r) {
    var t = 0; cols.forEach(function(c) { var cell = (cells[r.key] || {})[c.key]; if (cell) t += _cubeVal(cell); }); rowTotals[r.key] = t;
  });
  cols.forEach(function(c) {
    var t = 0; rows.forEach(function(r) { var cell = (cells[r.key] || {})[c.key]; if (cell) t += _cubeVal(cell); }); colTotals[c.key] = t;
  });
  var grand = Object.values(rowTotals).reduce(function(s, v) { return s + v; }, 0);

  var h = '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">' +
    'Строки: <b>' + escapeHtml(rLabel) + '</b> &nbsp;&middot;&nbsp; Колонки: <b>' + escapeHtml(cLabel) + '</b> &nbsp;&middot;&nbsp;' +
    rows.length + ' стр., ' + cols.length + ' кол.' + filterHint + '</div>';

  h += '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12px;background:var(--bg-card)">';
  h += '<thead><tr style="background:var(--bg-sidebar)">';
  h += '<th style="padding:8px 12px;text-align:left;position:sticky;left:0;background:var(--bg-sidebar);z-index:2;min-width:130px;border-right:1px solid rgba(255,255,255,.1);color:var(--sidebar-text,#fff)">' +
       escapeHtml(_cubeShort(rLabel,16)) + ' / ' + escapeHtml(_cubeShort(cLabel,14)) + '</th>';
  cols.forEach(function(c) {
    h += '<th style="padding:8px 10px;text-align:right;font-weight:500;border-right:1px solid rgba(255,255,255,.1);color:var(--sidebar-text,#fff);max-width:110px" title="' +
         escapeHtml(c.key) + '">' + escapeHtml(_cubeShort(c.key, 16)) + '</th>';
  });
  h += '<th style="padding:8px 10px;text-align:right;font-weight:700;background:rgba(0,0,0,.2);color:var(--sidebar-text,#fff)">Итого</th></tr></thead>';

  h += '<tbody>';
  rows.forEach(function(r, ri) {
    var bg = ri % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)';
    h += '<tr style="border-top:1px solid var(--border)">';
    h += '<td style="padding:7px 12px;font-weight:500;position:sticky;left:0;background:' + bg + ';z-index:1;border-right:1px solid var(--border);max-width:200px" title="' +
         escapeHtml(r.key) + '">' + escapeHtml(_cubeShort(r.key, 28)) + '</td>';
    cols.forEach(function(c) {
      var cell = (cells[r.key] || {})[c.key];
      var val  = cell ? _cubeVal(cell) : 0;
      var has  = val > 0;
      h += '<td style="padding:7px 10px;text-align:right;border-right:1px solid var(--border);background:' + bg + ';' +
           (has ? 'cursor:pointer' : 'color:var(--text-muted)') + '"' +
           (has ? ' data-rk="' + escapeHtml(r.key) + '" data-ck="' + escapeHtml(c.key) + '" onclick="_cubeCellClick(this.dataset.rk,this.dataset.ck)"' : '') + '>' +
           (has ? '<span style="color:var(--accent)">' + escapeHtml(_cubeCellDisp(cell)) + '</span>' : '\u2014') + '</td>';
    });
    h += '<td style="padding:7px 10px;text-align:right;font-weight:600;background:var(--bg-secondary)">' + _cubeFmtV(rowTotals[r.key]) + '</td></tr>';
  });

  h += '<tr style="border-top:2px solid var(--border);background:var(--bg-secondary);font-weight:700">';
  h += '<td style="padding:8px 12px;position:sticky;left:0;background:var(--bg-secondary);border-right:1px solid var(--border)">Итого</td>';
  cols.forEach(function(c) { h += '<td style="padding:8px 10px;text-align:right;border-right:1px solid var(--border)">' + _cubeFmtV(colTotals[c.key]) + '</td>'; });
  h += '<td style="padding:8px 10px;text-align:right;font-size:14px;color:var(--accent)">' + _cubeFmtV(grand) + '</td></tr>';
  h += '</tbody></table></div>';
  wrap.innerHTML = h;
}

// ── Drill-down ──────────────────────────────────────────────────────────────
async function _cubeCellClick(rk, ck) {
  var data = _cubeLastData;
  if (!data) return;
  var cell = (data.cells[rk] || {})[ck];
  if (!cell) return;

  var drill = document.getElementById('cubeDrill');
  if (!drill) return;
  drill.style.width = '320px';
  drill.innerHTML =
    '<div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)">' +
      '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px">' +
      escapeHtml(_cubeShort(rk,20)) + ' \xd7 ' + escapeHtml(_cubeShort(ck,20)) + '</div>' +
      '<button onclick="_cubeCloseDrill()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-muted)">&times;</button>' +
    '</div>' +
    '<div id="cubeDrillBody" style="overflow-y:auto;height:calc(100% - 43px)">' +
      '<div style="padding:24px;text-align:center"><div class="spinner-ring" style="margin:0 auto"></div></div>' +
    '</div>';

  try {
    var cIds = (cell.contractIds  || []).join(',');
    var eIds = (cell.equipmentIds || []).join(',');
    var qs   = [];
    if (cIds) qs.push('contractIds='  + encodeURIComponent(cIds));
    if (eIds) qs.push('equipmentIds=' + encodeURIComponent(eIds));
    var entities = await api('/cube/drilldown?' + qs.join('&'));
    _cubeDrillRender(entities);
  } catch(e) {
    var body = document.getElementById('cubeDrillBody');
    if (body) body.innerHTML = '<div style="padding:12px;color:var(--red)">Ошибка загрузки</div>';
  }
}

function _cubeDrillRender(entities) {
  var body = document.getElementById('cubeDrillBody');
  if (!body) return;
  if (!entities.length) { body.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:13px">Нет данных</div>'; return; }
  var h = '<div style="font-size:11px;color:var(--text-secondary);padding:8px 14px;border-bottom:1px solid var(--border)">' + entities.length + '\u00a0записей</div>';
  entities.forEach(function(e) {
    var sub = '';
    if (e.type_name === 'contract') {
      sub = [e.contract_type, e.contractor_name, e.contract_amount ? _fmtNum(parseFloat(e.contract_amount)) + '\u00a0\u20bd' : null].filter(Boolean).join('\u00a0\xb7\u00a0');
    } else if (e.type_name === 'equipment') {
      sub = [e.equipment_status, e.equipment_category].filter(Boolean).join('\u00a0\xb7\u00a0');
    }
    h += '<div class="cube-di" data-eid="' + e.id + '" onclick="showEntity(+this.dataset.eid)">' +
         '<div style="font-size:13px;font-weight:500">' + escapeHtml(e.name || '\u2014') + '</div>' +
         (sub ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">' + escapeHtml(sub) + '</div>' : '') +
         '</div>';
  });
  body.innerHTML = h;
}

function _cubeCloseDrill() {
  var d = document.getElementById('cubeDrill');
  if (d) { d.style.width = '0'; d.innerHTML = ''; }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function _cubeDimLabel(id) {
  if (!id) return '';
  for (var i = 0; i < CUBE_DIM_GROUPS.length; i++) {
    var g = CUBE_DIM_GROUPS[i];
    for (var j = 0; j < g.dims.length; j++) {
      if (g.dims[j].id === id) return g.label + ': ' + g.dims[j].label;
    }
  }
  return id;
}

function _cubeVal(cell) {
  return _cubeMeasure === 'sum' ? (cell.sum || 0) : (cell.count || 0);
}

function _cubeCellDisp(cell) {
  if (_cubeMeasure === 'list') {
    var names = cell.names || [];
    var extra = (cell.count || 0) - names.length;
    var t = names.slice(0, 3).join(', ');
    if (extra > 0) t += ' +' + extra;
    return t || String(cell.count || 0);
  }
  if (_cubeMeasure === 'sum') return _fmtNum(cell.sum || 0) + '\u00a0\u20bd';
  return String(cell.count || 0);
}

function _cubeFmtV(v) {
  if (!v) return '<span style="color:var(--text-muted)">\u2014</span>';
  return _cubeMeasure === 'sum' ? _fmtNum(v) + '\u00a0\u20bd' : String(v);
}

function _cubeShort(s, n) {
  s = String(s || '');
  return s.length > n ? s.substring(0, n) + '\u2026' : s;
}
`;
