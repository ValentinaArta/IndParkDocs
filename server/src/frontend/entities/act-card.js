/* eslint-disable */
module.exports = `
// ── Act card ─────────────────────────────────────────────────────────────────
/**
 * Рендерит карточку акта (аналог renderContractCard).
 * @param {Object} act           - entity объект act
 * @param {Object} parentContract - опционально, родительский договор (для сторон)
 */
function renderActCard(act, parentContract) {
  var props = act.properties || {};
  var pp = (parentContract && parentContract.properties) ? parentContract.properties : {};
  // Resolve company names from parent contract's typed relations
  if (parentContract && parentContract.relations) {
    parentContract.relations.forEach(function(r) {
      if (r.relation_type === 'contractor' && !pp.contractor_name) pp.contractor_name = r.to_name || '';
      if (r.relation_type === 'our_entity' && !pp.our_legal_entity) pp.our_legal_entity = r.to_name || '';
    });
  }

  var h = '';

  // ── Header ─────────────────────────────────────────────────────────────────
  var actNum = props.act_number ? 'Акт \\u2116' + props.act_number : (act.name || 'Акт');
  var actDate = props.act_date ? ' от ' + _ccFmtDate(props.act_date) : '';
  h += '<div style="margin-bottom:16px">';
  h += '<h2 style="font-size:1.3rem;font-weight:700;margin:0 0 6px;line-height:1.3">' + escapeHtml(actNum + actDate) + '</h2>';
  var badges = '';
  if (props.doc_status) badges += _docStatusBadge(props.doc_status) + ' ';
  var parentContractType = pp.contract_type || '';
  if (parentContractType) badges += '<span style="font-size:12px;color:var(--text-muted);padding:2px 8px;border:1px solid var(--border);border-radius:10px">' + escapeHtml(parentContractType) + '</span> ';
  if (badges) h += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:4px">' + badges + '</div>';
  h += '</div>';

  // ── Ссылка на родительский договор ────────────────────────────────────────
  if (act.parent_id) {
    var parentName = (parentContract && parentContract.name) ? parentContract.name : (props.parent_contract_name || ('Договор #' + act.parent_id));
    h += '<div style="margin-bottom:14px;padding:8px 12px;background:var(--bg-secondary);border-radius:6px;font-size:13px;display:flex;align-items:center;gap:8px">';
    h += '<span style="color:var(--text-muted)">Договор-основание:</span> ';
    h += '<a href="#" onclick="showEntity(' + act.parent_id + ');return false" style="color:var(--accent);font-weight:600">' + escapeHtml(parentName) + '</a>';
    h += '</div>';
  }

  // ── Стороны ────────────────────────────────────────────────────────────────
  var ourEntity = pp.our_legal_entity || props.our_legal_entity || '';
  var contrName = pp.contractor_name  || props.contractor_name  || '';
  var ourLabel  = pp.our_role_label   || (parentContractType === 'Аренды' || parentContractType === 'Субаренды' ? 'Арендодатель' : 'Заказчик');
  var contrLabel = pp.contractor_role_label || (parentContractType === 'Аренды' || parentContractType === 'Субаренды' ? 'Арендатор' : 'Исполнитель');
  if (ourEntity || contrName) {
    h += '<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:20px;font-size:14px">';
    if (ourEntity) h += '<div><span style="color:var(--text-secondary)">' + escapeHtml(ourLabel) + ':</span> <strong>' + escapeHtml(ourEntity) + '</strong></div>';
    if (contrName) h += '<div><span style="color:var(--text-secondary)">' + escapeHtml(contrLabel) + ':</span> <strong>' + escapeHtml(contrName) + '</strong></div>';
    h += '</div>';
  }

  // ── Позиции акта ───────────────────────────────────────────────────────────
  var actItems = [];
  if (Array.isArray(props.act_items)) actItems = props.act_items;
  else { try { if (props.act_items) actItems = JSON.parse(props.act_items); } catch(ex) {} }

  if (actItems.length > 0) {
    h += '<div style="margin-bottom:20px">';
    h += '<div style="font-size:12px;font-weight:700;color:var(--text-secondary);letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px">Позиции акта</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    h += '<thead><tr style="background:#4F6BCC;color:#fff">';
    h += '<th style="padding:8px 10px;text-align:left;border-radius:4px 0 0 4px;font-weight:600">Оборудование</th>';
    h += '<th style="padding:8px 10px;text-align:right;font-weight:600;white-space:nowrap">Сумма, ₽</th>';
    h += '<th style="padding:8px 10px;text-align:left;border-radius:0 4px 4px 0;font-weight:600">Описание работ</th>';
    h += '</tr></thead><tbody>';
    var actTotal = 0;
    actItems.forEach(function(item, idx) {
      actTotal += parseFloat(item.amount) || 0;
      var eqName = item.name || item.equipment_name || '—';
      var rowBg = item.broken ? 'rgba(239,68,68,.06)' : (idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)');
      h += '<tr style="background:' + rowBg + ';border-bottom:1px solid var(--border)">';
      h += '<td style="padding:8px 10px">';
      if (item.equipment_id) {
        h += '<a href="#" onclick="showEntity(' + item.equipment_id + ');return false" style="color:var(--accent)">' + escapeHtml(eqName) + '</a>';
      } else {
        h += escapeHtml(eqName);
      }
      if (item.broken) h += ' <span style="font-size:11px;color:#dc2626;font-weight:600">[нерабочее]</span>';
      if (item.inv_number) h += '<div style="font-size:11px;color:var(--text-muted)">инв. ' + escapeHtml(item.inv_number) + '</div>';
      h += '</td>';
      h += '<td style="padding:8px 10px;text-align:right;font-weight:500;white-space:nowrap">' + _fmtNum(parseFloat(item.amount) || 0) + ' ₽</td>';
      h += '<td style="padding:8px 10px;color:var(--text-secondary);white-space:pre-wrap;font-size:12px">' + escapeHtml(item.description || '—') + '</td>';
      h += '</tr>';
    });
    h += '<tr style="font-weight:700;background:var(--bg-hover)">';
    h += '<td style="padding:8px 10px">Итого</td>';
    h += '<td style="padding:8px 10px;text-align:right;white-space:nowrap">' + _fmtNum(actTotal) + ' ₽</td>';
    h += '<td></td>';
    h += '</tr>';
    h += '</tbody></table></div>';
  }

  // ── Заключение ─────────────────────────────────────────────────────────────
  if (props.conclusion) {
    h += '<div style="margin-bottom:16px;padding:10px 14px;background:rgba(34,197,94,.07);border-left:3px solid #22c55e;border-radius:0 6px 6px 0">';
    h += '<div style="font-size:11px;font-weight:700;color:#16a34a;letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px">Заключение</div>';
    h += '<div style="font-size:14px;white-space:pre-wrap">' + escapeHtml(props.conclusion) + '</div>';
    h += '</div>';
  }

  // ── Дополнительные поля ────────────────────────────────────────────────────
  var metaRows = [];
  if (props.total_amount !== undefined && props.total_amount !== null && props.total_amount !== '') {
    var ta = parseFloat(props.total_amount);
    if (!isNaN(ta)) metaRows.push({ label: 'Итого по акту', val: _fmtNum(ta) + ' ₽' });
  }
  if (props.comment) metaRows.push({ label: 'Комментарий', val: props.comment });
  if (metaRows.length > 0) {
    h += '<div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:16px;">';
    metaRows.forEach(function(row) {
      h += '<div style="min-width:160px"><div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">' + escapeHtml(row.label) + '</div>';
      h += '<div style="font-size:14px;font-weight:500;white-space:pre-wrap">' + escapeHtml(String(row.val)) + '</div></div>';
    });
    h += '</div>';
  }

  return h;
}
`;
