module.exports = `
async function openEditModal(id) {
  showLoadingModal();
  clearEntityCache();
  const e = await api('/entities/' + id);
  // Акты — специальная форма
  if (e.type_name === 'act') { await openEditActModal(id, e); return; }
  const fields = e.fields || [];
  const allEntities = await api('/entities');
  // Для Частей ЗУ: ЗУ могут не войти в дефолтный лимит 50 — подгружаем отдельно
  const _lpForEdit = (e.type_name === 'land_plot_part') ? await api('/entities?type=land_plot&limit=200') : [];
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
  var isBuildingLike = (e.type_name === 'building');

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
      html += renderEqParentField((e.properties || {}).parent_equipment_id || null);
    } else if (e.type_name === 'land_plot_part') {
      html += '<div class="form-group"><label>Земельный участок <span style="color:var(--danger)">*</span></label><select id="f_parent" onchange="onLpPartParentChange(this)"><option value="">— выберите ЗУ —</option>';
      (_lpForEdit.length ? _lpForEdit : allEntities.filter(function(x) { return x.type_name === 'land_plot'; })).forEach(function(x) {
        html += '<option value="' + x.id + '"' + (x.id === e.parent_id ? ' selected' : '') + '>' + escapeHtml(_lpLabel(x)) + '</option>';
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
    } else if (f.name === 'connected_to_id') {
      var ctSelId = parseInt(props.connected_to_id) || 0;
      var ctSelEq = ctSelId ? (_equipment || []).find(function(eq) { return eq.id === ctSelId; }) : null;
      var ctSelName = ctSelEq ? ctSelEq.name : '';
      var ctList = (_equipment || []).map(function(eq) {
        var p = eq.properties || {};
        var suffix = [p.equipment_category, p.inv_number ? 'инв. ' + p.inv_number : ''].filter(Boolean).join(', ');
        return { id: eq.id, name: eq.name + (suffix ? ' (' + suffix + ')' : '') };
      });
      html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label>';
      html += renderSearchableSelect('f_connected_to_id', ctList, ctSelId, ctSelName, 'начните вводить название оборудования...', 'meter_equipment');
      if (ctSelEq) html += '<div style="font-size:12px;color:var(--text-secondary);margin-top:4px">Текущее: <a href="#" onclick="showEntity(' + ctSelId + ');return false" style="color:var(--accent)">' + escapeHtml(ctSelName) + '</a></div>';
      html += '</div>';
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
    var eqParentEditEl = document.getElementById('f_eq_parent');
    if (eqParentEditEl) {
      properties.parent_equipment_id = eqParentEditEl.value || null;
    }
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

  // Handle located_on relation for building
  if (e.type_name === 'building') {
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


`;
