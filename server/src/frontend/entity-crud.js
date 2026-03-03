module.exports = `function collectAllRentObjects() {
  var objects = [];
  document.querySelectorAll('.rent-object-block').forEach(function(block) {
    var idx = block.id.replace('rent_obj_', '');
    objects.push(collectRentObjectData(idx));
  });
  return objects;
}

function recalcRentMonthly() {
  var total = 0;
  var objects = collectAllRentObjects();
  objects.forEach(function(obj, i) {
    var area = 0;
    if (obj.calc_mode === 'fixed') {
      total += parseFloat(obj.fixed_rent) || 0;
    } else {
      // Get area from room registry if room_id exists
      var room = _getRoomById(obj.room_id);
      area = room ? (parseFloat((room.properties || {}).area) || 0) : (parseFloat(obj.area) || 0);
      var rate = parseFloat(obj.rent_rate) || 0;
      total += area * rate;
      // Update monthly display
      var monthlyEl = document.getElementById('ro_monthly_' + i);
      if (monthlyEl) monthlyEl.textContent = (area * rate > 0) ? '= ' + _fmtNum(area * rate) + ' руб/мес' : '';
    }
  });
  // Add extra services
  var extraCost = document.getElementById('f_extra_services_cost');
  if (extraCost) total += parseFloat(extraCost.value) || 0;

  var rentEl = document.getElementById('f_rent_monthly');
  if (rentEl) rentEl.value = total > 0 ? total.toFixed(2) : '';
  updateVatDisplay();
}

function _autoFillNetRate(rentRateEl) {
  var idx = rentRateEl.dataset.idx;
  var blk = document.getElementById('rent_obj_' + idx);
  if (!blk) return;
  var netEl = blk.querySelector('.ro-field[data-name="net_rate"]');
  if (netEl && !netEl._netManual) {
    netEl.value = rentRateEl.value;
  }
}

function onPowerAllocationToggle() {
  var cb = document.getElementById('f_has_power_allocation');
  var fields = document.getElementById('power_allocation_fields');
  if (fields) fields.style.display = (cb && cb.checked) ? '' : 'none';
}

function onRentFieldChange() {
  // Collect current state and re-render
  var container = document.getElementById('dynamicFieldsContainer');
  if (!container) return;
  var contractType = getSelectedContractType();
  var allFields = CONTRACT_TYPE_FIELDS[contractType] || CONTRACT_TYPE_FIELDS['Аренды'] || [];
  var currentProps = {};

  // Collect rent objects and comments
  currentProps.rent_objects = collectAllRentObjects();
  currentProps.rent_comments = collectComments();
  // Collect power allocation
  var _paCb = document.getElementById('f_has_power_allocation');
  currentProps.has_power_allocation = _paCb ? String(_paCb.checked) : 'false';
  var _paKw = document.getElementById('f_power_allocation_kw');
  currentProps.power_allocation_kw = _paKw ? _paKw.value : '';

  // Collect other fields
  allFields.forEach(function(f) {
    if (f.name === 'rent_objects' || f.name === 'rent_comments') return;
    if (f.field_type === 'equipment_list') {
      // Preserve current equipment list before re-render
      var eqItems = getEqListValue();
      currentProps[f.name] = eqItems.length > 0 ? JSON.stringify(eqItems) : '';
      return;
    }
    if (f.field_type === 'checkbox') {
      var cb = document.getElementById('f_' + f.name);
      currentProps[f.name] = cb ? String(cb.checked) : 'false';
    } else {
      var el = document.getElementById('f_' + f.name);
      currentProps[f.name] = el ? el.value || '' : '';
    }
  });
  renderRentFields(container, allFields, currentProps);
  _srchInitAll();
}

function enableEquipmentTransfer() {
  var cb = document.getElementById('f_transfer_equipment');
  if (cb) { cb.checked = true; onRentFieldChange(); }
}

function disableEquipmentTransfer() {
  var cb = document.getElementById('f_transfer_equipment');
  if (cb) { cb.checked = false; onRentFieldChange(); }
}

function updateVatDisplay() {
  var rentEl = document.getElementById('f_rent_monthly');
  var vatEl = document.getElementById('f_vat_rate');
  var display = document.getElementById('vat_display');
  if (!display) return;
  var rent = parseFloat(rentEl ? rentEl.value : 0) || 0;
  var vat = parseFloat(vatEl ? vatEl.value : 22) || 0;
  if (rent > 0 && vat > 0) {
    var vatAmount = rent * vat / (100 + vat);
    display.textContent = 'в т.ч. НДС (' + vat + '%) = ' + _fmtNum(vatAmount) + ' руб.';
  } else {
    display.textContent = '';
  }
}

function collectEntityIds(properties) {
  // Map select element → id field + name field
  var mappings = [
    { selectId: 'f_our_legal_entity', idProp: 'our_legal_entity_id', nameProp: 'our_legal_entity', list: _ownCompanies },
    { selectId: 'f_contractor_name', idProp: 'contractor_id', nameProp: 'contractor_name', list: _allCompanies },
    { selectId: 'f_subtenant_name', idProp: 'subtenant_id', nameProp: 'subtenant_name', list: _allCompanies },
  ];
  mappings.forEach(function(m) {
    var el = document.getElementById(m.selectId);
    if (!el || !el.value || el.value === '__new__') return;
    var entId = parseInt(el.value);
    if (entId) {
      properties[m.idProp] = entId;
      var ent = m.list.find(function(e) { return e.id === entId; });
      if (ent) properties[m.nameProp] = ent.name;
    }
  });
}

function collectEquipmentIds(properties) {
  var el = document.getElementById('f_balance_owner');
  if (!el || !el.value || el.value === '__new__') return;
  var entId = parseInt(el.value);
  if (entId) {
    properties.balance_owner_id = entId;
    var ent = _ownCompanies.find(function(c) { return c.id === entId; });
    if (ent) properties.balance_owner_name = ent.name;
    // delete plain text field to avoid duplication
    delete properties.balance_owner;
  }
}

// ============ ENTITY SELECT HANDLERS ============

function onEntitySelectChange(fieldName) {
  var el = document.getElementById('f_' + fieldName);
  var customEl = document.getElementById('f_' + fieldName + '_custom');
  if (!el) return;
  if (customEl) {
    customEl.style.display = (el.value === '__new__') ? '' : 'none';
    if (el.value === '__new__') { customEl.value = ''; customEl.focus(); }
  }
}

function onEntityCustomKeydown(event, input) {
  if (event.key === 'Enter') {
    event.preventDefault();
    onEntityCustomConfirm(input.dataset.field);
  }
}

function onEntityCustomConfirm(fieldName) {
  var el = document.getElementById('f_' + fieldName);
  var customEl = document.getElementById('f_' + fieldName + '_custom');
  if (!el || !customEl) return;
  if (el.value !== '__new__') return;
  var name = customEl.value.trim();
  if (!name) return; // empty — keep visible, user still typing

  var entityType = 'company';
  if (fieldName === 'building' || fieldName === 'building_id') entityType = 'building';
  else if (fieldName === 'room' || fieldName === 'room_id') entityType = 'room';

  var typeObj = entityTypes.find(function(t) { return t.name === entityType; });
  if (!typeObj) return;

  var props = {};
  if (entityType === 'company' && fieldName === 'our_legal_entity') props.is_own = 'true';

  // Fuzzy duplicate check for companies
  if (entityType === 'company') {
    var nameL = name.toLowerCase().replace(/[.,s"«»]+/g, ' ').trim();
    var similar = _allCompanies.filter(function(c) {
      var cL = c.name.toLowerCase().replace(/[.,s"«»]+/g, ' ').trim();
      return cL === nameL || cL.indexOf(nameL) >= 0 || nameL.indexOf(cL) >= 0;
    });
    if (similar.length > 0) {
      var names = similar.map(function(c) { return c.name; }).join(', ');
      if (!confirm('Найдены похожие компании: ' + names + '\\n\\nВсё равно создать «' + name + '»?')) {
        customEl.disabled = false;
        return;
      }
    }
  }

  // Disable input while creating
  customEl.disabled = true;

  api('/entities', {
    method: 'POST',
    body: JSON.stringify({ entity_type_id: typeObj.id, name: name, properties: props })
  }).then(function(newEntity) {
    // Update caches
    clearEntityCache();
    if (entityType === 'company') {
      _allCompanies.push(newEntity);
      if (props.is_own === 'true') _ownCompanies.push(newEntity);
    } else if (entityType === 'building') {
      _buildings.push(newEntity);
    } else if (entityType === 'room') {
      _rooms.push(newEntity);
    }
    // Handle both <select> and searchable <input type="hidden">
    if (el.tagName === 'SELECT') {
      var opt = document.createElement('option');
      opt.value = newEntity.id;
      opt.textContent = name;
      opt.selected = true;
      var newOpt = el.querySelector('option[value="__new__"]');
      el.insertBefore(opt, newOpt);
      el.value = String(newEntity.id);
    } else {
      el.value = String(newEntity.id);
      var txtEl = document.getElementById('f_' + fieldName + '_text');
      if (txtEl) txtEl.value = name;
    }
    customEl.style.display = 'none';
    customEl.disabled = false;
  }).catch(function(err) {
    alert('Ошибка: ' + (err.message || err));
    el.value = '';
    customEl.style.display = 'none';
    customEl.disabled = false;
  });
}

// ============ CONTRACT PARTY ROLES ============

var CONTRACT_ROLES = {
  'Подряда':     { our: 'Заказчик',      contractor: 'Подрядчик' },
  'Аренды':      { our: 'Арендодатель',   contractor: 'Арендатор' },
  'Аренда оборудования': { our: 'Арендодатель', contractor: 'Арендатор' },
  'Субаренды':   { our: 'Арендодатель',   contractor: 'Арендатор', hasSubtenant: true },
  'Услуг':       { our: 'Заказчик',      contractor: 'Исполнитель' },
  'Поставки':    { our: 'Покупатель',    contractor: 'Поставщик' },
  'Обслуживания': { our: 'Заказчик',      contractor: 'Исполнитель' },
  'Эксплуатации': { our: 'Заказчик',      contractor: 'Исполнитель' },  // backward compat
  'Купли-продажи':{ our: 'Покупатель',   contractor: 'Продавец' },
  'Цессии':      { our: 'Цедент',        contractor: 'Цессионарий' },
};

var _contractFormTypeName = '';
var _contractFormFields = [];
var _contractFormProps = {};

var _ownCompanies = [];
var _allCompanies = [];
var _brokenEqIds = new Set(); // equipment IDs marked broken/emergency in their latest act
var _buildings = [];
var _rooms = [];
var _equipment = [];
var _landPlots = [];
var _landPlotParts = [];

async function loadEntityLists() {
  _ownCompanies = await loadEntitiesByType('company', 'is_own=true');
  _allCompanies = await loadEntitiesByType('company');
  _buildings = await loadEntitiesByType('building');
  _rooms = await loadEntitiesByType('room');
  _equipment = await loadEntitiesByType('equipment');
  _landPlots = await loadEntitiesByType('land_plot');
  _landPlotParts = await loadEntitiesByType('land_plot_part');
  loadBrokenEquipment(); // background load, no await
}

async function loadBrokenEquipment() {
  try {
    var ids = await api('/reports/broken-equipment');
    _brokenEqIds = new Set(ids.map(function(id) { return parseInt(id); }));
  } catch(e) { /* non-fatal */ }
}

function renderContractFormFields(fields, props, headerHtml) {
  _contractFormFields = fields;
  _contractFormProps = props || {};
  var contractType = props.contract_type || '';
  var roles = CONTRACT_ROLES[contractType] || { our: 'Наше юр. лицо', contractor: 'Контрагент' };

  var html = headerHtml || '';

  fields.forEach(function(f) {
    var val = props[f.name] || '';
    var ef = f;

    // contract_type — first, with onchange
    if (f.name === 'contract_type') {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
      return;
    }

    // Role label + entity selector — on one row
    if (f.name === 'our_role_label') {
      // Defer: rendered together with our_legal_entity
      return;
    }
    if (f.name === 'our_legal_entity') {
      var ourDefaultRole = roles.our;
      var ourRoleVal = props.our_role_label || ourDefaultRole;
      var ourLabel = (props.our_role_label || roles.our);
      html += '<div style="display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:end;margin-bottom:14px">';
      html += '<div id="wrap_our_role_label"><label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">Роль нашей стороны</label>' +
        '<input id="f_our_role_label" value="' + escapeHtml(ourRoleVal) + '" placeholder="' + escapeHtml(ourDefaultRole) + '" data-auto-set="true" style="font-size:12px;color:var(--text-secondary);width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius)"></div>';
      html += '<div id="wrap_our_legal_entity"><label id="label_our_legal_entity" style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">' + escapeHtml(ourLabel) + '</label>' +
        renderSearchableSelect('f_our_legal_entity', _ownCompanies, props.our_legal_entity_id, props.our_legal_entity || '', 'начните вводить...', 'our_legal_entity') + '</div>';
      html += '</div>';
      return;
    }
    if (f.name === 'contractor_role_label') {
      // Defer: rendered together with contractor_name
      return;
    }
    if (f.name === 'contractor_name') {
      var contrDefaultRole = roles.contractor;
      var contrRoleVal = props.contractor_role_label || contrDefaultRole;
      var contrLabel = (props.contractor_role_label || roles.contractor);
      html += '<div style="display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:end;margin-bottom:14px">';
      html += '<div id="wrap_contractor_role_label"><label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">Роль контрагента</label>' +
        '<input id="f_contractor_role_label" value="' + escapeHtml(contrRoleVal) + '" placeholder="' + escapeHtml(contrDefaultRole) + '" data-auto-set="true" style="font-size:12px;color:var(--text-secondary);width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius)"></div>';
      html += '<div id="wrap_contractor_name"><label id="label_contractor_name" style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">' + escapeHtml(contrLabel) + '</label>' +
        renderSearchableSelect('f_contractor_name', _allCompanies, props.contractor_id, props.contractor_name || '', 'начните вводить...', 'contractor_name') + '</div>';
      html += '</div>';
      return;
    }

    // subtenant — searchable selector, only for Субаренды
    if (f.name === 'subtenant_name') {
      var show = (contractType === 'Субаренды') || (roles.hasSubtenant);
      html += '<div class="form-group" id="wrap_subtenant_name" style="' + (show ? '' : 'display:none') + '"><label>Субарендатор</label>' +
        renderSearchableSelect('f_subtenant_name', _allCompanies, props.subtenant_id, '', 'начните вводить...', 'subtenant_name') + '</div>';
      return;
    }

    // Skip fields already covered by CONTRACT_TYPE_FIELDS for this type (e.g. vat_rate for Аренды)
    var ctTypeFields = CONTRACT_TYPE_FIELDS[contractType] || [];
    if (ctTypeFields.find(function(cf) { return cf.name === f.name; })) return;

    // Duration fields — handled by renderDurationSection for contracts, shown as regular fields for supplements
    if (_contractFormTypeName !== 'supplement') {
      if (f.name === 'contract_end_date' || f.name === 'duration_type' || f.name === 'duration_date' || f.name === 'duration_text') return;
    }

    // Hide payment_frequency and sale_item_type for Аренды/Субаренды
    var _isRentalType = (contractType === 'Аренды' || contractType === 'Субаренды' || contractType === 'Аренда оборудования');
    if (_isRentalType && (f.name === 'payment_frequency' || f.name === 'sale_item_type')) return;

    // Default vat_rate to 22; hide for rent types (rendered in renderRentFields instead)
    if (f.name === 'vat_rate' && _isRentalType) return;
    if (f.name === 'vat_rate' && !val) val = '22';

    // Regular fields
    html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
  });

  html += '<div id="dynamicFieldsContainer"></div>';

  // Determine typeName for submit button
  var isSupp = fields.some(function(f) { return f.name === 'changes_description'; });
  var typeName = isSupp ? 'supplement' : 'contract';
  if (_contractFormTypeName) typeName = _contractFormTypeName;

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreate(\\''+typeName+'\\')">Создать</button></div>';

  setModalContent(html);
  _srchInitAll(); // init searchable selects

  // Attach contract_type change handler
  var ctEl = document.getElementById('f_contract_type');
  if (ctEl) {
    ctEl.addEventListener('change', function() { onContractTypeChange(); });
    var ctCustom = document.getElementById('f_contract_type_custom');
    if (ctCustom) ctCustom.addEventListener('input', function() { onContractTypeChange(); });
  }

  // Attach manual edit handlers on role labels
  var ourRoleEl = document.getElementById('f_our_role_label');
  if (ourRoleEl) ourRoleEl.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });
  var contrRoleEl = document.getElementById('f_contractor_role_label');
  if (contrRoleEl) contrRoleEl.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });

  // Render dynamic fields if contract_type already set
  if (contractType) {
    renderDynamicFields(contractType, props);
  }
}

function getSelectedContractType() {
  var ctEl = document.getElementById('f_contract_type');
  if (!ctEl) return '';
  if (ctEl.value === '__custom__') {
    var ctCustom = document.getElementById('f_contract_type_custom');
    return ctCustom ? ctCustom.value : '';
  }
  return ctEl.value || '';
}

function onContractTypeChange() {
  var contractType = getSelectedContractType();
  var roles = CONTRACT_ROLES[contractType] || { our: 'Наше юр. лицо', contractor: 'Контрагент' };

  // Update role label inputs (only if auto-set, not manually edited)
  var ourRoleEl = document.getElementById('f_our_role_label');
  if (ourRoleEl && ourRoleEl.getAttribute('data-auto-set') !== 'false') {
    ourRoleEl.value = roles.our;
    ourRoleEl.placeholder = roles.our;
  }

  var contrRoleEl = document.getElementById('f_contractor_role_label');
  if (contrRoleEl && contrRoleEl.getAttribute('data-auto-set') !== 'false') {
    contrRoleEl.value = roles.contractor;
    contrRoleEl.placeholder = roles.contractor;
  }

  // Update labels on the entity fields
  updatePartyLabels();

  // Show/hide subtenant
  var subWrap = document.getElementById('wrap_subtenant_name');
  if (subWrap) {
    subWrap.style.display = (contractType === 'Субаренды') ? '' : 'none';
  }

  // Render dynamic fields
  renderDynamicFields(contractType, {});
}

function updatePartyLabels() {
  var ourRoleEl = document.getElementById('f_our_role_label');
  var contrRoleEl = document.getElementById('f_contractor_role_label');
  var ourLabel = document.getElementById('label_our_legal_entity');
  var contrLabel = document.getElementById('label_contractor_name');
  if (ourLabel && ourRoleEl) ourLabel.textContent = ourRoleEl.value || 'Наше юр. лицо';
  if (contrLabel && contrRoleEl) contrLabel.textContent = contrRoleEl.value || 'Контрагент';
}

function collectDynamicFieldValues(contractType) {
  const extraFields = CONTRACT_TYPE_FIELDS[contractType] || [];
  const result = {};
  extraFields.forEach(function(f) {
    if (f.field_type === 'equipment_rent_items') {
      var eqItems = collectEquipmentRentItems();
      result[f.name] = JSON.stringify(eqItems);
    } else if (f.field_type === 'contract_items' || f.field_type === 'contract_items_sale') {
      var items = getContractItemsValue();
      if (items !== null) {
        result[f.name] = JSON.stringify(items);
        // Auto-calculate total
        var total = 0;
        items.forEach(function(item) { total += parseFloat(item.amount) || 0; });
        result.contract_amount = total > 0 ? String(total) : (result.contract_amount || '');
      }
    } else {
      result[f.name] = getFieldValue(f);
    }
  });
  // Collect duration section values (always present for all contract types)
  var durType = document.getElementById('f_duration_type');
  var durDate = document.getElementById('f_duration_date');
  var durText = document.getElementById('f_duration_text');
  if (durType) result.duration_type = durType.value;
  if (durDate) {
    result.contract_end_date = durDate.value;
    result.duration_date = durDate.value;
  }
  if (durText) result.duration_text = durText.value;
  // Auto-calculate external_rental: true if contractor is not one of our companies
  var _extEl = document.getElementById('f_external_rental');
  if (_extEl) {
    var contrId = document.getElementById('f_contractor_name');
    var contrVal = contrId ? contrId.value : '';
    var isExternal = true;
    if (contrVal) {
      var contrComp = (_ownCompanies || []).find(function(c) { return c.id === parseInt(contrVal); });
      if (contrComp) isExternal = false;
    }
    result.external_rental = String(isExternal);
  }
  // Power allocation (Аренды/Субаренды)
  var _paCb2 = document.getElementById('f_has_power_allocation');
  if (_paCb2) {
    result.has_power_allocation = String(_paCb2.checked);
    var _paKw2 = document.getElementById('f_power_allocation_kw');
    if (_paCb2.checked && _paKw2 && _paKw2.value) result.power_allocation_kw = _paKw2.value;
  }
  return result;
}

async function api(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  const r = await fetch(API + url, { ...opts, headers });
  if (r.status === 401 && REFRESH) {
    const ref = await fetch(API + '/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: REFRESH })
    });
    if (ref.ok) {
      const data = await ref.json();
      TOKEN = data.accessToken;
      localStorage.setItem('accessToken', TOKEN);
      headers['Authorization'] = 'Bearer ' + TOKEN;
      const r2 = await fetch(API + url, { ...opts, headers });
      return r2.json();
    } else {
      logout();
      return {};
    }
  }
  if (r.status === 401) { logout(); return {}; }
  if (!r.ok) {
    const errData = await r.json().catch(() => ({ error: 'Ошибка сервера' }));
    const err = new Error(errData.error || 'Ошибка');
    err.status = r.status;
    err.data = errData;
    if (r.status !== 409) alert(errData.error || 'Ошибка');
    throw err;
  }
  return r.json();
}

function showLegalZachety() {
  setActiveNav('legal-zachety');
  var content = document.getElementById('content');
  content.innerHTML = '<div style="padding:24px;max-width:1200px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">' +
    '<h2 style="font-size:20px;font-weight:700">⚖️ Зачёты с ПАО</h2>' +
    '<button class="btn btn-primary" onclick="addZachet()"><i data-lucide="plus" class="lucide" style="width:14px;height:14px"></i> Добавить</button>' +
    '</div>' +
    '<div id="zachetyContent"><div style="padding:40px;text-align:center;color:var(--text-muted)">Загрузка...</div></div>' +
    '</div>';
  if (window.lucide) lucide.createIcons();
  loadZachety();
}

async function loadZachety() {
  try {
    var data = await api('/legal/zachety');
    var el = document.getElementById('zachetyContent');
    if (!data || !Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">' +
        '<div style="font-size:48px;margin-bottom:16px">⚖️</div>' +
        '<p style="font-size:16px;margin-bottom:8px">Нет записей</p>' +
        '<p style="font-size:13px">Нажмите «Добавить» чтобы создать первый зачёт</p></div>';
      return;
    }
    var html = '';
    data.forEach(function(z) {
      var dateStr = z.date ? new Date(z.date).toLocaleDateString('ru') : '—';
      var ipOwes = z.before_ip_owes ? Number(z.before_ip_owes).toLocaleString('ru', {minimumFractionDigits:2}) + ' ₽' : '—';
      var paoOwes = z.before_pao_owes ? Number(z.before_pao_owes).toLocaleString('ru', {minimumFractionDigits:2}) + ' ₽' : '—';
      var zachet = z.zachet_amount ? Number(z.zachet_amount).toLocaleString('ru', {minimumFractionDigits:2}) + ' ₽' : '—';
      html += '<div onclick="showZachetDetail(' + z.id + ')" style="background:var(--bg-card);border-radius:10px;padding:16px;margin-bottom:12px;cursor:pointer;box-shadow:var(--shadow);position:relative">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<span style="font-size:13px;color:var(--text-muted)">' + dateStr + '</span>' +
        '<button class="btn" style="padding:2px 8px;font-size:11px;position:absolute;top:12px;right:12px" onclick="event.stopPropagation();deleteZachet(' + z.id + ')">✕</button></div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted);font-size:13px">ИП → ПАО</span><span style="font-weight:600">' + ipOwes + '</span></div>' +
        '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted);font-size:13px">ПАО → ИП</span><span style="font-weight:600">' + paoOwes + '</span></div>' +
        '<div style="border-top:1px solid var(--border);padding-top:8px;display:flex;justify-content:space-between"><span style="color:var(--accent);font-weight:700;font-size:13px">Сумма зачёта</span><span style="font-weight:700;color:var(--accent);font-size:16px">' + zachet + '</span></div>' +
        '</div></div>';
    });
    el.innerHTML = html;
  } catch (e) {
    document.getElementById('zachetyContent').innerHTML = '<div style="color:var(--red);padding:20px">Ошибка загрузки: ' + (e.message || e) + '</div>';
  }
}

function addZachet(editData) {
  var isEdit = !!editData;
  var content = document.getElementById('zachetyContent');
  var lines = editData ? editData.lines || [] : [];

  function getLines(section, direction) {
    var ll = lines.filter(function(l) { return l.section === section && l.direction === direction; });
    return ll.length ? ll : [{ contract_name: '', amount: '' }];
  }

  var bIp = getLines('before', 'ip_owes_pao');
  var bPao = getLines('before', 'pao_owes_ip');
  var aIp = getLines('after', 'ip_owes_pao');
  var aPao = getLines('after', 'pao_owes_ip');

  function renderLineRows(containerId, items) {
    return items.map(function(item, i) {
      return '<div class="z-line-row" style="display:flex;gap:8px;align-items:center;margin-bottom:6px">' +
        '<input class="z-contract" placeholder="Договор-основание" value="' + (item.contract_name || '').replace(/"/g, '&quot;') + '" style="flex:2" onfocus="suggestContracts(this)">' +
        '<input class="z-amount" type="text" inputmode="decimal" placeholder="Сумма" value="' + formatAmountDisplay(item.amount) + '" style="flex:1" oninput="recalcTotals()">' +
        (i === 0 ? '<button class="btn" style="padding:4px 10px;font-size:16px;flex-shrink:0" onclick="addLineRow(this.parentElement.parentElement)" title="Добавить строку">+</button>' : '<button class="btn" style="padding:4px 10px;font-size:16px;flex-shrink:0;color:var(--red)" onclick="this.parentElement.remove();recalcTotals()" title="Удалить строку">✕</button>') +
        '</div>';
    }).join('');
  }

  var sectionStyle = 'background:var(--bg);border-radius:10px;padding:16px;margin-bottom:16px';
  var labelStyle = 'font-weight:600;margin-bottom:8px;font-size:13px;color:var(--text-muted)';
  var dirStyle = 'margin-bottom:12px';

  content.innerHTML = '<div style="max-width:700px;background:var(--bg-card);border-radius:12px;padding:24px;box-shadow:var(--shadow)">' +
    '<h3 style="margin-bottom:16px">' + (isEdit ? 'Редактирование зачёта' : 'Новый зачёт') + '</h3>' +
    '<div style="margin-bottom:16px">' +
    '<div class="form-group" style="max-width:200px"><label>Дата</label><input id="zDate" type="date" value="' + (editData && editData.date ? editData.date.substring(0, 10) : '') + '"></div></div>' +

    // Section 1: До зачёта
    '<div style="' + sectionStyle + '">' +
    '<div style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--accent)">📋 До зачёта</div>' +
    '<div style="' + dirStyle + '">' +
    '<div style="' + labelStyle + '">Инд.парк должен ПАО</div>' +
    '<div id="before_ip_owes_pao">' + renderLineRows('before_ip_owes_pao', bIp) + '</div>' +
    '<div style="text-align:right;font-size:13px;color:var(--text-muted)">Итого: <b id="total_before_ip">0</b> ₽</div></div>' +
    '<div style="' + dirStyle + '">' +
    '<div style="' + labelStyle + '">ПАО должно Инд.Парку</div>' +
    '<div id="before_pao_owes_ip">' + renderLineRows('before_pao_owes_ip', bPao) + '</div>' +
    '<div style="text-align:right;font-size:13px;color:var(--text-muted)">Итого: <b id="total_before_pao">0</b> ₽</div></div>' +
    '</div>' +

    // Section 2: Зачёт
    '<div style="' + sectionStyle + ';border:2px solid var(--accent)">' +
    '<div style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--accent)">⚖️ Сумма зачёта</div>' +
    '<div class="form-group"><input id="zZachetAmount" type="text" inputmode="decimal" placeholder="Сумма зачёта" value="' + formatAmountDisplay(editData ? editData.zachet_amount : '') + '" style="font-size:20px;font-weight:700;text-align:center" oninput="recalcTotals()"></div>' +
    '</div>' +

    // Section 3: После зачёта
    '<div style="' + sectionStyle + '">' +
    '<div style="font-size:15px;font-weight:700;margin-bottom:12px;color:#10b981">📋 После зачёта</div>' +
    '<div style="' + dirStyle + '">' +
    '<div style="' + labelStyle + '">Инд.парк должен ПАО</div>' +
    '<div id="after_ip_owes_pao">' + renderLineRows('after_ip_owes_pao', aIp) + '</div>' +
    '<div style="text-align:right;font-size:13px;color:var(--text-muted)">Итого: <b id="total_after_ip">0</b> ₽</div></div>' +
    '<div style="' + dirStyle + '">' +
    '<div style="' + labelStyle + '">ПАО должно Инд.Парку</div>' +
    '<div id="after_pao_owes_ip">' + renderLineRows('after_pao_owes_ip', aPao) + '</div>' +
    '<div style="text-align:right;font-size:13px;color:var(--text-muted)">Итого: <b id="total_after_pao">0</b> ₽</div></div>' +
    '</div>' +

    '<div style="' + sectionStyle + ';border:2px solid var(--text-muted);text-align:center;padding:12px">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:4px;color:var(--text-muted)">🔍 Проверка: (до зачёта) − (после зачёта) = сумма зачёта (по каждой стороне)</div>' +
    '<div id="zCheckResult" style="font-size:15px"></div></div>' +
    '<div class="form-group"><label>Комментарий</label><textarea id="zComment" rows="2" placeholder="Примечания">' + (editData ? (editData.comment || '') : '') + '</textarea></div>' +
    '<div id="zMsg" style="color:var(--red);font-size:13px;margin-bottom:8px"></div>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn btn-primary" onclick="saveZachet(' + (isEdit ? editData.id : 'null') + ')">Сохранить</button>' +
    '<button class="btn" onclick="loadZachety()">Отмена</button></div></div>';

  // Add input listeners for recalc
  document.querySelectorAll('.z-amount').forEach(function(el) { el.addEventListener('input', recalcTotals); });
  initAmountFormatting();
  recalcTotals();
}

function addLineRow(container) {
  var row = document.createElement('div');
  row.className = 'z-line-row';
  row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px';
  row.innerHTML = '<input class="z-contract" placeholder="Договор-основание" style="flex:2" onfocus="suggestContracts(this)">' +
    '<input class="z-amount" type="text" inputmode="decimal" placeholder="Сумма" style="flex:1" oninput="recalcTotals()">' +
    '<button class="btn" style="padding:4px 10px;font-size:16px;flex-shrink:0;color:var(--red)" onclick="this.parentElement.remove();recalcTotals()" title="Удалить строку">✕</button>';
  container.appendChild(row);
  initAmountFormatting();
  row.querySelector('.z-contract').focus();
}

function recalcTotals() {
  var totals = {};
  ['before_ip_owes_pao', 'before_pao_owes_ip', 'after_ip_owes_pao', 'after_pao_owes_ip'].forEach(function(id) {
    var container = document.getElementById(id);
    if (!container) return;
    var total = 0;
    container.querySelectorAll('.z-amount').forEach(function(el) { total += parseAmount(el.value); });
    totals[id] = total;
    var labelMap = { before_ip_owes_pao: 'total_before_ip', before_pao_owes_ip: 'total_before_pao', after_ip_owes_pao: 'total_after_ip', after_pao_owes_ip: 'total_after_pao' };
    var el = document.getElementById(labelMap[id]);
    if (el) el.textContent = total.toLocaleString('ru');
  });

  // Проверка: обе стороны должны уменьшиться ровно на сумму зачёта
  var zachetAmount = parseAmount((document.getElementById('zZachetAmount') || {}).value);
  var diffIp = (totals.before_ip_owes_pao || 0) - (totals.after_ip_owes_pao || 0);
  var diffPao = (totals.before_pao_owes_ip || 0) - (totals.after_pao_owes_ip || 0);
  var errIp = diffIp - zachetAmount;
  var errPao = diffPao - zachetAmount;

  var checkEl = document.getElementById('zCheckResult');
  if (checkEl) {
    if (!zachetAmount && !(totals.before_ip_owes_pao || 0) && !(totals.before_pao_owes_ip || 0)) {
      checkEl.innerHTML = '<span style="color:var(--text-muted)">Заполните данные для проверки</span>';
    } else if (Math.abs(errIp) < 0.01 && Math.abs(errPao) < 0.01) {
      checkEl.innerHTML = '<span style="color:var(--green);font-weight:700">✅ Сходится — обе стороны уменьшились на сумму зачёта</span>';
    } else {
      var msgs = [];
      if (Math.abs(errIp) >= 0.01) msgs.push('ИП→ПАО: разница ' + errIp.toLocaleString('ru', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' ₽');
      if (Math.abs(errPao) >= 0.01) msgs.push('ПАО→ИП: разница ' + errPao.toLocaleString('ru', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' ₽');
      checkEl.innerHTML = '<span style="color:var(--red);font-weight:700">❌ Не сходится (' + msgs.join('; ') + ')</span>';
    }
  }
}

var _contractSuggestTimeout;
function suggestContracts(input) {
  if (input._suggestBound) return;
  input._suggestBound = true;
  input.addEventListener('input', function() {
    clearTimeout(_contractSuggestTimeout);
    var val = input.value.trim();
    if (val.length < 1) { removeSuggestDropdown(input); return; }
    _contractSuggestTimeout = setTimeout(async function() {
      try {
        // Search across all contract-like entities
        var data = await api('/entities?search=' + encodeURIComponent(val) + '&limit=15');
        showSuggestDropdown(input, data, val);
      } catch (e) { console.error(e); }
    }, 250);
  });
}

function showSuggestDropdown(input, items, query) {
  removeSuggestDropdown(input);
  var dd = document.createElement('div');
  dd.className = 'z-suggest-dd';
  dd.style.cssText = 'position:absolute;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:100;max-height:220px;overflow-y:auto;width:' + Math.max(input.offsetWidth, 350) + 'px';

  if (items && items.length > 0) {
    items.forEach(function(e) {
      var num = (e.properties && e.properties.number) || '';
      var typeName = e.type_name_ru || '';
      var label = (num || e.name) + (typeName ? ' (' + typeName + ')' : '');
      var opt = document.createElement('div');
      opt.style.cssText = 'padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--bg);transition:background .1s';
      opt.innerHTML = '<div style="font-weight:600">' + escHtml(num || e.name) + '</div>' +
        (typeName ? '<div style="font-size:11px;color:var(--text-muted)">' + escHtml(typeName) + (e.properties && e.properties.contractor_name ? ' — ' + escHtml(e.properties.contractor_name) : '') + '</div>' : '');
      opt.onmouseenter = function() { opt.style.background = 'var(--bg-hover)'; };
      opt.onmouseleave = function() { opt.style.background = ''; };
      opt.onmousedown = function(ev) {
        ev.preventDefault();
        input.value = num || e.name;
        input.dataset.entityId = e.id;
        removeSuggestDropdown(input);
      };
      dd.appendChild(opt);
    });
  }

  // "Add new" button at bottom
  var addBtn = document.createElement('div');
  addBtn.style.cssText = 'padding:10px 14px;cursor:pointer;font-size:13px;color:var(--accent);font-weight:600;border-top:2px solid var(--bg);display:flex;align-items:center;gap:6px';
  addBtn.innerHTML = '<span style="font-size:16px">+</span> Добавить новый договор';
  addBtn.onmouseenter = function() { addBtn.style.background = 'var(--bg-hover)'; };
  addBtn.onmouseleave = function() { addBtn.style.background = ''; };
  addBtn.onmousedown = function(ev) {
    ev.preventDefault();
    removeSuggestDropdown(input);
    showNewContractForm(input);
  };
  dd.appendChild(addBtn);

  input.parentElement.style.position = 'relative';
  input.parentElement.appendChild(dd);
  dd.style.top = (input.offsetTop + input.offsetHeight + 2) + 'px';
  dd.style.left = input.offsetLeft + 'px';
  setTimeout(function() { document.addEventListener('click', function handler(e) { if (!dd.contains(e.target) && e.target !== input) { removeSuggestDropdown(input); document.removeEventListener('click', handler); } }); }, 100);
}

function removeSuggestDropdown(input) {
  var dd = input.parentElement.querySelector('.z-suggest-dd');
  if (dd) dd.remove();
}

function escHtml(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

async function showNewContractForm(returnInput) {
  // Load all entity types and their field definitions
  var entityTypes = [];
  try { entityTypes = await api('/entity-types'); } catch(e) { console.error(e); }

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';

  var typeOptions = entityTypes.map(function(et) {
    return '<option value="' + et.id + '" data-name="' + escHtml(et.name) + '">' + (et.icon || '') + ' ' + escHtml(et.name_ru) + '</option>';
  }).join('');

  overlay.innerHTML = '<div style="background:var(--bg-card);border-radius:12px;padding:24px;max-width:520px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto">' +
    '<h3 style="margin-bottom:16px">Новый документ</h3>' +
    '<div class="form-group"><label>Тип</label><select id="ncType">' + typeOptions + '</select></div>' +
    '<div class="form-group"><label>Название</label><input id="ncName" placeholder="Название записи"></div>' +
    '<div id="ncDynamicFields" style="margin-top:8px"></div>' +
    '<div id="ncMsg" style="color:var(--red);font-size:13px;margin-bottom:8px"></div>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn btn-primary" id="ncSaveBtn">Сохранить</button>' +
    '<button class="btn" id="ncCancelBtn">Отмена</button>' +
    '</div></div>';

  document.body.appendChild(overlay);

  var typeSelect = overlay.querySelector('#ncType');
  var dynamicFields = overlay.querySelector('#ncDynamicFields');
  var _fieldDefs = {};

  async function loadFieldsForType(typeId) {
    if (_fieldDefs[typeId]) return _fieldDefs[typeId];
    try {
      var fields = await api('/entity-types/' + typeId + '/fields');
      _fieldDefs[typeId] = fields || [];
      return _fieldDefs[typeId];
    } catch(e) { return []; }
  }

  async function updateDynamicFields() {
    var typeId = typeSelect.value;
    var fields = await loadFieldsForType(typeId);
    if (!fields.length) {
      dynamicFields.innerHTML = '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">Нет дополнительных полей для этого типа</div>';
      return;
    }
    var html = '';
    fields.forEach(function(f) {
      var inputHtml = '';
      if (f.field_type === 'date') {
        inputHtml = '<input id="ncf_' + f.name + '" type="date">';
      } else if (f.field_type === 'number') {
        inputHtml = '<input id="ncf_' + f.name + '" type="number" placeholder="0">';
      } else if (f.field_type === 'select' && f.options) {
        var opts = '<option value="">—</option>';
        (Array.isArray(f.options) ? f.options : []).forEach(function(o) { opts += '<option>' + escHtml(o) + '</option>'; });
        inputHtml = '<select id="ncf_' + f.name + '">' + opts + '</select>';
      } else if (f.field_type === 'select_or_custom' && f.options) {
        inputHtml = '<input id="ncf_' + f.name + '" list="ncl_' + f.name + '" placeholder="Выберите или введите">' +
          '<datalist id="ncl_' + f.name + '">' + (Array.isArray(f.options) ? f.options : []).map(function(o) { return '<option value="' + escHtml(o) + '">'; }).join('') + '</datalist>';
      } else if (f.field_type === 'boolean') {
        inputHtml = '<label style="display:flex;align-items:center;gap:6px"><input id="ncf_' + f.name + '" type="checkbox"> Да</label>';
      } else {
        inputHtml = '<input id="ncf_' + f.name + '" placeholder="' + escHtml(f.name_ru || f.name) + '">';
      }
      html += '<div class="form-group"><label>' + escHtml(f.name_ru || f.name) + (f.required ? ' *' : '') + '</label>' + inputHtml + '</div>';
    });
    dynamicFields.innerHTML = html;
  }
  typeSelect.addEventListener('change', updateDynamicFields);
  updateDynamicFields();

  overlay.querySelector('#ncCancelBtn').onclick = function() { overlay.remove(); };
  overlay.querySelector('#ncSaveBtn').onclick = async function() {
    var typeId = parseInt(typeSelect.value);
    var name = overlay.querySelector('#ncName').value.trim();
    var fields = _fieldDefs[typeId] || [];
    var properties = {};

    fields.forEach(function(f) {
      var el = overlay.querySelector('#ncf_' + f.name);
      if (!el) return;
      if (f.field_type === 'boolean') { properties[f.name] = el.checked ? 'true' : 'false'; }
      else if (el.value) { properties[f.name] = el.value; }
    });

    // Auto-generate name if empty
    if (!name) {
      var num = properties.number || '';
      var contractor = properties.contractor_name || properties.cessionary || properties.borrower || '';
      name = (num ? '№' + num : 'Без номера') + (contractor ? ' — ' + contractor : '');
    }

    try {
      var r = await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: typeId, name: name, properties: properties }) });
      if (r.error) { overlay.querySelector('#ncMsg').textContent = r.error; return; }
      returnInput.value = properties.number || name;
      returnInput.dataset.entityId = r.id;
      overlay.remove();
    } catch (e) { overlay.querySelector('#ncMsg').textContent = 'Ошибка: ' + (e.message || e); }
  };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

function parseAmount(str) {
  if (!str && str !== 0) return 0;
  return parseFloat(String(str).replace(/s/g, '').replace(',', '.')) || 0;
}

function formatAmountDisplay(val) {
  if (!val && val !== 0) return '';
  var n = parseFloat(String(val).replace(/s/g, '').replace(',', '.'));
  if (isNaN(n)) return '';
  var parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/B(?=(d{3})+(?!d))/g, ' ');
  return parts.join(',');
}

function formatAmountOnBlur(el) {
  var n = parseAmount(el.value);
  if (!n) return;
  el.value = formatAmountDisplay(n);
}

function initAmountFormatting() {
  document.querySelectorAll('.z-amount, #zZachetAmount').forEach(function(el) {
    if (el._blurBound) return;
    el._blurBound = true;
    el.addEventListener('blur', function() { formatAmountOnBlur(el); });
  });
}

function collectLines() {
  var lines = [];
  ['before_ip_owes_pao', 'before_pao_owes_ip', 'after_ip_owes_pao', 'after_pao_owes_ip'].forEach(function(id) {
    var parts = id.split('_');
    var section = parts[0]; // before or after
    var direction = parts.slice(1).join('_'); // ip_owes_pao or pao_owes_ip
    var container = document.getElementById(id);
    if (!container) return;
    var rows = container.querySelectorAll('.z-line-row');
    rows.forEach(function(row, i) {
      var contract = row.querySelector('.z-contract').value.trim();
      var amount = parseAmount(row.querySelector('.z-amount').value) || null;
      if (contract || amount) {
        lines.push({ section: section, direction: direction, contract_name: contract, amount: amount, sort_order: i });
      }
    });
  });
  return lines;
}

async function saveZachet(editId) {
  var body = {
    number: (document.getElementById('zNum') || {}).value || '',
    date: document.getElementById('zDate').value || null,
    zachet_amount: parseAmount(document.getElementById('zZachetAmount').value) || null,
    status: (document.getElementById('zStatus') || {}).value || 'черновик',
    comment: (document.getElementById('zComment') || {}).value || '',
    lines: collectLines()
  };
  try {
    var r;
    if (editId) {
      r = await api('/legal/zachety/' + editId, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      r = await api('/legal/zachety', { method: 'POST', body: JSON.stringify(body) });
    }
    if (r.error) { document.getElementById('zMsg').textContent = r.error; return; }
    loadZachety();
  } catch (e) { document.getElementById('zMsg').textContent = 'Ошибка: ' + (e.message || e); }
}

async function showZachetDetail(id) {
  try {
    var z = await api('/legal/zachety/' + id);
    addZachet(z);
  } catch (e) { console.error(e); }
}

async function deleteZachet(id) {
  if (!confirm('Удалить зачёт?')) return;
  try {
    await api('/legal/zachety/' + id, { method: 'DELETE' });
    loadZachety();
  } catch (e) { alert('Ошибка: ' + (e.message || e)); }
}

function setActiveNav(name) {
  document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
}

async function showTotpSetup() {
  try {
    var status = await api('/auth/totp/status');
    var content = document.getElementById('content');
    if (status.enabled) {
      content.innerHTML = '<div style="padding:32px;max-width:480px;margin:0 auto">' +
        '<h2 style="margin-bottom:16px">🔐 Двухфакторная аутентификация</h2>' +
        '<div style="background:var(--green);color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:16px">✅ 2FA включена</div>' +
        '<p style="margin-bottom:16px;color:var(--text-muted)">Для отключения введите текущий код из приложения-аутентификатора:</p>' +
        '<div class="form-group"><input id="totpDisableCode" placeholder="123456" maxlength="6" inputmode="numeric" pattern="[0-9]*" style="font-size:24px;text-align:center;letter-spacing:8px"></div>' +
        '<div id="totpMsg" style="color:var(--red);font-size:13px;margin-bottom:8px"></div>' +
        '<button class="btn" style="background:var(--red);color:#fff" onclick="disableTotp()">Отключить 2FA</button>' +
        '</div>';
    } else {
      var setup = await api('/auth/totp/setup');
      content.innerHTML = '<div style="padding:32px;max-width:480px;margin:0 auto">' +
        '<h2 style="margin-bottom:16px">🔐 Настройка 2FA</h2>' +
        '<p style="margin-bottom:16px">Отсканируйте QR-код в приложении <b>Google Authenticator</b>, <b>Authy</b> или <b>1Password</b>:</p>' +
        '<div style="text-align:center;margin-bottom:16px"><img src="' + setup.qrDataUrl + '" style="width:200px;height:200px;border-radius:12px"></div>' +
        '<p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;word-break:break-all">Или введите вручную: <code>' + setup.secret + '</code></p>' +
        '<p style="margin-bottom:8px">Введите 6-значный код из приложения для подтверждения:</p>' +
        '<div class="form-group"><input id="totpVerifyCode" placeholder="123456" maxlength="6" inputmode="numeric" pattern="[0-9]*" style="font-size:24px;text-align:center;letter-spacing:8px" onkeydown="if(event.key===\\'Enter\\')verifyTotp()"></div>' +
        '<div id="totpMsg" style="color:var(--red);font-size:13px;margin-bottom:8px"></div>' +
        '<button class="btn btn-primary" onclick="verifyTotp()">Включить 2FA</button>' +
        '</div>';
    }
  } catch (e) {
    console.error('TOTP setup error:', e);
  }
}

async function verifyTotp() {
  var code = document.getElementById('totpVerifyCode').value.trim();
  var msg = document.getElementById('totpMsg');
  if (!code || code.length !== 6) { msg.textContent = 'Введите 6-значный код'; return; }
  try {
    var r = await api('/auth/totp/verify', { method: 'POST', body: JSON.stringify({ code: code }) });
    if (r.success) {
      msg.style.color = 'var(--green)';
      msg.textContent = '✅ 2FA успешно включена!';
      setTimeout(function() { showTotpSetup(); }, 1500);
    } else {
      msg.textContent = r.error || 'Ошибка';
    }
  } catch (e) { msg.textContent = 'Ошибка: ' + (e.message || e); }
}

async function disableTotp() {
  var code = document.getElementById('totpDisableCode').value.trim();
  var msg = document.getElementById('totpMsg');
  if (!code || code.length !== 6) { msg.textContent = 'Введите 6-значный код'; return; }
  try {
    var r = await api('/auth/totp/disable', { method: 'POST', body: JSON.stringify({ code: code }) });
    if (r.success) {
      msg.style.color = 'var(--green)';
      msg.textContent = '2FA отключена';
      setTimeout(function() { showTotpSetup(); }, 1500);
    } else {
      msg.textContent = r.error || 'Ошибка';
    }
  } catch (e) { msg.textContent = 'Ошибка: ' + (e.message || e); }
}

function logout() {
  TOKEN = null; REFRESH = null; CURRENT_USER = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  showLogin();
}

function showLogin() {
  document.getElementById('sidebar').style.display = 'none';
  document.querySelector('.main').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const totpInput = document.getElementById('loginTotp');
  const totp_code = totpInput ? totpInput.value.trim() : '';
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const body = { username, password };
    if (totp_code) body.totp_code = totp_code;
    const r = await fetch(API + '/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Ошибка'; return; }
    // If TOTP required — show code input
    if (data.requireTotp) {
      document.getElementById('totpGroup').style.display = '';
      document.getElementById('loginTotp').focus();
      errEl.textContent = '';
      return;
    }
    TOKEN = data.accessToken;
    REFRESH = data.refreshToken;
    CURRENT_USER = data.user;
    localStorage.setItem('accessToken', TOKEN);
    localStorage.setItem('refreshToken', REFRESH);
    document.getElementById('loginScreen').style.display = 'none';
    document.querySelector('.app').style.display = 'flex';
    document.getElementById('sidebar').style.display = '';
    document.querySelector('.main').style.display = '';
    startApp();
  } catch (e) {
    console.error('Login error:', e);
    errEl.textContent = 'Ошибка подключения: ' + (e.message || e);
  }
}

async function startApp() {
  if (!CURRENT_USER) {
    try { CURRENT_USER = await api('/auth/me'); } catch (e) { logout(); return; }
  }
  entityTypes = await api('/entity-types');
  relationTypes = await api('/relations/types');
  // Загружаем справочники — единственный источник истины для OBJECT_TYPES, EQUIPMENT_CATEGORIES и т.д.
  try {
    _settingsLists = await api('/entity-types/settings/lists');
    _settingsLists.forEach(function(f) {
      var items = Array.isArray(f.options) ? f.options : [];
      try { if (typeof f.options === 'string') items = JSON.parse(f.options); } catch(ex) {}
      if (f.name === 'object_type') { OBJECT_TYPES.length = 0; items.forEach(function(i){ OBJECT_TYPES.push(i); }); }
      else if (f.name === 'equipment_category') { EQUIPMENT_CATEGORIES.length = 0; items.forEach(function(i){ EQUIPMENT_CATEGORIES.push(i); }); }
      else if (f.name === 'status' && f.entity_type_name === 'equipment') { EQUIPMENT_STATUSES.length = 0; items.forEach(function(i){ EQUIPMENT_STATUSES.push(i); }); }
    });
  } catch(e) { console.warn('Failed to load справочники on startup:', e.message); }
  renderTypeNav();
  // URL routing: #entity/ID opens entity card
  var hash = window.location.hash;
  var _entityHashRe = new RegExp('^#entity/(\\d+)');
  var _hm = hash ? hash.match(_entityHashRe) : null;
  if (_hm) { showEntity(parseInt(_hm[1])); return; }
  showDashboard();
  // menuBtn visibility now handled by CSS media query
}

// Listen for hash changes (e.g. from Metabase links)
window.addEventListener('hashchange', function() {
  var hash = window.location.hash;
  var _entityHashRe2 = new RegExp('^#entity/(\\d+)');
  var _hm2 = hash ? hash.match(_entityHashRe2) : null;
  if (_hm2) showEntity(parseInt(_hm2[1]));
});

// Listen for messages from iframes (e.g. budget-dashboard openEntityCard)
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'openEntity' && event.data.id) {
    showEntity(parseInt(event.data.id));
  }
});

async function init() {
  renderIcons(); // Initialize Lucide icons in static sidebar HTML
  if (TOKEN) {
    document.getElementById('loginScreen').style.display = 'none';
    document.querySelector('.app').style.display = 'flex';
    startApp();
  } else {
    showLogin();
  }
}

// Navigation tree state
var _navParentType = { room: 'building', land_plot_part: 'land_plot' };

function _navGroupHtml(name, iconName, label) {
  return '<div style="margin:0 4px 1px">' +
    '<div class="nav-item" data-type="' + name + '" style="display:flex;align-items:center;padding:0">' +
      '<span id="navArrow_' + name + '" data-group="' + name + '"' +
        ' onclick="event.stopPropagation();toggleNavGroup(this.dataset.group)"' +
        ' style="width:22px;text-align:center;font-size:10px;color:rgba(255,255,255,0.4);cursor:pointer;flex-shrink:0;padding:8px 0">▶</span>' +
      '<span style="flex:1;padding:8px 4px 8px 2px;cursor:pointer;display:flex;align-items:center;gap:8px" data-etype="' + name + '"' +
        ' onclick="showEntityList(this.dataset.etype)">' + icon(iconName) + ' ' + label + '</span>' +
    '</div>' +
    '<div id="navgroup_' + name + '" style="display:none"></div>' +
  '</div>';
}

async function toggleNavGroup(name) {
  var children = document.getElementById('navgroup_' + name);
  var arrow = document.getElementById('navArrow_' + name);
  if (!children) return;
  var isOpen = children.style.display !== 'none';
  children.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
  if (!isOpen && children.innerHTML.trim() === '') {
    children.innerHTML = '<div style="padding:4px 8px 4px 28px;font-size:11px;color:rgba(255,255,255,0.3)">Загрузка...</div>';
    try { await _navLoadGroupChildren(name, children); }
    catch(e) { children.innerHTML = '<div style="padding:4px 8px 4px 28px;font-size:11px;color:rgba(255,255,255,0.3)">Ошибка загрузки</div>'; }
  }
}

async function _navLoadGroupChildren(name, container) {
  var h = '';
  if (name === 'building') {
    var buildings = await api('/entities?type=building');
    // "Все помещения" — всегда первым, чтобы помещения без корпуса были доступны
    h += '<div class="nav-sub-item" data-etype="room" data-title="" onclick="navSubClick(this)" style="color:rgba(255,255,255,0.45);font-style:italic">' +
      '<span style="font-size:9px;color:rgba(255,255,255,0.2)">▸</span> все помещения</div>';
    if (buildings.length === 0) {
      container.innerHTML = h + '<div style="padding:4px 8px 4px 28px;font-size:11px;color:rgba(255,255,255,0.3)">Нет корпусов</div>';
      return;
    }
    buildings.forEach(function(b) {
      h += '<div class="nav-sub-item" data-etype="room" data-parent="' + b.id + '" data-title="' + escapeHtml(b.name) + '" onclick="navSubClick(this)">' +
        '<span style="font-size:9px;color:rgba(255,255,255,0.3)">▸</span> ' + escapeHtml(b.name) + '</div>';
    });
  } else if (name === 'company') {
    h = '<div class="nav-sub-item" data-etype="company" data-isown="true" onclick="navSubClick(this)">' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.3)">▸</span> Наши</div>' +
        '<div class="nav-sub-item" data-etype="company" data-isown="false" data-no1c="true" onclick="navSubClick(this)">' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.3)">▸</span> Сторонние</div>' +
        '<div class="nav-sub-item" data-etype="company" data-isown="false" data-only1c="true" onclick="navSubClick(this)" style="color:rgba(255,255,255,0.35)">' +
          '<span style="font-size:9px;color:rgba(255,255,255,0.2)">▸</span> Из 1С (справочник)</div>';
  } else if (name === 'land_plot') {
    var plots = await api('/entities?type=land_plot');
    // "Все части ЗУ" — всегда первым, аналогично "все помещения" у корпусов
    h += '<div class="nav-sub-item" data-etype="land_plot_part" data-title="" onclick="navSubClick(this)" style="color:rgba(255,255,255,0.45);font-style:italic">' +
      '<span style="font-size:9px;color:rgba(255,255,255,0.2)">▸</span> все части ЗУ</div>';
    if (plots.length === 0) {
      container.innerHTML = h + '<div style="padding:4px 8px 4px 28px;font-size:11px;color:rgba(255,255,255,0.3)">Нет участков</div>';
      return;
    }
    plots.forEach(function(p) {
      h += '<div class="nav-sub-item" data-etype="land_plot_part" data-parent="' + p.id + '" data-title="' + escapeHtml(p.name) + '" onclick="navSubClick(this)">' +
        '<span style="font-size:9px;color:rgba(255,255,255,0.3)">▸</span> ' + escapeHtml(p.name) + '</div>';
    });
  }
  if (name === 'contract') {
    var contractTypes = ['Аренды', 'Субаренды', 'Аренда оборудования', 'Подряда', 'Услуг', 'Купли-продажи', 'Обслуживания'];
    h += '<div class="nav-sub-item" data-etype="contract" onclick="navSubClick(this)" style="color:rgba(255,255,255,0.45);font-style:italic">' +
      '<span style="font-size:9px;color:rgba(255,255,255,0.2)">▸</span> все договоры</div>';
    contractTypes.forEach(function(ct) {
      h += '<div class="nav-sub-item" data-etype="contract" data-contract-type="' + escapeHtml(ct) + '" onclick="navSubClick(this)">' +
        '<span style="font-size:9px;color:rgba(255,255,255,0.3)">▸</span> ' + escapeHtml(ct) + '</div>';
    });
  }
  container.innerHTML = h;
}

function navSubClick(el) {
  document.querySelectorAll('.nav-sub-item').forEach(function(i) { i.classList.remove('active'); });
  el.classList.add('active');
  var type = el.dataset.etype;
  var parentId = el.dataset.parent ? parseInt(el.dataset.parent) : null;
  var isOwn = el.dataset.isown;
  var contractType = el.dataset.contractType || null;
  var opts = {};
  if (parentId) opts.parentId = parentId;
  if (el.dataset.title) opts.subtitle = el.dataset.title;
  if (isOwn === 'true') opts.isOwn = true;
  else if (isOwn === 'false') opts.isOwn = false;
  if (contractType) opts.contractType = contractType;
  if (el.dataset.no1c === 'true') opts.no1c = true;
  if (el.dataset.only1c === 'true') opts.only1c = true;
  showEntityList(type, opts);
}

// Lucide icon mapping for entity types
var ENTITY_TYPE_ICONS = {
  building: 'building-2', workshop: 'warehouse', room: 'door-open',
  land_plot: 'map-pin', land_plot_part: 'map-pin', company: 'landmark',
  contract: 'file-text', supplement: 'paperclip', equipment: 'cog',
  order: 'scroll', document: 'file', crane_track: 'move-horizontal', act: 'file-check'
};
function entityIcon(typeName, size) { return icon(ENTITY_TYPE_ICONS[typeName] || 'file', size); }

function renderTypeNav() {
  const nav = document.getElementById('typeNav');
  const T = function(name) { return entityTypes.find(function(t) { return t.name === name; }) || {name: name, icon: '', name_ru: name}; };

  var html = '<div class="nav-section" style="padding-top:12px">Документы</div>';

  // Документы: договоры (с аккордеоном по типам), ДС, акты, приказы
  html += _navGroupHtml('contract', 'file-text', 'Договоры');
  ['supplement', 'act', 'order'].forEach(function(tn) {
    var t = T(tn);
    html += '<div class="nav-item" data-type="' + tn + '" data-etype="' + tn + '" onclick="showEntityList(this.dataset.etype)">' +
      entityIcon(tn) + ' ' + escapeHtml(t.name_ru || tn) + '</div>';
  });

  // Реестры: корпуса (дерево), компании, ЗУ (дерево), оборудование
  html += '<div class="nav-section" style="margin-top:8px">Реестры</div>';
  html += _navGroupHtml('building', 'building-2', 'Корпуса');
  html += _navGroupHtml('company', 'landmark', 'Компании');
  html += _navGroupHtml('land_plot', 'map-pin', 'Земельные участки');

  var eq = T('equipment');
  html += '<div class="nav-item" data-type="equipment" data-etype="equipment" onclick="showEntityList(this.dataset.etype)">' +
    entityIcon('equipment') + ' ' + escapeHtml(eq.name_ru || 'Оборудование') + '</div>';

  nav.innerHTML = html;
  renderIcons();
}

function setActive(selector) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  if (selector) {
    const el = document.querySelector(selector);
    if (el) el.classList.add('active');
  }
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

// ============ INTERACTIVE MAP ============

var _mapEditMode = false;
var _mapDrawTool  = 'rect';   // 'rect' | 'poly'
var _mapHotspots  = [];       // [{shape, entity_id, entity_name, ...}]
var _mapRectDraw  = null;     // {startX,startY,curX,curY} during rect drag
var _mapPolyPts   = [];       // [[x,y],...] accumulating polygon vertices
var _mapMousePos  = {x:0,y:0};// current cursor on map (% coords)
var _mapZoom      = 1;        // current zoom level
var _mapPanX      = 0;        // pan offset X (px)
var _mapPanY      = 0;        // pan offset Y (px)
var _mapPanDrag   = null;     // {sx,sy} drag origin minus pan offset

async function showMapPage() {
  currentView = 'map';
  currentTypeFilter = null;
  _mapEditMode = false; _mapDrawTool = 'rect'; _mapPolyPts = []; _mapRectDraw = null;
  _mapZoom = 1; _mapPanX = 0; _mapPanY = 0; _mapPanDrag = null;
  setActive('.nav-item[onclick*="showMapPage"]');
  document.getElementById('pageTitle').textContent = 'Карта территории';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';

  var buildings = await api('/entities?type=building');
  var landPlots  = await api('/entities?type=land_plot');
  _mapHotspots = [];
  buildings.concat(landPlots).forEach(function(e) {
    var p = e.properties || {};
    if (p.map_shape === 'polygon' && p.map_points) {
      try { var pts = JSON.parse(p.map_points);
        _mapHotspots.push({ shape:'polygon', entity_id:e.id, entity_name:e.name, short_name:p.short_name||'', type_name:e.type_name, points:pts, color:p.map_color||'rgba(99,102,241,0.35)' });
      } catch(ex) {}
    } else if (p.map_x != null) {
      _mapHotspots.push({ shape:'rect', entity_id:e.id, entity_name:e.name, short_name:p.short_name||'', type_name:e.type_name,
        x:parseFloat(p.map_x), y:parseFloat(p.map_y), w:parseFloat(p.map_w), h:parseFloat(p.map_h), color:p.map_color||'rgba(99,102,241,0.35)' });
    }
  });

  var html = '<div style="padding:16px">';
  html += '<div class="map-editor-bar">';
  html += '<button class="btn btn-sm" id="mapEditBtn" onclick="_mapToggleEdit()">' + icon('pencil',14) + ' Разметить</button>';
  html += '<div style="display:flex;align-items:center;gap:4px;margin-left:8px">';
  html += '<button class="btn btn-sm" onclick="_mapZoomOut()" title="Уменьшить">' + icon('minus',13) + '</button>';
  html += '<span id="mapZoomPct" style="font-size:12px;min-width:36px;text-align:center;color:var(--text-muted)">100%</span>';
  html += '<button class="btn btn-sm" onclick="_mapZoomIn()" title="Увеличить">' + icon('plus',13) + '</button>';
  html += '<button class="btn btn-sm" onclick="_mapZoomReset()" title="Сбросить масштаб" style="padding:4px 6px">' + icon('maximize-2',13) + '</button>';
  html += '</div>';
  html += '<span id="mapEditTools" style="display:none;align-items:center;gap:8px;flex-wrap:wrap">';
  html += '<button class="btn btn-sm btn-primary" id="mapToolRect" onclick="_mapSetTool(\\'rect\\')">' + icon('square',13) + ' Прямоугольник</button>';
  html += '<button class="btn btn-sm" id="mapToolPoly" onclick="_mapSetTool(\\'poly\\')">' + icon('pentagon',13) + ' Многоугольник</button>';
  html += '<span id="mapPolyStatus" style="font-size:12px;color:var(--text-muted);display:none"></span>';
  html += '<button id="mapPolyCancelBtn" class="btn btn-sm" style="display:none" onclick="_mapPolyCancelDraw()">Отмена</button>';
  html += '</span>';
  html += '</div>';
  html += '<div id="mapViewport" style="position:relative;overflow:hidden;width:100%;cursor:default;background:#e8e8e8;border-radius:6px">';
  html += '<div id="mapInner" style="transform-origin:0 0;transform:translate(0,0) scale(1);position:relative;line-height:0">';
  html += '<img src="/maps/territory.jpg" id="mapImg" style="display:block;width:100%;height:auto;user-select:none" draggable="false">';
  html += '<svg id="mapSvg" viewBox="0 0 100 100" preserveAspectRatio="none"';
  html += ' style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible">';
  html += '<defs></defs>';
  html += '<g id="mapShapes"></g><g id="mapDrawPreview"></g>';
  html += '</svg>';
  html += '<div id="mapLabels" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;pointer-events:none"></div>';
  html += '</div></div></div>';

  document.getElementById('content').innerHTML = html;
  renderIcons();
  var img = document.getElementById('mapImg');
  img.addEventListener('load', _mapRenderShapes);
  if (img.complete) _mapRenderShapes();
  _mapBindEvents();
}

// ── Coordinate helper ───────────────────────────────────────────────────────
function _mapPct(e) {
  var img = document.getElementById('mapImg');
  var r   = img.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width)  * 100)),
    y: Math.max(0, Math.min(100, ((e.clientY - r.top)  / r.height) * 100))
  };
}

// ── Event binding ────────────────────────────────────────────────────────────
function _mapBindEvents() {
  var c = document.getElementById('mapViewport');
  if (!c) return;
  c.addEventListener('mousedown',    _mapEvtDown);
  c.addEventListener('mousemove',    _mapEvtMove);
  c.addEventListener('mouseup',      _mapEvtUp);
  c.addEventListener('click',        _mapEvtClick);
  c.addEventListener('dblclick',     _mapEvtDbl);
  c.addEventListener('wheel',        _mapEvtWheel, {passive:false});
  c.addEventListener('contextmenu',  function(e){ if(_mapPolyPts.length){ e.preventDefault(); _mapPolyCancelDraw(); } });
  // Also stop pan if mouse released outside viewport
  document.addEventListener('mouseup', function(e){ if(_mapPanDrag){ _mapPanDrag=null; var v=document.getElementById('mapViewport'); if(v) v.style.cursor=_mapEditMode?'crosshair':(_mapZoom>1?'grab':'default'); } });
}

function _mapEvtDown(e) {
  if (e.target.closest('[data-mapbtn]')) return;
  if (!_mapEditMode) {
    // View mode — start pan
    e.preventDefault();
    _mapPanDrag = { sx: e.clientX - _mapPanX, sy: e.clientY - _mapPanY };
    var vp = document.getElementById('mapViewport');
    if (vp) vp.style.cursor = 'grabbing';
    return;
  }
  if (_mapDrawTool !== 'rect') return;
  e.preventDefault();
  var p = _mapPct(e);
  _mapRectDraw = { sx:p.x, sy:p.y, cx:p.x, cy:p.y };
  _mapRenderPreview();
}
function _mapEvtMove(e) {
  if (_mapPanDrag) {
    _mapPanX = e.clientX - _mapPanDrag.sx;
    _mapPanY = e.clientY - _mapPanDrag.sy;
    _mapApplyTransform();
    return;
  }
  var p = _mapPct(e); _mapMousePos = p;
  if (_mapEditMode && _mapDrawTool === 'rect' && _mapRectDraw) {
    _mapRectDraw.cx = p.x; _mapRectDraw.cy = p.y; _mapRenderPreview();
  }
  if (_mapEditMode && _mapDrawTool === 'poly' && _mapPolyPts.length) _mapRenderPreview();
}
function _mapEvtUp(e) {
  if (_mapPanDrag) {
    _mapPanDrag = null;
    var vp = document.getElementById('mapViewport');
    if (vp) vp.style.cursor = _mapZoom > 1 ? 'grab' : 'default';
    return;
  }
  if (!_mapEditMode || _mapDrawTool !== 'rect' || !_mapRectDraw) return;
  if (e.target.closest('[data-mapbtn]')) return;
  var p = _mapPct(e);
  var x = Math.min(_mapRectDraw.sx, p.x), y = Math.min(_mapRectDraw.sy, p.y);
  var w = Math.abs(p.x - _mapRectDraw.sx),  h = Math.abs(p.y - _mapRectDraw.sy);
  _mapRectDraw = null; _mapRenderPreview();
  if (w < 0.8 || h < 0.8) return;
  _mapOpenAssignModal({ shape:'rect', x:parseFloat(x.toFixed(2)), y:parseFloat(y.toFixed(2)), w:parseFloat(w.toFixed(2)), h:parseFloat(h.toFixed(2)) });
}
function _mapEvtClick(e) {
  if (!_mapEditMode || _mapDrawTool !== 'poly') return;
  if (e.target.closest('[data-mapbtn]')) return;
  if (e.detail >= 2) return; // let dblclick handle
  e.preventDefault();
  var p = _mapPct(e);
  _mapPolyPts.push([parseFloat(p.x.toFixed(2)), parseFloat(p.y.toFixed(2))]);
  _mapPolyStatus(); _mapRenderPreview();
}
function _mapEvtDbl(e) {
  if (!_mapEditMode || _mapDrawTool !== 'poly') return;
  if (e.target.closest('[data-mapbtn]')) return;
  e.preventDefault();
  if (_mapPolyPts.length < 3) { alert('Минимум 3 вершины'); return; }
  var pts = _mapPolyPts.slice(); _mapPolyPts = [];
  _mapPolyStatus(); _mapRenderPreview();
  _mapOpenAssignModal({ shape:'polygon', points:pts });
}
function _mapPolyCancelDraw() { _mapPolyPts = []; _mapPolyStatus(); _mapRenderPreview(); }
function _mapPolyStatus() {
  var s = document.getElementById('mapPolyStatus');
  var b = document.getElementById('mapPolyCancelBtn');
  if (!s) return;
  if (_mapDrawTool === 'poly' && _mapPolyPts.length) {
    s.style.display = ''; s.textContent = 'Вершин: ' + _mapPolyPts.length + ' · двойной клик — закрыть';
    if (b) b.style.display = '';
  } else { s.style.display = 'none'; if (b) b.style.display = 'none'; }
}

// ── Toolbar ──────────────────────────────────────────────────────────────────
function _mapToggleEdit() {
  _mapEditMode = !_mapEditMode;
  _mapPolyPts = []; _mapRectDraw = null;
  var btn   = document.getElementById('mapEditBtn');
  var tools = document.getElementById('mapEditTools');
  var vp    = document.getElementById('mapViewport');
  if (_mapEditMode) {
    btn.classList.add('btn-primary');
    btn.innerHTML = icon('check',14) + ' Готово';
    if (tools) { tools.style.display = 'flex'; }
    if (vp)  vp.style.cursor = 'crosshair';
  } else {
    btn.classList.remove('btn-primary');
    btn.innerHTML = icon('pencil',14) + ' Разметить';
    if (tools) tools.style.display = 'none';
    if (vp)  vp.style.cursor = _mapZoom > 1 ? 'grab' : 'default';
  }
  renderIcons(); _mapRenderShapes(); _mapRenderPreview();
}
function _mapSetTool(t) {
  _mapDrawTool = t; _mapPolyPts = []; _mapPolyStatus(); _mapRenderPreview();
  var r = document.getElementById('mapToolRect'), p = document.getElementById('mapToolPoly');
  if (r) r.className = 'btn btn-sm' + (t==='rect'?' btn-primary':'');
  if (p) p.className = 'btn btn-sm' + (t==='poly'?' btn-primary':'');
}

// ── Zoom / pan ────────────────────────────────────────────────────────────────
function _mapApplyTransform() {
  var inner = document.getElementById('mapInner');
  if (inner) inner.style.transform = 'translate('+_mapPanX.toFixed(1)+'px,'+_mapPanY.toFixed(1)+'px) scale('+_mapZoom+')';
  var zd = document.getElementById('mapZoomPct');
  if (zd) zd.textContent = Math.round(_mapZoom*100)+'%';
  var vp = document.getElementById('mapViewport');
  if (vp && !_mapPanDrag) vp.style.cursor = _mapEditMode ? 'crosshair' : (_mapZoom > 1 ? 'grab' : 'default');
  _mapRenderShapes();
  _mapRenderPreview();
}
function _mapZoomIn()    { _mapZoomTo(_mapZoom * 1.4); }
function _mapZoomOut()   { _mapZoomTo(_mapZoom / 1.4); }
function _mapZoomReset() { _mapZoom=1; _mapPanX=0; _mapPanY=0; _mapApplyTransform(); }
function _mapZoomTo(newZoom, cx, cy) {
  var vp = document.getElementById('mapViewport');
  if (!vp) return;
  newZoom = Math.max(0.5, Math.min(16, newZoom));
  if (cx === undefined) { cx = vp.offsetWidth/2; cy = vp.offsetHeight/2; }
  var innerX = (cx - _mapPanX) / _mapZoom;
  var innerY = (cy - _mapPanY) / _mapZoom;
  _mapZoom = newZoom;
  _mapPanX = cx - innerX * _mapZoom;
  _mapPanY = cy - innerY * _mapZoom;
  _mapApplyTransform();
}
function _mapEvtWheel(e) {
  e.preventDefault();
  var r = document.getElementById('mapViewport').getBoundingClientRect();
  var cx = e.clientX - r.left;
  var cy = e.clientY - r.top;
  var delta = e.deltaY > 0 ? 0.92 : 1.09;
  _mapZoomTo(_mapZoom * delta, cx, cy);
}

// ── Render hotspot shapes (SVG) ───────────────────────────────────────────────
function _mapRenderShapes() {
  var layer = document.getElementById('mapShapes');
  if (!layer) return;
  var z = _mapZoom || 1;   // scale-invariant factor: divide by z to keep screen-size constant
  var h = '';
  _mapHotspots.forEach(function(hs, i) {
    // Boost fill opacity to minimum 0.65 so all zones look solid
    var fill = hs.color.replace(/rgba((d+),(d+),(d+),([d.]+))/, function(_, r,g,b,a){
      return 'rgba('+r+','+g+','+b+','+Math.max(parseFloat(a),0.65)+')';
    });
    var stroke = 'rgba(0,0,0,0.5)', sw = (0.3/z).toFixed(3);
    var cur  = _mapEditMode ? 'default' : 'pointer';
    var clk  = _mapEditMode ? '' : ' onclick="'+('_mapHotspotClick('+i+')')+'"';
    var title = '<title>'+escapeHtml(hs.entity_name)+'</title>';
    var cx, cy;
    if (hs.shape === 'rect') {
      h += '<rect class="map-shape" x="'+hs.x+'" y="'+hs.y+'" width="'+hs.w+'" height="'+hs.h+'"'
         + ' fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"'
         + clk+' style="cursor:'+cur+'">'+title+'</rect>';
      cx = hs.x + hs.w/2; cy = hs.y + hs.h/2;
    } else {
      var pts = hs.points.map(function(p){return p[0]+','+p[1];}).join(' ');
      h += '<polygon class="map-shape" points="'+pts+'"'
         + ' fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"'
         + clk+' style="cursor:'+cur+'">'+title+'</polygon>';
      cx = hs.points.reduce(function(s,p){return s+p[0];},0)/hs.points.length;
      cy = hs.points.reduce(function(s,p){return s+p[1];},0)/hs.points.length;
    }
    // Labels are rendered as HTML in _mapRenderLabels()
    // Delete handle in edit mode
    if (_mapEditMode) {
      var dx = hs.shape==='rect' ? (hs.x+hs.w) : hs.points[0][0];
      var dy = hs.shape==='rect' ? hs.y         : hs.points[0][1];
      var cr = (2/z).toFixed(3), cf = (3/z).toFixed(3);
      h += '<g data-mapbtn="1" onclick="event.stopPropagation();_mapDeleteHotspot('+i+')" style="cursor:pointer">'
         + '<circle cx="'+dx+'" cy="'+dy+'" r="'+cr+'" fill="#ef4444"/>'
         + '<text x="'+dx+'" y="'+(dy+0.7/z)+'" text-anchor="middle" font-size="'+cf+'" fill="white" style="pointer-events:none">×</text>'
         + '</g>';
    }
  });
  layer.innerHTML = h;
  _mapRenderLabels();
}

// ── Signed-area centroid (correct for concave/L-shaped polygons) ─────────────
function _polyAreaCentroid(pts) {
  var n = pts.length;
  if (n < 3) {
    return [pts.reduce(function(s,p){return s+p[0];},0)/n,
            pts.reduce(function(s,p){return s+p[1];},0)/n];
  }
  var area = 0, cx = 0, cy = 0;
  for (var i = 0; i < n; i++) {
    var j = (i + 1) % n;
    var cross = pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
    area += cross;
    cx += (pts[i][0] + pts[j][0]) * cross;
    cy += (pts[i][1] + pts[j][1]) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-10) {
    return [pts.reduce(function(s,p){return s+p[0];},0)/n,
            pts.reduce(function(s,p){return s+p[1];},0)/n];
  }
  return [cx / (6 * area), cy / (6 * area)];
}

// ── HTML labels (fixed pixel size, positioned by %) ───────────────────────────
function _mapRenderLabels() {
  var container = document.getElementById('mapLabels');
  if (!container) return;
  var h = '';
  _mapHotspots.forEach(function(hs) {
    try {
      var cx = 0, cy = 0;
      if (hs.shape === 'rect') {
        var rx = isNaN(hs.x) ? 0 : (hs.x||0);
        var ry = isNaN(hs.y) ? 0 : (hs.y||0);
        var rw = isNaN(hs.w) ? 0 : (hs.w||0);
        var rh = isNaN(hs.h) ? 0 : (hs.h||0);
        cx = rx + rw/2;
        cy = ry + rh/2;
      } else if (hs.points && hs.points.length >= 2) {
        var c = _polyAreaCentroid(hs.points);
        cx = c[0]; cy = c[1];
      }
      if (isNaN(cx) || isNaN(cy)) return;
      var name = hs.entity_name || '';
      // Priority: 1) short_name field, 2) text in brackets, 3) full name
      var shortLbl = hs.short_name || '';
      if (!shortLbl) { var m = name.match(/(([^)]+))/); shortLbl = m ? m[1] : name; }
      if (!shortLbl) return;
      h += '<div title="'+escapeHtml(name)+'"'
         + ' style="position:absolute;left:'+cx+'%;top:'+cy+'%;'
         + 'transform:translate(-50%,-50%);'
         + 'font-size:13px;font-weight:800;color:#fff;line-height:1;text-align:center;'
         + 'background:rgba(0,0,0,0.6);border-radius:4px;padding:2px 7px;'
         + 'border:1px solid rgba(255,255,255,0.3);'
         + 'white-space:nowrap;pointer-events:none">'
         + escapeHtml(shortLbl) + '</div>';
    } catch(e) { console.warn('mapLabel err', e); }
  });
  container.innerHTML = h;
}

// ── Render drawing preview ────────────────────────────────────────────────────
function _mapRenderPreview() {
  var layer = document.getElementById('mapDrawPreview');
  if (!layer) return;
  var z = _mapZoom || 1;
  var h = '';
  // Rectangle drag preview
  if (_mapRectDraw) {
    var x = Math.min(_mapRectDraw.sx,_mapRectDraw.cx), y = Math.min(_mapRectDraw.sy,_mapRectDraw.cy);
    var w = Math.abs(_mapRectDraw.cx-_mapRectDraw.sx), hh = Math.abs(_mapRectDraw.cy-_mapRectDraw.sy);
    h += '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+hh+'"'
       + ' fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.8)"'
       + ' stroke-width="'+(0.4/z).toFixed(3)+'" stroke-dasharray="'+(2/z)+','+(1/z)+'" style="pointer-events:none"/>';
  }
  // Polygon drawing preview
  if (_mapDrawTool === 'poly' && _mapPolyPts.length) {
    var pts = _mapPolyPts, m = _mapMousePos;
    if (pts.length > 1) {
      h += '<polyline points="'+pts.map(function(p){return p[0]+','+p[1];}).join(' ')+'"'
         + ' fill="none" stroke="rgba(99,102,241,0.85)"'
         + ' stroke-width="'+(0.4/z).toFixed(3)+'" stroke-dasharray="'+(2/z)+','+(1/z)+'" style="pointer-events:none"/>';
    }
    var last = pts[pts.length-1];
    h += '<line x1="'+last[0]+'" y1="'+last[1]+'" x2="'+m.x+'" y2="'+m.y+'"'
       + ' stroke="rgba(99,102,241,0.7)" stroke-width="'+(0.35/z).toFixed(3)+'"'
       + ' stroke-dasharray="'+(1.5/z)+','+(1/z)+'" style="pointer-events:none"/>';
    if (pts.length >= 3) {
      h += '<line x1="'+m.x+'" y1="'+m.y+'" x2="'+pts[0][0]+'" y2="'+pts[0][1]+'"'
         + ' stroke="rgba(99,102,241,0.3)" stroke-width="'+(0.25/z).toFixed(3)+'"'
         + ' stroke-dasharray="'+(1/z)+','+(1/z)+'" style="pointer-events:none"/>';
    }
    // Vertex dots — fixed screen size regardless of zoom
    pts.forEach(function(p,i){
      h += '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+((i===0?1.3:0.8)/z).toFixed(3)+'"'
         + ' fill="'+(i===0?'rgba(99,102,241,0.9)':'white')+'"'
         + ' stroke="'+(i===0?'white':'rgba(99,102,241,0.8)')+'"'
         + ' stroke-width="'+(0.25/z).toFixed(3)+'" style="pointer-events:none"/>';
    });
  }
  layer.innerHTML = h;
}

// ── Assign modal ──────────────────────────────────────────────────────────────
async function _mapOpenAssignModal(shapeData) {
  var buildings  = await api('/entities?type=building');
  var landPlots  = await api('/entities?type=land_plot');
  var placedIds  = new Set(_mapHotspots.map(function(hs){return hs.entity_id;}));
  var available  = buildings.concat(landPlots).filter(function(e){return !placedIds.has(e.id);});

  var colors = [
    {n:'Синий',      v:'rgba(59,130,246,0.65)'},
    {n:'Голубой',    v:'rgba(100,200,230,0.60)'},
    {n:'Зелёный',    v:'rgba(34,197,94,0.65)'},
    {n:'Тёмно-зел.', v:'rgba(22,163,74,0.65)'},
    {n:'Жёлтый',     v:'rgba(234,179,8,0.65)'},
    {n:'Оранжевый',  v:'rgba(249,115,22,0.60)'},
    {n:'Красный',    v:'rgba(239,68,68,0.55)'},
    {n:'Фиолетовый', v:'rgba(139,92,246,0.60)'},
    {n:'Серый',      v:'rgba(107,114,128,0.55)'},
    {n:'Бирюзовый',  v:'rgba(20,184,166,0.60)'},
  ];

  var m = '<h3>Назначить объект</h3>';
  m += '<div class="form-group"><label>Объект</label><select id="mapSelEnt" class="form-input">';
  m += '<option value="">— выберите —</option>';
  available.forEach(function(e){ m += '<option value="'+e.id+'">'+escapeHtml(e.name)+' ('+escapeHtml(e.type_name_ru||e.type_name)+')</option>'; });
  m += '</select></div>';
  m += '<div class="form-group"><label>Цвет зоны</label><div style="display:flex;gap:6px;flex-wrap:wrap">';
  colors.forEach(function(c,i){
    m += '<label style="display:flex;align-items:center;gap:4px;cursor:pointer">'
       + '<input type="radio" name="mapColor" value="'+c.v+'"'+(i===0?' checked':'')+'>'
       + '<span style="width:20px;height:20px;border-radius:4px;background:'+c.v+';border:1px solid var(--border);display:inline-block"></span>'
       + '<span style="font-size:12px">'+c.n+'</span></label>';
  });
  m += '</div></div>';
  m += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>';
  m += '<button class="btn btn-primary" onclick="_mapSaveHotspot()">Сохранить</button></div>';

  window._mapPendingShape = shapeData;
  setModalContent(m);
}

async function _mapSaveHotspot() {
  var sel = document.getElementById('mapSelEnt');
  var eid = parseInt(sel.value);
  if (!eid) return alert('Выберите объект');
  var colorEl = document.querySelector('input[name="mapColor"]:checked');
  var color   = colorEl ? colorEl.value : 'rgba(99,102,241,0.35)';
  var sd      = window._mapPendingShape;
  if (!sd) return;
  try {
    var entity = await api('/entities/' + eid);
    var props  = entity.properties || {};
    ['map_x','map_y','map_w','map_h','map_points','map_shape','map_color'].forEach(function(k){delete props[k];});
    props.map_color = color;
    if (sd.shape === 'rect') {
      props.map_shape = 'rect'; props.map_x = String(sd.x); props.map_y = String(sd.y);
      props.map_w = String(sd.w); props.map_h = String(sd.h);
    } else {
      props.map_shape = 'polygon'; props.map_points = JSON.stringify(sd.points);
    }
    await api('/entities/' + eid, { method:'PATCH', body:JSON.stringify({properties:props}) });
    var rawName = sel.options[sel.selectedIndex].text;
    var dispIdx = rawName.lastIndexOf(' (');
    var dispName = dispIdx > -1 ? rawName.substring(0, dispIdx) : rawName;
    _mapHotspots.push(Object.assign({ entity_id:eid, entity_name:dispName, type_name:entity.type_name, color:color }, sd));
  } catch(e) { return alert('Ошибка: ' + e.message); }
  window._mapPendingShape = null;
  closeModal(); _mapRenderShapes();
}

async function _mapDeleteHotspot(idx) {
  var hs = _mapHotspots[idx];
  if (!confirm('Удалить зону «' + hs.entity_name + '» с карты?')) return;
  try {
    var entity = await api('/entities/' + hs.entity_id);
    var props  = entity.properties || {};
    ['map_x','map_y','map_w','map_h','map_points','map_shape','map_color'].forEach(function(k){delete props[k];});
    await api('/entities/' + hs.entity_id, { method:'PATCH', body:JSON.stringify({properties:props}) });
  } catch(e) { console.error(e); }
  _mapHotspots.splice(idx, 1);
  _mapRenderShapes();
}

function _mapHotspotClick(idx) {
  if (_mapEditMode) return;
  showEntity(_mapHotspots[idx].entity_id);
}

// ============ DASHBOARD ============

async function showDashboard() {
  currentView = 'dashboard';
  currentTypeFilter = null;
  setActive('.nav-item:first-child');
  document.getElementById('pageTitle').textContent = 'Обзор';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';

  const stats = await api('/stats');
  if (currentView !== 'dashboard') return; // user navigated away during load
  const content = document.getElementById('content');

  let html = '';
  html += '<div class="stats-grid">';
  stats.types.forEach(t => {
    html += '<div class="stat-card" onclick="showEntityList(\\'' + t.name + '\\')">' +
      '<div class="stat-icon">' + entityIcon(t.name, 24) + '</div>' +
      '<div class="stat-count" style="color:' + t.color + '">' + t.count + '</div>' +
      '<div class="stat-label">' + t.name_ru + '</div></div>';
    const countEl = document.getElementById('count_' + t.name);
    if (countEl) countEl.textContent = t.count;
  });
  html += '</div>';

  html += '<div class="stat-card" style="display:inline-block;padding:12px 20px">' +
    '<span style="font-size:20px;font-weight:700;color:var(--accent)">' + stats.totalRelations + '</span>' +
    ' <span style="color:var(--text-secondary);font-size:13px">связей</span></div>';

  content.innerHTML = html;
  renderIcons();
}

// ============ AREA DASHBOARD ============

var _areaData = null;
var _pieColors = ['#4F6BCC','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#14b8a6','#f97316','#6366f1','#a855f7'];

async function loadAreaPieChart() {
  var el = document.getElementById('areaDashboard');
  if (!el) return;
  try {
    _areaData = await api('/reports/area-stats');
    _renderAreaDashboard();
  } catch(e) {
    el.innerHTML = '<div style="color:var(--red);font-size:13px">Ошибка: ' + escapeHtml(e.message || String(e)) + '</div>';
  }
}

function _fmtNum(n) { return n.toLocaleString('ru-RU'); }

function _svgDonut(cx, cy, R, r, segments, labels) {
  var h = '<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="#e5e7eb" />';
  if (!segments || !segments.length) {
    h += '<text x="'+cx+'" y="'+(cy+2)+'" text-anchor="middle" font-size="14" fill="var(--text-muted)">нет данных</text>';
    return h;
  }
  var startAngle = -Math.PI / 2;
  segments.forEach(function(seg) {
    if (seg.pct <= 0) return;
    var endAngle = startAngle + 2 * Math.PI * Math.min(seg.pct, 0.9999);
    var x1 = cx + R * Math.cos(startAngle), y1 = cy + R * Math.sin(startAngle);
    var x2 = cx + R * Math.cos(endAngle), y2 = cy + R * Math.sin(endAngle);
    var largeArc = seg.pct > 0.5 ? 1 : 0;
    var cls = seg.cls ? ' class="'+seg.cls+'"' : '';
    var onclick = seg.onclick ? ' onclick="'+seg.onclick+'" style="cursor:pointer"' : '';
    var dataAttrs = seg.dataAttrs || '';
    h += '<path d="M'+cx+','+cy+' L'+x1.toFixed(2)+','+y1.toFixed(2)+' A'+R+','+R+' 0 '+largeArc+',1 '+x2.toFixed(2)+','+y2.toFixed(2)+' Z" fill="'+seg.color+'"'+cls+onclick+dataAttrs+'>';
    if (seg.title) h += '<title>'+escapeHtml(seg.title)+'</title>';
    h += '</path>';
    startAngle = endAngle;
  });
  if (r > 0) h += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="white" />';
  if (labels && labels.center) {
    h += '<text x="'+cx+'" y="'+(cy - 4)+'" text-anchor="middle" font-size="'+(labels.fontSize||28)+'" font-weight="700" fill="var(--text)">'+labels.center+'</text>';
    if (labels.sub) h += '<text x="'+cx+'" y="'+(cy + 16)+'" text-anchor="middle" font-size="12" fill="var(--text-secondary)">'+labels.sub+'</text>';
  }
  return h;
}

function _buildTenantColorMap(tenants) {
  var map = {};
  tenants.forEach(function(t, i) { map[t.tenant] = _pieColors[i % _pieColors.length]; });
  return map;
}

function _renderAreaDashboard() {
  var el = document.getElementById('areaDashboard');
  if (!el || !_areaData) return;
  var d = _areaData;
  var h = '';

  // Assign consistent colors to tenants
  var allTenants = (d.tenants || []).concat(d.lp_tenants || []);
  var uniqTenants = []; var seen = {};
  allTenants.forEach(function(t) { if (!seen[t.tenant]) { seen[t.tenant] = 1; uniqTenants.push(t); } });
  var tColors = _buildTenantColorMap(uniqTenants);

  // ── Top row: two pies ──
  h += '<div style="display:flex;gap:40px;flex-wrap:wrap;justify-content:center;margin-bottom:32px">';

  // Pie 1: Buildings total
  h += _renderSummaryPie('buildings', 'Помещения', d.grand_total, d.grand_rented, d.tenants || [], tColors);

  // Pie 2: Land plots total
  h += _renderSummaryPie('land', 'Земельные участки', d.lp_total || 0, d.lp_rented || 0, d.lp_tenants || [], tColors);

  h += '</div>';

  // ── Bottom: bar chart per building ──
  var blds = (d.buildings || []).filter(function(b) { return b.total_area > 0; });
  if (blds.length) {
    h += '<div style="margin-top:8px">';
    h += '<div style="font-size:14px;font-weight:600;margin-bottom:12px">По корпусам</div>';
    h += '<div id="areaBarChart" style="display:flex;gap:6px;align-items:flex-end;height:220px;padding-bottom:60px;overflow-x:auto">';
    var maxArea = Math.max.apply(null, blds.map(function(b) { return b.total_area; }));
    blds.forEach(function(b, bi) {
      var barH = Math.max(20, Math.round((b.total_area / (maxArea || 1)) * 160));
      var rentedPct = b.rented_area / (b.total_area || 1);
      var rentedH = Math.round(barH * rentedPct);
      var freeH = barH - rentedH;
      h += '<div class="area-bar-col" data-bidx="'+bi+'" style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:50px;cursor:pointer" onclick="_areaBarClick('+bi+')" onmouseenter="_areaBarHover('+bi+')" onmouseleave="_areaBarLeave('+bi+')">';
      h += '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;white-space:nowrap">'+Math.round(rentedPct*100)+'%</div>';
      h += '<div id="area_bar_'+bi+'" style="width:100%;max-width:60px;height:'+barH+'px;border-radius:4px 4px 0 0;overflow:hidden;display:flex;flex-direction:column">';
      h += '<div style="height:'+freeH+'px;background:#e5e7eb"></div>';
      h += '<div style="height:'+rentedH+'px;background:#4F6BCC"></div>';
      h += '</div>';
      h += '<div style="font-size:10px;margin-top:4px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;transform:rotate(-30deg);transform-origin:top left;height:40px">' + escapeHtml(b.short_name || b.name) + '</div>';
      h += '</div>';
    });
    h += '</div>';
    h += '</div>';
  }

  // ── Drill-down area ──
  h += '<div id="areaDrillDown" style="margin-top:16px"></div>';

  el.innerHTML = h;
}

function _renderSummaryPie(type, title, total, rented, tenants, tColors) {
  var pct = total > 0 ? rented / total : 0;
  var h = '<div style="text-align:center;min-width:220px">';
  h += '<div style="font-size:14px;font-weight:600;margin-bottom:8px">' + escapeHtml(title) + '</div>';
  h += '<div style="position:relative;display:inline-block" onmouseenter="_pieTenantShow(\\''+type+'\\',this)" onmouseleave="_pieTenantHide(\\''+type+'\\',this)">';
  // Simple pie
  h += '<svg class="area-pie-simple" width="200" height="200" viewBox="0 0 200 200" style="cursor:pointer" onclick="_pieDrillClick(\\''+type+'\\')">'; 
  h += _svgDonut(100, 100, 90, 50, [
    {pct: pct, color: '#4F6BCC', title: 'Сдано: '+_fmtNum(Math.round(rented))+' м²'},
    {pct: 1 - pct, color: '#e5e7eb', title: 'Свободно: '+_fmtNum(Math.round(total - rented))+' м²'}
  ], {center: Math.round(pct * 100) + '%', sub: 'сдано'});
  h += '</svg>';
  // Expanded pie (tenant breakdown) — hidden initially
  h += '<svg class="area-pie-expanded" width="220" height="220" viewBox="0 0 220 220" style="display:none;cursor:pointer" onclick="_pieDrillClick(\\''+type+'\\')">'; 
  var segs = [];
  tenants.forEach(function(t) {
    segs.push({pct: t.area / (total || 1), color: tColors[t.tenant] || '#999', title: t.tenant + ': ' + _fmtNum(Math.round(t.area)) + ' м²'});
  });
  var freeArea = total - rented;
  if (freeArea > 0) segs.push({pct: freeArea / (total || 1), color: '#e5e7eb', title: 'Свободно: ' + _fmtNum(Math.round(freeArea)) + ' м²'});
  h += _svgDonut(110, 110, 100, 55, segs, {center: Math.round(pct * 100) + '%', sub: 'сдано'});
  h += '</svg>';
  h += '</div>';
  h += '<div style="font-size:13px;margin-top:8px"><strong>' + _fmtNum(Math.round(rented)) + '</strong> / ' + _fmtNum(Math.round(total)) + ' м²</div>';
  h += '</div>';
  return h;
}

function _pieTenantShow(type, container) {
  var simple = container.querySelector('.area-pie-simple');
  var expanded = container.querySelector('.area-pie-expanded');
  if (simple) simple.style.display = 'none';
  if (expanded) expanded.style.display = '';
}
function _pieTenantHide(type, container) {
  var simple = container.querySelector('.area-pie-simple');
  var expanded = container.querySelector('.area-pie-expanded');
  if (simple) simple.style.display = '';
  if (expanded) expanded.style.display = 'none';
}

function _pieDrillClick(type) {
  if (!_areaData) return;
  var dd = document.getElementById('areaDrillDown');
  if (!dd) return;
  var items = type === 'land' ? (_areaData.land_plots || []) : (_areaData.buildings || []);
  items = items.filter(function(b) { return b.total_area > 0; });
  var h = '<h4 style="margin-bottom:12px">' + (type === 'land' ? 'Земельные участки' : 'Корпуса') + ' — детали</h4>';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">';
  items.forEach(function(b) {
    var pct = b.rented_area / (b.total_area || 1);
    h += '<div class="stat-card" style="padding:12px">';
    h += '<div style="font-weight:600;font-size:14px;margin-bottom:6px">' + escapeHtml(b.short_name || b.name) + '</div>';
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
    h += '<div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden"><div style="height:100%;width:'+Math.round(pct*100)+'%;background:#4F6BCC;border-radius:4px"></div></div>';
    h += '<span style="font-size:12px;font-weight:600;min-width:36px;text-align:right">'+Math.round(pct*100)+'%</span>';
    h += '</div>';
    h += '<div style="font-size:12px;color:var(--text-secondary)">' + _fmtNum(Math.round(b.rented_area)) + ' / ' + _fmtNum(Math.round(b.total_area)) + ' м²</div>';
    if (b.contracts && b.contracts.length) {
      h += '<div style="margin-top:6px;border-top:1px solid var(--border);padding-top:6px">';
      b.contracts.forEach(function(c) {
        h += '<div style="font-size:12px;cursor:pointer;padding:2px 0;display:flex;justify-content:space-between" onclick="showEntity('+c.contract_id+')">';
        h += '<span style="color:var(--accent)">' + escapeHtml(c.tenant || c.contract_name) + '</span>';
        h += '<span style="color:var(--text-muted)">' + _fmtNum(Math.round(c.area)) + ' м²</span>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
  });
  h += '</div>';
  dd.innerHTML = h;
}

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

async function showEntity(id, _forceDetail) {
  currentView = 'detail';
  currentEntityId = id;
  const e = await api('/entities/' + id);
  if (currentView !== 'detail' || currentEntityId !== id) return; // user navigated away
  // Load all non-contract entities for parent selector
  if (e.type_name !== 'contract' && e.type_name !== 'supplement') {
    try {
      var allForParent = await api('/entities?limit=200');
      _allEntitiesForParent = allForParent.filter(function(x) {
        return x.type_name !== 'contract' && x.type_name !== 'supplement' && x.id !== id;
      });
    } catch(ex) { _allEntitiesForParent = []; }
  }

  setActive('[data-type="' + e.type_name + '"]');
  document.getElementById('pageTitle').textContent = '';
  var bcParts = (e.ancestry || []).map(function(a) {
    return '<a href="#" onclick="showEntity(' + a.id + ');return false" style="color:var(--accent)">' + escapeHtml(a.name) + '</a>';
  });
  var _eProps = e.properties || {};
  var _eEmergencyBadge = (e.type_name === 'equipment' && _eProps.status === 'Аварийное')
    ? ' <span class="eq-emergency-badge">⚠ Авария</span>' : '';
  bcParts.push(escapeHtml(e.name) + _eEmergencyBadge);
  document.getElementById('breadcrumb').innerHTML = bcParts.join(' › ');
  var _ePropsForBtn = e.properties || {};
  var _isContract = (e.type_name === 'contract');
  var _topAct = '<button class="btn btn-sm" onclick="openEditModal(' + id + ')">Редактировать</button>' +
    '<button class="btn btn-sm" onclick="openRelationModal(' + id + ')">+ Связь</button>' +
    '<button class="btn btn-sm btn-danger" onclick="deleteEntity(' + id + ')">Удалить</button>';
  if (_isContract) {
    _topAct = '<button class="btn btn-sm" onclick="showEntityDetail(' + id + ')">⚙ Детали</button>' + _topAct;
  }
  document.getElementById('topActions').innerHTML = _topAct;

  // For contracts — show card inline, not the standard detail view
  if (_isContract && !_forceDetail) {
    var contentEl = document.getElementById('content');
    contentEl.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)">Загрузка...</div>';
    try {
      var cardData = await api('/reports/contract-card/' + id);
      contentEl.innerHTML = '<div style="max-width:860px;padding:8px 0">' + renderContractCard(cardData) + '</div>';
    } catch(cardErr) {
      contentEl.innerHTML = '<div style="color:#dc2626;padding:20px">Ошибка загрузки карточки: ' + escapeHtml(cardErr.message || String(cardErr)) + '</div>';
    }
    return;
  }

  let html = '';

  // Properties
  const props = e.properties || {};
  const fields = e.fields || [];
  if (fields.length > 0) {
    html += '<div class="detail-section"><h3>Свойства</h3><div class="props-grid">';
    var detailRoles = CONTRACT_ROLES[props.contract_type] || {};
    fields.forEach(f => {
      if (f.sort_order >= 999) return; // hidden fields (room_number, room_type etc.)
      // For entity-selector fields: stored id+name, display the name
      var rawVal = props[f.name];
      if (f.name === 'owner')         rawVal = props.owner_name        || props.owner        || rawVal;
      if (f.name === 'balance_owner') rawVal = props.balance_owner_name || props.balance_owner || rawVal;
      const val = rawVal;
      // Skip internal role fields in display
      if (f.name === 'our_role_label' || f.name === 'contractor_role_label') return;
      // Hide subtenant if not Субаренды
      if (f.name === 'subtenant_name' && props.contract_type !== 'Субаренды') return;
      // Custom labels for parties
      var label = f.name_ru || f.name;
      if (f.name === 'our_legal_entity') label = props.our_role_label || detailRoles.our || label;
      if (f.name === 'contractor_name') label = props.contractor_role_label || detailRoles.contractor || label;
      // Boolean display
      if (f.field_type === 'boolean') {
        html += '<div class="prop-item"><div class="prop-label">' + label + '</div>' +
          '<div class="prop-value">' + (val === 'true' ? 'Да' : '—') + '</div></div>';
        return;
      }
      if (f.field_type === 'textarea') {
        html += '<div class="prop-item"><div class="prop-label">' + escapeHtml(label) + '</div>' +
          '<div class="prop-value" style="white-space:pre-wrap">' + (val ? escapeHtml(String(val)) : '—') + '</div></div>';
        return;
      }
      if (f.field_type === 'contacts') {
        var cts2 = [];
        try { if (val) cts2 = JSON.parse(val); } catch(ex2) {}
        if (Array.isArray(cts2) && cts2.length > 0) {
          html += '<div class="prop-item"><div class="prop-label">' + escapeHtml(label) + '</div><div class="prop-value">';
          cts2.forEach(function(ct) {
            html += '<div style="margin-bottom:6px">';
            html += '<strong>' + escapeHtml(ct.name || '—') + '</strong>';
            if (ct.position) html += ' <span style="color:var(--text-secondary);font-size:12px">(' + escapeHtml(ct.position) + ')</span>';
            var details = [];
            if (ct.phone) details.push('📞 ' + escapeHtml(ct.phone));
            if (ct.email) details.push('✉ ' + escapeHtml(ct.email));
            if (details.length) html += '<div style="font-size:12px;color:var(--text-secondary)">' + details.join(' &nbsp; ') + '</div>';
            html += '</div>';
          });
          html += '</div></div>';
        }
        return;
      }
      html += '<div class="prop-item"><div class="prop-label">' + escapeHtml(label) + '</div>' +
        '<div class="prop-value">' + (val ? escapeHtml(String(val)) : '—') + '</div></div>';
    });
    // Show dynamic contract-type fields in detail
    if ((e.type_name === 'contract' || e.type_name === 'supplement') && props.contract_type) {
      const extraFields = CONTRACT_TYPE_FIELDS[props.contract_type] || [];
      var isLand = (props.object_type === 'Земельный участок');
      var hasExtra = (props.extra_services === 'true');
      var durType = props.duration_type || '';
      extraFields.forEach(function(f) {
        var val = props[f.name];
        var group = f._group || '';
        // Filter conditional groups for display
        if (group === 'not_land' && isLand) return;
        if (group === 'land' && !isLand) return;
        if (group === 'extra' && !hasExtra) return;
        if (group === 'duration_date' && durType !== 'Дата') return;
        if (group === 'duration_text' && durType !== 'Текст') return;
        // Skip internal fields
        if (f.name === 'extra_services' || f.name === 'duration_type') return;

        if (f.field_type === 'multi_comments') {
          var cmts = [];
          try { if (typeof val === 'string' && val) cmts = JSON.parse(val); else if (Array.isArray(val)) cmts = val; } catch(ex) {}
          if (cmts.length > 0) {
            html += '<div class="prop-item"><div class="prop-label">' + (f.name_ru || f.name) + '</div><div class="prop-value">';
            cmts.forEach(function(c, ci) { html += (ci > 0 ? '<br>' : '') + '• ' + escapeHtml(c); });
            html += '</div></div>';
          }
          return;
        } else if (f.field_type === 'rent_objects') {
          var robjs = [];
          try { if (typeof val === 'string' && val) robjs = JSON.parse(val); else if (Array.isArray(val)) robjs = val; } catch(ex) {}
          if (robjs.length > 0) {
            robjs.forEach(function(ro, ri) {
              // Resolve room from registry
              var room = _getRoomById(ro.room_id);
              var roomProps = room ? (room.properties || {}) : {};
              var roomName = room ? room.name : (ro.room_name || ro.room || '');
              var roomType = room ? (roomProps.room_type || '') : (ro.room_type || ro.object_type || '');
              var roomArea = room ? roomProps.area : (ro.area || '');
              var roomBuilding = room ? _getRoomBuilding(room) : (ro.building_name || ro.building || '');

              html += '<div class="prop-item" style="border-left:2px solid var(--accent);padding-left:8px;margin-bottom:4px"><div class="prop-label">Объект ' + (ri+1) + ': ' + escapeHtml(roomType) + '</div><div class="prop-value">';
              if (roomBuilding) html += 'Корпус: ' + escapeHtml(roomBuilding) + '<br>';
              if (roomName) html += 'Помещение: ' + escapeHtml(roomName) + '<br>';
              if (ro.land_plot_name) html += 'ЗУ: ' + escapeHtml(ro.land_plot_name) + '<br>';
              if (ro.land_plot_part_name) html += 'Часть ЗУ: ' + escapeHtml(ro.land_plot_part_name) + '<br>';
              if (ro.calc_mode === 'fixed') {
                html += 'Аренда: ' + (ro.fixed_rent || '—') + ' руб.<br>';
              } else {
                if (roomArea) html += 'Площадь: ' + escapeHtml(String(roomArea)) + ' м²<br>';
                if (ro.rent_rate) html += 'Ставка: ' + escapeHtml(String(ro.rent_rate)) + ' руб/м²<br>';
                var ot = (parseFloat(roomArea)||0) * (parseFloat(ro.rent_rate)||0);
                if (ot > 0) html += '= ' + _fmtNum(ot) + ' руб.<br>';
              }
              if (ro.comment) html += '<em>' + escapeHtml(ro.comment) + '</em>';
              html += '</div></div>';
            });
          }
          return;
        } else if (f.field_type === 'equipment_rent_items') {
          var eqRentView = [];
          try { if (typeof val === 'string' && val) eqRentView = JSON.parse(val); else if (Array.isArray(val)) eqRentView = val; } catch(ex) {}
          if (eqRentView.length > 0) {
            eqRentView.forEach(function(item, ri) {
              var eq = item.equipment_id ? (_equipment || []).find(function(e) { return e.id === parseInt(item.equipment_id); }) : null;
              var eqName = eq ? eq.name : ('Оборудование #' + item.equipment_id);
              var eqProps = eq ? (eq.properties || {}) : {};
              html += '<div class="prop-item" style="border-left:2px solid var(--accent);padding-left:8px;margin-bottom:4px"><div class="prop-label">' + escapeHtml(eqName) + '</div><div class="prop-value">';
              if (eqProps.equipment_category) html += escapeHtml(eqProps.equipment_category) + '<br>';
              if (eqProps.inv_number) html += 'Инв. ' + escapeHtml(eqProps.inv_number) + '<br>';
              if (item.rent_cost) html += 'Аренда: ' + _fmtNum(parseFloat(item.rent_cost)) + ' руб/мес';
              html += '</div></div>';
            });
          }
          return;
        } else if (f.field_type === 'act_items') {
          var actView = [];
          try { if (typeof val === 'string' && val) actView = JSON.parse(val); else if (Array.isArray(val)) actView = val; } catch(ex) {}
          if (actView.length > 0) {
            html += '<div class="detail-section"><h3>Позиции акта</h3>';
            html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
            html += '<thead><tr style="border-bottom:2px solid var(--border)"><th style="text-align:left;padding:6px">Оборудование</th><th style="text-align:right;padding:6px">Сумма, ₽</th><th style="text-align:left;padding:6px">Комментарий</th></tr></thead><tbody>';
            var actTotal = 0;
            actView.forEach(function(item) {
              actTotal += item.amount || 0;
              html += '<tr style="border-bottom:1px solid var(--border)">';
              html += '<td style="padding:6px"><a href="#" onclick="showEntity(' + (item.equipment_id || 0) + ');return false" style="color:var(--accent)">' + escapeHtml(item.equipment_name || '—') + '</a></td>';
              html += '<td style="text-align:right;padding:6px;font-weight:500">' + _fmtNum(item.amount || 0) + ' ₽</td>';
              html += '<td style="padding:6px;color:var(--text-secondary)">' + escapeHtml(item.description || '—') + '</td>';
              html += '</tr>';
            });
            html += '<tr style="font-weight:600;background:var(--bg-hover)"><td style="padding:6px">Итого</td><td style="text-align:right;padding:6px">' + _fmtNum(actTotal) + ' ₽</td><td></td></tr>';
            html += '</tbody></table></div>';
          }
          return;
        } else if (f.field_type === 'equipment_list') {
          var eqView = [];
          try { if (typeof val === 'string' && val) eqView = JSON.parse(val); else if (Array.isArray(val)) eqView = val; } catch(ex) {}
          // Fallback: show old plain-text equipment value if no equipment_list
          var oldEqText = props.equipment || '';
          html += '<div class="prop-item"><div class="prop-label">' + (f.name_ru || f.name) + '</div><div class="prop-value">';
          if (eqView.length > 0) {
            eqView.forEach(function(eq, i) {
              if (i > 0) html += '<br>';
              html += '<a href="#" onclick="showEntity(' + eq.equipment_id + ');return false" style="color:var(--accent);text-decoration:underline">' + escapeHtml(eq.equipment_name || ('ID:' + eq.equipment_id)) + '</a>';
            });
          } else if (oldEqText) {
            html += '<span style="color:var(--text-muted);font-size:12px">' + escapeHtml(oldEqText) + ' <em>(текст, не связан с реестром)</em></span>';
          } else {
            html += '—';
          }
          html += '</div></div>';
          return;
        } else if (f.field_type === 'advances') {
          var advances = [];
          try { if (typeof val === 'string' && val) advances = JSON.parse(val); else if (Array.isArray(val)) advances = val; } catch(ex) {}
          html += '<div class="prop-item"><div class="prop-label">' + (f.name_ru || f.name) + '</div><div class="prop-value">';
          if (advances.length > 0) {
            advances.forEach(function(adv, i) {
              html += (i > 0 ? '<br>' : '') + (adv.amount ? escapeHtml(String(adv.amount)) + ' руб.' : '—') + (adv.date ? ' от ' + escapeHtml(adv.date) : '');
            });
          } else { html += '—'; }
          html += '</div></div>';
        } else if (f.name === 'vat_rate' && props.rent_monthly) {
          var rent = parseFloat(props.rent_monthly) || 0;
          var vat = parseFloat(val) || 0;
          var vatAmount = rent > 0 && vat > 0 ? _fmtNum(rent * vat / (100 + vat)) : '—';
          html += '<div class="prop-item"><div class="prop-label">Арендная плата</div>' +
            '<div class="prop-value">' + escapeHtml(String(props.rent_monthly)) + ' руб./мес.' +
            (vat > 0 ? '<br><span style="font-size:12px;color:var(--text-secondary)">в т.ч. НДС (' + vat + '%) = ' + vatAmount + ' руб.</span>' : '') +
            '</div></div>';
        } else if (f.name === 'rent_monthly') {
          return; // shown together with vat_rate above
        } else {
          html += '<div class="prop-item"><div class="prop-label">' + (f.name_ru || f.name) + '</div>' +
            '<div class="prop-value">' + (val ? escapeHtml(String(val)) : '—') + '</div></div>';
        }
      });
    }
    html += '</div></div>';
  }

  // Supplements + Acts sections for contracts
  if (e.type_name === 'contract') {
    const allSupplements = await api('/entities?type=supplement');
    const supplements = allSupplements.filter(function(s) { return s.parent_id === e.id; });
    html += '<div class="detail-section"><h3>Доп. соглашения</h3>';
    if (supplements.length > 0) {
      html += '<div class="children-grid">';
      supplements.forEach(function(s) {
        const sp = s.properties || {};
        html += '<div class="child-card" onclick="showEntity(' + s.id + ')">' +
          '<span>' + icon('paperclip', 18) + '</span>' +
          '<div><div style="font-weight:500;font-size:13px">' + escapeHtml(s.name) + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + (sp.number || '') + (sp.contract_date ? ' от ' + sp.contract_date : '') + '</div></div></div>';
      });
      html += '</div>';
    }
    html += '<button class="btn btn-sm btn-primary" onclick="openCreateSupplementModal(' + e.id + ')" style="margin-top:8px">+ Доп. соглашение</button>';
    html += '</div>';

    // Acts section
    const allActs = await api('/entities?type=act&limit=200');
    const acts = allActs.filter(function(a) {
      if (a.parent_id === e.id) return true;
      var pc = (a.properties || {}).parent_contract_id;
      return pc && parseInt(pc) === e.id;
    });
    html += '<div class="detail-section"><h3>Акты</h3>';
    if (acts.length > 0) {
      html += '<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px">';
      html += '<thead><tr style="border-bottom:2px solid var(--border)"><th style="text-align:left;padding:6px">Акт</th><th style="text-align:left;padding:6px">Дата</th><th style="text-align:right;padding:6px">Сумма</th></tr></thead><tbody>';
      acts.forEach(function(a) {
        var ap = a.properties || {};
        var items = [];
        try { items = JSON.parse(ap.act_items || '[]'); } catch(ex) {}
        var total = items.reduce(function(s, i) { return s + (parseFloat(i.amount) || 0); }, 0);
        html += '<tr style="border-bottom:1px solid var(--border);cursor:pointer" onclick="showEntity(' + a.id + ')">';
        html += '<td style="padding:6px">' + escapeHtml(a.name) + '</td>';
        html += '<td style="padding:6px;color:var(--text-muted)">' + (ap.act_date || '—') + '</td>';
        html += '<td style="text-align:right;padding:6px;font-weight:500">' + (total > 0 ? _fmtNum(total) + ' ₽' : '—') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<div style="color:var(--text-muted);font-size:13px;margin-bottom:8px">Нет актов</div>';
    }
    html += '<button class="btn btn-sm btn-primary" onclick="openCreateActModal(' + e.id + ')" style="margin-top:4px">+ Акт</button>';
    html += '</div>';
  }

  // "Части ЗУ" section for land_plot
  if (e.type_name === 'land_plot') {
    const allParts = await api('/entities?type=land_plot_part');
    const parts = allParts.filter(function(p) { return p.parent_id === e.id; });
    html += '<div class="detail-section"><h3>Части ЗУ</h3>';
    if (parts.length > 0) {
      html += '<div class="children-grid">';
      parts.forEach(function(p) {
        var pp = p.properties || {};
        html += '<div class="child-card" onclick="showEntity(' + p.id + ')">' +
          '<span>' + icon('map', 18) + '</span>' +
          '<div><div style="font-weight:500;font-size:13px">' + escapeHtml(p.name) + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + (pp.area ? pp.area + ' га' : '') + (pp.description ? (pp.area ? ' · ' : '') + pp.description : '') + '</div></div></div>';
      });
      html += '</div>';
    } else {
      html += '<div style="color:var(--text-muted);font-size:13px;margin-bottom:8px">Нет частей</div>';
    }
    html += '<button class="btn btn-sm btn-primary" onclick="openCreateLandPlotPartModal(' + e.id + ')" style="margin-top:8px">+ Добавить часть ЗУ</button>';
    html += '</div>';
  }

  // Work history section for equipment
  if (e.type_name === 'equipment') {
    const actRels = (e.relations || []).filter(function(r) { return r.relation_type === 'subject_of' && r.from_entity_id === e.id && r.to_type_name === 'act'; });
    if (actRels.length > 0) {
      html += '<div class="detail-section"><h3>История работ</h3>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      html += '<thead><tr style="border-bottom:2px solid var(--border)"><th style="text-align:left;padding:6px">Акт</th><th style="text-align:left;padding:6px">Дата</th><th style="text-align:right;padding:6px">Сумма</th><th style="text-align:left;padding:6px">Описание</th></tr></thead><tbody>';
      for (var ai = 0; ai < actRels.length; ai++) {
        var actData = await api('/entities/' + actRels[ai].to_entity_id);
        var ap = actData.properties || {};
        var items = [];
        try { items = JSON.parse(ap.act_items || '[]'); } catch(ex) {}
        var myItem = items.find(function(it) { return parseInt(it.equipment_id) === e.id; });
        var contractRel = (actData.relations || []).find(function(r) { return r.relation_type === 'supplement_to' && r.from_entity_id === actData.id; });
        html += '<tr style="border-bottom:1px solid var(--border);cursor:pointer" onclick="showEntity(' + actData.id + ')">';
        html += '<td style="padding:6px">' + escapeHtml(actData.name) + (contractRel ? '<br><span style="font-size:11px;color:var(--text-muted)">→ ' + escapeHtml(contractRel.to_entity_name || '') + '</span>' : '') + '</td>';
        html += '<td style="padding:6px;color:var(--text-muted)">' + (ap.act_date || '—') + '</td>';
        html += '<td style="text-align:right;padding:6px;font-weight:500">' + (myItem && myItem.amount ? _fmtNum(myItem.amount) + ' ₽' : '—') + '</td>';
        html += '<td style="padding:6px;color:var(--text-secondary);font-size:12px">' + escapeHtml(myItem ? (myItem.description || '') : '') + '</td>';
        html += '</tr>';
      }
      html += '</tbody></table></div>';
    }
  }

  // Location block (for non-contract entities)
  if (e.type_name !== 'contract' && e.type_name !== 'supplement') {
    var isBuildingType = (e.type_name === 'building' || e.type_name === 'workshop');
    var isRoomType = (e.type_name === 'room');
    var locationTitle = isBuildingType ? 'Собственник' : (isRoomType ? 'Находится в корпусе' : 'Расположение');

    // For buildings: also show land plot from relations
    if (isBuildingType) {
      var lpRels = (e.relations || []).filter(function(r) { return r.relation_type === 'located_on' && r.from_entity_id === e.id; });
      if (lpRels.length > 0) {
        var lpRel = lpRels[0];
        html += '<div class="detail-section">';
        html += '<h3>Земельный участок</h3>';
        html += '<a href="#" onclick="showEntity(' + lpRel.to_entity_id + ');return false" style="color:var(--accent)">'+escapeHtml(lpRel.to_name || 'Земельный участок') + '</a>';
        html += '</div>';
      }
    }

    html += '<div class="detail-section" id="locationBlock">';
    html += '<h3>' + locationTitle + '</h3>';
    if (e.ancestry && e.ancestry.length > 0) {
      html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">';
      e.ancestry.forEach(function(a, i) {
        if (i > 0) html += '<span style="color:var(--text-muted)">›</span>';
        html += '<a href="#" onclick="showEntity(' + a.id + ');return false" style="color:var(--accent);text-decoration:none">' + escapeHtml(a.name) + '</a>';
      });
      html += '<span style="color:var(--text-muted)">›</span><strong>' + escapeHtml(e.name) + '</strong>';
      html += '</div>';
    } else {
      html += '<span style="color:var(--text-muted);font-size:13px">Не привязано ни к какому объекту</span>';
    }
    html += '</div>';
  }

  // Children
  if (e.children && e.children.length > 0) {
    html += '<div class="detail-section"><h3>Содержит (' + e.children.length + ')</h3><div class="children-grid">';
    e.children.forEach(c => {
      var cProps = c.properties || {};
      var cIsBroken = (c.type_name === 'equipment' || c.type_name === 'crane_track') && _brokenEqIds.has(parseInt(c.id));
      var cIsEmerg = (c.type_name === 'equipment' || c.type_name === 'crane_track') && (cProps.status === 'Аварийное');
      var cCardStyle = cIsBroken ? 'border-left:3px solid #dc2626;background:rgba(239,68,68,.06);' : (cIsEmerg ? 'border-left:3px solid #b85c5c;background:rgba(184,92,92,.05);' : '');
      var cBadge = cIsBroken ? ' <span class="eq-broken-badge">⚠ Нерабочий</span>' : (cIsEmerg ? ' <span class="eq-emergency-badge">⚠ Авария</span>' : '');
      html += '<div class="child-card" onclick="showEntity(' + c.id + ')" style="' + cCardStyle + '">' +
        entityIcon(c.type_name, 18) +
        '<div><div style="font-weight:500;font-size:13px">' + escapeHtml(c.name) + cBadge + '</div>' +
        '<div style="font-size:11px;color:var(--text-muted)">' + c.type_name_ru + '</div></div></div>';
    });
    html += '</div></div>';
  }

  // Relations
  if (e.relations && e.relations.length > 0) {
    html += '<div class="detail-section"><h3>Связи</h3><div class="relation-list">';
    e.relations.forEach(r => {
      const isFrom = r.from_entity_id === e.id;
      const linkedId = isFrom ? r.to_entity_id : r.from_entity_id;
      const linkedName = isFrom ? r.to_name : r.from_name;
      const linkedIcon = isFrom ? r.to_icon : r.from_icon;
      const linkedType = isFrom ? r.to_type_ru : r.from_type_ru;
      const relColor = r.relation_color || '#94A3B8';
      html += '<div class="relation-item" onclick="showEntity(' + linkedId + ')">' +
        '<div><div class="relation-name">' + escapeHtml(linkedName) + '</div>' +
        '<div class="relation-type-label">' + linkedType + '</div></div>' +
        '<span class="relation-badge" style="background:' + relColor + '">' + (r.relation_name_ru || r.relation_type) + '</span>' +
        '<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteRelation(' + r.id + ',' + e.id + ')" style="margin-left:auto">×</button>' +
        '</div>';
    });
    html += '</div></div>';
  }

  document.getElementById('content').innerHTML = html;
  renderIcons();
}

// ============ REPORTS ============

var _reportFields = [];
// Fields available for manual grouping
var AGG_HIERARCHY_FIELDS = [
  { name: 'eq_balance_owner',          label: 'Собственник' },
  { name: 'eq_building',               label: 'Корпус' },
  { name: 'eq_category',               label: 'Категория оборудования' },
  { name: 'eq_name',                   label: 'Оборудование' },
  { name: 'contract_contractor',       label: 'Контрагент' },
  { name: 'contract_type',             label: 'Тип договора' },
  { name: 'contract_year',             label: 'Год' },
];
// No auto drill — user controls grouping fully
var AGG_AUTO_DRILL = [];
// All fields for label lookup in tree rendering
var AGG_ALL_FIELDS = AGG_HIERARCHY_FIELDS;
var AGG_CONTRACT_TYPES = ['Подряда','Услуг','Купли-продажи','Обслуживания'];
var _aggHierarchy = []; // ordered list of field names

var _pivotRowFields = [];
var _pivotColFields = [];
var _pivotDragField = null;
var _pivotDragSource = null;
var _reportFieldLabels = {
  building: 'Корпус', room: 'Помещение', object_type: 'Тип объекта',
  contractor_name: 'Контрагент', our_legal_entity: 'Наше юр. лицо',
  contract_type: 'Тип договора', tenant: 'Арендатор',
  equipment: 'Оборудование', rent_scope: 'Часть/Целиком',
  our_role_label: 'Роль нашей стороны', contractor_role_label: 'Роль контрагента',
};

// ── BI Dashboard ─────────────────────────────────────────────────────────────
var _biDashboardUrl = localStorage.getItem('bi_dashboard_url') || '';

function showBIPage() {
  currentView = 'bi';
  setActive('[onclick*="showBIPage"]');
  document.getElementById('pageTitle').textContent = 'BI-дашборды';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';
  var content = document.getElementById('content');
  var h = '<div style="padding:24px">';
  if (_biDashboardUrl) {
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
    h += '<span style="font-size:13px;color:var(--text-secondary)">Metabase dashboard</span>';
    h += '<button class="btn btn-sm" onclick="editBIUrl()">Изменить URL</button>';
    h += '</div>';
    h += '<div id="bi_url_edit" style="display:none;margin-bottom:12px;display:flex;gap:8px">';
    h += '<input id="biUrlInput" value="' + escapeHtml(_biDashboardUrl) + '" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:13px" placeholder="https://...metabaseapp.com/public/dashboard/...">';
    h += '<button class="btn btn-primary btn-sm" onclick="saveBIUrl()">Сохранить</button>';
    h += '<button class="btn btn-sm" onclick="showBIPage()">Отмена</button>';
    h += '</div>';
    h += '<iframe src="' + escapeHtml(_biDashboardUrl) + '" style="width:100%;height:calc(100vh - 130px);border:none;border-radius:8px" allowtransparency></iframe>';
  } else {
    h += '<div style="max-width:560px">';
    h += '<div style="font-size:15px;font-weight:600;margin-bottom:8px">Подключение Metabase</div>';
    h += '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Вставьте публичную ссылку из Metabase: Поделиться → Публичная ссылка → скопировать URL</div>';
    h += '<div style="display:flex;gap:8px">';
    h += '<input id="biUrlInput" placeholder="https://...metabaseapp.com/public/dashboard/..." style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:13px">';
    h += '<button class="btn btn-primary" onclick="saveBIUrl()">Сохранить</button>';
    h += '</div></div>';
  }
  h += '</div>';
  content.innerHTML = h;
  renderIcons();
}

function saveBIUrl() {
  var inp = document.getElementById('biUrlInput');
  if (!inp || !inp.value.trim()) return;
  _biDashboardUrl = inp.value.trim();
  localStorage.setItem('bi_dashboard_url', _biDashboardUrl);
  showBIPage();
}

// ============ BUDGET PAGE ============
function showBudgetPage() {
  currentView = 'budget';
  setActive('[onclick*="showBudgetPage"]');
  document.getElementById('pageTitle').textContent = 'Бюджеты';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';
  var content = document.getElementById('content');
  content.innerHTML = '<iframe src="/budget" style="width:100%;height:calc(100vh - 56px);border:none;display:block" allowfullscreen></iframe>';
}

// ============ FINANCE PAGE (1С) ============
async function showFinancePage() {
  currentView = 'finance';
  setActive('[onclick*="showFinancePage"]');
  document.getElementById('pageTitle').textContent = 'Расходы';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML =
    '<button class="btn btn-sm" onclick="showFinancePage()"><i data-lucide="refresh-cw" class="lucide" style="width:14px;height:14px"></i> Обновить</button>';
  var content = document.getElementById('content');
  content.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)"><div class="spinner-ring" style="margin:40px auto"></div><div style="margin-top:12px">Загружаю данные из 1С...</div></div>';
  renderIcons();
  try {
    var [d, exp] = await Promise.all([
      api('/finance/summary').catch(function() { return null; }),
      api('/finance/expenses').catch(function() { return null; }),
    ]);
    if (currentView !== 'finance') return;
    _renderFinancePage(d, exp);
  } catch(e) {
    content.innerHTML = '<div style="padding:24px"><div style="color:var(--red);font-size:14px;padding:20px;background:var(--bg-secondary);border-radius:8px">⚠️ Ошибка: ' + escapeHtml(e.message || String(e)) + '</div></div>';
  }
}

function _finFmt(n) {
  if (!n) return '0';
  return Math.round(n).toLocaleString('ru-RU');
}

function _finCard(title, ipz, ekz, icon, color) {
  return '<div class="stat-card" style="padding:16px;min-width:0">' +
    '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;display:flex;align-items:center;gap:6px">' +
      '<span style="font-size:18px">' + icon + '</span>' + escapeHtml(title) +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      '<div style="text-align:center;padding:8px;background:rgba(79,107,204,0.07);border-radius:6px">' +
        '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">ИПЗ</div>' +
        '<div style="font-size:16px;font-weight:700;color:' + color + '">' + _finFmt(ipz) + '</div>' +
        '<div style="font-size:10px;color:var(--text-muted)">₽</div>' +
      '</div>' +
      '<div style="text-align:center;padding:8px;background:rgba(79,107,204,0.07);border-radius:6px">' +
        '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">ЭКЗ</div>' +
        '<div style="font-size:16px;font-weight:700;color:' + color + '">' + _finFmt(ekz) + '</div>' +
        '<div style="font-size:10px;color:var(--text-muted)">₽</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function _renderFinancePage(d, exp) {
  var content = document.getElementById('content');
  if (!d || !d.totals) {
    content.innerHTML = '<div style="padding:24px;color:var(--red)">Нет данных</div>';
    return;
  }
  var t = d.totals;
  var period = d.period || '2026-01-01';
  var asOf = d.data_as_of ? new Date(d.data_as_of).toLocaleString('ru-RU') : '';

  var h = '<div style="padding:24px">';
  h += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Данные из 1С · С ' + period.slice(0,10) + ' · Обновлено ' + asOf + '</div>';

  // ── KPI cards ──
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:24px">';
  h += _finCard('Входящие платежи', t.incoming.ipz, t.incoming.ekz, '💰', '#22c55e');
  h += _finCard('Расходы', t.outgoing.ipz, t.outgoing.ekz, '📤', '#ef4444');
  h += _finCard('Выручка (реализация)', t.revenue.ipz, t.revenue.ekz, '📈', '#4F6BCC');
  h += _finCard('Счета покупателям', t.invoices.ipz, t.invoices.ekz, '🧾', '#f59e0b');
  h += '</div>';

  // ── Monthly chart ──
  var months = Object.keys(d.monthly_revenue || {}).sort();
  if (months.length > 0) {
    h += '<h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Выручка по месяцам</h3>';
    h += '<div style="display:flex;gap:6px;align-items:flex-end;height:120px;margin-bottom:24px;overflow-x:auto">';
    var maxVal = Math.max.apply(null, months.map(function(m) {
      var mv = d.monthly_revenue[m] || {};
      return (mv.ipz || 0) + (mv.ekz || 0);
    })) || 1;
    months.forEach(function(m) {
      var mv = d.monthly_revenue[m] || {};
      var ipzH = Math.round(((mv.ipz || 0) / maxVal) * 90);
      var ekzH = Math.round(((mv.ekz || 0) / maxVal) * 90);
      var mn = m.slice(5); // MM
      h += '<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:40px">';
      h += '<div style="display:flex;gap:2px;align-items:flex-end;height:90px">';
      if (ipzH > 0) h += '<div style="width:14px;height:' + ipzH + 'px;background:#4F6BCC;border-radius:2px 2px 0 0" title="ИПЗ ' + _finFmt(mv.ipz) + '₽"></div>';
      if (ekzH > 0) h += '<div style="width:14px;height:' + ekzH + 'px;background:#22c55e;border-radius:2px 2px 0 0" title="ЭКЗ ' + _finFmt(mv.ekz) + '₽"></div>';
      h += '</div>';
      h += '<div style="font-size:10px;color:var(--text-muted);margin-top:4px">' + mn + '</div>';
      h += '</div>';
    });
    h += '</div>';
    h += '<div style="display:flex;gap:16px;font-size:11px;color:var(--text-secondary);margin-bottom:24px">';
    h += '<span><span style="display:inline-block;width:10px;height:10px;background:#4F6BCC;border-radius:2px;margin-right:4px"></span>ИПЗ</span>';
    h += '<span><span style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:2px;margin-right:4px"></span>ЭКЗ</span>';
    h += '</div>';
  }

  // ── Two columns: invoices + payments ──
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;flex-wrap:wrap">';

  // Invoices
  h += '<div>';
  h += '<h3 style="font-size:14px;font-weight:600;margin-bottom:10px">🧾 Последние счета покупателям</h3>';
  h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
  h += '<tr style="background:var(--bg-secondary)"><th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--border)">Дата</th><th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--border)">№</th><th style="text-align:right;padding:6px 8px;border-bottom:2px solid var(--border)">Сумма, ₽</th><th style="padding:6px 8px;border-bottom:2px solid var(--border)">Орг</th></tr>';
  (d.recent_invoices || []).forEach(function(inv) {
    h += '<tr style="border-bottom:1px solid var(--border)">';
    h += '<td style="padding:5px 8px">' + escapeHtml(inv.date) + '</td>';
    h += '<td style="padding:5px 8px;color:var(--accent)">' + escapeHtml(inv.number) + '</td>';
    h += '<td style="padding:5px 8px;text-align:right;font-weight:500">' + _finFmt(inv.amount) + '</td>';
    h += '<td style="padding:5px 8px;text-align:center"><span style="font-size:10px;background:var(--bg-secondary);padding:2px 5px;border-radius:4px">' + escapeHtml(inv.org) + '</span></td>';
    h += '</tr>';
  });
  h += '</table></div>';

  // Payments
  h += '<div>';
  h += '<h3 style="font-size:14px;font-weight:600;margin-bottom:10px">💰 Последние входящие платежи</h3>';
  h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
  h += '<tr style="background:var(--bg-secondary)"><th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--border)">Дата</th><th style="text-align:right;padding:6px 8px;border-bottom:2px solid var(--border)">Сумма, ₽</th><th style="padding:6px 8px;border-bottom:2px solid var(--border)">Орг</th></tr>';
  (d.recent_payments || []).forEach(function(p) {
    h += '<tr style="border-bottom:1px solid var(--border)">';
    h += '<td style="padding:5px 8px">' + escapeHtml(p.date) + '</td>';
    h += '<td style="padding:5px 8px;text-align:right;font-weight:500;color:#22c55e">' + _finFmt(p.amount) + '</td>';
    h += '<td style="padding:5px 8px;text-align:center"><span style="font-size:10px;background:var(--bg-secondary);padding:2px 5px;border-radius:4px">' + escapeHtml(p.org) + '</span></td>';
    h += '</tr>';
  });
  h += '</table></div>';

  h += '</div>';
  h += '</div>';

  // ── Аналитика расходов (факт vs план) ─────────────────────────────────────
  if (exp && exp.kpi) {
    h += _renderExpensesSection(exp);
  } else if (!exp) {
    h += '<div style="margin:16px;padding:14px;background:var(--bg-secondary);border-radius:8px;color:var(--text-muted);font-size:13px">📡 Аналитика расходов недоступна (ошибка загрузки данных)</div>';
  }

  content.innerHTML = h;
  renderIcons();
}

function _expFmt(n) {
  if (!n) return '0';
  var abs = Math.abs(Math.round(n));
  var s = abs >= 1e6 ? (abs/1e6).toFixed(1) + ' млн' : abs >= 1e3 ? (abs/1e3).toFixed(0) + ' тыс' : String(abs);
  return (n < 0 ? '−' : '') + s;
}

var _expOrg = 'ИП'; // текущая вкладка

function switchExpOrg(org) {
  _expOrg = org;
  document.querySelectorAll('.exp-org-tab').forEach(function(t) {
    t.style.background = t.dataset.org === org ? 'var(--accent)' : 'var(--bg-secondary)';
    t.style.color = t.dataset.org === org ? '#fff' : 'var(--text-muted)';
  });
  var ipz = document.getElementById('expSection_ИП');
  var ekz = document.getElementById('expSection_ЭК');
  if (ipz) ipz.style.display = org === 'ИП' ? 'block' : 'none';
  if (ekz) ekz.style.display = org === 'ЭК' ? 'block' : 'none';
}

function _renderExpensesSection(exp) {
  var MONTHS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  var h = '';
  h += '<div style="margin:0 16px 16px">';
  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">';
  h += '<div style="font-size:14px;font-weight:700;color:var(--text)">📊 Аналитика расходов (факт 1С vs план бюджет)</div>';
  if (exp.cached) h += '<span style="font-size:10px;color:var(--text-muted);background:var(--bg-secondary);padding:2px 7px;border-radius:8px">кеш 5 мин</span>';
  h += '</div>';

  // Вкладки орг
  h += '<div style="display:flex;gap:8px;margin-bottom:16px">';
  h += '<button class="exp-org-tab" data-org="ИП" onclick="switchExpOrg(this.dataset.org)" style="padding:6px 18px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;background:var(--accent);color:#fff">АО ИПЗ</button>';
  h += '<button class="exp-org-tab" data-org="ЭК" onclick="switchExpOrg(this.dataset.org)" style="padding:6px 18px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;background:var(--bg-secondary);color:var(--text-muted)">ЭКЗ</button>';
  h += '</div>';

  ['ИП', 'ЭК'].forEach(function(cfo) {
    var k = exp.kpi[cfo] || {};
    var contractors = (exp.contractors || {})[cfo] || [];
    var months = exp.months || [];
    var orgLabel = cfo === 'ИП' ? 'АО «Индустриальный Парк Звезда»' : 'Экспериментальный комплекс';
    var dev = k.fact_ytd - k.plan_ytd;
    var devCls = dev <= 0 ? '#22c55e' : '#ef4444'; // расходы: меньше плана = хорошо
    var devSign = dev >= 0 ? '+' : '−';

    h += '<div id="expSection_' + cfo + '" style="display:' + (cfo === 'ИП' ? 'block' : 'none') + '">';
    h += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">' + escapeHtml(orgLabel) + ' · 2026 г.</div>';

    // KPI cards
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">';
    h += '<div class="stat-card" style="padding:14px"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Факт YTD</div><div style="font-size:20px;font-weight:700;color:#60a5fa">' + _expFmt(k.fact_ytd) + '</div><div style="font-size:10px;color:var(--text-muted);margin-top:3px">фактические расходы</div></div>';
    h += '<div class="stat-card" style="padding:14px"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">План YTD</div><div style="font-size:20px;font-weight:700;color:#4ade80">' + _expFmt(k.plan_ytd) + '</div><div style="font-size:10px;color:var(--text-muted);margin-top:3px">бюджет на этот период</div></div>';
    h += '<div class="stat-card" style="padding:14px"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Отклонение</div><div style="font-size:20px;font-weight:700;color:' + devCls + '">' + devSign + _expFmt(Math.abs(dev)) + '</div><div style="font-size:10px;color:var(--text-muted);margin-top:3px">' + (dev <= 0 ? '▼ экономия' : '▲ перерасход') + '</div></div>';
    h += '<div class="stat-card" style="padding:14px"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Прогноз год</div><div style="font-size:20px;font-weight:700;color:#c084fc">' + _expFmt(k.forecast) + '</div><div style="font-size:10px;color:var(--text-muted);margin-top:3px">план: ' + _expFmt(k.plan_year) + '</div></div>';
    h += '</div>';

    // Помесячный график (CSS bars)
    var maxBar = 0;
    months.forEach(function(m) {
      maxBar = Math.max(maxBar, m.fact[cfo] || 0, m.plan[cfo] || 0);
    });
    if (maxBar > 0) {
      h += '<div style="background:var(--bg-secondary);border-radius:8px;padding:14px;margin-bottom:16px">';
      h += '<div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--text)">Помесячная динамика расходов</div>';
      h += '<div style="display:flex;align-items:flex-end;gap:4px;height:100px">';
      months.forEach(function(m) {
        var fh = Math.round((m.fact[cfo] || 0) / maxBar * 90);
        var ph = Math.round((m.plan[cfo] || 0) / maxBar * 90);
        h += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px">';
        h += '<div style="width:100%;display:flex;align-items:flex-end;gap:1px;height:90px">';
        // Факт
        h += '<div style="flex:1;background:' + (m.isPast ? '#3b82f6' : '#1e3a5f') + ';height:' + fh + 'px;border-radius:2px 2px 0 0;min-height:2px" title="Факт: ' + _expFmt(m.fact[cfo]) + '"></div>';
        // План
        h += '<div style="flex:1;background:' + (m.isPast ? '#16a34a55' : '#16a34a') + ';height:' + ph + 'px;border-radius:2px 2px 0 0;min-height:2px;border:1px dashed #16a34a" title="План: ' + _expFmt(m.plan[cfo]) + '"></div>';
        h += '</div>';
        h += '<div style="font-size:9px;color:var(--text-muted);margin-top:3px">' + escapeHtml(m.name) + '</div>';
        h += '</div>';
      });
      h += '</div>';
      h += '<div style="display:flex;gap:16px;margin-top:6px;font-size:10px;color:var(--text-muted)">';
      h += '<span><span style="display:inline-block;width:10px;height:10px;background:#3b82f6;border-radius:2px;margin-right:4px"></span>Факт (1С)</span>';
      h += '<span><span style="display:inline-block;width:10px;height:10px;background:transparent;border:1px dashed #16a34a;border-radius:2px;margin-right:4px"></span>План (бюджет)</span>';
      h += '</div>';
      h += '</div>';
    }

    // Таблица по контрагентам (раскрываемая до договоров)
    if (contractors.length > 0) {
      var pastMonths = months.filter(function(m) { return m.isPast; });
      h += '<div style="background:var(--bg-secondary);border-radius:8px;padding:14px;margin-bottom:16px">';
      h += '<div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--text)">Расходы по контрагентам (топ-20) — факт с начала 2026 <span style="font-weight:400;color:var(--text-muted);font-size:11px">— нажмите строку для раскрытия договоров</span></div>';
      h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">';
      h += '<thead><tr style="border-bottom:2px solid var(--border)">';
      h += '<th style="width:22px;padding:6px 4px"></th>';
      h += '<th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:500">Контрагент</th>';
      pastMonths.forEach(function(m) {
        h += '<th style="text-align:right;padding:6px 6px;color:var(--text-muted);font-weight:500;font-size:10px">' + escapeHtml(m.name) + '</th>';
      });
      h += '<th style="text-align:right;padding:6px 10px;color:var(--text-muted);font-weight:500">Итого</th>';
      h += '</tr></thead><tbody>';

      var grandTotal = contractors.reduce(function(s, c) { return s + c.total; }, 0);
      var cfoKey = cfo === 'ИП' ? 'IP' : (cfo === 'ЭК' ? 'EK' : cfo.replace(/[^a-zA-Z0-9]/g, ''));
      contractors.forEach(function(c, idx) {
        var gid = 'exp_' + cfoKey + '_' + idx;
        var hasBreakdown = c.contractBreakdown && c.contractBreakdown.length > 1;
        var rowBg = idx % 2 === 0 ? '' : 'background:rgba(255,255,255,0.02)';
        h += '<tr data-gid="' + gid + '" style="border-bottom:1px solid var(--border);' + rowBg + ';cursor:' + (hasBreakdown ? 'pointer' : 'default') + '" onclick="toggleExpense(this.dataset.gid)">';
        h += '<td style="padding:6px 4px;color:var(--text-muted);font-size:10px;text-align:center"><span id="expicon_' + gid + '">' + (hasBreakdown ? '▶' : '') + '</span></td>';
        h += '<td style="padding:6px 10px;font-weight:500;color:var(--text)">' + escapeHtml(c.name) + '</td>';
        months.forEach(function(m, i) {
          if (!m.isPast) return;
          var v = c.monthly[i] || 0;
          h += '<td style="text-align:right;padding:6px 6px;color:' + (v > 0 ? '#e2e8f0' : '#374151') + '">' + (v > 0 ? _expFmt(v) : '—') + '</td>';
        });
        var pct = grandTotal > 0 ? Math.round(c.total / grandTotal * 100) : 0;
        h += '<td style="text-align:right;padding:6px 10px;font-weight:700;color:#60a5fa">' + _expFmt(c.total) + ' <span style="font-size:10px;color:var(--text-muted)">(' + pct + '%)</span></td>';
        h += '</tr>';
        // Строки по договорам (скрыты)
        if (hasBreakdown) {
          c.contractBreakdown.forEach(function(br) {
            var cname = br.contract_num === '—' ? 'без договора' : br.contract_num;
            h += '<tr data-expgroup="' + gid + '" style="display:none;background:rgba(0,0,0,0.2)">';
            h += '<td></td>';
            h += '<td style="padding:4px 10px 4px 28px;color:var(--accent);font-size:11px">📄 ' + escapeHtml(cname) + '</td>';
            months.forEach(function(m, i) {
              if (!m.isPast) return;
              var v = br.monthly[i] || 0;
              h += '<td style="text-align:right;padding:4px 6px;font-size:11px;color:' + (v > 0 ? '#94a3b8' : '#374151') + '">' + (v > 0 ? _expFmt(v) : '—') + '</td>';
            });
            var bpct = c.total > 0 ? Math.round(br.total / c.total * 100) : 0;
            h += '<td style="text-align:right;padding:4px 10px;font-size:11px;color:#93c5fd">' + _expFmt(br.total) + ' <span style="color:#475569">(' + bpct + '%)</span></td>';
            h += '</tr>';
          });
        }
      });

      h += '</tbody></table></div>';
      h += '</div>';
    }

    h += '</div>'; // expSection
  });

  h += '</div>'; // outer
  return h;
}

function toggleExpense(gid) {
  var rows = document.querySelectorAll('[data-expgroup="' + gid + '"]');
  var icon = document.getElementById('expicon_' + gid);
  if (!rows.length) return;
  var isOpen = rows[0].style.display !== 'none';
  rows.forEach(function(r) { r.style.display = isOpen ? 'none' : 'table-row'; });
  if (icon) icon.textContent = isOpen ? '▶' : '▼';
}

function editBIUrl() {
  var editDiv = document.getElementById('bi_url_edit');
  if (editDiv) editDiv.style.display = 'flex';
}

async function showReports() {
  currentView = 'reports';
  setActive(null);
  document.getElementById('pageTitle').textContent = 'Отчёты';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';

  _reportFields = await api('/reports/fields');

  var content = document.getElementById('content');
  var html = '<div style="max-width:900px;margin:0 auto">';

  // Tabs
  html += '<div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border)">';
  html += '<button id="tabPivot" class="btn" data-tab="pivot" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">Сводная таблица</button>';
  html += '<button id="tabLinked" class="btn" data-tab="linked" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">По связям</button>';
  html += '<button id="tabAgg" class="btn btn-primary" data-tab="agg" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">Анализ затрат</button>';
  html += '<button id="tabWorkHistory" class="btn" data-tab="workHistory" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">История работ</button>';
  html += '<button id="tabRentAnalysis" class="btn" data-tab="rentAnalysis" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">Анализ аренды</button>';
  html += '</div>';

  // Pivot section (drag-and-drop)
  _pivotRowFields = [];
  _pivotColFields = [];
  html += '<div id="sectionPivot" style="display:none">';
  html += '<div class="detail-section">';
  html += '<h3>Сводная таблица</h3>';

  // Field pool — all document fields flat
  html += '<div style="margin-bottom:16px">';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Поля — перетащите в Строки или Столбцы</div>';
  html += '<div class="pivot-field-pool" id="pivotFieldPool" ondragover="event.preventDefault()" ondrop="onPivotDrop(event,this)"></div>';
  html += '</div>';

  // Drop zones
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';
  html += '<div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">↕ Строки</div>';
  html += '<div class="pivot-zone" id="pivotRowZone" data-zone="rows" ondragover="onPivotDragOver(event,this)" ondragleave="onPivotDragLeave(this)" ondrop="onPivotDrop(event,this)">';
  html += '<div class="pivot-zone-hint">Перетащите поле сюда</div>';
  html += '</div></div>';
  html += '<div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">↔ Столбцы</div>';
  html += '<div class="pivot-zone" id="pivotColZone" data-zone="cols" ondragover="onPivotDragOver(event,this)" ondragleave="onPivotDragLeave(this)" ondrop="onPivotDrop(event,this)">';
  html += '<div class="pivot-zone-hint">Перетащите поле сюда (необязательно)</div>';
  html += '</div></div>';
  html += '</div>';

  html += '<button class="btn btn-primary" onclick="buildPivotTable()">Построить таблицу</button>';
  html += '</div>';
  html += '<div id="pivotResults"></div>';
  html += '</div>';

  // Linked reports section
  html += '<div id="sectionLinked">';
  html += '<div class="detail-section"><h3>Отчёты по связям</h3>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:16px">';
  var linkedReports = [
    { type: 'equipment_by_location', lucide: 'building-2', title: 'Оборудование по корпусам', desc: 'Где установлено каждое оборудование' },
    { type: 'equipment_by_tenant',   lucide: 'landmark',   title: 'Оборудование у арендаторов', desc: 'Какое оборудование в арендуемых помещениях' },
  ];
  linkedReports.forEach(function(r) {
    html += '<div class="child-card" onclick="runLinkedReport(&quot;' + r.type + '&quot;)" style="cursor:pointer;padding:14px">';
    html += '<div style="margin-bottom:6px;color:var(--accent)">' + icon(r.lucide, 24) + '</div>';
    html += '<div style="font-weight:600;margin-bottom:4px">' + r.title + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted)">' + r.desc + '</div>';
    html += '</div>';
  });
  html += '</div></div>';
  html += '<div id="linkedResults"></div>';
  html += '</div>';

  // Aggregate report section
  _aggHierarchy = [];
  html += '<div id="sectionAgg" style="display:none">';
  html += '<div class="detail-section"><h3>Анализ затрат по оборудованию</h3>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px">';

  // Left: filters
  html += '<div>';
  html += '<div class="form-group"><label>Типы договоров *</label><div id="aggTypeFilter" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">';
  AGG_CONTRACT_TYPES.forEach(function(t) {
    html += '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-weight:normal">';
    html += '<input type="checkbox" class="agg-type-cb" value="' + t + '" checked> ' + t;
    html += '</label>';
  });
  html += '</div></div>';
  html += '<div class="form-group"><label>Период</label>';
  html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">от&nbsp;<input type="date" id="aggDateFrom" style="flex:1;min-width:120px">&nbsp;до&nbsp;<input type="date" id="aggDateTo" style="flex:1;min-width:120px"></div></div>';
  html += '<div class="form-group"><label>Контрагент</label><select id="aggContractor" style="width:100%"><option value="">— Все —</option>';
  _allCompanies.forEach(function(c) { html += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'; });
  html += '</select></div>';
  html += '<div class="form-group"><label>Суммировать</label><select id="aggMetric" style="width:100%">';
  html += '<option value="contract_amount">Сумма договора</option>';
  html += '<option value="rent_monthly">Аренда в месяц</option>';
  html += '</select></div>';
  html += '</div>';

  // Right: hierarchy builder
  html += '<div>';
  html += '<div class="form-group"><label>Группировка строк</label>';
  html += '<div id="aggHierarchyList" style="min-height:50px;border:2px dashed var(--border);border-radius:6px;padding:8px;background:var(--bg-secondary);margin-bottom:8px">';
  html += '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:6px">Добавьте поля из списка ниже</div>';
  html += '</div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Доступные поля (нажмите чтобы добавить):</div>';
  html += '<div id="aggFieldPool" style="display:flex;flex-wrap:wrap;gap:6px">';
  AGG_HIERARCHY_FIELDS.forEach(function(f) {
    html += '<button type="button" class="btn btn-sm agg-pool-btn" data-name="' + f.name + '" onclick="aggAddField(this.dataset.name)" style="font-size:11px">' + escapeHtml(f.label) + ' +</button>';
  });
  html += '</div></div>';
  html += '</div>';

  html += '</div>'; // end grid
  html += '<button class="btn btn-primary" onclick="buildAggregateReport()">Построить отчёт</button>';
  html += '</div>'; // end detail-section
  html += '<div id="aggResults"></div>';
  html += '</div>'; // end sectionAgg

  // Work History section
  html += '<div id="sectionWorkHistory" style="display:none">';
  html += '<div class="detail-section"><h3>История работ по оборудованию</h3>';
  html += '<p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Матрица: строки — оборудование, столбцы — виды работ из актов</p>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">';
  html += '<div class="form-group"><label>Категория</label><select id="whCategory" style="width:100%"><option value="">— Все категории —</option>';
  EQUIPMENT_CATEGORIES.forEach(function(c) { html += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
  html += '</select></div>';
  html += '<div class="form-group"><label>Корпус</label><select id="whBuilding" style="width:100%"><option value="">— Все корпуса —</option>';
  (_buildings || []).forEach(function(b) { html += '<option value="' + b.id + '">' + escapeHtml(b.name) + '</option>'; });
  html += '</select></div>';
  html += '<div class="form-group"><label>Период (акты)</label><div style="display:flex;gap:6px;align-items:center">от&nbsp;<input type="date" id="whDateFrom" style="flex:1">&nbsp;до&nbsp;<input type="date" id="whDateTo" style="flex:1"></div></div>';
  html += '</div>';
  html += '<button class="btn btn-primary" onclick="buildWorkHistoryReport()">Построить таблицу</button>';
  html += '</div>'; // end detail-section
  html += '<div id="whResults"></div>';
  html += '</div>'; // end sectionWorkHistory

  // Rent Analysis section
  html += '<div id="sectionRentAnalysis" style="display:none">';
  html += '<div class="detail-section">';
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px">';
  html += '<div>';
  html += '<h3 style="margin:0 0 4px">Анализ аренды</h3>';
  html += '<p style="margin:0;font-size:12px;color:var(--text-muted)">Фильтры + группировка по любым полям</p>';
  html += '</div>';
  html += '<button class="btn btn-primary" onclick="buildRentAnalysis()">Загрузить данные</button>';
  html += '</div>';
  // Column selector (collapsible)
  html += '<div style="margin-bottom:12px">';
  html += '<button type="button" class="btn btn-sm" onclick="_toggleRentColPanel()" style="font-size:11px;margin-bottom:6px">☰ Столбцы</button>';
  html += '<div id="rentColPanel" style="display:none;border:1px solid var(--border);border-radius:6px;padding:10px;background:var(--bg-secondary)">';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Выберите столбцы для отображения:</div>';
  html += '<div id="rentColCheckboxes" style="display:flex;flex-wrap:wrap;gap:8px 20px"></div>';
  html += '<div style="margin-top:8px;display:flex;gap:8px">';
  html += '<button type="button" class="btn btn-sm" onclick="_rentColSelectAll(true)">Все</button>';
  html += '<button type="button" class="btn btn-sm" onclick="_rentColSelectAll(false)">Ничего</button>';
  html += '</div></div>';
  html += '</div>';
  // Filter-headers zone (replaces group-by)
  html += '<div style="margin-bottom:12px">';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Строки отбора:</div>';
  html += '<div id="rentGroupZone" style="display:flex;flex-direction:column;gap:4px;min-height:20px"></div>';
  html += '<div id="rentGroupFieldBtns" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>';
  html += '</div>';
  html += '</div>';
  html += '<div id="rentResults"></div>';
  html += '</div>'; // end sectionRentAnalysis

  html += '</div>';
  content.innerHTML = html;
  renderIcons();
  switchReportTab('agg');
  updatePivotFieldPool(); // fill pool for default entity type
}

function switchReportTab(tab) {
  var tabs = ['pivot','linked','agg','workHistory','rentAnalysis'];
  tabs.forEach(function(t) {
    var btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
    var sec = document.getElementById('section' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) { btn.className = (t === tab) ? 'btn btn-primary' : 'btn'; btn.style.cssText = 'border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px'; }
    if (sec) sec.style.display = (t === tab) ? '' : 'none';
  });
}

// ============ AGGREGATE REPORT ============

function aggAddField(name) {
  if (_aggHierarchy.indexOf(name) >= 0) return;
  _aggHierarchy.push(name);
  renderAggHierarchyUI();
}

function aggRemoveField(name) {
  _aggHierarchy = _aggHierarchy.filter(function(n) { return n !== name; });
  renderAggHierarchyUI();
}

function aggMoveField(name, dir) {
  var idx = _aggHierarchy.indexOf(name);
  if (idx < 0) return;
  var newIdx = idx + (dir === 'up' ? -1 : 1);
  if (newIdx < 0 || newIdx >= _aggHierarchy.length) return;
  _aggHierarchy.splice(idx, 1);
  _aggHierarchy.splice(newIdx, 0, name);
  renderAggHierarchyUI();
}

function renderAggHierarchyUI() {
  var listEl = document.getElementById('aggHierarchyList');
  var poolEl = document.getElementById('aggFieldPool');
  if (!listEl || !poolEl) return;

  if (_aggHierarchy.length === 0) {
    listEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:6px">Добавьте поля из списка ниже</div>';
  } else {
    listEl.innerHTML = _aggHierarchy.map(function(name, i) {
      var f = AGG_ALL_FIELDS.find(function(x) { return x.name === name; });
      var label = f ? f.label : name;
      var isFirst = (i === 0), isLast = (i === _aggHierarchy.length - 1);
      return '<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">' +
        '<span style="color:var(--text-muted);font-size:11px;width:18px;text-align:right">' + (i+1) + '.</span>' +
        '<span style="flex:1;padding:4px 10px;background:var(--bg-hover);border-radius:4px;font-size:13px">' + escapeHtml(label) + '</span>' +
        '<button type="button" class="btn btn-sm" style="padding:2px 7px" data-name="' + name + '" data-dir="up" onclick="aggMoveField(this.dataset.name,this.dataset.dir)"' + (isFirst?' disabled':'') + '>↑</button>' +
        '<button type="button" class="btn btn-sm" style="padding:2px 7px" data-name="' + name + '" data-dir="down" onclick="aggMoveField(this.dataset.name,this.dataset.dir)"' + (isLast?' disabled':'') + '>↓</button>' +
        '<button type="button" class="btn btn-sm" style="padding:2px 7px;color:var(--danger)" data-name="' + name + '" onclick="aggRemoveField(this.dataset.name)">×</button>' +
        '</div>';
    }).join('');
  }

  poolEl.innerHTML = AGG_HIERARCHY_FIELDS.filter(function(f) {
    return _aggHierarchy.indexOf(f.name) < 0;
  }).map(function(f) {
    return '<button type="button" class="btn btn-sm agg-pool-btn" data-name="' + f.name + '" onclick="aggAddField(this.dataset.name)" style="font-size:11px">' + escapeHtml(f.label) + ' +</button>';
  }).join(' ');
}

async function buildAggregateReport() {
  if (_aggHierarchy.length === 0) { alert('Добавьте хотя бы одно поле в группировку'); return; }
  await loadBrokenEquipment(); // ensure broken IDs are fresh before rendering
  var types = Array.from(document.querySelectorAll('.agg-type-cb:checked')).map(function(cb) { return cb.value; });
  if (types.length === 0) { alert('Выберите хотя бы один тип договора'); return; }

  var metric      = document.getElementById('aggMetric').value;
  var dateFrom    = document.getElementById('aggDateFrom').value;
  var dateTo      = document.getElementById('aggDateTo').value;
  var contractorId = document.getElementById('aggContractor').value;

  var p = new URLSearchParams();
  p.set('contract_types', types.join('|'));
  p.set('metric', metric);
  if (dateFrom) p.set('date_from', dateFrom);
  if (dateTo)   p.set('date_to', dateTo);
  if (contractorId) p.set('contractor_id', contractorId);

  var resultsEl = document.getElementById('aggResults');
  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';

  var data;
  try { data = await api('/reports/aggregate?' + p.toString()); }
  catch(e) { resultsEl.innerHTML = '<div style="color:var(--danger);padding:12px">Ошибка: ' + escapeHtml(String(e.message || e)) + '</div>'; return; }

  if (!data.length) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных по выбранным параметрам</div>';
    return;
  }
  var metricLabel = (metric === 'rent_monthly') ? 'Аренда в мес.' : 'Сумма договора';
  // Auto-extend hierarchy: [user grouping] → Категория → Вид → Оборудование → Договор
  var autoHierarchy = _aggHierarchy.slice();
  AGG_AUTO_DRILL.forEach(function(f) {
    if (autoHierarchy.indexOf(f) < 0) autoHierarchy.push(f);
  });
  resultsEl.innerHTML = renderAggTree(data, autoHierarchy, metric, metricLabel);
}

function renderAggTree(rows, hierarchy, metric, metricLabel) {
  // Build nested tree from flat rows
  function buildLevel(data, depth) {
    var total = data.reduce(function(s, r) { return s + (r[metric] || 0); }, 0);
    if (depth >= hierarchy.length) return { contracts: data, total: total };
    var field = hierarchy[depth];
    var order = [], map = {};
    data.forEach(function(r) {
      var val = (r[field] || '—');
      if (!map[val]) { map[val] = []; order.push(val); }
      map[val].push(r);
    });
    order.sort(function(a,b) { return String(a).localeCompare(String(b),'ru'); });
    var children = order.map(function(key) {
      var child = buildLevel(map[key], depth + 1);
      // Find best representative row: prefer row with eq_status set
      var rows = map[key];
      var bestRow = rows.find(function(r){ return r.eq_status; }) || rows[0] || {};
      child.first_row = bestRow;
      return Object.assign({ key: key }, child);
    });
    return { children: children, total: total };
  }

  var tree = buildLevel(rows, 0);
  var _uid = 0;

  function renderNode(node, depth) {
    var h = '';
    if (node.children) {
      node.children.forEach(function(child) {
        var id = 'agg_' + (++_uid);
        var field = hierarchy[depth];
        var fDef = AGG_ALL_FIELDS.find(function(x) { return x.name === field; });
        var fLabel = fDef ? fDef.label : field;
        // Emergency/broken check for equipment-level nodes
        var isEqField = (field === 'eq_name' || field === 'equipment');
        var fr = child.first_row || {};
        var nodeEqId = isEqField ? (parseInt(fr.eq_id) || 0) : 0;
        var nodeIsB = isEqField && nodeEqId > 0 && _brokenEqIds.has(nodeEqId);
        var nodeIsE = isEqField && (fr.eq_status === 'Аварийное');
        var nodeRowStyle = nodeIsB ? 'background:rgba(239,68,68,.09);border-left:2px solid #dc2626;'
          : (nodeIsE ? 'background:rgba(184,92,92,.10);border-left:2px solid #b85c5c;' : '');
        var nodeNameStyle = nodeIsB ? 'color:#dc2626;font-weight:600;' : (nodeIsE ? 'color:#b85c5c;font-weight:600;' : 'font-weight:' + (depth < 2 ? '600' : '400') + ';');
        var nodeBadge = nodeIsB ? ' <span class="eq-broken-badge">⚠ Нерабочий</span>'
          : (nodeIsE ? ' <span class="eq-emergency-badge">⚠ Авария</span>' : '');
        h += '<div style="margin-left:' + (depth * 18) + 'px">';
        h += '<div class="agg-tree-row" data-target="' + id + '" onclick="aggToggle(this.dataset.target)" style="' + nodeRowStyle + '">';
        h += '<span id="' + id + '_ico" style="font-size:10px;color:var(--text-muted);width:12px">▶</span>';
        h += '<span style="font-size:11px;color:var(--text-muted);min-width:130px">' + escapeHtml(fLabel) + '</span>';
        h += '<span style="flex:1;' + nodeNameStyle + '">' + escapeHtml(String(child.key)) + nodeBadge + '</span>';
        h += '<span class="agg-total">' + _fmtNum(child.total) + ' ₽</span>';
        h += '</div>';
        h += '<div id="' + id + '" style="display:none">' + renderNode(child, depth + 1) + '</div>';
        h += '</div>';
      });
    }
    if (node.contracts) {
      // If eq_name already used in hierarchy above → skip eqGroups header, list docs directly
      var eqAlreadyGrouped = hierarchy.slice(0, depth).indexOf('eq_name') >= 0;
      if (eqAlreadyGrouped) {
        node.contracts.forEach(function(r) {
          h += '<div class="agg-tree-leaf" style="margin-left:' + (depth * 18) + 'px" onclick="showEntity(' + (r.act_id || r.contract_id) + ')">';
          h += '<span style="width:12px"> </span><span>📄</span>';
          h += '<span style="flex:1;font-size:12px;color:var(--text-secondary)">' + escapeHtml(r.act_name || r.contract_name) + '</span>';
          if (r.act_date || r.contract_date) h += '<span style="font-size:11px;color:var(--text-muted);margin-right:8px">' + (r.act_date || r.contract_date) + '</span>';
          h += '<span class="agg-total">' + _fmtNum(r[metric]) + ' ₽</span>';
          h += '</div>';
        });
        return h;
      }
      // Group rows by equipment so each unit appears once with total, expandable per-document
      var eqGroups = {}, eqOrder = [];
      node.contracts.forEach(function(r) {
        var key = 'eq_' + (r.eq_id || r.contract_id);
        if (!eqGroups[key]) {
          eqGroups[key] = { eq_id: r.eq_id, contract_id: r.contract_id,
            eq_name: r.eq_name || r.contract_name, eq_status: r.eq_status, total: 0, docs: [] };
          eqOrder.push(key);
        }
        // Update eq_status from any row that has it (first row may have empty status)
        if (!eqGroups[key].eq_status && r.eq_status) eqGroups[key].eq_status = r.eq_status;
        eqGroups[key].total += (r[metric] || 0);
        eqGroups[key].docs.push(r);
      });

      eqOrder.forEach(function(key) {
        var grp = eqGroups[key];
        var eqId = grp.eq_id || grp.contract_id;
        var isBroken = _brokenEqIds.has(parseInt(eqId));
        var isEmerg = (grp.eq_status === 'Аварийное');
        var leafBg = isBroken ? 'background:rgba(239,68,68,.09);border-radius:4px;border-left:2px solid #dc2626;padding-left:6px;'
          : (isEmerg ? 'background:rgba(184,92,92,.10);border-radius:4px;border-left:2px solid #b85c5c;padding-left:6px;' : '');
        var leafColor = isBroken ? 'color:#dc2626;font-weight:500;' : (isEmerg ? 'color:#b85c5c;font-weight:500;' : '');
        var hasMulti = grp.docs.length > 1;
        var detId = 'eqd_' + (++_uid);

        h += '<div style="margin-left:' + (depth * 18) + 'px">';
        // Summary row
        h += '<div class="agg-tree-leaf" style="' + leafBg + '" data-det-id="' + detId + '" data-eq-id="' + eqId + '" data-multi="' + (hasMulti ? '1' : '0') + '" onclick="aggLeafClick(this)">';
        if (hasMulti) h += '<span id="' + detId + '_ico" style="font-size:10px;color:var(--text-muted);width:12px">▶</span>';
        else h += '<span style="width:12px"> </span>';
        h += '<span>⚙️</span>';
        h += '<span style="flex:1;' + leafColor + '">';
        h += escapeHtml(grp.eq_name);
        if (isBroken) h += '<span class="eq-broken-badge">⚠ Нерабочий</span>';
        else if (isEmerg) h += '<span class="eq-emergency-badge">⚠ Авария</span>';
        if (hasMulti) {
          h += '<span style="font-size:11px;color:var(--text-muted);margin-left:6px">' + grp.docs.length + ' док.</span>';
        } else {
          var r0 = grp.docs[0];
          if (r0.act_name) h += '<span style="font-size:11px;color:var(--text-muted);margin-left:6px">' + escapeHtml(r0.act_name) + '</span>';
        }
        h += '</span>';
        if (!hasMulti) {
          var r1 = grp.docs[0];
          if (r1.act_date || r1.contract_date) h += '<span style="font-size:11px;color:var(--text-muted);margin-right:8px">' + (r1.act_date || r1.contract_date) + '</span>';
        }
        h += '<span class="agg-total">' + _fmtNum(grp.total) + ' ₽</span>';
        h += '</div>';

        // Expandable detail rows
        if (hasMulti) {
          h += '<div id="' + detId + '" style="display:none">';
          grp.docs.forEach(function(r) {
            h += '<div class="agg-tree-leaf" style="margin-left:20px;opacity:.85" onclick="showEntity(' + (r.act_id || r.contract_id) + ')">';
            h += '<span style="width:12px"></span><span>📄</span>';
            h += '<span style="flex:1;font-size:12px;color:var(--text-secondary)">' + escapeHtml(r.act_name || r.contract_name) + '</span>';
            if (r.act_date || r.contract_date) h += '<span style="font-size:11px;color:var(--text-muted);margin-right:8px">' + (r.act_date || r.contract_date) + '</span>';
            h += '<span class="agg-total">' + _fmtNum(r[metric]) + ' ₽</span>';
            h += '</div>';
          });
          h += '</div>';
        }
        h += '</div>';
      });
    }
    return h;
  }

  var totalFmt = _fmtNum(tree.total);
  var h = '<div class="detail-section" style="margin-top:16px">';
  h += '<div style="display:flex;justify-content:space-between;margin-bottom:12px;font-weight:600">';
  var _uniqueEq = new Set(rows.map(function(r) { return r.eq_id || r.contract_id; })).size;
  h += '<span>' + _uniqueEq + ' ед. оборудования (' + rows.length + ' записей)</span><span>' + escapeHtml(metricLabel) + ': ' + totalFmt + ' ₽</span>';
  h += '</div>';
  h += renderNode(tree, 0);
  h += '</div>';
  return h;
}

function aggToggle(id) {
  var el = document.getElementById(id);
  var ico = document.getElementById(id + '_ico');
  if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : '';
  if (ico) ico.textContent = open ? '▶' : '▼';
}

function aggLeafClick(el) {
  if (el.dataset.multi === '1') aggToggle(el.dataset.detId);
  else showEntity(parseInt(el.dataset.eqId));
}

// ============ PIVOT TABLE (drag-and-drop) ============

var _pivotSkipFields = [
  'rent_objects','rent_comments','equipment_list','act_items','parent_contract_id','parent_contract_name',
  'our_legal_entity_id','contractor_id','subtenant_id','balance_owner_id','balance_owner_name',
  'extra_services','duration_type', // internal flags — not useful for pivot
];
var _pivotFieldLabels = {
  // Contract / supplement main fields
  contract_type: 'Тип договора', our_legal_entity: 'Наше юр. лицо', contractor_name: 'Контрагент',
  subtenant_name: 'Субарендатор', number: 'Номер договора', contract_date: 'Дата договора',
  our_role_label: 'Роль нашей стороны', contractor_role_label: 'Роль контрагента',
  changes_description: 'Что поменялось',
  // Dynamic contract fields
  subject: 'Предмет договора', service_subject: 'Описание работ / предмет', service_comment: 'Комментарий',
  contract_end_date: 'Срок действия (до)',
  contract_amount: 'Сумма договора',
  rent_monthly: 'Аренда в месяц', payment_date: 'Дата оплаты',
  duration_date: 'Дата окончания', duration_text: 'Срок действия',
  advances: 'Авансы (да/нет)', advance_amount: 'Сумма аванса',
  vat_rate: 'в т.ч. НДС, %', completion_deadline: 'Срок выполнения',
  extra_services_desc: 'Доп. услуги', extra_services_cost: 'Стоимость доп. услуг',
  // Rent object fields
  building: 'Корпус', room: 'Помещение', object_type: 'Тип объекта', tenant: 'Арендатор',
  equipment: 'Оборудование по договору',
  // Equipment entity fields
  equipment_category: 'Категория оборудования',
  status: 'Статус оборудования', inv_number: 'Инв. номер', balance_owner: 'Собственник',
  serial_number: 'Серийный номер', year: 'Год выпуска', manufacturer: 'Производитель',
  // Company fields
  is_own: 'Наша / чужая орг.', inn: 'ИНН',
  // Location fields
  area: 'Площадь', purpose: 'Назначение', cadastral_number: 'Кадастровый №',
  // Order fields
  order_type: 'Тип приказа', order_number: 'Номер приказа', order_date: 'Дата приказа',
  // Virtual equipment fields (available through contract rent_objects)
  eq_name: 'Оборудование', eq_category: 'Категория оборудования',
  eq_status: 'Статус оборудования',
  eq_inv_number: 'Инв. № оборудования', eq_manufacturer: 'Производитель оборудования',
};

// All document types shown in pivot pool
var _PIVOT_DOC_TYPES = ['contract', 'supplement', 'order', 'document'];

function updatePivotFieldPool() {
  var pool = document.getElementById('pivotFieldPool');
  if (!pool) return;
  var inZones = _pivotRowFields.concat(_pivotColFields).map(function(f) { return f.name; });

  function makeChip(f) {
    var label = _pivotFieldLabels[f.name] || f.name_ru || f.name;
    if (inZones.indexOf(f.name) >= 0) return '';
    return '<div class="pivot-chip" draggable="true" data-field="' + f.name + '" data-label="' + label.replace(/"/g, '&quot;') + '" data-entity-type="' + (f.entity_type || '') + '" ondragstart="onPivotDragStart(event,this)">' + label + '</div>';
  }

  // Build groups per document type
  var groups = {};
  _PIVOT_DOC_TYPES.forEach(function(tn) { groups[tn] = []; });

  // Fields from DB (field_definitions table)
  _reportFields.forEach(function(f) {
    if (_pivotSkipFields.indexOf(f.name) >= 0) return;
    if (f.name.charAt(0) === '_') return;
    var t = f.entity_type;
    if (!t || _PIVOT_DOC_TYPES.indexOf(t) < 0) return;
    if (!groups[t].find(function(x) { return x.name === f.name; }))
      groups[t].push(f);
  });

  // Contract extra fields (from rent_objects + virtual equipment)
  var contractExtra = ['building','room','object_type','rent_monthly','contract_amount','advances',
    'completion_deadline','subject','service_subject','service_comment','duration_date','duration_text','tenant','equipment','vat_rate'];
  contractExtra.forEach(function(name) {
    if (!groups.contract.find(function(f) { return f.name === name; }))
      groups.contract.push({ name: name, name_ru: _pivotFieldLabels[name] || name, entity_type: 'contract' });
  });
  // Virtual equipment fields via contract rent_objects
  ['eq_name','eq_category','eq_status','eq_inv_number','eq_manufacturer'].forEach(function(name) {
    groups.contract.push({ name: name, name_ru: _pivotFieldLabels[name] || name, entity_type: 'contract' });
  });

  // Render grouped
  var html = '';
  _PIVOT_DOC_TYPES.forEach(function(tn) {
    var tObj = entityTypes.find(function(t) { return t.name === tn; });
    var chips = groups[tn].map(makeChip).join('');
    if (!chips.trim()) return;
    html += '<div style="margin-bottom:8px">';
    if (tObj) html += '<span style="font-size:10px;color:var(--text-muted);margin-right:4px;text-transform:uppercase;letter-spacing:0.5px">' + tObj.icon + ' ' + tObj.name_ru + '</span>';
    html += chips + '</div>';
  });
  pool.innerHTML = html || '<div style="color:var(--text-muted);font-size:12px;padding:4px">Нет полей</div>';
}

function onPivotDragStart(event, el) {
  _pivotDragField = { name: el.dataset.field, label: el.dataset.label, entity_type: el.dataset.entityType || '' };
  var parent = el.parentElement;
  _pivotDragSource = parent ? parent.id : 'pivotFieldPool';
  event.dataTransfer.effectAllowed = 'move';
}

function onPivotDragOver(event, zone) {
  event.preventDefault();
  zone.classList.add('drag-over');
}

function onPivotDragLeave(zone) {
  zone.classList.remove('drag-over');
}

function onPivotDrop(event, zone) {
  event.preventDefault();
  zone.classList.remove('drag-over');
  if (!_pivotDragField) return;

  var targetZone = zone.dataset.zone || 'pool'; // 'rows', 'cols', or 'pool'
  var field = _pivotDragField;
  _pivotDragField = null;
  _pivotDragSource = null;

  // Remove from wherever the field was before
  _pivotRowFields = _pivotRowFields.filter(function(f) { return f.name !== field.name; });
  _pivotColFields = _pivotColFields.filter(function(f) { return f.name !== field.name; });

  if (targetZone === 'rows') _pivotRowFields.push(field);
  else if (targetZone === 'cols') _pivotColFields.push(field);
  // pool: already removed above

  updatePivotZones();
}

function pivotRemoveChip(el) {
  var field = el.dataset.field;
  var zone = el.dataset.zone;
  if (zone === 'rows') _pivotRowFields = _pivotRowFields.filter(function(f) { return f.name !== field; });
  if (zone === 'cols') _pivotColFields = _pivotColFields.filter(function(f) { return f.name !== field; });
  updatePivotZones();
}

function updatePivotZones() {
  updatePivotFieldPool(); // sync pool (chips removed from zones reappear here)
  var rowZone = document.getElementById('pivotRowZone');
  var colZone = document.getElementById('pivotColZone');

  if (rowZone) {
    if (_pivotRowFields.length === 0) {
      rowZone.innerHTML = '<div class="pivot-zone-hint">Перетащите поле сюда</div>';
    } else {
      rowZone.innerHTML = _pivotRowFields.map(function(f) {
        return '<div class="pivot-chip pivot-chip-row" draggable="true" data-field="' + f.name + '" data-label="' + f.label + '" data-entity-type="' + (f.entity_type || '') + '" ondragstart="onPivotDragStart(event,this)">' +
          escapeHtml(f.label) +
          '<span class="pivot-chip-remove" data-field="' + f.name + '" data-zone="rows" onclick="pivotRemoveChip(this)">×</span></div>';
      }).join('');
    }
  }

  if (colZone) {
    if (_pivotColFields.length === 0) {
      colZone.innerHTML = '<div class="pivot-zone-hint">Перетащите поле сюда (необязательно)</div>';
    } else {
      colZone.innerHTML = _pivotColFields.map(function(f) {
        return '<div class="pivot-chip pivot-chip-col" draggable="true" data-field="' + f.name + '" data-label="' + f.label + '" data-entity-type="' + (f.entity_type || '') + '" ondragstart="onPivotDragStart(event,this)">' +
          escapeHtml(f.label) +
          '<span class="pivot-chip-remove" data-field="' + f.name + '" data-zone="cols" onclick="pivotRemoveChip(this)">×</span></div>';
      }).join('');
    }
  }
}

function _getPivotVal(props, field) {
  var v = props[field];
  if (v === undefined || v === null || v === '') return '—';
  // Boolean fields — render as human-readable
  if (field === 'is_own') {
    var bv = String(v).toLowerCase();
    return bv === 'true' ? 'Наша организация' : 'Контрагент';
  }
  return String(v);
}

var _pivotCellData = {}; // stored for drill-down clicks

// Numeric fields — show sum instead of count when used as columns
var _numericFieldNames = new Set(['contract_amount','advance_amount','rent_monthly','extra_services_cost','total_area','area','vat_rate','payment_date']);

function _isNumericField(name) {
  if (_numericFieldNames.has(name)) return true;
  var f = _reportFields.find(function(r) { return r.name === name; });
  return f && f.field_type === 'number';
}

function _fmtNum(v) {
  if (!v && v !== 0) return '—';
  var n = parseFloat(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

var _pivotCellData = {}; // stored for drill-down clicks

async function buildPivotTable() {
  var rowFields = _pivotRowFields;
  var colFields = _pivotColFields;
  if (rowFields.length === 0) { alert('Перетащите хотя бы одно поле в Строки'); return; }

  // Split columns: categorical (cross-tab) vs numeric (sum)
  var catCols = colFields.filter(function(f) { return !_isNumericField(f.name); });
  var numCols = colFields.filter(function(f) { return _isNumericField(f.name); });

  // Equipment mode: if any row/col field is equipment-related, show equipment items not documents
  var _eqFields = new Set(['eq_name','eq_category','eq_status','eq_inv_number','eq_manufacturer','equipment']);
  var equipmentMode = rowFields.concat(colFields).some(function(f) { return _eqFields.has(f.name); });
  var unitLabel = equipmentMode ? 'единиц оборудования' : 'документов';

  var resultsEl = document.getElementById('pivotResults');
  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка данных...</div>';

  // Fetch all document types in parallel
  var allArrays = await Promise.all(
    _PIVOT_DOC_TYPES.map(function(tn) { return api('/entities?limit=2000&type=' + encodeURIComponent(tn)); })
  );
  var entities = [].concat.apply([], allArrays);

  // Expand rent_objects — keep original entity reference per row
  var rows = [];
  entities.forEach(function(e) {
    var props = Object.assign({}, e.properties || {});
    var ros = null;
    if (props.rent_objects) {
      try { ros = typeof props.rent_objects === 'string' ? JSON.parse(props.rent_objects) : props.rent_objects; } catch(ex) {}
    }
    if (ros && Array.isArray(ros) && ros.length > 0) {
      ros.forEach(function(ro) {
        var merged = Object.assign({}, props, ro);
        // Enrich with equipment entity fields (virtual eq_* fields)
        // Enrich with room entity fields
        if (ro.room_id) {
          var rm = _getRoomById(ro.room_id);
          if (rm) {
            var rp = rm.properties || {};
            if (!merged.room) merged.room = rm.name || '';
            if (!merged.area && rp.area) merged.area = rp.area;
            if (!merged.object_type && rp.room_type) merged.object_type = rp.room_type;
            if (!merged.room_type) merged.room_type = rp.room_type || '';
            if (!merged.building) {
              var _bld = _getRoomBuilding(rm);
              if (_bld) merged.building = _bld;
            }
          }
        }
        if (ro.equipment_id) {
          var eq = _equipment.find(function(x) { return x.id === parseInt(ro.equipment_id); });
          if (eq) {
            merged.eq_name = eq.name || '';
            var ep = eq.properties || {};
            merged.eq_category = ep.equipment_category || '';
            merged.eq_status   = ep.status || '';
            merged.eq_inv_number  = ep.inv_number || '';
            merged.eq_manufacturer = ep.manufacturer || '';
          }
        }
        rows.push({ props: merged, entity: e });
      });
    } else {
      rows.push({ props: props, entity: e });
    }
  });

  if (rows.length === 0) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных выбранного типа</div>';
    return;
  }

  var rowKeyMap = new Map();
  var catColKeyMap = new Map();
  var cells = {};  // cells[rk][catKey] = [entities...]
  var sums = {};   // sums[rk][fieldName] = total sum

  rows.forEach(function(row) {
    var rk = rowFields.map(function(f) { return _getPivotVal(row.props, f.name); }).join(' / ');
    var catKey = catCols.length > 0
      ? catCols.map(function(f) { return _getPivotVal(row.props, f.name); }).join(' / ')
      : '__total__';
    rowKeyMap.set(rk, rk);
    if (catCols.length > 0) catColKeyMap.set(catKey, catKey);

    if (!cells[rk]) cells[rk] = {};
    if (!cells[rk][catKey]) cells[rk][catKey] = [];
    if (equipmentMode) {
      // In equipment mode: store the equipment entity, not the document
      var eqId = parseInt(row.props.equipment_id);
      if (eqId) {
        var eqEnt = _equipment.find(function(x) { return x.id === eqId; });
        if (eqEnt && !cells[rk][catKey].find(function(x) { return x.id === eqEnt.id; }))
          cells[rk][catKey].push(eqEnt);
      }
    } else {
      if (!cells[rk][catKey].find(function(x) { return x.id === row.entity.id; }))
        cells[rk][catKey].push(row.entity);
    }

    // Accumulate numeric sums
    if (!sums[rk]) sums[rk] = {};
    numCols.forEach(function(f) {
      var v = parseFloat((row.props[f.name] || '').toString().replace(/s/g,'').replace(',','.')) || 0;
      sums[rk][f.name] = (sums[rk][f.name] || 0) + v;
    });
  });

  var sortedRows = Array.from(rowKeyMap.keys()).sort(function(a, b) { return a.localeCompare(b, 'ru'); });
  var sortedCatCols = catCols.length > 0 ? Array.from(catColKeyMap.keys()).sort(function(a, b) { return a.localeCompare(b, 'ru'); }) : [];

  _pivotCellData = { rows: sortedRows, cols: sortedCatCols, cells: cells };

  var rowLabel = rowFields.map(function(f) { return f.label; }).join(' / ');
  var totalEntities = entities.length;
  var hasNum = numCols.length > 0;
  var hasCat = catCols.length > 0;

  var html = '<div class="detail-section" style="overflow-x:auto">';
  html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">' +
    totalEntities + ' ' + unitLabel.toLowerCase() + ' · ' + sortedRows.length + ' строк' +
    (sortedCatCols.length > 0 ? ' · ' + sortedCatCols.length + ' столбцов' : '') +
    (hasNum ? '' : ' <span style="opacity:0.6">— нажмите на цифру чтобы увидеть список</span>') + '</div>';
  html += '<table class="pivot-table">';

  // Header
  html += '<thead><tr><th>' + escapeHtml(rowLabel) + '</th>';
  sortedCatCols.forEach(function(ck) { html += '<th>' + escapeHtml(ck) + '</th>'; });
  numCols.forEach(function(f) { html += '<th>' + escapeHtml(f.label) + ', руб.</th>'; });
  if (!hasNum || hasCat) html += '<th>Итого, ' + escapeHtml(unitLabel.toLowerCase()) + '</th>';
  html += '</tr></thead>';

  // Body
  var grandCount = 0;
  var catColTotals = {};
  var numColTotals = {};
  html += '<tbody>';
  sortedRows.forEach(function(rk, ri) {
    var rowCells = cells[rk] || {};
    var rowCount = Object.values(rowCells).reduce(function(s, arr) { return s + arr.length; }, 0);
    grandCount += rowCount;
    html += '<tr><td><strong>' + escapeHtml(rk) + '</strong></td>';

    // Categorical columns (count)
    sortedCatCols.forEach(function(ck, ci) {
      var arr = rowCells[ck] || [];
      var v = arr.length;
      catColTotals[ck] = (catColTotals[ck] || 0) + v;
      html += v > 0
        ? '<td class="cell-value" data-ri="' + ri + '" data-ci="' + ci + '" onclick="showPivotCellDetail(this)">' + v + '</td>'
        : '<td class="cell-empty">—</td>';
    });

    // Numeric columns (sum)
    numCols.forEach(function(f) {
      var s = sums[rk] ? (sums[rk][f.name] || 0) : 0;
      numColTotals[f.name] = (numColTotals[f.name] || 0) + s;
      html += s > 0
        ? '<td style="text-align:right;font-weight:600;color:var(--accent)">' + _fmtNum(s) + '</td>'
        : '<td class="cell-empty">—</td>';
    });

    if (!hasNum || hasCat) {
      html += '<td class="row-total" data-ri="' + ri + '" data-ci="-1" onclick="showPivotCellDetail(this)" style="cursor:pointer">' + rowCount + '</td>';
    }
    html += '</tr>';
  });
  html += '</tbody>';

  // Footer
  html += '<tfoot><tr><th>Итого</th>';
  sortedCatCols.forEach(function(ck) { html += '<th>' + (catColTotals[ck] || 0) + '</th>'; });
  numCols.forEach(function(f) {
    html += '<th style="text-align:right">' + _fmtNum(numColTotals[f.name] || 0) + '</th>';
  });
  if (!hasNum || hasCat) html += '<th>' + grandCount + '</th>';
  html += '</tr></tfoot>';

  html += '</table></div>';
  html += '<div id="pivotDrillDown" style="margin-top:8px"></div>';
  resultsEl.innerHTML = html;
}

function showPivotCellDetail(el) {
  var ri = parseInt(el.dataset.ri);
  var ci = parseInt(el.dataset.ci);
  var rk = _pivotCellData.rows[ri];
  var allCols = _pivotCellData.cols;

  var entityList = [];
  if (ci === -1) {
    // Row total: collect all entities in this row
    var rowCells = _pivotCellData.cells[rk] || {};
    Object.values(rowCells).forEach(function(arr) {
      arr.forEach(function(e) { if (!entityList.find(function(x){ return x.id===e.id; })) entityList.push(e); });
    });
  } else {
    var ck = allCols[ci];
    entityList = (_pivotCellData.cells[rk] && _pivotCellData.cells[rk][ck]) ? _pivotCellData.cells[rk][ck] : [];
    if (allCols.length === 0) {
      // No columns, just row total
      var rowCells2 = _pivotCellData.cells[rk] || {};
      Object.values(rowCells2).forEach(function(arr) {
        arr.forEach(function(e) { if (!entityList.find(function(x){return x.id===e.id;})) entityList.push(e); });
      });
    }
  }

  var colLabel = ci >= 0 && allCols[ci] ? ' · ' + escapeHtml(allCols[ci]) : '';
  var html = '<div class="detail-section">';
  html += '<h3>' + escapeHtml(rk) + colLabel + ' <span style="font-size:13px;font-weight:400;color:var(--text-muted)">(' + entityList.length + ')</span></h3>';
  entityList.forEach(function(e) {
    html += '<div class="child-card" onclick="showEntity(' + e.id + ')" style="cursor:pointer;padding:8px 12px;margin-bottom:4px;display:flex;align-items:center;gap:8px">';
    html += entityIcon(e.type_name || 'contract');
    html += '<span style="font-weight:500">' + escapeHtml(e.name) + '</span>';
    var p = e.properties || {};
    var tags = [];
    if (p.contract_date) tags.push(p.contract_date);
    if (p.contract_amount) tags.push(p.contract_amount + ' р.');
    if (p.status) tags.push(p.status);
    if (tags.length) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + escapeHtml(tags.join(' · ')) + '</span>';
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('pivotDrillDown').innerHTML = html;
  document.getElementById('pivotDrillDown').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function runLinkedReport(type) {
  var resultsEl = document.getElementById('linkedResults');
  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';
  await loadBrokenEquipment();
  var data = await api('/reports/linked?type=' + type);
  var groups = data.groups || [];

  if (groups.length === 0) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных. Добавьте оборудование и назначьте расположение через "Входит в".</div>';
    return;
  }

  var titles = { equipment_by_location: 'Оборудование по корпусам', equipment_by_tenant: 'Оборудование у арендаторов' };
  var html = '<div class="detail-section"><h3>' + (titles[type] || type) + '</h3>';

  if (type === 'equipment_by_location') {
    groups.forEach(function(g) {
      html += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
      html += '<div style="background:var(--bg-hover);padding:10px 14px;font-weight:600;display:flex;justify-content:space-between">';
      html += '<span style="display:flex;align-items:center;gap:6px">' + entityIcon('building') + ' ' + escapeHtml(g.name) + ' <span style="font-size:11px;color:var(--text-muted);font-weight:400">(' + (g.type || '') + ')</span></span>';
      html += '<span style="font-size:12px;color:var(--text-muted)">' + g.items.length + ' ед.</span></div>';
      html += '<div style="padding:8px 14px">';
      if (g.items.length === 0) {
        html += '<div style="color:var(--text-muted);font-size:13px;padding:4px 0">Оборудование не указано</div>';
      } else {
        g.items.forEach(function(item) {
          var p = item.props || {};
          var isBroken = _brokenEqIds.has(parseInt(item.id));
          var isEmerg = (p.status === 'Аварийное');
          var tags = [];
          if (p.equipment_category) tags.push(p.equipment_category);
          if (p.inv_number) tags.push('инв. ' + p.inv_number);
          if (p.status && p.status !== 'В работе') tags.push(p.status);
          var nameColor = isBroken ? '#dc2626' : (isEmerg ? '#b85c5c' : '');
          html += '<div class="child-card" onclick="showEntity(' + item.id + ')" style="margin-bottom:4px;cursor:pointer;padding:6px 10px;display:flex;align-items:center;gap:8px' + (isBroken ? ';background:rgba(239,68,68,.07)' : (isEmerg ? ';background:rgba(184,92,92,.05)' : '')) + '">';
          html += entityIcon('equipment');
          html += '<span style="font-weight:500;font-size:13px' + (nameColor ? ';color:' + nameColor : '') + '">' + escapeHtml(item.name) + (isBroken ? ' <span class="eq-broken-badge">⚠ Нерабочий</span>' : (isEmerg ? ' <span class="eq-emergency-badge">⚠ Авария</span>' : '')) + '</span>';
          if (tags.length) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + escapeHtml(tags.join(' · ')) + '</span>';
          html += '</div>';
        });
      }
      html += '</div></div>';
    });
  }

  if (type === 'equipment_by_tenant') {
    groups.forEach(function(g) {
      html += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
      html += '<div style="background:var(--bg-hover);padding:10px 14px;font-weight:600;display:flex;justify-content:space-between">';
      html += '<span style="display:flex;align-items:center;gap:6px">' + entityIcon('company') + ' ' + escapeHtml(g.name) + '</span>';
      html += '<span style="font-size:12px;color:var(--text-muted)">' + g.items.length + ' ед. оборудования · ' + (g.contracts || []).length + ' договоров</span></div>';
      html += '<div style="padding:8px 14px">';
      // Show contracts
      if (g.contracts && g.contracts.length > 0) {
        html += '<div style="margin-bottom:8px">';
        g.contracts.forEach(function(c) {
          html += '<div style="font-size:12px;color:var(--text-secondary);padding:2px 0"><a href="#" onclick="showEntity(' + c.id + ');return false" style="color:var(--accent)">' + escapeHtml(c.name) + '</a></div>';
        });
        html += '</div>';
      }
      if (g.items.length === 0) {
        html += '<div style="color:var(--text-muted);font-size:13px;padding:4px 0">Оборудование в арендуемых помещениях не найдено</div>';
      } else {
        g.items.forEach(function(item) {
          var p = item.props || {};
          var isBroken = _brokenEqIds.has(parseInt(item.id));
          var isEmerg = (p.status === 'Аварийное');
          var tags = [];
          if (p.equipment_category) tags.push(p.equipment_category);
          if (item.building_name) tags.push(item.building_name);
          if (p.status && p.status !== 'В работе') tags.push(p.status);
          var nameColor = isBroken ? '#dc2626' : (isEmerg ? '#b85c5c' : '');
          html += '<div class="child-card" onclick="showEntity(' + item.id + ')" style="margin-bottom:4px;cursor:pointer;padding:6px 10px;display:flex;align-items:center;gap:8px' + (isBroken ? ';background:rgba(239,68,68,.07)' : (isEmerg ? ';background:rgba(184,92,92,.05)' : '')) + '">';
          html += entityIcon('equipment');
          html += '<span style="font-weight:500;font-size:13px' + (nameColor ? ';color:' + nameColor : '') + '">' + escapeHtml(item.name) + (isBroken ? ' <span class="eq-broken-badge">⚠ Нерабочий</span>' : (isEmerg ? ' <span class="eq-emergency-badge">⚠ Авария</span>' : '')) + '</span>';
          if (tags.length) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + escapeHtml(tags.join(' · ')) + '</span>';
          html += '</div>';
        });
      }
      html += '</div></div>';
    });
  }

  html += '</div>';
  resultsEl.innerHTML = html;
  renderIcons();
}

// Which entity type owns each groupBy field (fields inside contract props/rent_objects)
var _fieldEntityType = {
  building: 'contract', room: 'contract', object_type: 'contract',
  rent_scope: 'contract', contractor_name: 'contract', our_legal_entity: 'contract',
  contract_type: 'contract', subtenant_name: 'contract', our_role_label: 'contract',
  contractor_role_label: 'contract', tenant: 'contract', number: 'contract',
  contract_date: 'contract',
};

function onGroupByChange() {
  var groupBy = document.getElementById('reportGroupBy').value;
  var filterTypeEl = document.getElementById('reportFilterType');
  if (groupBy && _fieldEntityType[groupBy]) {
    filterTypeEl.value = _fieldEntityType[groupBy];
  }
  runReport();
}

async function runReport() {
  var groupBy = document.getElementById('reportGroupBy').value;
  var filterType = document.getElementById('reportFilterType').value;
  var resultsEl = document.getElementById('reportResults');
  if (!groupBy) { resultsEl.innerHTML = ''; return; }

  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';

  var url = '/reports/pivot?groupBy=' + encodeURIComponent(groupBy);
  if (filterType) url += '&filterType=' + encodeURIComponent(filterType);

  var data = await api(url);
  if (!data.groups || data.groups.length === 0) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных для группировки по этому полю</div>';
    return;
  }

  var label = _reportFieldLabels[groupBy] || groupBy;
  var html = '<div class="detail-section">';
  html += '<h3>' + escapeHtml(label) + ' (' + data.groups.length + ' значений)</h3>';

  data.groups.forEach(function(group) {
    html += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
    html += '<div style="background:var(--bg-hover);padding:10px 14px;font-weight:600;display:flex;justify-content:space-between;align-items:center">';
    html += '<span>' + escapeHtml(group.value) + '</span>';
    html += '<span style="font-size:12px;color:var(--text-muted)">' + group.entities.length + ' записей</span>';
    html += '</div>';

    // Group entities by type
    var byType = {};
    group.entities.forEach(function(e) {
      var key = e.type_name;
      if (!byType[key]) byType[key] = { name_ru: e.type_name_ru, icon: e.icon, color: e.color, items: [] };
      byType[key].items.push(e);
    });

    html += '<div style="padding:10px 14px">';
    Object.keys(byType).forEach(function(typeName) {
      var bt = byType[typeName];
      html += '<div style="margin-bottom:8px">';
      html += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:flex;align-items:center;gap:4px">' + entityIcon(typeName) + ' ' + bt.name_ru + ' (' + bt.items.length + ')</div>';
      bt.items.forEach(function(e) {
        html += '<div class="child-card" onclick="showEntity(' + e.id + ')" style="margin-bottom:4px;cursor:pointer;padding:6px 10px">';
        html += entityIcon(typeName);
        html += '<span style="font-weight:500;font-size:13px">' + escapeHtml(e.name) + '</span>';
        // Show key properties
        var props = e.properties || {};
        var tags = [];
        if (props.number) tags.push('№' + props.number);
        if (props.contract_date) tags.push(props.contract_date);
        if (props.contract_type) tags.push(props.contract_type);
        if (tags.length) html += ' <span style="font-size:11px;color:var(--text-muted)">' + tags.join(' · ') + '</span>';
        html += '</div>';
      });
      html += '</div>';
    });
    html += '</div></div>';
  });

  html += '</div>';
  resultsEl.innerHTML = html;
}

// ============ MODALS ============

var _modalSize = 'normal';

// Show modal with spinner immediately (before async data loads)
function showLoadingModal() {
  var el = document.getElementById('modal');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:60px 40px"><div class="spinner-ring"></div><p style="margin-top:16px;color:var(--text-muted);font-size:14px">Загрузка...</p></div>';
  el.classList.remove('modal--wide', 'modal--full');
  document.getElementById('modalOverlay').classList.add('show');
}

function setModalContent(html) {
  var sizes = ['normal', 'wide', 'full'];
  var labels = {'normal': '▭', 'wide': '⊟', 'full': '⛶'};
  var titles = {'normal': 'Стандарт', 'wide': 'Широкий', 'full': 'На всю страницу'};
  var resizeBar = '<div class="modal-resize-bar">';
  sizes.forEach(function(s) {
    var active = (_modalSize === s) ? ' is-active' : '';
    resizeBar += '<button class="modal-resize-btn' + active + '" data-modal-size="' + s + '" title="' + titles[s] + '">' + labels[s] + '</button>';
  });
  resizeBar += '</div>';
  var el = document.getElementById('modal');
  el.innerHTML = resizeBar + html;
  el.classList.toggle('modal--wide', _modalSize === 'wide');
  el.classList.toggle('modal--full', _modalSize === 'full');
  document.getElementById('modalOverlay').classList.add('show');
  el.querySelectorAll('[data-modal-size]').forEach(function(btn) {
    btn.addEventListener('click', function() { setModalSize(btn.getAttribute('data-modal-size')); });
  });
  renderIcons();
}

function setModalSize(size) {
  _modalSize = size;
  var modal = document.getElementById('modal');
  modal.classList.toggle('modal--wide', size === 'wide');
  modal.classList.toggle('modal--full', size === 'full');
  document.querySelectorAll('[data-modal-size]').forEach(function(btn) {
    btn.classList.toggle('is-active', btn.getAttribute('data-modal-size') === size);
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  _actEquipmentList = null;
  _submitting = false;
}

// ── Кадастровый номер для частей ЗУ — только из существующих ЗУ ─────────────
function _getLpCadastralOptions() {
  var seen = {};
  var opts = [];
  (_landPlots || []).forEach(function(lp) {
    var cn = ((lp.properties || {}).cadastral_number || '').trim();
    if (cn && !seen[cn]) { seen[cn] = true; opts.push({ cn: cn, lp: lp }); }
  });
  return opts;
}

function _renderCadastralSelect(inputId, selectedVal) {
  var opts = _getLpCadastralOptions();
  var h = '<select id="' + inputId + '"><option value="">— выберите —</option>';
  opts.forEach(function(item) {
    h += '<option value="' + escapeHtml(item.cn) + '"' + (item.cn === selectedVal ? ' selected' : '') + '>' +
      escapeHtml(item.cn) + ' (' + escapeHtml(item.lp.name) + ')</option>';
  });
  h += '</select>';
  return h;
}

// Смена родительского ЗУ → автоподстановка кадастрового номера
function onLpPartParentChange(sel) {
  var lpId = parseInt(sel.value) || 0;
  var lp = (_landPlots || []).find(function(x) { return x.id === lpId; });
  var cnSel = document.getElementById('f_cadastral_number');
  if (!cnSel) return;
  cnSel.value = lp ? ((lp.properties || {}).cadastral_number || '') : '';
}

// ── Room parent field: buildings only + inline quick-create ──
function renderRoomBuildingParent(selectedId) {
  var h = '<div class="form-group"><label>Находится в корпусе</label>';
  h += '<div style="display:flex;gap:8px;align-items:center">';
  h += '<select id="f_parent" style="flex:1"><option value="">— не указано —</option>';
  _buildings.forEach(function(b) {
    h += '<option value="' + b.id + '"' + (selectedId && selectedId === b.id ? ' selected' : '') + '>' + escapeHtml(b.name) + '</option>';
  });
  h += '</select>';
  h += '<button type="button" class="btn btn-sm" onclick="toggleBuildingInlineCreate()">+ Добавить корпус</button>';
  h += '</div>';
  h += '<div id="buildingInlineCreateBox" style="display:none;margin-top:8px;padding:12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px">';
  h += '<div style="font-size:13px;font-weight:600;margin-bottom:8px">Новый корпус</div>';
  h += '<div class="form-group"><label>Название</label><input id="bic_name" style="width:100%" placeholder="Корпус А, Цех 1..."></div>';
  h += '<div style="display:flex;gap:8px">';
  h += '<button type="button" class="btn btn-primary btn-sm" onclick="submitBuildingInline()">Создать и выбрать</button>';
  h += '<button type="button" class="btn btn-sm" onclick="toggleBuildingInlineCreate()">Отмена</button>';
  h += '</div></div></div>';
  return h;
}

function toggleBuildingInlineCreate() {
  var box = document.getElementById('buildingInlineCreateBox');
  if (!box) return;
  var isVisible = box.style.display !== 'none';
  box.style.display = isVisible ? 'none' : 'block';
  if (!isVisible) { var n = document.getElementById('bic_name'); if (n) n.focus(); }
}

async function submitBuildingInline() {
  var nameEl = document.getElementById('bic_name');
  var name = nameEl ? nameEl.value.trim() : '';
  if (!name) { alert('Введите название корпуса'); return; }
  var bType = entityTypes.find(function(t) { return t.name === 'building'; });
  if (!bType) return;
  try {
    var nb = await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: bType.id, name: name, properties: {} }) });
    _buildings.push(nb);
    var sel = document.getElementById('f_parent');
    if (sel) {
      var opt = document.createElement('option');
      opt.value = nb.id; opt.textContent = name; opt.selected = true;
      sel.appendChild(opt);
    }
    var box = document.getElementById('buildingInlineCreateBox');
    if (box) box.style.display = 'none';
    if (nameEl) nameEl.value = '';
  } catch(e) { alert('Ошибка: ' + (e.message || String(e))); }
}

// ── Equipment location fields (Корпус + Помещение) ───────────────────────────
function renderEquipmentLocationFields(selectedBuildingId, selectedRoomId) {
  var bid = parseInt(selectedBuildingId) || 0;
  var rid = parseInt(selectedRoomId) || 0;
  var h = '<div class="form-group"><label>Корпус</label>';
  h += '<select id="f_eq_building" style="width:100%" onchange="onEqBuildingChange()">';
  h += '<option value="">— не указано —</option>';
  (_buildings || []).forEach(function(b) {
    h += '<option value="' + b.id + '"' + (b.id === bid ? ' selected' : '') + '>' + escapeHtml(b.name) + '</option>';
  });
  h += '</select></div>';
  h += '<div class="form-group"><label>Помещение</label>';
  h += '<select id="f_eq_room" style="width:100%">';
  h += '<option value="">— не указано —</option>';
  var filteredRooms = bid ? (_rooms || []).filter(function(r) { return r.parent_id === bid; }) : (_rooms || []);
  filteredRooms.forEach(function(r) {
    h += '<option value="' + r.id + '"' + (r.id === rid ? ' selected' : '') + '>' + escapeHtml(r.name) + '</option>';
  });
  h += '</select></div>';
  return h;
}

function onEqBuildingChange() {
  var bldSel = document.getElementById('f_eq_building');
  var roomSel = document.getElementById('f_eq_room');
  if (!bldSel || !roomSel) return;
  var bid = parseInt(bldSel.value) || 0;
  var filteredRooms = bid ? (_rooms || []).filter(function(r) { return r.parent_id === bid; }) : (_rooms || []);
  roomSel.innerHTML = '<option value="">— не указано —</option>';
  filteredRooms.forEach(function(r) {
    roomSel.innerHTML += '<option value="' + r.id + '">' + escapeHtml(r.name) + '</option>';
  });
}

async function openCreateModal(typeName, preParentId) {
  showLoadingModal();
  // Для ДС из реестра — сначала выбираем родительский договор
  if (typeName === 'supplement') {
    await openSelectParentContractForSupplement();
    return;
  }

  _contractFormTypeName = typeName;
  clearEntityCache();
  const type = entityTypes.find(t => t.name === typeName);
  const fields = await api('/entity-types/' + type.id + '/fields');
  const allEntities = await api('/entities');
  await loadEntityLists();
  await loadContractEntities();

  const isContractLike = (typeName === 'contract' || typeName === 'supplement');
  let html = '<h3>Новый: ' + type.name_ru + '</h3>';
  if (isContractLike) {
    html += '<input type="hidden" id="f_name" value="">';
  } else {
    html += '<div class="form-group"><label>Название</label><input id="f_name" required></div>';
  }

  // Parent selector (hide for contracts; special label for buildings)
  if (!isContractLike) {
    if (typeName === 'building' || typeName === 'workshop') {
      html += '<div class="form-group"><label>Собственник</label><select id="f_parent"><option value="">— не указано —</option>';
      _allCompanies.forEach(function(c) {
        html += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>';
      });
      html += '</select></div>';
    } else if (typeName === 'room') {
      html += renderRoomBuildingParent(preParentId ? parseInt(preParentId) : null);
    } else if (typeName === 'equipment') {
      html += renderEquipmentLocationFields(null, null);
    } else if (typeName === 'land_plot_part') {
      // Только ЗУ как варианты родителя
      html += '<div class="form-group"><label>Земельный участок</label><select id="f_parent" onchange="onLpPartParentChange(this)"><option value="">— выберите ЗУ —</option>';
      allEntities.filter(function(x) { return x.type_name === 'land_plot'; }).forEach(function(x) {
        var sel = (preParentId && parseInt(preParentId) === x.id) ? ' selected' : '';
        html += '<option value="' + x.id + '"' + sel + '>' + escapeHtml(x.name) + '</option>';
      });
      html += '</select></div>';
    } else if (typeName !== 'land_plot' && typeName !== 'company') {
      html += '<div class="form-group"><label>Входит в (родительский объект)</label><select id="f_parent"><option value="">— нет (корневой объект) —</option>';
      allEntities.filter(function(x) { return x.type_name !== 'contract' && x.type_name !== 'supplement'; }).forEach(function(x) {
        html += '<option value="' + x.id + '">' + x.icon + ' ' + escapeHtml(x.name) + ' (' + x.type_name_ru + ')</option>';
      });
      html += '</select></div>';
    }
  }
  if (isContractLike) {
    renderContractFormFields(fields, {}, html);
    return;
  }

  fields.forEach(f => {
    if (f.sort_order >= 999) return; // hidden field (room_number, room_type etc.)
    if (typeName === 'land_plot_part' && f.name === 'cadastral_number') {
      // Кадастровый номер — только из существующих ЗУ, auto-fill из выбранного родителя
      var autoFillCad = preParentId ? (function() {
        var _lp = (_landPlots||[]).find(function(x) { return x.id === parseInt(preParentId); });
        return _lp ? ((_lp.properties||{}).cadastral_number||'') : '';
      })() : '';
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + _renderCadastralSelect('f_cadastral_number', autoFillCad) + '</div>';
    } else if (f.name === 'balance_owner' || f.name === 'owner') {
      var fieldId = f.name === 'owner' ? 'f_owner' : 'f_balance_owner';
      var fieldNameS = f.name === 'owner' ? 'owner' : 'balance_owner';
      var ownerList = (f.name === 'balance_owner') ? (_ownCompanies||_allCompanies) : _allCompanies;
      html += '<div class="form-group"><label>Собственник</label>' +
        renderSearchableSelect(fieldId, ownerList, '', '', 'начните вводить...', fieldNameS) + '</div>';
    } else {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(f, '') + '</div>';
    }
  });

  // Building: land plot selector
  if (typeName === 'building' || typeName === 'workshop') {
    html += renderLandPlotSelectorField(null);
  }

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreate(\\'' + typeName + '\\')">Создать</button></div>';

  setModalContent(html);
  _srchInitAll();
  document.getElementById('f_name').focus();
}

let _submitting = false;

async function submitCreate(typeName) {
  if (_submitting) return;
  _submitting = true;
  try { await _doSubmitCreate(typeName); } finally { _submitting = false; }
}

async function _doSubmitCreate(typeName) {
  const type = entityTypes.find(t => t.name === typeName);
  const fields = await api('/entity-types/' + type.id + '/fields');
  const isContractLike = (typeName === 'contract' || typeName === 'supplement');
  let parent_id;
  if (isContractLike) {
    parent_id = null;
  } else if (typeName === 'equipment') {
    const eqBldEl = document.getElementById('f_eq_building');
    parent_id = eqBldEl ? (eqBldEl.value || null) : null;
  } else {
    parent_id = document.getElementById('f_parent') ? document.getElementById('f_parent').value || null : null;
  }
  const properties = {};
  fields.forEach(f => { const v = getFieldValue(f); if (v) properties[f.name] = v; });

  // Collect dynamic contract-type fields
  if (isContractLike && properties.contract_type) {
    Object.assign(properties, collectDynamicFieldValues(properties.contract_type));
  }

  // Collect entity IDs and names for linked fields
  if (isContractLike) {
    collectEntityIds(properties);
  }
  if (typeName === 'equipment') {
    collectEquipmentIds(properties);
  }
  // Collect owner entity for land_plot and building-like
  var ownerEl = document.getElementById('f_owner');
  if (ownerEl && ownerEl.value) {
    var ownerEnt = _allCompanies.find(function(c) { return c.id === parseInt(ownerEl.value); });
    if (ownerEnt) { properties.owner_id = ownerEnt.id; properties.owner_name = ownerEnt.name; }
    delete properties.owner;
  }
  // Collect balance_owner entity (land_plot, building — stored as id+name)
  var balanceOwnerEl = document.getElementById('f_balance_owner');
  if (balanceOwnerEl && balanceOwnerEl.value) {
    var boId = parseInt(balanceOwnerEl.value);
    var boEnt = (_ownCompanies||[]).concat(_allCompanies||[]).find(function(c){ return c.id === boId; });
    if (boEnt) { properties.balance_owner_id = boId; properties.balance_owner_name = boEnt.name; }
    delete properties.balance_owner;
  }

  // Auto-generate name for contracts
  let name = document.getElementById('f_name').value.trim();
  if (isContractLike) {
    const num = properties.number || '?';
    const contractor = properties.contractor_name || '';
    name = (typeName === 'supplement' ? 'ДС' : 'Договор') + ' №' + num + (contractor ? ' — ' + contractor : '');
    // Добавляем названия частей ЗУ (или самих ЗУ) в имя договора аренды
    if (properties.rent_objects) {
      try {
        var _rosN = JSON.parse(properties.rent_objects);
        var _lpN = _rosN
          .filter(function(ro) { return ro.object_type === 'ЗУ'; })
          .map(function(ro) { return ro.land_plot_part_name || ro.land_plot_name; })
          .filter(Boolean);
        if (_lpN.length) name += ' / ' + _lpN.join(', ');
      } catch(e) {}
    }
  }
  if (!name) return alert('Введите название');

  // Fuzzy duplicate check for companies
  if (typeName === 'company') {
    var nameL = name.toLowerCase().replace(/[.,\\s"«»]+/g, ' ').trim();
    var similar = _allCompanies.filter(function(c) {
      var cL = c.name.toLowerCase().replace(/[.,\\s"«»]+/g, ' ').trim();
      return cL === nameL || cL.indexOf(nameL) >= 0 || nameL.indexOf(cL) >= 0;
    });
    if (similar.length > 0) {
      var names = similar.map(function(c) { return c.name; }).join(', ');
      if (!confirm('Найдены похожие компании: ' + names + '\\n\\nВсё равно создать «' + name + '»?')) return;
    }
  }

  var createdEntity;
  try {
    createdEntity = await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: type.id, name, properties, parent_id }) });
  } catch(err) {
    if (err.status === 409 && err.data && err.data.existing) {
      var ex = err.data.existing;
      if (confirm('Уже существует: ' + ex.name + '. Открыть существующую?')) {
        closeModal();
        showEntity(ex.id);
      }
      return;
    }
    throw err;
  }

  // Handle located_on relation for building/workshop
  if ((typeName === 'building' || typeName === 'workshop') && createdEntity && createdEntity.id) {
    var lpSel = document.getElementById('f_land_plot_id');
    if (lpSel && lpSel.value) {
      await api('/relations', { method: 'POST', body: JSON.stringify({
        from_entity_id: createdEntity.id, to_entity_id: parseInt(lpSel.value), relation_type: 'located_on'
      }) }).catch(function() {});
    }
  }

  // Handle located_in relation for equipment (room)
  if (typeName === 'equipment' && createdEntity && createdEntity.id) {
    var eqRoomSel = document.getElementById('f_eq_room');
    if (eqRoomSel && eqRoomSel.value) {
      await api('/relations', { method: 'POST', body: JSON.stringify({
        from_entity_id: createdEntity.id, to_entity_id: parseInt(eqRoomSel.value), relation_type: 'located_in'
      }) }).catch(function() {});
    }
  }

  closeModal();
  if (isContractLike && createdEntity && createdEntity.id) {
    showEntity(createdEntity.id);
  } else {
    showEntityList(typeName);
  }
}

// ── Contract rental card ─────────────────────────────────────────────────────
function _ccFmtDate(d) { return d ? d.split('-').reverse().join('.') : '—'; }
function _ccFmtNum(v) { return v ? Number(v).toLocaleString('ru-RU', {maximumFractionDigits:2}) : '0'; }

function renderContractCard(data) {
  var h = '';
  var isRental = (data.contract_type === 'Аренды' || data.contract_type === 'Субаренды' || data.contract_type === 'Аренда оборудования');

  // ── Header ─────────────────────────────────────────────────────────────────
  var titleParts = [];
  if (data.contractor_name) titleParts.push(data.contractor_name);
  if (data.subtenant_name)  titleParts.push(data.subtenant_name);
  if (data.number)          titleParts.push('№' + data.number);
  if (data.date)            titleParts.push(_ccFmtDate(data.date));
  h += '<div style="margin-bottom:20px">';
  h += '<h2 style="font-size:1.3rem;font-weight:700;margin:0 0 4px">' + escapeHtml(titleParts.join(', ')) + '</h2>';
  h += '<span style="font-size:13px;color:var(--text-secondary)">' + escapeHtml(data.contract_type || '') + '</span>';
  h += '</div>';

  // ── Main info ──────────────────────────────────────────────────────────────
  h += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;font-size:14px">';
  // Стороны
  var ourLabel = data.our_role_label || (isRental ? 'Арендодатель' : 'Наше юр. лицо');
  var contrLabel = data.contractor_role_label || (isRental ? 'Арендатор' : 'Контрагент');
  if (data.our_legal_entity) {
    h += '<div><span style="color:var(--text-secondary)">' + escapeHtml(ourLabel) + ':</span> <strong>' + escapeHtml(data.our_legal_entity) + '</strong></div>';
  }
  if (data.contractor_name) {
    h += '<div><span style="color:var(--text-secondary)">' + escapeHtml(contrLabel) + ':</span> <strong>' + escapeHtml(data.contractor_name) + '</strong></div>';
  }
  if (data.subtenant_name) {
    h += '<div><span style="color:var(--text-secondary)">Субарендатор:</span> <strong>' + escapeHtml(data.subtenant_name) + '</strong></div>';
  }
  // Предмет
  if (data.subject) {
    h += '<div><span style="color:var(--text-secondary)">Предмет:</span> ' + escapeHtml(data.subject) + '</div>';
  }
  // Корпус
  if (data.building) {
    h += '<div><span style="color:var(--text-secondary)">Корпус:</span> ' + escapeHtml(data.building) + '</div>';
  }
  // Арендатор (для Подряда)
  if (data.tenant) {
    h += '<div><span style="color:var(--text-secondary)">Арендатор:</span> ' + escapeHtml(data.tenant) + '</div>';
  }
  // Срок действия
  if (data.contract_end_date) {
    h += '<div><span style="color:var(--text-secondary)">Срок действия до:</span> <strong>' + escapeHtml(_ccFmtDate(data.contract_end_date)) + '</strong></div>';
  } else if (data.duration_text) {
    h += '<div><span style="color:var(--text-secondary)">Срок действия:</span> ' + escapeHtml(data.duration_text) + '</div>';
  }
  // Срок выполнения
  if (data.completion_deadline) {
    h += '<div><span style="color:var(--text-secondary)">Срок выполнения:</span> ' + escapeHtml(data.completion_deadline) + '</div>';
  }
  // Комментарий
  if (data.service_comment) {
    h += '<div><span style="color:var(--text-secondary)">Комментарий:</span> ' + escapeHtml(data.service_comment) + '</div>';
  }
  h += '</div>';

  // ── Перечень работ/услуг/товаров (contract_items) ──────────────────────────
  if (data.contract_items && data.contract_items.length) {
    h += '<div style="margin-bottom:16px">';
    h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">ПЕРЕЧЕНЬ ПОЗИЦИЙ</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    h += '<thead><tr style="background:#4F6BCC;color:#fff">';
    h += '<th style="padding:8px 10px;text-align:left;border-radius:4px 0 0 0">Наименование</th>';
    if (data.contract_items[0].qty !== undefined) {
      h += '<th style="padding:8px 10px;text-align:right">Кол-во</th>';
      h += '<th style="padding:8px 10px;text-align:right">Цена</th>';
    }
    h += '<th style="padding:8px 10px;text-align:right;border-radius:0 4px 0 0">Сумма, ₽</th>';
    h += '</tr></thead><tbody>';
    data.contract_items.forEach(function(item, i) {
      var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
      h += '<tr style="' + bg + '">';
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(item.name || '—') + '</td>';
      if (item.qty !== undefined) {
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (item.qty || '') + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (item.unit_price ? _ccFmtNum(item.unit_price) : '') + '</td>';
      }
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (item.amount ? _ccFmtNum(item.amount) : '') + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
    h += '</div>';
  }

  // ── Сумма договора (для не-аренды) ─────────────────────────────────────────
  if (!isRental && data.contract_amount) {
    h += '<div style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--accent)">';
    h += 'Сумма договора: ' + _ccFmtNum(data.contract_amount) + ' ₽';
    if (data.vat_rate) h += ' <span style="font-size:12px;color:var(--text-secondary);font-weight:400">(в т.ч. НДС ' + data.vat_rate + '%)</span>';
    h += '</div>';
  }

  // ── Помещения (для аренды) ─────────────────────────────────────────────────
  if (isRental) {
    var roomDescs = data.rent_rows.filter(function(r) { return r.description; });
    if (roomDescs.length) {
      h += '<div style="margin-bottom:16px">';
      h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">ПОМЕЩЕНИЯ</div>';
      h += '<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7">';
      roomDescs.forEach(function(r) {
        h += '<li>' + escapeHtml(r.description) + '</li>';
      });
      h += '</ul></div>';
    }

    if (data.rent_rows.length) {
      var srcNote = data.rent_source_name ? ' <span style="font-size:11px;font-weight:400;color:var(--text-secondary)">(из ' + escapeHtml(data.rent_source_name) + ')</span>' : '';
      h += '<div style="margin-bottom:16px">';
      h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">ТЕКУЩИЕ УСЛОВИЯ' + srcNote + '</div>';
      h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      h += '<thead><tr style="background:#4F6BCC;color:#fff">';
      h += '<th style="padding:8px 10px;text-align:left;border-radius:4px 0 0 4px">Название помещения</th>';
      h += '<th style="padding:8px 10px;text-align:right">Площадь, м²</th>';
      h += '<th style="padding:8px 10px;text-align:right;border-radius:0 4px 4px 0">Ставка (руб/м²/мес)</th>';
      h += '</tr></thead><tbody>';
      data.rent_rows.forEach(function(r, i) {
        var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
        h += '<tr style="' + bg + '">';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(r.room_name || '—') + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (r.area ? _ccFmtNum(r.area) : '—') + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (r.rate ? _ccFmtNum(r.rate) : '—') + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table>';
      if (data.total_monthly > 0) {
        h += '<div style="text-align:right;font-size:14px;font-weight:600;margin-top:8px">';
        h += 'Ежемесячный платёж: ' + _ccFmtNum(data.total_monthly) + ' руб.';
        h += '</div>';
      }
      if (data.power_allocation_kw) {
        h += '<div style="text-align:right;font-size:13px;margin-top:4px;color:var(--text-secondary)">⚡ Эл. мощность: <strong>' + escapeHtml(data.power_allocation_kw) + ' кВт</strong></div>';
      }
      h += '</div>';
    }
  }

  // ── Переданное оборудование (collapsible) ──────────────────────────────────
  if (data.equipment_list && data.equipment_list.length) {
    var eqSrcNote = data.transfer_source_name ? ' <span style="font-size:11px;font-weight:400;color:var(--text-secondary)">(из ' + escapeHtml(data.transfer_source_name) + ')</span>' : '';
    h += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    h += '<button onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\\'none\\'?\\'\\':(\\'none\\')" style="width:100%;text-align:left;padding:10px 14px;background:var(--bg-secondary);border:none;cursor:pointer;font-size:13px;font-weight:600;display:flex;justify-content:space-between">';
    h += '<span>Переданное оборудование (' + data.equipment_list.length + ')' + eqSrcNote + '</span><span>▼</span>';
    h += '</button>';
    h += '<div style="display:none;padding:12px 14px">';
    data.equipment_list.forEach(function(eq) {
      var isEmerg = eq.is_emergency;
      var isBroken = eq.is_broken;
      var isRed = isEmerg || isBroken;
      var txtStyle = isBroken ? 'color:#dc2626;font-weight:600' : (isEmerg ? 'color:#b85c5c;font-weight:600' : '');
      h += '<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:13px;' + txtStyle + '">';
      h += escapeHtml(eq.name || '—');
      if (eq.kind || eq.category) h += ' <span style="color:var(--text-secondary);font-size:12px">(' + escapeHtml((eq.kind || eq.category || '')) + ')</span>';
      if (eq.location) h += ' — ' + escapeHtml(eq.location);
      if (isBroken) h += ' <span style="background:#fef2f2;color:#dc2626;font-size:11px;padding:1px 5px;border-radius:3px;border:1px solid #dc2626">⚠ Нерабочий</span>';
      else if (isEmerg) h += ' <span style="background:#fef2f2;color:#b85c5c;font-size:11px;padding:1px 5px;border-radius:3px;border:1px solid #b85c5c">⚠ Аварийное</span>';
      h += '</div>';
    });
    h += '</div></div>';
  }

  // ── История ДС (collapsible) ───────────────────────────────────────────────
  if (data.history && data.history.length) {
    h += '<div style="margin-bottom:8px;border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    h += '<button onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\\'none\\'?\\'\\':(\\'none\\')" style="width:100%;text-align:left;padding:10px 14px;background:var(--bg-secondary);border:none;cursor:pointer;font-size:13px;font-weight:600;display:flex;justify-content:space-between">';
    var histSupplCount = data.history.filter(function(s) { return !s.is_contract && !s.is_act; }).length;
    var histActCount   = data.history.filter(function(s) { return s.is_act; }).length;
    var histLabel = 'История ДС';
    if (histSupplCount > 0) histLabel += ' · ' + histSupplCount + ' ДС';
    if (histActCount   > 0) histLabel += ' · ' + histActCount + ' актов';
    h += '<span>' + histLabel + '</span><span>▼</span>';
    h += '</button>';
    h += '<div style="display:none;padding:12px 14px">';
    data.history.forEach(function(s) {
      h += '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">';
      if (s.is_contract) {
        // Основной договор
        h += '<a href="#" onclick="openContractCard(' + s.id + ');return false" style="color:var(--accent);font-weight:600">';
        h += escapeHtml(s.name);
        h += '</a>';
        if (s.date) h += ' <span style="color:var(--text-secondary)">от ' + _ccFmtDate(s.date) + '</span>';
        h += ' <span style="background:var(--bg-hover);color:var(--text-secondary);font-size:11px;padding:1px 6px;border-radius:3px;margin-left:4px">Основной договор</span>';
      } else if (s.is_act) {
        // Акт выполненных работ
        h += '<span style="background:#0f2a1a;color:#4ade80;font-size:10px;padding:1px 6px;border-radius:3px;margin-right:6px;font-weight:600">АКТ</span>';
        h += '<a href="#" onclick="showEntity(' + s.id + ');return false" style="color:var(--accent)">';
        h += escapeHtml(s.name);
        h += '</a>';
        if (s.date) h += ' <span style="color:var(--text-secondary)">от ' + _ccFmtDate(s.date) + '</span>';
        if (s.total) h += ' — <span style="color:#4ade80;font-weight:600">' + Math.round(s.total).toLocaleString('ru-RU') + ' ₽</span>';
      } else {
        // Доп. соглашение
        h += '<a href="#" onclick="openSupplementCard(' + s.id + ');return false" style="color:var(--accent)">';
        h += escapeHtml(s.name);
        h += '</a>';
        if (s.date) h += ' <span style="color:var(--text-secondary)">от ' + _ccFmtDate(s.date) + '</span>';
        if (s.changes) h += ' — <span style="color:var(--text-secondary)">' + escapeHtml(s.changes) + '</span>';
      }
      h += '</div>';
    });
    h += '</div></div>';
  }

  // Кнопка добавить ДС
  h += '<div style="margin-top:12px">';
  h += '<button class="btn btn-sm btn-primary" onclick="openCreateSupplementModal(' + data.id + ')">+ Доп. соглашение</button>';
  h += '</div>';

  return h;
}

async function openContractCard(id) {
  showLoadingModal();
  try {
    var data = await api('/reports/contract-card/' + id);
    setModalContent(renderContractCard(data));
  } catch(e) {
    setModalContent('<div style="color:#dc2626;padding:20px">Ошибка: ' + escapeHtml(e.message || String(e)) + '</div>');
  }
}

// ── Карточка ДС (только изменения) ─────────────────────────────────────────
async function openSupplementCard(id) {
  showLoadingModal();
  try {
    var supp = await api('/entities/' + id);
    var sp = supp.properties || {};
    var parentId = supp.parent_id;
    var parentData = null;
    if (parentId) {
      try { parentData = await api('/reports/contract-card/' + parentId); } catch(ex) {}
    }

    var h = '';
    // Header
    h += '<div style="margin-bottom:16px">';
    h += '<h2 style="font-size:1.2rem;font-weight:700;margin:0 0 4px"' + escapeHtml(supp.name) + '</h2>';
    h += '<span style="font-size:13px;color:var(--text-secondary)">Доп. соглашение' + (sp.contract_type ? ' к договору ' + escapeHtml(sp.contract_type) : '') + '</span>';
    h += '</div>';

    // Link to parent contract
    if (parentId) {
      h += '<div style="margin-bottom:12px;padding:8px 12px;background:var(--bg-secondary);border-radius:6px;font-size:13px">';
      h += '<span style="color:var(--text-muted)">Основной договор:</span> ';
      h += '<a href="#" onclick="openContractCard(' + parentId + ');return false" style="color:var(--accent);font-weight:600">';
      h += parentData ? escapeHtml(parentData.name) : ' Договор #' + parentId;
      h += '</a>';
      h += '</div>';
    }

    // Изменения (changes_description)
    if (sp.changes_description) {
      h += '<div style="margin-bottom:16px;padding:10px 14px;background:rgba(99,102,241,.07);border-left:3px solid var(--accent);border-radius:0 6px 6px 0">';
      h += '<div style="font-size:12px;font-weight:600;color:var(--accent);margin-bottom:4px">ИЗМЕНЕНИЯ</div>';
      h += '<div style="font-size:14px">' + escapeHtml(sp.changes_description) + '</div>';
      h += '</div>';
    }

    // Changed rental terms (rent_objects)
    if (sp.rent_objects) {
      var rentObjs = [];
      try { rentObjs = JSON.parse(sp.rent_objects); } catch(ex) {}
      if (rentObjs.length > 0) {
        h += '<div style="margin-bottom:16px">';
        h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">ИЗМЕНЁННЫЕ УСЛОВИЯ АРЕНДЫ</div>';
        h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
        h += '<thead><tr style="border-bottom:2px solid var(--border)">';
        h += '<th style="text-align:left;padding:6px">Объект</th>';
        h += '<th style="text-align:right;padding:6px">Площадь, м²</th>';
        h += '<th style="text-align:right;padding:6px">Ставка, ₽/м²</th>';
        h += '<th style="text-align:right;padding:6px">Сумма, ₽</th>';
        h += '</tr></thead><tbody>';
        var suppTotal = 0;
        rentObjs.forEach(function(ro) {
          var sum = ro.fixed_rent ? parseFloat(ro.fixed_rent) : (parseFloat(ro.area) || 0) * (parseFloat(ro.rent_rate) || 0);
          suppTotal += sum || 0;
          h += '<tr style="border-bottom:1px solid var(--border)">';
          h += '<td style="padding:6px">' + escapeHtml(ro.room_name || ro.object_type || '—') + '</td>';
          h += '<td style="text-align:right;padding:6px">' + (ro.area ? ro.area + ' м²' : '—') + '</td>';
          h += '<td style="text-align:right;padding:6px">' + (ro.rent_rate ? ro.rent_rate + ' ₽' : '—') + '</td>';
          h += '<td style="text-align:right;padding:6px;font-weight:500">' + (sum > 0 ? _fmtNum(sum) + ' ₽' : '—') + '</td>';
          h += '</tr>';
        });
        if (suppTotal > 0) {
          h += '<tr style="font-weight:600;background:var(--bg-hover)"><td style="padding:6px">Итого</td><td></td><td></td><td style="text-align:right;padding:6px">' + _fmtNum(suppTotal) + ' ₽/мес</td></tr>';
        }
        h += '</tbody></table></div>';
      }
    }

    // Other changed fields (amount, dates etc.)
    var shownFields = ['contract_date','contract_end_date','contract_amount','number'];
    var fieldLabels = { contract_date: 'Дата', contract_end_date: 'Срок действия до', contract_amount: 'Сумма договора', number: 'Номер' };
    var changedFields = shownFields.filter(function(k) {
      return sp[k] && (!parentData || String(sp[k]) !== String((parentData.properties || {})[k] || ''));
    });
    if (changedFields.length > 0) {
      h += '<div style="display:flex;flex-direction:column;gap:6px;font-size:14px;margin-bottom:16px">';
      changedFields.forEach(function(k) {
        h += '<div><span style="color:var(--text-secondary)">' + (fieldLabels[k] || k) + ':</span> <strong>' + escapeHtml(sp[k]) + '</strong></div>';
      });
      h += '</div>';
    }

    // Actions
    h += '<div style="margin-top:16px;display:flex;gap:8px">';
    h += '<button class="btn btn-sm" onclick="closeModal();showEntity(' + id + ')">Полные детали</button>';
    if (parentId) {
      h += '<button class="btn btn-sm btn-primary" onclick="openContractCard(' + parentId + ')">К договору</button>';
    }
    h += '</div>';

    setModalContent(h);
  } catch(e) {
    setModalContent('<div style="color:#dc2626;padding:20px">Ошибка: ' + escapeHtml(e.message || String(e)) + '</div>');
  }
}

async function openEditModal(id) {
  showLoadingModal();
  clearEntityCache();
  const e = await api('/entities/' + id);
  // Акты — специальная форма
  if (e.type_name === 'act') { await openEditActModal(id, e); return; }
  const fields = e.fields || [];
  const allEntities = await api('/entities');
  await loadContractEntities();
  await loadEntityLists();

  const props = e.properties || {};
  const isContractLike = (e.type_name === 'contract' || e.type_name === 'supplement');
  _contractFormTypeName = e.type_name;

  // For supplements: inherit missing party fields from parent contract
  if (e.type_name === 'supplement' && e.parent_id) {
    try {
      var parentEntity = await api('/entities/' + e.parent_id);
      var pp = parentEntity.properties || {};
      var inheritFields = ['our_legal_entity', 'our_legal_entity_id', 'our_role_label', 'contractor_name', 'contractor_id', 'contractor_role_label', 'subtenant_name', 'subtenant_id'];
      inheritFields.forEach(function(fn) { if (!props[fn] && pp[fn]) props[fn] = pp[fn]; });
    } catch(ex) { console.error('Failed to load parent contract:', ex); }
  }

  let html = '<h3>Редактировать: ' + escapeHtml(e.name) + '</h3>';
  if (isContractLike) {
    html += '<input type="hidden" id="f_name" value="' + escapeHtml(e.name) + '">';
  } else {
    html += '<div class="form-group"><label>Название</label><input id="f_name" value="' + escapeHtml(e.name) + '"></div>';
  }

  if (isContractLike) {
    // Use renderContractFormFields but with edit button
    var editHtml = html;
    _contractFormFields = fields;
    _contractFormProps = props;
    var contractType = props.contract_type || '';
    var roles = CONTRACT_ROLES[contractType] || { our: 'Наше юр. лицо', contractor: 'Контрагент' };

    fields.forEach(function(f) {
      var val = props[f.name] || '';
      var ef = f;

      if (f.name === 'contract_type') {
        if (e.type_name === 'supplement') {
          // ДС наследует тип от родительского договора — не редактируется
          editHtml += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>';
          editHtml += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(val) + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется от договора)</span></div>';
          editHtml += '<input type="hidden" id="f_contract_type" value="' + escapeHtml(val) + '"></div>';
        } else {
          editHtml += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
        }
      } else if (f.name === 'our_role_label') {
        // Defer: rendered with our_legal_entity
      } else if (f.name === 'our_legal_entity') {
        var ourDefaultRole2 = roles.our;
        var ourRoleVal2 = props.our_role_label || ourDefaultRole2;
        editHtml += '<div style="display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:end;margin-bottom:14px">';
        editHtml += '<div id="wrap_our_role_label"><label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">Роль нашей стороны</label>' +
          '<input id="f_our_role_label" value="' + escapeHtml(ourRoleVal2) + '" placeholder="' + escapeHtml(ourDefaultRole2) + '" data-auto-set="true" style="font-size:12px;color:var(--text-secondary);width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius)"></div>';
        editHtml += '<div id="wrap_our_legal_entity"><label id="label_our_legal_entity" style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">' + escapeHtml(ourRoleVal2) + '</label>' +
          renderSearchableSelect('f_our_legal_entity', _ownCompanies, props.our_legal_entity_id, props.our_legal_entity || '', 'начните вводить...', 'our_legal_entity') + '</div>';
        editHtml += '</div>';
      } else if (f.name === 'contractor_role_label') {
        // Defer: rendered with contractor_name
      } else if (f.name === 'contractor_name') {
        var contrDefaultRole2 = roles.contractor;
        var contrRoleVal2 = props.contractor_role_label || contrDefaultRole2;
        editHtml += '<div style="display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:end;margin-bottom:14px">';
        editHtml += '<div id="wrap_contractor_role_label"><label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">Роль контрагента</label>' +
          '<input id="f_contractor_role_label" value="' + escapeHtml(contrRoleVal2) + '" placeholder="' + escapeHtml(contrDefaultRole2) + '" data-auto-set="true" style="font-size:12px;color:var(--text-secondary);width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius)"></div>';
        editHtml += '<div id="wrap_contractor_name"><label id="label_contractor_name" style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">' + escapeHtml(contrRoleVal2) + '</label>' +
          renderSearchableSelect('f_contractor_name', _allCompanies, props.contractor_id, props.contractor_name || '', 'начните вводить...', 'contractor_name') + '</div>';
        editHtml += '</div>';
      } else if (f.name === 'subtenant_name') {
        var show = (contractType === 'Субаренды');
        editHtml += '<div class="form-group" id="wrap_subtenant_name" style="' + (show ? '' : 'display:none') + '"><label>Субарендатор</label>' +
          renderSearchableSelect('f_subtenant_name', _allCompanies, props.subtenant_id, val, 'начните вводить...', 'subtenant_name') + '</div>';
      } else {
        // Skip fields already covered by CONTRACT_TYPE_FIELDS for this type
        var ctTypeFieldsEdit = CONTRACT_TYPE_FIELDS[contractType] || [];
        if (ctTypeFieldsEdit.find(function(cf) { return cf.name === f.name; })) return;
        // Hide payment_frequency, sale_item_type for rent types
        var _isRentalEdit = (contractType === 'Аренды' || contractType === 'Субаренды' || contractType === 'Аренда оборудования');
        if (_isRentalEdit && (f.name === 'payment_frequency' || f.name === 'sale_item_type')) return;
        // Hide vat_rate for rent (rendered in rent section)
        if (_isRentalEdit && f.name === 'vat_rate') return;
        // Hide duration fields for supplements (shown as regular fields)
        if (e.type_name !== 'supplement' && (f.name === 'contract_end_date' || f.name === 'duration_type' || f.name === 'duration_date' || f.name === 'duration_text')) return;
        // Default vat_rate to 22
        if (f.name === 'vat_rate' && !val) val = '22';
        editHtml += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
      }
    });

    editHtml += '<div id="dynamicFieldsContainer"></div>';
    editHtml += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
      '<button class="btn btn-primary" onclick="submitEdit(' + id + ')">Сохранить</button></div>';

    setModalContent(editHtml);
    _srchInitAll();

    var ctEl = document.getElementById('f_contract_type');
    if (ctEl) {
      ctEl.addEventListener('change', function() { onContractTypeChange(); });
      var ctCustom = document.getElementById('f_contract_type_custom');
      if (ctCustom) ctCustom.addEventListener('input', function() { onContractTypeChange(); });
    }
    var ourRE = document.getElementById('f_our_role_label');
    if (ourRE) ourRE.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });
    var contrRE = document.getElementById('f_contractor_role_label');
    if (contrRE) contrRE.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });
    if (contractType) renderDynamicFields(contractType, props);

    return;
  }

  // Non-contract edit
  var isAct = (e.type_name === 'act');
  var isBuildingLike = (e.type_name === 'building' || e.type_name === 'workshop');

  if (!isAct) {
    if (isBuildingLike) {
      html += '<div class="form-group"><label>Собственник</label><select id="f_parent"><option value="">— не указано —</option>';
      _allCompanies.forEach(function(c) {
        html += '<option value="' + c.id + '"' + (c.id === e.parent_id ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
      });
      html += '</select></div>';
    } else if (e.type_name === 'room') {
      html += renderRoomBuildingParent(e.parent_id);
    } else if (e.type_name === 'equipment') {
      // Find existing located_in relation for room
      var eqRels = e.relations || [];
      var locInRel = eqRels.find(function(r) { return r.relation_type === 'located_in' && r.from_entity_id === id; });
      var existingRoomId = locInRel ? (locInRel.to_entity_id || null) : null;
      html += renderEquipmentLocationFields(e.parent_id, existingRoomId);
    } else if (e.type_name === 'land_plot_part') {
      html += '<div class="form-group"><label>Земельный участок</label><select id="f_parent" onchange="onLpPartParentChange(this)"><option value="">— выберите ЗУ —</option>';
      allEntities.filter(function(x) { return x.type_name === 'land_plot'; }).forEach(function(x) {
        html += '<option value="' + x.id + '"' + (x.id === e.parent_id ? ' selected' : '') + '>' + escapeHtml(x.name) + '</option>';
      });
      html += '</select></div>';
    } else if (e.type_name !== 'land_plot' && e.type_name !== 'company') {
      html += '<div class="form-group"><label>Входит в (родительский объект)</label><select id="f_parent"><option value="">— нет (корневой объект) —</option>';
      allEntities.filter(function(x) { return x.id !== id && x.type_name !== 'contract' && x.type_name !== 'supplement'; }).forEach(function(x) {
        html += '<option value="' + x.id + '"' + (x.id === e.parent_id ? ' selected' : '') + '>' + x.icon + ' ' + escapeHtml(x.name) + ' (' + x.type_name_ru + ')</option>';
      });
      html += '</select></div>';
    }
  }
  if (isAct && props.parent_contract_name) {
    html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;padding:8px;background:var(--bg-hover);border-radius:6px">Договор-основание: <strong>' + escapeHtml(props.parent_contract_name) + '</strong></div>';
  }

  // For buildings: find existing located_on relation
  var existingLandPlotId = null;
  if (isBuildingLike) {
    var eRels = e.relations || [];
    var lpRel = eRels.find(function(r) { return r.relation_type === 'located_on' && r.from_entity_id === id; });
    if (lpRel) existingLandPlotId = lpRel.to_entity_id || null;
  }

  fields.forEach(f => {
    if (f.sort_order >= 999) return; // hidden field (room_number, room_type etc.)
    const val = props[f.name] || '';
    // For acts: hide service fields, make total_amount readonly display
    if (isAct) {
      if (f.name === 'parent_contract_id' || f.name === 'parent_contract_name') return;
      if (f.name === 'total_amount') {
        var items = [];
        try { items = JSON.parse(props.act_items || '[]'); } catch(ex) {}
        var total = items.reduce(function(s, i) { return s + (parseFloat(i.amount) || 0); }, 0);
        html += '<div class="form-group"><label>Итого по акту, ₽</label><input type="number" id="f_total_amount" value="' + total + '" readonly style="background:var(--bg-hover);color:var(--text-muted)"></div>';
        return;
      }
    }
    if (e.type_name === 'land_plot_part' && f.name === 'cadastral_number') {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + _renderCadastralSelect('f_cadastral_number', val) + '</div>';
    } else if (f.name === 'balance_owner') {
      html += '<div class="form-group"><label>Собственник</label>' +
        renderSearchableSelect('f_balance_owner', _ownCompanies, props.balance_owner_id || '', val, 'начните вводить...', 'balance_owner') + '</div>';
    } else if (f.name === 'owner') {
      html += '<div class="form-group"><label>Собственник</label>' +
        renderSearchableSelect('f_owner', _allCompanies, props.owner_id || '', props.owner_name || '', 'начните вводить...', 'owner') + '</div>';
    } else {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(f, val) + '</div>';
    }
  });

  // Building: land plot selector
  if (isBuildingLike) {
    html += renderLandPlotSelectorField(existingLandPlotId);
  }

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitEdit(' + id + ')">Сохранить</button></div>';

  setModalContent(html);
  _srchInitAll();
}

async function submitEdit(id) {
  if (_submitting) return;
  _submitting = true;
  try { await _doSubmitEdit(id); } finally { _submitting = false; }
}

async function _doSubmitEdit(id) {
  const e = await api('/entities/' + id);
  const fields = e.fields || [];
  const isContractLike = (e.type_name === 'contract' || e.type_name === 'supplement');
  const fParentEl = document.getElementById('f_parent');
  let parent_id;
  if (isContractLike) {
    parent_id = e.parent_id || null;
  } else if (e.type_name === 'act') {
    parent_id = e.parent_id;
  } else if (e.type_name === 'equipment') {
    const eqBldEditEl = document.getElementById('f_eq_building');
    parent_id = eqBldEditEl ? (eqBldEditEl.value || null) : e.parent_id;
  } else {
    parent_id = fParentEl ? fParentEl.value || null : null;
  }
  // Start with existing properties to preserve map coords, owner_id and other "extra" fields
  const properties = Object.assign({}, e.properties || {});
  fields.forEach(f => { properties[f.name] = getFieldValue(f); });
  // For acts: preserve hidden service fields
  if (e.type_name === 'act') {
    var origProps = e.properties || {};
    if (origProps.parent_contract_id) properties.parent_contract_id = origProps.parent_contract_id;
    if (origProps.parent_contract_name) properties.parent_contract_name = origProps.parent_contract_name;
  }

  // Collect dynamic contract-type fields
  if (isContractLike && properties.contract_type) {
    Object.assign(properties, collectDynamicFieldValues(properties.contract_type));
  }

  // Collect entity IDs
  if (isContractLike) {
    collectEntityIds(properties);
  }
  if (e.type_name === 'equipment') {
    collectEquipmentIds(properties);
  }
  // Collect owner entity for land_plot / building-like
  var ownerEditEl = document.getElementById('f_owner');
  if (ownerEditEl && ownerEditEl.value) {
    var ownerEditEnt = _allCompanies.find(function(c) { return c.id === parseInt(ownerEditEl.value); });
    if (ownerEditEnt) { properties.owner_id = ownerEditEnt.id; properties.owner_name = ownerEditEnt.name; }
    delete properties.owner;
  } else if (e.properties && e.properties.owner_id) {
    // Preserve if not changed
    properties.owner_id = e.properties.owner_id;
    properties.owner_name = e.properties.owner_name;
  }

  // Auto-generate name for contracts and acts
  let name = document.getElementById('f_name').value.trim();
  if (isContractLike) {
    const num = properties.number || '?';
    const contractor = properties.contractor_name || '';
    name = (e.type_name === 'supplement' ? 'ДС' : 'Договор') + ' №' + num + (contractor ? ' — ' + contractor : '');
    if (properties.rent_objects) {
      try {
        var _rosE = JSON.parse(properties.rent_objects);
        var _lpE = _rosE
          .filter(function(ro) { return ro.object_type === 'ЗУ'; })
          .map(function(ro) { return ro.land_plot_part_name || ro.land_plot_name; })
          .filter(Boolean);
        if (_lpE.length) name += ' / ' + _lpE.join(', ');
      } catch(e) {}
    }
  }
  if (e.type_name === 'act') {
    var actNum = (properties.act_number || '').trim() || 'б/н';
    var actDate = properties.act_date || '';
    var actContract = (properties.parent_contract_name || (e.properties || {}).parent_contract_name || '').trim();
    name = 'Акт №' + actNum + (actDate ? ' от ' + actDate : '') + (actContract ? ' — ' + actContract : '');
  }

  await api('/entities/' + id, { method: 'PUT', body: JSON.stringify({ name, properties, parent_id }) });

  // Handle located_on relation for building/workshop
  if (e.type_name === 'building' || e.type_name === 'workshop') {
    var lpSelEdit = document.getElementById('f_land_plot_id');
    if (lpSelEdit) {
      // Delete existing located_on from this building
      var existRels = e.relations || [];
      for (var ri = 0; ri < existRels.length; ri++) {
        if (existRels[ri].relation_type === 'located_on' && existRels[ri].from_entity_id === id) {
          await api('/relations/' + existRels[ri].id, { method: 'DELETE' }).catch(function() {});
        }
      }
      // Create new if selected
      if (lpSelEdit.value) {
        await api('/relations', { method: 'POST', body: JSON.stringify({
          from_entity_id: id, to_entity_id: parseInt(lpSelEdit.value), relation_type: 'located_on'
        }) }).catch(function() {});
      }
    }
  }

  // Handle located_in relation for equipment (room)
  if (e.type_name === 'equipment') {
    var eqRoomEdit = document.getElementById('f_eq_room');
    if (eqRoomEdit) {
      // Delete existing located_in relations from this equipment
      var eqExistRels = e.relations || [];
      for (var ri2 = 0; ri2 < eqExistRels.length; ri2++) {
        if (eqExistRels[ri2].relation_type === 'located_in' && eqExistRels[ri2].from_entity_id === id) {
          await api('/relations/' + eqExistRels[ri2].id, { method: 'DELETE' }).catch(function() {});
        }
      }
      // Create new if selected
      if (eqRoomEdit.value) {
        await api('/relations', { method: 'POST', body: JSON.stringify({
          from_entity_id: id, to_entity_id: parseInt(eqRoomEdit.value), relation_type: 'located_in'
        }) }).catch(function() {});
      }
    }
  }

  closeModal();
  showEntity(id);
}

async function deleteEntity(id) {
  if (!confirm('Удалить эту запись?')) return;
  await api('/entities/' + id, { method: 'DELETE' });
  if (currentTypeFilter) showEntityList(currentTypeFilter);
  else showDashboard();
}
`;
