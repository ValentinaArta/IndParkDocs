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

function renderSaleContractFields(container, extraFields, props) {
  props = props || {};

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
  html += _saleSectionBtn('items', 'Товар',        hasItems);
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
  html += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Перечень товаров</div>';
  html += renderContractItemsField(ciList, true);
  html += '</div>';

  // Сумма договора (авто)
  html += '<div class="form-group"><label>Сумма договора (итого)</label><input type="number" id="f_contract_amount" value="' + escapeHtml(String(props.contract_amount || '')) + '" readonly style="background:var(--bg-secondary);font-weight:600;color:var(--accent)"></div>';

  container.innerHTML = html;
}
`;
