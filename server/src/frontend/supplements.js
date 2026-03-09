module.exports = `// ============ SUPPLEMENTS ============
var _currentSuppExisting = [];

// Шаг 1: выбор родительского договора (из реестра ДС)
async function openSelectParentContractForSupplement() {
  showLoadingModal();
  await loadContractEntities();
  var contracts = await api('/entities?type=contract');
  var h = '<h3>Новое доп. соглашение</h3>';
  h += '<div style="margin-bottom:16px;color:var(--text-secondary);font-size:14px">Сначала выберите договор, к которому относится ДС:</div>';
  h += '<div class="form-group"><label>Договор *</label>';
  h += '<select id="f_parent_contract_select" style="width:100%"><option value="">— выберите —</option>';
  contracts.forEach(function(c) {
    var cp = c.properties || {};
    h += '<option value="' + c.id + '">' + escapeHtml(c.name) + (cp.contract_date ? ' от ' + cp.contract_date : '') + '</option>';
  });
  h += '</select></div>';
  h += '<div class="modal-actions">';
  h += '<button class="btn" onclick="closeModal()">Отмена</button>';
  h += '<button class="btn btn-primary" onclick="_proceedCreateSupplement()">Далее →</button>';
  h += '</div>';
  setModalContent(h);
}

async function _proceedCreateSupplement() {
  var sel = document.getElementById('f_parent_contract_select');
  if (!sel || !sel.value) { alert('Выберите договор'); return; }
  var parentContractId = parseInt(sel.value);
  await openCreateSupplementModal(parentContractId);
}

async function openCreateSupplementModal(parentContractId) {
  showLoadingModal();
  _contractFormTypeName = 'supplement';
  clearEntityCache();
  await loadContractEntities();
  await loadEntityLists();
  const parentEntity = await api('/entities/' + parentContractId);
  const parentProps = parentEntity.properties || {};
  const suppType = entityTypes.find(t => t.name === 'supplement');
  if (!suppType) return alert('Тип "Доп. соглашение" не найден');
  const fields = await api('/entity-types/' + suppType.id + '/fields');

  // Auto-number: find max existing supplement number for this contract
  var existingSupps = [];
  try { existingSupps = await api('/entities?type=supplement&parent_id=' + parentContractId + '&limit=200'); } catch(ex) {}
  _currentSuppExisting = existingSupps;
  var maxSuppNum = existingSupps.reduce(function(mx, s) {
    var n = parseInt(((s.properties||{}).number)||'0')||0; return n > mx ? n : mx;
  }, 0);
  var autoSuppNum = String(maxSuppNum + 1);

  // Найти последнее ДС по contract_date — для предзаполнения полей
  var SUPP_PARENT_FIELDS = new Set(['number', 'contract_date', 'changes_description',
    'our_legal_entity', 'our_legal_entity_id', 'contractor_name', 'contractor_id',
    'subtenant_name', 'subtenant_id', 'our_role_label', 'contractor_role_label', 'contract_type']);
  var lastSuppProps = {};
  var sortedSupps = [];
  if (existingSupps.length > 0) {
    sortedSupps = existingSupps.slice().sort(function(a, b) {
      var da = ((a.properties||{}).contract_date)||'';
      var db = ((b.properties||{}).contract_date)||'';
      return db.localeCompare(da) || b.id - a.id;
    });
    lastSuppProps = sortedSupps[0].properties || {};
  }

  // Найти последнее ненулевое значение поля по всем ДС (от новейшего к старейшему)
  function _effSuppProp(propName) {
    for (var _i = 0; _i < sortedSupps.length; _i++) {
      var v = (sortedSupps[_i].properties || {})[propName];
      if (v && v !== '[]' && v !== 'null') return v;
    }
    return null;
  }

  // Вспомогательная функция: берём из последнего ДС, если поле заполнено и не "родительское"
  function _suppPrefill(fieldName) {
    if (SUPP_PARENT_FIELDS.has(fieldName)) return parentProps[fieldName] || '';
    return lastSuppProps[fieldName] || parentProps[fieldName] || '';
  }

  // Use the same contract form with role labels
  var contractType = parentProps.contract_type || '';
  var roles = CONTRACT_ROLES[contractType] || { our: 'Наше юр. лицо', contractor: 'Контрагент' };

  // Prefill from last supplement or parent contract
  var prefillProps = Object.assign({}, parentProps);
  Object.keys(lastSuppProps).forEach(function(k) {
    if (!SUPP_PARENT_FIELDS.has(k) && lastSuppProps[k]) prefillProps[k] = lastSuppProps[k];
  });

  // ── Effective source for normalized data ──
  // Load newest ДС via API (it returns normalized tables). If no data, fall back to parent.
  var effSourceEntity = null;
  if (sortedSupps.length > 0) {
    try { effSourceEntity = await api('/entities/' + sortedSupps[0].id); } catch(ex) {}
  }
  // Check if it has normalized data; if not, try parent contract
  var _effP = effSourceEntity ? (effSourceEntity.properties || {}) : {};
  var _effHasData = (Array.isArray(_effP.equipment_list) && _effP.equipment_list.length > 0) ||
                    (Array.isArray(_effP.contract_items) && _effP.contract_items.length > 0);
  if (!_effHasData) {
    // parentEntity is already loaded above
    effSourceEntity = parentEntity;
    _effP = effSourceEntity.properties || {};
  }

  // rent_objects from effective source
  if (Array.isArray(_effP.rent_objects) && _effP.rent_objects.length) {
    prefillProps.rent_objects = _effP.rent_objects;
  } else {
    var effRentObjects = _effSuppProp('rent_objects') || parentProps.rent_objects || '';
    if (effRentObjects) prefillProps.rent_objects = effRentObjects;
  }

  // power_allocation_kw: выделенная мощность
  var effPowerKw = _effP.power_allocation_kw || _effSuppProp('power_allocation_kw') || parentProps.power_allocation_kw || '';
  if (effPowerKw) { prefillProps.power_allocation_kw = effPowerKw; prefillProps.has_power_allocation = 'true'; }

  // equipment_list from normalized table (contract_equipment via API)
  if (Array.isArray(_effP.equipment_list) && _effP.equipment_list.length) {
    prefillProps.equipment_list = _effP.equipment_list;
    prefillProps.transfer_equipment = 'true';
  } else {
    var effEqList = _effSuppProp('equipment_list') || parentProps.equipment_list || '';
    var effTransferEq = _effSuppProp('transfer_equipment') || parentProps.transfer_equipment || '';
    if (effEqList && effEqList !== '[]') {
      prefillProps.equipment_list = effEqList;
      if (effTransferEq === 'true' || effTransferEq === true) prefillProps.transfer_equipment = 'true';
    }
  }

  // contract_items from normalized table (contract_line_items via API)
  if (Array.isArray(_effP.contract_items) && _effP.contract_items.length) {
    prefillProps.contract_items = _effP.contract_items;
  }

  // Find specific fields
  var fNumber    = fields.find(function(f) { return f.name === 'number'; });
  var fDate      = fields.find(function(f) { return f.name === 'contract_date'; });
  var fStatus    = fields.find(function(f) { return f.name === 'doc_status'; });
  var fChanges   = fields.find(function(f) { return f.name === 'changes_description'; });
  var labelOurS  = parentProps.our_role_label || roles.our;
  var labelContrS = parentProps.contractor_role_label || roles.contractor;

  var html = '<h3>Новое доп. соглашение</h3>';
  html += '<input type="hidden" id="f_name" value="">';
  html += '<input type="hidden" id="f_parent" value="' + parentContractId + '">';

  // ===== СЕКЦИЯ 1: РЕКВИЗИТЫ ДС =====
  html += '<div class="form-section"><div class="form-section-title">Реквизиты ДС</div><div class="form-section-body">';

  // Тип договора (inherited, readonly)
  html += '<div class="form-group"><label>Тип договора</label>';
  html += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(contractType || '—') + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется от договора)</span></div>';
  html += '<input type="hidden" id="f_contract_type" value="' + escapeHtml(contractType) + '"></div>';

  // Наше юрлицо (inherited, readonly)
  html += '<div class="form-group"><label>' + escapeHtml(labelOurS) + '</label>';
  html += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(parentProps.our_legal_entity || '—') + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется)</span></div></div>';

  // Контрагент (inherited, readonly)
  html += '<div class="form-group"><label>' + escapeHtml(labelContrS) + '</label>';
  html += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(parentProps.contractor_name || '—') + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется)</span></div></div>';

  // Субарендатор (только для Субаренды)
  if (contractType === 'Субаренды') {
    html += '<div class="form-group" id="wrap_subtenant_name"><label>Субарендатор</label>' +
      renderSearchableSelect('f_subtenant_name', _allCompanies, parentProps.subtenant_id, _suppPrefill('subtenant_name'), 'начните вводить...', 'subtenant_name') + '</div>';
  }

  // Номер + Дата (в строку)
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  if (fNumber) html += '<div class="form-group"><label>' + escapeHtml(fNumber.name_ru || 'Номер ДС') + '</label>' + renderFieldInput(fNumber, autoSuppNum) + '</div>';
  if (fDate)   html += '<div class="form-group"><label>' + escapeHtml(fDate.name_ru || 'Дата') + '</label>' + renderFieldInput(fDate, _suppPrefill('contract_date')) + '</div>';
  html += '</div>';

  // Статус
  if (fStatus) {
    html += '<div class="form-group"><label>' + escapeHtml(fStatus.name_ru || 'Статус') + '</label>' + renderFieldInput(fStatus, _suppPrefill('doc_status') || 'Создан') + '</div>';
  }

  // Что поменялось
  if (fChanges) {
    html += '<div class="form-group"><label>' + escapeHtml(fChanges.name_ru || 'Что поменялось') + '</label>' + renderFieldInput(fChanges, _suppPrefill('changes_description')) + '</div>';
  }

  html += '</div></div>'; // end form-section-body / form-section

  // ===== СЕКЦИЯ 2: ПРЕДМЕТ ИЗМЕНЕНИЙ =====
  html += '<div class="form-section"><div class="form-section-title">Предмет изменений</div><div class="form-section-body">';
  html += '<div id="dynamicFieldsContainer"></div>';
  html += '</div></div>';

  // ===== СЕКЦИЯ 3: УСЛОВИЯ ОПЛАТЫ =====
  html += '<div class="form-section"><div class="form-section-title">Условия оплаты</div><div class="form-section-body">';
  html += '<div id="financialContainer"></div>';
  html += '</div></div>';

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreateSupplement(' + parentContractId + ')">Создать</button></div>';

  setModalContent(html);
  _srchInitAll();

  // Render dynamic (subject) + financial fields
  if (contractType) {
    renderDynamicFields(contractType, prefillProps);
    renderFinancialSection(contractType, prefillProps);
  }
}

async function submitCreateSupplement(parentContractId) {
  if (_submitting) return;

  // Валидация: номер ДС больше максимального → дата не должна быть раньше последнего ДС
  var newNumEl = document.getElementById('f_number');
  var newDateEl = document.getElementById('f_contract_date');
  var newNum  = newNumEl  ? parseInt(newNumEl.value)  || 0 : 0;
  var newDate = newDateEl ? newDateEl.value || ''          : '';
  if (newNum && newDate && _currentSuppExisting.length > 0) {
    var maxExistNum = _currentSuppExisting.reduce(function(mx, s) {
      return Math.max(mx, parseInt(((s.properties||{}).number)||'0')||0);
    }, 0);
    var latestByNum = _currentSuppExisting.reduce(function(found, s) {
      var n = parseInt(((s.properties||{}).number)||'0')||0;
      return n > (found ? parseInt(((found.properties||{}).number)||'0')||0 : -1) ? s : found;
    }, null);
    var latestDate = latestByNum ? ((latestByNum.properties||{}).contract_date||'') : '';
    if (newNum > maxExistNum && latestDate && newDate < latestDate) {
      alert('Ошибка даты или номера ДС.\\nДС №' + newNum + ' датировано ' + newDate +
        ', но предыдущее ДС №' + maxExistNum + ' от ' + latestDate +
        '.\\nПроверьте дату или номер ДС.');
      return;
    }
  }

  _submitting = true;
  try {
    await _doSubmitCreateSupplement(parentContractId);
  } catch(err) {
    if (err.status === 409 && err.data && err.data.existing) {
      if (confirm('ДС с таким именем уже существует. Открыть существующее?')) {
        closeModal();
        showEntity(err.data.existing.id);
      }
    } else {
      alert('Ошибка при сохранении: ' + (err.message || err));
    }
  } finally {
    _submitting = false;
  }
}

async function _doSubmitCreateSupplement(parentContractId) {
  const suppType = entityTypes.find(t => t.name === 'supplement');
  const fields = await api('/entity-types/' + suppType.id + '/fields');
  const properties = {};
  fields.forEach(f => { const v = getFieldValue(f); if (v) properties[f.name] = v; });
  collectEntityIds(properties); // резолвит contractor_name ID → имя компании

  if (properties.contract_type) {
    Object.assign(properties, collectDynamicFieldValues(properties.contract_type));
  }
  // Always capture vat_rate if field is visible (e.g. for non-Аренда supplement types)
  var vatEl = document.getElementById('f_vat_rate');
  if (vatEl && vatEl.value) properties.vat_rate = vatEl.value;

  // Collect duration fields from renderDurationSection
  var durType = document.getElementById('f_duration_type');
  var durDate = document.getElementById('f_duration_date');
  var durText = document.getElementById('f_duration_text');
  if (durType && durType.value) properties.duration_type = durType.value;
  if (durDate && durDate.value) properties.duration_date = durDate.value;
  if (durText && durText.value) properties.duration_text = durText.value;

  // Наследуемые поля — не сохраняем в ДС (кроме contractor для отображения)
  delete properties.our_legal_entity;
  delete properties.our_legal_entity_id;
  delete properties.our_role_label;
  delete properties.contractor_role_label;
  // Keep contractor_name/id for display in lists and name generation
  if (!properties.contractor_name) {
    var _parentE = await api('/entities/' + parentContractId);
    var _pp = _parentE.properties || {};
    if (_pp.contractor_name) { properties.contractor_name = _pp.contractor_name; properties.contractor_id = _pp.contractor_id || ''; }
  }

  const num = properties.number || '?';
  const name = 'ДС №' + num + (properties.contractor_name ? ' — ' + properties.contractor_name : '');

  await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: suppType.id, name, properties, parent_id: parentContractId }) });
  closeModal();
  showEntity(parentContractId);
}
`;
