module.exports = `
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

/**
 * Обогащает объект данными из глобальных реестров по ID.
 * Вызывать при сборе данных любой формы перед сохранением.
 * Не перезаписывает уже заполненные поля (пользовательский ввод приоритетнее).
 *
 * Поддерживает: equipment_id → все св-ва оборудования
 *               room_id      → name, area, room_type
 *               building_id  → name
 *               land_plot_part_id → name, area  (обрабатывается первым — приоритет над ЗУ)
 *               land_plot_id → name, area (fallback)
 *
 * @param {Object} obj — любой объект с полями *_id
 * @returns {Object} тот же obj, обогащённый
 */
function _enrichFromRegistry(obj) {
  if (!obj) return obj;

  // ── Оборудование ──────────────────────────────────────────────────────────
  if (obj.equipment_id) {
    var eq = (_equipment || []).find(function(e) { return e.id === parseInt(obj.equipment_id); });
    if (eq) {
      var ep = eq.properties || {};
      if (!obj.equipment_name)     obj.equipment_name     = eq.name               || '';
      if (!obj.inv_number)         obj.inv_number         = ep.inv_number         || '';
      if (!obj.equipment_category) obj.equipment_category = ep.equipment_category || '';
      if (!obj.equipment_kind)     obj.equipment_kind     = ep.equipment_kind     || '';
      if (!obj.status)             obj.status             = ep.status             || '';
      if (!obj.manufacturer)       obj.manufacturer       = ep.manufacturer       || '';
    }
  }

  // ── Помещение ──────────────────────────────────────────────────────────────
  if (obj.room_id) {
    var r = (_rooms || []).find(function(e) { return e.id === parseInt(obj.room_id); });
    if (r) {
      var rp = r.properties || {};
      if (!obj.room)      obj.room      = r.name        || '';
      if (!obj.area      && rp.area)      obj.area      = String(rp.area);
      if (!obj.room_type && rp.room_type) obj.room_type = rp.room_type || '';
    }
  }

  // ── Корпус ────────────────────────────────────────────────────────────────
  if (obj.building_id) {
    var b = (_buildings || []).find(function(e) { return e.id === parseInt(obj.building_id); });
    if (b && !obj.building) obj.building = b.name || '';
  }

  // ── Часть ЗУ (первой — её площадь приоритетнее целого ЗУ) ─────────────────
  if (obj.land_plot_part_id) {
    var lpp = (_landPlotParts || []).find(function(e) { return e.id === parseInt(obj.land_plot_part_id); });
    if (lpp) {
      var lppp = lpp.properties || {};
      if (!obj.land_plot_part_name) obj.land_plot_part_name = lpp.name || '';
      if (!obj.area && lppp.area)   obj.area = String(lppp.area);
    }
  }

  // ── Земельный участок (fallback для area) ─────────────────────────────────
  if (obj.land_plot_id) {
    var lp = (_landPlots || []).find(function(e) { return e.id === parseInt(obj.land_plot_id); });
    if (lp) {
      var lp2p = lp.properties || {};
      if (!obj.land_plot_name) obj.land_plot_name = lp.name || '';
      if (!obj.area && lp2p.area) obj.area = String(lp2p.area);
    }
  }

  return obj;
}

/** Обратная совместимость — оставлена как алиас */
function _resolveEqInvNum(item) {
  return _enrichFromRegistry(item).inv_number || '';
}

`;
