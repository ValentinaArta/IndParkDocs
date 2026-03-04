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
  var container = document.getElementById('dynamicFieldsContainer');
  if (!container) return;
  var contractType = getSelectedContractType();
  var allFields = CONTRACT_TYPE_FIELDS[contractType] || CONTRACT_TYPE_FIELDS['Аренды'] || [];
  var currentProps = {};

  currentProps.rent_objects = collectAllRentObjects();

  allFields.forEach(function(f) {
    if (f.name === 'rent_objects') return;
    if (f.field_type === 'equipment_list') {
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

  var hasFinancial = !!document.getElementById('financialContainer');
  if (hasFinancial) {
    renderRentSubjectOnly(container, allFields, currentProps);
  } else {
    currentProps.rent_comments = collectComments();
    var _paCb = document.getElementById('f_has_power_allocation');
    currentProps.has_power_allocation = _paCb ? String(_paCb.checked) : 'false';
    var _paKw = document.getElementById('f_power_allocation_kw');
    currentProps.power_allocation_kw = _paKw ? _paKw.value : '';
    renderRentFields(container, allFields, currentProps);
  }
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
  var amountEl = document.getElementById('f_rent_monthly') || document.getElementById('f_contract_amount');
  var vatEl = document.getElementById('f_vat_rate');
  var display = document.getElementById('vat_display');
  if (!display) return;
  var amount = parseFloat(amountEl ? amountEl.value : 0) || 0;
  var vatVal = vatEl ? vatEl.value : '22';
  if (vatVal === 'exempt') {
    display.textContent = amount > 0 ? 'НДС не облагается' : '';
    return;
  }
  var vat = parseFloat(vatVal) || 0;
  if (amount > 0 && vat > 0) {
    var vatAmount = amount * vat / (100 + vat);
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
  var isSupp = _contractFormTypeName === 'supplement';

  var html = headerHtml || '';

  // ========== СЕКЦИЯ 1: РЕКВИЗИТЫ ==========
  html += '<div class="form-section"><div class="form-section-title">Реквизиты договора</div><div class="form-section-body">';

  var fContractType = fields.find(function(f) { return f.name === 'contract_type'; });
  var fNumber = fields.find(function(f) { return f.name === 'number'; });
  var fContractDate = fields.find(function(f) { return f.name === 'contract_date'; });
  var fDocStatus = fields.find(function(f) { return f.name === 'doc_status'; });

  if (fContractType) {
    var ctVal = props.contract_type || '';
    if (isEdit && isSupp) {
      html += '<div class="form-group"><label>' + (fContractType.name_ru || 'Тип') + '</label>';
      html += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(ctVal) + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется)</span></div>';
      html += '<input type="hidden" id="f_contract_type" value="' + escapeHtml(ctVal) + '"></div>';
    } else {
      html += '<div class="form-group"><label>' + (fContractType.name_ru || 'Тип') + '</label>' + renderFieldInput(fContractType, ctVal) + '</div>';
    }
  }

  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  if (fNumber) html += '<div class="form-group"><label>' + (fNumber.name_ru || 'Номер') + '</label>' + renderFieldInput(fNumber, props.number || '') + '</div>';
  if (fContractDate) html += '<div class="form-group"><label>' + (fContractDate.name_ru || 'Дата') + '</label>' + renderFieldInput(fContractDate, props.contract_date || '') + '</div>';
  html += '</div>';

  if (fDocStatus) html += '<div class="form-group"><label>' + (fDocStatus.name_ru || 'Статус') + '</label>' + renderFieldInput(fDocStatus, props.doc_status || '') + '</div>';

  var ourDefaultRole = roles.our;
  var ourRoleVal = props.our_role_label || ourDefaultRole;
  html += '<div style="display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:end;margin-bottom:14px">';
  html += '<div id="wrap_our_role_label"><label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">Роль нашей стороны</label>' +
    '<input id="f_our_role_label" value="' + escapeHtml(ourRoleVal) + '" placeholder="' + escapeHtml(ourDefaultRole) + '" data-auto-set="true" style="font-size:12px;color:var(--text-secondary);width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius)"></div>';
  html += '<div id="wrap_our_legal_entity"><label id="label_our_legal_entity" style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">' + escapeHtml(props.our_role_label || roles.our) + '</label>' +
    renderSearchableSelect('f_our_legal_entity', _ownCompanies, props.our_legal_entity_id, props.our_legal_entity || '', 'начните вводить...', 'our_legal_entity') + '</div>';
  html += '</div>';
  html += '<div style="text-align:center;margin:-6px 0 8px"><button type="button" onclick="swapContractRoles()" title="Поменять роли сторон" class="btn-swap-roles">\\ud83d\\udd04 поменять роли</button></div>';

  var contrDefaultRole = roles.contractor;
  var contrRoleVal = props.contractor_role_label || contrDefaultRole;
  html += '<div style="display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:end;margin-bottom:14px">';
  html += '<div id="wrap_contractor_role_label"><label style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">Роль контрагента</label>' +
    '<input id="f_contractor_role_label" value="' + escapeHtml(contrRoleVal) + '" placeholder="' + escapeHtml(contrDefaultRole) + '" data-auto-set="true" style="font-size:12px;color:var(--text-secondary);width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius)"></div>';
  html += '<div id="wrap_contractor_name"><label id="label_contractor_name" style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:block">' + escapeHtml(props.contractor_role_label || roles.contractor) + '</label>' +
    renderSearchableSelect('f_contractor_name', _allCompanies, props.contractor_id, props.contractor_name || '', 'начните вводить...', 'contractor_name') + '</div>';
  html += '</div>';

  var showSub = (contractType === 'Субаренды') || (roles.hasSubtenant);
  html += '<div class="form-group" id="wrap_subtenant_name" style="' + (showSub ? '' : 'display:none') + '"><label>Субарендатор</label>' +
    renderSearchableSelect('f_subtenant_name', _allCompanies, props.subtenant_id, props.subtenant_name || '', 'начните вводить...', 'subtenant_name') + '</div>';

  var isVgo = props.external_rental === 'false' || props.is_vgo === 'true';
  html += '<div style="margin:4px 0 8px"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">' +
    '<input type="checkbox" id="f_is_vgo"' + (isVgo ? ' checked' : '') + '> \\ud83d\\udd35 ВГО (внутригрупповая операция)</label></div>';

  var _sec1Handled = ['contract_type','number','contract_date','doc_status','our_role_label','our_legal_entity','contractor_role_label','contractor_name','subtenant_name','vat_rate','contract_end_date','duration_type','duration_date','duration_text','payment_frequency','sale_item_type'];
  fields.forEach(function(f) {
    if (_sec1Handled.indexOf(f.name) >= 0) return;
    var ctTypeFields = CONTRACT_TYPE_FIELDS[contractType] || [];
    if (ctTypeFields.find(function(cf) { return cf.name === f.name; })) return;
    var val = props[f.name] || '';
    html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(f, val) + '</div>';
  });

  html += '</div></div>';

  // ========== СЕКЦИЯ 2: ПРЕДМЕТ ДОГОВОРА ==========
  html += '<div class="form-section"><div class="form-section-title">Предмет договора</div><div class="form-section-body">';
  html += '<div id="dynamicFieldsContainer"></div>';
  html += '</div></div>';

  // ========== СЕКЦИЯ 3: УСЛОВИЯ ОПЛАТЫ ==========
  html += '<div class="form-section"><div class="form-section-title">Условия оплаты</div><div class="form-section-body">';
  html += '<div id="financialContainer"></div>';
  html += '</div></div>';

  var submitBtn;
  if (isEdit && entityId) {
    submitBtn = '<button class="btn btn-primary" onclick="submitEdit(' + entityId + ')">Сохранить</button>';
  } else {
    var isSuppBtn = fields.some(function(f) { return f.name === 'changes_description'; });
    var typeName = isSuppBtn ? 'supplement' : 'contract';
    if (_contractFormTypeName) typeName = _contractFormTypeName;
    submitBtn = '<button class="btn btn-primary" onclick="submitCreate(\\''+typeName+'\\')">Создать</button>';
  }
  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' + submitBtn + '</div>';

  setModalContent(html);
  _srchInitAll();

  var ctEl = document.getElementById('f_contract_type');
  if (ctEl) {
    ctEl.addEventListener('change', function() { onContractTypeChange(); });
    var ctCustom = document.getElementById('f_contract_type_custom');
    if (ctCustom) ctCustom.addEventListener('input', function() { onContractTypeChange(); });
  }

  var ourRoleEl = document.getElementById('f_our_role_label');
  if (ourRoleEl) ourRoleEl.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });
  var contrRoleEl = document.getElementById('f_contractor_role_label');
  if (contrRoleEl) contrRoleEl.addEventListener('input', function() { this.setAttribute('data-auto-set','false'); updatePartyLabels(); });

  if (contractType) {
    renderDynamicFields(contractType, props);
    renderFinancialSection(contractType, props);
  }
}

