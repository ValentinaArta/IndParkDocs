module.exports = `
// ============ REPORTS ============

var _reportFields = [];
// Fields available for manual grouping
var AGG_HIERARCHY_FIELDS = [
  { name: 'eq_balance_owner',          label: 'Собственник' },
  { name: 'eq_building',               label: 'Корпус' },
  { name: 'eq_category',               label: 'Категория оборудования' },
  { name: 'eq_name',                   label: 'Оборудование' },
  { name: 'contract_contractor',       label: 'Контрагент' },
  { name: 'contract_type',             label: 'Тип договора' },
  { name: 'contract_year',             label: 'Год' },
];
// No auto drill — user controls grouping fully
var AGG_AUTO_DRILL = [];
// All fields for label lookup in tree rendering
var AGG_ALL_FIELDS = AGG_HIERARCHY_FIELDS;
var AGG_CONTRACT_TYPES = ['Подряда','Услуг','Купли-продажи','Обслуживания'];
var _aggHierarchy = []; // ordered list of field names

var _pivotRowFields = [];
var _pivotColFields = [];
var _pivotDragField = null;
var _pivotDragSource = null;
var _reportFieldLabels = {
  building: 'Корпус', room: 'Помещение', object_type: 'Тип объекта',
  contractor_name: 'Контрагент', our_legal_entity: 'Наше юр. лицо',
  contract_type: 'Тип договора', tenant: 'Арендатор',
  equipment: 'Оборудование', rent_scope: 'Часть/Целиком',
  our_role_label: 'Роль нашей стороны', contractor_role_label: 'Роль контрагента',
};

// BI/budget page functions moved to pages/budget-page.js

// ============ FINANCE PAGE (1С) ============
// finance page functions moved to pages/finance-page.js

// editBIUrl moved to pages/budget-page.js

async function showReports() {
  currentView = 'reports';
  _setNavHash('reports');
  setActive(null);
  document.getElementById('pageTitle').textContent = 'Отчёты';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';

  _reportFields = await api('/reports/fields');

  var content = document.getElementById('content');
  var html = '<div style="max-width:900px;margin:0 auto">';

  // Tabs
  html += '<div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border)">';
  html += '<button id="tabPivot" class="btn" data-tab="pivot" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">Сводная таблица</button>';
  html += '<button id="tabLinked" class="btn" data-tab="linked" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">По связям</button>';
  html += '<button id="tabAgg" class="btn btn-primary" data-tab="agg" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">Анализ затрат</button>';
  html += '<button id="tabWorkHistory" class="btn" data-tab="workHistory" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">История работ</button>';
  html += '<button id="tabRentAnalysis" class="btn" data-tab="rentAnalysis" onclick="switchReportTab(this.dataset.tab)" style="border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px">Анализ аренды</button>';
  html += '</div>';

  // Pivot section (drag-and-drop)
  _pivotRowFields = [];
  _pivotColFields = [];
  html += '<div id="sectionPivot" style="display:none">';
  html += '<div class="detail-section">';
  html += '<h3>Сводная таблица</h3>';

  // Field pool — all document fields flat
  html += '<div style="margin-bottom:16px">';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Поля — перетащите в Строки или Столбцы</div>';
  html += '<div class="pivot-field-pool" id="pivotFieldPool" ondragover="event.preventDefault()" ondrop="onPivotDrop(event,this)"></div>';
  html += '</div>';

  // Drop zones
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">';
  html += '<div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">↕ Строки</div>';
  html += '<div class="pivot-zone" id="pivotRowZone" data-zone="rows" ondragover="onPivotDragOver(event,this)" ondragleave="onPivotDragLeave(this)" ondrop="onPivotDrop(event,this)">';
  html += '<div class="pivot-zone-hint">Перетащите поле сюда</div>';
  html += '</div></div>';
  html += '<div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">↔ Столбцы</div>';
  html += '<div class="pivot-zone" id="pivotColZone" data-zone="cols" ondragover="onPivotDragOver(event,this)" ondragleave="onPivotDragLeave(this)" ondrop="onPivotDrop(event,this)">';
  html += '<div class="pivot-zone-hint">Перетащите поле сюда (необязательно)</div>';
  html += '</div></div>';
  html += '</div>';

  html += '<button class="btn btn-primary" onclick="buildPivotTable()">Построить таблицу</button>';
  html += '</div>';
  html += '<div id="pivotResults"></div>';
  html += '</div>';

  // Linked reports section
  html += '<div id="sectionLinked">';
  html += '<div class="detail-section"><h3>Отчёты по связям</h3>';
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:16px">';
  var linkedReports = [
    { type: 'equipment_by_location', lucide: 'building-2', title: 'Оборудование по корпусам', desc: 'Где установлено каждое оборудование' },
    { type: 'equipment_by_tenant',   lucide: 'landmark',   title: 'Оборудование у арендаторов', desc: 'Какое оборудование в арендуемых помещениях' },
  ];
  linkedReports.forEach(function(r) {
    html += '<div class="child-card" onclick="runLinkedReport(&quot;' + r.type + '&quot;)" style="cursor:pointer;padding:14px">';
    html += '<div style="margin-bottom:6px;color:var(--accent)">' + icon(r.lucide, 24) + '</div>';
    html += '<div style="font-weight:600;margin-bottom:4px">' + r.title + '</div>';
    html += '<div style="font-size:12px;color:var(--text-muted)">' + r.desc + '</div>';
    html += '</div>';
  });
  html += '</div></div>';
  html += '<div id="linkedResults"></div>';
  html += '</div>';

  // Aggregate report section
  _aggHierarchy = [];
  html += '<div id="sectionAgg" style="display:none">';
  html += '<div class="detail-section"><h3>Анализ затрат по оборудованию</h3>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px">';

  // Left: filters
  html += '<div>';
  html += '<div class="form-group"><label>Типы договоров *</label><div id="aggTypeFilter" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">';
  AGG_CONTRACT_TYPES.forEach(function(t) {
    html += '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-weight:normal">';
    html += '<input type="checkbox" class="agg-type-cb" value="' + t + '" checked> ' + t;
    html += '</label>';
  });
  html += '</div></div>';
  html += '<div class="form-group"><label>Период</label>';
  html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">от&nbsp;<input type="date" id="aggDateFrom" style="flex:1;min-width:120px">&nbsp;до&nbsp;<input type="date" id="aggDateTo" style="flex:1;min-width:120px"></div></div>';
  html += '<div class="form-group"><label>Контрагент</label><select id="aggContractor" style="width:100%"><option value="">— Все —</option>';
  _allCompanies.forEach(function(c) { html += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>'; });
  html += '</select></div>';
  html += '<div class="form-group"><label>Суммировать</label><select id="aggMetric" style="width:100%">';
  html += '<option value="contract_amount">Сумма договора</option>';
  html += '<option value="rent_monthly">Аренда в месяц</option>';
  html += '</select></div>';
  html += '</div>';

  // Right: hierarchy builder
  html += '<div>';
  html += '<div class="form-group"><label>Группировка строк</label>';
  html += '<div id="aggHierarchyList" style="min-height:50px;border:2px dashed var(--border);border-radius:6px;padding:8px;background:var(--bg-secondary);margin-bottom:8px">';
  html += '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:6px">Добавьте поля из списка ниже</div>';
  html += '</div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Доступные поля (нажмите чтобы добавить):</div>';
  html += '<div id="aggFieldPool" style="display:flex;flex-wrap:wrap;gap:6px">';
  AGG_HIERARCHY_FIELDS.forEach(function(f) {
    html += '<button type="button" class="btn btn-sm agg-pool-btn" data-name="' + f.name + '" onclick="aggAddField(this.dataset.name)" style="font-size:11px">' + escapeHtml(f.label) + ' +</button>';
  });
  html += '</div></div>';
  html += '</div>';

  html += '</div>'; // end grid
  html += '<button class="btn btn-primary" onclick="buildAggregateReport()">Построить отчёт</button>';
  html += '</div>'; // end detail-section
  html += '<div id="aggResults"></div>';
  html += '</div>'; // end sectionAgg

  // Work History section
  html += '<div id="sectionWorkHistory" style="display:none">';
  html += '<div class="detail-section"><h3>История работ по оборудованию</h3>';
  html += '<p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Матрица: строки — оборудование, столбцы — виды работ из актов</p>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:16px">';
  html += '<div class="form-group"><label>Категория</label><select id="whCategory" style="width:100%"><option value="">— Все категории —</option>';
  EQUIPMENT_CATEGORIES.forEach(function(c) { html += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>'; });
  html += '</select></div>';
  html += '<div class="form-group"><label>Корпус</label><select id="whBuilding" style="width:100%"><option value="">— Все корпуса —</option>';
  (_buildings || []).forEach(function(b) { html += '<option value="' + b.id + '">' + escapeHtml(b.name) + '</option>'; });
  html += '</select></div>';
  html += '<div class="form-group"><label>Период (акты)</label><div style="display:flex;gap:6px;align-items:center">от&nbsp;<input type="date" id="whDateFrom" style="flex:1">&nbsp;до&nbsp;<input type="date" id="whDateTo" style="flex:1"></div></div>';
  html += '</div>';
  html += '<button class="btn btn-primary" onclick="buildWorkHistoryReport()">Построить таблицу</button>';
  html += '</div>'; // end detail-section
  html += '<div id="whResults"></div>';
  html += '</div>'; // end sectionWorkHistory

  // Rent Analysis section
  html += '<div id="sectionRentAnalysis" style="display:none">';
  html += '<div class="detail-section">';
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px">';
  html += '<div>';
  html += '<h3 style="margin:0 0 4px">Анализ аренды</h3>';
  html += '<p style="margin:0;font-size:12px;color:var(--text-muted)">Фильтры + группировка по любым полям</p>';
  html += '</div>';
  html += '<button class="btn btn-primary" onclick="buildRentAnalysis()">Загрузить данные</button>';
  html += '</div>';
  // Column selector (collapsible)
  html += '<div style="margin-bottom:12px">';
  html += '<button type="button" class="btn btn-sm" onclick="_toggleRentColPanel()" style="font-size:11px;margin-bottom:6px">☰ Столбцы</button>';
  html += '<div id="rentColPanel" style="display:none;border:1px solid var(--border);border-radius:6px;padding:10px;background:var(--bg-secondary)">';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Выберите столбцы для отображения:</div>';
  html += '<div id="rentColCheckboxes" style="display:flex;flex-wrap:wrap;gap:8px 20px"></div>';
  html += '<div style="margin-top:8px;display:flex;gap:8px">';
  html += '<button type="button" class="btn btn-sm" onclick="_rentColSelectAll(true)">Все</button>';
  html += '<button type="button" class="btn btn-sm" onclick="_rentColSelectAll(false)">Ничего</button>';
  html += '</div></div>';
  html += '</div>';
  // Filter-headers zone (replaces group-by)
  html += '<div style="margin-bottom:12px">';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">Строки отбора:</div>';
  html += '<div id="rentGroupZone" style="display:flex;flex-direction:column;gap:4px;min-height:20px"></div>';
  html += '<div id="rentGroupFieldBtns" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>';
  html += '</div>';
  html += '</div>';
  html += '<div id="rentResults"></div>';
  html += '</div>'; // end sectionRentAnalysis

  html += '</div>';
  content.innerHTML = html;
  renderIcons();
  switchReportTab('agg');
  updatePivotFieldPool(); // fill pool for default entity type
}

function switchReportTab(tab) {
  var tabs = ['pivot','linked','agg','workHistory','rentAnalysis'];
  tabs.forEach(function(t) {
    var btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
    var sec = document.getElementById('section' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) { btn.className = (t === tab) ? 'btn btn-primary' : 'btn'; btn.style.cssText = 'border-radius:6px 6px 0 0;border-bottom:none;padding:8px 20px'; }
    if (sec) sec.style.display = (t === tab) ? '' : 'none';
  });
}

// ============ AGGREGATE REPORT ============

function aggAddField(name) {
  if (_aggHierarchy.indexOf(name) >= 0) return;
  _aggHierarchy.push(name);
  renderAggHierarchyUI();
}

function aggRemoveField(name) {
  _aggHierarchy = _aggHierarchy.filter(function(n) { return n !== name; });
  renderAggHierarchyUI();
}

function aggMoveField(name, dir) {
  var idx = _aggHierarchy.indexOf(name);
  if (idx < 0) return;
  var newIdx = idx + (dir === 'up' ? -1 : 1);
  if (newIdx < 0 || newIdx >= _aggHierarchy.length) return;
  _aggHierarchy.splice(idx, 1);
  _aggHierarchy.splice(newIdx, 0, name);
  renderAggHierarchyUI();
}

function renderAggHierarchyUI() {
  var listEl = document.getElementById('aggHierarchyList');
  var poolEl = document.getElementById('aggFieldPool');
  if (!listEl || !poolEl) return;

  if (_aggHierarchy.length === 0) {
    listEl.innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:6px">Добавьте поля из списка ниже</div>';
  } else {
    listEl.innerHTML = _aggHierarchy.map(function(name, i) {
      var f = AGG_ALL_FIELDS.find(function(x) { return x.name === name; });
      var label = f ? f.label : name;
      var isFirst = (i === 0), isLast = (i === _aggHierarchy.length - 1);
      return '<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px">' +
        '<span style="color:var(--text-muted);font-size:11px;width:18px;text-align:right">' + (i+1) + '.</span>' +
        '<span style="flex:1;padding:4px 10px;background:var(--bg-hover);border-radius:4px;font-size:13px">' + escapeHtml(label) + '</span>' +
        '<button type="button" class="btn btn-sm" style="padding:2px 7px" data-name="' + name + '" data-dir="up" onclick="aggMoveField(this.dataset.name,this.dataset.dir)"' + (isFirst?' disabled':'') + '>↑</button>' +
        '<button type="button" class="btn btn-sm" style="padding:2px 7px" data-name="' + name + '" data-dir="down" onclick="aggMoveField(this.dataset.name,this.dataset.dir)"' + (isLast?' disabled':'') + '>↓</button>' +
        '<button type="button" class="btn btn-sm" style="padding:2px 7px;color:var(--danger)" data-name="' + name + '" onclick="aggRemoveField(this.dataset.name)">×</button>' +
        '</div>';
    }).join('');
  }

  poolEl.innerHTML = AGG_HIERARCHY_FIELDS.filter(function(f) {
    return _aggHierarchy.indexOf(f.name) < 0;
  }).map(function(f) {
    return '<button type="button" class="btn btn-sm agg-pool-btn" data-name="' + f.name + '" onclick="aggAddField(this.dataset.name)" style="font-size:11px">' + escapeHtml(f.label) + ' +</button>';
  }).join(' ');
}

async function buildAggregateReport() {
  if (_aggHierarchy.length === 0) { alert('Добавьте хотя бы одно поле в группировку'); return; }
  await loadBrokenEquipment(); // ensure broken IDs are fresh before rendering
  var types = Array.from(document.querySelectorAll('.agg-type-cb:checked')).map(function(cb) { return cb.value; });
  if (types.length === 0) { alert('Выберите хотя бы один тип договора'); return; }

  var metric      = document.getElementById('aggMetric').value;
  var dateFrom    = document.getElementById('aggDateFrom').value;
  var dateTo      = document.getElementById('aggDateTo').value;
  var contractorId = document.getElementById('aggContractor').value;

  var p = new URLSearchParams();
  p.set('contract_types', types.join('|'));
  p.set('metric', metric);
  if (dateFrom) p.set('date_from', dateFrom);
  if (dateTo)   p.set('date_to', dateTo);
  if (contractorId) p.set('contractor_id', contractorId);

  var resultsEl = document.getElementById('aggResults');
  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';

  var data;
  try { data = await api('/reports/aggregate?' + p.toString()); }
  catch(e) { resultsEl.innerHTML = '<div style="color:var(--danger);padding:12px">Ошибка: ' + escapeHtml(String(e.message || e)) + '</div>'; return; }

  if (!data.length) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных по выбранным параметрам</div>';
    return;
  }
  var metricLabel = (metric === 'rent_monthly') ? 'Аренда в мес.' : 'Сумма договора';
  // Auto-extend hierarchy: [user grouping] → Категория → Вид → Оборудование → Договор
  var autoHierarchy = _aggHierarchy.slice();
  AGG_AUTO_DRILL.forEach(function(f) {
    if (autoHierarchy.indexOf(f) < 0) autoHierarchy.push(f);
  });
  resultsEl.innerHTML = renderAggTree(data, autoHierarchy, metric, metricLabel);
}

function renderAggTree(rows, hierarchy, metric, metricLabel) {
  // Build nested tree from flat rows
  function buildLevel(data, depth) {
    var total = data.reduce(function(s, r) { return s + (r[metric] || 0); }, 0);
    if (depth >= hierarchy.length) return { contracts: data, total: total };
    var field = hierarchy[depth];
    var order = [], map = {};
    data.forEach(function(r) {
      var val = (r[field] || '—');
      if (!map[val]) { map[val] = []; order.push(val); }
      map[val].push(r);
    });
    order.sort(function(a,b) { return String(a).localeCompare(String(b),'ru'); });
    var children = order.map(function(key) {
      var child = buildLevel(map[key], depth + 1);
      // Find best representative row: prefer row with eq_status set
      var rows = map[key];
      var bestRow = rows.find(function(r){ return r.eq_status; }) || rows[0] || {};
      child.first_row = bestRow;
      return Object.assign({ key: key }, child);
    });
    return { children: children, total: total };
  }

  var tree = buildLevel(rows, 0);
  var _uid = 0;

  function renderNode(node, depth) {
    var h = '';
    if (node.children) {
      node.children.forEach(function(child) {
        var id = 'agg_' + (++_uid);
        var field = hierarchy[depth];
        var fDef = AGG_ALL_FIELDS.find(function(x) { return x.name === field; });
        var fLabel = fDef ? fDef.label : field;
        // Emergency/broken check for equipment-level nodes
        var isEqField = (field === 'eq_name' || field === 'equipment');
        var fr = child.first_row || {};
        var nodeEqId = isEqField ? (parseInt(fr.eq_id) || 0) : 0;
        var nodeIsB = isEqField && nodeEqId > 0 && _brokenEqIds.has(nodeEqId);
        var nodeIsE = isEqField && (fr.eq_status === 'Аварийное');
        var nodeRowStyle = nodeIsB ? 'background:rgba(239,68,68,.09);border-left:2px solid #dc2626;'
          : (nodeIsE ? 'background:rgba(184,92,92,.10);border-left:2px solid #b85c5c;' : '');
        var nodeNameStyle = nodeIsB ? 'color:#dc2626;font-weight:600;' : (nodeIsE ? 'color:#b85c5c;font-weight:600;' : 'font-weight:' + (depth < 2 ? '600' : '400') + ';');
        var nodeBadge = nodeIsB ? ' <span class="eq-broken-badge">⚠ Нерабочий</span>'
          : (nodeIsE ? ' <span class="eq-emergency-badge">⚠ Авария</span>' : '');
        h += '<div style="margin-left:' + (depth * 18) + 'px">';
        h += '<div class="agg-tree-row" data-target="' + id + '" onclick="aggToggle(this.dataset.target)" style="' + nodeRowStyle + '">';
        h += '<span id="' + id + '_ico" style="font-size:10px;color:var(--text-muted);width:12px">▶</span>';
        h += '<span style="font-size:11px;color:var(--text-muted);min-width:130px">' + escapeHtml(fLabel) + '</span>';
        h += '<span style="flex:1;' + nodeNameStyle + '">' + escapeHtml(String(child.key)) + nodeBadge + '</span>';
        h += '<span class="agg-total">' + _fmtNum(child.total) + ' ₽</span>';
        h += '</div>';
        h += '<div id="' + id + '" style="display:none">' + renderNode(child, depth + 1) + '</div>';
        h += '</div>';
      });
    }
    if (node.contracts) {
      // If eq_name already used in hierarchy above → skip eqGroups header, list docs directly
      var eqAlreadyGrouped = hierarchy.slice(0, depth).indexOf('eq_name') >= 0;
      if (eqAlreadyGrouped) {
        node.contracts.forEach(function(r) {
          h += '<div class="agg-tree-leaf" style="margin-left:' + (depth * 18) + 'px" onclick="showEntity(' + (r.act_id || r.contract_id) + ')">';
          h += '<span style="width:12px"> </span><span>📄</span>';
          h += '<span style="flex:1;font-size:12px;color:var(--text-secondary)">' + escapeHtml(r.act_name || r.contract_name) + '</span>';
          if (r.act_date || r.contract_date) h += '<span style="font-size:11px;color:var(--text-muted);margin-right:8px">' + (r.act_date || r.contract_date) + '</span>';
          h += '<span class="agg-total">' + _fmtNum(r[metric]) + ' ₽</span>';
          h += '</div>';
        });
        return h;
      }
      // Group rows by equipment so each unit appears once with total, expandable per-document
      var eqGroups = {}, eqOrder = [];
      node.contracts.forEach(function(r) {
        var key = 'eq_' + (r.eq_id || r.contract_id);
        if (!eqGroups[key]) {
          eqGroups[key] = { eq_id: r.eq_id, contract_id: r.contract_id,
            eq_name: r.eq_name || r.contract_name, eq_status: r.eq_status, total: 0, docs: [] };
          eqOrder.push(key);
        }
        // Update eq_status from any row that has it (first row may have empty status)
        if (!eqGroups[key].eq_status && r.eq_status) eqGroups[key].eq_status = r.eq_status;
        eqGroups[key].total += (r[metric] || 0);
        eqGroups[key].docs.push(r);
      });

      eqOrder.forEach(function(key) {
        var grp = eqGroups[key];
        var eqId = grp.eq_id || grp.contract_id;
        var isBroken = _brokenEqIds.has(parseInt(eqId));
        var isEmerg = (grp.eq_status === 'Аварийное');
        var leafBg = isBroken ? 'background:rgba(239,68,68,.09);border-radius:4px;border-left:2px solid #dc2626;padding-left:6px;'
          : (isEmerg ? 'background:rgba(184,92,92,.10);border-radius:4px;border-left:2px solid #b85c5c;padding-left:6px;' : '');
        var leafColor = isBroken ? 'color:#dc2626;font-weight:500;' : (isEmerg ? 'color:#b85c5c;font-weight:500;' : '');
        var hasMulti = grp.docs.length > 1;
        var detId = 'eqd_' + (++_uid);

        h += '<div style="margin-left:' + (depth * 18) + 'px">';
        // Summary row
        h += '<div class="agg-tree-leaf" style="' + leafBg + '" data-det-id="' + detId + '" data-eq-id="' + eqId + '" data-multi="' + (hasMulti ? '1' : '0') + '" onclick="aggLeafClick(this)">';
        if (hasMulti) h += '<span id="' + detId + '_ico" style="font-size:10px;color:var(--text-muted);width:12px">▶</span>';
        else h += '<span style="width:12px"> </span>';
        h += '<span>⚙️</span>';
        h += '<span style="flex:1;' + leafColor + '">';
        h += escapeHtml(grp.eq_name);
        if (isBroken) h += '<span class="eq-broken-badge">⚠ Нерабочий</span>';
        else if (isEmerg) h += '<span class="eq-emergency-badge">⚠ Авария</span>';
        if (hasMulti) {
          h += '<span style="font-size:11px;color:var(--text-muted);margin-left:6px">' + grp.docs.length + ' док.</span>';
        } else {
          var r0 = grp.docs[0];
          if (r0.act_name) h += '<span style="font-size:11px;color:var(--text-muted);margin-left:6px">' + escapeHtml(r0.act_name) + '</span>';
        }
        h += '</span>';
        if (!hasMulti) {
          var r1 = grp.docs[0];
          if (r1.act_date || r1.contract_date) h += '<span style="font-size:11px;color:var(--text-muted);margin-right:8px">' + (r1.act_date || r1.contract_date) + '</span>';
        }
        h += '<span class="agg-total">' + _fmtNum(grp.total) + ' ₽</span>';
        h += '</div>';

        // Expandable detail rows
        if (hasMulti) {
          h += '<div id="' + detId + '" style="display:none">';
          grp.docs.forEach(function(r) {
            h += '<div class="agg-tree-leaf" style="margin-left:20px;opacity:.85" onclick="showEntity(' + (r.act_id || r.contract_id) + ')">';
            h += '<span style="width:12px"></span><span>📄</span>';
            h += '<span style="flex:1;font-size:12px;color:var(--text-secondary)">' + escapeHtml(r.act_name || r.contract_name) + '</span>';
            if (r.act_date || r.contract_date) h += '<span style="font-size:11px;color:var(--text-muted);margin-right:8px">' + (r.act_date || r.contract_date) + '</span>';
            h += '<span class="agg-total">' + _fmtNum(r[metric]) + ' ₽</span>';
            h += '</div>';
          });
          h += '</div>';
        }
        h += '</div>';
      });
    }
    return h;
  }

  var totalFmt = _fmtNum(tree.total);
  var h = '<div class="detail-section" style="margin-top:16px">';
  h += '<div style="display:flex;justify-content:space-between;margin-bottom:12px;font-weight:600">';
  var _uniqueEq = new Set(rows.map(function(r) { return r.eq_id || r.contract_id; })).size;
  h += '<span>' + _uniqueEq + ' ед. оборудования (' + rows.length + ' записей)</span><span>' + escapeHtml(metricLabel) + ': ' + totalFmt + ' ₽</span>';
  h += '</div>';
  h += renderNode(tree, 0);
  h += '</div>';
  return h;
}

function aggToggle(id) {
  var el = document.getElementById(id);
  var ico = document.getElementById(id + '_ico');
  if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : '';
  if (ico) ico.textContent = open ? '▶' : '▼';
}

function aggLeafClick(el) {
  if (el.dataset.multi === '1') aggToggle(el.dataset.detId);
  else showEntity(parseInt(el.dataset.eqId));
}
`;
