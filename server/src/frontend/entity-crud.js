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
  document.querySelectorAll('.rent-object-block').forEach(function(block) {
    var idx = block.id.replace('rent_obj_', '');
    var obj = collectRentObjectData(idx);
    var area = 0;
    if (obj.calc_mode === 'fixed') {
      total += parseFloat(obj.fixed_rent) || 0;
    } else {
      // Get area: 1) from room registry, 2) from area span (rooms), 3) from area input (land plots)
      var room = _getRoomById(obj.room_id);
      if (room) {
        area = parseFloat((room.properties || {}).area) || 0;
      } else {
        var areaSpan = document.getElementById('ro_room_area_' + idx);
        area = areaSpan ? (parseFloat(areaSpan.textContent) || 0) : 0;
        if (!area) area = parseFloat(obj.area) || 0;
      }
      var rate = parseFloat(obj.rent_rate) || 0;
      total += area * rate;
      // Update monthly display (works for both rooms and land plots)
      var monthlyEl = document.getElementById('ro_monthly_' + idx);
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

function renderContractFormFields(fields, props, headerHtml, options) {
  options = options || {};
  var isEdit = options.isEdit || false;
  var entityId = options.entityId || null;
  _contractFormFields = fields;
  _contractFormProps = props || {};
  var contractType = props.contract_type || '';
  var roles = CONTRACT_ROLES[contractType] || { our: 'Наше юр. лицо', contractor: 'Контрагент' };

  var html = headerHtml || '';

  fields.forEach(function(f) {
    var val = props[f.name] || '';
    var ef = f;

    // contract_type — first, with onchange (read-only for supplement edit)
    if (f.name === 'contract_type') {
      if (isEdit && _contractFormTypeName === 'supplement') {
        html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>';
        html += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(val) + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется от договора)</span></div>';
        html += '<input type="hidden" id="f_contract_type" value="' + escapeHtml(val) + '"></div>';
      } else {
        html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
      }
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

  // Submit button: Сохранить for edit, Создать for create
  var submitBtn;
  if (isEdit && entityId) {
    submitBtn = '<button class="btn btn-primary" onclick="submitEdit(' + entityId + ')">Сохранить</button>';
  } else {
    var isSupp = fields.some(function(f) { return f.name === 'changes_description'; });
    var typeName = isSupp ? 'supplement' : 'contract';
    if (_contractFormTypeName) typeName = _contractFormTypeName;
    submitBtn = '<button class="btn btn-primary" onclick="submitCreate(\\''+typeName+'\\')">Создать</button>';
  }
  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' + submitBtn + '</div>';

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

// api() moved to core/api.js

// legal zachety functions moved to pages/legal-zachety.js

// escHtml removed — use escapeHtml() from core/utils.js

async function showNewContractForm(returnInput) {
  // Load all entity types and their field definitions
  var entityTypes = [];
  try { entityTypes = await api('/entity-types'); } catch(e) { console.error(e); }

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto';

  var typeOptions = entityTypes.map(function(et) {
    return '<option value="' + et.id + '" data-name="' + escapeHtml(et.name) + '">' + (et.icon || '') + ' ' + escapeHtml(et.name_ru) + '</option>';
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
        (Array.isArray(f.options) ? f.options : []).forEach(function(o) { opts += '<option>' + escapeHtml(o) + '</option>'; });
        inputHtml = '<select id="ncf_' + f.name + '">' + opts + '</select>';
      } else if (f.field_type === 'select_or_custom' && f.options) {
        inputHtml = '<input id="ncf_' + f.name + '" list="ncl_' + f.name + '" placeholder="Выберите или введите">' +
          '<datalist id="ncl_' + f.name + '">' + (Array.isArray(f.options) ? f.options : []).map(function(o) { return '<option value="' + escapeHtml(o) + '">'; }).join('') + '</datalist>';
      } else if (f.field_type === 'boolean') {
        inputHtml = '<label style="display:flex;align-items:center;gap:6px"><input id="ncf_' + f.name + '" type="checkbox"> Да</label>';
      } else {
        inputHtml = '<input id="ncf_' + f.name + '" placeholder="' + escapeHtml(f.name_ru || f.name) + '">';
      }
      html += '<div class="form-group"><label>' + escapeHtml(f.name_ru || f.name) + (f.required ? ' *' : '') + '</label>' + inputHtml + '</div>';
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

// parseAmount / formatAmountDisplay / formatAmountOnBlur / initAmountFormatting
// moved to components/amount-input.js

// collectLines, saveZachet, showZachetDetail, deleteZachet moved to pages/legal-zachety.js

// setActiveNav moved to pages/nav.js

// TOTP functions moved to pages/totp.js

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
  var _isSupp = (e.type_name === 'supplement');
  var _topAct = '<button class="btn btn-sm" onclick="openEditModal(' + id + ')">Редактировать</button>' +
    '<button class="btn btn-sm" onclick="openRelationModal(' + id + ')">+ Связь</button>' +
    '<button class="btn btn-sm btn-danger" onclick="deleteEntity(' + id + ')">Удалить</button>';
  if (_isContract || _isSupp) {
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

  // For supplements — show card inline (with parent entity data for link display)
  if (_isSupp && !_forceDetail) {
    var suppContentEl = document.getElementById('content');
    suppContentEl.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted)">Загрузка...</div>';
    if (e.parent_id && !e.parent) {
      try { e.parent = await api('/entities/' + e.parent_id); } catch(ex) {}
    }
    suppContentEl.innerHTML = '<div style="max-width:860px;padding:8px 0">' + renderSupplementCard(e) + '</div>';
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

// BI/budget page functions moved to pages/budget-page.js

// ============ FINANCE PAGE (1С) ============
// finance page functions moved to pages/finance-page.js

// editBIUrl moved to pages/budget-page.js

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

// _fmtNum moved to core/utils.js

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

// modal functions (showLoadingModal, setModalContent, setModalSize, closeModal) moved to modal.js

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
function renderEquipmentLocationFields(selectedBuildingId, selectedRoomId, selectedLandPlotId) {
  var bid = parseInt(selectedBuildingId) || 0;
  var rid = parseInt(selectedRoomId) || 0;
  var lpid = parseInt(selectedLandPlotId) || 0;
  var locType = lpid ? 'land_plot' : 'building';

  var h = '<div class="form-group"><label>Тип расположения</label>';
  h += '<select id="f_eq_loc_type" style="width:100%" onchange="onEqLocTypeChange()">';
  h += '<option value="building"' + (locType === 'building' ? ' selected' : '') + '>Корпус / Помещение</option>';
  h += '<option value="land_plot"' + (locType === 'land_plot' ? ' selected' : '') + '>Земельный участок</option>';
  h += '</select></div>';

  // Building + Room section
  h += '<div id="eq_loc_building_section" style="' + (locType === 'building' ? '' : 'display:none') + '">';
  h += '<div class="form-group"><label>Корпус</label>';
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
  h += '</div>';

  // Land plot section
  h += '<div id="eq_loc_land_section" style="' + (locType === 'land_plot' ? '' : 'display:none') + '">';
  h += '<div class="form-group"><label>Земельный участок</label>';
  h += '<select id="f_eq_land_plot" style="width:100%">';
  h += '<option value="">— не указано —</option>';
  (_landPlots || []).forEach(function(lp) {
    h += '<option value="' + lp.id + '"' + (lp.id === lpid ? ' selected' : '') + '>' + escapeHtml(lp.name) + '</option>';
  });
  h += '</select></div>';
  h += '</div>';

  return h;
}

function onEqLocTypeChange() {
  var sel = document.getElementById('f_eq_loc_type');
  if (!sel) return;
  var bldSec = document.getElementById('eq_loc_building_section');
  var lpSec = document.getElementById('eq_loc_land_section');
  if (sel.value === 'land_plot') {
    if (bldSec) bldSec.style.display = 'none';
    if (lpSec) lpSec.style.display = '';
  } else {
    if (bldSec) bldSec.style.display = '';
    if (lpSec) lpSec.style.display = 'none';
  }
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
      html += '<div class="form-group"><label>Земельный участок <span style="color:var(--danger)">*</span></label><select id="f_parent" onchange="onLpPartParentChange(this)"><option value="">— выберите ЗУ —</option>';
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
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + ' <span style="color:var(--danger)">*</span></label>' + _renderCadastralSelect('f_cadastral_number', autoFillCad) + '</div>';
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
    var _eqLocType = document.getElementById('f_eq_loc_type');
    if (_eqLocType && _eqLocType.value === 'land_plot') {
      var _eqLpEl = document.getElementById('f_eq_land_plot');
      parent_id = _eqLpEl ? (_eqLpEl.value || null) : null;
    } else {
      const eqBldEl = document.getElementById('f_eq_building');
      parent_id = eqBldEl ? (eqBldEl.value || null) : null;
    }
  } else {
    parent_id = document.getElementById('f_parent') ? document.getElementById('f_parent').value || null : null;
  }
  // Validate required fields for land_plot_part
  if (typeName === 'land_plot_part') {
    if (!parent_id) { alert('Выберите Земельный участок — это обязательное поле'); return; }
    var cadCreateEl = document.getElementById('f_cadastral_number');
    if (!cadCreateEl || !(cadCreateEl.value || '').trim()) { alert('Кадастровый номер обязателен для части ЗУ'); return; }
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

  // Handle located_in relation for equipment (room — only when location type is building)
  if (typeName === 'equipment' && createdEntity && createdEntity.id) {
    var _eqLocTypeC = document.getElementById('f_eq_loc_type');
    var _isLocBuildingC = !_eqLocTypeC || _eqLocTypeC.value !== 'land_plot';
    if (_isLocBuildingC) {
      var eqRoomSel = document.getElementById('f_eq_room');
      if (eqRoomSel && eqRoomSel.value) {
        await api('/relations', { method: 'POST', body: JSON.stringify({
          from_entity_id: createdEntity.id, to_entity_id: parseInt(eqRoomSel.value), relation_type: 'located_in'
        }) }).catch(function() {});
      }
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

// ── Supplement card (аналог renderContractCard для ДС) ───────────────────────
/**
 * Рендерит карточку ДС.
 * @param {Object} supp - entity объект supplement
 * supp.parent — опционально, подгружается если доступен (для показа названия родит. договора)
 */
function renderSupplementCard(supp) {
  var sp = supp.properties || {};
  // Если поля сторон не заполнены на ДС — берём из родительского договора
  var pp = (supp.parent && supp.parent.properties) ? supp.parent.properties : {};
  var isRental = (sp.contract_type === 'Аренды' || sp.contract_type === 'Субаренды' || sp.contract_type === 'Аренда оборудования');

  var h = '';

  // ── Header ─────────────────────────────────────────────────────────────────
  var contractorName = sp.contractor_name || pp.contractor_name || '';
  var titleParts = [];
  if (contractorName) titleParts.push(contractorName);
  if (sp.number) titleParts.push('ДС №' + sp.number);
  if (sp.contract_date) titleParts.push(_ccFmtDate(sp.contract_date));
  h += '<div style="margin-bottom:20px">';
  h += '<h2 style="font-size:1.3rem;font-weight:700;margin:0 0 4px">' + escapeHtml(titleParts.join(', ') || supp.name || '') + '</h2>';
  h += '<span style="font-size:13px;color:var(--text-secondary)">Доп. соглашение' + (sp.contract_type ? ' к договору ' + escapeHtml(sp.contract_type) : '') + '</span>';
  h += '</div>';

  // ── Link to parent contract ─────────────────────────────────────────────────
  if (supp.parent_id) {
    var parentName = (supp.parent && supp.parent.name) ? supp.parent.name : ('Договор #' + supp.parent_id);
    h += '<div style="margin-bottom:14px;padding:8px 12px;background:var(--bg-secondary);border-radius:6px;font-size:13px;display:flex;align-items:center;gap:8px">';
    h += '<span style="color:var(--text-muted)">⬆ Основной договор:</span> ';
    h += '<a href="#" onclick="showEntity(' + supp.parent_id + ');return false" style="color:var(--accent);font-weight:600">' + escapeHtml(parentName) + '</a>';
    h += '</div>';
  }

  // ── Стороны (берём из ДС или из родительского договора) ───────────────────
  var ourLabel = sp.our_role_label || pp.our_role_label || (isRental ? 'Арендодатель' : 'Наше юр. лицо');
  var contrLabel = sp.contractor_role_label || pp.contractor_role_label || (isRental ? 'Арендатор' : 'Контрагент');
  var ourEntity = sp.our_legal_entity || pp.our_legal_entity || '';
  var contrName = sp.contractor_name || pp.contractor_name || '';
  var subName = sp.subtenant_name || pp.subtenant_name || '';
  if (ourEntity || contrName) {
    h += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;font-size:14px">';
    if (ourEntity) h += '<div><span style="color:var(--text-secondary)">' + escapeHtml(ourLabel) + ':</span> <strong>' + escapeHtml(ourEntity) + '</strong></div>';
    if (contrName) h += '<div><span style="color:var(--text-secondary)">' + escapeHtml(contrLabel) + ':</span> <strong>' + escapeHtml(contrName) + '</strong></div>';
    if (subName)   h += '<div><span style="color:var(--text-secondary)">Субарендатор:</span> <strong>' + escapeHtml(subName) + '</strong></div>';
    h += '</div>';
  }

  // ── Что изменилось ─────────────────────────────────────────────────────────
  if (sp.changes_description) {
    h += '<div style="margin-bottom:16px;padding:10px 14px;background:rgba(99,102,241,.07);border-left:3px solid var(--accent);border-radius:0 6px 6px 0">';
    h += '<div style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.5px;margin-bottom:4px;text-transform:uppercase">Что изменилось</div>';
    h += '<div style="font-size:14px">' + escapeHtml(sp.changes_description) + '</div>';
    h += '</div>';
  }

  // ── Срок действия ──────────────────────────────────────────────────────────
  var durStr = sp.contract_end_date
    ? ('до ' + _ccFmtDate(sp.contract_end_date))
    : (sp.duration_date ? ('до ' + _ccFmtDate(sp.duration_date)) : sp.duration_text || '');
  if (durStr) {
    h += '<div style="margin-bottom:16px;font-size:14px"><span style="color:var(--text-secondary)">Срок действия:</span> <strong>' + escapeHtml(durStr) + '</strong></div>';
  }

  // ── Условия аренды (rent_objects) ─────────────────────────────────────────
  if (sp.rent_objects) {
    var rentObjs = [];
    try { rentObjs = JSON.parse(sp.rent_objects); } catch(ex) {}
    var validObjs = rentObjs.filter(function(ro) { return ro.object_type; });
    if (validObjs.length > 0) {
      h += '<div style="margin-bottom:16px">';
      h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);letter-spacing:.5px;margin-bottom:8px;text-transform:uppercase">Условия аренды</div>';
      h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      h += '<thead><tr style="background:#4F6BCC;color:#fff">';
      h += '<th style="padding:8px 10px;text-align:left;border-radius:4px 0 0 4px">Объект аренды</th>';
      h += '<th style="padding:8px 10px;text-align:right">Площадь, м²</th>';
      h += '<th style="padding:8px 10px;text-align:right;border-radius:0 4px 4px 0">Ставка (руб/м²/мес)</th>';
      h += '</tr></thead><tbody>';
      var totalMonthly = 0;
      validObjs.forEach(function(ro, i) {
        var isLandPlot = (ro.object_type === 'ЗУ' || ro.object_type === 'Земельный участок');
        var objName = isLandPlot
          ? (ro.land_plot_part_name || ro.land_plot_name || ro.room || ro.room_name || '—')
          : (ro.room || ro.room_name || ro.object_type || '—');
        var area = parseFloat(ro.area) || 0;
        var rate = parseFloat(ro.rent_rate) || 0;
        var monthly = ro.fixed_rent ? parseFloat(ro.fixed_rent) : (area * rate);
        totalMonthly += monthly || 0;
        var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
        h += '<tr style="' + bg + '">';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(objName) + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (area ? _ccFmtNum(area) : '—') + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (rate ? _ccFmtNum(rate) : '—') + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table>';
      if (totalMonthly > 0) {
        var vat = parseFloat(sp.vat_rate) || 0;
        var vatAmt = totalMonthly * vat / 100;
        h += '<div style="text-align:right;font-size:14px;font-weight:600;margin-top:8px">';
        h += 'Ежемесячный платёж: ' + _ccFmtNum(totalMonthly) + ' руб.';
        if (vat > 0) {
          h += '<div style="font-size:12px;color:var(--text-secondary);font-weight:400">в т.ч. НДС (' + vat + '%) = ' + _ccFmtNum(vatAmt) + ' руб.</div>';
        }
        h += '</div>';
      }
      h += '</div>';
    }
  }

  // ── Кнопка "+ ДС" ──────────────────────────────────────────────────────────
  if (supp.parent_id) {
    h += '<div style="margin-top:20px">';
    h += '<button class="btn btn-primary btn-sm" onclick="openCreateSupplementModal(' + supp.parent_id + ')">+ Доп. соглашение</button>';
    h += '</div>';
  }

  return h;
}

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
      h += '<th style="padding:8px 10px;text-align:left;border-radius:4px 0 0 4px">Объект аренды</th>';
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
/** Открывает карточку ДС в модальном окне — использует renderSupplementCard (DRY) */
async function openSupplementCard(id) {
  showLoadingModal();
  try {
    var supp = await api('/entities/' + id);
    // Подгружаем родительский договор для отображения ссылки
    if (supp.parent_id && !supp.parent) {
      try { supp.parent = await api('/entities/' + supp.parent_id); } catch(ex) {}
    }

    var cardHtml = renderSupplementCard(supp);

    // Кнопки действий в модальном окне
    var actionsHtml = '<div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap">';
    actionsHtml += '<button class="btn btn-primary btn-sm" onclick="closeModal();openEditModal(' + id + ')">✏ Редактировать</button>';
    actionsHtml += '<button class="btn btn-sm" onclick="closeModal();showEntity(' + id + ')">⚙ Полные детали</button>';
    if (supp.parent_id) {
      actionsHtml += '<button class="btn btn-sm" onclick="closeModal();showEntity(' + supp.parent_id + ')">← К договору</button>';
    }
    actionsHtml += '</div>';

    setModalContent(cardHtml + actionsHtml);
  } catch(err) {
    setModalContent('<div style="color:#dc2626;padding:20px">Ошибка: ' + escapeHtml(err.message || String(err)) + '</div>');
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
    // Delegate entirely to renderContractFormFields (same as create, but isEdit=true)
    renderContractFormFields(fields, props, html, { isEdit: true, entityId: id });
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
      // Determine if parent is a building or a land plot
      var eqParentIsLP = e.parent_id && (_landPlots || []).some(function(lp) { return lp.id === parseInt(e.parent_id); });
      var eqBldId = eqParentIsLP ? null : e.parent_id;
      var eqLpId  = eqParentIsLP ? e.parent_id : null;
      html += renderEquipmentLocationFields(eqBldId, existingRoomId, eqLpId);
    } else if (e.type_name === 'land_plot_part') {
      html += '<div class="form-group"><label>Земельный участок <span style="color:var(--danger)">*</span></label><select id="f_parent" onchange="onLpPartParentChange(this)"><option value="">— выберите ЗУ —</option>';
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
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + ' <span style="color:var(--danger)">*</span></label>' + _renderCadastralSelect('f_cadastral_number', val) + '</div>';
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
    var _eqLocTypeEdit = document.getElementById('f_eq_loc_type');
    if (_eqLocTypeEdit && _eqLocTypeEdit.value === 'land_plot') {
      var _eqLpEditEl = document.getElementById('f_eq_land_plot');
      parent_id = _eqLpEditEl ? (_eqLpEditEl.value || null) : e.parent_id;
    } else {
      const eqBldEditEl = document.getElementById('f_eq_building');
      parent_id = eqBldEditEl ? (eqBldEditEl.value || null) : e.parent_id;
    }
  } else {
    parent_id = fParentEl ? fParentEl.value || null : null;
  }
  // Validate required fields for land_plot_part
  if (e.type_name === 'land_plot_part') {
    if (!parent_id) { alert('Выберите Земельный участок — это обязательное поле'); return; }
    var cadEl = document.getElementById('f_cadastral_number');
    if (!cadEl || !(cadEl.value || '').trim()) { alert('Кадастровый номер обязателен для части ЗУ'); return; }
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

  // Handle located_in relation for equipment (room) — only for building location type
  if (e.type_name === 'equipment') {
    // Delete existing located_in relations regardless of new location type
    var eqExistRels = e.relations || [];
    for (var ri2 = 0; ri2 < eqExistRels.length; ri2++) {
      if (eqExistRels[ri2].relation_type === 'located_in' && eqExistRels[ri2].from_entity_id === id) {
        await api('/relations/' + eqExistRels[ri2].id, { method: 'DELETE' }).catch(function() {});
      }
    }
    // Create new located_in only when location type is building and room is selected
    var _eqLocTypeEdit2 = document.getElementById('f_eq_loc_type');
    var _isLocBuilding = !_eqLocTypeEdit2 || _eqLocTypeEdit2.value !== 'land_plot';
    if (_isLocBuilding) {
      var eqRoomEdit = document.getElementById('f_eq_room');
      if (eqRoomEdit && eqRoomEdit.value) {
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