// ============ FINANCIAL SECTION ============
function renderFinancialSection(contractType, props) {
  var container = document.getElementById('financialContainer');
  if (!container) return;
  props = props || {};
  var isRental = (contractType === 'Аренды' || contractType === 'Субаренды');
  var isEqRent = (contractType === 'Аренда оборудования');
  var html = '';

  if (isRental || isEqRent) {
    html += '<div class="form-group"><label>' + (isEqRent ? 'Стоимость аренды в месяц' : 'Арендная плата в месяц') + '</label>' +
      '<input type="number" id="f_rent_monthly" value="' + escapeHtml(String(props.rent_monthly || '')) + '" readonly style="background:var(--bg-secondary);font-weight:600;color:var(--accent)"></div>';
  } else {
    html += '<div class="form-group"><label>Сумма договора (итого)</label>' +
      '<input type="number" id="f_contract_amount" value="' + escapeHtml(String(props.contract_amount || '')) + '" readonly style="background:var(--bg-secondary);font-weight:600;color:var(--accent)"></div>';
  }

  var vatVal = props.vat_rate || '22';
  html += '<div class="form-group"><label>НДС</label><div style="display:flex;gap:8px;align-items:center">' +
    renderVatSelect(vatVal) +
    '<span id="vat_display" style="font-size:12px;color:var(--text-secondary)"></span></div></div>';

  if (isRental) {
    var hasExtra = props.extra_services === 'true' || props.extra_services === true;
    html += '<div style="margin:8px 0"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">' +
      '<input type="checkbox" id="f_extra_services"' + (hasExtra ? ' checked' : '') +
      ' onchange="onExtraServicesToggle()"> Доп. услуги</label></div>';
    html += '<div id="extra_services_fields" style="' + (hasExtra ? '' : 'display:none') + '">';
    html += '<div class="form-group"><label>Описание доп. услуг</label><input id="f_extra_services_desc" value="' + escapeHtml(props.extra_services_desc || '') + '"></div>';
    html += '<div class="form-group"><label>Стоимость в месяц</label><input type="number" id="f_extra_services_cost" value="' + (props.extra_services_cost || '') + '" oninput="recalcRentMonthly()"></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Комментарии</label>' + renderCommentsBlock(props.rent_comments) + '</div>';
    var hasPower = props.has_power_allocation === 'true' || props.has_power_allocation === true;
    html += '<div style="margin:8px 0"><label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:14px">' +
      '<input type="checkbox" id="f_has_power_allocation"' + (hasPower ? ' checked' : '') +
      ' onchange="onPowerAllocationToggle()"> Выделена эл. мощность</label></div>';
    html += '<div id="power_allocation_fields" style="' + (hasPower ? '' : 'display:none') + '">';
    html += '<div class="form-group"><label>Эл. мощность (кВт)</label><input type="number" id="f_power_allocation_kw" value="' + escapeHtml(props.power_allocation_kw || '') + '" step="0.1"></div>';
    html += '</div>';
  }

  var _freqTypes = ['Услуг', 'ТО и ППР', 'Эксплуатации', 'Обслуживания'];
  if (_freqTypes.indexOf(contractType) >= 0) {
    var freqOpts = ['Единовременно','Ежемесячно','Ежеквартально','Раз в полгода','Ежегодно'];
    var freqVal = props.payment_frequency || '';
    var freqCustom = freqVal && freqOpts.indexOf(freqVal) < 0;
    html += '<div class="form-group"><label>Периодичность оплаты</label>';
    html += '<div style="display:flex;gap:6px;align-items:center"><select id="f_payment_frequency" onchange="toggleCustomInput(this)" style="flex:1"><option value="">\\u2014</option>';
    freqOpts.forEach(function(o) { html += '<option value="' + escapeHtml(o) + '"' + (o === freqVal ? ' selected' : '') + '>' + escapeHtml(o) + '</option>'; });
    html += '<option value="__custom__"' + (freqCustom ? ' selected' : '') + '>Другое...</option></select>';
    html += '<input id="f_payment_frequency_custom" placeholder="Введите значение" value="' + (freqCustom ? escapeHtml(freqVal) : '') + '" style="flex:1;' + (freqCustom ? '' : 'display:none') + '"></div></div>';
  }

  var _advTypes = ['Подряда', 'Услуг', 'ТО и ППР'];
  if (_advTypes.indexOf(contractType) >= 0) {
    var advances = [];
    try { if (typeof props.advances === 'string' && props.advances) advances = JSON.parse(props.advances); } catch(ex) {}
    html += '<div class="form-group"><label>Авансы</label>' + renderAdvancesBlock(advances) + '</div>';
  }

  if (contractType === 'Подряда') {
    html += renderDeadlineSection(props);
  }

  html += renderDurationSection(props);

  html += '<input type="hidden" id="f_external_rental" value="auto">';
  container.innerHTML = html;
  updateVatDisplay();
  if (isRental || isEqRent) recalcRentMonthly();
}

