/* eslint-disable */
module.exports = `
// ── File attachments component ─────────────────────────────────────────────

/** Return short uppercase extension label, e.g. "PDF", "DOCX", "JPG" */
function _fileExtLabel(name) {
  var dot = (name || '').lastIndexOf('.');
  if (dot < 0) return 'FILE';
  return name.slice(dot + 1).toUpperCase().slice(0, 6);
}

/** Format bytes as human-readable */
function _fileSize(bytes) {
  if (!bytes) return '0 Б';
  if (bytes < 1024) return bytes + ' Б';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
  return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

/**
 * Render the files section HTML for a given entityId.
 * Returns a container div with id="fileSection_{entityId}".
 */
function renderFilesSection(entityId) {
  return '<div id="fileSection_' + entityId + '" class="files-section">' +
    '<div class="files-section-header">' +
      '<span class="files-section-title">Прикреплённые файлы</span>' +
      '<label class="btn-attach" title="Прикрепить файл">' +
        'Прикрепить файл' +
        '<input type="file" style="display:none" onchange="uploadEntityFile(' + entityId + ', this)">' +
      '</label>' +
    '</div>' +
    '<div id="fileList_' + entityId + '" class="files-list">Загрузка...</div>' +
  '</div>';
}

/** Load and render the file list for entityId */
function loadEntityFiles(entityId) {
  var listEl = document.getElementById('fileList_' + entityId);
  if (!listEl) return;
  api('/entities/' + entityId + '/files').then(function(files) {
    if (!files || !files.length) {
      listEl.innerHTML = '<span class="files-empty">Нет прикреплённых файлов</span>';
      return;
    }
    var h = '';
    files.forEach(function(f) {
      var ext = _fileExtLabel(f.original_name);
      h += '<div class="file-item" data-fid="' + f.id + '">' +
        '<a class="file-link" href="/api/entities/' + entityId + '/files/' + f.id +
           '" target="_blank" rel="noopener">' +
          '<span class="file-ext">' + escapeHtml(ext) + '</span>' +
          '<span class="file-name">' + escapeHtml(f.original_name) + '</span>' +
          '<span class="file-size">' + _fileSize(f.size) + '</span>' +
        '</a>' +
        '<button class="file-delete" onclick="deleteEntityFile(' + entityId + ',' + f.id + ',this)" title="Удалить">✕</button>' +
      '</div>';
    });
    listEl.innerHTML = h;
  }).catch(function() {
    listEl.innerHTML = '<span class="files-empty" style="color:var(--red)">Ошибка загрузки файлов</span>';
  });
}

/** Upload a file for entityId, triggered by file input */
function uploadEntityFile(entityId, input) {
  var file = input.files[0];
  if (!file) return;
  input.value = '';

  var label = input.closest('.btn-attach');
  if (label) { label.classList.add('is-loading'); label.setAttribute('disabled', 'disabled'); }

  var fd = new FormData();
  fd.append('file', file);

  fetch('/api/entities/' + entityId + '/files', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + localStorage.getItem('accessToken') },
    body: fd,
  }).then(function(r) {
    if (label) { label.classList.remove('is-loading'); label.removeAttribute('disabled'); }
    if (!r.ok) {
      r.json().then(function(d) { alert(d.error || 'Ошибка загрузки'); }).catch(function() { alert('Ошибка загрузки'); });
      return;
    }
    loadEntityFiles(entityId);
  }).catch(function() {
    if (label) { label.classList.remove('is-loading'); label.removeAttribute('disabled'); }
    alert('Ошибка загрузки файла');
  });
}

/** Delete a file */
function deleteEntityFile(entityId, fileId, btn) {
  if (!confirm('Удалить файл?')) return;
  btn.disabled = true;
  api('/entities/' + entityId + '/files/' + fileId, { method: 'DELETE' }).then(function() {
    loadEntityFiles(entityId);
  }).catch(function() {
    btn.disabled = false;
    alert('Ошибка удаления');
  });
}
`;
