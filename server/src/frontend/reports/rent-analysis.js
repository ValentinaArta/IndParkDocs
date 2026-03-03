module.exports = `

var _rentAllRows = [];
var _rentFilters = {};          // { field: Set<string> | null }  null = all selected
var _rentGroupBy = [];          // array of field keys shown as filter-headers
var _rentGroupByValues = {};    // { field: string } — selected value per filter-header
var _rentSortField = null;
var _rentSortAsc = true;
var _rentColWidths = {}; // col.key -> px width (user-resized)
var _rentRateMode = 'rent_rate'; // 'rent_rate' or 'net_rate' — base for monthly_amount calc
var _rentVisibleCols = null; // Set<key>; null means "not yet initialized" → init on first build

var RENT_COLS = [
  { key: 'contract_name',    label: '№ договора',   w: 180, link: true },
  { key: 'contract_date',    label: 'Дата',                                   w: 90,  fmt: 'date' },
  { key: 'our_legal_entity', label: 'Арендодатель',                             w: 160 },
  { key: 'contractor_name',  label: 'Арендатор',     w: 160 },
  { key: 'subtenant_name',   label: 'Субарендатор',                             w: 130 },
  { key: 'object_type',      label: 'Тип',                                         w: 110 },
  { key: 'building',         label: 'Корпус',                       w: 80  },
  { key: 'area',             label: 'Площадь, м²',     w: 80,  fmt: 'num1' },
  { key: 'rent_rate',        label: 'Ставка, ₽/м²/мес',                           w: 100, fmt: 'num0' },
  { key: 'net_rate',         label: 'Ставка чистая, ₽/м²/мес', w: 120, fmt: 'num0' },
  { key: 'utility_rate',     label: 'КУ в платеже/ставке',  w: 130 },
  { key: 'external_rental',  label: 'Аренда внешняя',                      w: 100, fmt: 'bool' },
  { key: 'rent_payment',     label: 'Арендный платеж, ₽/мес', w: 130, fmt: 'num0' },
  { key: 'net_payment',      label: 'Чистый ар. платеж, ₽/мес', w: 140, fmt: 'num0' },
  { key: 'contract_end_date',label: 'Срок до',                      w: 90,  fmt: 'date' },
  { key: 'comment',          label: 'Примечание',                                         w: 180 },
];
var RENT_GROUP_FIELDS = [
  { key: 'our_legal_entity', label: 'Арендодатель' },
  { key: 'contractor_name',  label: 'Арендатор' },
  { key: 'building',         label: 'Корпус' },
  { key: 'object_type',      label: 'Тип помещения' },
  { key: 'contract_type',    label: 'Тип договора' },
  { key: 'external_rental',  label: 'Аренда внешняя' },
];

async function buildRentAnalysis() {
  var resultsEl = document.getElementById('rentResults');
  resultsEl.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Загрузка...</div>';
  try {
    _rentAllRows = await api('/reports/rent-analysis');
    if (!_rentVisibleCols) {
      _rentVisibleCols = new Set(RENT_COLS.map(function(c) { return c.key; }));
    }
    _rentFilters = {};
    _rentGroupBy = [];
    _rentGroupByValues = {};
    _renderRentColCheckboxes();
    _renderRentGroupZone();
    _renderRentGroupFieldBtns();
    _rentRender();
  } catch(err) {
    resultsEl.innerHTML = '<div style="color:red;padding:16px">Ошибка: ' + escapeHtml(err.message || String(err)) + '</div>';
  }
}

function _renderRentColCheckboxes() {
  var el = document.getElementById('rentColCheckboxes');
  if (!el) return;
  var h = '';
  RENT_COLS.forEach(function(col) {
    var checked = !_rentVisibleCols || _rentVisibleCols.has(col.key);
    h += '<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer;white-space:nowrap">';
    h += '<input type="checkbox"' + (checked ? ' checked' : '') + ' onchange="_rentColToggle(&quot;' + col.key + '&quot;,this.checked)"> ';
    h += escapeHtml(col.label) + '</label>';
  });
  el.innerHTML = h;
}

function _toggleRentColPanel() {
  var el = document.getElementById('rentColPanel');
  if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
}

function _rentColToggle(key, checked) {
  if (!_rentVisibleCols) _rentVisibleCols = new Set(RENT_COLS.map(function(c) { return c.key; }));
  if (checked) _rentVisibleCols.add(key); else _rentVisibleCols.delete(key);
  _rentRender();
}

function _rentColSelectAll(checked) {
  if (!_rentVisibleCols) _rentVisibleCols = new Set();
  if (checked) { RENT_COLS.forEach(function(c) { _rentVisibleCols.add(c.key); }); }
  else { _rentVisibleCols.clear(); }
  _renderRentColCheckboxes();
  _rentRender();
}

function _setRentRateMode(mode) {
  _rentRateMode = mode;
  _rentRender();
}

// Compute effective monthly amount for a row based on _rentRateMode
function _rentMonthlyAmount(row) {
  var rate = parseFloat(row[_rentRateMode]) || 0;
  var area = parseFloat(row.area) || 0;
  if (rate === 0 && _rentRateMode === 'net_rate') {
    // fallback to rent_rate if net_rate not set
    rate = parseFloat(row.rent_rate) || 0;
  }
  return area * rate;
}

function _rentGetVisible() {
  return _rentAllRows.filter(function(r) {
    return Object.keys(_rentFilters).every(function(field) {
      var set = _rentFilters[field];
      if (!set || set.size === 0) return true;
      return set.has(String(r[field] || ''));
    });
  });
}

function _rentRender() {
  var visible = _rentGetVisible();
  if (_rentSortField) {
    visible = visible.slice().sort(function(a,b) {
      var va = a[_rentSortField] || '', vb = b[_rentSortField] || '';
      var n = parseFloat(va) - parseFloat(vb);
      if (!isNaN(n)) return _rentSortAsc ? n : -n;
      return _rentSortAsc ? String(va).localeCompare(String(vb), 'ru') : String(vb).localeCompare(String(va), 'ru');
    });
  }
  document.getElementById('rentResults').innerHTML = _buildRentTableHtml(visible);
}

function _fmtRentNum(v, dec) {
  if (!v && v !== 0) return '—';
  var n = parseFloat(v);
  if (isNaN(n) || n === 0) return '—';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function _fmtRentDate(d) { return d ? d.split('-').reverse().join('.') : ''; }

function _rentPayment(row) { return (parseFloat(row.area)||0) * (parseFloat(row.rent_rate)||0); }
function _rentNetPayment(row) { return (parseFloat(row.area)||0) * (parseFloat(row.net_rate)||0); }

function _buildRentTableHtml(rows) {
  var fmtVal = function(col, row) {
    if (col.key === 'rent_payment') { var rp = _rentPayment(row); return rp > 0 ? _fmtRentNum(rp, 0) : '<span style="color:var(--text-muted)">—</span>'; }
    if (col.key === 'net_payment')  { var np = _rentNetPayment(row); return np > 0 ? _fmtRentNum(np, 0) : '<span style="color:var(--text-muted)">—</span>'; }
    var v = row[col.key];
    if (col.fmt === 'date') return _fmtRentDate(v);
    if (col.fmt === 'num0') return v ? _fmtRentNum(v, 0) : '<span style="color:var(--text-muted)">—</span>';
    if (col.fmt === 'num1') return v ? _fmtRentNum(v, 1) : '<span style="color:var(--text-muted)">—</span>';
    if (col.fmt === 'bool') return (v === true || v === 'true') ? '✅ Да' : '<span style="color:var(--text-muted)">Нет</span>';
    if (col.link) {
      var badge = row.from_supplement
        ? '<div style="font-size:10px;color:var(--text-muted);margin-top:1px">📋 ДС: ' + escapeHtml(row.supp_name || '') + (row.supp_date ? ' от ' + _fmtRentDate(row.supp_date) : '') + '</div>'
        : '';
      return '<a href="#" onclick="showEntity(' + row.contract_id + ');return false" style="color:var(--accent)">' + escapeHtml(v || '') + '</a>' + badge;
    }
    return escapeHtml(v || '');
  };

  // Summary
  var totalArea = rows.reduce(function(s,r){ return s + (parseFloat(r.area)||0); }, 0);
  var totalRentPay = rows.reduce(function(s,r){ return s + _rentPayment(r); }, 0);
  var totalNetPay  = rows.reduce(function(s,r){ return s + _rentNetPayment(r); }, 0);

  var h = '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">';
  h += '<div class="stat-card"><div class="stat-label">Строк</div><div class="stat-value">' + rows.length + '</div></div>';
  h += '<div class="stat-card"><div class="stat-label">Площадь, м²</div><div class="stat-value">' + _fmtRentNum(totalArea, 1) + '</div></div>';
  h += '<div class="stat-card"><div class="stat-label">Арендный платеж/мес, ₽</div><div class="stat-value">' + _fmtRentNum(totalRentPay, 0) + '</div></div>';
  h += '<div class="stat-card"><div class="stat-label">Чистый платеж/мес, ₽</div><div class="stat-value">' + _fmtRentNum(totalNetPay, 0) + '</div></div>';
  h += '</div>';

  // Таблица всегда плоская; группировка работает как фильтры через rentGroupZone
  h += _buildFlatRentTable(rows, fmtVal);
  return h;
}

function _buildFlatRentTable(rows, fmtVal) {
  var visCols = RENT_COLS.filter(function(c) { return !_rentVisibleCols || _rentVisibleCols.has(c.key); });
  var totalW = 36 + visCols.reduce(function(s,c){ return s + (_rentColWidths[c.key] || c.w); }, 0);
  var h = '<div style="overflow-x:auto">';
  h += '<table style="border-collapse:collapse;font-size:12px;table-layout:fixed;width:' + totalW + 'px">';
  h += '<thead><tr>';
  h += '<th class="rent-th" style="min-width:36px;width:36px">#</th>';
  visCols.forEach(function(col) {
    var isFiltered = _rentFilters[col.key] && _rentFilters[col.key].size > 0;
    var sortIcon = _rentSortField === col.key ? (_rentSortAsc ? ' ↑' : ' ↓') : '';
    var w = (_rentColWidths[col.key] || col.w);
    h += '<th class="rent-th" style="width:' + w + 'px;min-width:40px;white-space:normal;word-break:break-word">';
    h += '<div class="rent-th-inner" onclick="_rentSort(&quot;' + col.key + '&quot;)" style="white-space:normal;word-break:break-word;align-items:flex-start">';
    h += '<span style="white-space:normal">' + col.label + sortIcon + '</span>';
    h += '<button class="rent-filter-btn' + (isFiltered ? ' active' : '') + '" title="Фильтр" onclick="event.stopPropagation();_rentOpenFilter(event,&quot;' + col.key + '&quot;)">▼</button>';
    h += '</div>';
    h += '<div class="rent-col-resizer" onmousedown="event.stopPropagation();_rentStartResize(event,&quot;' + col.key + '&quot;)"></div>';
    h += '</th>';
  });
  h += '</tr></thead><tbody>';

  rows.forEach(function(row, i) {
    var bg = i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)';
    h += '<tr>';
    h += '<td style="padding:5px 8px;border:1px solid var(--border);background:' + bg + ';color:var(--text-muted);text-align:right">' + (i+1) + '</td>';
    visCols.forEach(function(col) {
      var align = (col.fmt === 'num0' || col.fmt === 'num1') ? 'right' : 'left';
      h += '<td style="padding:5px 8px;border:1px solid var(--border);background:' + bg + ';text-align:' + align + ';max-width:' + col.w + 'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="">';
      h += fmtVal(col, row) + '</td>';
    });
    h += '</tr>';
  });

  // Totals row
  var SUMABLE = { area: 1, rent_payment: 0, net_payment: 0 };
  h += '<tr style="background:var(--bg-secondary);font-weight:700">';
  h += '<td style="padding:5px 8px;border:1px solid var(--border)">Итого (' + rows.length + ' строк)</td>';
  visCols.forEach(function(col) {
    h += '<td style="padding:5px 8px;border:1px solid var(--border);text-align:right">';
    if (col.key === 'rent_payment') {
      var tot1 = rows.reduce(function(s,r){ return s + _rentPayment(r); }, 0);
      h += tot1 > 0 ? _fmtRentNum(tot1, 0) : '';
    } else if (col.key === 'net_payment') {
      var tot2 = rows.reduce(function(s,r){ return s + _rentNetPayment(r); }, 0);
      h += tot2 > 0 ? _fmtRentNum(tot2, 0) : '';
    } else if (col.key === 'area') {
      var tot3 = rows.reduce(function(s,r){ return s + (parseFloat(r.area)||0); }, 0);
      h += tot3 > 0 ? _fmtRentNum(tot3, 1) : '';
    }
    h += '</td>';
  });
  h += '</tr>';

  h += '</tbody></table></div>';
  return h;
}

function _buildGroupedRentTable(rows) {
  // Group rows hierarchically by _rentGroupBy fields
  function groupRows(arr, fields, depth) {
    if (fields.length === 0) return null;
    var field = fields[0];
    var rest = fields.slice(1);
    var groups = {};
    var order = [];
    arr.forEach(function(r) {
      var v = String(r[field] || '—');
      if (!groups[v]) { groups[v] = []; order.push(v); }
      groups[v].push(r);
    });
    return order.map(function(v) {
      return { field: field, value: v, rows: groups[v], children: rest.length > 0 ? groupRows(groups[v], rest, depth+1) : null };
    });
  }

  var grouped = groupRows(rows, _rentGroupBy, 0);
  var fieldLabels = {};
  RENT_GROUP_FIELDS.forEach(function(f) { fieldLabels[f.key] = f.label; });
  RENT_COLS.forEach(function(c) { fieldLabels[c.key] = c.label; });

  var GC = [
    { key: 'gc0', label: 'Договор', w: 220 },
    { key: 'gc1', label: 'Арендатор', w: 170 },
    { key: 'gc2', label: 'Тип / Корпус', w: 160 },
    { key: 'gc3', label: 'Площадь и ставка', w: 170 },
  ];
  var gcTotalW = GC.reduce(function(s,c){ return s + (_rentColWidths[c.key] || c.w); }, 0);
  var h = '<div style="overflow-x:auto">';
  h += '<table style="border-collapse:collapse;font-size:12px;table-layout:fixed;width:' + gcTotalW + 'px">';
  // Resizable header
  h += '<thead><tr>';
  GC.forEach(function(col) {
    var w = _rentColWidths[col.key] || col.w;
    h += '<th class="rent-th" style="width:' + w + 'px;min-width:40px">';
    h += '<span>' + col.label + '</span>';
    h += '<div class="rent-col-resizer" onmousedown="event.stopPropagation();_rentStartResize(event,&quot;' + col.key + '&quot;)"></div>';
    h += '</th>';
  });
  h += '</tr></thead><tbody>';

  function renderGroup(g, depth) {
    var area = g.rows.reduce(function(s,r){return s+(parseFloat(r.area)||0);}, 0);
    var mon = g.rows.reduce(function(s,r){return s+_rentPayment(r);}, 0);
    var indent = depth * 20;
    h += '<tr style="background:var(--bg-secondary)">';
    h += '<td colspan="4" style="padding:6px 10px 6px ' + (10+indent) + 'px;border:1px solid var(--border);font-weight:600">';
    h += '<span style="color:var(--text-muted);font-size:11px">' + escapeHtml(fieldLabels[g.field] || g.field) + ': </span>';
    h += escapeHtml(g.value);
    h += ' <span style="font-size:11px;color:var(--text-muted)">(' + g.rows.length + ' стр.</span>';
    h += ', пл. ' + _fmtRentNum(area, 1) + ' м²';
    h += ', ' + _fmtRentNum(mon, 0) + ' ₽/мес)';
    h += '</td></tr>';
    if (g.children) {
      g.children.forEach(function(child) { renderGroup(child, depth+1); });
    } else {
      g.rows.forEach(function(row, i) {
        var bg = i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-hover)';
        h += '<tr>';
        h += '<td style="padding:4px 8px 4px ' + (10+indent+20) + 'px;border:1px solid var(--border);background:' + bg + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">';
        h += '<a href="#" onclick="showEntity(' + row.contract_id + ');return false" style="color:var(--accent)">' + escapeHtml(row.contract_name || '') + '</a>';
        if (row.contract_date) h += ' <span style="color:var(--text-muted)">(' + _fmtRentDate(row.contract_date) + ')</span>';
        if (row.from_supplement) h += '<div style="font-size:10px;color:var(--text-muted);margin-top:1px">📋 ДС: ' + escapeHtml(row.supp_name || '') + (row.supp_date ? ' от ' + _fmtRentDate(row.supp_date) : '') + '</div>';
        h += '</td>';
        h += '<td style="padding:4px 8px;border:1px solid var(--border);background:' + bg + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(row.contractor_name || '') + '</td>';
        h += '<td style="padding:4px 8px;border:1px solid var(--border);background:' + bg + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(row.object_type || '') + ' / ' + escapeHtml(row.building || '') + '</td>';
        h += '<td style="padding:4px 8px;border:1px solid var(--border);background:' + bg + ';text-align:right;white-space:nowrap">';
        h += _fmtRentNum(row.area, 1) + ' м² &middot; ' + _fmtRentNum(row.rent_rate||0, 0) + ' = ' + _fmtRentNum(_rentPayment(row), 0) + ' ₽/мес';
        h += '</td></tr>';
      });
    }
  }

  grouped.forEach(function(g) { renderGroup(g, 0); });
  h += '</tbody></table></div>';
  return h;
}

function _rentSort(field) {
  if (_rentSortField === field) { _rentSortAsc = !_rentSortAsc; }
  else { _rentSortField = field; _rentSortAsc = true; }
  _rentRender();
}

function _rentStartResize(e, key) {
  e.preventDefault();
  var th = e.currentTarget.parentNode;
  var startX = e.clientX;
  var startW = th.offsetWidth;
  var handle = e.currentTarget;
  handle.classList.add('resizing');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  function onMove(e2) {
    var w = Math.max(40, startW + e2.clientX - startX);
    _rentColWidths[key] = w;
    th.style.width = w + 'px';
    th.style.minWidth = w + 'px';
  }
  function onUp() {
    handle.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

var _rentFilterOpen = null;
function _rentOpenFilter(event, field) {
  // Close existing dropdown if any
  var existing = document.getElementById('rentFilterDrop');
  if (existing) { existing.parentNode.removeChild(existing); _rentFilterOpen = null; }
  if (_rentFilterOpen === field) { _rentFilterOpen = null; return; }
  _rentFilterOpen = field;

  var uniqueVals = [];
  var seen = {};
  _rentAllRows.forEach(function(r) {
    var v = String(r[field] || '');
    if (!seen[v]) { seen[v] = true; uniqueVals.push(v); }
  });
  uniqueVals.sort(function(a,b) { return a.localeCompare(b, 'ru'); });

  var active = _rentFilters[field] || null;
  var d = document.createElement('div');
  d.id = 'rentFilterDrop';
  d.className = 'rent-filter-dropdown';
  d.onclick = function(e) { e.stopPropagation(); };

  var allChecked = !active || active.size === 0;
  // Build HTML with search input + "Only this" buttons
  var labelsHtml = uniqueVals.map(function(v) {
    var chk = allChecked || (active && active.has(v));
    var display = escapeHtml(v || '(пусто)');
    return '<div class="rf-row" data-val="' + escapeHtml(v) + '" style="display:flex;align-items:center;gap:0">' +
      '<label style="flex:1;display:flex;align-items:center;gap:6px;padding:3px 10px;cursor:pointer;font-size:12px;overflow:hidden">' +
      '<input type="checkbox" class="rfVal" value="' + escapeHtml(v) + '" ' + (chk ? 'checked' : '') + '>' +
      '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(v) + '">' + display + '</span></label>' +
      '<button onclick="_rentFilterOnly(&quot;' + escapeHtml(v) + '&quot;,&quot;' + field + '&quot;)" title="Только это" style="background:none;border:none;cursor:pointer;padding:2px 8px 2px 2px;font-size:10px;color:var(--text-muted);flex-shrink:0;white-space:nowrap">' +
      'только</button></div>';
  }).join('');

  d.innerHTML =
    '<div style="padding:4px 8px 4px">' +
    '<input class="rent-filter-search" id="rfSearch" placeholder="Поиск..." autocomplete="off">' +
    '</div>' +
    '<div style="padding:0 10px 4px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px">' +
    '<label style="font-weight:600;font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;flex:1">' +
    '<input type="checkbox" id="rfAll" ' + (allChecked ? 'checked' : '') + '> Все</label>' +
    '<button onclick="_rentFilterNone(&quot;' + field + '&quot;)" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--text-muted);white-space:nowrap">Снять всё</button>' +
    '</div>' +
    '<div id="rfList" style="max-height:220px;overflow-y:auto">' + labelsHtml + '</div>' +
    '<div style="padding:6px 10px;border-top:1px solid var(--border);margin-top:2px;display:flex;gap:6px">' +
    '<button class="btn btn-primary btn-sm" onclick="_rentApplyFilter(&quot;' + field + '&quot;)">OK</button>' +
    '<button class="btn btn-sm" onclick="_rentClearFilter(&quot;' + field + '&quot;)">Сброс</button></div>';

  d.querySelector('#rfAll').addEventListener('change', function() {
    var checked = this.checked;
    d.querySelectorAll('.rfVal').forEach(function(cb) { cb.checked = checked; });
  });

  // Search handler — show/hide rows
  d.querySelector('#rfSearch').addEventListener('input', function() {
    var q = this.value.toLowerCase();
    d.querySelectorAll('.rf-row').forEach(function(row) {
      var val = row.getAttribute('data-val').toLowerCase();
      row.style.display = (q === '' || val.indexOf(q) >= 0) ? '' : 'none';
    });
  });

  // Position fixed relative to button, attached to body so it escapes table overflow
  var rect = event.currentTarget.getBoundingClientRect();
  d.style.position = 'fixed';
  d.style.top = (rect.bottom + 4) + 'px';
  var left = rect.left;
  // Adjust if would overflow right edge
  document.body.appendChild(d);
  var dropW = d.offsetWidth || 240;
  if (left + dropW > window.innerWidth - 8) left = Math.max(8, window.innerWidth - dropW - 8);
  d.style.left = left + 'px';

  setTimeout(function() { var s = d.querySelector('#rfSearch'); if (s) s.focus(); }, 50);

  // Close on outside click
  setTimeout(function() {
    document.addEventListener('click', function handler() {
      if (document.getElementById('rentFilterDrop')) {
        document.getElementById('rentFilterDrop').remove();
      }
      _rentFilterOpen = null;
      document.removeEventListener('click', handler);
    });
  }, 0);
}

function _rentApplyFilter(field) {
  var d = document.getElementById('rentFilterDrop');
  if (!d) return;
  var allCb = d.querySelector('#rfAll');
  if (allCb && allCb.checked) {
    delete _rentFilters[field];
  } else {
    var checked = Array.from(d.querySelectorAll('.rfVal:checked')).map(function(cb) { return cb.value; });
    if (checked.length === 0) { delete _rentFilters[field]; }
    else { _rentFilters[field] = new Set(checked); }
  }
  d.remove();
  _rentFilterOpen = null;
  _rentRender();
}

function _rentClearFilter(field) {
  delete _rentFilters[field];
  var d = document.getElementById('rentFilterDrop');
  if (d) d.remove();
  _rentFilterOpen = null;
  _rentRender();
}

// Quick: uncheck everything and check only this value
function _rentFilterOnly(val, field) {
  var d = document.getElementById('rentFilterDrop');
  if (!d) return;
  d.querySelectorAll('.rfVal').forEach(function(cb) { cb.checked = cb.value === val; });
  var allCb = d.querySelector('#rfAll');
  if (allCb) allCb.checked = false;
}

// Quick: uncheck all
function _rentFilterNone(field) {
  var d = document.getElementById('rentFilterDrop');
  if (!d) return;
  d.querySelectorAll('.rfVal').forEach(function(cb) { cb.checked = false; });
  var allCb = d.querySelector('#rfAll');
  if (allCb) allCb.checked = false;
}

function _renderRentGroupZone() {
  var zone = document.getElementById('rentGroupZone');
  if (!zone) return;
  if (_rentGroupBy.length === 0) {
    zone.innerHTML = '<span style="color:var(--text-muted);font-size:12px">Добавьте поля для фильтрации ниже</span>';
    return;
  }
  var labels = {};
  RENT_GROUP_FIELDS.forEach(function(f) { labels[f.key] = f.label; });

  zone.innerHTML = _rentGroupBy.map(function(field) {
    // Collect unique values for this field from all data rows
    var seen = {};
    var uniqueVals = [];
    _rentAllRows.forEach(function(r) {
      var v = String(r[field] || '');
      if (!seen[v]) { seen[v] = true; uniqueVals.push(v); }
    });
    uniqueVals.sort(function(a, b) { return a.localeCompare(b, 'ru'); });
    var activeVal = _rentGroupByValues[field] || '';

    var opts = '<option value="">— Все —</option>';
    uniqueVals.forEach(function(v) {
      opts += '<option value="' + escapeHtml(v) + '"' + (activeVal === v ? ' selected' : '') + '>' + escapeHtml(v || '(пусто)') + '</option>';
    });

    return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0">' +
      '<span style="font-size:12px;font-weight:600;color:var(--text-secondary);min-width:130px">' + escapeHtml(labels[field] || field) + ':</span>' +
      '<select style="font-size:12px;padding:3px 6px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary)" ' +
        'onchange="_rentGroupByValueChange(&quot;' + field + '&quot;, this.value)">' + opts + '</select>' +
      '<button class="btn btn-sm" onclick="_rentRemoveGroup(&quot;' + field + '&quot;)" style="padding:2px 7px;font-size:11px;line-height:1">&times;</button>' +
      '</div>';
  }).join('');
}

// Вызывается при изменении значения фильтра-заголовка
function _rentGroupByValueChange(field, value) {
  if (value === '') {
    delete _rentGroupByValues[field];
    delete _rentFilters[field];
  } else {
    _rentGroupByValues[field] = value;
    _rentFilters[field] = new Set([value]);
  }
  _rentRender();
}

function _renderRentGroupFieldBtns() {
  var el = document.getElementById('rentGroupFieldBtns');
  if (!el) return;
  el.innerHTML = RENT_GROUP_FIELDS.map(function(f) {
    var active = _rentGroupBy.indexOf(f.key) >= 0;
    return '<button class="btn btn-sm rent-field-btn' + (active ? ' btn-primary' : '') + '" onclick="_rentToggleGroup(&quot;' + f.key + '&quot;)">' +
      (active ? '✓ ' : '+ ') + escapeHtml(f.label) + '</button>';
  }).join('');
}

function _rentToggleGroup(field) {
  if (_rentGroupBy.indexOf(field) >= 0) { _rentRemoveGroup(field); }
  else { _rentGroupBy.push(field); _renderRentGroupZone(); _renderRentGroupFieldBtns(); _rentRender(); }
}

function _rentRemoveGroup(field) {
  _rentGroupBy = _rentGroupBy.filter(function(k) { return k !== field; });
  // Clear the filter for this field when removing the header
  delete _rentGroupByValues[field];
  delete _rentFilters[field];
  _renderRentGroupZone();
  _renderRentGroupFieldBtns();
  _rentRender();
}

// ============ WORK HISTORY REPORT ============

`;