function onExtraServicesToggle() {
  var cb = document.getElementById('f_extra_services');
  var fields = document.getElementById('extra_services_fields');
  if (fields) fields.style.display = (cb && cb.checked) ? '' : 'none';
  recalcRentMonthly();
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

  // Update role label inputs — always reset on type change
  var ourRoleEl = document.getElementById('f_our_role_label');
  if (ourRoleEl) {
    ourRoleEl.value = roles.our;
    ourRoleEl.placeholder = roles.our;
    ourRoleEl.setAttribute('data-auto-set', 'true');
  }

  var contrRoleEl = document.getElementById('f_contractor_role_label');
  if (contrRoleEl) {
    contrRoleEl.value = roles.contractor;
    contrRoleEl.placeholder = roles.contractor;
    contrRoleEl.setAttribute('data-auto-set', 'true');
  }

  // Update labels on the entity fields
  updatePartyLabels();

  // Show/hide subtenant
  var subWrap = document.getElementById('wrap_subtenant_name');
  if (subWrap) {
    subWrap.style.display = (contractType === 'Субаренды') ? '' : 'none';
  }

  // Render subject + financial fields
  renderDynamicFields(contractType, {});
  renderFinancialSection(contractType, {});
}

function updatePartyLabels() {
  var ourRoleEl = document.getElementById('f_our_role_label');
  var contrRoleEl = document.getElementById('f_contractor_role_label');
  var ourLabel = document.getElementById('label_our_legal_entity');
  var contrLabel = document.getElementById('label_contractor_name');
  if (ourLabel && ourRoleEl) ourLabel.textContent = ourRoleEl.value || 'Наше юр. лицо';
  if (contrLabel && contrRoleEl) contrLabel.textContent = contrRoleEl.value || 'Контрагент';
}

