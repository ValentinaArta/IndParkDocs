module.exports = `
function collectAllRentObjects() {
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

`;
