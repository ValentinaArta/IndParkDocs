/* eslint-disable */
module.exports = `
// === DASHBOARD ===

// ============ DASHBOARD ============

async function showDashboard() {
  currentView = 'dashboard';
  currentTypeFilter = null;
  setActive('.nav-item:first-child');
  document.getElementById('pageTitle').textContent = 'Обзор';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';

  const stats = await api('/stats');
  if (currentView !== 'dashboard') return; // user navigated away during load
  const content = document.getElementById('content');

  let html = '';
  html += '<div class="stats-grid">';
  stats.types.forEach(t => {
    html += '<div class="stat-card" onclick="showEntityList(\\'' + t.name + '\\')">' +
      '<div class="stat-icon">' + entityIcon(t.name, 24) + '</div>' +
      '<div class="stat-count" style="color:' + t.color + '">' + t.count + '</div>' +
      '<div class="stat-label">' + t.name_ru + '</div></div>';
    const countEl = document.getElementById('count_' + t.name);
    if (countEl) countEl.textContent = t.count;
  });
  html += '</div>';

  html += '<div class="stat-card" style="display:inline-block;padding:12px 20px">' +
    '<span style="font-size:20px;font-weight:700;color:var(--accent)">' + stats.totalRelations + '</span>' +
    ' <span style="color:var(--text-secondary);font-size:13px">связей</span></div>';

  content.innerHTML = html;
  renderIcons();
}

// ============ AREA DASHBOARD ============

var _areaData = null;
var _pieColors = ['#4F6BCC','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#14b8a6','#f97316','#6366f1','#a855f7'];

async function loadAreaPieChart() {
  var el = document.getElementById('areaDashboard');
  if (!el) return;
  try {
    _areaData = await api('/reports/area-stats');
    _renderAreaDashboard();
  } catch(e) {
    el.innerHTML = '<div style="color:var(--red);font-size:13px">Ошибка: ' + escapeHtml(e.message || String(e)) + '</div>';
  }
}


function _svgDonut(cx, cy, R, r, segments, labels) {
  var h = '<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="#e5e7eb" />';
  if (!segments || !segments.length) {
    h += '<text x="'+cx+'" y="'+(cy+2)+'" text-anchor="middle" font-size="14" fill="var(--text-muted)">нет данных</text>';
    return h;
  }
  var startAngle = -Math.PI / 2;
  segments.forEach(function(seg) {
    if (seg.pct <= 0) return;
    var endAngle = startAngle + 2 * Math.PI * Math.min(seg.pct, 0.9999);
    var x1 = cx + R * Math.cos(startAngle), y1 = cy + R * Math.sin(startAngle);
    var x2 = cx + R * Math.cos(endAngle), y2 = cy + R * Math.sin(endAngle);
    var largeArc = seg.pct > 0.5 ? 1 : 0;
    var cls = seg.cls ? ' class="'+seg.cls+'"' : '';
    var onclick = seg.onclick ? ' onclick="'+seg.onclick+'" style="cursor:pointer"' : '';
    var dataAttrs = seg.dataAttrs || '';
    h += '<path d="M'+cx+','+cy+' L'+x1.toFixed(2)+','+y1.toFixed(2)+' A'+R+','+R+' 0 '+largeArc+',1 '+x2.toFixed(2)+','+y2.toFixed(2)+' Z" fill="'+seg.color+'"'+cls+onclick+dataAttrs+'>';
    if (seg.title) h += '<title>'+escapeHtml(seg.title)+'</title>';
    h += '</path>';
    startAngle = endAngle;
  });
  if (r > 0) h += '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="white" />';
  if (labels && labels.center) {
    h += '<text x="'+cx+'" y="'+(cy - 4)+'" text-anchor="middle" font-size="'+(labels.fontSize||28)+'" font-weight="700" fill="var(--text)">'+labels.center+'</text>';
    if (labels.sub) h += '<text x="'+cx+'" y="'+(cy + 16)+'" text-anchor="middle" font-size="12" fill="var(--text-secondary)">'+labels.sub+'</text>';
  }
  return h;
}

function _buildTenantColorMap(tenants) {
  var map = {};
  tenants.forEach(function(t, i) { map[t.tenant] = _pieColors[i % _pieColors.length]; });
  return map;
}

function _renderAreaDashboard() {
  var el = document.getElementById('areaDashboard');
  if (!el || !_areaData) return;
  var d = _areaData;
  var h = '';

  // Assign consistent colors to tenants
  var allTenants = (d.tenants || []).concat(d.lp_tenants || []);
  var uniqTenants = []; var seen = {};
  allTenants.forEach(function(t) { if (!seen[t.tenant]) { seen[t.tenant] = 1; uniqTenants.push(t); } });
  var tColors = _buildTenantColorMap(uniqTenants);

  // ── Top row: two pies ──
  h += '<div style="display:flex;gap:40px;flex-wrap:wrap;justify-content:center;margin-bottom:32px">';

  // Pie 1: Buildings total
  h += _renderSummaryPie('buildings', 'Помещения', d.grand_total, d.grand_rented, d.tenants || [], tColors);

  // Pie 2: Land plots total
  h += _renderSummaryPie('land', 'Земельные участки', d.lp_total || 0, d.lp_rented || 0, d.lp_tenants || [], tColors);

  h += '</div>';

  // ── Bottom: bar chart per building ──
  var blds = (d.buildings || []).filter(function(b) { return b.total_area > 0; });
  if (blds.length) {
    h += '<div style="margin-top:8px">';
    h += '<div style="font-size:14px;font-weight:600;margin-bottom:12px">По корпусам</div>';
    h += '<div id="areaBarChart" style="display:flex;gap:6px;align-items:flex-end;height:220px;padding-bottom:60px;overflow-x:auto">';
    var maxArea = Math.max.apply(null, blds.map(function(b) { return b.total_area; }));
    blds.forEach(function(b, bi) {
      var barH = Math.max(20, Math.round((b.total_area / (maxArea || 1)) * 160));
      var rentedPct = b.rented_area / (b.total_area || 1);
      var rentedH = Math.round(barH * rentedPct);
      var freeH = barH - rentedH;
      h += '<div class="area-bar-col" data-bidx="'+bi+'" style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:50px;cursor:pointer" onclick="_areaBarClick('+bi+')" onmouseenter="_areaBarHover('+bi+')" onmouseleave="_areaBarLeave('+bi+')">';
      h += '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px;white-space:nowrap">'+Math.round(rentedPct*100)+'%</div>';
      h += '<div id="area_bar_'+bi+'" style="width:100%;max-width:60px;height:'+barH+'px;border-radius:4px 4px 0 0;overflow:hidden;display:flex;flex-direction:column">';
      h += '<div style="height:'+freeH+'px;background:#e5e7eb"></div>';
      h += '<div style="height:'+rentedH+'px;background:#4F6BCC"></div>';
      h += '</div>';
      h += '<div style="font-size:10px;margin-top:4px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;transform:rotate(-30deg);transform-origin:top left;height:40px">' + escapeHtml(b.short_name || b.name) + '</div>';
      h += '</div>';
    });
    h += '</div>';
    h += '</div>';
  }

  // ── Drill-down area ──
  h += '<div id="areaDrillDown" style="margin-top:16px"></div>';

  el.innerHTML = h;
}

function _renderSummaryPie(type, title, total, rented, tenants, tColors) {
  var pct = total > 0 ? rented / total : 0;
  var h = '<div style="text-align:center;min-width:220px">';
  h += '<div style="font-size:14px;font-weight:600;margin-bottom:8px">' + escapeHtml(title) + '</div>';
  h += '<div style="position:relative;display:inline-block" onmouseenter="_pieTenantShow(\\''+type+'\\',this)" onmouseleave="_pieTenantHide(\\''+type+'\\',this)">';
  // Simple pie
  h += '<svg class="area-pie-simple" width="200" height="200" viewBox="0 0 200 200" style="cursor:pointer" onclick="_pieDrillClick(\\''+type+'\\')">'; 
  h += _svgDonut(100, 100, 90, 50, [
    {pct: pct, color: '#4F6BCC', title: 'Сдано: '+_fmtNum(Math.round(rented))+' м²'},
    {pct: 1 - pct, color: '#e5e7eb', title: 'Свободно: '+_fmtNum(Math.round(total - rented))+' м²'}
  ], {center: Math.round(pct * 100) + '%', sub: 'сдано'});
  h += '</svg>';
  // Expanded pie (tenant breakdown) — hidden initially
  h += '<svg class="area-pie-expanded" width="220" height="220" viewBox="0 0 220 220" style="display:none;cursor:pointer" onclick="_pieDrillClick(\\''+type+'\\')">'; 
  var segs = [];
  tenants.forEach(function(t) {
    segs.push({pct: t.area / (total || 1), color: tColors[t.tenant] || '#999', title: t.tenant + ': ' + _fmtNum(Math.round(t.area)) + ' м²'});
  });
  var freeArea = total - rented;
  if (freeArea > 0) segs.push({pct: freeArea / (total || 1), color: '#e5e7eb', title: 'Свободно: ' + _fmtNum(Math.round(freeArea)) + ' м²'});
  h += _svgDonut(110, 110, 100, 55, segs, {center: Math.round(pct * 100) + '%', sub: 'сдано'});
  h += '</svg>';
  h += '</div>';
  h += '<div style="font-size:13px;margin-top:8px"><strong>' + _fmtNum(Math.round(rented)) + '</strong> / ' + _fmtNum(Math.round(total)) + ' м²</div>';
  h += '</div>';
  return h;
}

function _pieTenantShow(type, container) {
  var simple = container.querySelector('.area-pie-simple');
  var expanded = container.querySelector('.area-pie-expanded');
  if (simple) simple.style.display = 'none';
  if (expanded) expanded.style.display = '';
}
function _pieTenantHide(type, container) {
  var simple = container.querySelector('.area-pie-simple');
  var expanded = container.querySelector('.area-pie-expanded');
  if (simple) simple.style.display = '';
  if (expanded) expanded.style.display = 'none';
}

function _pieDrillClick(type) {
  if (!_areaData) return;
  var dd = document.getElementById('areaDrillDown');
  if (!dd) return;
  var items = type === 'land' ? (_areaData.land_plots || []) : (_areaData.buildings || []);
  items = items.filter(function(b) { return b.total_area > 0; });
  var h = '<h4 style="margin-bottom:12px">' + (type === 'land' ? 'Земельные участки' : 'Корпуса') + ' — детали</h4>';
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">';
  items.forEach(function(b) {
    var pct = b.rented_area / (b.total_area || 1);
    h += '<div class="stat-card" style="padding:12px">';
    h += '<div style="font-weight:600;font-size:14px;margin-bottom:6px">' + escapeHtml(b.short_name || b.name) + '</div>';
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
    h += '<div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden"><div style="height:100%;width:'+Math.round(pct*100)+'%;background:#4F6BCC;border-radius:4px"></div></div>';
    h += '<span style="font-size:12px;font-weight:600;min-width:36px;text-align:right">'+Math.round(pct*100)+'%</span>';
    h += '</div>';
    h += '<div style="font-size:12px;color:var(--text-secondary)">' + _fmtNum(Math.round(b.rented_area)) + ' / ' + _fmtNum(Math.round(b.total_area)) + ' м²</div>';
    if (b.contracts && b.contracts.length) {
      h += '<div style="margin-top:6px;border-top:1px solid var(--border);padding-top:6px">';
      b.contracts.forEach(function(c) {
        h += '<div style="font-size:12px;cursor:pointer;padding:2px 0;display:flex;justify-content:space-between" onclick="showEntity('+c.contract_id+')">';
        h += '<span style="color:var(--accent)">' + escapeHtml(c.tenant || c.contract_name) + '</span>';
        h += '<span style="color:var(--text-muted)">' + _fmtNum(Math.round(c.area)) + ' м²</span>';
        h += '</div>';
      });
      h += '</div>';
    }
    h += '</div>';
  });
  h += '</div>';
  dd.innerHTML = h;
}
`;
