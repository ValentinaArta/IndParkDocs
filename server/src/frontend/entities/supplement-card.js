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
  // Тип договора: наследуется от родителя
  var contractType = supp.effective_contract_type || sp.contract_type || pp.contract_type || '';
  var isRental = (contractType === 'Аренды' || contractType === 'Субаренды' || contractType === 'Аренда оборудования');

  var h = '';

  // ── Header ─────────────────────────────────────────────────────────────────
  var _hdrRels = supp.relations || [];
  var _hdrParRels = (supp.parent && supp.parent.relations) ? supp.parent.relations : [];
  var contractorName = (function() {
    var r = _hdrRels.find(function(x) { return x.relation_type === 'contractor' && x.from_entity_id === supp.id; });
    if (r) return r.to_name || '';
    var rp = _hdrParRels.find(function(x) { return x.relation_type === 'contractor' && x.from_entity_id === supp.parent_id; });
    return rp ? (rp.to_name || '') : '';
  })();
  var titleParts = [];
  if (contractorName) titleParts.push(contractorName);
  if (sp.number) titleParts.push('ДС №' + sp.number);
  if (sp.contract_date) titleParts.push(_ccFmtDate(sp.contract_date));
  h += '<div style="margin-bottom:20px">';
  h += '<h2 style="font-size:1.3rem;font-weight:700;margin:0 0 4px">' + escapeHtml(titleParts.join(', ') || supp.name || '') + '</h2>';
  h += '<span style="font-size:13px;color:var(--text-secondary)">Доп. соглашение' + (contractType ? ' к договору ' + escapeHtml(contractType) : '') + '</span>';
  h += '</div>';

  // ── Link to parent contract ─────────────────────────────────────────────────
  if (supp.parent_id) {
    var parentName = (supp.parent && supp.parent.name) ? supp.parent.name : ('Договор #' + supp.parent_id);
    h += '<div style="margin-bottom:14px;padding:8px 12px;background:var(--bg-secondary);border-radius:6px;font-size:13px;display:flex;align-items:center;gap:8px">';
    h += '<span style="color:var(--text-muted)">⬆ Основной договор:</span> ';
    h += '<a href="#" onclick="showEntity(' + supp.parent_id + ');return false" style="color:var(--accent);font-weight:600">' + escapeHtml(parentName) + '</a>';
    h += '</div>';
  }

  // ── Стороны (из typed relations → ДС или родительский договор) ──────────────
  var ourLabel = sp.our_role_label || pp.our_role_label || (isRental ? 'Арендодатель' : 'Наше юр. лицо');
  var contrLabel = sp.contractor_role_label || pp.contractor_role_label || (isRental ? 'Арендатор' : 'Контрагент');
  // Resolve company names from relations (source of truth)
  var _suppRels = supp.relations || [];
  var _parentRels = (supp.parent && supp.parent.relations) ? supp.parent.relations : [];
  function _relName(rels, eid, rtype) {
    var r = rels.find(function(x) { return x.relation_type === rtype && x.from_entity_id === eid; });
    return r ? (r.to_name || '') : '';
  }
  var ourEntity = _relName(_suppRels, supp.id, 'our_entity') || _relName(_parentRels, supp.parent_id, 'our_entity') || '';
  var contrName = _relName(_suppRels, supp.id, 'contractor') || _relName(_parentRels, supp.parent_id, 'contractor') || '';
  var subName = _relName(_suppRels, supp.id, 'subtenant') || _relName(_parentRels, supp.parent_id, 'subtenant') || '';
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

  // ── Общие поля (для всех типов, если заполнены в ДС) ──────────────────────
  var infoRows = [];
  if (sp.contract_date)    infoRows.push({ label: 'Дата подписания', val: _ccFmtDate(sp.contract_date) });
  var _effAmount = sp.contract_amount || pp.contract_amount || '';
  if (_effAmount) infoRows.push({ label: 'Сумма договора', val: _ccFmtNum(_effAmount) + ' \\u20BD' });
  var durStr = sp.contract_end_date
    ? ('до ' + _ccFmtDate(sp.contract_end_date))
    : (sp.duration_date ? ('до ' + _ccFmtDate(sp.duration_date)) : sp.duration_text || '');
  if (durStr) infoRows.push({ label: 'Срок действия', val: durStr });
  if (infoRows.length > 0) {
    h += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px;font-size:14px">';
    infoRows.forEach(function(r) {
      h += '<div><span style="color:var(--text-secondary)">' + r.label + ':</span> <strong>' + escapeHtml(r.val) + '</strong></div>';
    });
    h += '</div>';
  }

  // ── Предмет / корпус (Подряда, Услуг, Обслуживания, Купли-продажи) ─────────
  var subject = sp.subject || sp.service_subject || pp.subject || pp.service_subject || '';
  if (subject) {
    h += '<div style="margin-bottom:12px;font-size:14px"><span style="color:var(--text-secondary)">Предмет:</span> ' + escapeHtml(subject) + '</div>';
  }
  var _building = sp.building || pp.building || '';
  if (_building) {
    h += '<div style="margin-bottom:12px;font-size:14px"><span style="color:var(--text-secondary)">Корпус:</span> ' + escapeHtml(_building) + '</div>';
  }

  // ── Перечень работ / услуг / товаров (из ДС или из родительского договора) ──
  console.log('[SUPP-CARD] sp.contract_items:', sp.contract_items, 'pp.contract_items:', pp.contract_items, 'pp keys:', Object.keys(pp).join(','), 'supp.parent:', supp.parent ? 'exists' : 'MISSING', 'parent.props:', supp.parent ? JSON.stringify(Object.keys(supp.parent.properties || {})) : 'N/A');
  var _ciRaw = sp.contract_items || (pp.contract_items || null);
  var _ciSource = sp.contract_items ? null : (supp.parent ? supp.parent.name : null);
  if (_ciRaw) {
    var contractItems = [];
    if (Array.isArray(_ciRaw)) contractItems = _ciRaw;
    else { try { contractItems = JSON.parse(_ciRaw); } catch(ex) {} }
    if (contractItems.length > 0) {
      var isSale = (contractType === 'Купли-продажи');
      h += '<div style="margin-bottom:16px">';
      h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);letter-spacing:.5px;margin-bottom:8px;text-transform:uppercase">';
      h += isSale ? 'Перечень товаров' : (contractType === 'Услуг' ? 'Перечень услуг' : 'Перечень позиций');
      if (_ciSource) h += ' <span style="font-weight:400;font-size:12px;text-transform:none">(из ' + escapeHtml(_ciSource) + ')</span>';
      h += '</div>';
      h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      h += '<thead><tr style="background:#4F6BCC;color:#fff">';
      h += '<th style="padding:7px 10px;text-align:left;border-radius:4px 0 0 4px">Наименование</th>';
      h += '<th style="padding:7px 10px;text-align:right">Кол-во</th>';
      h += '<th style="padding:7px 10px;text-align:right">Цена</th>';
      h += '<th style="padding:7px 10px;text-align:right;border-radius:0 4px 4px 0">Сумма</th>';
      h += '</tr></thead><tbody>';
      var ciTotal = 0;
      contractItems.forEach(function(ci, i) {
        var qty = parseFloat(ci.qty || ci.quantity) || 0;
        var price = parseFloat(ci.price || ci.unit_price) || 0;
        var sum = parseFloat(ci.amount || ci.sum) || (qty * price);
        ciTotal += sum;
        var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
        h += '<tr style="' + bg + '">';
        h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(ci.name || ci.description || '—') + '</td>';
        h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right">' + (qty || '—') + '</td>';
        h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right">' + (price ? _ccFmtNum(price) : '—') + '</td>';
        h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:500">' + (sum ? _ccFmtNum(sum) : '—') + '</td>';
        h += '</tr>';
      });
      if (ciTotal > 0) {
        h += '<tr style="font-weight:600"><td style="padding:6px 10px">Итого</td><td></td><td></td><td style="padding:6px 10px;text-align:right">' + _ccFmtNum(ciTotal) + ' руб.</td></tr>';
      }
      h += '</tbody></table></div>';
    }
  }

  // ── Переданное оборудование (collapsible) ──────────────────────────────────
  var _eqList = supp._equipment || [];
  if (_eqList.length > 0) {
    var _eqFromP = supp._equipmentFromParent ? ' <span style="font-size:11px;font-weight:400;color:var(--text-secondary)">(из договора)</span>' : '';
    h += '<div style="margin-bottom:12px;border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    h += '<div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\\x27none\\x27?\\x27block\\x27:\\x27none\\x27;this.querySelector(\\x27span:last-child\\x27).textContent=this.nextElementSibling.style.display===\\x27none\\x27?\\x27\\u25BC\\x27:\\x27\\u25B2\\x27" ';
    h += 'style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;cursor:pointer;font-weight:600;font-size:14px;background:var(--bg-secondary)">';
    h += '<span>Переданное оборудование (' + _eqList.length + ')' + _eqFromP + '</span><span>\\u25BC</span></div>';
    h += '<div style="display:none;padding:8px 14px">';
    _eqList.forEach(function(eq) {
      h += '<div style="padding:4px 0;font-size:13px;border-bottom:1px solid var(--border)">' + escapeHtml(eq.name || eq) + '</div>';
    });
    h += '</div></div>';
  }

  // ── Условия аренды (Аренды / Субаренды) ────────────────────────────────────
  if (sp.rent_objects) {
    var rentObjs = [];
    if (Array.isArray(sp.rent_objects)) rentObjs = sp.rent_objects;
    else { try { rentObjs = JSON.parse(sp.rent_objects); } catch(ex) {} }
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
        var isLP = (ro.object_type === 'ЗУ' || ro.object_type === 'Земельный участок');
        var objName = isLP
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

  // ── Доп. услуги (Аренды / Субаренды) ───────────────────────────────────────
  var hasExtra = (sp.extra_services === 'true' || sp.extra_services === true);
  if (hasExtra && (sp.extra_services_desc || sp.extra_services_cost)) {
    h += '<div style="margin-bottom:12px;padding:8px 12px;background:var(--bg-secondary);border-radius:6px;font-size:13px">';
    h += '<span style="color:var(--text-secondary);font-weight:600">Доп. услуги:</span> ';
    if (sp.extra_services_desc) h += escapeHtml(sp.extra_services_desc);
    if (sp.extra_services_cost) h += ' — <strong>' + _ccFmtNum(sp.extra_services_cost) + ' руб./мес.</strong>';
    h += '</div>';
  }

  // ── Аренда оборудования (equipment_rent_items) ──────────────────────────────
  if (sp.equipment_rent_items) {
    var rentItems = [];
    try { rentItems = JSON.parse(sp.equipment_rent_items); } catch(ex) {}
    if (rentItems.length > 0) {
      h += '<div style="margin-bottom:16px">';
      h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);letter-spacing:.5px;margin-bottom:8px;text-transform:uppercase">Предметы аренды</div>';
      h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      h += '<thead><tr style="background:#4F6BCC;color:#fff">';
      h += '<th style="padding:7px 10px;text-align:left;border-radius:4px 0 0 4px">Оборудование</th>';
      h += '<th style="padding:7px 10px;text-align:right">Кол-во</th>';
      h += '<th style="padding:7px 10px;text-align:right;border-radius:0 4px 4px 0">Ставка (руб/мес)</th>';
      h += '</tr></thead><tbody>';
      var rentTotal = 0;
      rentItems.forEach(function(ri, i) {
        _enrichFromRegistry(ri);
        var eqName = ri.equipment_name || ri.name || '—';
        var qty = parseFloat(ri.qty) || 1;
        var rate = parseFloat(ri.rent_cost || ri.rate || ri.rent_rate) || 0;
        rentTotal += rate * qty;
        var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
        h += '<tr style="' + bg + '">';
        h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(eqName) + '</td>';
        h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right">' + qty + '</td>';
        h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border);text-align:right">' + (rate ? _ccFmtNum(rate) : '—') + '</td>';
        h += '</tr>';
      });
      if (rentTotal > 0) {
        h += '<tr style="font-weight:600"><td style="padding:6px 10px">Итого</td><td></td><td style="padding:6px 10px;text-align:right">' + _ccFmtNum(rentTotal) + ' руб./мес.</td></tr>';
      }
      h += '</tbody></table></div>';
    }
  }

  // ── Передача оборудования (Аренды / Субаренды / Подряда / Обслуживания) ────
  var hasTransfer = (sp.transfer_equipment === 'true' || sp.transfer_equipment === true);
  var eqList = [];
  if (sp.equipment_list) {
    if (Array.isArray(sp.equipment_list)) eqList = sp.equipment_list;
    else { try { eqList = JSON.parse(sp.equipment_list); } catch(ex) {} }
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
      _enrichFromRegistry(eq); // гарантирует equipment_name, inv_number и остальные поля
      var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
      var eqName = eq.equipment_name || eq.name || '—';
      var invNum = eq.inv_number || '';
      h += '<tr style="' + bg + '">';
      h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(eqName) + '</td>';
      h += '<td style="padding:6px 10px;border-bottom:1px solid var(--border);color:var(--text-secondary)">' + escapeHtml(invNum || '—') + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
  }

  // Кнопка "+ ДС" намеренно убрана: ДС не может иметь своё ДС.

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
    // Загружаем оборудование (из ДС или родительского договора)
    try {
      var eqRes = await api('/entities/' + supp.id + '/equipment');
      supp._equipment = (eqRes && eqRes.equipment) ? eqRes.equipment : [];
      if (!supp._equipment.length && supp.parent_id) {
        var peqRes = await api('/entities/' + supp.parent_id + '/equipment');
        supp._equipment = (peqRes && peqRes.equipment) ? peqRes.equipment : [];
        supp._equipmentFromParent = true;
      }
    } catch(ex) { supp._equipment = []; }

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
