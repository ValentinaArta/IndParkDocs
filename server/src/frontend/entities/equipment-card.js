/* eslint-disable */
module.exports = `
// ── Equipment Card ────────────────────────────────────────────────────────────

var _EQ_STATUS_STYLE = {
  'В работе':         { color: 'var(--success)',     bg: 'rgba(34,197,94,.1)'  },
  'На ремонте':       { color: 'var(--warning)',     bg: 'rgba(234,179,8,.1)'  },
  'Законсервировано': { color: 'var(--text-muted)',  bg: 'var(--bg-secondary)' },
  'Списано':          { color: 'var(--danger)',       bg: 'rgba(239,68,68,.08)' },
  'Аварийное':        { color: 'var(--danger)',       bg: 'rgba(239,68,68,.12)' },
};

var _EQ_CONTRACT_GROUPS = {
  supplier:    { label: 'Поставщик',                types: ['Купли-продажи'],                                          icon: 'truck' },
  tenant:      { label: 'Передано арендатору',       types: ['Аренды', 'Субаренды', 'Аренда оборудования'],              icon: 'key' },
  maintenance: { label: 'Обслуживающая организация', types: ['ТО и ППР', 'Обслуживания', 'Услуг', 'Электроснабжения'],  icon: 'wrench' },
  contractor:  { label: 'Подрядчик',                 types: ['Подряда', 'Работы/Подряда'],                               icon: 'hard-hat' },
};

function renderEquipmentCard(e) {
  var p = e.properties || {};
  var id = e.id;
  var rels = e.relations || [];
  var eqContracts = e.equipment_contracts || [];

  var status   = p.status || '';
  var category = p.equipment_category || '';
  var kind     = p.equipment_kind || '';
  var inv      = p.inv_number || '';
  var serial   = p.serial_number || '';
  var year     = p.year || '';
  var mfr      = p.manufacturer || '';
  var price    = p.purchase_price || p.purchase_price === 0 ? Number(p.purchase_price) : null;
  var note     = p.note || '';
  var balOwner = p.balance_owner_name || '';

  var st = _EQ_STATUS_STYLE[status] || { color: 'var(--text-secondary)', bg: 'var(--bg-secondary)' };

  // Components (equipment that is part_of this)
  var components = rels.filter(function(r) {
    return r.relation_type === 'part_of' && r.to_entity_id === id;
  });

  // Acts (work performed on this equipment — via subject_of → act)
  var acts = rels.filter(function(r) {
    return r.relation_type === 'subject_of' && r.from_entity_id === id && r.to_type_name === 'act';
  });

  // Group equipment_contracts by role, then deduplicate by root contract
  var contractsByGroup = {};
  eqContracts.forEach(function(c) {
    var ct = c.contract_type || '';
    var groupKey = 'other';
    Object.keys(_EQ_CONTRACT_GROUPS).forEach(function(key) {
      if (_EQ_CONTRACT_GROUPS[key].types.indexOf(ct) >= 0) groupKey = key;
    });
    if (!contractsByGroup[groupKey]) contractsByGroup[groupKey] = [];
    contractsByGroup[groupKey].push(c);
  });

  // Within each group: keep only latest doc per root contract + contractor
  Object.keys(contractsByGroup).forEach(function(gk) {
    var items = contractsByGroup[gk];
    var byRoot = {};
    items.forEach(function(c) {
      var rootKey = String(c.contract_parent_id || c.contract_id) + '_' + (c.contractor_name || '');
      if (!byRoot[rootKey]) { byRoot[rootKey] = c; return; }
      var prevDate = byRoot[rootKey].contract_date || '0000';
      var curDate = c.contract_date || '0000';
      if (curDate > prevDate) byRoot[rootKey] = c;
    });
    contractsByGroup[gk] = Object.keys(byRoot).map(function(k) { return byRoot[k]; });
  });

  var h = '<div style="max-width:860px">';

  // ── Header ─────────────────────────────────────────────────────────────────
  h += '<div style="margin-bottom:20px">';
  h += '<h2 style="font-size:1.25rem;font-weight:700;margin:0 0 8px;line-height:1.35">' + escapeHtml(e.name) + '</h2>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">';
  if (status) {
    h += '<span style="font-size:12px;font-weight:600;padding:3px 10px;border-radius:12px'
       + ';background:' + st.bg + ';color:' + st.color + '">'
       + '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + st.color
       + ';margin-right:5px;vertical-align:1px"></span>'
       + escapeHtml(status) + '</span>';
  }
  if (category) {
    h += '<span style="font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-secondary);color:var(--text-secondary);border:1px solid var(--border)">'
       + escapeHtml(category) + '</span>';
  }
  if (kind && kind !== category) {
    h += '<span style="font-size:12px;padding:3px 10px;border-radius:12px;background:var(--bg-secondary);color:var(--text-muted)">'
       + escapeHtml(kind) + '</span>';
  }
  h += '</div>';
  h += '</div>';

  // ── Main info grid ──────────────────────────────────────────────────────────
  var infoRows = [];
  if (inv)      infoRows.push(['Инв. номер',      escapeHtml(inv)]);
  if (serial)   infoRows.push(['Серийный номер',  escapeHtml(serial)]);
  if (year)     infoRows.push(['Год выпуска',     escapeHtml(year)]);
  if (mfr)      infoRows.push(['Производитель',   escapeHtml(mfr)]);
  if (price !== null && !isNaN(price)) infoRows.push(['Стоимость', _fmtNum(price) + ' \\u20bd']);
  if (balOwner) infoRows.push(['Балансодержатель', escapeHtml(balOwner)]);
  if (e.parent_name) infoRows.push(['Расположение', escapeHtml(e.parent_name)]);
  if (e.part_of_name) {
    infoRows.push(['Входит в состав',
      '<a href="#" data-eid="' + e.part_of_id + '" onclick="showEntity(parseInt(this.dataset.eid));return false"'
      + ' style="color:var(--accent)">' + escapeHtml(e.part_of_name) + '</a>'
    ]);
  }

  if (infoRows.length > 0) {
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:20px">';
    infoRows.forEach(function(row, i) {
      var isLast = i === infoRows.length - 1;
      var isOdd  = (infoRows.length % 2 !== 0) && isLast;
      var bg = i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-hover)';
      var borderB = (isLast && !isOdd) || (isOdd) ? '' : ';border-bottom:1px solid var(--border)';
      var span = isOdd ? ';grid-column:1/-1' : '';
      h += '<div style="display:flex;gap:8px;padding:9px 14px;background:' + bg + borderB + span + '">'
         + '<span style="font-size:12px;color:var(--text-muted);min-width:120px;flex-shrink:0">' + row[0] + '</span>'
         + '<span style="font-size:13px;font-weight:500">' + row[1] + '</span>'
         + '</div>';
    });
    h += '</div>';
  }

  // ── Contract-based sections ────────────────────────────────────────────────
  var groupOrder = ['supplier', 'tenant', 'maintenance', 'contractor', 'other'];
  groupOrder.forEach(function(groupKey) {
    var items = contractsByGroup[groupKey];
    if (!items || !items.length) return;
    var cfg = _EQ_CONTRACT_GROUPS[groupKey] || { label: 'Прочие договоры', icon: 'file-text' };
    h += _renderEqContractSection(cfg.label, cfg.icon, items);
  });

  // ── Components ─────────────────────────────────────────────────────────────
  if (components.length > 0) {
    h += '<div style="margin-bottom:20px">';
    h += '<div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">'
       + '<i data-lucide="git-branch" class="lucide" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"></i>'
       + 'Компоненты (' + components.length + ')</div>';
    h += '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    components.forEach(function(r, i) {
      var borderB = i < components.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
      h += '<div style="' + borderB + 'padding:8px 14px;display:flex;align-items:center;gap:10px">';
      h += '<span style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;display:inline-block"></span>';
      h += '<a href="#" data-eid="' + r.from_entity_id + '" onclick="showEntity(parseInt(this.dataset.eid));return false"'
         + ' style="font-size:13px;color:var(--accent);text-decoration:none">'
         + escapeHtml(r.from_name) + '</a>';
      h += '</div>';
    });
    h += '</div></div>';
  }

  // ── Work history (acts) ────────────────────────────────────────────────────
  if (acts.length > 0) {
    h += '<div style="margin-bottom:20px">';
    h += '<div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">'
       + '<i data-lucide="clipboard-check" class="lucide" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"></i>'
       + 'История работ (' + acts.length + ')</div>';
    h += '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    acts.forEach(function(r, i) {
      var borderB = i < acts.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
      h += '<div style="' + borderB + 'padding:8px 14px;display:flex;align-items:center;gap:10px">';
      h += '<a href="#" data-eid="' + r.to_entity_id + '" onclick="showEntity(parseInt(this.dataset.eid));return false"'
         + ' style="font-size:13px;color:var(--accent);text-decoration:none;flex:1">'
         + escapeHtml(r.to_name) + '</a>';
      h += '</div>';
    });
    h += '</div></div>';
  }

  // ── Note ───────────────────────────────────────────────────────────────────
  if (note) {
    h += '<div style="margin-bottom:20px;padding:12px 14px;background:var(--bg-secondary);border-radius:8px;border-left:3px solid var(--border)">';
    h += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;font-weight:600">ПРИМЕЧАНИЕ</div>';
    h += '<div style="font-size:13px;white-space:pre-wrap">' + escapeHtml(note) + '</div>';
    h += '</div>';
  }

  h += '</div>';
  return h;
}

// Helper: render a contract-group section
function _renderEqContractSection(label, icon, items) {
  var h = '<div style="margin-bottom:20px">';
  h += '<div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">'
     + '<i data-lucide="' + icon + '" class="lucide" style="width:13px;height:13px;vertical-align:-2px;margin-right:4px"></i>'
     + escapeHtml(label) + '</div>';
  h += '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">';

  items.forEach(function(c, i) {
    var borderB = i < items.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
    h += '<div style="' + borderB + 'padding:10px 14px">';

    // Row 1: contractor name (big) + contract type badge
    var company = c.contractor_name || c.our_entity_name || '';
    if (company) {
      h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">';
      if (c.contractor_id) {
        h += '<a href="#" data-eid="' + c.contractor_id + '" onclick="showEntity(parseInt(this.dataset.eid));return false"'
           + ' style="font-size:14px;font-weight:600;color:var(--accent);text-decoration:none">'
           + escapeHtml(company) + '</a>';
      } else {
        h += '<span style="font-size:14px;font-weight:600">' + escapeHtml(company) + '</span>';
      }
      if (c.contract_type) {
        h += '<span style="font-size:11px;padding:2px 7px;border-radius:10px;background:var(--bg-secondary);color:var(--text-muted);border:1px solid var(--border)">'
           + escapeHtml(c.contract_type) + '</span>';
      }
      h += '</div>';
    }

    // Row 2: contract link + date + status
    h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
    // If this is a supplement, show parent contract name first
    if (c.contract_parent_id && c.parent_contract_name) {
      h += '<span style="font-size:12px;color:var(--text-muted)">' + escapeHtml(c.parent_contract_name) + ' \\u2192</span>';
    }
    h += '<a href="#" data-eid="' + c.contract_id + '" onclick="showEntity(parseInt(this.dataset.eid));return false"'
       + ' style="font-size:13px;color:var(--accent);text-decoration:none">'
       + escapeHtml(c.contract_name) + '</a>';
    if (c.contract_date) {
      h += '<span style="font-size:12px;color:var(--text-muted)">' + _ccFmtDate(c.contract_date) + '</span>';
    }
    if (c.doc_status) {
      h += _docStatusBadge(c.doc_status);
    }
    if (c.rent_cost) {
      h += '<span style="font-size:12px;font-weight:600;color:var(--text-primary)">' + _fmtNum(Number(c.rent_cost)) + ' \\u20bd</span>';
    }
    h += '</div>';
    h += '</div>';
  });

  h += '</div></div>';
  return h;
}
`;
