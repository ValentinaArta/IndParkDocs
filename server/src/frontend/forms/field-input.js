/* eslint-disable */
module.exports = `
// === FIELD INPUT — moved from entity-form.js ===

function renderLandPlotSelectorField(selectedId) {
  var lpOptions = '<option value="">— не указано —</option>';
  (_landPlots || []).forEach(function(lp) {
    var label = escapeHtml(_lpLabel(lp));
    var sel = (lp.id === selectedId) ? ' selected' : '';
    lpOptions += '<option value="' + lp.id + '"' + sel + '>' + label + '</option>';
  });
  var h = '<div class="form-group">';
  h += '<label>Находится на земельном участке</label>';
  h += '<div style="display:flex;gap:8px;align-items:center">';
  h += '<select id="f_land_plot_id" style="flex:1">' + lpOptions + '</select>';
  h += '<button type="button" class="btn btn-sm" onclick="quickCreateLandPlot()" style="white-space:nowrap">+ Новый участок</button>';
  h += '</div></div>';
  return h;
}

function renderRoEntitySelect(index, fieldName, entities, selectedId, placeholder) {
  var selId = parseInt(selectedId) || 0;
  var entityType = fieldName.replace('_id', ''); // building_id → building
  var h = '<select class="ro-field" data-idx="' + index + '" data-name="' + fieldName +
    '" onchange="onRoEntityChange(this,' + index + ',&quot;' + entityType + '&quot;)" style="width:100%">';
  h += '<option value="">— ' + (placeholder || 'выберите') + ' —</option>';
  entities.forEach(function(e) {
    var sel = (e.id === selId) ? ' selected' : '';
    h += '<option value="' + e.id + '"' + sel + '>' + escapeHtml(e.name) + '</option>';
  });
  h += '<option value="__new__">+ Создать новый...</option>';
  h += '</select>';
  return h;
}

function onRoEntityChange(sel, index, entityType) {
  if (sel.value !== '__new__') return;
  var name = prompt('Название нового объекта (' + entityType + '):');
  if (!name || !name.trim()) { sel.value = ''; return; }
  var typeObj = entityTypes.find(function(t) { return t.name === entityType; });
  if (!typeObj) { alert('Тип не найден: ' + entityType); sel.value = ''; return; }
  api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: typeObj.id, name: name.trim(), properties: {} }) })
    .then(function(newEnt) {
      var opt = document.createElement('option');
      opt.value = newEnt.id;
      opt.textContent = (typeObj.icon || '') + ' ' + name.trim();
      opt.selected = true;
      sel.insertBefore(opt, sel.querySelector('option[value="__new__"]'));
      clearEntityCache();
      if (entityType === 'building') _buildings.push(newEnt);
      else if (entityType === 'room') _rooms.push(newEnt);
    }).catch(function(e) { alert('Ошибка: ' + e.message); sel.value = ''; });
}

function getUsedValues(fieldName) {
  const vals = new Set();
  _allContractEntities.forEach(function(e) {
    const v = (e.properties || {})[fieldName];
    if (v && v.trim()) vals.add(v.trim());
  });
  return Array.from(vals).sort();
}

function enrichFieldOptions(f) {
  if (f.field_type === 'select_or_custom') {
    const used = getUsedValues(f.name);
    const existing = f.options || [];
    const merged = Array.from(new Set(existing.concat(used))).sort();
    return Object.assign({}, f, { options: merged });
  }
  return f;
}

// Render a select_or_custom dropdown backed by a registry (entities list)
// Stores entity NAME as value (backward compat with string fields like building, tenant)
function renderRegistrySelectField(fieldId, entities, val, placeholder) {
  var inList = entities.find(function(e) { return e.name === val; });
  var isCustom = val && !inList;
  var h = '<div style="display:flex;gap:6px;align-items:center">';
  h += '<select id="' + fieldId + '" onchange="toggleCustomInput(this)" style="flex:1">';
  h += '<option value="">—</option>';
  entities.forEach(function(ent) {
    var name = ent.name || '';
    h += '<option value="' + escapeHtml(name) + '"' + (name === val ? ' selected' : '') + '>' + escapeHtml(name) + '</option>';
  });
  h += '<option value="__custom__"' + (isCustom ? ' selected' : '') + '>Другое...</option>';
  h += '</select>';
  h += '<input id="' + fieldId + '_custom" placeholder="' + escapeHtml(placeholder || 'Введите значение') + '" value="' + (isCustom ? escapeHtml(val) : '') + '" style="flex:1;' + (isCustom ? '' : 'display:none') + '">';
  h += '</div>';
  return h;
}

function renderFieldInput(f, value) {
  const val = value || '';
  const id = 'f_' + f.name;
  if (f.field_type === 'act_items') {
    var actItemsVal = [];
    try { if (typeof val === 'string' && val) actItemsVal = JSON.parse(val); else if (Array.isArray(val)) actItemsVal = val; } catch(e) {}
    return renderActItemsField(actItemsVal);
  } else if (f.field_type === 'equipment_list') {
    var eqItems = [];
    try { if (typeof val === 'string' && val) eqItems = JSON.parse(val); else if (Array.isArray(val)) eqItems = val; } catch(e) {}
    return renderEquipmentListField(eqItems);
  } else if (f.field_type === 'subject_rooms') {
    var srIds = []; try { if (typeof val === 'string' && val) srIds = JSON.parse(val); else if (Array.isArray(val)) srIds = val; } catch(e) {}
    return renderSubjectRoomsField(srIds);
  } else if (f.field_type === 'subject_buildings') {
    var sbIds = []; try { if (typeof val === 'string' && val) sbIds = JSON.parse(val); else if (Array.isArray(val)) sbIds = val; } catch(e) {}
    return renderSubjectBuildingsField(sbIds);
  } else if (f.field_type === 'subject_land_plots') {
    var slIds = []; try { if (typeof val === 'string' && val) slIds = JSON.parse(val); else if (Array.isArray(val)) slIds = val; } catch(e) {}
    return renderSubjectLandPlotsField(slIds);
  } else if (f.field_type === 'subject_land_plot_parts') {
    var slpIds = []; try { if (typeof val === 'string' && val) slpIds = JSON.parse(val); else if (Array.isArray(val)) slpIds = val; } catch(e) {}
    return renderSubjectLandPlotPartsField(slpIds);
  } else if (f.field_type === 'rent_objects') {
    return '';
  } else if (f.field_type === 'multi_comments') {
    return renderCommentsBlock(val);
  } else if (f.field_type === 'advances') {
    var advances = Array.isArray(val) ? val : [];
    return renderAdvancesBlock(advances);
  } else if (f.field_type === 'select_or_custom') {
    const opts = f.options || [];
    const isCustom = val && !opts.includes(val);
    let h = '<div style="display:flex;gap:6px;align-items:center">';
    h += '<select id="' + id + '" onchange="toggleCustomInput(this)" style="flex:1"><option value="">—</option>';
    opts.forEach(function(o) { h += '<option value="' + escapeHtml(o) + '"' + (o === val ? ' selected' : '') + '>' + escapeHtml(o) + '</option>'; });
    h += '<option value="__custom__"' + (isCustom ? ' selected' : '') + '>Другое...</option></select>';
    h += '<input id="' + id + '_custom" placeholder="Введите значение" value="' + (isCustom ? escapeHtml(String(val)) : '') + '" style="flex:1;' + (isCustom ? '' : 'display:none') + '">';
    h += '</div>';
    return h;
  } else if (f.field_type === 'select') {
    const opts = f.options || [];
    let h = '<select id="' + id + '"><option value="">—</option>';
    opts.forEach(function(o) { h += '<option' + (o === val ? ' selected' : '') + '>' + escapeHtml(o) + '</option>'; });
    h += '</select>';
    return h;
  } else if (f.field_type === 'boolean') {
    var checked = (val === 'true' || val === true) ? ' checked' : '';
    return '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="' + id + '"' + checked + '> Да</label>';
  } else if (f.field_type === 'date') {
    return '<input type="date" id="' + id + '" value="' + val + '">';
  } else if (f.field_type === 'number') {
    return '<input type="number" id="' + id + '" value="' + val + '">';
  } else if (f.field_type === 'textarea') {
    return '<textarea id="' + id + '" style="width:100%;resize:both;min-height:72px;box-sizing:border-box">' + escapeHtml(String(val)) + '</textarea>';
  } else if (f.field_type === 'contacts') {
    var contacts = [];
    try { if (typeof val === 'string' && val) contacts = JSON.parse(val); } catch(ex) {}
    if (!Array.isArray(contacts)) contacts = [];
    if (contacts.length === 0) contacts = [{}];
    return _renderContactsList(id, contacts);
  } else if (f.field_type === 'equipment_selector') {
    var eqSelId = parseInt(val) || 0;
    var eqSelList = (_equipment || []).map(function(e) {
      var p = e.properties || {};
      var cat = p.equipment_category || '';
      var inv = p.inv_number || '';
      var suffix = [cat, inv ? 'инв. ' + inv : ''].filter(Boolean).join(', ');
      return { id: e.id, name: e.name + (suffix ? ' (' + suffix + ')' : '') };
    });
    var eqSelFound = (eqSelId && (_equipment || []).find(function(e) { return e.id === eqSelId; })) || null;
    var eqSelName = eqSelFound ? eqSelFound.name : '';
    var h = renderSearchableSelect(id, eqSelList, eqSelId, eqSelName, 'начните вводить название...', 'meter_equipment');
    if (eqSelFound) {
      h += '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px">Текущее: <a href="#" onclick="showEntity(' + eqSelId + ');return false" style="color:var(--accent)">' + escapeHtml(eqSelName) + '</a></div>';
    }
    return h;
  } else {
    return '<input id="' + id + '" value="' + escapeHtml(String(val)) + '">';
  }
}

function toggleCustomInput(sel) {
  const customInput = document.getElementById(sel.id + '_custom');
  if (customInput) customInput.style.display = sel.value === '__custom__' ? '' : 'none';
}

function getFieldValue(f) {
  if (f.field_type === 'act_items') {
    var actItems = getActItemsValue();
    var total = actItems.reduce(function(s, i) { return s + (i.amount || 0); }, 0);
    var totalEl = document.getElementById('f_total_amount');
    if (totalEl) totalEl.value = total;
    return actItems.length > 0 ? JSON.stringify(actItems) : null;
  }
  if (f.field_type === 'equipment_list') {
    var eqItems = getEqListValue();
    return eqItems.length > 0 ? JSON.stringify(eqItems) : null;
  }
  if (f.field_type === 'advances') {
    const adv = collectAdvances();
    return adv.length > 0 ? JSON.stringify(adv) : null;
  }
  if (f.field_type === 'subject_rooms') {
    var srIds = collectSubjectIds('f_subject_rooms');
    return srIds.length > 0 ? JSON.stringify(srIds) : null;
  }
  if (f.field_type === 'subject_buildings') {
    var sbIds = collectSubjectIds('f_subject_buildings');
    return sbIds.length > 0 ? JSON.stringify(sbIds) : null;
  }
  if (f.field_type === 'subject_land_plots') {
    var slIds = collectSubjectIds('f_subject_land_plots');
    return slIds.length > 0 ? JSON.stringify(slIds) : null;
  }
  if (f.field_type === 'subject_land_plot_parts') {
    var slpIds = collectSubjectIds('f_subject_land_plot_parts');
    return slpIds.length > 0 ? JSON.stringify(slpIds) : null;
  }
  if (f.field_type === 'rent_objects') {
    var objs = collectAllRentObjects();
    return objs.length > 0 ? JSON.stringify(objs) : null;
  }
  if (f.field_type === 'multi_comments') {
    var cmts = collectComments();
    return cmts.length > 0 ? JSON.stringify(cmts) : null;
  }
  if (f.field_type === 'contacts') {
    var cts = _collectContacts('f_' + f.name);
    return cts.length > 0 ? JSON.stringify(cts) : null;
  }
  if (f.field_type === 'equipment_selector') {
    var eqEl = document.getElementById('f_' + f.name);
    return (eqEl && eqEl.value) ? eqEl.value : null;
  }
  if (f.field_type === 'checkbox' || f.field_type === 'boolean') {
    const cb = document.getElementById('f_' + f.name);
    return cb ? String(cb.checked) : 'false';
  }
  const el = document.getElementById('f_' + f.name);
  if (!el) return null;
  if (f.field_type === 'select_or_custom') {
    if (el.value === '__custom__') {
      const customEl = document.getElementById('f_' + f.name + '_custom');
      return customEl ? customEl.value || null : null;
    }
    return el.value || null;
  }
  return el.value || null;
}

function renderDynamicFields(contractType, props) {
  const container = document.getElementById('dynamicFieldsContainer');
  if (!container) return;
  const extraFields = CONTRACT_TYPE_FIELDS[contractType] || [];
  var hasFinancial = !!document.getElementById('financialContainer');

  if (extraFields.length === 0) {
    if (hasFinancial) {
      // Неизвестный/нестандартный тип договора — показываем базовые поля + 5 кнопок
      var _ciItems = [];
      var _ciRaw = (props || {}).contract_items;
      if (Array.isArray(_ciRaw)) _ciItems = _ciRaw;
      else { try { if (_ciRaw) _ciItems = JSON.parse(_ciRaw); } catch(e) {} }
      container.innerHTML =
        '<div class="form-group"><label>Предмет договора</label><input type="text" id="f_subject" value="' + escapeHtml((props || {}).subject || '') + '" placeholder="Описание"></div>' +
        '<div class="form-group"><label>Позиции</label>' + renderContractItemsField(_ciItems, false) + '</div>' +
        renderSubjectFieldsBlock(props);
    } else if (_contractFormTypeName !== 'supplement') {
      container.innerHTML = renderDurationSection(props || {});
    }
    return;
  }

  if (contractType === 'Аренды' || contractType === 'Субаренды') {
    if (hasFinancial) renderRentSubjectOnly(container, extraFields, props);
    else renderRentFields(container, extraFields, props);
    _srchInitAll();
    return;
  }

  if (contractType === 'Аренда оборудования') {
    if (hasFinancial) renderEqRentSubjectOnly(container, extraFields, props || {});
    else renderEquipmentRentFields(container, extraFields, props || {});
    _srchInitAll();
    return;
  }

  if (contractType === 'Купли-продажи' || contractType === 'Эксплуатации' || contractType === 'ТО и ППР') {
    if (hasFinancial) renderSaleSubjectOnly(container, extraFields, props || {}, contractType);
    else renderSaleContractFields(container, extraFields, props || {}, contractType);
    _srchInitAll();
    return;
  }

  // Услуг — button-based subject only when financial container exists (create/supplement form)
  if (contractType === 'Услуг' && hasFinancial) {
    renderSaleSubjectOnly(container, extraFields, props || {}, 'Услуг');
    _srchInitAll();
    return;
  }

  // Обслуживания — button-based subject only when financial container exists
  if (contractType === 'Обслуживания' && hasFinancial) {
    renderServiceSubjectOnly(container, extraFields, props || {});
    _srchInitAll();
    return;
  }

  // Подряда — button-based subject only when financial container exists
  if (contractType === 'Подряда' && hasFinancial) {
    renderContractSubjectOnly(container, extraFields, props || {});
    _srchInitAll();
    return;
  }

  var _financialNames = ['contract_amount', 'vat_rate', 'completion_deadline', 'rent_monthly'];
  let html = '';
  extraFields.forEach(function(f) {
    if (hasFinancial && _financialNames.indexOf(f.name) >= 0) return;
    const val = props ? (props[f.name] || '') : '';
    if (f.name === 'building') {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderRegistrySelectField('f_building', _buildings, val, 'Введите название корпуса') + '</div>';
    } else if (f.name === 'tenant') {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderRegistrySelectField('f_tenant', _allCompanies, val, 'Введите название арендатора') + '</div>';
    } else if (f.field_type === 'contract_items' || f.field_type === 'contract_items_sale') {
      var isSale = (f.field_type === 'contract_items_sale');
      var items = [];
      try { items = JSON.parse(val || '[]'); } catch(ex) {}
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderContractItemsField(items, isSale) + '</div>';
    } else if (f.name === 'contract_amount' && f._readonly) {
      if (!hasFinancial) {
        html += '<div class="form-group"><label>' + (f.name_ru || f.name) + ' (авто)</label><input type="number" id="f_contract_amount" value="' + escapeHtml(String(val)) + '" readonly style="background:var(--bg-secondary);font-weight:600;color:var(--accent)"></div>';
      }
    } else {
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>' + renderFieldInput(f, val) + '</div>';
    }
  });
  if (!hasFinancial && _contractFormTypeName !== 'supplement') html += renderDurationSection(props || {});
  container.innerHTML = html;
}

// ─── "5 кнопок" — универсальный блок объектов ────────────────────────────────
var SUBJECT_FIELDS = [
  { name: 'subject_buildings',       name_ru: 'Корпуса',             field_type: 'subject_buildings' },
  { name: 'subject_rooms',           name_ru: 'Помещения',           field_type: 'subject_rooms' },
  { name: 'subject_land_plots',      name_ru: 'Земельные участки',   field_type: 'subject_land_plots' },
  { name: 'subject_land_plot_parts', name_ru: 'Части ЗУ',            field_type: 'subject_land_plot_parts' },
  { name: 'equipment_list',          name_ru: 'Оборудование',        field_type: 'equipment_list' },
];

/**
 * Рендерит блок "5 кнопок" для вставки в любую форму.
 * Использует тот же toggle-паттерн что renderContractSubjectOnly (_saleSectionBtn).
 * @param {Object} props — текущие свойства сущности (для предзаполнения)
 * @returns {string} HTML
 */
function renderSubjectFieldsBlock(props) {
  props = props || {};
  function _pArr(v) { if (!v) return []; if (Array.isArray(v)) return v; try { return JSON.parse(v) || []; } catch(e) { return []; } }
  function _has(arr) { return Array.isArray(arr) && arr.some(function(i) { return i && (i.name || i.id || i.equipment_id); }); }

  var sbIds  = _pArr(props.subject_buildings);
  var srIds  = _pArr(props.subject_rooms);
  var slIds  = _pArr(props.subject_land_plots);
  var slpIds = _pArr(props.subject_land_plot_parts);
  var eqList = _pArr(props.equipment_list);

  var hasBld = _has(sbIds), hasRoom = _has(srIds);
  var hasLp  = _has(slIds), hasLpp  = _has(slpIds);
  var hasEq  = _has(eqList);

  var h = '<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px">';
  h += '<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:10px">Связанные объекты</div>';

  // Ряд кнопок-переключателей
  h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">';
  h += _saleSectionBtn('bld',  'Корпус',       hasBld);
  h += _saleSectionBtn('room', 'Помещение',    hasRoom);
  h += _saleSectionBtn('lp',   'ЗУ',           hasLp);
  h += _saleSectionBtn('lpp',  'Часть ЗУ',     hasLpp);
  h += _saleSectionBtn('eq',   'Оборудование', hasEq);
  h += '</div>';

  // Раскрывающиеся секции (скрыты по умолчанию если пустые)
  h += '<div id="sale_sec_bld"  style="margin-bottom:12px;' + (hasBld  ? '' : 'display:none') + '"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Корпуса</div>'          + renderSubjectBuildingsField(sbIds)     + '</div>';
  h += '<div id="sale_sec_room" style="margin-bottom:12px;' + (hasRoom ? '' : 'display:none') + '"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Помещения</div>'         + renderSubjectRoomsField(srIds)         + '</div>';
  h += '<div id="sale_sec_lp"   style="margin-bottom:12px;' + (hasLp   ? '' : 'display:none') + '"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Земельные участки</div>' + renderSubjectLandPlotsField(slIds)     + '</div>';
  h += '<div id="sale_sec_lpp"  style="margin-bottom:12px;' + (hasLpp  ? '' : 'display:none') + '"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Части ЗУ</div>'         + renderSubjectLandPlotPartsField(slpIds)+ '</div>';
  h += '<div id="sale_sec_eq"   style="margin-bottom:12px;' + (hasEq   ? '' : 'display:none') + '"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Оборудование</div>'     + renderEquipmentListField(eqList)       + '</div>';

  h += '</div>';
  return h;
}

/**
 * Собирает значения блока "5 кнопок" из DOM в объект.
 * @returns {Object} — только непустые поля
 */
function collectSubjectFieldValues() {
  var result = {};
  SUBJECT_FIELDS.forEach(function(f) {
    var val = getFieldValue(f);
    if (val !== null && val !== undefined) result[f.name] = val;
  });
  return result;
}
`;
