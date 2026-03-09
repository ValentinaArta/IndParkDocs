/* eslint-disable */
module.exports = `
// === LETTERS PAGE ===

var _letterTopics = [];

function showLetters() {
  currentView = 'letters';
  _setNavHash('letters');
  setActiveNav('letters');
  document.getElementById('pageTitle').textContent = 'Письма';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML =
    '<button class="btn btn-primary" onclick="showCreateLetter()"><i data-lucide="plus" class="lucide" style="width:14px;height:14px"></i> Новое письмо</button>';
  var content = document.getElementById('content');
  content.innerHTML = '<div style="padding:24px;max-width:1200px">' +
    '<div id="lettersContent"><div style="padding:40px;text-align:center;color:var(--text-muted)">Загрузка...</div></div>' +
    '</div>';
  if (window.lucide) lucide.createIcons();
  _loadLetterTopics();
  _loadLettersList();
}

async function _loadLetterTopics() {
  try {
    _letterTopics = await api('/letter-topics');
  } catch(e) { _letterTopics = []; }
}

async function _loadLettersList() {
  try {
    var letterType = entityTypes.find(function(t) { return t.name === 'letter'; });
    if (!letterType) {
      document.getElementById('lettersContent').innerHTML =
        '<div style="text-align:center;padding:40px;color:var(--text-muted)">Тип "Письмо" не найден. Перезагрузите страницу.</div>';
      return;
    }
    var all = await api('/entities?types=letter&limit=500');
    var letters = (all || []).filter(function(e) { return !e.deleted_at; });
    var el = document.getElementById('lettersContent');
    if (!letters.length) {
      el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">' +
        '<div style="font-size:48px;margin-bottom:16px">✉️</div>' +
        '<p style="font-size:16px;margin-bottom:8px">Нет писем</p>' +
        '<p style="font-size:13px">Нажмите «Новое письмо» чтобы создать</p></div>';
      return;
    }
    // Sort by date desc
    letters.sort(function(a,b) {
      var da = (a.properties||{}).letter_date || '';
      var db = (b.properties||{}).letter_date || '';
      return db.localeCompare(da);
    });
    var cols = [
      { label: 'Дата', render: function(e) { return _fmtDate((e.properties||{}).letter_date); } },
      { label: 'Исх. №', render: function(e) { return escapeHtml((e.properties||{}).outgoing_number || ''); } },
      { label: 'От', render: function(e) { var p=e.properties||{}; var c=p.from_company_id?(_allCompanies||[]).find(function(x){return x.id===parseInt(p.from_company_id)}):null; return escapeHtml((c?c.name:null)||p.from_company_name||''); } },
      { label: 'Кому', render: function(e) { var p=e.properties||{}; var c=p.to_company_id?(_allCompanies||[]).find(function(x){return x.id===parseInt(p.to_company_id)}):null; return escapeHtml((c?c.name:null)||p.to_company_name||''); } },
      { label: 'Тема', render: function(e) { return escapeHtml((e.properties||{}).topic_name || ''); } },
      { label: 'Суть', render: function(e) { var d = (e.properties||{}).description || ''; return '<span style="white-space:normal;max-width:300px;display:inline-block;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(d.length > 80 ? d.substring(0,80) + '...' : d) + '</span>'; } },
      { label: 'Срок', render: function(e) { var p = e.properties||{}; var s = ''; if (p.deadline) { var dl = new Date(p.deadline); if (dl < new Date()) s = 'color:var(--danger);font-weight:600'; } return '<span style="' + s + '">' + _fmtDate(p.deadline) + '</span>'; } }
    ];
    var h = '<div style="overflow-x:auto;border-radius:8px;border:1px solid var(--border)">';
    h += '<table style="border-collapse:collapse;font-size:13px;white-space:nowrap;width:100%">';
    h += '<thead><tr>';
    cols.forEach(function(c) {
      h += '<th style="padding:9px 12px;background:#4F6BCC;color:#fff;text-align:left">' + c.label + '</th>';
    });
    h += '</tr></thead><tbody>';
    letters.forEach(function(e, i) {
      var rowBg = i % 2 === 0 ? '' : 'background:var(--bg-secondary)';
      h += '<tr style="cursor:pointer;' + rowBg + '" onclick="showEntity(' + e.id + ')">';
      cols.forEach(function(c) {
        h += '<td style="padding:7px 12px;border-bottom:1px solid var(--border)">' + c.render(e) + '</td>';
      });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    h += '<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">Всего: ' + letters.length + '</div>';
    el.innerHTML = h;
  } catch(e) {
    document.getElementById('lettersContent').innerHTML =
      '<div style="color:var(--danger);padding:20px">Ошибка загрузки: ' + escapeHtml(e.message) + '</div>';
  }
}

async function showCreateLetter() {
  await loadEntityLists();
  await _loadLetterTopics();
  _renderLetterForm();
}

function _renderLetterForm(editData) {
  var isEdit = !!editData;
  var p = (editData && editData.properties) || {};

  var h = '<h3>' + (isEdit ? 'Редактировать письмо' : 'Новое письмо') + '</h3>';

  // From
  h += '<div class="form-group"><label>От кого</label>' +
    renderSearchableSelect('f_letter_from', _allCompanies, p.from_company_id || '', p.from_company_name || '', 'начните вводить...', 'letter_from') + '</div>';

  // To
  h += '<div class="form-group"><label>Кому</label>' +
    renderSearchableSelect('f_letter_to', _allCompanies, p.to_company_id || '', p.to_company_name || '', 'начните вводить...', 'letter_to') + '</div>';

  // Number + Date row
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  h += '<div class="form-group"><label>Исх. №</label><input id="f_outgoing_number" value="' + escapeHtml(p.outgoing_number || '') + '"></div>';
  h += '<div class="form-group"><label>Дата</label><input id="f_letter_date" type="date" value="' + escapeHtml(p.letter_date || '') + '"></div>';
  h += '</div>';

  // Topic
  h += '<div class="form-group"><label>Тема письма</label><div style="display:flex;gap:8px">';
  h += '<select id="f_topic" style="flex:1"><option value="">— выберите —</option>';
  _letterTopics.forEach(function(t) {
    var sel = (p.topic_name === t.name) ? ' selected' : '';
    h += '<option value="' + t.id + '" data-name="' + escapeHtml(t.name) + '"' + sel + '>' + escapeHtml(t.name) + '</option>';
  });
  h += '</select>';
  h += '<button type="button" class="btn btn-sm" onclick="_addLetterTopic()">+ Тема</button>';
  h += '</div></div>';

  // Description
  h += '<div class="form-group"><label>Суть письма</label>' +
    '<textarea id="f_description" rows="4" style="width:100%;resize:vertical">' + escapeHtml(p.description || '') + '</textarea></div>';

  // Deadline
  h += '<div class="form-group"><label>Срок</label><input id="f_deadline" type="date" value="' + escapeHtml(p.deadline || '') + '"></div>';

  // Linked entities — standard "5 buttons" block
  h += renderSubjectFieldsBlock(p);

  // File attachment
  h += '<div class="form-group"><label>Файлы</label>' +
    '<div id="letterFilesList" style="margin-bottom:8px"></div>' +
    '<label class="btn btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:4px">' +
    '<i data-lucide="paperclip" class="lucide" style="width:14px;height:14px"></i> Добавить файл' +
    '<input type="file" multiple style="display:none" onchange="_onLetterFilesSelected(this)">' +
    '</label></div>';

  // Submit
  if (isEdit) {
    h += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
      '<button class="btn btn-primary" onclick="_submitLetter(' + editData.id + ')">Сохранить</button></div>';
  } else {
    h += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
      '<button class="btn btn-primary" onclick="_submitLetter()">Создать</button></div>';
  }

  setModalContent(h);
  _srchInitAll();
  _letterLinkedItems = (p.linked_entities ? JSON.parse(p.linked_entities) : []) || [];
  _letterPendingFiles = [];
  _renderLetterLinked();
  if (window.lucide) lucide.createIcons();
}

function _renderLetterCard(entity) {
  var p = entity.properties || {};
  var h = '';

  // Header
  var fromName = p.from_company_name || '—';
  var toName = p.to_company_name || '—';
  h += '<div style="margin-bottom:20px">';
  h += '<h2 style="font-size:22px;font-weight:700;margin-bottom:4px">Письмо' + (p.outgoing_number ? ' №' + escapeHtml(p.outgoing_number) : '') + '</h2>';
  h += '<div style="color:var(--text-secondary);font-size:14px">' + escapeHtml(p.topic_name || '') + '</div>';
  h += '</div>';

  // From / To
  h += '<div style="margin-bottom:16px">';
  h += '<div style="margin-bottom:6px">От: <strong>' + escapeHtml(fromName) + '</strong></div>';
  h += '<div>Кому: <strong>' + escapeHtml(toName) + '</strong></div>';
  h += '</div>';

  // Date + Deadline row
  h += '<div style="display:flex;gap:32px;margin-bottom:20px">';
  if (p.letter_date) {
    h += '<div>Дата: <strong>' + _fmtDate(p.letter_date) + '</strong></div>';
  }
  if (p.deadline) {
    var dlStyle = '';
    var dl = new Date(p.deadline);
    if (dl < new Date()) dlStyle = 'color:var(--danger);font-weight:700';
    h += '<div>Срок: <strong style="' + dlStyle + '">' + _fmtDate(p.deadline) + '</strong></div>';
  }
  if (p.outgoing_number) {
    h += '<div>Исх. №: <strong>' + escapeHtml(p.outgoing_number) + '</strong></div>';
  }
  h += '</div>';

  // Description
  if (p.description) {
    h += '<div style="margin-bottom:20px;padding:16px;background:var(--bg-secondary);border-radius:8px;border-left:4px solid #4F6BCC">';
    h += '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-secondary);margin-bottom:8px;letter-spacing:.5px">Суть письма</div>';
    h += '<div style="white-space:pre-wrap;font-size:14px;line-height:1.6">' + escapeHtml(p.description) + '</div>';
    h += '</div>';
  }

  // Linked entities
  var linked = [];
  try { linked = p.linked_entities ? JSON.parse(p.linked_entities) : []; } catch(e) {}
  if (linked.length) {
    h += '<div style="margin-bottom:20px">';
    h += '<div style="font-size:11px;text-transform:uppercase;font-weight:600;color:var(--text-secondary);margin-bottom:8px;letter-spacing:.5px">Связанные объекты</div>';
    h += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
    linked.forEach(function(item) {
      var onclick = item.id ? ' onclick="showEntity(' + item.id + ')" style="cursor:pointer;text-decoration:underline;color:var(--primary)"' : '';
      h += '<span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg-secondary);padding:4px 12px;border-radius:16px;font-size:13px"' + onclick + '>' +
        escapeHtml(item.name) + '</span>';
    });
    h += '</div></div>';
  }

  return h;
}

var _letterLinkedItems = [];
var _letterPendingFiles = [];

function _onLetterFilesSelected(input) {
  for (var i = 0; i < input.files.length; i++) {
    _letterPendingFiles.push(input.files[i]);
  }
  input.value = '';
  _renderLetterFiles();
}

function _renderLetterFiles() {
  var el = document.getElementById('letterFilesList');
  if (!el) return;
  if (!_letterPendingFiles.length) { el.innerHTML = ''; return; }
  var h = '';
  _letterPendingFiles.forEach(function(f, i) {
    h += '<div style="display:inline-flex;align-items:center;gap:4px;background:var(--bg-secondary);padding:4px 10px;border-radius:12px;margin:2px 4px 2px 0;font-size:13px">' +
      '\\ud83d\\udcce ' + escapeHtml(f.name) +
      '<button type="button" onclick="_removeLetterFile(' + i + ')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;padding:0 2px">&times;</button>' +
      '</div>';
  });
  el.innerHTML = h;
}

function _removeLetterFile(idx) {
  _letterPendingFiles.splice(idx, 1);
  _renderLetterFiles();
}

async function _uploadLetterFiles(entityId) {
  for (var i = 0; i < _letterPendingFiles.length; i++) {
    var fd = new FormData();
    fd.append('file', _letterPendingFiles[i]);
    await fetch(API + '/entities/' + entityId + '/files', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN },
      body: fd
    });
  }
  _letterPendingFiles = [];
}

function _renderLetterLinked() {
  var el = document.getElementById('letterLinkedEntities');
  if (!el) return;
  if (!_letterLinkedItems.length) { el.innerHTML = '<span style="color:var(--text-muted);font-size:13px">Нет связанных объектов</span>'; return; }
  var h = '';
  _letterLinkedItems.forEach(function(item, i) {
    h += '<div style="display:inline-flex;align-items:center;gap:4px;background:var(--bg-secondary);padding:4px 10px;border-radius:12px;margin:2px 4px 2px 0;font-size:13px">' +
      escapeHtml(item.name) +
      '<button type="button" onclick="_removeLetterLinked(' + i + ')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;padding:0 2px">&times;</button>' +
      '</div>';
  });
  el.innerHTML = h;
}

function _removeLetterLinked(idx) {
  _letterLinkedItems.splice(idx, 1);
  _renderLetterLinked();
}

function _linkLetterEntity(typeName) {
  var typeObj = entityTypes.find(function(t) { return t.name === typeName; });
  if (!typeObj) return;
  var items = allEntities.filter(function(e) { return e.type_name === typeName; });
  if (!items.length) { alert('Нет объектов типа "' + typeObj.name_ru + '"'); return; }
  // Build a simple select dialog
  var opts = items.map(function(e) { return e.name; });
  var chosen = prompt(typeObj.name_ru + ' — введите часть названия:\\n\\n' + opts.slice(0, 20).join('\\n') + (opts.length > 20 ? '\\n... и ещё ' + (opts.length - 20) : ''));
  if (!chosen || !chosen.trim()) return;
  var q = chosen.trim().toLowerCase();
  var found = items.find(function(e) { return e.name.toLowerCase().indexOf(q) >= 0; });
  if (found) {
    if (_letterLinkedItems.some(function(x) { return x.id === found.id; })) { return; }
    _letterLinkedItems.push({ id: found.id, type: typeName, name: found.name });
  } else {
    alert('Не найдено: ' + chosen);
    return;
  }
  _renderLetterLinked();
}

async function _addLetterTopic() {
  var name = prompt('Новая тема письма:');
  if (!name || !name.trim()) return;
  try {
    var t = await api('/letter-topics', { method: 'POST', body: JSON.stringify({ name: name.trim() }) });
    _letterTopics.push(t);
    var sel = document.getElementById('f_topic');
    var opt = document.createElement('option');
    opt.value = t.id;
    opt.dataset.name = t.name;
    opt.textContent = t.name;
    opt.selected = true;
    sel.appendChild(opt);
  } catch(e) { alert('Ошибка: ' + e.message); }
}

async function _submitLetter(editId) {
  var fromId = (document.getElementById('f_letter_from') || {}).value || '';
  var fromName = (document.getElementById('f_letter_from_text') || {}).value || '';
  var toId = (document.getElementById('f_letter_to') || {}).value || '';
  var toName = (document.getElementById('f_letter_to_text') || {}).value || '';
  var topicSel = document.getElementById('f_topic');
  var topicOpt = topicSel.options[topicSel.selectedIndex];

  var properties = {
    from_company_id: fromId,
    from_company_name: fromName,
    to_company_id: toId,
    to_company_name: toName,
    outgoing_number: document.getElementById('f_outgoing_number').value.trim(),
    letter_date: document.getElementById('f_letter_date').value,
    topic_id: topicSel.value,
    topic_name: topicOpt && topicOpt.dataset && topicOpt.dataset.name ? topicOpt.dataset.name : '',
    description: document.getElementById('f_description').value.trim(),
    deadline: document.getElementById('f_deadline').value,
  };
  // Collect standard subject fields (5 buttons: buildings, rooms, land plots, parts, equipment)
  Object.assign(properties, collectSubjectFieldValues());

  // Generate name
  var name = '✉️ ' + (properties.outgoing_number ? '№' + properties.outgoing_number + ' ' : '') +
    'от ' + (properties.from_company_name || '?') + ' → ' + (properties.to_company_name || '?');
  if (properties.letter_date) name += ' (' + properties.letter_date + ')';

  var letterType = entityTypes.find(function(t) { return t.name === 'letter'; });
  if (!letterType) { alert('Тип "Письмо" не найден'); return; }

  try {
    var result;
    if (editId) {
      result = await api('/entities/' + editId, { method: 'PUT', body: JSON.stringify({ name: name, properties: properties }) });
      if (_letterPendingFiles.length) await _uploadLetterFiles(editId);
    } else {
      result = await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: letterType.id, name: name, properties: properties }) });
      if (result && result.id && _letterPendingFiles.length) await _uploadLetterFiles(result.id);
    }
    closeModal();
    clearEntityCache();
    showLetters();
  } catch(e) { alert('Ошибка: ' + e.message); }
}
`;
