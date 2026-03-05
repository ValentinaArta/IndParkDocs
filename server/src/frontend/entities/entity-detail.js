module.exports = `
async function showEntity(id, _forceDetail) {
  currentView = 'detail';
  currentEntityId = id;
  _setNavHash(_forceDetail ? 'detail/' + id : 'entity/' + id);
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
  var _eStatusBadge = _eProps.doc_status ? ' ' + _docStatusBadge(_eProps.doc_status) : '';
  bcParts.push(escapeHtml(e.name) + _eEmergencyBadge + _eStatusBadge);
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
      contentEl.innerHTML = '<div style="max-width:860px;padding:8px 0">' + renderContractCard(cardData) + renderFilesSection(id) + '</div>';
      loadEntityFiles(id);
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
    suppContentEl.innerHTML = '<div style="max-width:860px;padding:8px 0">' + renderSupplementCard(e) + renderFilesSection(id) + '</div>';
    loadEntityFiles(id);
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
      if (f.field_type === 'number') {
        var numVal = val !== null && val !== undefined && val !== '' ? parseFloat(val) : null;
        var numDisplay = numVal !== null && !isNaN(numVal) ? _fmtNum(numVal) : '—';
        html += '<div class="prop-item"><div class="prop-label">' + escapeHtml(label) + '</div>' +
          '<div class="prop-value">' + numDisplay + '</div></div>';
        return;
      }
      if (f.field_type === 'equipment_selector') {
        var eqId = parseInt(val) || 0;
        var eqEnt = eqId ? (_equipment || []).find(function(eq) { return eq.id === eqId; }) : null;
        html += '<div class="prop-item"><div class="prop-label">' + escapeHtml(label) + '</div><div class="prop-value">';
        if (eqEnt) {
          html += '<a href="#" onclick="showEntity(' + eqId + ');return false" style="color:var(--accent)">' + escapeHtml(eqEnt.name) + '</a>';
        } else if (eqId) {
          html += '<span style="color:var(--text-muted)">ID: ' + eqId + '</span>';
        } else {
          html += '—';
        }
        html += '</div></div>';
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
          '<div><div style="font-weight:500;font-size:13px">' + escapeHtml(s.name) +
          (sp.doc_status ? ' ' + _docStatusBadge(sp.doc_status) : '') + '</div>' +
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

  // Equipment composition hierarchy
  if (e.type_name === 'equipment') {
    var eqProps = e.properties || {};
    var parentEqId = parseInt(eqProps.parent_equipment_id) || 0;
    if (parentEqId) {
      var parentEq = (_equipment || []).find(function(eq) { return eq.id === parentEqId; });
      html += '<div class="detail-section"><h3>🔗 Входит в</h3>';
      if (parentEq) {
        html += '<a href="#" onclick="showEntity(' + parentEqId + ');return false" style="color:var(--accent);font-weight:500">' + escapeHtml(parentEq.name) + '</a>';
      } else {
        html += '<span style="color:var(--text-muted)">ID: ' + parentEqId + '</span>';
      }
      html += '</div>';
    }
    // Children — equipment that has parent_equipment_id = this.id
    var childEqs = (_equipment || []).filter(function(eq) {
      return parseInt((eq.properties || {}).parent_equipment_id) === e.id;
    });
    if (childEqs.length > 0) {
      html += '<div class="detail-section"><h3>⚙ Состав (' + childEqs.length + ')</h3><div class="children-grid">';
      childEqs.forEach(function(c) {
        var cProps = c.properties || {};
        var cIsBroken = _brokenEqIds && _brokenEqIds.has(c.id);
        var cBadge = cIsBroken ? ' <span class="eq-broken-badge">⚠</span>' : '';
        html += '<div class="child-card" onclick="showEntity(' + c.id + ')">' +
          entityIcon('equipment', 18) +
          '<div><div style="font-weight:500;font-size:13px">' + escapeHtml(c.name) + cBadge + '</div>' +
          '<div style="font-size:11px;color:var(--text-muted)">' + escapeHtml(cProps.equipment_category || '') + '</div></div></div>';
      });
      html += '</div></div>';
    }
    // Tree view button
    html += '<div class="detail-section" style="padding:8px 0">';
    html += '<button class="btn btn-sm" onclick="showEquipmentTree(' + e.id + ')" style="font-size:12px;display:inline-flex;align-items:center;gap:6px">';
    html += '<svg viewBox="0 0 18 18" width="14" height="14" fill="none"><circle cx="9" cy="2.5" r="2" stroke="currentColor" stroke-width="1.4"/><line x1="9" y1="4.5" x2="9" y2="7.5" stroke="currentColor" stroke-width="1.4"/><line x1="9" y1="7.5" x2="4" y2="10" stroke="currentColor" stroke-width="1.4"/><line x1="9" y1="7.5" x2="14" y2="10" stroke="currentColor" stroke-width="1.4"/><circle cx="4" cy="12" r="2" stroke="currentColor" stroke-width="1.4"/><circle cx="14" cy="12" r="2" stroke="currentColor" stroke-width="1.4"/></svg>';
    html += '🌳 Дерево вложенности</button></div>';
  }

  // Work history section for equipment — acts containing this equipment in act_items
  if (e.type_name === 'equipment') {
    var workHistory = [];
    try { workHistory = await api('/entities/' + e.id + '/work-history'); } catch(ex) {}
    html += '<div class="detail-section"><h3>🔨 История работ</h3>';
    if (workHistory && workHistory.length > 0) {
      html += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      html += '<thead><tr style="border-bottom:2px solid var(--border)">' +
        '<th style="text-align:left;padding:6px">Дата</th>' +
        '<th style="text-align:left;padding:6px">Акт / Договор</th>' +
        '<th style="text-align:right;padding:6px">Сумма</th>' +
        '<th style="text-align:left;padding:6px;min-width:160px">Выполненные работы</th>' +
        '</tr></thead><tbody>';
      workHistory.forEach(function(w) {
        var dateStr = w.act_date || '—';
        if (dateStr && dateStr.length === 10) {
          var pts = dateStr.split('-'); dateStr = pts[2] + '.' + pts[1] + '.' + pts[0];
        }
        var statusBadge = w.doc_status ? ' ' + _docStatusBadge(w.doc_status) : '';
        var amt = parseFloat(w.item_amount) || 0;
        var brokenBadge = w.item_broken ? ' <span style="background:#fee2e2;color:#dc2626;font-size:10px;font-weight:600;padding:1px 5px;border-radius:4px">Нерабочий</span>' : '';
        html += '<tr style="border-bottom:1px solid var(--border);cursor:pointer;vertical-align:top" onclick="showEntity(' + w.id + ')">';
        html += '<td style="padding:6px;white-space:nowrap;color:var(--text-muted)">' + dateStr + '</td>';
        html += '<td style="padding:6px"><span style="font-weight:500">' + escapeHtml('Акт №' + (w.act_number || w.id)) + '</span>' + statusBadge + brokenBadge;
        if (w.contract_name) html += '<br><span style="font-size:11px;color:var(--text-muted)">→ ' + escapeHtml(w.contract_name) + '</span>';
        html += '</td>';
        html += '<td style="text-align:right;padding:6px;font-weight:500;white-space:nowrap">' + (amt > 0 ? _fmtNum(amt) + '\u00a0₽' : '—') + '</td>';
        html += '<td style="padding:6px;font-size:12px;color:var(--text-secondary);max-width:300px;word-break:break-word">' + escapeHtml(w.item_description || '—') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
      var totalAmt = workHistory.reduce(function(s, w) { return s + (parseFloat(w.item_amount) || 0); }, 0);
      if (totalAmt > 0) html += '<div style="text-align:right;font-size:12px;color:var(--text-muted);margin-top:4px">Всего работ: ' + workHistory.length + ' · Сумма: ' + _fmtNum(totalAmt) + '\u00a0₽</div>';
      else html += '<div style="text-align:right;font-size:12px;color:var(--text-muted);margin-top:4px">Всего работ: ' + workHistory.length + '</div>';
    } else {
      html += '<div style="color:var(--text-muted);font-size:13px">Работы не зафиксированы</div>';
    }
    html += '</div>';
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

  if (_isContract || _isSupp) html += renderFilesSection(id);
  document.getElementById('content').innerHTML = html;
  renderIcons();
  if (_isContract || _isSupp) loadEntityFiles(id);
}

// ============ REPORTS ============
// report functions (aggregate, pivot, linked-report) moved to reports/ in Phase 4

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

// ============ EQUIPMENT HIERARCHY TREE ============
function showEquipmentTree(entityId) {
  var allEq = _equipment || [];

  // Find root: walk up parent chain
  function findRoot(id) {
    var eq = allEq.find(function(e) { return e.id === id; });
    if (!eq) return id;
    var pid = parseInt((eq.properties || {}).parent_equipment_id) || 0;
    return pid ? findRoot(pid) : id;
  }

  // Build recursive tree HTML
  function buildTreeHtml(id, depth, currentId) {
    var eq = allEq.find(function(e) { return e.id === id; });
    if (!eq) return '';
    var isCurrent = (id === currentId);
    var children = allEq.filter(function(e) {
      return parseInt((e.properties || {}).parent_equipment_id) === id;
    });
    var p = eq.properties || {};
    var info = [p.equipment_category, p.equipment_kind].filter(Boolean).join(' / ');
    var indent = depth * 20;

    var h = '<div style="padding:6px 10px 6px ' + (10 + indent) + 'px;border-bottom:1px solid var(--border);cursor:pointer;' +
      (isCurrent ? 'background:#eff6ff;border-left:3px solid #3b82f6;font-weight:600' : 'border-left:3px solid transparent') +
      '" onclick="showEntity(' + id + ')">';
    // Tree connector
    if (depth > 0) {
      h += '<span style="color:var(--text-muted);margin-right:6px">' + (children.length ? '▾' : '·') + '</span>';
    }
    h += '<span style="color:' + (isCurrent ? '#1d4ed8' : 'var(--accent)') + '">' + escapeHtml(eq.name) + '</span>';
    if (info) h += ' <span style="font-size:11px;color:var(--text-muted)">— ' + escapeHtml(info) + '</span>';
    h += '</div>';

    children.forEach(function(c) {
      h += buildTreeHtml(c.id, depth + 1, currentId);
    });
    return h;
  }

  var rootId = findRoot(entityId);
  var treeHtml = buildTreeHtml(rootId, 0, entityId);

  var overlay = document.createElement('div');
  overlay.id = 'eqTreeOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px';

  var modal = '<div style="background:var(--bg-card);border-radius:12px;width:100%;max-width:560px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.2)">';
  modal += '<div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">';
  modal += '<h3 style="margin:0;font-size:16px">🌳 Дерево вложенности</h3>';
  modal += '<button onclick="document.getElementById(\\'eqTreeOverlay\\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-muted)">×</button>';
  modal += '</div>';
  modal += '<div style="overflow-y:auto;flex:1">' + treeHtml + '</div>';
  modal += '<div style="padding:10px 16px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)">';
  modal += '<span style="background:#eff6ff;padding:2px 8px;border-radius:4px;border-left:3px solid #3b82f6">Текущий объект</span> &nbsp; Нажмите на строку для открытия</div>';
  modal += '</div>';

  overlay.innerHTML = modal;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(ev) { if (ev.target === overlay) overlay.remove(); });
}

`;
