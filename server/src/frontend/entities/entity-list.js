module.exports = `

// navigation/auth/init functions moved to pages/nav.js

// map page functions moved to pages/map-page.js

// dashboard functions moved to pages/dashboard.js

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
  document.getElementById('topActions').innerHTML =
    '<input class="search-bar" placeholder="Поиск..." oninput="searchEntities(this.value)">' + createBtn;

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
  renderEntityGrid(entities);
}

function renderEntityGrid(entities) {
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
    renderEntityGrid(entities);
  }, 300);
}

// ============ ENTITY DETAIL ============

var _allEntitiesForParent = [];

function showEntityDetail(id) { return showEntity(id, true); }


`;
