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

// ===== DEADLINE SECTION (Срок выполнения) — same pattern as duration =====

function renderDeadlineSection(props) {
  props = props || {};
  var dType = props.deadline_type || '';
  var dDate = props.deadline_date || '';
  var dText = props.deadline_text || '';
  // Backward compat: detect type from completion_deadline if no deadline_type set
  if (!dType && props.completion_deadline) {
    var isoRe = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
    if (isoRe.test(props.completion_deadline)) {
      dType = 'Дата'; dDate = dDate || props.completion_deadline;
    } else {
      dType = 'Текст'; dText = dText || props.completion_deadline;
    }
  }
  var hasValue = !!(dDate || dText || dType);
  var h = '<div id="deadline_section" style="margin-top:4px">';
  if (hasValue) {
    h += '<div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px">Срок выполнения';
    h += ' <button type="button" onclick="clearDeadlineSection()" style="background:none;border:none;color:var(--text-muted);font-size:11px;cursor:pointer;padding:0 4px">\\u2715 убрать</button></div>';
    h += '<div id="deadline_fields">' + _renderDeadlineFields({deadline_type:dType,deadline_date:dDate,deadline_text:dText}) + '</div>';
  } else {
    h += '<div id="deadline_fields" style="display:none">' + _renderDeadlineFields({}) + '</div>';
    h += '<button type="button" class="btn btn-sm" onclick="toggleDeadlineSection()" style="font-size:12px;color:var(--text-secondary)">+ Добавить срок выполнения</button>';
  }
  h += '</div>';
  return h;
}

function _renderDeadlineFields(props) {
  props = props || {};
  var dType = props.deadline_type || '';
  var dDate = props.deadline_date || '';
  var dText = props.deadline_text || '';
  var h = '<div class="form-group"><label style="font-size:12px">Тип срока</label>';
  h += '<select id="f_deadline_type" onchange="onDeadlineTypeChange()" style="width:100%">';
  h += '<option value="">— выберите —</option>';
  h += '<option value="Дата"' + (dType === 'Дата' ? ' selected' : '') + '>Дата выполнения</option>';
  h += '<option value="Текст"' + (dType === 'Текст' ? ' selected' : '') + '>Произвольный текст</option>';
  h += '</select></div>';
  h += '<div id="dl_date_wrap" class="form-group" style="' + (dType === 'Дата' ? '' : 'display:none') + '">';
  h += '<label style="font-size:12px">Дата выполнения</label>';
  h += '<input type="date" id="f_deadline_date" value="' + escapeHtml(dDate) + '"></div>';
  h += '<div id="dl_text_wrap" class="form-group" style="' + (dType === 'Текст' ? '' : 'display:none') + '">';
  h += '<label style="font-size:12px">Описание срока</label>';
  h += '<input id="f_deadline_text" value="' + escapeHtml(dText) + '" placeholder="например: 30 дней с момента подписания"></div>';
  return h;
}

function toggleDeadlineSection() {
  var fields = document.getElementById('deadline_fields');
  var btn = document.querySelector('[onclick*="toggleDeadlineSection"]');
  if (!fields) return;
  fields.style.display = '';
  if (btn) btn.style.display = 'none';
  var sec = document.getElementById('deadline_section');
  if (sec) {
    var lbl = sec.querySelector('[onclick*="clearDeadlineSection"]');
    if (!lbl) {
      var h = document.createElement('div');
      h.style.cssText = 'font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:6px';
      h.innerHTML = 'Срок выполнения <button type="button" onclick="clearDeadlineSection()" style="background:none;border:none;color:var(--text-muted);font-size:11px;cursor:pointer;padding:0 4px">\\u2715 убрать</button>';
      sec.insertBefore(h, fields);
    }
  }
}

function onDeadlineTypeChange() {
  var sel = document.getElementById('f_deadline_type');
  var v = sel ? sel.value : '';
  var dw = document.getElementById('dl_date_wrap');
  var tw = document.getElementById('dl_text_wrap');
  if (dw) dw.style.display = (v === 'Дата') ? '' : 'none';
  if (tw) tw.style.display = (v === 'Текст') ? '' : 'none';
}

function clearDeadlineSection() {
  var sec = document.getElementById('deadline_section');
  if (!sec) return;
  var dt = document.getElementById('f_deadline_type'); if (dt) dt.value = '';
  var dd = document.getElementById('f_deadline_date'); if (dd) dd.value = '';
  var dtt = document.getElementById('f_deadline_text'); if (dtt) dtt.value = '';
  var fields = document.getElementById('deadline_fields');
  if (fields) fields.style.display = 'none';
  var lbl = sec.querySelector('[onclick*="clearDeadlineSection"]');
  if (lbl && lbl.parentElement) lbl.parentElement.remove();
  var addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn btn-sm';
  addBtn.setAttribute('onclick', 'toggleDeadlineSection()');
  addBtn.style.cssText = 'font-size:12px;color:var(--text-secondary)';
  addBtn.textContent = '+ Добавить срок выполнения';
  sec.appendChild(addBtn);
}

`;
