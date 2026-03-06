module.exports = `
// ── Contract rental card ─────────────────────────────────────────────────────
function _ccFmtDate(d) { return d ? d.split('-').reverse().join('.') : '—'; }
function _ccFmtNum(v) { return v ? Number(v).toLocaleString('ru-RU', {maximumFractionDigits:2}) : '0'; }

function renderContractCard(data) {
  var h = '';
  var isRental = (data.contract_type === 'Аренды' || data.contract_type === 'Субаренды' || data.contract_type === 'Аренда оборудования');

  // ── Header ─────────────────────────────────────────────────────────────────
  var titleParts = [];
  if (data.contractor_name) titleParts.push(data.contractor_name);
  if (data.subtenant_name)  titleParts.push(data.subtenant_name);
  if (data.number)          titleParts.push('№' + data.number);
  if (data.date)            titleParts.push(_ccFmtDate(data.date));
  h += '<div style="margin-bottom:20px">';
  h += '<h2 style="font-size:1.3rem;font-weight:700;margin:0 0 6px">' + escapeHtml(titleParts.join(', ')) + '</h2>';
  h += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
  h += '<span style="font-size:13px;color:var(--text-secondary)">' + escapeHtml(data.contract_type || '') + '</span>';
  if (data.direction === 'income') {
    h += '<span style="background:#dcfce7;color:#166534;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600">🟢 Доход</span>';
  } else if (data.direction === 'expense') {
    h += '<span style="background:#fee2e2;color:#991b1b;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600">🔴 Расход</span>';
  }
  if (data.is_vgo) {
    h += '<span style="background:#eff6ff;color:#1d4ed8;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600">🔵 ВГО</span>';
  }
  if (data.doc_status) h += _docStatusBadge(data.doc_status);
  h += '</div>';
  h += '</div>';

  // ── Main info ──────────────────────────────────────────────────────────────
  h += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;font-size:14px">';
  // Стороны
  var ourLabel = data.our_role_label || (isRental ? 'Арендодатель' : 'Наше юр. лицо');
  var contrLabel = data.contractor_role_label || (isRental ? 'Арендатор' : 'Контрагент');
  if (data.our_legal_entity) {
    h += '<div><span style="color:var(--text-secondary)">' + escapeHtml(ourLabel) + ':</span> <strong>' + escapeHtml(data.our_legal_entity) + '</strong></div>';
  }
  if (data.contractor_name) {
    h += '<div><span style="color:var(--text-secondary)">' + escapeHtml(contrLabel) + ':</span> <strong>' + escapeHtml(data.contractor_name) + '</strong></div>';
  }
  if (data.subtenant_name) {
    h += '<div><span style="color:var(--text-secondary)">Субарендатор:</span> <strong>' + escapeHtml(data.subtenant_name) + '</strong></div>';
  }
  // Предмет
  if (data.subject) {
    h += '<div><span style="color:var(--text-secondary)">Предмет:</span> ' + escapeHtml(data.subject) + '</div>';
  }
  // Корпус (legacy text field for Подряда/Обслуживания)
  if (data.building) {
    h += '<div><span style="color:var(--text-secondary)">Корпус:</span> ' + escapeHtml(data.building) + '</div>';
  }
  // Объекты договора (relations: rooms / buildings / land_plots)
  if (data.subject_buildings && data.subject_buildings.length) {
    h += '<div><span style="color:var(--text-secondary)">Корпуса:</span> ' +
      data.subject_buildings.map(function(b) { return '<a href="#" onclick="showEntity(' + b.id + ');return false">' + escapeHtml(b.name) + '</a>'; }).join(', ') + '</div>';
  }
  if (data.subject_rooms && data.subject_rooms.length) {
    h += '<div><span style="color:var(--text-secondary)">Помещения:</span> ' +
      data.subject_rooms.map(function(r) { return '<a href="#" onclick="showEntity(' + r.id + ');return false">' + escapeHtml(r.name) + '</a>'; }).join(', ') + '</div>';
  }
  if (data.subject_land_plots && data.subject_land_plots.length) {
    h += '<div><span style="color:var(--text-secondary)">Земельные участки:</span> ' +
      data.subject_land_plots.map(function(l) { return '<a href="#" onclick="showEntity(' + l.id + ');return false">' + escapeHtml(l.name) + '</a>'; }).join(', ') + '</div>';
  }
  // Арендатор (для Подряда)
  if (data.tenant) {
    h += '<div><span style="color:var(--text-secondary)">Арендатор:</span> ' + escapeHtml(data.tenant) + '</div>';
  }
  // Срок действия
  if (data.contract_end_date) {
    h += '<div><span style="color:var(--text-secondary)">Срок действия до:</span> <strong>' + escapeHtml(_ccFmtDate(data.contract_end_date)) + '</strong></div>';
  } else if (data.duration_text) {
    h += '<div><span style="color:var(--text-secondary)">Срок действия:</span> ' + escapeHtml(data.duration_text) + '</div>';
  }
  // Срок выполнения
  if (data.completion_deadline) {
    var dlVal = data.completion_deadline;
    var isoRe = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
    if (isoRe.test(dlVal)) {
      var dlParts = dlVal.split('-');
      dlVal = dlParts[2] + '.' + dlParts[1] + '.' + dlParts[0];
    }
    h += '<div><span style="color:var(--text-secondary)">Срок выполнения:</span> ' + escapeHtml(dlVal) + '</div>';
  }
  // Периодичность оплаты
  if (data.payment_frequency) {
    h += '<div><span style="color:var(--text-secondary)">Периодичность оплаты:</span> ' + escapeHtml(data.payment_frequency) + '</div>';
  }
  // НДС
  if (data.vat_rate) {
    var _vatLabel = data.vat_rate === 'exempt' ? 'не облагается' : (data.vat_rate + '%');
    h += '<div><span style="color:var(--text-secondary)">НДС:</span> ' + escapeHtml(_vatLabel) + '</div>';
  }
  // Авансы
  var _advances = [];
  try { if (data.advances) _advances = JSON.parse(data.advances); } catch(ex) {}
  if (_advances.length) {
    h += '<div><span style="color:var(--text-secondary)">Авансы:</span>';
    h += '<ul style="margin:4px 0 0 18px;padding:0;font-size:13px">';
    _advances.forEach(function(adv, idx) {
      var parts = [];
      if (adv.amount) parts.push(_ccFmtNum(adv.amount) + '\u00a0₽');
      if (adv.date) parts.push(_ccFmtDate(adv.date));
      h += '<li id="adv-item-' + data.id + '-' + idx + '" style="display:flex;align-items:center;gap:6px;margin-bottom:2px">';
      h += '<span>' + escapeHtml(parts.join(' — ')) + '</span>';
      h += '<span id="adv-status-' + data.id + '-' + idx + '" style="font-size:11px;color:#9ca3af">проверяется…</span>';
      h += '</li>';
    });
    h += '</ul></div>';
  }
  // Комментарий
  if (data.service_comment) {
    h += '<div><span style="color:var(--text-secondary)">Комментарий:</span> ' + escapeHtml(data.service_comment) + '</div>';
  }
  h += '</div>';

  // ── Перечень работ/услуг/товаров (contract_items) ──────────────────────────
  if (data.contract_items && data.contract_items.length) {
    h += '<div style="margin-bottom:16px">';
    h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">ПЕРЕЧЕНЬ ПОЗИЦИЙ</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    h += '<thead><tr style="background:#4F6BCC;color:#fff">';
    h += '<th style="padding:8px 10px;text-align:left;border-radius:4px 0 0 0">Наименование</th>';
    if (data.contract_items[0].qty !== undefined) {
      h += '<th style="padding:8px 10px;text-align:right">Кол-во</th>';
      h += '<th style="padding:8px 10px;text-align:right">Цена</th>';
    }
    h += '<th style="padding:8px 10px;text-align:right;border-radius:0 4px 0 0">Сумма, ₽</th>';
    h += '</tr></thead><tbody>';
    data.contract_items.forEach(function(item, i) {
      var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
      h += '<tr style="' + bg + '">';
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(item.name || '—') + '</td>';
      if (item.qty !== undefined) {
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (item.qty || '') + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (item.unit_price ? _ccFmtNum(item.unit_price) : '') + '</td>';
      }
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (item.amount ? _ccFmtNum(item.amount) : '') + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
    h += '</div>';
  }

  // ── Сумма договора (для не-аренды) ─────────────────────────────────────────
  if (!isRental && data.contract_amount) {
    h += '<div style="font-size:15px;font-weight:600;margin-bottom:16px;color:var(--accent)">';
    h += 'Сумма договора: ' + _ccFmtNum(data.contract_amount) + ' ₽';
    h += '</div>';
  }

  // ── Помещения (для аренды) ─────────────────────────────────────────────────
  if (isRental) {
    var roomDescs = data.rent_rows.filter(function(r) { return r.description; });
    if (roomDescs.length) {
      h += '<div style="margin-bottom:16px">';
      h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">ПОМЕЩЕНИЯ</div>';
      h += '<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7">';
      roomDescs.forEach(function(r) {
        h += '<li>' + escapeHtml(r.description) + '</li>';
      });
      h += '</ul></div>';
    }

    if (data.rent_rows.length) {
      var srcNote = data.rent_source_name ? ' <span style="font-size:11px;font-weight:400;color:var(--text-secondary)">(из ' + escapeHtml(data.rent_source_name) + ')</span>' : '';
      h += '<div style="margin-bottom:16px">';
      h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">ТЕКУЩИЕ УСЛОВИЯ' + srcNote + '</div>';
      h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      h += '<thead><tr style="background:#4F6BCC;color:#fff">';
      h += '<th style="padding:8px 10px;text-align:left;border-radius:4px 0 0 4px">Объект аренды</th>';
      h += '<th style="padding:8px 10px;text-align:right">Площадь, м²</th>';
      h += '<th style="padding:8px 10px;text-align:right;border-radius:0 4px 4px 0">Ставка (руб/м²/мес)</th>';
      h += '</tr></thead><tbody>';
      data.rent_rows.forEach(function(r, i) {
        var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
        h += '<tr style="' + bg + '">';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(r.room_name || '—') + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (r.area ? _ccFmtNum(r.area) : '—') + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (r.rate ? _ccFmtNum(r.rate) : '—') + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table>';
      if (data.total_monthly > 0) {
        h += '<div style="text-align:right;font-size:14px;font-weight:600;margin-top:8px">';
        h += 'Ежемесячный платёж: ' + _ccFmtNum(data.total_monthly) + ' руб.';
        h += '</div>';
      }
      if (data.power_allocation_kw) {
        h += '<div style="text-align:right;font-size:13px;margin-top:4px;color:var(--text-secondary)">⚡ Эл. мощность: <strong>' + escapeHtml(data.power_allocation_kw) + ' кВт</strong></div>';
      }
      h += '</div>';
    }
  }

  // ── Аренда оборудования (equipment_rent_items) ────────────────────────────
  if (data.equipment_rent_items && data.equipment_rent_items.length) {
    var erSrcNote = data.equipment_rent_source_name ? ' <span style="font-size:11px;font-weight:400;color:var(--text-secondary)">(из ' + escapeHtml(data.equipment_rent_source_name) + ')</span>' : '';
    var dirLabel = data.direction === 'income' ? 'мы сдаём' : (data.direction === 'expense' ? 'мы берём' : '');
    h += '<div style="margin-bottom:16px">';
    h += '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">ПРЕДМЕТЫ АРЕНДЫ' + erSrcNote + (dirLabel ? ' <span style="font-weight:400;font-style:italic">(' + escapeHtml(dirLabel) + ')</span>' : '') + '</div>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    h += '<thead><tr style="background:#4F6BCC;color:#fff">';
    h += '<th style="padding:8px 10px;text-align:left;border-radius:4px 0 0 4px">Оборудование</th>';
    h += '<th style="padding:8px 10px;text-align:right">Кол-во</th>';
    h += '<th style="padding:8px 10px;text-align:right;border-radius:0 4px 4px 0">Ставка (руб/мес)</th>';
    h += '</tr></thead><tbody>';
    data.equipment_rent_items.forEach(function(item, i) {
      var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
      var nameStr = escapeHtml(item.name || '—');
      if (item.inv_number) nameStr += ' <span style="color:var(--text-muted);font-size:11px">инв. ' + escapeHtml(item.inv_number) + '</span>';
      if (item.category) nameStr += ' <span style="color:var(--text-secondary);font-size:11px">(' + escapeHtml(item.category) + ')</span>';
      h += '<tr style="' + bg + '">';
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + nameStr + '</td>';
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (item.qty || 1) + '</td>';
      h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right">' + (item.rate ? _ccFmtNum(item.rate) : '—') + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
    if (data.equipment_rent_monthly > 0) {
      h += '<div style="text-align:right;font-size:14px;font-weight:600;margin-top:8px">Ежемесячный платёж: ' + _ccFmtNum(data.equipment_rent_monthly) + ' руб.</div>';
    }
    h += '</div>';
  }

  // ── Переданное оборудование (collapsible) ──────────────────────────────────
  if (data.equipment_list && data.equipment_list.length) {
    var eqSrcNote = data.transfer_source_name ? ' <span style="font-size:11px;font-weight:400;color:var(--text-secondary)">(из ' + escapeHtml(data.transfer_source_name) + ')</span>' : '';
    h += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    h += '<button onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\\'none\\'?\\'\\':(\\'none\\')" style="width:100%;text-align:left;padding:10px 14px;background:var(--bg-secondary);border:none;cursor:pointer;font-size:13px;font-weight:600;display:flex;justify-content:space-between">';
    h += '<span>Переданное оборудование (' + data.equipment_list.length + ')' + eqSrcNote + '</span><span>▼</span>';
    h += '</button>';
    h += '<div style="display:none;padding:12px 14px">';
    data.equipment_list.forEach(function(eq) {
      var isEmerg = eq.is_emergency;
      var isBroken = eq.is_broken;
      var txtStyle = isBroken ? 'color:#dc2626;font-weight:600' : (isEmerg ? 'color:#b85c5c;font-weight:600' : '');
      h += '<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:13px;' + txtStyle + '">';
      // Кликабельное имя — открывает карточку оборудования
      var eqName = escapeHtml(eq.name || '—');
      if (eq.id) {
        h += '<a href="#" onclick="showEntity(' + eq.id + ');return false" style="color:var(--accent);text-decoration:none;font-weight:600">' + eqName + '</a>';
      } else {
        h += eqName;
      }
      if (eq.inv_number && (eq.name || '').indexOf(eq.inv_number) < 0) h += ' <span style="color:var(--text-secondary);font-size:12px">инв. ' + escapeHtml(eq.inv_number) + '</span>';
      if (eq.kind || eq.category) h += ' <span style="color:var(--text-secondary);font-size:12px">(' + escapeHtml((eq.kind || eq.category || '')) + ')</span>';
      if (eq.location) h += ' — ' + escapeHtml(eq.location);
      if (isBroken) h += ' <span style="background:#fef2f2;color:#dc2626;font-size:11px;padding:1px 5px;border-radius:3px;border:1px solid #dc2626">⚠ Нерабочий</span>';
      else if (isEmerg) h += ' <span style="background:#fef2f2;color:#b85c5c;font-size:11px;padding:1px 5px;border-radius:3px;border:1px solid #b85c5c">⚠ Аварийное</span>';
      h += '</div>';
    });
    h += '</div></div>';
  }

  // ── Акты (отдельная таблица для не-арендных договоров) ───────────────────
  var _histActs  = (data.history || []).filter(function(s) { return s.is_act; });
  var _histSuppl = (data.history || []).filter(function(s) { return !s.is_contract && !s.is_act; });
  var _histContr = (data.history || []).filter(function(s) { return s.is_contract; });

  if (!isRental) {
    var actsLabel = 'Акты выполненных работ' + (_histActs.length ? ' · ' + _histActs.length : '');
    h += '<div style="margin-bottom:16px;border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    h += '<button onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\\'none\\'?\\'\\':(\\'none\\')" style="width:100%;text-align:left;padding:10px 14px;background:var(--bg-secondary);border:none;cursor:pointer;font-size:13px;font-weight:600;display:flex;justify-content:space-between">';
    h += '<span>' + actsLabel + '</span><span>▼</span>';
    h += '</button>';
    h += '<div style="display:none;padding:12px 14px">';
    if (_histActs.length) {
      h += '<table style="width:100%;border-collapse:collapse;font-size:13px">';
      h += '<thead><tr style="background:#4F6BCC;color:#fff">';
      h += '<th style="padding:7px 10px;text-align:left;border-radius:4px 0 0 0">Акт</th>';
      h += '<th style="padding:7px 10px;text-align:left">Оборудование</th>';
      h += '<th style="padding:7px 10px;text-align:left">Дата</th>';
      h += '<th style="padding:7px 10px;text-align:right;border-radius:0 4px 0 0">Сумма, ₽</th>';
      h += '</tr></thead><tbody>';
      _histActs.forEach(function(s, i) {
        var bg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
        var eqList = Array.isArray(s.equipment) ? s.equipment : [];
        var eqCell = eqList.length
          ? '<span style="font-size:12px;color:var(--text-secondary)">' + escapeHtml(eqList.join(', ')) + '</span>'
          : '<span style="color:var(--text-muted)">—</span>';
        h += '<tr style="' + bg + ';cursor:pointer" onclick="showEntity(' + s.id + ')">';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);color:var(--accent)">' + escapeHtml(s.name) + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + eqCell + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);color:var(--text-muted);white-space:nowrap">' + (s.date ? _ccFmtDate(s.date) : '—') + '</td>';
        h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);text-align:right;font-weight:600;color:#16a34a;white-space:nowrap">' + (s.total ? Math.round(s.total).toLocaleString('ru-RU') + ' ₽' : '—') + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table>';
    } else {
      h += '<div style="color:var(--text-muted);font-size:13px">Актов нет</div>';
    }
    h += '</div></div>';
  }

  // ── История ДС (collapsible) ───────────────────────────────────────────────
  var _histForSection = isRental
    ? (data.history || [])
    : [].concat(_histContr, _histSuppl);

  if (_histForSection.length) {
    h += '<div style="margin-bottom:8px;border:1px solid var(--border);border-radius:8px;overflow:hidden">';
    h += '<button onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\\'none\\'?\\'\\':(\\'none\\')" style="width:100%;text-align:left;padding:10px 14px;background:var(--bg-secondary);border:none;cursor:pointer;font-size:13px;font-weight:600;display:flex;justify-content:space-between">';
    var histLabel = 'История ДС';
    if (_histSuppl.length > 0) histLabel += ' · ' + _histSuppl.length + ' ДС';
    if (isRental && _histActs.length > 0) histLabel += ' · ' + _histActs.length + ' актов';
    h += '<span>' + histLabel + '</span><span>▼</span>';
    h += '</button>';
    h += '<div style="display:none;padding:12px 14px">';
    _histForSection.forEach(function(s) {
      h += '<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">';
      if (s.is_contract) {
        h += '<a href="#" onclick="openContractCard(' + s.id + ');return false" style="color:var(--accent);font-weight:600">';
        h += escapeHtml(s.name);
        h += '</a>';
        if (s.date) h += ' <span style="color:var(--text-secondary)">от ' + _ccFmtDate(s.date) + '</span>';
        h += ' <span style="background:var(--bg-hover);color:var(--text-secondary);font-size:11px;padding:1px 6px;border-radius:3px;margin-left:4px">Основной договор</span>';
      } else if (s.is_act) {
        h += '<span style="background:#0f2a1a;color:#4ade80;font-size:10px;padding:1px 6px;border-radius:3px;margin-right:6px;font-weight:600">АКТ</span>';
        h += '<a href="#" onclick="showEntity(' + s.id + ');return false" style="color:var(--accent)">';
        h += escapeHtml(s.name);
        h += '</a>';
        if (s.date) h += ' <span style="color:var(--text-secondary)">от ' + _ccFmtDate(s.date) + '</span>';
        if (s.total) h += ' — <span style="color:#4ade80;font-weight:600">' + Math.round(s.total).toLocaleString('ru-RU') + ' ₽</span>';
      } else {
        h += '<a href="#" onclick="openSupplementCard(' + s.id + ');return false" style="color:var(--accent)">';
        var suppTitle = s.name;
        if (s.contractor_name && suppTitle.indexOf(s.contractor_name) < 0) {
          suppTitle += ' — ' + s.contractor_name;
        }
        h += escapeHtml(suppTitle);
        h += '</a>';
        if (s.doc_status) h += ' ' + _docStatusBadge(s.doc_status);
        if (s.date) h += ' <span style="color:var(--text-secondary)">от ' + _ccFmtDate(s.date) + '</span>';
        if (s.changes) h += ' — <span style="color:var(--text-secondary)">' + escapeHtml(s.changes) + '</span>';
      }
      h += '</div>';
    });
    h += '</div></div>';
  }

  // Кнопки
  h += '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">';
  h += '<button class="btn btn-sm btn-primary" onclick="openCreateSupplementModal(' + data.id + ')">+ Доп. соглашение</button>';
  if (!isRental) {
    h += '<button class="btn btn-sm btn-primary" onclick="openCreateActModal(' + data.id + ')">+ Акт</button>';
  }
  h += '</div>';

  return h;
}

async function openContractCard(id) {
  showLoadingModal();
  try {
    var data = await api('/reports/contract-card/' + id);
    setModalContent(renderContractCard(data));
    _loadAdvanceStatus(id, data);
  } catch(e) {
    setModalContent('<div style="color:#dc2626;padding:20px">Ошибка: ' + escapeHtml(e.message || String(e)) + '</div>');
  }
}

async function _loadAdvanceStatus(id, data) {
  var advances = [];
  try { if (data.advances) advances = JSON.parse(data.advances); } catch(_) {}
  if (!advances.length) return;

  try {
    var result = await api('/reports/contract-card/' + id + '/advance-status');
    var checkedFmt = result.checkedAt
      ? new Date(result.checkedAt).toLocaleString('ru-RU', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
      : '';
    (result.advances || []).forEach(function(adv) {
      var el = document.getElementById('adv-status-' + id + '-' + adv.idx);
      if (!el) return;
      if (adv.paid) {
        el.title = 'Платёж найден в 1С';
        el.innerHTML = '<span style="color:#16a34a;font-size:14px">✅</span>';
      } else {
        el.style.color = '#dc2626';
        el.innerHTML = '❌ не оплачено по состоянию на ' + checkedFmt;
      }
    });
  } catch(e) {
    advances.forEach(function(_, idx) {
      var el = document.getElementById('adv-status-' + id + '-' + idx);
      if (el) { el.style.color = '#9ca3af'; el.textContent = '—'; el.title = e.message || 'Ошибка проверки'; }
    });
  }
}

// ── Карточка ДС (только изменения) ─────────────────────────────────────────

`;
