/* eslint-disable */
module.exports = `
// ── Equipment Card ────────────────────────────────────────────────────────────

var _EQ_STATUS_STYLE = {
  'В работе':         { color: 'var(--success)',     bg: 'rgba(34,197,94,.1)'  },
  'На ремонте':       { color: 'var(--warning)',     bg: 'rgba(234,179,8,.1)'  },
  'Законсервировано': { color: 'var(--text-muted)',  bg: 'var(--bg-secondary)' },
  'Списано':          { color: 'var(--danger)',       bg: 'rgba(239,68,68,.08)' },
};

function renderEquipmentCard(e) {
  var p = e.properties || {};
  var id = e.id;
  var rels = e.relations || [];

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

  // Contracts this equipment is used in
  var contracts = rels.filter(function(r) {
    return r.relation_type === 'subject_of' && r.from_entity_id === id && r.to_type_name === 'contract';
  });

  // Acts (work performed on this equipment)
  var acts = rels.filter(function(r) {
    return r.relation_type === 'subject_of' && r.from_entity_id === id && r.to_type_name === 'act';
  });

  var h = '<div style="max-width:860px">';

  // ── Header ─────────────────────────────────────────────────────────────────
  h += '<div style="margin-bottom:20px">';
  h += '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:8px">';
  h += '<h2 style="font-size:1.25rem;font-weight:700;margin:0;line-height:1.35;flex:1;min-width:0">' + escapeHtml(e.name) + '</h2>';
  h += '</div>';

  // Badges row
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
  if (price !== null && !isNaN(price)) infoRows.push(['Стоимость',  _fmtNum(price) + ' \u20bd']);
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
      var borderB = isLast && !isOdd ? '' : ';border-bottom:1px solid var(--border)';
      if (isOdd) {
        // Odd last row — span full width
        h += '<div style="display:flex;gap:8px;padding:9px 14px;grid-column:1/-1;background:' + (i%2===0?'var(--bg-primary)':'var(--bg-hover)') + borderB + '">'
           + '<span style="font-size:12px;color:var(--text-muted);min-width:130px;flex-shrink:0">' + row[0] + '</span>'
           + '<span style="font-size:13px;font-weight:500">' + row[1] + '</span>'
           + '</div>';
      } else {
        h += '<div style="display:flex;gap:8px;padding:9px 14px;background:' + (i%2===0?'var(--bg-primary)':'var(--bg-hover)') + borderB + '">'
           + '<span style="font-size:12px;color:var(--text-muted);min-width:110px;flex-shrink:0">' + row[0] + '</span>'
           + '<span style="font-size:13px;font-weight:500">' + row[1] + '</span>'
           + '</div>';
      }
    });
    h += '</div>';
  }

  // ── Components ─────────────────────────────────────────────────────────────
  if (components.length > 0) {
    h += '<div style="margin-bottom:20px">';
    h += '<div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Компоненты (' + components.length + ')</div>';
    h += '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    components.forEach(function(r, i) {
      var compSt = '';
      var borderB = i < components.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
      h += '<div style="' + borderB + 'padding:8px 14px;display:flex;align-items:center;gap:10px">';
      h += '<span style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;display:inline-block"></span>';
      h += '<a href="#" data-eid="' + r.from_entity_id + '" onclick="showEntity(parseInt(this.dataset.eid));return false"'
         + ' style="font-size:13px;color:var(--accent);text-decoration:none">'
         + escapeHtml(r.from_name) + '</a>';
      if (r.from_type_ru) h += '<span style="font-size:11px;color:var(--text-muted);margin-left:auto">' + escapeHtml(r.from_type_ru) + '</span>';
      h += '</div>';
    });
    h += '</div>';
    h += '</div>';
  }

  // ── Contracts ──────────────────────────────────────────────────────────────
  if (contracts.length > 0) {
    h += '<div style="margin-bottom:20px">';
    h += '<div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Договоры (' + contracts.length + ')</div>';
    h += '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    contracts.forEach(function(r, i) {
      var borderB = i < contracts.length - 1 ? 'border-bottom:1px solid var(--border);' : '';
      h += '<div style="' + borderB + 'padding:8px 14px;display:flex;align-items:center;gap:10px">';
      h += '<i data-lucide="file-text" class="lucide" style="width:14px;height:14px;color:var(--text-muted);flex-shrink:0"></i>';
      h += '<a href="#" data-eid="' + r.to_entity_id + '" onclick="showEntity(parseInt(this.dataset.eid));return false"'
         + ' style="font-size:13px;color:var(--accent);text-decoration:none">'
         + escapeHtml(r.to_name) + '</a>';
      h += '</div>';
    });
    h += '</div>';
    h += '</div>';
  }

  // ── Acts (work history summary) ────────────────────────────────────────────
  if (acts.length > 0) {
    h += '<div style="margin-bottom:20px">';
    h += '<div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Акты выполненных работ (' + acts.length + ')</div>';
    h += '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    acts.slice(0, 5).forEach(function(r, i) {
      var borderB = i < Math.min(acts.length, 5) - 1 ? 'border-bottom:1px solid var(--border);' : '';
      h += '<div style="' + borderB + 'padding:8px 14px;display:flex;align-items:center;gap:10px">';
      h += '<i data-lucide="clipboard-check" class="lucide" style="width:14px;height:14px;color:var(--text-muted);flex-shrink:0"></i>';
      h += '<a href="#" data-eid="' + r.to_entity_id + '" onclick="showEntity(parseInt(this.dataset.eid));return false"'
         + ' style="font-size:13px;color:var(--accent);text-decoration:none">'
         + escapeHtml(r.to_name) + '</a>';
      h += '</div>';
    });
    if (acts.length > 5) {
      h += '<div style="padding:8px 14px;font-size:12px;color:var(--text-muted)">...ещё ' + (acts.length - 5) + '</div>';
    }
    h += '</div>';
    h += '</div>';
  }

  // ── Note ───────────────────────────────────────────────────────────────────
  if (note) {
    h += '<div style="margin-bottom:20px;padding:12px 14px;background:var(--bg-secondary);border-radius:8px;border-left:3px solid var(--border)">';
    h += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;font-weight:600">ПРИМЕЧАНИЕ</div>';
    h += '<div style="font-size:13px;white-space:pre-wrap">' + escapeHtml(note) + '</div>';
    h += '</div>';
  }

  h += '</div>'; // max-width wrapper
  return h;
}
`;
