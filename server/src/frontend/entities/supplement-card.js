module.exports = `

// ── Supplement card (аналог renderContractCard для ДС) ───────────────────────
/**
 * Рендерит карточку ДС.
 * @param {Object} supp - entity объект supplement
 * supp.parent — опционально, подгружается если доступен (для показа названия родит. договора)
 */
function renderSupplementCard(supp) {
  var sp = supp.properties || {};
  // Если поля сторон не заполнены на ДС — берём из родительского договора
  var pp = (supp.parent && supp.parent.properties) ? supp.parent.properties : {};
  var isRental = (sp.contract_type === 'Аренды' || sp.contract_type === 'Субаренды' || sp.contract_type === 'Аренда оборудования');

  var h = '';

  // ── Header ─────────────────────────────────────────────────────────────────
  var contractorName = sp.contractor_name || pp.contractor_name || '';
  var titleParts = [];
  if (contractorName) titleParts.push(contractorName);
  if (sp.number) titleParts.push('ДС №' + sp.number);
  if (sp.contract_date) titleParts.push(_ccFmtDate(sp.contract_date));
  h += '<div style="margin-bottom:20px">';
  h += '<h2 style="font-size:1.3rem;font-weight:700;margin:0 0 4px">' + escapeHtml(titleParts.join(', ') || supp.name || '') + '</h2>';
  h += '<span style="font-size:13px;color:var(--text-secondary)">Доп. соглашение' + (sp.contract_type ? ' к договору ' + escapeHtml(sp.contract_type) : '') + '</span>';
  h += '</div>';

  // ── Link to parent contract ─────────────────────────────────────────────────
  if (supp.parent_id) {
    var parentName = (supp.parent && supp.parent.name) ? supp.parent.name : ('Договор #' + supp.parent_id);
    h += '<div style="margin-bottom:14px;padding:8px 12px;background:var(--bg-secondary);border-radius:6px;font-size:13px;display:flex;align-items:center;gap:8px">';
    h += '<span style="color:var(--text-muted)">⬆ Основной договор:</span> ';
    h += '<a href="#" onclick="showEntity(' + supp.parent_id + ');return false" style="color:var(--accent);font-weight:600">' + escapeHtml(parentName) + '</a>';
    h += '</div>';
  }

  // ── Стороны (берём из ДС или из родительского договора) ───────────────────
  var ourLabel = sp.our_role_label || pp.our_role_label || (isRental ? 'Арендодатель' : 'Наше юр. лицо');
  var contrLabel = sp.contractor_role_label || pp.contractor_role_label || (isRental ? 'Арендатор' : 'Контрагент');
  var ourEntity = sp.our_legal_entity || pp.our_legal_entity || '';
  var contrName = sp.contractor_name || pp.contractor_name || '';
  var subName = sp.subtenant_name || pp.subtenant_name || '';
  if (ourEntity || contrName) {
    h += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;font-size:14px">';
    if (ourEntity) h += '<div><span style="color:var(--text-secondary)">' + escapeHtml(ourLabel) + ':</span> <strong>' + escapeHtml(ourEntity) + '</strong></div>';
    if (contrName) h += '<div><span style="color:var(--text-secondary)">' + escapeHtml(contrLabel) + ':</span> <strong>' + escapeHtml(contrName) + '</strong></div>';
    if (subName)   h += '<div><span style="color:var(--text-secondary)">Субарендатор:</span> <strong>' + escapeHtml(subName) + '</strong></div>';
    h += '</div>';
  }

  // ── Что изменилось ─────────────────────────────────────────────────────────
  if (sp.changes_description) {
    h += '<div style="margin-bottom:16px;padding:10px 14px;background:rgba(99,102,241,.07);border-left:3px solid var(--accent);border-radius:0 6px 6px 0">';
    h += '<div style="font-size:11px;font-weight:700;color:var(--accent);letter-spacing:.5px;margin-bottom:4px;text-transform:uppercase">Что изменилось</div>';
    h += '<div style="font-size:14px">' + escapeHtml(sp.changes_description) + '</div>';
    h += '</div>';
  }

  // ── Срок действия ──────────────────────────────────────────────────────────
  var durStr = sp.contract_end_date
    ? ('до ' + _ccFmtDate(sp.contract_end_date))
    : (sp.duration_date ? ('до ' + _ccFmtDate(sp.duration_date)) : sp.duration_text || '');
  if (durStr) {
    h += '<div style="margin-bottom:16px;font-size:14px"><span style="color:var(--text-secondary)">Срок действия:</span> <strong>' + escapeHtml(durStr) + '</strong></div>';
  }

  // ── Условия аренды (rent_objects) ─────────────────────────────────────────
  if (sp.rent_objects) {
    var rentObjs = [];
    try { rentObjs = JSON.parse(sp.rent_objects); } catch(ex) {}
    var validObjs = rentObjs.filter(function(ro) { return ro.object_type; });
    if (validObjs.length > 0) {
      h += '<div style="margin-bottom:16px">';
      h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);letter-spacing:.5px;margin-bottom:8px;text-transform:uppercase">Условия аренды</div>';
      h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      h += '<thead><tr style="background:#4F6BCC;color:#fff">';
      h += '<th style="padding:8px 10px;text-align:left;border-radius:4px 0 0 4px">Объект аренды</th>';
      h += '<th style="padding:8px 10px;text-align:right">Площадь, м²</th>';
      h += '<th style="padding:8px 10px;text-align:right;border-radius:0 4px 4px 0">Ставка (руб/м²/мес)</th>';
      h += '</tr></thead><tbody>';
      var totalMonthly = 0;
      validObjs.forEach(function(ro, i) {
        var isLandPlot = (ro.object_type === 'ЗУ' || ro.object_type === 'Земельный участок');
        var objName = isLandPlot
          ? (ro.land_plot_part_name || ro.land_plot_name || ro.room || ro.room_name || '—')
          : (ro.room || ro.room_name || ro.object_type || '—');
        var area = parseFloat(ro.area) || 0;
        var rate = parseFloat(ro.rent_rate) || 0;
        var monthly = ro.fixed_rent ? parseFloat(ro.fixed_rent) : (area * rate);
        totalMonthly += monthly || 0;
        var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
        h += '<tr style="' + bg + '">';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(objName) + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (area ? _ccFmtNum(area) : '—') + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (rate ? _ccFmtNum(rate) : '—') + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table>';
      if (totalMonthly > 0) {
        var vat = parseFloat(sp.vat_rate) || 0;
        var vatAmt = totalMonthly * vat / 100;
        h += '<div style="text-align:right;font-size:14px;font-weight:600;margin-top:8px">';
        h += 'Ежемесячный платёж: ' + _ccFmtNum(totalMonthly) + ' руб.';
        if (vat > 0) {
          h += '<div style="font-size:12px;color:var(--text-secondary);font-weight:400">в т.ч. НДС (' + vat + '%) = ' + _ccFmtNum(vatAmt) + ' руб.</div>';
        }
        h += '</div>';
      }
      h += '</div>';
    }
  }

  // ── Передача оборудования (Аренды / Субаренды / Подряда / Обслуживания) ────
  var hasTransfer = (sp.transfer_equipment === 'true' || sp.transfer_equipment === true);
  var eqList = [];
  if (sp.equipment_list) {
    try { eqList = JSON.parse(sp.equipment_list); } catch(ex) {}
  }
  if (eqList.length > 0) {
    var eqSectionLabel = hasTransfer ? 'Передаваемое оборудование' : 'Оборудование';
    h += '<div style="margin-bottom:16px">';
    h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);letter-spacing:.5px;margin-bottom:8px;text-transform:uppercase">' + eqSectionLabel + '</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    h += '<thead><tr style="background:#4F6BCC;color:#fff">';
    h += '<th style="padding:7px 10px;text-align:left;border-radius:4px 0 0 4px">Наименование</th>';
    h += '<th style="padding:7px 10px;text-align:left;border-radius:0 4px 4px 0">Инв. номер</th>';
    h += '</tr></thead><tbody>';
    eqList.forEach(function(eq, i) {
      var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
      var eqName = eq.equipment_name || eq.name || '—';
      if (!eq.equipment_name && eq.equipment_id && typeof _equipment !== 'undefined') {
        var found = (_equipment || []).find(function(e) { return e.id === parseInt(eq.equipment_id); });
        if (found) eqName = found.name;
      }
      // inv_number: сначала из JSON, затем из глобального _equipment по id
      var invNum = eq.inv_number || '';
      if (!invNum && eq.equipment_id && typeof _equipment !== 'undefined') {
        var foundEq = (_equipment || []).find(function(e) { return e.id === parseInt(eq.equipment_id); });
        if (foundEq) invNum = (foundEq.properties || {}).inv_number || '';
      }
      h += '<tr style="' + bg + '">';
      h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(eqName) + '</td>';
      h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border);color:var(--text-secondary)">' + escapeHtml(invNum || '—') + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
  }

  // ── Кнопка "+ ДС" ──────────────────────────────────────────────────────────
  if (supp.parent_id) {
    h += '<div style="margin-top:20px">';
    h += '<button class="btn btn-primary btn-sm" onclick="openCreateSupplementModal(' + supp.parent_id + ')">+ Доп. соглашение</button>';
    h += '</div>';
  }

  return h;
}


/** Открывает карточку ДС в модальном окне — использует renderSupplementCard (DRY) */
async function openSupplementCard(id) {
  showLoadingModal();
  try {
    var supp = await api('/entities/' + id);
    // Подгружаем родительский договор для отображения ссылки
    if (supp.parent_id && !supp.parent) {
      try { supp.parent = await api('/entities/' + supp.parent_id); } catch(ex) {}
    }

    var cardHtml = renderSupplementCard(supp);

    // Кнопки действий в модальном окне
    var actionsHtml = '<div style="margin-top:20px;display:flex;gap:8px;flex-wrap:wrap">';
    actionsHtml += '<button class="btn btn-primary btn-sm" onclick="closeModal();openEditModal(' + id + ')">✏ Редактировать</button>';
    actionsHtml += '<button class="btn btn-sm" onclick="closeModal();showEntity(' + id + ')">⚙ Полные детали</button>';
    if (supp.parent_id) {
      actionsHtml += '<button class="btn btn-sm" onclick="closeModal();showEntity(' + supp.parent_id + ')">← К договору</button>';
    }
    actionsHtml += '</div>';

    setModalContent(cardHtml + actionsHtml);
  } catch(err) {
    setModalContent('<div style="color:#dc2626;padding:20px">Ошибка: ' + escapeHtml(err.message || String(err)) + '</div>');
  }
}

`;
