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
    var h = '<table class="data-table" style="width:100%"><thead><tr>' +
      '<th>Дата</th><th>Исх. №</th><th>От</th><th>Кому</th><th>Тема</th><th>Суть</th><th>Срок</th>' +
      '</tr></thead><tbody>';
    letters.forEach(function(e) {
      var p = e.properties || {};
      var deadlineStyle = '';
      if (p.deadline) {
        var dl = new Date(p.deadline);
        if (dl < new Date()) deadlineStyle = 'color:var(--danger);font-weight:600';
      }
      h += '<tr style="cursor:pointer" onclick="showEntity(' + e.id + ')">' +
        '<td>' + _fmtDate(p.letter_date) + '</td>' +
        '<td>' + escapeHtml(p.outgoing_number || '') + '</td>' +
        '<td>' + escapeHtml(p.from_company_name || '') + '</td>' +
        '<td>' + escapeHtml(p.to_company_name || '') + '</td>' +
        '<td>' + escapeHtml(p.topic_name || '') + '</td>' +
        '<td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml((p.description || '').substring(0, 100)) + '</td>' +
        '<td style="' + deadlineStyle + '">' + _fmtDate(p.deadline) + '</td>' +
        '</tr>';
    });
    h += '</tbody></table>';
    el.innerHTML = h;
  } catch(e) {
    document.getElementById('lettersContent').innerHTML =
      '<div style="color:var(--danger);padding:20px">Ошибка загрузки: ' + escapeHtml(e.message) + '</div>';
  }
}

function showCreateLetter() {
  _loadLetterTopics().then(function() { _renderLetterForm(); });
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

  // Linked entities
  h += '<div class="form-group"><label>Связанные объекты</label>';
  h += '<div id="letterLinkedEntities" style="margin-bottom:8px"></div>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
  h += '<button type="button" class="btn btn-sm" onclick="_linkLetterEntity(&quot;building&quot;)">+ Корпус</button>';
  h += '<button type="button" class="btn btn-sm" onclick="_linkLetterEntity(&quot;room&quot;)">+ Помещение</button>';
  h += '<button type="button" class="btn btn-sm" onclick="_linkLetterEntity(&quot;land_plot&quot;)">+ ЗУ</button>';
  h += '<button type="button" class="btn btn-sm" onclick="_linkLetterEntity(&quot;equipment&quot;)">+ Оборудование</button>';
  h += '</div></div>';

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
  var fromEl = document.getElementById('f_letter_from');
  var toEl = document.getElementById('f_letter_to');
  var topicSel = document.getElementById('f_topic');
  var topicOpt = topicSel.options[topicSel.selectedIndex];

  var fromId = fromEl ? fromEl.value : '';
  var fromName = fromEl ? (fromEl.dataset.label || '') : '';
  var toId = toEl ? toEl.value : '';
  var toName = toEl ? (toEl.dataset.label || '') : '';

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
    linked_entities: JSON.stringify(_letterLinkedItems)
  };

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