function swapContractRoles() {
  var ourRoleEl = document.getElementById('f_our_role_label');
  var contrRoleEl = document.getElementById('f_contractor_role_label');
  if (!ourRoleEl || !contrRoleEl) return;
  var tmp = ourRoleEl.value;
  ourRoleEl.value = contrRoleEl.value;
  contrRoleEl.value = tmp;
  // Зафиксировать: не сбрасывать при смене типа
  ourRoleEl.setAttribute('data-auto-set', 'false');
  contrRoleEl.setAttribute('data-auto-set', 'false');
  updatePartyLabels();
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
  // Collect deadline section values (Подряда)
  var dlType = document.getElementById('f_deadline_type');
  var dlDate = document.getElementById('f_deadline_date');
  var dlText = document.getElementById('f_deadline_text');
  if (dlType) {
    result.deadline_type = dlType.value;
    if (dlType.value === 'Дата' && dlDate) result.completion_deadline = dlDate.value;
    else if (dlType.value === 'Текст' && dlText) result.completion_deadline = dlText.value;
    if (dlDate) result.deadline_date = dlDate.value;
    if (dlText) result.deadline_text = dlText.value;
  }
  // ВГО checkbox → external_rental (inverse)
  var _vgoEl = document.getElementById('f_is_vgo');
  if (_vgoEl) {
    result.is_vgo = String(_vgoEl.checked);
    result.external_rental = String(!_vgoEl.checked);
  } else {
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
  }
  // Collect vat_rate from financial section
  var _vatEl = document.getElementById('f_vat_rate');
  if (_vatEl) result.vat_rate = _vatEl.value;
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
