module.exports = `
async function buildWorkHistoryReport() {
  var resultsEl = document.getElementById('whResults');
  resultsEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Загрузка...</div>';

  var category = (document.getElementById('whCategory') || {}).value || '';
  var buildingId = (document.getElementById('whBuilding') || {}).value || '';
  var dateFrom = (document.getElementById('whDateFrom') || {}).value || '';
  var dateTo = (document.getElementById('whDateTo') || {}).value || '';

  var params = new URLSearchParams();
  if (category) params.set('category', category);
  if (buildingId) params.set('building_id', buildingId);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);

  try {
    var rows = await api('/reports/work-history?' + params.toString());
    resultsEl.innerHTML = renderWorkHistoryTable(rows);
  } catch(err) {
    resultsEl.innerHTML = '<div style="color:red;padding:16px">Ошибка: ' + escapeHtml(err.message || String(err)) + '</div>';
  }
}

function renderWorkHistoryTable(rows) {
  if (!rows || rows.length === 0) {
    return '<div class="detail-section"><p style="color:var(--text-muted);padding:16px">Нет данных. Создайте акты и свяжите их с оборудованием.</p></div>';
  }

  var fmtDate = function(d) { return d ? d.split('-').reverse().join('.') : ''; };
  var fmt = function(v) { return v > 0 ? v.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽' : ''; };

  // Collect unique sorted dates (columns)
  var dateSet = {};
  rows.forEach(function(r) { if (r.act_date) dateSet[r.act_date] = true; });
  var dates = Object.keys(dateSet).sort();

  // Collect unique equipment (rows), group cells by date
  // Cell = { descriptions: [], amount: 0, act_ids: [] }
  var eqMap = {};
  rows.forEach(function(r) {
    if (!eqMap[r.eq_id]) {
      eqMap[r.eq_id] = {
        eq_id: r.eq_id, eq_name: r.eq_name,
        eq_inv_number: r.eq_inv_number, eq_category: r.eq_category,
        eq_status: r.eq_status, building_name: r.building_name,
        cells: {}, totalAmount: 0
      };
    }
    var date = r.act_date || '';
    if (!eqMap[r.eq_id].cells[date]) {
      eqMap[r.eq_id].cells[date] = { descriptions: [], comments: [], amount: 0, actIds: [], actNames: [] };
    }
    var cell = eqMap[r.eq_id].cells[date];
    if (r.description && r.description.trim()) {
      if (cell.descriptions.indexOf(r.description.trim()) < 0) {
        cell.descriptions.push(r.description.trim());
      }
    }
    if (r.comment && r.comment.trim()) {
      if (cell.comments.indexOf(r.comment.trim()) < 0) {
        cell.comments.push(r.comment.trim());
      }
    }
    cell.amount += r.amount || 0;
    if (r.act_id && cell.actIds.indexOf(r.act_id) < 0) {
      cell.actIds.push(r.act_id);
      cell.actNames.push(r.act_name || 'Акт');
    }
    eqMap[r.eq_id].totalAmount += r.amount || 0;
  });

  var equipment = Object.values(eqMap).sort(function(a,b) { return a.eq_name.localeCompare(b.eq_name, 'ru'); });

  var h = '<div class="detail-section">';
  h += '<div style="margin-bottom:12px;font-size:13px;color:var(--text-muted)">';
  h += equipment.length + ' ед. оборудования &middot; ' + dates.length + ' дат';
  h += '</div>';
  h += '<div style="overflow-x:auto">';
  h += '<table style="border-collapse:collapse;font-size:13px;min-width:100%">';

  // Header row
  h += '<thead><tr>';
  h += '<th style="text-align:left;padding:8px 10px;background:var(--bg-secondary);border:1px solid var(--border);min-width:200px;position:sticky;left:0;z-index:2">Оборудование</th>';
  dates.forEach(function(d) {
    h += '<th style="text-align:center;padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);min-width:160px;white-space:nowrap">' + fmtDate(d) + '</th>';
  });
  h += '<th style="text-align:right;padding:8px 10px;background:var(--bg-secondary);border:1px solid var(--border);min-width:100px;font-weight:700;white-space:nowrap">Итого, ₽</th>';
  h += '</tr></thead>';

  // Body
  h += '<tbody>';
  equipment.forEach(function(eq, idx) {
    var isBroken = _brokenEqIds.has(eq.eq_id);
    var isEmergencyRow = (eq.eq_status === 'Аварийное');
    var bg = isBroken ? 'rgba(239,68,68,.10)' : (isEmergencyRow ? 'rgba(184,92,92,.07)' : (idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)'));
    h += '<tr' + (isBroken ? ' class="eq-broken-row"' : '') + '>';

    // Equipment cell (sticky)
    h += '<td style="padding:8px 10px;border:1px solid var(--border);background:' + bg + ';position:sticky;left:0;z-index:1;vertical-align:top">';
    var nameColor = isBroken ? '#dc2626' : (isEmergencyRow ? '#b85c5c' : 'var(--accent)');
    h += '<a href="#" onclick="showEntity(' + eq.eq_id + ');return false" style="font-weight:600;color:' + nameColor + ';display:block">' + escapeHtml(eq.eq_name) + '</a>';
    if (isBroken) h += '<span class="eq-broken-badge">⚠ Нерабочий</span>';
    else if (isEmergencyRow) h += '<span class="eq-emergency-badge">⚠ Авария</span>';
    if (eq.eq_inv_number) h += '<div style="font-size:11px;color:var(--text-muted)">инв. ' + escapeHtml(eq.eq_inv_number) + '</div>';
    if (eq.building_name && eq.building_name !== '—') h += '<div style="font-size:11px;color:var(--text-muted)">' + escapeHtml(eq.building_name) + '</div>';
    h += '</td>';

    // Date cells
    dates.forEach(function(date) {
      var cell = eq.cells[date];
      if (!cell || (cell.descriptions.length === 0 && (!cell.comments || cell.comments.length === 0) && cell.amount === 0)) {
        h += '<td style="padding:8px 12px;border:1px solid var(--border);background:' + bg + ';text-align:center;color:var(--text-muted);vertical-align:top">—</td>';
      } else {
        h += '<td style="padding:8px 12px;border:1px solid var(--border);background:' + bg + ';vertical-align:top">';
        // Описание работ
        if (cell.descriptions.length > 0) {
          h += '<div style="font-size:12px;line-height:1.5">';
          cell.descriptions.forEach(function(desc) {
            h += '<div style="margin-bottom:2px">' + escapeHtml(desc) + '</div>';
          });
          h += '</div>';
        }
        // Комментарий
        if (cell.comments && cell.comments.length > 0) {
          h += '<div style="font-size:11px;color:var(--text-muted);margin-top:3px;font-style:italic">';
          cell.comments.forEach(function(c) {
            h += '<div>' + escapeHtml(c) + '</div>';
          });
          h += '</div>';
        }
        // Amount (if non-zero)
        if (cell.amount > 0) {
          h += '<div style="font-size:12px;color:var(--accent);font-weight:600;margin-top:4px">' + fmt(cell.amount) + '</div>';
        }
        // Link to act(s)
        if (cell.actIds.length > 0) {
          h += '<div style="font-size:11px;margin-top:3px">';
          cell.actIds.forEach(function(aid, i) {
            h += '<a href="#" onclick="showEntity(' + aid + ');return false" style="color:var(--text-muted)">→ ' + escapeHtml(cell.actNames[i] || 'Акт') + '</a>';
            if (i < cell.actIds.length - 1) h += ' ';
          });
          h += '</div>';
        }
        h += '</td>';
      }
    });

    // Row total
    h += '<td style="padding:8px 10px;border:1px solid var(--border);background:' + bg + ';text-align:right;font-weight:600;vertical-align:top">';
    h += eq.totalAmount > 0 ? fmt(eq.totalAmount) : '—';
    h += '</td>';
    h += '</tr>';
  });
  h += '</tbody></table></div></div>';
  return h;
}
`;
