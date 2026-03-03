module.exports = `
async function runLinkedReport(type) {
  var resultsEl = document.getElementById('linkedResults');
  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';
  await loadBrokenEquipment();
  var data = await api('/reports/linked?type=' + type);
  var groups = data.groups || [];

  if (groups.length === 0) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных. Добавьте оборудование и назначьте расположение через "Входит в".</div>';
    return;
  }

  var titles = { equipment_by_location: 'Оборудование по корпусам', equipment_by_tenant: 'Оборудование у арендаторов' };
  var html = '<div class="detail-section"><h3>' + (titles[type] || type) + '</h3>';

  if (type === 'equipment_by_location') {
    groups.forEach(function(g) {
      html += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
      html += '<div style="background:var(--bg-hover);padding:10px 14px;font-weight:600;display:flex;justify-content:space-between">';
      html += '<span style="display:flex;align-items:center;gap:6px">' + entityIcon('building') + ' ' + escapeHtml(g.name) + ' <span style="font-size:11px;color:var(--text-muted);font-weight:400">(' + (g.type || '') + ')</span></span>';
      html += '<span style="font-size:12px;color:var(--text-muted)">' + g.items.length + ' ед.</span></div>';
      html += '<div style="padding:8px 14px">';
      if (g.items.length === 0) {
        html += '<div style="color:var(--text-muted);font-size:13px;padding:4px 0">Оборудование не указано</div>';
      } else {
        g.items.forEach(function(item) {
          var p = item.props || {};
          var isBroken = _brokenEqIds.has(parseInt(item.id));
          var isEmerg = (p.status === 'Аварийное');
          var tags = [];
          if (p.equipment_category) tags.push(p.equipment_category);
          if (p.inv_number) tags.push('инв. ' + p.inv_number);
          if (p.status && p.status !== 'В работе') tags.push(p.status);
          var nameColor = isBroken ? '#dc2626' : (isEmerg ? '#b85c5c' : '');
          html += '<div class="child-card" onclick="showEntity(' + item.id + ')" style="margin-bottom:4px;cursor:pointer;padding:6px 10px;display:flex;align-items:center;gap:8px' + (isBroken ? ';background:rgba(239,68,68,.07)' : (isEmerg ? ';background:rgba(184,92,92,.05)' : '')) + '">';
          html += entityIcon('equipment');
          html += '<span style="font-weight:500;font-size:13px' + (nameColor ? ';color:' + nameColor : '') + '">' + escapeHtml(item.name) + (isBroken ? ' <span class="eq-broken-badge">⚠ Нерабочий</span>' : (isEmerg ? ' <span class="eq-emergency-badge">⚠ Авария</span>' : '')) + '</span>';
          if (tags.length) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + escapeHtml(tags.join(' · ')) + '</span>';
          html += '</div>';
        });
      }
      html += '</div></div>';
    });
  }

  if (type === 'equipment_by_tenant') {
    groups.forEach(function(g) {
      html += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
      html += '<div style="background:var(--bg-hover);padding:10px 14px;font-weight:600;display:flex;justify-content:space-between">';
      html += '<span style="display:flex;align-items:center;gap:6px">' + entityIcon('company') + ' ' + escapeHtml(g.name) + '</span>';
      html += '<span style="font-size:12px;color:var(--text-muted)">' + g.items.length + ' ед. оборудования · ' + (g.contracts || []).length + ' договоров</span></div>';
      html += '<div style="padding:8px 14px">';
      // Show contracts
      if (g.contracts && g.contracts.length > 0) {
        html += '<div style="margin-bottom:8px">';
        g.contracts.forEach(function(c) {
          html += '<div style="font-size:12px;color:var(--text-secondary);padding:2px 0"><a href="#" onclick="showEntity(' + c.id + ');return false" style="color:var(--accent)">' + escapeHtml(c.name) + '</a></div>';
        });
        html += '</div>';
      }
      if (g.items.length === 0) {
        html += '<div style="color:var(--text-muted);font-size:13px;padding:4px 0">Оборудование в арендуемых помещениях не найдено</div>';
      } else {
        g.items.forEach(function(item) {
          var p = item.props || {};
          var isBroken = _brokenEqIds.has(parseInt(item.id));
          var isEmerg = (p.status === 'Аварийное');
          var tags = [];
          if (p.equipment_category) tags.push(p.equipment_category);
          if (item.building_name) tags.push(item.building_name);
          if (p.status && p.status !== 'В работе') tags.push(p.status);
          var nameColor = isBroken ? '#dc2626' : (isEmerg ? '#b85c5c' : '');
          html += '<div class="child-card" onclick="showEntity(' + item.id + ')" style="margin-bottom:4px;cursor:pointer;padding:6px 10px;display:flex;align-items:center;gap:8px' + (isBroken ? ';background:rgba(239,68,68,.07)' : (isEmerg ? ';background:rgba(184,92,92,.05)' : '')) + '">';
          html += entityIcon('equipment');
          html += '<span style="font-weight:500;font-size:13px' + (nameColor ? ';color:' + nameColor : '') + '">' + escapeHtml(item.name) + (isBroken ? ' <span class="eq-broken-badge">⚠ Нерабочий</span>' : (isEmerg ? ' <span class="eq-emergency-badge">⚠ Авария</span>' : '')) + '</span>';
          if (tags.length) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + escapeHtml(tags.join(' · ')) + '</span>';
          html += '</div>';
        });
      }
      html += '</div></div>';
    });
  }

  html += '</div>';
  resultsEl.innerHTML = html;
  renderIcons();
}

// Which entity type owns each groupBy field (fields inside contract props/rent_objects)
var _fieldEntityType = {
  building: 'contract', room: 'contract', object_type: 'contract',
  rent_scope: 'contract', contractor_name: 'contract', our_legal_entity: 'contract',
  contract_type: 'contract', subtenant_name: 'contract', our_role_label: 'contract',
  contractor_role_label: 'contract', tenant: 'contract', number: 'contract',
  contract_date: 'contract',
};

function onGroupByChange() {
  var groupBy = document.getElementById('reportGroupBy').value;
  var filterTypeEl = document.getElementById('reportFilterType');
  if (groupBy && _fieldEntityType[groupBy]) {
    filterTypeEl.value = _fieldEntityType[groupBy];
  }
  runReport();
}

async function runReport() {
  var groupBy = document.getElementById('reportGroupBy').value;
  var filterType = document.getElementById('reportFilterType').value;
  var resultsEl = document.getElementById('reportResults');
  if (!groupBy) { resultsEl.innerHTML = ''; return; }

  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';

  var url = '/reports/pivot?groupBy=' + encodeURIComponent(groupBy);
  if (filterType) url += '&filterType=' + encodeURIComponent(filterType);

  var data = await api(url);
  if (!data.groups || data.groups.length === 0) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных для группировки по этому полю</div>';
    return;
  }

  var label = _reportFieldLabels[groupBy] || groupBy;
  var html = '<div class="detail-section">';
  html += '<h3>' + escapeHtml(label) + ' (' + data.groups.length + ' значений)</h3>';

  data.groups.forEach(function(group) {
    html += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius);overflow:hidden">';
    html += '<div style="background:var(--bg-hover);padding:10px 14px;font-weight:600;display:flex;justify-content:space-between;align-items:center">';
    html += '<span>' + escapeHtml(group.value) + '</span>';
    html += '<span style="font-size:12px;color:var(--text-muted)">' + group.entities.length + ' записей</span>';
    html += '</div>';

    // Group entities by type
    var byType = {};
    group.entities.forEach(function(e) {
      var key = e.type_name;
      if (!byType[key]) byType[key] = { name_ru: e.type_name_ru, icon: e.icon, color: e.color, items: [] };
      byType[key].items.push(e);
    });

    html += '<div style="padding:10px 14px">';
    Object.keys(byType).forEach(function(typeName) {
      var bt = byType[typeName];
      html += '<div style="margin-bottom:8px">';
      html += '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;display:flex;align-items:center;gap:4px">' + entityIcon(typeName) + ' ' + bt.name_ru + ' (' + bt.items.length + ')</div>';
      bt.items.forEach(function(e) {
        html += '<div class="child-card" onclick="showEntity(' + e.id + ')" style="margin-bottom:4px;cursor:pointer;padding:6px 10px">';
        html += entityIcon(typeName);
        html += '<span style="font-weight:500;font-size:13px">' + escapeHtml(e.name) + '</span>';
        // Show key properties
        var props = e.properties || {};
        var tags = [];
        if (props.number) tags.push('№' + props.number);
        if (props.contract_date) tags.push(props.contract_date);
        if (props.contract_type) tags.push(props.contract_type);
        if (tags.length) html += ' <span style="font-size:11px;color:var(--text-muted)">' + tags.join(' · ') + '</span>';
        html += '</div>';
      });
      html += '</div>';
    });
    html += '</div></div>';
  });

  html += '</div>';
  resultsEl.innerHTML = html;
}
`;
