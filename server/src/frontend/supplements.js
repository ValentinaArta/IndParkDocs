module.exports = `// ============ SUPPLEMENTS ============

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
  var maxSuppNum = existingSupps.reduce(function(mx, s) {
    var n = parseInt(((s.properties||{}).number)||'0')||0; return n > mx ? n : mx;
  }, 0);
  var autoSuppNum = String(maxSuppNum + 1);

  // Найти последнее ДС по contract_date — для предзаполнения полей
  var SUPP_PARENT_FIELDS = new Set(['number', 'contract_date', 'changes_description',
    'our_legal_entity', 'our_legal_entity_id', 'contractor_name', 'contractor_id',
    'subtenant_name', 'subtenant_id', 'our_role_label', 'contractor_role_label', 'contract_type']);
  var lastSuppProps = {};
  if (existingSupps.length > 0) {
    var sortedSupps = existingSupps.slice().sort(function(a, b) {
      var da = ((a.properties||{}).contract_date)||'';
      var db = ((b.properties||{}).contract_date)||'';
      return db.localeCompare(da) || b.id - a.id;
    });
    lastSuppProps = sortedSupps[0].properties || {};
  }

  // Вспомогательная функция: берём из последнего ДС, если поле заполнено и не "родительское"
  function _suppPrefill(fieldName) {
    if (SUPP_PARENT_FIELDS.has(fieldName)) return parentProps[fieldName] || '';
    return lastSuppProps[fieldName] || parentProps[fieldName] || '';
  }

  var html = '<h3>Новое доп. соглашение</h3>';
  html += '<input type="hidden" id="f_name" value="">';
  html += '<input type="hidden" id="f_parent" value="' + parentContractId + '">';

  // Use the same contract form with role labels
  var contractType = parentProps.contract_type || '';
  var roles = CONTRACT_ROLES[contractType] || { our: 'Наше юр. лицо', contractor: 'Контрагент' };

  fields.forEach(function(f) {
    var val = _suppPrefill(f.name);
    var ef = f;

    if (f.name === 'number') {
      // Auto-number: next ДС number for this contract
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, autoSuppNum) + '</div>';
    } else if (f.name === 'contract_type') {
      // ДС наследует тип от родительского договора — не редактируется
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>';
      html += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(val) + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется от договора)</span></div>';
      html += '<input type="hidden" id="f_contract_type" value="' + escapeHtml(val) + '"></div>';
    } else if (f.name === 'our_role_label') {
      html += '<div class="form-group"><label>Роль нашей стороны</label>';
      html += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(val || roles.our) + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется от договора)</span></div></div>';
    } else if (f.name === 'contractor_role_label') {
      html += '<div class="form-group"><label>Роль контрагента</label>';
      html += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(val || roles.contractor) + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется от договора)</span></div></div>';
    } else if (f.name === 'our_legal_entity') {
      var labelOur = (parentProps.our_role_label || roles.our);
      html += '<div class="form-group"><label>' + escapeHtml(labelOur) + '</label>';
      html += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(val || '—') + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется от договора)</span></div></div>';
    } else if (f.name === 'contractor_name') {
      var labelContr = (parentProps.contractor_role_label || roles.contractor);
      html += '<div class="form-group"><label>' + escapeHtml(labelContr) + '</label>';
      html += '<div style="padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text-secondary);font-size:14px">' + escapeHtml(val || '—') + ' <span style="font-size:11px;color:var(--text-muted)">(наследуется от договора)</span></div></div>';
    } else if (f.name === 'subtenant_name') {
      var show = (contractType === 'Субаренды');
      html += '<div class="form-group" id="wrap_subtenant_name" style="' + (show ? '' : 'display:none') + '"><label>Субарендатор</label>' +
        renderSearchableSelect('f_subtenant_name', _allCompanies, parentProps.subtenant_id, val, 'начните вводить...', 'subtenant_name') + '</div>';
    } else if (f.name === 'duration_type' || f.name === 'duration_date' || f.name === 'duration_text' || f.name === 'contract_end_date' || f.name === 'vat_rate') {
      // пропускаем — duration рендерится через renderDurationSection; vat_rate — ниже или через renderDynamicFields
    } else {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(ef, val) + '</div>';
    }
  });

  // НДС (%) — show for all supplement types (Аренда/Субаренда get it via renderDynamicFields)
  if (contractType !== 'Аренды' && contractType !== 'Субаренды' && contractType !== 'Аренда оборудования') {
    var vatVal = _suppPrefill('vat_rate') || '22';
    html += '<div class="form-group"><label>НДС (%)</label>' +
      '<input type="number" id="f_vat_rate" value="' + escapeHtml(vatVal) + '" style="width:80px" min="0" max="100"></div>';
  }

  html += '<div id="dynamicFieldsContainer"></div>';
  html += renderDurationSection(Object.assign({}, parentProps, lastSuppProps));
  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreateSupplement(' + parentContractId + ')">Создать</button></div>';

  setModalContent(html);
  _srchInitAll();

  var ctEl = document.getElementById('f_contract_type');
  if (ctEl) {
    ctEl.addEventListener('change', function() { onContractTypeChange(); });
    var ctCustom = document.getElementById('f_contract_type_custom');
    if (ctCustom) ctCustom.addEventListener('input', function() { onContractTypeChange(); });
  }
  // Предзаполнение динамических полей: из последнего ДС (не родительские), иначе из договора
  var prefillProps = Object.assign({}, parentProps);
  Object.keys(lastSuppProps).forEach(function(k) {
    if (!SUPP_PARENT_FIELDS.has(k) && lastSuppProps[k]) prefillProps[k] = lastSuppProps[k];
  });
  if (contractType) renderDynamicFields(contractType, prefillProps);
}

async function submitCreateSupplement(parentContractId) {
  if (_submitting) return;
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

  // Наследуемые поля — не сохраняем в ДС, они берутся из родительского договора
  delete properties.our_legal_entity;
  delete properties.our_legal_entity_id;
  delete properties.contractor_name;
  delete properties.contractor_id;
  delete properties.our_role_label;
  delete properties.contractor_role_label;

  const num = properties.number || '?';
  const parentContractorName = (await api('/entities/' + parentContractId)).properties.contractor_name || '';
  const name = 'ДС №' + num + (parentContractorName ? ' — ' + parentContractorName : '');

  await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: suppType.id, name, properties, parent_id: parentContractId }) });
  closeModal();
  showEntity(parentContractId);
}
`;
