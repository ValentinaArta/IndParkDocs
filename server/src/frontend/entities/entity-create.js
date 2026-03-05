module.exports = `
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
    h += '<option value="' + lp.id + '"' + (lp.id === lpid ? ' selected' : '') + '>' + escapeHtml(_lpLabel(lp)) + '</option>';
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
  // Для Частей ЗУ: ЗУ могут не войти в дефолтный лимит 50 — подгружаем отдельно
  const _lpForCreate = (typeName === 'land_plot_part') ? await api('/entities?type=land_plot&limit=200') : [];
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
      html += renderEqParentField(null);
    } else if (typeName === 'land_plot_part') {
      // Только ЗУ как варианты родителя
      html += '<div class="form-group"><label>Земельный участок <span style="color:var(--danger)">*</span></label><select id="f_parent" onchange="onLpPartParentChange(this)"><option value="">— выберите ЗУ —</option>';
      (_lpForCreate.length ? _lpForCreate : allEntities.filter(function(x) { return x.type_name === 'land_plot'; })).forEach(function(x) {
        var sel = (preParentId && parseInt(preParentId) === x.id) ? ' selected' : '';
        html += '<option value="' + x.id + '"' + sel + '>' + escapeHtml(_lpLabel(x)) + '</option>';
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
    } else if (f.name === 'connected_to_id') {
      var ctCreateList = (_equipment || []).map(function(eq) {
        var p = eq.properties || {};
        var suffix = [p.equipment_category, p.inv_number ? 'инв. ' + p.inv_number : ''].filter(Boolean).join(', ');
        return { id: eq.id, name: eq.name + (suffix ? ' (' + suffix + ')' : '') };
      });
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>';
      html += renderSearchableSelect('f_connected_to_id', ctCreateList, 0, '', 'начните вводить название оборудования...', 'meter_equipment');
      html += '</div>';
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

  // Collect parent_equipment_id (hierarchy field for equipment)
  if (typeName === 'equipment') {
    var eqParentEl = document.getElementById('f_eq_parent');
    if (eqParentEl && eqParentEl.value) {
      properties.parent_equipment_id = eqParentEl.value;
    }
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
  } else if (currentView === 'meters') {
    reloadMeters();
  } else {
    showEntityList(typeName);
  }
}

`;
