module.exports = `
// ============ PIVOT TABLE (drag-and-drop) ============

var _pivotSkipFields = [
  'rent_objects','rent_comments','equipment_list','act_items','parent_contract_id','parent_contract_name',
  'our_legal_entity_id','contractor_id','subtenant_id','balance_owner_id','balance_owner_name',
  'extra_services','duration_type', // internal flags — not useful for pivot
];
var _pivotFieldLabels = {
  // Contract / supplement main fields
  contract_type: 'Тип договора', our_legal_entity: 'Наше юр. лицо', contractor_name: 'Контрагент',
  subtenant_name: 'Субарендатор', number: 'Номер договора', contract_date: 'Дата договора',
  our_role_label: 'Роль нашей стороны', contractor_role_label: 'Роль контрагента',
  changes_description: 'Что поменялось',
  // Dynamic contract fields
  subject: 'Предмет договора', service_subject: 'Описание работ / предмет', service_comment: 'Комментарий',
  contract_end_date: 'Срок действия (до)',
  contract_amount: 'Сумма договора',
  rent_monthly: 'Аренда в месяц', payment_date: 'Дата оплаты',
  duration_date: 'Дата окончания', duration_text: 'Срок действия',
  advances: 'Авансы (да/нет)', advance_amount: 'Сумма аванса',
  vat_rate: 'в т.ч. НДС, %', completion_deadline: 'Срок выполнения',
  extra_services_desc: 'Доп. услуги', extra_services_cost: 'Стоимость доп. услуг',
  // Rent object fields
  building: 'Корпус', room: 'Помещение', object_type: 'Тип объекта', tenant: 'Арендатор',
  equipment: 'Оборудование по договору',
  // Equipment entity fields
  equipment_category: 'Категория оборудования',
  status: 'Статус оборудования', inv_number: 'Инв. номер', balance_owner: 'Собственник',
  serial_number: 'Серийный номер', year: 'Год выпуска', manufacturer: 'Производитель',
  // Company fields
  is_own: 'Наша / чужая орг.', inn: 'ИНН',
  // Location fields
  area: 'Площадь', purpose: 'Назначение', cadastral_number: 'Кадастровый №',
  // Order fields
  order_type: 'Тип приказа', order_number: 'Номер приказа', order_date: 'Дата приказа',
  // Virtual equipment fields (available through contract rent_objects)
  eq_name: 'Оборудование', eq_category: 'Категория оборудования',
  eq_status: 'Статус оборудования',
  eq_inv_number: 'Инв. № оборудования', eq_manufacturer: 'Производитель оборудования',
};

// All document types shown in pivot pool
var _PIVOT_DOC_TYPES = ['contract', 'supplement', 'order', 'document'];

function updatePivotFieldPool() {
  var pool = document.getElementById('pivotFieldPool');
  if (!pool) return;
  var inZones = _pivotRowFields.concat(_pivotColFields).map(function(f) { return f.name; });

  function makeChip(f) {
    var label = _pivotFieldLabels[f.name] || f.name_ru || f.name;
    if (inZones.indexOf(f.name) >= 0) return '';
    return '<div class="pivot-chip" draggable="true" data-field="' + f.name + '" data-label="' + label.replace(/"/g, '&quot;') + '" data-entity-type="' + (f.entity_type || '') + '" ondragstart="onPivotDragStart(event,this)">' + label + '</div>';
  }

  // Build groups per document type
  var groups = {};
  _PIVOT_DOC_TYPES.forEach(function(tn) { groups[tn] = []; });

  // Fields from DB (field_definitions table)
  _reportFields.forEach(function(f) {
    if (_pivotSkipFields.indexOf(f.name) >= 0) return;
    if (f.name.charAt(0) === '_') return;
    var t = f.entity_type;
    if (!t || _PIVOT_DOC_TYPES.indexOf(t) < 0) return;
    if (!groups[t].find(function(x) { return x.name === f.name; }))
      groups[t].push(f);
  });

  // Contract extra fields (from rent_objects + virtual equipment)
  var contractExtra = ['building','room','object_type','rent_monthly','contract_amount','advances',
    'completion_deadline','subject','service_subject','service_comment','duration_date','duration_text','tenant','equipment','vat_rate'];
  contractExtra.forEach(function(name) {
    if (!groups.contract.find(function(f) { return f.name === name; }))
      groups.contract.push({ name: name, name_ru: _pivotFieldLabels[name] || name, entity_type: 'contract' });
  });
  // Virtual equipment fields via contract rent_objects
  ['eq_name','eq_category','eq_status','eq_inv_number','eq_manufacturer'].forEach(function(name) {
    groups.contract.push({ name: name, name_ru: _pivotFieldLabels[name] || name, entity_type: 'contract' });
  });

  // Render grouped
  var html = '';
  _PIVOT_DOC_TYPES.forEach(function(tn) {
    var tObj = entityTypes.find(function(t) { return t.name === tn; });
    var chips = groups[tn].map(makeChip).join('');
    if (!chips.trim()) return;
    html += '<div style="margin-bottom:8px">';
    if (tObj) html += '<span style="font-size:10px;color:var(--text-muted);margin-right:4px;text-transform:uppercase;letter-spacing:0.5px">' + tObj.icon + ' ' + tObj.name_ru + '</span>';
    html += chips + '</div>';
  });
  pool.innerHTML = html || '<div style="color:var(--text-muted);font-size:12px;padding:4px">Нет полей</div>';
}

function onPivotDragStart(event, el) {
  _pivotDragField = { name: el.dataset.field, label: el.dataset.label, entity_type: el.dataset.entityType || '' };
  var parent = el.parentElement;
  _pivotDragSource = parent ? parent.id : 'pivotFieldPool';
  event.dataTransfer.effectAllowed = 'move';
}

function onPivotDragOver(event, zone) {
  event.preventDefault();
  zone.classList.add('drag-over');
}

function onPivotDragLeave(zone) {
  zone.classList.remove('drag-over');
}

function onPivotDrop(event, zone) {
  event.preventDefault();
  zone.classList.remove('drag-over');
  if (!_pivotDragField) return;

  var targetZone = zone.dataset.zone || 'pool'; // 'rows', 'cols', or 'pool'
  var field = _pivotDragField;
  _pivotDragField = null;
  _pivotDragSource = null;

  // Remove from wherever the field was before
  _pivotRowFields = _pivotRowFields.filter(function(f) { return f.name !== field.name; });
  _pivotColFields = _pivotColFields.filter(function(f) { return f.name !== field.name; });

  if (targetZone === 'rows') _pivotRowFields.push(field);
  else if (targetZone === 'cols') _pivotColFields.push(field);
  // pool: already removed above

  updatePivotZones();
}

function pivotRemoveChip(el) {
  var field = el.dataset.field;
  var zone = el.dataset.zone;
  if (zone === 'rows') _pivotRowFields = _pivotRowFields.filter(function(f) { return f.name !== field; });
  if (zone === 'cols') _pivotColFields = _pivotColFields.filter(function(f) { return f.name !== field; });
  updatePivotZones();
}

function updatePivotZones() {
  updatePivotFieldPool(); // sync pool (chips removed from zones reappear here)
  var rowZone = document.getElementById('pivotRowZone');
  var colZone = document.getElementById('pivotColZone');

  if (rowZone) {
    if (_pivotRowFields.length === 0) {
      rowZone.innerHTML = '<div class="pivot-zone-hint">Перетащите поле сюда</div>';
    } else {
      rowZone.innerHTML = _pivotRowFields.map(function(f) {
        return '<div class="pivot-chip pivot-chip-row" draggable="true" data-field="' + f.name + '" data-label="' + f.label + '" data-entity-type="' + (f.entity_type || '') + '" ondragstart="onPivotDragStart(event,this)">' +
          escapeHtml(f.label) +
          '<span class="pivot-chip-remove" data-field="' + f.name + '" data-zone="rows" onclick="pivotRemoveChip(this)">×</span></div>';
      }).join('');
    }
  }

  if (colZone) {
    if (_pivotColFields.length === 0) {
      colZone.innerHTML = '<div class="pivot-zone-hint">Перетащите поле сюда (необязательно)</div>';
    } else {
      colZone.innerHTML = _pivotColFields.map(function(f) {
        return '<div class="pivot-chip pivot-chip-col" draggable="true" data-field="' + f.name + '" data-label="' + f.label + '" data-entity-type="' + (f.entity_type || '') + '" ondragstart="onPivotDragStart(event,this)">' +
          escapeHtml(f.label) +
          '<span class="pivot-chip-remove" data-field="' + f.name + '" data-zone="cols" onclick="pivotRemoveChip(this)">×</span></div>';
      }).join('');
    }
  }
}

function _getPivotVal(props, field) {
  var v = props[field];
  if (v === undefined || v === null || v === '') return '—';
  // Boolean fields — render as human-readable
  if (field === 'is_own') {
    var bv = String(v).toLowerCase();
    return bv === 'true' ? 'Наша организация' : 'Контрагент';
  }
  return String(v);
}

var _pivotCellData = {}; // stored for drill-down clicks

// Numeric fields — show sum instead of count when used as columns
var _numericFieldNames = new Set(['contract_amount','advance_amount','rent_monthly','extra_services_cost','total_area','area','vat_rate','payment_date']);

function _isNumericField(name) {
  if (_numericFieldNames.has(name)) return true;
  var f = _reportFields.find(function(r) { return r.name === name; });
  return f && f.field_type === 'number';
}

// _fmtNum moved to core/utils.js


async function buildPivotTable() {
  var rowFields = _pivotRowFields;
  var colFields = _pivotColFields;
  if (rowFields.length === 0) { alert('Перетащите хотя бы одно поле в Строки'); return; }

  // Split columns: categorical (cross-tab) vs numeric (sum)
  var catCols = colFields.filter(function(f) { return !_isNumericField(f.name); });
  var numCols = colFields.filter(function(f) { return _isNumericField(f.name); });

  // Equipment mode: if any row/col field is equipment-related, show equipment items not documents
  var _eqFields = new Set(['eq_name','eq_category','eq_status','eq_inv_number','eq_manufacturer','equipment']);
  var equipmentMode = rowFields.concat(colFields).some(function(f) { return _eqFields.has(f.name); });
  var unitLabel = equipmentMode ? 'единиц оборудования' : 'документов';

  var resultsEl = document.getElementById('pivotResults');
  resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка данных...</div>';

  // Fetch all document types in parallel
  var allArrays = await Promise.all(
    _PIVOT_DOC_TYPES.map(function(tn) { return api('/entities?limit=2000&type=' + encodeURIComponent(tn)); })
  );
  var entities = [].concat.apply([], allArrays);

  // Expand rent_objects — keep original entity reference per row
  var rows = [];
  entities.forEach(function(e) {
    var props = Object.assign({}, e.properties || {});
    var ros = null;
    if (props.rent_objects) {
      try { ros = typeof props.rent_objects === 'string' ? JSON.parse(props.rent_objects) : props.rent_objects; } catch(ex) {}
    }
    if (ros && Array.isArray(ros) && ros.length > 0) {
      ros.forEach(function(ro) {
        var merged = Object.assign({}, props, ro);
        // Enrich with equipment entity fields (virtual eq_* fields)
        // Enrich with room entity fields
        if (ro.room_id) {
          var rm = _getRoomById(ro.room_id);
          if (rm) {
            var rp = rm.properties || {};
            if (!merged.room) merged.room = rm.name || '';
            if (!merged.area && rp.area) merged.area = rp.area;
            if (!merged.object_type && rp.room_type) merged.object_type = rp.room_type;
            if (!merged.room_type) merged.room_type = rp.room_type || '';
            if (!merged.building) {
              var _bld = _getRoomBuilding(rm);
              if (_bld) merged.building = _bld;
            }
          }
        }
        if (ro.equipment_id) {
          var eq = _equipment.find(function(x) { return x.id === parseInt(ro.equipment_id); });
          if (eq) {
            merged.eq_name = eq.name || '';
            var ep = eq.properties || {};
            merged.eq_category = ep.equipment_category || '';
            merged.eq_status   = ep.status || '';
            merged.eq_inv_number  = ep.inv_number || '';
            merged.eq_manufacturer = ep.manufacturer || '';
          }
        }
        rows.push({ props: merged, entity: e });
      });
    } else {
      rows.push({ props: props, entity: e });
    }
  });

  if (rows.length === 0) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Нет данных выбранного типа</div>';
    return;
  }

  var rowKeyMap = new Map();
  var catColKeyMap = new Map();
  var cells = {};  // cells[rk][catKey] = [entities...]
  var sums = {};   // sums[rk][fieldName] = total sum

  rows.forEach(function(row) {
    var rk = rowFields.map(function(f) { return _getPivotVal(row.props, f.name); }).join(' / ');
    var catKey = catCols.length > 0
      ? catCols.map(function(f) { return _getPivotVal(row.props, f.name); }).join(' / ')
      : '__total__';
    rowKeyMap.set(rk, rk);
    if (catCols.length > 0) catColKeyMap.set(catKey, catKey);

    if (!cells[rk]) cells[rk] = {};
    if (!cells[rk][catKey]) cells[rk][catKey] = [];
    if (equipmentMode) {
      // In equipment mode: store the equipment entity, not the document
      var eqId = parseInt(row.props.equipment_id);
      if (eqId) {
        var eqEnt = _equipment.find(function(x) { return x.id === eqId; });
        if (eqEnt && !cells[rk][catKey].find(function(x) { return x.id === eqEnt.id; }))
          cells[rk][catKey].push(eqEnt);
      }
    } else {
      if (!cells[rk][catKey].find(function(x) { return x.id === row.entity.id; }))
        cells[rk][catKey].push(row.entity);
    }

    // Accumulate numeric sums
    if (!sums[rk]) sums[rk] = {};
    numCols.forEach(function(f) {
      var v = parseFloat((row.props[f.name] || '').toString().replace(/s/g,'').replace(',','.')) || 0;
      sums[rk][f.name] = (sums[rk][f.name] || 0) + v;
    });
  });

  var sortedRows = Array.from(rowKeyMap.keys()).sort(function(a, b) { return a.localeCompare(b, 'ru'); });
  var sortedCatCols = catCols.length > 0 ? Array.from(catColKeyMap.keys()).sort(function(a, b) { return a.localeCompare(b, 'ru'); }) : [];

  _pivotCellData = { rows: sortedRows, cols: sortedCatCols, cells: cells };

  var rowLabel = rowFields.map(function(f) { return f.label; }).join(' / ');
  var totalEntities = entities.length;
  var hasNum = numCols.length > 0;
  var hasCat = catCols.length > 0;

  var html = '<div class="detail-section" style="overflow-x:auto">';
  html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">' +
    totalEntities + ' ' + unitLabel.toLowerCase() + ' · ' + sortedRows.length + ' строк' +
    (sortedCatCols.length > 0 ? ' · ' + sortedCatCols.length + ' столбцов' : '') +
    (hasNum ? '' : ' <span style="opacity:0.6">— нажмите на цифру чтобы увидеть список</span>') + '</div>';
  html += '<table class="pivot-table">';

  // Header
  html += '<thead><tr><th>' + escapeHtml(rowLabel) + '</th>';
  sortedCatCols.forEach(function(ck) { html += '<th>' + escapeHtml(ck) + '</th>'; });
  numCols.forEach(function(f) { html += '<th>' + escapeHtml(f.label) + ', руб.</th>'; });
  if (!hasNum || hasCat) html += '<th>Итого, ' + escapeHtml(unitLabel.toLowerCase()) + '</th>';
  html += '</tr></thead>';

  // Body
  var grandCount = 0;
  var catColTotals = {};
  var numColTotals = {};
  html += '<tbody>';
  sortedRows.forEach(function(rk, ri) {
    var rowCells = cells[rk] || {};
    var rowCount = Object.values(rowCells).reduce(function(s, arr) { return s + arr.length; }, 0);
    grandCount += rowCount;
    html += '<tr><td><strong>' + escapeHtml(rk) + '</strong></td>';

    // Categorical columns (count)
    sortedCatCols.forEach(function(ck, ci) {
      var arr = rowCells[ck] || [];
      var v = arr.length;
      catColTotals[ck] = (catColTotals[ck] || 0) + v;
      html += v > 0
        ? '<td class="cell-value" data-ri="' + ri + '" data-ci="' + ci + '" onclick="showPivotCellDetail(this)">' + v + '</td>'
        : '<td class="cell-empty">—</td>';
    });

    // Numeric columns (sum)
    numCols.forEach(function(f) {
      var s = sums[rk] ? (sums[rk][f.name] || 0) : 0;
      numColTotals[f.name] = (numColTotals[f.name] || 0) + s;
      html += s > 0
        ? '<td style="text-align:right;font-weight:600;color:var(--accent)">' + _fmtNum(s) + '</td>'
        : '<td class="cell-empty">—</td>';
    });

    if (!hasNum || hasCat) {
      html += '<td class="row-total" data-ri="' + ri + '" data-ci="-1" onclick="showPivotCellDetail(this)" style="cursor:pointer">' + rowCount + '</td>';
    }
    html += '</tr>';
  });
  html += '</tbody>';

  // Footer
  html += '<tfoot><tr><th>Итого</th>';
  sortedCatCols.forEach(function(ck) { html += '<th>' + (catColTotals[ck] || 0) + '</th>'; });
  numCols.forEach(function(f) {
    html += '<th style="text-align:right">' + _fmtNum(numColTotals[f.name] || 0) + '</th>';
  });
  if (!hasNum || hasCat) html += '<th>' + grandCount + '</th>';
  html += '</tr></tfoot>';

  html += '</table></div>';
  html += '<div id="pivotDrillDown" style="margin-top:8px"></div>';
  resultsEl.innerHTML = html;
}

function showPivotCellDetail(el) {
  var ri = parseInt(el.dataset.ri);
  var ci = parseInt(el.dataset.ci);
  var rk = _pivotCellData.rows[ri];
  var allCols = _pivotCellData.cols;

  var entityList = [];
  if (ci === -1) {
    // Row total: collect all entities in this row
    var rowCells = _pivotCellData.cells[rk] || {};
    Object.values(rowCells).forEach(function(arr) {
      arr.forEach(function(e) { if (!entityList.find(function(x){ return x.id===e.id; })) entityList.push(e); });
    });
  } else {
    var ck = allCols[ci];
    entityList = (_pivotCellData.cells[rk] && _pivotCellData.cells[rk][ck]) ? _pivotCellData.cells[rk][ck] : [];
    if (allCols.length === 0) {
      // No columns, just row total
      var rowCells2 = _pivotCellData.cells[rk] || {};
      Object.values(rowCells2).forEach(function(arr) {
        arr.forEach(function(e) { if (!entityList.find(function(x){return x.id===e.id;})) entityList.push(e); });
      });
    }
  }

  var colLabel = ci >= 0 && allCols[ci] ? ' · ' + escapeHtml(allCols[ci]) : '';
  var html = '<div class="detail-section">';
  html += '<h3>' + escapeHtml(rk) + colLabel + ' <span style="font-size:13px;font-weight:400;color:var(--text-muted)">(' + entityList.length + ')</span></h3>';
  entityList.forEach(function(e) {
    html += '<div class="child-card" onclick="showEntity(' + e.id + ')" style="cursor:pointer;padding:8px 12px;margin-bottom:4px;display:flex;align-items:center;gap:8px">';
    html += entityIcon(e.type_name || 'contract');
    html += '<span style="font-weight:500">' + escapeHtml(e.name) + '</span>';
    var p = e.properties || {};
    var tags = [];
    if (p.contract_date) tags.push(p.contract_date);
    if (p.contract_amount) tags.push(p.contract_amount + ' р.');
    if (p.status) tags.push(p.status);
    if (tags.length) html += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + escapeHtml(tags.join(' · ')) + '</span>';
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('pivotDrillDown').innerHTML = html;
  document.getElementById('pivotDrillDown').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
`;
