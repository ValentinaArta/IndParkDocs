/* eslint-disable */
module.exports = `
// === DURATION — moved from entity-form.js ===

function renderDurationSection(props) {
  props = props || {};
  var dType = props.duration_type || '';
  var dDate = props.duration_date || props.contract_end_date || '';
  var dText = props.duration_text || '';
  var hasValue = !!(dDate || dText || dType);
  var h = '<div id="duration_section" style="margin-top:4px">';
  if (hasValue) {
    h += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Срок действия';
    h += ' <button type="button" onclick="clearDurationSection()" style="background:none;border:none;color:var(--text-muted);font-size:11px;cursor:pointer;padding:0 4px">✕ убрать</button></div>';
    h += '<div id="duration_fields">' + _renderDurationFields(props) + '</div>';
  } else {
    h += '<div id="duration_fields" style="display:none">' + _renderDurationFields(props) + '</div>';
    h += '<button type="button" class="btn btn-sm" onclick="toggleDurationSection()" style="font-size:12px;color:var(--text-secondary)">+ Добавить срок действия</button>';
  }
  h += '</div>';
  return h;
}

function _renderDurationFields(props) {
  props = props || {};
  var dType = props.duration_type || '';
  var dDate = props.duration_date || props.contract_end_date || '';
  var dText = props.duration_text || '';
  var h = '<div class="form-group"><label style="font-size:12px">Тип срока</label>';
  h += '<select id="f_duration_type" onchange="onDurationTypeChange()" style="width:100%">';
  h += '<option value="">— выберите —</option>';
  h += '<option value="Дата"' + (dType === 'Дата' ? ' selected' : '') + '>Дата окончания</option>';
  h += '<option value="Текст"' + (dType === 'Текст' ? ' selected' : '') + '>Произвольный текст</option>';
  h += '</select></div>';
  var showDate = (dType === 'Дата' || dDate);
  var showText = (dType === 'Текст' || dText);
  h += '<div id="dur_date_wrap" class="form-group" style="' + (showDate ? '' : 'display:none') + '">';
  h += '<label style="font-size:12px">Дата окончания</label>';
  h += '<input type="date" id="f_duration_date" value="' + escapeHtml(dDate) + '"></div>';
  h += '<div id="dur_text_wrap" class="form-group" style="' + (showText ? '' : 'display:none') + '">';
  h += '<label style="font-size:12px">Описание срока</label>';
  h += '<input id="f_duration_text" value="' + escapeHtml(dText) + '" placeholder="например: 1 год с момента подписания"></div>';
  return h;
}

function toggleDurationSection() {
  var fields = document.getElementById('duration_fields');
  var btn = document.querySelector('[onclick*="toggleDurationSection"]');
  if (!fields) return;
  fields.style.display = '';
  if (btn) btn.style.display = 'none';
  // Add "убрать" label
  var sec = document.getElementById('duration_section');
  if (sec) {
    var lbl = sec.querySelector('[onclick*="clearDurationSection"]');
    if (!lbl) {
      var h = document.createElement('div');
      h.style.cssText = 'font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px';
      h.innerHTML = 'Срок действия <button type="button" onclick="clearDurationSection()" style="background:none;border:none;color:var(--text-muted);font-size:11px;cursor:pointer;padding:0 4px">✕ убрать</button>';
      sec.insertBefore(h, fields);
    }
  }
}

function onDurationTypeChange() {
  var sel = document.getElementById('f_duration_type');
  var v = sel ? sel.value : '';
  var dw = document.getElementById('dur_date_wrap');
  var tw = document.getElementById('dur_text_wrap');
  if (dw) dw.style.display = (v === 'Дата') ? '' : 'none';
  if (tw) tw.style.display = (v === 'Текст') ? '' : 'none';
}

function clearDurationSection() {
  var sec = document.getElementById('duration_section');
  if (!sec) return;
  var dt = document.getElementById('f_duration_type'); if (dt) dt.value = '';
  var dd = document.getElementById('f_duration_date'); if (dd) dd.value = '';
  var dtt = document.getElementById('f_duration_text'); if (dtt) dtt.value = '';
  var fields = document.getElementById('duration_fields');
  if (fields) fields.style.display = 'none';
  var lbl = sec.querySelector('[onclick*="clearDurationSection"]');
  if (lbl && lbl.parentElement) lbl.parentElement.remove();
  var addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn btn-sm';
  addBtn.setAttribute('onclick', 'toggleDurationSection()');
  addBtn.style.cssText = 'font-size:12px;color:var(--text-secondary)';
  addBtn.textContent = '+ Добавить срок действия';
  sec.appendChild(addBtn);
}

`;
