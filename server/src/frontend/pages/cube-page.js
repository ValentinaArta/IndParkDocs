/* eslint-disable */
module.exports = `
// === CUBE PAGE ===

var CUBE_SEP = '|||';

var CUBE_DIM_GROUPS = [
  { id: 'contract', label: 'Договор', icon: '📄',
    color: { accent: '#3b82f6', bg: 'rgba(59,130,246,0.13)' },
    dims: [
    { id: 'contract_type',  label: 'Тип договора' },
    { id: 'our_company',    label: 'Наша организация' },
    { id: 'doc_status',     label: 'Статус документа' },
    { id: 'period_month',   label: 'Период (месяц)' },
    { id: 'period_quarter', label: 'Период (квартал)' },
    { id: 'period_year',    label: 'Период (год)' },
  ]},
  { id: 'contractor', label: 'Контрагент', icon: '🏛',
    color: { accent: '#8b5cf6', bg: 'rgba(139,92,246,0.13)' },
    dims: [
    { id: 'contractor_name', label: 'Название' },
  ]},
  { id: 'building', label: 'Корпус', icon: '🏢',
    color: { accent: '#f97316', bg: 'rgba(249,115,22,0.13)' },
    dims: [
    { id: 'building_name', label: 'Название' },
  ]},
  { id: 'equipment', label: 'Оборудование', icon: '🔧',
    color: { accent: '#10b981', bg: 'rgba(16,185,129,0.13)' },
    dims: [
    { id: 'equipment_status',   label: 'Статус' },
    { id: 'equipment_category', label: 'Категория' },
    { id: 'equipment_kind',     label: 'Вид' },
    { id: 'equipment_name',     label: 'Название' },
  ]},
  { id: 'act', label: 'Работы (акты)', icon: '🔨',
    color: { accent: '#ef4444', bg: 'rgba(239,68,68,0.13)' },
    dims: [
    { id: 'act_period_month',  label: 'Период (месяц)' },
    { id: 'act_period_year',   label: 'Период (год)' },
    { id: 'act_building',      label: 'Корпус' },
    { id: 'act_eq_category',   label: 'Категория оборудования' },
    { id: 'act_eq_name',       label: 'Оборудование' },
    { id: 'act_doc_status',    label: 'Статус акта' },
  ]},
];

// ── State ──────────────────────────────────────────────────────────────────
var _cubeRowDims    = [];   // ordered array of dim ids
var _cubeColDims    = [];
var _cubeMeasure    = 'count';
var _cubeLastData   = null;
var _cubeFilters    = {};
var _cubeHideEmpty  = false;
var _cubeFilterMeta = null;
var _cubeDraggedId  = null;

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
  _cubeRenderDzBar();
  _cubeLoadFilters();
  _cubeRenderCtrl();
  if (_cubeLastData) _cubeRenderTable(_cubeLastData);
}

// ── Layout ────────────────────────────────────────────────────────────────
function _cubeLayout() {
  return '<style>' +
    '.cube-di{padding:8px 14px;cursor:pointer;border-bottom:1px solid var(--border)}.cube-di:hover{background:var(--bg-hover)}' +
    '.cube-chip{padding:3px 10px;border-radius:11px;font-size:12px;cursor:pointer;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text);transition:all .15s;white-space:nowrap}.cube-chip.on{border-color:var(--accent);background:var(--accent);color:#fff}' +
    '.cube-pill-pool{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;font-size:12px;background:var(--bg-secondary);color:var(--text);cursor:grab;user-select:none;white-space:nowrap;border:1px solid var(--border);transition:all .15s}.cube-pill-pool:hover{border-color:var(--accent);color:var(--accent)}.cube-pill-pool.used{border-color:var(--accent);background:var(--accent);color:#fff}' +
    '.cube-pill-dz{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;font-size:12px;background:var(--accent);color:#fff;user-select:none;white-space:nowrap;cursor:grab}' +
    '.cube-dz{flex:1;min-width:200px;max-width:400px;min-height:60px;border:2px dashed var(--border);border-radius:10px;padding:8px 12px;display:flex;flex-direction:column;gap:6px;transition:border-color .15s,background .15s}.cube-dz.over{border-color:var(--accent)!important;background:rgba(99,143,255,.07)}' +
    '.cube-dz-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--text-secondary)}' +
    '.cube-dz-pills{display:flex;flex-wrap:wrap;gap:4px;align-items:center}' +
    '.cube-dz-empty{font-size:12px;color:var(--text-muted);font-style:italic}' +
    '.cube-grp-row td{background:var(--bg-sidebar)!important;color:var(--sidebar-text,#fff)!important;font-weight:700;font-size:12px;letter-spacing:.03em}' +
    '</style>' +
    '<div id="cubeWrap" style="display:flex;flex-direction:column;height:100%;overflow:hidden">' +
    '<div id="cubeDimPool"    style="padding:12px 16px 10px;background:var(--bg-card);border-bottom:1px solid var(--border);flex-shrink:0"></div>' +
    '<div id="cubeDzBar"      style="display:flex;gap:12px;align-items:stretch;padding:10px 16px;background:var(--bg);border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap"></div>' +
    '<div id="cubeFiltersBar" style="padding:8px 16px;background:var(--bg-card);border-bottom:1px solid var(--border);flex-shrink:0"><span style="font-size:11px;color:var(--text-muted)">Загрузка\u2026</span></div>' +
    '<div id="cubeCtrl"       style="display:flex;align-items:center;gap:10px;padding:8px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap"></div>' +
    '<div style="display:flex;flex:1;overflow:hidden">' +
      '<div id="cubeTableWrap" style="flex:1;overflow:auto;padding:16px"></div>' +
      '<div id="cubeDrill"     style="width:0;overflow:hidden;border-left:1px solid var(--border);transition:width .25s;background:var(--bg-card);flex-shrink:0"></div>' +
    '</div></div>';
}

// ── Pool ───────────────────────────────────────────────────────────────────
function _cubeRenderPool() {
  var el = document.getElementById('cubeDimPool');
  if (!el) return;
  var h = '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">';
  CUBE_DIM_GROUPS.forEach(function(g) {
    var gc = g.color || { accent: 'var(--accent)', bg: 'var(--bg-secondary)' };
    h += '<div><div style="font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-bottom:5px;color:' + gc.accent + '">' + escapeHtml(g.icon + ' ' + g.label) + '</div><div style="display:flex;flex-wrap:wrap;gap:4px">';
    g.dims.forEach(function(d) {
      var rIdx = _cubeRowDims.indexOf(d.id);
      var cIdx = _cubeColDims.indexOf(d.id);
      var used = rIdx >= 0 || cIdx >= 0;
      var badge = rIdx >= 0 ? '\u2195' + (rIdx + 1) : (cIdx >= 0 ? '\u2194' + (cIdx + 1) : '');
      var pillStyle = used
        ? 'background:' + gc.accent + ';color:#fff;border-color:' + gc.accent
        : 'background:' + gc.bg + ';color:' + gc.accent + ';border-color:' + gc.accent + '55';
      h += '<button type="button" draggable="true" data-cube-dim="' + d.id + '" ' +
           'class="cube-pill-pool' + (used ? ' used' : '') + '" ' +
           'style="' + pillStyle + '" ' +
           'onclick="_cubeDimClick(this.dataset.cubeDim)" ' +
           'ondragstart="_cubeDragStart(event,this.dataset.cubeDim)">' +
           escapeHtml(d.label) + (badge ? ' <span style="font-size:10px;opacity:.8">' + badge + '</span>' : '') + '</button>';
    });
    h += '</div></div>';
  });
  h += '<div style="margin-left:auto;align-self:center;font-size:11px;color:var(--text-muted)">\u2190 Перетащи в зону или кликни</div></div>';
  el.innerHTML = h;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function _cubeGroupOf(dimId) {
  for (var gi = 0; gi < CUBE_DIM_GROUPS.length; gi++) {
    var g = CUBE_DIM_GROUPS[gi];
    for (var di = 0; di < g.dims.length; di++) {
      if (g.dims[di].id === dimId) return g;
    }
  }
  return null;
}

// ── Drop zones ─────────────────────────────────────────────────────────────
function _cubeRenderDzBar() {
  var el = document.getElementById('cubeDzBar');
  if (!el) return;

  function renderDz(axis) {
    var dims   = axis === 'row' ? _cubeRowDims : _cubeColDims;
    var icon   = axis === 'row' ? '\u2195' : '\u2194';
    var title  = axis === 'row' ? 'СТРОКИ' : 'КОЛОНКИ';
    var hasBorder = dims.length ? 'border-color:var(--accent)' : '';

    var pillsHtml = '';
    dims.forEach(function(dimId, i) {
      var grp = _cubeGroupOf(dimId);
      var gc  = grp ? grp.color : { accent: 'var(--accent)', bg: 'rgba(99,143,255,0.15)' };
      pillsHtml += '<span class="cube-pill-dz" draggable="true" ' +
        'data-dz-dim="' + dimId + '" data-dz-axis="' + axis + '" data-dz-idx="' + i + '" ' +
        'ondragstart="_cubeDzDragStart(event,this.dataset.dzAxis,+this.dataset.dzIdx)" ' +
        'style="background:' + gc.bg + ';color:' + gc.accent + ';border:1.5px solid ' + gc.accent + '">' +
        '<span style="opacity:.7;font-size:9px">' + (i + 1) + '</span> ' +
        escapeHtml(_cubeDimShortLabel(dimId)) +
        '<button type="button" data-rm-axis="' + axis + '" data-rm-dim="' + dimId + '" ' +
        'onclick="event.stopPropagation();_cubeRemoveDim(this.dataset.rmAxis,this.dataset.rmDim)" ' +
        'style="background:none;border:none;color:' + gc.accent + ';opacity:.8;cursor:pointer;font-size:14px;padding:0 0 0 3px;line-height:1">\xd7</button></span>';
    });

    var inner = dims.length
      ? '<div class="cube-dz-pills">' + pillsHtml + '</div>'
      : '<div class="cube-dz-empty">' + icon + ' Перетащи поле\u2026</div>';

    return '<div class="cube-dz" style="' + hasBorder + '" data-cube-axis="' + axis + '"' +
           ' ondragover="_cubeDragOver(event)"' +
           ' ondragleave="_cubeDragLeave(event)"' +
           ' ondrop="_cubeDrop(event,this.dataset.cubeAxis)">' +
           '<div class="cube-dz-label">' + icon + ' ' + title + '</div>' +
           inner + '</div>';
  }

  el.innerHTML = renderDz('row') + renderDz('col');
}

// ── Drag: from pool ────────────────────────────────────────────────────────
function _cubeDragStart(event, dimId) {
  _cubeDraggedId = dimId;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', 'pool:' + dimId);
}

// ── Drag: from within a zone (reorder) ────────────────────────────────────
function _cubeDzDragStart(event, axis, idx) {
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', 'zone:' + axis + ':' + idx);
  event.stopPropagation();
}

function _cubeDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  event.currentTarget.classList.add('over');
}

function _cubeDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget))
    event.currentTarget.classList.remove('over');
}

function _cubeDrop(event, axis) {
  event.preventDefault();
  event.currentTarget.classList.remove('over');
  var raw = event.dataTransfer.getData('text/plain') || '';

  if (raw.startsWith('pool:')) {
    var dimId = raw.slice(5) || _cubeDraggedId;
    _cubeDraggedId = null;
    if (!dimId) return;
    _cubeAssignDim(axis, dimId);
  } else if (raw.startsWith('zone:')) {
    var parts  = raw.split(':');
    var fromAxis = parts[1], fromIdx = parseInt(parts[2], 10);
    var fromArr  = fromAxis === 'row' ? _cubeRowDims : _cubeColDims;
    var dimId    = fromArr[fromIdx];
    if (dimId === undefined) return;
    // Remove from source
    fromArr.splice(fromIdx, 1);
    // Add to target
    if (axis !== fromAxis || true) _cubeAssignDim(axis, dimId);
  }

  _cubeRenderPool();
  _cubeRenderDzBar();
  _cubeRenderCtrl();
}

function _cubeAssignDim(axis, dimId) {
  // Remove from both axes first
  _cubeRowDims = _cubeRowDims.filter(function(d) { return d !== dimId; });
  _cubeColDims = _cubeColDims.filter(function(d) { return d !== dimId; });
  if (axis === 'row') _cubeRowDims.push(dimId);
  else                _cubeColDims.push(dimId);
}

function _cubeRemoveDim(axis, dimId) {
  if (axis === 'row') _cubeRowDims = _cubeRowDims.filter(function(d) { return d !== dimId; });
  else                _cubeColDims = _cubeColDims.filter(function(d) { return d !== dimId; });
  _cubeRenderPool();
  _cubeRenderDzBar();
  _cubeRenderCtrl();
}

// ── Click-based (fallback) ─────────────────────────────────────────────────
var _cubeFocusedAxis = 'row';

function _cubeDimClick(id) {
  var inRow = _cubeRowDims.indexOf(id) >= 0;
  var inCol = _cubeColDims.indexOf(id) >= 0;
  if (inRow || inCol) {
    _cubeRemoveDim(inRow ? 'row' : 'col', id);
  } else {
    _cubeAssignDim(_cubeFocusedAxis, id);
    _cubeFocusedAxis = _cubeFocusedAxis === 'row' ? 'col' : 'row';
    _cubeRenderPool();
    _cubeRenderDzBar();
    _cubeRenderCtrl();
  }
}

// ── Filters ────────────────────────────────────────────────────────────────
async function _cubeLoadFilters() {
  if (_cubeFilterMeta) { _cubeRenderFilters(); return; }
  try { _cubeFilterMeta = await api('/cube/filter-values'); _cubeRenderFilters(); }
  catch(e) { var b = document.getElementById('cubeFiltersBar'); if (b) b.innerHTML = ''; }
}

function _cubeRenderFilters() {
  var bar = document.getElementById('cubeFiltersBar');
  if (!bar || !_cubeFilterMeta) return;
  var types = _cubeFilterMeta.contract_types || [], stats = _cubeFilterMeta.doc_statuses || [];
  var selT = _cubeFilters.contract_type || [], selS = _cubeFilters.doc_status || [];
  function chips(items, sel, fk) {
    return items.map(function(v) {
      var on = sel.indexOf(v) >= 0;
      return '<button type="button" class="cube-chip' + (on ? ' on' : '') + '" data-fk="' + fk + '" data-fv="' + escapeHtml(v) + '" onclick="_cubeToggleFilter(this.dataset.fk,this.dataset.fv)">' + escapeHtml(v) + '</button>';
    }).join('');
  }
  var h = '<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">';
  if (types.length) h += '<div><div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Тип договора</div><div style="display:flex;flex-wrap:wrap;gap:4px">' + chips(types, selT, 'contract_type') + '</div></div>';
  if (stats.length) h += '<div><div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Статус</div><div style="display:flex;flex-wrap:wrap;gap:4px">' + chips(stats, selS, 'doc_status') + '</div></div>';
  var n = selT.length + selS.length;
  if (n) h += '<div style="margin-left:auto;align-self:flex-end"><button type="button" onclick="_cubeClearFilters()" style="font-size:11px;color:var(--accent);background:none;border:none;cursor:pointer;text-decoration:underline">Сбросить (' + n + ')</button></div>';
  h += '<div style="' + (n ? '' : 'margin-left:auto;') + 'align-self:center"><label style="font-size:12px;cursor:pointer;display:flex;align-items:center;gap:5px"><input type="checkbox" ' + (_cubeHideEmpty ? 'checked' : '') + ' onchange="_cubeSetHideEmpty(this.checked)" style="cursor:pointer"> Скрыть пустые</label></div>';
  h += '</div>';
  bar.innerHTML = h;
}

function _cubeToggleFilter(key, val) {
  if (!_cubeFilters[key]) _cubeFilters[key] = [];
  var i = _cubeFilters[key].indexOf(val);
  if (i >= 0) _cubeFilters[key].splice(i, 1); else _cubeFilters[key].push(val);
  _cubeRenderFilters();
}
function _cubeClearFilters() { _cubeFilters = {}; _cubeRenderFilters(); }
function _cubeSetHideEmpty(v) { _cubeHideEmpty = !!v; _cubeRenderFilters(); if (_cubeLastData) _cubeRun(); }

// ── Control bar ────────────────────────────────────────────────────────────
function _cubeRenderCtrl() {
  var el = document.getElementById('cubeCtrl');
  if (!el) return;
  var mBtns = [['count','Количество'],['sum','Сумма \u20bd'],['list','Список']].map(function(m) {
    var on = _cubeMeasure === m[0];
    return '<button type="button" data-cube-measure="' + m[0] + '" onclick="_cubeSetMeasure(this.dataset.cubeMeasure)" style="padding:5px 10px;font-size:12px;border-radius:5px;cursor:pointer;border:1px solid ' + (on ? 'var(--accent)' : 'var(--border)') + ';background:' + (on ? 'var(--accent)' : 'var(--bg)') + ';color:' + (on ? 'white' : 'var(--text)') + '">' + escapeHtml(m[1]) + '</button>';
  }).join('');
  var canRun = _cubeRowDims.length > 0 && _cubeColDims.length > 0;
  el.innerHTML = '<span style="font-size:11px;color:var(--text-secondary);white-space:nowrap">Мера:</span><div style="display:flex;gap:4px">' + mBtns + '</div><button type="button" onclick="_cubeRun()" ' + (canRun ? '' : 'disabled ') + 'style="padding:6px 20px;border-radius:6px;border:none;font-size:13px;font-weight:600;margin-left:auto;white-space:nowrap;' + (canRun ? 'cursor:pointer;background:var(--accent);color:white' : 'cursor:not-allowed;background:var(--border);color:var(--text-muted)') + '">\u25b6 Построить</button>';
}

function _cubeSetMeasure(m) { _cubeMeasure = m; _cubeRenderCtrl(); if (_cubeLastData) _cubeRenderTable(_cubeLastData); }

// ── Run ────────────────────────────────────────────────────────────────────
async function _cubeRun() {
  if (!_cubeRowDims.length || !_cubeColDims.length) return;
  var wrap = document.getElementById('cubeTableWrap');
  if (wrap) wrap.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text-muted)"><div class="spinner-ring" style="margin:0 auto 12px"></div>Строю\u2026</div>';
  var drill = document.getElementById('cubeDrill');
  if (drill) { drill.style.width = '0'; drill.innerHTML = ''; }
  var af = {};
  Object.keys(_cubeFilters).forEach(function(k) { if (_cubeFilters[k] && _cubeFilters[k].length) af[k] = _cubeFilters[k]; });
  try {
    var data = await api('/cube/query', { method: 'POST', body: JSON.stringify({ rowDims: _cubeRowDims, colDims: _cubeColDims, filters: af, hideEmpty: _cubeHideEmpty }) });
    _cubeLastData = data;
    _cubeRenderTable(data);
  } catch(e) {
    if (wrap) wrap.innerHTML = '<div style="padding:24px;color:var(--red)">Ошибка: ' + escapeHtml(String(e.message || e)) + '</div>';
  }
}

// ── Hierarchical pivot table ───────────────────────────────────────────────
function _cubeRenderTable(data) {
  var wrap = document.getElementById('cubeTableWrap');
  if (!wrap) return;
  var rows = data.rows || [], cols = data.cols || [], cells = data.cells || {};
  var rowDims = data.rowDims || [], colDims = data.colDims || [];

  if (!rows.length || !cols.length) {
    wrap.innerHTML = '<div style="padding:48px;text-align:center;color:var(--text-muted)">Нет данных</div>'; return;
  }

  var rLabel = rowDims.map(_cubeDimLabel).join(' + ');
  var cLabel = colDims.map(_cubeDimLabel).join(' + ');
  var af = Object.keys(_cubeFilters).filter(function(k){ return _cubeFilters[k] && _cubeFilters[k].length; });
  var fHint = af.length ? ' &nbsp;<span style="color:var(--accent);font-style:italic">фильтр: ' + escapeHtml(af.map(function(k){ return _cubeFilters[k].join(', '); }).join('; ')) + '</span>' : '';

  // ── Grand + row totals
  var rowTotals = {}, colTotals = {}, grand = 0;
  rows.forEach(function(r) {
    var t = 0; cols.forEach(function(c) { var cell = (cells[r.key] || {})[c.key]; if (cell) t += _cubeVal(cell); }); rowTotals[r.key] = t;
  });
  cols.forEach(function(c) {
    var t = 0; rows.forEach(function(r) { var cell = (cells[r.key] || {})[c.key]; if (cell) t += _cubeVal(cell); }); colTotals[c.key] = t; grand += t;
  });

  var h = '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">Строки: <b>' + escapeHtml(rLabel) + '</b> &nbsp;&middot;&nbsp; Колонки: <b>' + escapeHtml(cLabel) + '</b> &nbsp;&middot;&nbsp;' + rows.length + ' стр., ' + cols.length + ' кол.' + fHint + '</div>';
  h += '<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:12px;background:var(--bg-card)">';

  // ── Header (1 or 2 levels for cols)
  var multiCol = colDims.length > 1;
  if (multiCol) {
    // Build col groups by first part
    var colGrps = [];
    cols.forEach(function(c) {
      var fp = c.parts[0];
      if (!colGrps.length || colGrps[colGrps.length-1].key !== fp) colGrps.push({key: fp, count: 1});
      else colGrps[colGrps.length-1].count++;
    });
    // Header row 1 — group cells
    h += '<thead><tr style="background:var(--bg-sidebar)">';
    var rHdrDepth = rowDims.length > 1 ? rowDims.length : 1;
    h += '<th colspan="' + rHdrDepth + '" rowspan="2" style="padding:8px 12px;text-align:left;position:sticky;left:0;background:var(--bg-sidebar);z-index:3;border-right:1px solid rgba(255,255,255,.1);color:var(--sidebar-text,#fff)">'+escapeHtml(_cubeShort(rLabel,20))+' / '+escapeHtml(_cubeShort(cLabel,16))+'</th>';
    colGrps.forEach(function(g) {
      h += '<th colspan="' + g.count + '" style="padding:6px 10px;text-align:center;font-weight:700;border-right:1px solid rgba(255,255,255,.15);border-left:1px solid rgba(255,255,255,.15);color:var(--sidebar-text,#fff)">'+escapeHtml(_cubeShort(g.key,20))+'</th>';
    });
    h += '<th rowspan="2" style="padding:8px 10px;text-align:right;font-weight:700;background:rgba(0,0,0,.2);color:var(--sidebar-text,#fff)">Итого</th></tr>';
    // Header row 2 — sub-items
    h += '<tr style="background:var(--bg-sidebar)">';
    cols.forEach(function(c) {
      h += '<th style="padding:6px 8px;text-align:right;font-weight:500;border-right:1px solid rgba(255,255,255,.1);color:var(--sidebar-text,#fff);white-space:nowrap" title="'+escapeHtml(c.key)+'">'+escapeHtml(_cubeShort(c.parts[1]||c.parts[0],14))+'</th>';
    });
    h += '</tr></thead>';
  } else {
    h += '<thead><tr style="background:var(--bg-sidebar)">';
    var rHdrDepth2 = rowDims.length > 1 ? rowDims.length : 1;
    h += '<th colspan="' + rHdrDepth2 + '" style="padding:8px 12px;text-align:left;position:sticky;left:0;background:var(--bg-sidebar);z-index:2;border-right:1px solid rgba(255,255,255,.1);color:var(--sidebar-text,#fff)">'+escapeHtml(_cubeShort(rLabel,18))+' / '+escapeHtml(_cubeShort(cLabel,14))+'</th>';
    cols.forEach(function(c) {
      h += '<th style="padding:8px 10px;text-align:right;font-weight:500;border-right:1px solid rgba(255,255,255,.1);color:var(--sidebar-text,#fff);max-width:110px" title="'+escapeHtml(c.key)+'">'+escapeHtml(_cubeShort(c.parts[0],16))+'</th>';
    });
    h += '<th style="padding:8px 10px;text-align:right;font-weight:700;background:rgba(0,0,0,.2);color:var(--sidebar-text,#fff)">Итого</th></tr></thead>';
  }

  // ── Body
  h += '<tbody>';
  var multiRow = rowDims.length > 1;
  var ri = 0, prevGrp = null, grpTotal = 0, grpKey = null;

  function dataRow(r, label, indent, bg) {
    var t = rowTotals[r.key] || 0;
    var cells_h = '';
    cols.forEach(function(c) {
      var cell = (cells[r.key] || {})[c.key];
      var val  = cell ? _cubeVal(cell) : 0;
      var has  = val > 0;
      cells_h += '<td style="padding:6px 10px;text-align:right;border-right:1px solid var(--border);background:' + bg + ';' + (has ? 'cursor:pointer' : 'color:var(--text-muted)') + '"' +
        (has ? ' data-rk="'+escapeHtml(r.key)+'" data-ck="'+escapeHtml(c.key)+'" onclick="_cubeCellClick(this.dataset.rk,this.dataset.ck)"' : '') + '>' +
        (has ? '<span style="color:var(--accent)">' + escapeHtml(_cubeCellDisp(cell)) + '</span>' : '\u2014') + '</td>';
    });
    var style = 'padding:7px 12px;font-weight:' + (indent ? '400' : '500') + ';position:sticky;left:0;background:' + bg + ';z-index:1;border-right:1px solid var(--border);max-width:200px;' + (indent ? 'padding-left:24px;' : '');
    return '<tr style="border-top:1px solid var(--border)"><td style="' + style + '" title="' + escapeHtml(label) + '">' + escapeHtml(_cubeShort(label,28)) + '</td>' + cells_h + '<td style="padding:7px 10px;text-align:right;font-weight:600;background:var(--bg-secondary)">' + _cubeFmtV(t) + '</td></tr>';
  }

  if (multiRow) {
    // Group rows by first part
    var grpTotals = {};
    rows.forEach(function(r) {
      var gk = r.parts[0];
      grpTotals[gk] = (grpTotals[gk] || 0) + (rowTotals[r.key] || 0);
    });

    rows.forEach(function(r, i) {
      var gk = r.parts[0];
      var bg = i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)';
      // Group header when group changes
      if (gk !== prevGrp) {
        var gt = _cubeFmtV(grpTotals[gk]);
        h += '<tr class="cube-grp-row"><td colspan="' + (1 + cols.length + 1) + '" style="padding:7px 12px;border-top:2px solid var(--border)">' +
             '\u25b8\u00a0' + escapeHtml(_cubeShort(gk, 50)) +
             '<span style="font-weight:400;opacity:.7;font-size:11px;margin-left:8px">' + gt + '</span></td></tr>';
        prevGrp = gk;
      }
      var subLabel = r.parts.slice(1).join(' / ') || r.parts[0];
      h += dataRow(r, subLabel, true, bg);
    });
  } else {
    rows.forEach(function(r, i) {
      h += dataRow(r, r.parts[0], false, i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)');
    });
  }

  // ── Totals row
  var colSpan = multiRow ? 1 : 1;
  h += '<tr style="border-top:2px solid var(--border);background:var(--bg-secondary);font-weight:700"><td colspan="1" style="padding:8px 12px;position:sticky;left:0;background:var(--bg-secondary);border-right:1px solid var(--border)">Итого</td>';
  cols.forEach(function(c) { h += '<td style="padding:8px 10px;text-align:right;border-right:1px solid var(--border)">' + _cubeFmtV(colTotals[c.key]) + '</td>'; });
  h += '<td style="padding:8px 10px;text-align:right;font-size:14px;color:var(--accent)">' + _cubeFmtV(grand) + '</td></tr>';
  h += '</tbody></table></div>';
  wrap.innerHTML = h;
}

// ── Drill-down ──────────────────────────────────────────────────────────────
async function _cubeCellClick(rk, ck) {
  var data = _cubeLastData; if (!data) return;
  var cell = (data.cells[rk] || {})[ck]; if (!cell) return;
  var drill = document.getElementById('cubeDrill'); if (!drill) return;
  drill.style.width = '320px';
  drill.innerHTML = '<div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border)">' +
    '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px">' + escapeHtml(_cubeShort(rk.replace(new RegExp('\\|\\|\\|','g'),' / '),30)) + ' \xd7 ' + escapeHtml(_cubeShort(ck.replace(new RegExp('\\|\\|\\|','g'),' / '),30)) + '</div>' +
    '<button onclick="_cubeCloseDrill()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text-muted)">&times;</button></div>' +
    '<div id="cubeDrillBody" style="overflow-y:auto;height:calc(100% - 43px)"><div style="padding:24px;text-align:center"><div class="spinner-ring" style="margin:0 auto"></div></div></div>';
  try {
    var isActMode = _cubeLastData && (_cubeLastData.rowDims || []).concat(_cubeLastData.colDims || []).some(function(d) {
      for (var gi = 0; gi < CUBE_DIM_GROUPS.length; gi++) {
        var g = CUBE_DIM_GROUPS[gi]; if (g.id !== 'act') continue;
        for (var di = 0; di < g.dims.length; di++) { if (g.dims[di].id === d) return true; }
      }
      return false;
    });
    if (isActMode) {
      var actIds = (cell.contractIds || []).join(',');
      var eqIds  = (cell.equipmentIds || []).join(',');
      var qs = []; if (actIds) qs.push('actIds='+encodeURIComponent(actIds)); if (eqIds) qs.push('equipmentIds='+encodeURIComponent(eqIds));
      var items = await api('/cube/act-drilldown?' + qs.join('&'));
      _cubeDrillRenderActs(items);
    } else {
      var cIds = (cell.contractIds || []).join(',');
      var eIds = (cell.equipmentIds || []).join(',');
      var qs2 = []; if (cIds) qs2.push('contractIds='+encodeURIComponent(cIds)); if (eIds) qs2.push('equipmentIds='+encodeURIComponent(eIds));
      var entities = await api('/cube/drilldown?' + qs2.join('&'));
      _cubeDrillRender(entities);
    }
  } catch(e) { var b = document.getElementById('cubeDrillBody'); if (b) b.innerHTML = '<div style="padding:12px;color:var(--red)">Ошибка</div>'; }
}

function _cubeDrillRender(entities) {
  var body = document.getElementById('cubeDrillBody'); if (!body) return;
  if (!entities.length) { body.innerHTML = '<div style="padding:16px;color:var(--text-muted)">Нет данных</div>'; return; }
  var h = '<div style="font-size:11px;color:var(--text-secondary);padding:8px 14px;border-bottom:1px solid var(--border)">' + entities.length + '\u00a0записей</div>';
  entities.forEach(function(e) {
    var sub = e.type_name === 'contract' ? [e.contract_type, e.contractor_name, e.contract_amount ? _fmtNum(parseFloat(e.contract_amount))+'\u00a0\u20bd' : null].filter(Boolean).join('\u00a0\xb7\u00a0') : [e.equipment_status, e.equipment_category].filter(Boolean).join('\u00a0\xb7\u00a0');
    h += '<div class="cube-di" data-eid="' + e.id + '" onclick="showEntity(+this.dataset.eid)"><div style="font-size:13px;font-weight:500">' + escapeHtml(e.name || '\u2014') + '</div>' + (sub ? '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">'+escapeHtml(sub)+'</div>' : '') + '</div>';
  });
  body.innerHTML = h;
}

function _cubeDrillRenderActs(items) {
  var body = document.getElementById('cubeDrillBody'); if (!body) return;
  if (!items || !items.length) { body.innerHTML = '<div style="padding:16px;color:var(--text-muted)">Нет данных</div>'; return; }
  var h = '<div style="font-size:11px;color:var(--text-secondary);padding:8px 14px;border-bottom:1px solid var(--border)">' + items.length + '\u00a0работ</div>';
  // Group by act
  var byAct = {};
  var actOrder = [];
  items.forEach(function(it) {
    if (!byAct[it.act_id]) { byAct[it.act_id] = { act_id: it.act_id, act_name: it.act_name, act_date: it.act_date, act_number: it.act_number, doc_status: it.doc_status, contract_name: it.contract_name, contract_id: it.contract_id, items: [] }; actOrder.push(it.act_id); }
    byAct[it.act_id].items.push(it);
  });
  actOrder.forEach(function(aid) {
    var a = byAct[aid];
    var dateStr = a.act_date || '';
    if (dateStr && dateStr.length === 10) { var pts = dateStr.split('-'); dateStr = pts[2] + '.' + pts[1] + '.' + pts[0]; }
    h += '<div style="border-bottom:2px solid var(--border);padding:8px 14px">';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">';
    h += '<a href="#" onclick="showEntity(' + a.act_id + ');_cubeCloseDrill();return false" style="font-size:13px;font-weight:600;color:var(--accent)">Акт №' + escapeHtml(a.act_number || String(a.act_id)) + '</a>';
    h += '<span style="font-size:11px;color:var(--text-muted)">' + escapeHtml(dateStr) + '</span></div>';
    if (a.contract_name) h += '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px">\u2192 ' + escapeHtml(a.contract_name) + '</div>';
    a.items.forEach(function(it) {
      var brokenBadge = it.broken ? ' <span style="background:#fee2e2;color:#dc2626;font-size:10px;font-weight:600;padding:1px 4px;border-radius:3px">\u26a0 Нерабочий</span>' : '';
      var amt = parseFloat(it.item_amount) || 0;
      h += '<div style="background:var(--bg-secondary);border-radius:6px;padding:7px 9px;margin-bottom:5px">';
      h += '<div style="font-size:12px;font-weight:500;margin-bottom:3px">' + escapeHtml(it.equipment_name || '\u2014') + brokenBadge + '</div>';
      if (it.description) h += '<div style="font-size:11px;color:var(--text-secondary);white-space:pre-wrap;line-height:1.5">' + escapeHtml(it.description) + '</div>';
      if (amt > 0) h += '<div style="font-size:11px;font-weight:600;color:var(--accent);margin-top:3px">' + _fmtNum(amt) + '\u00a0\u20bd</div>';
      h += '</div>';
    });
    h += '</div>';
  });
  body.innerHTML = h;
}

function _cubeCloseDrill() { var d = document.getElementById('cubeDrill'); if (d) { d.style.width='0'; d.innerHTML=''; } }

// ── Helpers ────────────────────────────────────────────────────────────────
function _cubeDimLabel(id) {
  if (!id) return '';
  for (var i = 0; i < CUBE_DIM_GROUPS.length; i++) { var g = CUBE_DIM_GROUPS[i]; for (var j = 0; j < g.dims.length; j++) { if (g.dims[j].id === id) return g.label + ': ' + g.dims[j].label; } }
  return id;
}
function _cubeDimShortLabel(id) {
  if (!id) return '';
  for (var i = 0; i < CUBE_DIM_GROUPS.length; i++) { var g = CUBE_DIM_GROUPS[i]; for (var j = 0; j < g.dims.length; j++) { if (g.dims[j].id === id) return g.dims[j].label; } }
  return id;
}
function _cubeVal(cell)      { return _cubeMeasure === 'sum' ? (cell.sum || 0) : (cell.count || 0); }
function _cubeCellDisp(cell) {
  if (_cubeMeasure === 'list') { var names = cell.names || [], extra = (cell.count||0) - names.length; var t = names.slice(0,3).join(', '); if (extra > 0) t += ' +' + extra; return t || String(cell.count||0); }
  return _cubeMeasure === 'sum' ? _fmtNum(cell.sum||0) + '\u00a0\u20bd' : String(cell.count||0);
}
function _cubeFmtV(v) { if (!v) return '<span style="color:var(--text-muted)">\u2014</span>'; return _cubeMeasure === 'sum' ? _fmtNum(v)+'\u00a0\u20bd' : String(v); }
function _cubeShort(s, n) { s = String(s || ''); return s.length > n ? s.substring(0,n)+'\u2026' : s; }
`;
