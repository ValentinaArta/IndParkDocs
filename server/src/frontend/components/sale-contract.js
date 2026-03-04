/* eslint-disable */
module.exports = `// === SALE CONTRACT — collapsible sections for Купли-продажи ===

(function() {
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-sale-toggle]');
    if (!btn) return;
    toggleSaleSection(btn.getAttribute('data-sale-toggle'));
  });
})();

function toggleSaleSection(type) {
  var sec = document.getElementById('sale_sec_' + type);
  var btn = document.querySelector('[data-sale-toggle="' + type + '"]');
  if (!sec) return;
  var isOpen = sec.style.display !== 'none';
  sec.style.display = isOpen ? 'none' : '';
  if (btn) {
    var label = btn.getAttribute('data-label') || '';
    if (isOpen) {
      btn.style.background = 'var(--bg)';
      btn.style.color = 'var(--accent)';
      btn.style.borderStyle = 'dashed';
      btn.textContent = '+ ' + label;
    } else {
      btn.style.background = 'var(--accent)';
      btn.style.color = 'white';
      btn.style.borderStyle = 'solid';
      btn.textContent = label + ' ✕';
    }
  }
}

function _saleSectionBtn(type, label, isActive) {
  var bg = isActive ? 'background:var(--accent);color:white;border-style:solid;' : 'background:var(--bg);color:var(--accent);border-style:dashed;';
  return '<button type="button" data-sale-toggle="' + type + '" data-label="' + escapeHtml(label) + '" ' +
    'style="padding:6px 14px;border-radius:20px;border:1px solid var(--accent);cursor:pointer;font-size:13px;transition:all 0.15s;' + bg + '">' +
    (isActive ? escapeHtml(label) + ' \\u2715' : '+ ' + escapeHtml(label)) + '</button>';
}

function renderSaleSubjectOnly(container, extraFields, props, contractType) {
  props = props || {};
  var isSaleItems = (contractType === 'Купли-продажи');
  function _parseArr(v) { if (!v) return []; if (Array.isArray(v)) return v; try { return JSON.parse(v) || []; } catch(e) { return []; } }
  function _hasReal(arr) { return Array.isArray(arr) && arr.some(function(i) { return i && (i.name || i.id || i.equipment_id); }); }
  var sbIds = _parseArr(props.subject_buildings), srIds = _parseArr(props.subject_rooms);
  var slIds = _parseArr(props.subject_land_plots), eqList = _parseArr(props.equipment_list);
  var ciList = _parseArr(props.contract_items);
  var hasBld = _hasReal(sbIds), hasRoom = _hasReal(srIds), hasLp = _hasReal(slIds);
  var hasEq = _hasReal(eqList), hasItems = _hasReal(ciList);
  var html = '<div class="form-group"><label>Предмет договора</label><input type="text" id="f_subject" value="' + escapeHtml(props.subject || '') + '" style="width:100%"></div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">';
  html += _saleSectionBtn('bld','Корпус',hasBld) + _saleSectionBtn('room','Помещение',hasRoom);
  html += _saleSectionBtn('lp','ЗУ',hasLp) + _saleSectionBtn('eq','Оборудование',hasEq);
  html += _saleSectionBtn('items', isSaleItems ? 'Товар' : 'Работы/услуги', hasItems);
  html += '</div>';
  html += '<div id="sale_sec_bld" style="margin-bottom:12px;' + (hasBld?'':'display:none') + '"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Корпуса</div>' + renderSubjectBuildingsField(sbIds) + '</div>';
  html += '<div id="sale_sec_room" style="margin-bottom:12px;' + (hasRoom?'':'display:none') + '"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Помещения</div>' + renderSubjectRoomsField(srIds) + '</div>';
  html += '<div id="sale_sec_lp" style="margin-bottom:12px;' + (hasLp?'':'display:none') + '"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Земельные участки</div>' + renderSubjectLandPlotsField(slIds) + '</div>';
  html += '<div id="sale_sec_eq" style="margin-bottom:12px;' + (hasEq?'':'display:none') + '"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Оборудование</div>' + renderEquipmentListField(eqList) + '</div>';
  html += '<div id="sale_sec_items" style="margin-bottom:12px;' + (hasItems?'':'display:none') + '"><div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">' + (isSaleItems ? 'Перечень товаров' : 'Перечень работ/услуг') + '</div>' + renderContractItemsField(ciList, isSaleItems) + '</div>';
  container.innerHTML = html;
}

function renderSaleContractFields(container, extraFields, props, contractType) {
  props = props || {};
  var isSaleItems = (contractType === 'Купли-продажи');

  function _parseArr(v) { if (!v) return []; if (Array.isArray(v)) return v; try { return JSON.parse(v) || []; } catch(e) { return []; } }
  function _hasReal(arr) { return Array.isArray(arr) && arr.some(function(i) { return i && (i.name || i.id || i.equipment_id); }); }

  var sbIds  = _parseArr(props.subject_buildings);
  var srIds  = _parseArr(props.subject_rooms);
  var slIds  = _parseArr(props.subject_land_plots);
  var eqList = _parseArr(props.equipment_list);
  var ciList = _parseArr(props.contract_items);

  var hasBld   = _hasReal(sbIds);
  var hasRoom  = _hasReal(srIds);
  var hasLp    = _hasReal(slIds);
  var hasEq    = _hasReal(eqList);
  var hasItems = _hasReal(ciList);

  var html = '';

  // Предмет договора (всегда)
  html += '<div class="form-group"><label>Предмет договора</label><input type="text" id="f_subject" value="' + escapeHtml(props.subject || '') + '" style="width:100%"></div>';

  // Кнопки-переключатели
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">';
  html += _saleSectionBtn('bld',   'Корпус',       hasBld);
  html += _saleSectionBtn('room',  'Помещение',    hasRoom);
  html += _saleSectionBtn('lp',    'ЗУ',           hasLp);
  html += _saleSectionBtn('eq',    'Оборудование', hasEq);
  html += _saleSectionBtn('items', isSaleItems ? 'Товар' : 'Работы/услуги', hasItems);
  html += '</div>';

  // Секции (скрыты если нет данных)
  html += '<div id="sale_sec_bld" style="margin-bottom:12px;' + (hasBld ? '' : 'display:none') + '">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Корпуса</div>';
  html += renderSubjectBuildingsField(sbIds);
  html += '</div>';

  html += '<div id="sale_sec_room" style="margin-bottom:12px;' + (hasRoom ? '' : 'display:none') + '">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Помещения</div>';
  html += renderSubjectRoomsField(srIds);
  html += '</div>';

  html += '<div id="sale_sec_lp" style="margin-bottom:12px;' + (hasLp ? '' : 'display:none') + '">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Земельные участки</div>';
  html += renderSubjectLandPlotsField(slIds);
  html += '</div>';

  html += '<div id="sale_sec_eq" style="margin-bottom:12px;' + (hasEq ? '' : 'display:none') + '">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Оборудование</div>';
  html += renderEquipmentListField(eqList);
  html += '</div>';

  html += '<div id="sale_sec_items" style="margin-bottom:12px;' + (hasItems ? '' : 'display:none') + '">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">' + (isSaleItems ? 'Перечень товаров' : 'Перечень работ/услуг') + '</div>';
  html += renderContractItemsField(ciList, isSaleItems);
  html += '</div>';

  // Сумма договора (авто)
  html += '<div class="form-group"><label>Сумма договора (итого)</label><input type="number" id="f_contract_amount" value="' + escapeHtml(String(props.contract_amount || '')) + '" readonly style="background:var(--bg-secondary);font-weight:600;color:var(--accent)"></div>';

  // Extra fields (payment_frequency, vat_rate, etc.) — not handled above
  var _knownSaleFields = ['subject','subject_buildings','subject_rooms','subject_land_plots','equipment_list','contract_items','contract_items_sale','contract_amount','advances'];
  (extraFields || []).forEach(function(f) {
    if (_knownSaleFields.indexOf(f.name) >= 0) return;
    var val = props[f.name] || '';
    html += '<div class="form-group"><label>' + escapeHtml(f.name_ru || f.name) + '</label>' + renderFieldInput(f, val) + '</div>';
  });

  container.innerHTML = html;
}

// ========== Обслуживания — subject-only with toggle buttons ==========
function renderServiceSubjectOnly(container, allFields, props) {
  props = props || {};

  function _parseArr(v) { if (!v) return []; if (Array.isArray(v)) return v; try { return JSON.parse(v) || []; } catch(e) { return []; } }
  function _hasReal(arr) { return Array.isArray(arr) && arr.some(function(i) { return i && (i.name || i.id || i.equipment_id); }); }

  var bldVal  = props.building || '';
  var srIds   = _parseArr(props.subject_rooms);
  var slIds   = _parseArr(props.subject_land_plots);
  var eqList  = _parseArr(props.equipment_list);
  var hasBld  = !!bldVal;
  var hasRoom = _hasReal(srIds);
  var hasLp   = _hasReal(slIds);
  var hasEq   = _hasReal(eqList);

  var html = '';

  // Описание работ / предмет
  html += '<div class="form-group"><label>Описание работ / предмет</label>' +
    '<textarea id="f_service_subject" style="width:100%;resize:vertical;min-height:60px;box-sizing:border-box">' +
    escapeHtml(props.service_subject || '') + '</textarea></div>';

  // Кнопки-переключатели
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">';
  html += _saleSectionBtn('bld',  'Корпус',       hasBld);
  html += _saleSectionBtn('room', 'Помещение',    hasRoom);
  html += _saleSectionBtn('lp',   'ЗУ',           hasLp);
  html += _saleSectionBtn('eq',   'Оборудование', hasEq);
  html += '</div>';

  // Корпус (один — searchable select)
  html += '<div id="sale_sec_bld" style="margin-bottom:12px;' + (hasBld ? '' : 'display:none') + '">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Корпус</div>';
  html += renderRegistrySelectField('f_building', _buildings, bldVal, 'Введите название корпуса');
  html += '</div>';

  // Помещения
  html += '<div id="sale_sec_room" style="margin-bottom:12px;' + (hasRoom ? '' : 'display:none') + '">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Помещения</div>';
  html += renderSubjectRoomsField(srIds);
  html += '</div>';

  // Земельные участки
  html += '<div id="sale_sec_lp" style="margin-bottom:12px;' + (hasLp ? '' : 'display:none') + '">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Земельные участки</div>';
  html += renderSubjectLandPlotsField(slIds);
  html += '</div>';

  // Оборудование
  html += '<div id="sale_sec_eq" style="margin-bottom:12px;' + (hasEq ? '' : 'display:none') + '">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Оборудование</div>';
  html += renderEquipmentListField(eqList);
  html += '</div>';

  // Комментарий
  html += '<div class="form-group"><label>Комментарий</label>' +
    '<input type="text" id="f_service_comment" value="' + escapeHtml(props.service_comment || '') + '" style="width:100%"></div>';

  container.innerHTML = html;
}
`;
