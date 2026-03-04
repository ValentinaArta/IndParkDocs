/* eslint-disable */
module.exports = `
// === METERS PAGE ===

var _metersData      = [];
var _metersFilter    = { type: '', location: '', search: '', sortBy: 'next_verification_date', sortDir: 'asc' };

async function showMetersPage() {
  currentView = 'meters';
  _setNavHash('meters');
  setActive('[onclick*="showMetersPage"]');
  document.getElementById('pageTitle').textContent = 'Счётчики';
  document.getElementById('breadcrumb').textContent = '';

  // Top actions — filters
  var acts = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
  acts += '<select id="meterTypeFilter" onchange="applyMetersFilter()" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-secondary);color:var(--text)">';
  acts += '<option value="">Все типы</option>';
  ['Электричество','Вода','Тепло','Газ'].forEach(function(t) {
    acts += '<option value="' + t + '" ' + (_metersFilter.type === t ? 'selected' : '') + '>' + t + '</option>';
  });
  acts += '</select>';
  acts += '<input id="meterLocFilter" type="text" placeholder="Место установки..." value="' + escapeHtml(_metersFilter.location) + '" oninput="applyMetersFilter()" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-secondary);color:var(--text);width:200px">';
  acts += '<input id="meterSrchFilter" type="text" placeholder="Поиск по наим. / №..." value="' + escapeHtml(_metersFilter.search) + '" oninput="applyMetersFilter()" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg-secondary);color:var(--text);width:200px">';
  acts += '<button class="btn btn-sm" onclick="reloadMeters()" title="Обновить"><i data-lucide="refresh-cw" class="lucide" style="width:14px;height:14px"></i></button>';
  acts += '</div>';
  document.getElementById('topActions').innerHTML = acts;
  renderIcons();

  document.getElementById('content').innerHTML = '<div style="padding:40px;text-align:center"><div class="spinner-ring" style="margin:0 auto"></div></div>';

  await reloadMeters();
}

async function reloadMeters() {
  try {
    // Load meters via entity API
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
  _metersFilter.type     = (document.getElementById('meterTypeFilter') || {}).value || '';
  _metersFilter.location = (document.getElementById('meterLocFilter') || {}).value || '';
  _metersFilter.search   = (document.getElementById('meterSrchFilter') || {}).value || '';
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

function _meterStatus(nextDate) {
  if (!nextDate) return 'unknown';
  var now = new Date();
  var nd  = new Date(nextDate);
  if (isNaN(nd.getTime())) return 'unknown';
  var diffMs = nd - now;
  var diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0)   return 'overdue';
  if (diffDays < 183) return 'soon';     // ~6 months
  return 'ok';
}

function _fmtMeterDate(s) {
  if (!s) return '—';
  if (s instanceof Date) s = s.toISOString().slice(0,10);
  var m = String(s).match(new RegExp('^(\\\\d{4})-(\\\\d{2})-(\\\\d{2})'));
  if (m) return m[3] + '.' + m[2] + '.' + m[1];
  return s;
}

function renderMetersTable() {
  var now = new Date();
  var f   = _metersFilter;

  // Filter
  var rows = _metersData.filter(function(e) {
    var p = e.properties || {};
    if (f.type     && (p.meter_type || '') !== f.type) return false;
    if (f.location && !(p.installation_location || '').toLowerCase().includes(f.location.toLowerCase())) return false;
    if (f.search) {
      var q = f.search.toLowerCase();
      var haystack = ((e.name || '') + ' ' + (p.meter_number || '') + ' ' + (p.type_and_brand || '')).toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Compute next verif for each row if missing
  rows = rows.map(function(e) {
    var p = e.properties || {};
    var nv = p.next_verification_date || _meterNextVerif(p);
    return Object.assign({}, e, { _nextVerif: nv });
  });

  // Sort
  var sb = f.sortBy;
  var sd = f.sortDir === 'desc' ? -1 : 1;
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

  // Stats
  var nOverdue = rows.filter(function(r) { return _meterStatus(r._nextVerif) === 'overdue'; }).length;
  var nSoon    = rows.filter(function(r) { return _meterStatus(r._nextVerif) === 'soon'; }).length;

  // Render
  var c = document.getElementById('content');
  var hasElec = !f.type || f.type === 'Электричество';
  var hasAllTypes = !f.type;

  var h = '<div style="padding:0 0 16px">';
  // Stats bar
  h += '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">';
  h += '<span style="font-size:13px;color:var(--text-secondary)">Всего: <strong>' + rows.length + '</strong></span>';
  if (nOverdue) h += '<span style="font-size:13px;background:#fef2f2;color:#dc2626;padding:2px 10px;border-radius:10px;font-weight:600">🔴 Просрочено: ' + nOverdue + '</span>';
  if (nSoon)    h += '<span style="font-size:13px;background:#fffbeb;color:#d97706;padding:2px 10px;border-radius:10px;font-weight:600">🟡 До 6 мес: ' + nSoon + '</span>';
  h += '</div>';

  if (!rows.length) {
    h += '<div style="padding:40px;text-align:center;color:var(--text-muted)">Нет данных по выбранным фильтрам</div>';
    h += '</div>';
    c.innerHTML = h;
    return;
  }

  var _thBtn = function(col, label) {
    var active = f.sortBy === col;
    var arrow = active ? (f.sortDir === 'asc' ? ' ↑' : ' ↓') : '';
    return '<th onclick="metersSortBy(\\'' + col + '\\')" style="cursor:pointer;white-space:nowrap;padding:8px 10px;background:#4F6BCC;color:#fff;text-align:left' + (active ? ';text-decoration:underline' : '') + '">' + label + arrow + '</th>';
  };

  h += '<div style="overflow-x:auto">';
  h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
  h += '<thead><tr>';
  h += _thBtn('name',                  'Наименование');
  if (hasAllTypes) h += _thBtn('meter_type', 'Тип');
  h += _thBtn('installation_location', 'Место установки');
  h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">№ счётчика</th>';
  h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">Тип и марка</th>';
  h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">Дата выпуска</th>';
  if (hasElec) {
    h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">Коэфф. тн/тт</th>';
    h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">Огр.ток</th>';
    h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">Подключен к</th>';
  }
  h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">Нар. до отказа</th>';
  h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">Срок службы</th>';
  h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">Гарантия (продажа)</th>';
  h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">Гарантия (выпуск)</th>';
  h += '<th style="padding:8px 10px;background:#4F6BCC;color:#fff;white-space:nowrap">Интервал (лет)</th>';
  h += _thBtn('verification_date',      'Дата поверки');
  h += _thBtn('next_verification_date', 'След. поверка');
  h += '</tr></thead><tbody>';

  rows.forEach(function(e, i) {
    var p    = e.properties || {};
    var nv   = e._nextVerif;
    var st   = _meterStatus(nv);
    var rowBg = st === 'overdue' ? 'background:#fef2f2'
              : st === 'soon'    ? 'background:#fffbeb'
              : (i % 2 === 0 ? '' : 'background:var(--bg-secondary)');
    var nv_style = st === 'overdue' ? 'color:#dc2626;font-weight:700' : st === 'soon' ? 'color:#d97706;font-weight:600' : '';
    var isElec = p.meter_type === 'Электричество';

    h += '<tr style="' + rowBg + '" onclick="showEntity(' + e.id + ')" class="meter-row">';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);cursor:pointer;color:var(--accent)">' + escapeHtml(e.name || '—') + '</td>';
    if (hasAllTypes) {
      var typeColor = p.meter_type === 'Электричество' ? '#FBBF24'
                    : p.meter_type === 'Вода'          ? '#60A5FA'
                    : p.meter_type === 'Тепло'         ? '#F97316'
                    : p.meter_type === 'Газ'           ? '#34D399' : '#9CA3AF';
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)"><span style="background:' + typeColor + '22;color:' + typeColor + ';font-size:11px;padding:2px 7px;border-radius:8px;font-weight:600;white-space:nowrap">' + escapeHtml(p.meter_type || '—') + '</span></td>';
    }
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.installation_location || '—') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.meter_number || '—') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.type_and_brand || '—') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.manufacture_date || '—') + '</td>';
    if (hasElec) {
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:center">' + (isElec ? escapeHtml(String(p.tn_tt_ratio || '—')) : '') + '</td>';
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:center">' + (isElec ? escapeHtml(String(p.limit_current || '—')) : '') + '</td>';
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + (isElec ? escapeHtml(p.connected_to || '—') : '') + '</td>';
    }
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.mean_time_to_failure || '—') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.service_life ? p.service_life + ' лет' : '—') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.warranty_from_sale || '—') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.warranty_from_manufacture || '—') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:center">' + escapeHtml(String(p.verification_interval || '—')) + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);white-space:nowrap">' + _fmtMeterDate(p.verification_date) + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);white-space:nowrap;' + nv_style + '">' + (nv ? _fmtMeterDate(nv) : '—') + '</td>';
    h += '</tr>';
  });

  h += '</tbody></table></div>';

  // Legend
  h += '<div style="margin-top:12px;display:flex;gap:16px;font-size:12px;color:var(--text-secondary)">';
  h += '<span style="color:#dc2626">🔴 Просроченная поверка</span>';
  h += '<span style="color:#d97706">🟡 Поверка в ближайшие 6 месяцев</span>';
  h += '<span>— Нажмите на строку для открытия карточки</span>';
  h += '</div>';

  h += '</div>';
  c.innerHTML = h;
}
`;
