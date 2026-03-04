module.exports = `

// navigation/auth/init functions moved to pages/nav.js
// map page functions moved to pages/map-page.js
// dashboard functions moved to pages/dashboard.js

// ============ LIST VIEW MODE (cards / table) ============

var _listViewMode       = {};   // { typeName: 'cards' | 'table' }
var _listSortBy         = 'name';
var _listSortDir        = 'asc';
var _listCurrentEntities = [];

var _TABLE_VIEW_TYPES = ['contract', 'supplement', 'company', 'equipment'];

function _svgCards() {
  return '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" style="vertical-align:middle">' +
    '<rect x="0.75" y="0.75" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="9.75" y="0.75" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="0.75" y="9.75" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
    '<rect x="9.75" y="9.75" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
    '</svg>';
}

function _svgTable() {
  return '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" style="vertical-align:middle">' +
    '<rect x="0.75" y="0.75" width="14.5" height="14.5" rx="1" stroke="currentColor" stroke-width="1.5"/>' +
    '<line x1="0.75" y1="5.25" x2="15.25" y2="5.25" stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="0.75" y1="9.5"  x2="15.25" y2="9.5"  stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="0.75" y1="13.75" x2="15.25" y2="13.75" stroke="currentColor" stroke-width="1.2"/>' +
    '</svg>';
}

function _toggleListView(typeName) {
  _listViewMode[typeName] = (_listViewMode[typeName] === 'table') ? 'cards' : 'table';
  var isTable = _listViewMode[typeName] === 'table';
  var btn = document.getElementById('listViewToggleBtn');
  if (btn) {
    btn.innerHTML = isTable ? (_svgCards() + ' Карточки') : (_svgTable() + ' Таблица');
    btn.title = isTable ? 'Показать карточками' : 'Показать таблицей';
  }
  _renderListCurrent();
}

function _renderListCurrent() {
  if (_listViewMode[currentTypeFilter] === 'table') {
    renderEntityTable(_listCurrentEntities, currentTypeFilter);
  } else {
    renderEntityGrid(_listCurrentEntities);
  }
}

function _listSortByCol(col) {
  if (_listSortBy === col) {
    _listSortDir = (_listSortDir === 'asc') ? 'desc' : 'asc';
  } else {
    _listSortBy = col;
    _listSortDir = 'asc';
  }
  renderEntityTable(_listCurrentEntities, currentTypeFilter);
}

function _getEntityTableCols(typeName) {
  if (typeName === 'contract' || typeName === 'supplement') {
    return [
      { id: 'doc_status', label: 'Статус', sortable: true,
        getValue: function(e) { return (e.properties || {}).doc_status || ''; },
        render: function(e) {
          var p = e.properties || {};
          var h = '';
          if (p.is_vgo === 'true' || p.is_vgo === true) h += '<span style="background:#eff6ff;color:#1d4ed8;font-size:10px;font-weight:700;padding:1px 5px;border-radius:6px;margin-right:3px">ВГО</span>';
          if (p.doc_status) h += _docStatusBadge(p.doc_status);
          return h || '—';
        }
      },
      { id: 'number', label: '№', sortable: true,
        getValue: function(e) { return (e.properties || {}).number || ''; },
        render: function(e) { return '<span style="font-weight:500">' + escapeHtml((e.properties || {}).number || '—') + '</span>'; }
      },
      { id: 'contract_type', label: 'Тип договора', sortable: true,
        getValue: function(e) { return (e.properties || {}).contract_type || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).contract_type || '—'); }
      },
      { id: 'our_legal_entity', label: 'Наше юр. лицо', sortable: true,
        getValue: function(e) { return (e.properties || {}).our_legal_entity || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).our_legal_entity || '—'); }
      },
      { id: 'contractor_name', label: 'Контрагент', sortable: true,
        getValue: function(e) { return (e.properties || {}).contractor_name || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).contractor_name || '—'); }
      },
      { id: 'contract_date', label: 'Дата', sortable: true,
        getValue: function(e) { return (e.properties || {}).contract_date || ''; },
        render: function(e) {
          var d = (e.properties || {}).contract_date || '';
          if (d && d.length === 10) { var pts = d.split('-'); d = pts[2] + '.' + pts[1] + '.' + pts[0]; }
          return d || '—';
        }
      },
      { id: 'contract_amount', label: 'Сумма', sortable: true,
        getValue: function(e) { var v = parseFloat((e.properties || {}).contract_amount || (e.properties || {}).rent_monthly || 0); return isNaN(v) ? 0 : v; },
        render: function(e) {
          var amt = (e.properties || {}).contract_amount || (e.properties || {}).rent_monthly || '';
          if (!amt) return '—';
          return '<span style="font-weight:600;color:var(--accent)">' + Number(amt).toLocaleString('ru-RU') + ' \\u20bd</span>';
        }
      },
    ];
  }
  if (typeName === 'company') {
    return [
      { id: 'name', label: 'Название', sortable: true,
        getValue: function(e) { return e.name || ''; },
        render: function(e) { return '<span style="font-weight:500">' + escapeHtml(e.name || '—') + '</span>'; }
      },
      { id: 'inn', label: 'ИНН', sortable: true,
        getValue: function(e) { return (e.properties || {}).inn || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).inn || '—'); }
      },
      { id: 'contact_person', label: 'Контактное лицо', sortable: true,
        getValue: function(e) { return (e.properties || {}).contact_person || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).contact_person || '—'); }
      },
      { id: 'phone', label: 'Телефон', sortable: false,
        getValue: function(e) { return (e.properties || {}).phone || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).phone || '—'); }
      },
      { id: 'email', label: 'Email', sortable: false,
        getValue: function(e) { return (e.properties || {}).email || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).email || '—'); }
      },
    ];
  }
  if (typeName === 'equipment') {
    return [
      { id: 'name', label: 'Название', sortable: true,
        getValue: function(e) { return e.name || ''; },
        render: function(e) {
          var isB = _brokenEqIds && _brokenEqIds.has(e.id);
          var badge = isB ? ' <span class="eq-broken-badge">\\u26a0 Нерабочий</span>' : '';
          return '<span style="font-weight:500' + (isB ? ';color:#dc2626' : '') + '">' + escapeHtml(e.name || '—') + '</span>' + badge;
        }
      },
      { id: 'equipment_category', label: 'Категория', sortable: true,
        getValue: function(e) { return (e.properties || {}).equipment_category || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).equipment_category || '—'); }
      },
      { id: 'equipment_kind', label: 'Вид', sortable: true,
        getValue: function(e) { return (e.properties || {}).equipment_kind || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).equipment_kind || '—'); }
      },
      { id: 'inv_number', label: 'Инв. №', sortable: true,
        getValue: function(e) { return (e.properties || {}).inv_number || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).inv_number || '—'); }
      },
      { id: 'serial_number', label: 'Серийный №', sortable: true,
        getValue: function(e) { return (e.properties || {}).serial_number || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).serial_number || '—'); }
      },
      { id: 'status', label: 'Статус', sortable: true,
        getValue: function(e) { return (e.properties || {}).status || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).status || '—'); }
      },
      { id: 'balance_owner', label: 'Балансодержатель', sortable: true,
        getValue: function(e) { return (e.properties || {}).balance_owner_name || ''; },
        render: function(e) { return escapeHtml((e.properties || {}).balance_owner_name || '—'); }
      },
    ];
  }
  return [];
}

function renderEntityTable(entities, typeName) {
  _listCurrentEntities = Array.isArray(entities) ? entities : [];
  var cols = _getEntityTableCols(typeName);
  if (!cols.length) { renderEntityGrid(entities); return; }

  // Sort
  var sorted = _listCurrentEntities.slice().sort(function(a, b) {
    var c = null;
    for (var ci = 0; ci < cols.length; ci++) { if (cols[ci].id === _listSortBy) { c = cols[ci]; break; } }
    if (!c || !c.getValue) return 0;
    var va = c.getValue(a);
    var vb = c.getValue(b);
    var sd = _listSortDir === 'desc' ? -1 : 1;
    // Numeric sort
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * sd;
    }
    va = (va === null || va === undefined) ? '' : String(va).toLowerCase();
    vb = (vb === null || vb === undefined) ? '' : String(vb).toLowerCase();
    if (va < vb) return -1 * sd;
    if (va > vb) return  1 * sd;
    return 0;
  });

  if (!sorted.length) {
    document.getElementById('content').innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)">Нет записей</div>';
    return;
  }

  var h = '<div style="overflow-x:auto;border-radius:8px;border:1px solid var(--border)">';
  h += '<table style="border-collapse:collapse;font-size:13px;white-space:nowrap;width:100%">';
  h += '<thead><tr>';
  cols.forEach(function(col) {
    var active = (_listSortBy === col.id) && (col.sortable !== false);
    var arrow  = active ? (_listSortDir === 'asc' ? ' \\u2191' : ' \\u2193') : '';
    if (col.sortable !== false) {
      h += '<th onclick="_listSortByCol(\\'' + col.id + '\\')" style="cursor:pointer;padding:9px 12px;background:#4F6BCC;color:#fff;text-align:left;user-select:none' + (active ? ';text-decoration:underline' : '') + '">' + escapeHtml(col.label) + arrow + '</th>';
    } else {
      h += '<th style="padding:9px 12px;background:#4F6BCC;color:#fff;text-align:left">' + escapeHtml(col.label) + '</th>';
    }
  });
  h += '</tr></thead><tbody>';

  sorted.forEach(function(e, i) {
    var rowBg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
    h += '<tr style="' + rowBg + '" class="meter-row" onclick="showEntity(' + e.id + ')">';
    cols.forEach(function(col) {
      h += '<td style="padding:7px 12px;border-bottom:1px solid var(--border)">' + col.render(e) + '</td>';
    });
    h += '</tr>';
  });
  h += '</tbody></table></div>';
  h += '<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">Всего: ' + sorted.length + '</div>';
  document.getElementById('content').innerHTML = h;
}

// ============ END LIST VIEW MODE ============

function _areaBarHover(bi) {
  if (!_areaData) return;
  var blds = _areaData.buildings.filter(function(b) { return b.total_area > 0; });
  var b = blds[bi];
  if (!b || !b.contracts || !b.contracts.length) return;
  var bar = document.getElementById('area_bar_' + bi);
  if (!bar) return;
  var barH = bar.offsetHeight;
  var total = b.total_area || 1;
  var h = '';
  // Tenant segments from bottom up
  var contracts = b.contracts;
  var allTenants = (_areaData.tenants || []);
  var tColors = _buildTenantColorMap(allTenants);
  var freeArea = b.total_area - b.rented_area;
  var freeH = Math.round((freeArea / total) * barH);
  h += '<div style="height:'+freeH+'px;background:#e5e7eb" title="Свободно: '+_fmtNum(Math.round(freeArea))+' м²"></div>';
  contracts.forEach(function(c) {
    var ch = Math.max(2, Math.round((c.area / total) * barH));
    var color = tColors[c.tenant] || '#4F6BCC';
    h += '<div style="height:'+ch+'px;background:'+color+'" title="'+escapeHtml(c.tenant)+': '+_fmtNum(Math.round(c.area))+' м²"></div>';
  });
  bar.innerHTML = h;
}

function _areaBarLeave(bi) {
  if (!_areaData) return;
  var blds = _areaData.buildings.filter(function(b) { return b.total_area > 0; });
  var b = blds[bi];
  if (!b) return;
  var bar = document.getElementById('area_bar_' + bi);
  if (!bar) return;
  var barH = bar.offsetHeight;
  var rentedPct = b.rented_area / (b.total_area || 1);
  var rentedH = Math.round(barH * rentedPct);
  var freeH = barH - rentedH;
  bar.innerHTML = '<div style="height:'+freeH+'px;background:#e5e7eb"></div><div style="height:'+rentedH+'px;background:#4F6BCC"></div>';
}

function _areaBarClick(bi) {
  if (!_areaData) return;
  var blds = _areaData.buildings.filter(function(b) { return b.total_area > 0; });
  var b = blds[bi];
  if (!b) return;
  var dd = document.getElementById('areaDrillDown');
  if (!dd) return;
  var h = '<h4 style="margin-bottom:12px">' + escapeHtml(b.short_name || b.name) + ' — аренда</h4>';
  if (b.contracts && b.contracts.length) {
    h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    h += '<tr style="background:var(--bg-secondary)"><th style="text-align:left;padding:8px">Арендатор</th><th style="text-align:right;padding:8px">Площадь, м²</th><th style="text-align:right;padding:8px">%</th></tr>';
    var allTenants = (_areaData.tenants || []);
    var tColors = _buildTenantColorMap(allTenants);
    b.contracts.forEach(function(c) {
      var color = tColors[c.tenant] || '#4F6BCC';
      h += '<tr style="cursor:pointer;border-bottom:1px solid var(--border)" onclick="showEntity('+c.contract_id+')">';
      h += '<td style="padding:8px"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:'+color+';margin-right:6px;vertical-align:middle"></span>' + escapeHtml(c.tenant || c.contract_name) + '</td>';
      h += '<td style="text-align:right;padding:8px">' + _fmtNum(Math.round(c.area)) + '</td>';
      h += '<td style="text-align:right;padding:8px">' + Math.round(c.area / (b.total_area || 1) * 100) + '%</td>';
      h += '</tr>';
    });
    var freeArea = b.total_area - b.rented_area;
    h += '<tr style="border-top:2px solid var(--border)"><td style="padding:8px;color:var(--text-muted)">Свободно</td><td style="text-align:right;padding:8px">' + _fmtNum(Math.round(freeArea)) + '</td><td style="text-align:right;padding:8px">' + Math.round(freeArea / (b.total_area || 1) * 100) + '%</td></tr>';
    h += '</table>';
  } else {
    h += '<div style="color:var(--text-muted);font-size:13px">Нет активных договоров аренды</div>';
  }
  dd.innerHTML = h;
}

// ============ ENTITY LIST ============

async function showEntityList(typeName, opts) {
  opts = opts || {};
  currentView = 'list';
  currentTypeFilter = typeName;
  _setNavHash('list/' + encodeURIComponent(typeName));
  const type = entityTypes.find(t => t.name === typeName);

  // Highlight parent group in nav when showing filtered sub-list
  var activeType = (_navParentType[typeName] && opts.parentId != null) ? _navParentType[typeName] : typeName;
  setActive('[data-type="' + activeType + '"]');

  // Page title
  var title = type ? type.name_ru : typeName;
  if (opts.isOwn === true) title = 'Наши компании';
  else if (opts.only1c) title = 'Контрагенты из 1С';
  else if (opts.isOwn === false) title = 'Сторонние компании';
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('breadcrumb').textContent = opts.subtitle ? opts.subtitle : '';
  var createBtn = typeName === 'room' && opts.parentId
    ? '<button class="btn btn-primary" onclick="openCreateModal(\\'' + typeName + '\\',' + opts.parentId + ')">+ Добавить</button>'
    : '<button class="btn btn-primary" onclick="openCreateModal(\\'' + typeName + '\\')">+ Добавить</button>';

  var viewToggleBtn = '';
  if (_TABLE_VIEW_TYPES.indexOf(typeName) >= 0) {
    var isTable = _listViewMode[typeName] === 'table';
    viewToggleBtn = '<button id="listViewToggleBtn" class="btn btn-sm" onclick="_toggleListView(\\'' + typeName + '\\')" title="' + (isTable ? 'Показать карточками' : 'Показать таблицей') + '" style="display:inline-flex;align-items:center;gap:5px">' +
      (isTable ? _svgCards() + ' Карточки' : _svgTable() + ' Таблица') + '</button>';
  }

  document.getElementById('topActions').innerHTML =
    '<input class="search-bar" placeholder="Поиск..." oninput="searchEntities(this.value)">' + viewToggleBtn + createBtn;

  var url = '/entities?type=' + typeName;
  if (opts.parentId) url += '&parent_id=' + opts.parentId;
  if (opts.isOwn === true) url += '&is_own=true';
  else if (opts.isOwn === false) url += '&is_own=false';
  if (opts.no1c) url += '&no_1c=true';
  if (opts.only1c) url += '&only_1c=true';
  // Для компаний запрашиваем больший лимит
  if (typeName === 'company') url += '&limit=1000';

  var entities = await api(url);
  if (currentView !== 'list' || currentTypeFilter !== typeName) return; // user navigated away
  if (typeName === 'equipment') await loadBrokenEquipment();
  // Client-side filter by contract_type
  if (opts.contractType) {
    entities = entities.filter(function(e) {
      return (e.properties || {}).contract_type === opts.contractType;
    });
    document.getElementById('pageTitle').textContent = 'Договоры: ' + opts.contractType;
  }
  _listCurrentEntities = Array.isArray(entities) ? entities : [];
  _renderListCurrent();
}

function renderEntityGrid(entities) {
  _listCurrentEntities = Array.isArray(entities) ? entities : [];
  const content = document.getElementById('content');
  if (entities.length === 0) {
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)">Нет записей</div>';
    return;
  }
  let html = '<div class="entity-grid">';
  entities.forEach(e => {
    const props = e.properties || {};
    let tags = '';
    var isContractLike = (e.type_name === 'contract' || e.type_name === 'supplement');
    if (isContractLike) {
      // Show: тип, стороны, предмет, сумма
      var ctType = props.contract_type || '';
      if (ctType) tags += '<span class="prop-tag" style="font-weight:600">' + escapeHtml(ctType) + '</span>';
      // Стороны
      var sides = [];
      if (props.our_legal_entity) sides.push(escapeHtml(props.our_legal_entity));
      if (props.contractor_name) sides.push(escapeHtml(props.contractor_name));
      if (props.subtenant_name)  sides.push(escapeHtml(props.subtenant_name));
      if (sides.length) tags += '<span class="prop-tag" style="color:var(--text-secondary)">' + sides.join(' · ') + '</span>';
      // Предмет
      var subj = props.subject || props.service_subject || '';
      if (subj) tags += '<span class="prop-tag">' + escapeHtml(subj.length > 60 ? subj.substring(0,60)+'…' : subj) + '</span>';
      // Сумма
      var amt = props.contract_amount || props.rent_monthly || '';
      if (amt) tags += '<span class="prop-tag" style="font-weight:500;color:var(--accent)">' + escapeHtml(String(Number(amt).toLocaleString('ru-RU'))) + ' ₽</span>';
    } else if (e.type_name === 'equipment') {
      var _t = function(v) { if (v) tags += '<span class="prop-tag">' + escapeHtml(String(v)) + '</span>'; };
      _t(props.equipment_category); _t(props.equipment_kind); _t(props.inv_number ? 'Инв. ' + props.inv_number : '');
      _t(props.status); _t(props.balance_owner_name);
    } else if (e.type_name === 'building' || e.type_name === 'workshop') {
      if (props.short_name) tags += '<span class="prop-tag" style="font-weight:600">' + escapeHtml(props.short_name) + '</span>';
      if (props.address) tags += '<span class="prop-tag" style="color:var(--text-secondary);font-size:11px">' + escapeHtml(props.address.length > 50 ? props.address.substring(0,50) + '…' : props.address) + '</span>';
      if (props.balance_owner_name) tags += '<span class="prop-tag">' + escapeHtml(props.balance_owner_name) + '</span>';
    } else if (e.type_name === 'room') {
      if (props.object_type) tags += '<span class="prop-tag" style="font-weight:600">' + escapeHtml(props.object_type) + '</span>';
      if (props.area) tags += '<span class="prop-tag">' + props.area + ' м²</span>';
      if (props.floor) tags += '<span class="prop-tag">Этаж ' + escapeHtml(props.floor) + '</span>';
    } else if (e.type_name === 'company') {
      if (props.inn) tags += '<span class="prop-tag">ИНН ' + escapeHtml(props.inn) + '</span>';
      if (props.contact_person) tags += '<span class="prop-tag">' + escapeHtml(props.contact_person) + '</span>';
      if (props.phone) tags += '<span class="prop-tag">' + escapeHtml(props.phone) + '</span>';
    } else if (e.type_name === 'land_plot') {
      if (props.cadastral_number) tags += '<span class="prop-tag">' + escapeHtml(props.cadastral_number) + '</span>';
      if (props.area) tags += '<span class="prop-tag">' + Number(props.area).toLocaleString('ru-RU') + ' м²</span>';
      if (props.purpose) tags += '<span class="prop-tag" style="color:var(--text-secondary);font-size:11px">' + escapeHtml(props.purpose.length > 40 ? props.purpose.substring(0,40) + '…' : props.purpose) + '</span>';
    } else if (e.type_name === 'act') {
      if (props.act_date) tags += '<span class="prop-tag">' + escapeHtml(props.act_date) + '</span>';
      if (props.total_amount) tags += '<span class="prop-tag" style="font-weight:500;color:var(--accent)">' + Number(props.total_amount).toLocaleString('ru-RU') + ' ₽</span>';
      if (props.parent_contract_name) tags += '<span class="prop-tag" style="color:var(--text-secondary)">' + escapeHtml(props.parent_contract_name) + '</span>';
    } else {
      Object.entries(props).forEach(([k, v]) => {
        if (v && String(v).length < 40) tags += '<span class="prop-tag">' + escapeHtml(String(v)) + '</span>';
      });
    }
    // Prepend doc status + ВГО badges for document-type entities
    var _statusPrefix = '';
    if (isContractLike && (props.is_vgo === 'true' || props.is_vgo === true)) {
      _statusPrefix += '<span style="background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap">🔵 ВГО</span>';
    }
    if (props.doc_status) _statusPrefix += (_statusPrefix ? ' ' : '') + _docStatusBadge(props.doc_status);
    if (_statusPrefix) tags = _statusPrefix + (tags ? ' ' + tags : '');
    var isEqBroken = (e.type_name === 'equipment') && _brokenEqIds.has(e.id);
    var isEmergency = (e.type_name === 'equipment') && (props.status === 'Аварийное');
    var cardStyle = isEqBroken ? ' style="border-left:3px solid #dc2626;background:rgba(239,68,68,.06)"'
      : (isEmergency ? ' style="border-left:3px solid #b85c5c;background:rgba(184,92,92,.05)"' : '');
    var nameBadge = isEqBroken ? ' <span class="eq-broken-badge">⚠ Нерабочий</span>'
      : (isEmergency ? ' <span class="eq-emergency-badge">⚠ Авария</span>' : '');
    var titleStyle = (!isEqBroken && isEmergency) ? ' style="color:#b85c5c"' : '';
    html += '<div class="entity-card"' + cardStyle + ' onclick="showEntity(' + e.id + ')">' +
      '<div class="card-header">' +
      '<div class="card-icon" style="background:' + e.color + '20;color:' + e.color + '">' + entityIcon(e.type_name, 20) + '</div>' +
      '<div><div class="card-title"' + titleStyle + '>' + escapeHtml(e.name) + nameBadge + '</div>' +
      '<div class="card-type">' + e.type_name_ru + (e.parent_name ? ' · ' + escapeHtml(e.parent_name) : '') + '</div></div>' +
      '</div>' +
      (tags ? '<div class="card-props">' + tags + '</div>' : '') +
      '</div>';
  });
  html += '</div>';
  content.innerHTML = html;
  renderIcons();
}

let searchTimeout;
async function searchEntities(q) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const url = '/entities?' + (currentTypeFilter ? 'type=' + currentTypeFilter + '&' : '') + 'search=' + encodeURIComponent(q);
    const entities = await api(url);
    _listCurrentEntities = Array.isArray(entities) ? entities : [];
    _renderListCurrent();
  }, 300);
}

// ============ ENTITY DETAIL ============

var _allEntitiesForParent = [];

function showEntityDetail(id) { return showEntity(id, true); }


`;
