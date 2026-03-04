module.exports = `var _srch1cStore = {};

function renderSearchableSelect(id, entities, selectedId, selectedName, placeholder, fieldName) {
  var selId = parseInt(selectedId) || 0;
  var fn = fieldName || id.replace(/^f_/, '');
  var selName = '';
  if (selId) {
    var found = entities.find(function(e) { return e.id === selId; });
    selName = found ? found.name : (selectedName || '');
  }
  var h = '<div class="srch-wrap" data-srch-id="' + id + '" data-srch-field="' + fn + '">';
  h += '<input type="hidden" id="' + id + '" value="' + (selId || '') + '">';
  h += '<input type="text" class="srch-input" id="' + id + '_text" value="' + escapeHtml(selName) + '" placeholder="' + escapeHtml(placeholder || 'начните вводить...') + '" autocomplete="off">';
  h += '<div class="srch-drop" id="' + id + '_drop" style="display:none"></div>';
  h += '<input class="srch-custom" id="' + id + '_custom" placeholder="Введите название новой" style="display:none" data-field="' + fn + '" onkeydown="onEntityCustomKeydown(event,this)" onblur="onEntityCustomConfirm(this.dataset.field)">';
  h += '</div>';
  return h;
}

// === Searchable select engine (v2 — desktop + iOS Safari) ===
// Close all dropdowns when tapping/clicking outside any .srch-wrap
// Single global handler, never accumulates
(function() {
  if (window._srchGlobalInit) return;
  window._srchGlobalInit = true;

  // Close dropdowns on outside interaction — uses focusin on another element
  // This avoids the race between close and item click
  document.addEventListener('click', function(e) {
    // If the click is inside any srch-wrap, don't close anything
    if (e.target.closest && e.target.closest('.srch-wrap')) return;
    document.querySelectorAll('.srch-drop').forEach(function(d) {
      d.style.display = 'none';
    });
  }); // bubbling phase — item onclick fires first via stopPropagation
})();

function _srchInitAll() {
  document.querySelectorAll('.srch-wrap').forEach(function(wrap) {
    var id = wrap.dataset.srchId;
    var textEl = document.getElementById(id + '_text');
    var hiddenEl = document.getElementById(id);
    var dropEl = document.getElementById(id + '_drop');
    if (!textEl || !hiddenEl || !dropEl) return;
    if (textEl._srchBound) return;
    textEl._srchBound = true;

    // Open dropdown on focus, click (re-tap), and typing
    textEl.addEventListener('focus', function() { _srchFilter(id); });
    textEl.addEventListener('click', function(e) { e.stopPropagation(); _srchFilter(id); });
    textEl.addEventListener('input', function() { hiddenEl.value = ''; _srchFilter(id); });
    textEl.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { dropEl.style.display = 'none'; textEl.blur(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); var first = dropEl.querySelector('.srch-item'); if (first) first.focus(); }
    });
  });
}

function _srchGetList(id) {
  var fn = document.querySelector('[data-srch-id="' + id + '"]').dataset.srchField;
  if (fn === 'our_legal_entity') return _ownCompanies || [];
  if (fn === 'balance_owner') return _ownCompanies || [];
  if (fn === 'equipment_rent') return (_equipment || []).map(function(e) {
    var invNum = (e.properties || {}).inv_number;
    return { id: e.id, name: e.name + (invNum ? ' (инв. ' + invNum + ')' : '') };
  });
  if (fn === 'eq_parent') return (_equipment || []).map(function(e) {
    var invNum = (e.properties || {}).inv_number;
    return { id: e.id, name: e.name + (invNum ? ' (инв. ' + invNum + ')' : '') };
  });
  if (fn === 'rent_room') return (_rooms || []).map(function(r) {
    var bld = _getRoomBuilding(r);
    return { id: r.id, name: r.name + (bld ? ' (' + bld + ')' : '') };
  });
  if (fn === 'rent_land_plot') return (_landPlots || []).map(function(lp) {
    return { id: lp.id, name: _lpLabel(lp) };
  });
  if (fn === 'rent_lp_combined') {
    var items = [];
    (_landPlots || []).forEach(function(lp) {
      items.push({ id: 'lp_' + lp.id, name: _lpLabel(lp) + ' (целиком)' });
      (_landPlotParts || []).filter(function(p) { return p.parent_id === lp.id; }).forEach(function(p) {
        var pArea = (p.properties||{}).area;
        items.push({ id: 'lpp_' + p.id, name: p.name + (pArea ? ' ('+pArea+' м²)' : '') + ' — ' + lp.name });
      });
    });
    return items;
  }
  if (fn === 'act_equipment') return (_equipment || []).map(function(e) {
    var invNum = (e.properties || {}).inv_number;
    return { id: e.id, name: e.name + (invNum ? ' (инв. ' + invNum + ')' : '') };
  });
  if (fn === 'building') return (_buildings || []).map(function(b) { return { id: b.id, name: b.name }; });
  if (fn === 'land_plot') return (_landPlots || []).map(function(lp) {
    return { id: lp.id, name: _lpLabel(lp) };
  });
  return _allCompanies || [];
}

function _srchFilter(id) {
  var textEl = document.getElementById(id + '_text');
  var dropEl = document.getElementById(id + '_drop');
  if (!textEl || !dropEl) return;
  var q = textEl.value.toLowerCase().trim();
  // Don't rebuild if dropdown is already visible with same query (prevents destroying click targets on iOS)
  if (dropEl.style.display !== 'none' && dropEl._lastQ === q) return;
  dropEl._lastQ = q;
  var list = _srchGetList(id);
  var filtered = q ? list.filter(function(e) { return e.name.toLowerCase().indexOf(q) >= 0; }) : list;
  var h = '';
  filtered.slice(0, 50).forEach(function(e) {
    h += '<div class="srch-item" data-srch-pick="' + e.id + '">' + escapeHtml(e.name) + '</div>';
  });
  if (filtered.length > 50) h += '<div class="srch-item" style="color:var(--text-muted);font-size:12px">...</div>';
  var fn = document.querySelector('[data-srch-id="' + id + '"]').dataset.srchField;
  if (fn !== 'equipment_rent' && fn !== 'rent_room' && fn !== 'rent_land_plot' && fn !== 'rent_lp_part' && fn !== 'rent_lp_combined' && fn !== 'act_equipment' && fn !== 'building' && fn !== 'land_plot' && fn !== 'eq_parent') {
    h += '<div class="srch-item srch-new" data-srch-new="1">+ Создать новую...</div>';
  }
  var ONEC_COMPANY_FIELDS = ['contractor_name', 'subtenant_name'];
  if (ONEC_COMPANY_FIELDS.indexOf(fn) >= 0 && filtered.length === 0 && q.length >= 2) {
    h += '<div class="srch-item" data-srch-1c-search="1" data-srch-1c-q="' + escapeHtml(q) + '" style="color:var(--accent);font-style:italic">🔍 Искать в 1С...</div>';
  }
  dropEl.innerHTML = h;
  dropEl.style.display = '';
  // Prevent text input blur when touching dropdown (desktop)
  dropEl.onmousedown = function(ev) { ev.preventDefault(); };
  // Single delegated click handler (works on iOS Safari, Android, desktop)
  dropEl.onclick = function(ev) {
    var item = ev.target.closest ? ev.target.closest('[data-srch-pick],[data-srch-new],[data-srch-1c-search],[data-srch-1c-pick]') : ev.target;
    if (!item) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (item.hasAttribute('data-srch-pick')) {
      var pv = item.getAttribute('data-srch-pick');
      _srchPick(id, /^d+$/.test(pv) ? parseInt(pv) : pv);
    } else if (item.hasAttribute('data-srch-new')) {
      _srchPickNew(id);
    } else if (item.hasAttribute('data-srch-1c-search')) {
      _srch1cSearch(id, item.getAttribute('data-srch-1c-q') || '');
    } else if (item.hasAttribute('data-srch-1c-pick')) {
      _srch1cImport(id, item.getAttribute('data-srch-1c-pick'));
    }
  };
}

function _srchPick(id, entityId) {
  var list = _srchGetList(id);
  var ent = list.find(function(e) { return e.id == entityId; });
  if (!ent) { console.warn('_srchPick: entity not found', id, entityId, typeof entityId, list.slice(0,3).map(function(x){return typeof x.id + ':' + x.id})); return; }
  document.getElementById(id).value = String(entityId);
  document.getElementById(id + '_text').value = ent.name;
  document.getElementById(id + '_drop').style.display = 'none';
  var customEl = document.getElementById(id + '_custom');
  if (customEl) customEl.style.display = 'none';
  // Callbacks for searchable selectors in rent blocks
  var m = id.match(/^eq_rent_sel_(\\d+)$/);
  if (m) onEquipmentRentSelected(parseInt(m[1]));
  var m2 = id.match(/^ro_room_sel_(\\d+)$/);
  if (m2) onRentRoomSelected(parseInt(m2[1]));
  var m3 = id.match(/^ro_lp_combined_(\\d+)$/);
  if (m3) onRoLpCombinedPick(parseInt(m3[1]));
}

function _srchPickNew(id) {
  var wrap = document.querySelector('[data-srch-id="' + id + '"]');
  var fn = wrap.dataset.srchField;
  document.getElementById(id).value = '__new__';
  document.getElementById(id + '_drop').style.display = 'none';

  // Company fields: show full inline form panel
  var COMPANY_FIELDS = ['contractor_name', 'our_legal_entity', 'subtenant_name', 'balance_owner'];
  if (COMPANY_FIELDS.indexOf(fn) >= 0) {
    // Remove existing panel if any
    var oldPanel = document.getElementById(id + '_new_panel');
    if (oldPanel) oldPanel.remove();
    var newPanel = document.createElement('div');
    newPanel.id = id + '_new_panel';
    newPanel.setAttribute('style', 'border:1px dashed var(--border);border-radius:6px;padding:12px;margin-top:6px;background:var(--bg)');
    newPanel.innerHTML =
      '<div style="font-weight:600;font-size:13px;margin-bottom:10px;color:var(--text-secondary)">Новая компания</div>' +
      '<div class="form-group" style="margin-bottom:8px"><label style="font-size:12px">Название *</label>' +
      '<input id="' + id + '_nn" placeholder="Полное наименование" style="width:100%"></div>' +
      '<div class="form-group" style="margin-bottom:8px"><label style="font-size:12px">ИНН</label>' +
      '<input id="' + id + '_ni" placeholder="ИНН" style="width:100%;max-width:200px"></div>' +
      '<div class="form-group" style="margin-bottom:8px"><label style="font-size:12px">Контактное лицо</label>' +
      '<input id="' + id + '_nc" placeholder="ФИО" style="width:100%"></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:10px">' +
      '<div style="flex:1"><label style="font-size:12px;display:block;margin-bottom:2px">Телефон</label>' +
      '<input id="' + id + '_np" placeholder="+7..." style="width:100%"></div>' +
      '<div style="flex:1"><label style="font-size:12px;display:block;margin-bottom:2px">Email</label>' +
      '<input id="' + id + '_ne" placeholder="..." style="width:100%"></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
      '<button type="button" class="btn btn-primary btn-sm" data-srch-confirm-id="' + id + '" data-srch-confirm-fn="' + fn + '" onclick="_srchNewCompanyConfirm(this)">Создать</button>' +
      '<button type="button" class="btn btn-sm" data-srch-cancel-id="' + id + '" onclick="_srchNewCompanyCancel(this)">Отмена</button>' +
      '</div>';
    wrap.after(newPanel);
    var nameInput = document.getElementById(id + '_nn');
    if (nameInput) nameInput.focus();
    return;
  }

  var customEl = document.getElementById(id + '_custom');
  if (customEl) { customEl.style.display = ''; customEl.value = ''; customEl.focus(); }
}

function _srchNewCompanyConfirm(btn) {
  var id = btn.getAttribute('data-srch-confirm-id');
  var fn = btn.getAttribute('data-srch-confirm-fn');
  var name = (document.getElementById(id + '_nn') || {}).value || '';
  name = name.trim();
  if (!name) { alert('Введите название компании'); return; }

  // Fuzzy duplicate check
  var nameL = name.toLowerCase().replace(/[.,s"«»]+/g, ' ').trim();
  var similar = _allCompanies.filter(function(c) {
    var cL = c.name.toLowerCase().replace(/[.,s"«»]+/g, ' ').trim();
    return cL === nameL || cL.indexOf(nameL) >= 0 || nameL.indexOf(cL) >= 0;
  });
  if (similar.length > 0) {
    var names = similar.map(function(c) { return c.name; }).join(', ');
    if (!confirm('Найдены похожие компании: ' + names + '\\n\\nВсё равно создать «' + name + '»?')) return;
  }

  var inn     = ((document.getElementById(id + '_ni') || {}).value || '').trim();
  var contact = ((document.getElementById(id + '_nc') || {}).value || '').trim();
  var phone   = ((document.getElementById(id + '_np') || {}).value || '').trim();
  var email   = ((document.getElementById(id + '_ne') || {}).value || '').trim();

  var typeObj = entityTypes.find(function(t) { return t.name === 'company'; });
  if (!typeObj) return;

  var props = {};
  if (fn === 'our_legal_entity') props.is_own = 'true';
  if (inn)     props.inn            = inn;
  if (contact) props.contact_person = contact;
  if (phone)   props.phone          = phone;
  if (email)   props.email          = email;

  btn.disabled = true;
  api('/entities', {
    method: 'POST',
    body: JSON.stringify({ entity_type_id: typeObj.id, name: name, properties: props })
  }).then(function(newEntity) {
    clearEntityCache();
    _allCompanies.push(newEntity);
    if (props.is_own === 'true') _ownCompanies.push(newEntity);
    // Set the searchable select value
    var hiddenEl = document.getElementById(id);
    if (hiddenEl) hiddenEl.value = newEntity.id;
    var textEl = document.getElementById(id + '_text');
    if (textEl) textEl.value = newEntity.name;
    // Remove panel
    var panel = document.getElementById(id + '_new_panel');
    if (panel) panel.remove();
    _srchFilter(id);
  }).catch(function(err) {
    btn.disabled = false;
    alert('Ошибка: ' + (err.message || String(err)));
  });
}

function _srchNewCompanyCancel(btn) {
  var id = btn.getAttribute('data-srch-cancel-id');
  var panel = document.getElementById(id + '_new_panel');
  if (panel) panel.remove();
  var hiddenEl = document.getElementById(id);
  if (hiddenEl) hiddenEl.value = '';
  var textEl = document.getElementById(id + '_text');
  if (textEl) { textEl.value = ''; textEl.focus(); }
}

function _srch1cSearch(id, q) {
  var dropEl = document.getElementById(id + '_drop');
  if (!dropEl) return;
  dropEl.innerHTML = '<div class="srch-item" style="color:var(--text-muted)">Поиск в 1С...</div>';
  dropEl.style.display = '';
  api('/companies/search?q=' + encodeURIComponent(q)).then(function(data) {
    var h = '';
    if (data.onec && data.onec.length > 0) {
      h += '<div class="srch-item" style="color:var(--text-muted);font-size:11px;padding:4px 10px;background:var(--bg-secondary)">Результаты из 1С:</div>';
      data.onec.forEach(function(c) {
        var key = 'onec_' + Math.random().toString(36).slice(2);
        _srch1cStore[key] = c;
        h += '<div class="srch-item" data-srch-1c-pick="' + key + '" style="color:var(--accent)">' +
          escapeHtml(c.name) + (c.inn ? ' <span style="color:var(--text-muted);font-size:11px">ИНН ' + escapeHtml(c.inn) + '</span>' : '') + '</div>';
      });
    } else {
      h += '<div class="srch-item" style="color:var(--text-muted)">В 1С не найдено</div>';
    }
    h += '<div class="srch-item srch-new" data-srch-new="1">+ Создать новую...</div>';
    dropEl.innerHTML = h;
    dropEl.style.display = '';
  }).catch(function() {
    dropEl.innerHTML = '<div class="srch-item" style="color:var(--red)">Ошибка подключения к 1С</div>';
  });
}

function _srch1cImport(id, key) {
  var c = _srch1cStore[key];
  if (!c) return;
  var dropEl = document.getElementById(id + '_drop');
  if (dropEl) dropEl.innerHTML = '<div class="srch-item" style="color:var(--text-muted)">Добавляем компанию...</div>';
  api('/companies/import-from-1c', { method: 'POST', body: JSON.stringify(c) }).then(function(res) {
    var newComp = { id: res.id, name: res.name };
    if (_allCompanies && !_allCompanies.find(function(x) { return x.id === res.id; })) {
      _allCompanies.push(newComp);
    }
    document.getElementById(id).value = String(res.id);
    var textEl = document.getElementById(id + '_text');
    if (textEl) textEl.value = res.name;
    if (dropEl) dropEl.style.display = 'none';
  }).catch(function() {
    alert('Ошибка при добавлении компании из 1С');
  });
}
`;
