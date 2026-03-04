/* eslint-disable */
module.exports = `
// === METERS PAGE ===

var _metersData   = [];
var _metersFilter = { type: '', location: '', search: '', status: '', sortBy: 'next_verification_date', sortDir: 'asc' };
var _metersHiddenCols = { mean_time_to_failure: true, service_life: true, warranty_from_sale: true, warranty_from_manufacture: true };

var _METER_COLS = [
  { id: 'name',                   label: 'Наименование',         always: true,  elecOnly: false, sortKey: 'name' },
  { id: 'status',                 label: 'Статус',               always: false, elecOnly: false, sortKey: null },
  { id: 'meter_type',             label: 'Тип',                  always: false, elecOnly: false, sortKey: 'meter_type' },
  { id: 'installation_location',  label: 'Место установки',      always: false, elecOnly: false, sortKey: 'installation_location' },
  { id: 'meter_number',           label: '№ счётчика',           always: false, elecOnly: false, sortKey: null },
  { id: 'type_and_brand',         label: 'Тип и марка',          always: false, elecOnly: false, sortKey: null },
  { id: 'manufacture_date',       label: 'Дата выпуска',         always: false, elecOnly: false, sortKey: null },
  { id: 'tn_tt_ratio',            label: 'Коэфф. тн/тт',        always: false, elecOnly: true,  sortKey: null },
  { id: 'limit_current',          label: 'Огр.ток',              always: false, elecOnly: true,  sortKey: null },
  { id: 'connected_to',           label: 'Подключен к',          always: false, elecOnly: true,  sortKey: null },
  { id: 'mean_time_to_failure',   label: 'Нар.до отказа',        always: false, elecOnly: false, sortKey: null },
  { id: 'service_life',           label: 'Срок службы',          always: false, elecOnly: false, sortKey: null },
  { id: 'warranty_from_sale',     label: 'Гарантия (продажа)',   always: false, elecOnly: false, sortKey: null },
  { id: 'warranty_from_manufacture', label: 'Гарантия (выпуск)', always: false, elecOnly: false, sortKey: null },
  { id: 'verification_interval',  label: 'Интервал (лет)',       always: false, elecOnly: false, sortKey: null },
  { id: 'verification_date',      label: 'Дата поверки',         always: false, elecOnly: false, sortKey: 'verification_date' },
  { id: 'next_verification_date', label: 'След. поверка',        always: false, elecOnly: false, sortKey: 'next_verification_date' },
  { id: 'actions',                label: '',                     always: true,  elecOnly: false, sortKey: null },
];

async function showMetersPage() {
  currentView = 'meters';
  _setNavHash('meters');
  setActive('[onclick*="showMetersPage"]');
  document.getElementById('pageTitle').textContent = 'Счётчики';
  document.getElementById('breadcrumb').textContent = '';
  _renderMetersTopActions();
  document.getElementById('content').innerHTML = '<div style="padding:40px;text-align:center"><div class="spinner-ring" style="margin:0 auto"></div></div>';
  await reloadMeters();
}

function _renderMetersTopActions() {
  var acts = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';

  // Type filter
  acts += '<select id="meterTypeFilter" onchange="applyMetersFilter()" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-secondary);color:var(--text)">';
  acts += '<option value="">Все типы</option>';
  ['Электричество','Вода','Тепло','Газ'].forEach(function(t) {
    acts += '<option value="' + t + '"' + (_metersFilter.type === t ? ' selected' : '') + '>' + t + '</option>';
  });
  acts += '</select>';

  // Status filter
  acts += '<select id="meterStatusFilter" onchange="applyMetersFilter()" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-secondary);color:var(--text)">';
  acts += '<option value="">Все статусы</option>';
  ['Установлен','На поверке','Демонтирован'].forEach(function(s) {
    acts += '<option value="' + s + '"' + (_metersFilter.status === s ? ' selected' : '') + '>' + s + '</option>';
  });
  acts += '</select>';

  // Location search
  acts += '<input id="meterLocFilter" type="text" placeholder="Место установки..." value="' + escapeHtml(_metersFilter.location) + '" oninput="applyMetersFilter()" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-secondary);color:var(--text);width:170px">';

  // Text search
  acts += '<input id="meterSrchFilter" type="text" placeholder="Поиск по наим. / №..." value="' + escapeHtml(_metersFilter.search) + '" oninput="applyMetersFilter()" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-secondary);color:var(--text);width:180px">';

  // Add new meter button
  acts += '<button class="btn btn-primary" onclick="openCreateModal(\\'meter\\')" style="font-size:12px;white-space:nowrap">+ Добавить счётчик</button>';

  // Columns picker button
  acts += '<div style="position:relative;display:inline-block">';
  acts += '<button class="btn btn-sm" onclick="_toggleMeterColPicker(event)" id="meterColPickerBtn" style="font-size:12px">Столбцы ▾</button>';
  acts += '<div id="meterColPicker" style="display:none;position:absolute;top:100%;left:0;z-index:50;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);padding:10px 14px;min-width:200px;margin-top:4px;max-height:320px;overflow-y:auto">';
  _METER_COLS.forEach(function(col) {
    if (col.always) return;
    var checked = !_metersHiddenCols[col.id];
    acts += '<label style="display:flex;align-items:center;gap:8px;padding:4px 0;cursor:pointer;font-size:13px;white-space:nowrap">';
    acts += '<input type="checkbox" ' + (checked ? 'checked' : '') + ' onchange="_onMeterColToggle(\\'' + col.id + '\\',this.checked)">';
    acts += escapeHtml(col.label) + '</label>';
  });
  acts += '</div></div>';

  // Refresh
  acts += '<button class="btn btn-sm" onclick="reloadMeters()" title="Обновить"><i data-lucide="refresh-cw" class="lucide" style="width:14px;height:14px"></i></button>';
  acts += '</div>';

  document.getElementById('topActions').innerHTML = acts;
  renderIcons();

  // Close picker on outside click
  document.addEventListener('click', function _mcp(e) {
    var picker = document.getElementById('meterColPicker');
    var btn = document.getElementById('meterColPickerBtn');
    if (picker && !picker.contains(e.target) && e.target !== btn) {
      picker.style.display = 'none';
    }
  }, { capture: true });
}

function _toggleMeterColPicker(e) {
  e.stopPropagation();
  var picker = document.getElementById('meterColPicker');
  if (picker) picker.style.display = picker.style.display === 'none' ? '' : 'none';
}

function _onMeterColToggle(colId, visible) {
  if (visible) { delete _metersHiddenCols[colId]; }
  else { _metersHiddenCols[colId] = true; }
  _applyMeterColVisibility();
}

function _applyMeterColVisibility() {
  _METER_COLS.forEach(function(col) {
    var hidden = !!_metersHiddenCols[col.id];
    var cells = document.querySelectorAll('#metersTable .mc-col-' + col.id);
    cells.forEach(function(el) { el.style.display = hidden ? 'none' : ''; });
  });
}

async function reloadMeters() {
  try {
    var etRes = await api('/entity-types');
    var meterType = etRes.find(function(t) { return t.name === 'meter'; });
    if (!meterType) {
      document.getElementById('content').innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Тип сущности "meter" не найден. Перезапустите сервер для применения миграции.</div>';
      return;
    }
    var data = await api('/entities?type=meter&limit=2000');
    _metersData = Array.isArray(data) ? data : (data.entities || data.items || []);
    renderMetersTable();
  } catch (e) {
    document.getElementById('content').innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626">Ошибка загрузки: ' + escapeHtml(e.message) + '</div>';
  }
}

function applyMetersFilter() {
  _metersFilter.type     = (document.getElementById('meterTypeFilter')   || {}).value || '';
  _metersFilter.status   = (document.getElementById('meterStatusFilter') || {}).value || '';
  _metersFilter.location = (document.getElementById('meterLocFilter')    || {}).value || '';
  _metersFilter.search   = (document.getElementById('meterSrchFilter')   || {}).value || '';
  renderMetersTable();
}

function metersSortBy(col) {
  if (_metersFilter.sortBy === col) {
    _metersFilter.sortDir = _metersFilter.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    _metersFilter.sortBy = col;
    _metersFilter.sortDir = 'asc';
  }
  renderMetersTable();
}

function _meterNextVerif(props) {
  var vd = props.verification_date || '';
  var vi = parseFloat(props.verification_interval) || 0;
  if (!vd || !vi) return props.next_verification_date || '';
  var d = new Date(vd);
  if (isNaN(d.getTime())) return props.next_verification_date || '';
  d.setFullYear(d.getFullYear() + Math.floor(vi));
  var months = Math.round((vi % 1) * 12);
  if (months) d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function _meterVerifStatus(nextDate) {
  if (!nextDate) return 'unknown';
  var now = new Date();
  var nd  = new Date(nextDate);
  if (isNaN(nd.getTime())) return 'unknown';
  var diffDays = (nd - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0)   return 'overdue';
  if (diffDays < 183) return 'soon';
  return 'ok';
}

function _fmtMeterDate(s) {
  if (!s) return '—';
  if (s instanceof Date) s = s.toISOString().slice(0,10);
  var m = String(s).match(new RegExp('^([0-9]{4})-([0-9]{2})-([0-9]{2})'));
  if (m) return m[3] + '.' + m[2] + '.' + m[1];
  return s;
}

function _meterStatusBadge(status) {
  if (!status) return '';
  var cfg = status === 'Установлен'  ? 'background:#dcfce7;color:#16a34a' :
            status === 'На поверке'  ? 'background:#fef9c3;color:#ca8a04' :
            status === 'Демонтирован'? 'background:#f3f4f6;color:#9ca3af' : 'background:#f3f4f6;color:#9ca3af';
  return '<span style="' + cfg + ';font-size:11px;padding:2px 8px;border-radius:8px;font-weight:600;white-space:nowrap">' + escapeHtml(status) + '</span>';
}

function renderMetersTable() {
  var f   = _metersFilter;

  // Filter
  var rows = _metersData.filter(function(e) {
    var p = e.properties || {};
    if (f.type   && (p.meter_type || '') !== f.type) return false;
    if (f.status && (p.status || '') !== f.status)   return false;
    if (f.location && !(p.installation_location || '').toLowerCase().includes(f.location.toLowerCase())) return false;
    if (f.search) {
      var q = f.search.toLowerCase();
      if (!((e.name || '') + ' ' + (p.meter_number || '') + ' ' + (p.type_and_brand || '')).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Augment with computed next verif date
  rows = rows.map(function(e) {
    var p  = e.properties || {};
    var nv = p.next_verification_date || _meterNextVerif(p);
    return Object.assign({}, e, { _nextVerif: nv });
  });

  // Sort
  var sb = f.sortBy, sd = f.sortDir === 'desc' ? -1 : 1;
  rows.sort(function(a, b) {
    var va = '', vb = '';
    var pa = a.properties || {}, pb = b.properties || {};
    if (sb === 'next_verification_date') { va = a._nextVerif || '9999'; vb = b._nextVerif || '9999'; }
    else if (sb === 'verification_date') { va = pa.verification_date || '9999'; vb = pb.verification_date || '9999'; }
    else if (sb === 'meter_type')        { va = pa.meter_type || ''; vb = pb.meter_type || ''; }
    else if (sb === 'installation_location') { va = pa.installation_location || ''; vb = pb.installation_location || ''; }
    else if (sb === 'name')              { va = a.name || ''; vb = b.name || ''; }
    if (va < vb) return -1 * sd;
    if (va > vb) return  1 * sd;
    return 0;
  });

  var nOverdue = rows.filter(function(r) { return _meterVerifStatus(r._nextVerif) === 'overdue'; }).length;
  var nSoon    = rows.filter(function(r) { return _meterVerifStatus(r._nextVerif) === 'soon'; }).length;

  var c = document.getElementById('content');

  // Stats bar
  var h = '<div style="padding:0 0 16px">';
  h += '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">';
  h += '<span style="font-size:13px;color:var(--text-secondary)">Всего: <strong>' + rows.length + '</strong></span>';
  if (nOverdue) h += '<span style="font-size:13px;background:#fef2f2;color:#dc2626;padding:2px 10px;border-radius:10px;font-weight:600">🔴 Просрочено: ' + nOverdue + '</span>';
  if (nSoon)    h += '<span style="font-size:13px;background:#fffbeb;color:#d97706;padding:2px 10px;border-radius:10px;font-weight:600">🟡 До 6 мес: ' + nSoon + '</span>';
  h += '</div>';

  if (!rows.length) {
    h += '<div style="padding:40px;text-align:center;color:var(--text-muted)">Нет данных по выбранным фильтрам</div></div>';
    c.innerHTML = h;
    return;
  }

  // Determine which types are in current rows
  var hasElec = rows.some(function(r) { return (r.properties || {}).meter_type === 'Электричество'; });
  var hasAllTypes = !f.type;

  // Build visible columns list for current context
  var visibleCols = _METER_COLS.filter(function(col) {
    if (col.elecOnly && !hasElec) return false;
    if (col.id === 'meter_type' && !hasAllTypes) return false;
    return true;
  });

  // TH helper
  function _th(col) {
    var hidden = !col.always && !!_metersHiddenCols[col.id];
    var sortActive = f.sortBy === col.sortKey;
    var arrow = sortActive ? (f.sortDir === 'asc' ? ' ↑' : ' ↓') : '';
    var clickAttr = col.sortKey ? ' onclick="metersSortBy(\\'' + col.sortKey + '\\')" style="cursor:pointer;' : ' style="';
    var underline = (sortActive && col.sortKey) ? 'text-decoration:underline;' : '';
    var stickyStyle = (col.id === 'name') ? 'position:sticky;left:0;z-index:3;' : '';
    var actionsStyle = (col.id === 'actions') ? 'width:36px;' : '';
    var base = 'padding:8px 10px;background:#4F6BCC;color:#fff;text-align:left;white-space:nowrap;user-select:none;' + underline + stickyStyle + actionsStyle;
    // resize handle (not on first/last col)
    var resize = (col.id !== 'name' && col.id !== 'actions')
      ? '<div class="mc-resize" style="position:absolute;right:0;top:0;bottom:0;width:5px;cursor:col-resize;z-index:1"></div>'
      : '';
    return '<th class="mc-col-' + col.id + '"' + clickAttr + base + 'position:relative"' + (hidden ? ' data-hidden="1"' : '') + '>'
      + (col.label ? escapeHtml(col.label) + arrow : '')
      + resize + '</th>';
  }

  h += '<div style="overflow-x:auto;max-height:calc(100vh - 220px);overflow-y:auto;border-radius:8px;border:1px solid var(--border)">';
  h += '<table id="metersTable" style="border-collapse:collapse;font-size:13px;table-layout:auto;white-space:nowrap">';
  h += '<thead style="position:sticky;top:0;z-index:4"><tr>';
  visibleCols.forEach(function(col) { h += _th(col); });
  h += '</tr></thead><tbody>';

  rows.forEach(function(e, i) {
    var p    = e.properties || {};
    var nv   = e._nextVerif;
    var vs   = _meterVerifStatus(nv);
    var isDismantled = (p.status === 'Демонтирован');

    // Row background
    var rowBg;
    if (isDismantled) {
      rowBg = 'background:#f3f4f6;color:#9ca3af';
    } else if (vs === 'overdue') {
      rowBg = 'background:#fef2f2';
    } else if (vs === 'soon') {
      rowBg = 'background:#fffbeb';
    } else {
      rowBg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
    }
    var rowOpacity = isDismantled ? 'opacity:0.6;' : '';

    // Sticky first cell bg (must be explicit for sticky to work)
    var stickyBg = isDismantled ? '#f3f4f6'
                 : vs === 'overdue' ? '#fef2f2'
                 : vs === 'soon'    ? '#fffbeb'
                 : (i % 2 === 0 ? 'var(--bg-card, #fff)' : 'var(--bg-secondary, #f8f9fa)');

    var nvStyle = vs === 'overdue' && !isDismantled ? 'color:#dc2626;font-weight:700' : vs === 'soon' && !isDismantled ? 'color:#d97706;font-weight:600' : '';
    var isElec  = p.meter_type === 'Электричество';

    h += '<tr style="' + rowBg + ';' + rowOpacity + '" class="meter-row">';

    visibleCols.forEach(function(col) {
      var hidden  = !col.always && !!_metersHiddenCols[col.id];
      var dispStyle = hidden ? 'display:none;' : '';
      var borderBot = 'border-bottom:1px solid var(--border);';

      if (col.id === 'name') {
        h += '<td class="mc-col-name" onclick="showEntity(' + e.id + ')" style="' + borderBot + 'padding:7px 10px;position:sticky;left:0;z-index:1;background:' + stickyBg + ';cursor:pointer;color:' + (isDismantled ? '#9ca3af' : 'var(--accent)') + ';font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis" title="' + escapeHtml(e.name || '') + '">' + escapeHtml(e.name || '—') + '</td>';

      } else if (col.id === 'status') {
        h += '<td class="mc-col-status" style="' + dispStyle + borderBot + 'padding:7px 10px;white-space:nowrap">' + _meterStatusBadge(p.status || '') + '</td>';

      } else if (col.id === 'meter_type') {
        var typeColor = p.meter_type === 'Электричество' ? '#FBBF24'
                      : p.meter_type === 'Вода'          ? '#60A5FA'
                      : p.meter_type === 'Тепло'         ? '#F97316'
                      : p.meter_type === 'Газ'           ? '#34D399' : '#9CA3AF';
        h += '<td class="mc-col-meter_type" style="' + dispStyle + borderBot + 'padding:7px 10px"><span style="background:' + typeColor + '22;color:' + typeColor + ';font-size:11px;padding:2px 7px;border-radius:8px;font-weight:600">' + escapeHtml(p.meter_type || '—') + '</span></td>';

      } else if (col.id === 'installation_location') {
        h += '<td class="mc-col-installation_location" style="' + dispStyle + borderBot + 'padding:7px 10px">' + escapeHtml(p.installation_location || '—') + '</td>';

      } else if (col.id === 'meter_number') {
        h += '<td class="mc-col-meter_number" style="' + dispStyle + borderBot + 'padding:7px 10px">' + escapeHtml(p.meter_number || '—') + '</td>';

      } else if (col.id === 'type_and_brand') {
        h += '<td class="mc-col-type_and_brand" style="' + dispStyle + borderBot + 'padding:7px 10px">' + escapeHtml(p.type_and_brand || '—') + '</td>';

      } else if (col.id === 'manufacture_date') {
        h += '<td class="mc-col-manufacture_date" style="' + dispStyle + borderBot + 'padding:7px 10px;white-space:nowrap">' + escapeHtml(p.manufacture_date || '—') + '</td>';

      } else if (col.id === 'tn_tt_ratio') {
        h += '<td class="mc-col-tn_tt_ratio" style="' + dispStyle + borderBot + 'padding:7px 10px;text-align:center">' + (isElec ? escapeHtml(String(p.tn_tt_ratio || '—')) : '') + '</td>';

      } else if (col.id === 'limit_current') {
        h += '<td class="mc-col-limit_current" style="' + dispStyle + borderBot + 'padding:7px 10px;text-align:center">' + (isElec ? escapeHtml(String(p.limit_current || '—')) : '') + '</td>';

      } else if (col.id === 'connected_to') {
        h += '<td class="mc-col-connected_to" style="' + dispStyle + borderBot + 'padding:7px 10px">' + (isElec ? escapeHtml(p.connected_to || '—') : '') + '</td>';

      } else if (col.id === 'mean_time_to_failure') {
        h += '<td class="mc-col-mean_time_to_failure" style="' + dispStyle + borderBot + 'padding:7px 10px">' + escapeHtml(p.mean_time_to_failure || '—') + '</td>';

      } else if (col.id === 'service_life') {
        h += '<td class="mc-col-service_life" style="' + dispStyle + borderBot + 'padding:7px 10px">' + escapeHtml(p.service_life ? p.service_life + ' лет' : '—') + '</td>';

      } else if (col.id === 'warranty_from_sale') {
        h += '<td class="mc-col-warranty_from_sale" style="' + dispStyle + borderBot + 'padding:7px 10px">' + escapeHtml(p.warranty_from_sale || '—') + '</td>';

      } else if (col.id === 'warranty_from_manufacture') {
        h += '<td class="mc-col-warranty_from_manufacture" style="' + dispStyle + borderBot + 'padding:7px 10px">' + escapeHtml(p.warranty_from_manufacture || '—') + '</td>';

      } else if (col.id === 'verification_interval') {
        h += '<td class="mc-col-verification_interval" style="' + dispStyle + borderBot + 'padding:7px 10px;text-align:center">' + escapeHtml(String(p.verification_interval || '—')) + '</td>';

      } else if (col.id === 'verification_date') {
        h += '<td class="mc-col-verification_date" style="' + dispStyle + borderBot + 'padding:7px 10px;white-space:nowrap">' + _fmtMeterDate(p.verification_date) + '</td>';

      } else if (col.id === 'next_verification_date') {
        h += '<td class="mc-col-next_verification_date" style="' + dispStyle + borderBot + 'padding:7px 10px;white-space:nowrap;' + nvStyle + '">' + (nv ? _fmtMeterDate(nv) : '—') + '</td>';

      } else if (col.id === 'actions') {
        var replBtn = !isDismantled
          ? '<button onclick="event.stopPropagation();showMeterReplaceForm(' + e.id + ')" title="Заменить на новый счётчик" style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:4px 5px;cursor:pointer;color:#475569;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px">' +
            '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
              '<path d="M2 6.5h11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
              '<path d="M10 4l3.5 2.5L10 9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
              '<path d="M18 13.5H7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
              '<path d="M10 11l-3.5 2.5L10 16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
            '</svg>' +
            '</button>'
          : '';
        h += '<td class="mc-col-actions" style="' + borderBot + 'padding:4px 8px;text-align:center;width:36px">' + replBtn + '</td>';
      }
    });

    h += '</tr>';
  });

  h += '</tbody></table></div>';

  // Legend
  h += '<div style="margin-top:10px;display:flex;gap:16px;font-size:12px;color:var(--text-secondary);flex-wrap:wrap">';
  h += '<span style="color:#dc2626">🔴 Просроченная поверка</span>';
  h += '<span style="color:#d97706">🟡 Поверка в ближайшие 6 месяцев</span>';
  h += '<span style="color:#9ca3af">⬜ Демонтированные счётчики (серый)</span>';
  h += '</div>';
  h += '</div>';

  c.innerHTML = h;
  _applyMeterColVisibility();
  _initMeterColResize();
}

// ===== COLUMN RESIZE =====
function _initMeterColResize() {
  var handles = document.querySelectorAll('#metersTable .mc-resize');
  handles.forEach(function(handle) {
    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var th = handle.parentElement;
      var startX = e.clientX;
      var startW = th.offsetWidth;
      function onMove(e) {
        var newW = Math.max(50, startW + (e.clientX - startX));
        th.style.width = newW + 'px';
        th.style.minWidth = newW + 'px';
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// ===== METER REPLACE FORM =====
function showMeterReplaceForm(meterId) {
  var meter = _metersData.find(function(m) { return m.id === meterId; });
  if (!meter) return;
  var p = meter.properties || {};
  var isElec = p.meter_type === 'Электричество';

  var overlay = document.createElement('div');
  overlay.id = 'meterReplaceOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px';

  var h = '<div style="background:var(--bg-card);border-radius:12px;padding:24px;max-width:480px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto">';
  h += '<h3 style="margin:0 0 4px">Замена счётчика</h3>';
  h += '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Старый: <strong>' + escapeHtml(meter.name || '') + '</strong></div>';

  // Акт
  h += '<div style="background:var(--bg-secondary);border-radius:8px;padding:12px;margin-bottom:14px">';
  h += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:10px">📄 Документ замены</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  h += '<div class="form-group" style="margin:0"><label style="font-size:12px">Акт №</label><input id="mrActNum" placeholder="123" style="width:100%"></div>';
  h += '<div class="form-group" style="margin:0"><label style="font-size:12px">Дата акта</label><input type="date" id="mrActDate" style="width:100%"></div>';
  h += '</div></div>';

  // Новый счётчик
  h += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:10px">🔢 Новый счётчик</div>';
  h += '<div class="form-group"><label style="font-size:12px">Название нового счётчика</label><input id="mrName" value="' + escapeHtml(meter.name || '') + '" style="width:100%"></div>';
  h += '<div class="form-group"><label style="font-size:12px">Тип и марка (модель)</label><input id="mrBrand" value="" placeholder="ЦЭ6803В УНМТ" style="width:100%"></div>';
  h += '<div class="form-group"><label style="font-size:12px">№ счётчика</label><input id="mrNumber" placeholder="12345678" style="width:100%"></div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  h += '<div class="form-group" style="margin:0"><label style="font-size:12px">Дата изготовления</label><input type="date" id="mrManufDate" style="width:100%"></div>';
  h += '<div class="form-group" style="margin:0"><label style="font-size:12px">Дата первичной поверки</label><input type="date" id="mrVerifDate" style="width:100%"></div>';
  h += '</div>';

  if (isElec) {
    h += '<div class="form-group"><label style="font-size:12px">Коэффициент ТН/ТТ</label><input id="mrTnTt" value="' + escapeHtml(String(p.tn_tt_ratio || '')) + '" placeholder="1/1" style="width:100%"></div>';
  }

  h += '<div id="mrMsg" style="color:#dc2626;font-size:13px;margin-bottom:8px;display:none"></div>';
  h += '<div style="display:flex;gap:8px;margin-top:16px">';
  h += '<button class="btn" onclick="document.getElementById(\\'meterReplaceOverlay\\').remove()">Отмена</button>';
  h += '<button class="btn btn-primary" onclick="_submitMeterReplace(' + meterId + ')">Заменить счётчик</button>';
  h += '</div>';
  h += '</div>';

  overlay.innerHTML = h;
  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.remove();
  });
}

async function _submitMeterReplace(oldId) {
  var oldMeter = _metersData.find(function(m) { return m.id === oldId; });
  if (!oldMeter) return;
  var op = oldMeter.properties || {};

  var newName  = ((document.getElementById('mrName')      || {}).value || '').trim();
  var brand    = (document.getElementById('mrBrand')     || {}).value || '';
  var number   = (document.getElementById('mrNumber')    || {}).value || '';
  var manufDate = (document.getElementById('mrManufDate') || {}).value || '';
  var verifDate = (document.getElementById('mrVerifDate') || {}).value || '';
  var tnTt     = (document.getElementById('mrTnTt')      || {}).value || '';
  var actNum   = (document.getElementById('mrActNum')    || {}).value || '';
  var actDate  = (document.getElementById('mrActDate')   || {}).value || '';

  var msgEl = document.getElementById('mrMsg');

  if (!newName) {
    if (msgEl) { msgEl.textContent = 'Введите название нового счётчика'; msgEl.style.display = ''; }
    return;
  }

  // Build new meter properties — inherit location/connected_to from old
  var newProps = {
    status:                op.meter_type ? 'Установлен' : 'Установлен',
    meter_type:            op.meter_type            || '',
    installation_location: op.installation_location || '',
    connected_to:          op.connected_to          || '',
    type_and_brand:        brand,
    meter_number:          number,
    manufacture_date:      manufDate,
    verification_date:     verifDate,
    verification_interval: op.verification_interval || '',
    tn_tt_ratio:           tnTt || (op.tn_tt_ratio || ''),
    limit_current:         op.limit_current         || '',
    act_number:            actNum,
    act_date:              actDate,
  };

  // newName is taken from mrName input (already set above)

  var saveBtn = document.querySelector('#meterReplaceOverlay .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Сохранение...'; }

  try {
    // 1. Create new meter
    await api('/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity_type_id: oldMeter.entity_type_id,
        name: newName,
        properties: newProps,
      }),
    });

    // 2. Mark old meter as Демонтирован
    var updatedOldProps = Object.assign({}, op, {
      status:     'Демонтирован',
      act_number: actNum || (op.act_number || ''),
      act_date:   actDate || (op.act_date || ''),
    });
    await api('/entities/' + oldId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:       oldMeter.name,
        properties: updatedOldProps,
      }),
    });

    var overlay = document.getElementById('meterReplaceOverlay');
    if (overlay) overlay.remove();

    // Сбрасываем поисковый фильтр — новый счётчик имеет другой номер
    _metersFilter.search = '';
    _metersFilter.status = '';
    var srchEl = document.getElementById('meterSrchFilter');
    if (srchEl) srchEl.value = '';
    var stEl = document.getElementById('meterStatusFilter');
    if (stEl) stEl.value = '';

    // Reload
    await reloadMeters();

  } catch (err) {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Заменить счётчик'; }
    if (msgEl) { msgEl.textContent = 'Ошибка: ' + (err.message || err); msgEl.style.display = ''; }
  }
}
`;
