/* eslint-disable */
module.exports = `
// ========== NOTES PAGE ==========
var _notesListCache = [];
var _currentNoteId = null;
var _noteBlocks = [];
var _noteSaveTimer = null;
var _noteDirty = false;

function showNotesPage() {
  document.body.classList.remove('notes-fullscreen');
  _setNavHash('notes');
  setActive('[data-type="notes"]');
  document.getElementById('pageTitle').textContent = 'Заметки';
  document.getElementById('topActions').innerHTML = '';
  var content = document.getElementById('content');
  content.innerHTML =
    '<div class="notes-layout">' +
      '<div class="notes-list-panel" id="notesSidebar">' +
        '<div style="padding:12px">' +
          '<button class="btn btn-primary" style="width:100%;border-radius:10px" onclick="_noteCreate()"><i data-lucide="plus" class="lucide" style="width:14px;height:14px"></i> Новая заметка</button>' +
        '</div>' +
        '<div id="notesList"></div>' +
      '</div>' +
      '<div class="notes-editor-panel" id="notesEditor">' +
        '<div id="noteEmpty" class="notes-empty-state"><i data-lucide="notebook-pen" class="lucide" style="width:48px;height:48px;opacity:0.3"></i><div style="margin-top:12px">Выберите заметку или создайте новую</div></div>' +
        '<div id="noteContent" style="display:none"></div>' +
      '</div>' +
    '</div>';
  renderIcons();
  _noteLoadList();
}

async function _noteLoadList() {
  try {
    _notesListCache = await api("/notes");
    _noteRenderList();
  } catch(e) { console.error("notes list error", e); }
}

function _noteRenderList() {
  var el = document.getElementById("notesList");
  if (!el) return;
  if (!_notesListCache.length) {
    el.innerHTML = '<div style="padding:24px 16px;color:var(--text-secondary);font-size:13px;text-align:center">Пока нет заметок</div>';
    return;
  }
  var html = "";
  _notesListCache.forEach(function(n) {
    var active = n.id === _currentNoteId ? " notes-list-active" : "";
    var dt = _fmtDate(n.updated_at ? n.updated_at.substring(0, 10) : "");
    html += '<div class="notes-list-item' + active + '" onclick="_noteOpen(' + n.id + ')" data-note-id="' + n.id + '">' +
      '<div class="notes-list-title">' + escapeHtml(n.title || "Без названия") + '</div>' +
      '<div class="notes-list-date">' + escapeHtml(dt) + '</div>' +
    '</div>';
  });
  el.innerHTML = html;
}

async function _noteCreate() {
  try {
    var note = await api("/notes", { method: "POST", body: JSON.stringify({ title: "Новая заметка", content_json: [{ type: "text", value: "" }] }) });
    _notesListCache.unshift({ id: note.id, title: note.title, updated_at: note.updated_at });
    _noteRenderList();
    _noteOpen(note.id);
  } catch(e) { console.error("create note error", e); }
}

async function _noteOpen(id) {
  if (_currentNoteId && _noteDirty) await _noteSaveNow();
  _currentNoteId = id;
  _noteRenderList();
  document.getElementById("noteEmpty").style.display = "none";
  var nc = document.getElementById("noteContent");
  nc.style.display = "block";
  try {
    var note = await api("/notes/" + id);
    _noteBlocks = note.content_json || [{ type: "text", value: "" }];
    if (!_noteBlocks.length) _noteBlocks = [{ type: "text", value: "" }];
    _noteRenderBlocks();
  } catch(e) { console.error("open note error", e); }
}

function _noteRenderBlocks() {
  var wrap = document.getElementById("noteContent");
  if (!wrap) return;

  var html = '<div class="note-header">' +
    '<input id="noteTitleInput" class="note-title-input" value="' + escapeHtml(_noteGetTitle()) + '" oninput="_noteMarkDirty()" placeholder="Название заметки">' +
    '<div class="note-header-actions">' +
      '<button class="note-action-btn" onclick="_noteToggleFullscreen()" title="Полный экран"><i data-lucide="maximize-2" class="lucide" style="width:18px;height:18px"></i></button>' +
      '<button class="note-action-btn note-action-danger" onclick="_noteDelete()" title="Удалить"><i data-lucide="trash-2" class="lucide" style="width:18px;height:18px"></i></button>' +
    '</div>' +
  '</div>';

  _noteBlocks.forEach(function(block, i) {
    html += '<div class="note-block" data-block-idx="' + i + '">';

    if (block.type === "text") {
      html += '<div contenteditable="true" class="note-text-block" data-idx="' + i + '" ' +
        'oninput="_noteTextChanged(' + i + ', this)" onpaste="_noteHandlePaste(event, ' + i + ')" ' +
        'placeholder="Начните писать...">' + escapeHtml(block.value || "") + '</div>';
    } else if (block.type === "drawing") {
      html += '<div class="note-canvas-wrap">' +
        '<canvas id="noteCanvas' + i + '" width="800" height="400" class="note-canvas" data-idx="' + i + '"></canvas>' +
        '<div class="note-canvas-toolbar" id="noteDrawToolbar' + i + '">' +
          '<button class="note-tool-btn note-tool-active" data-idx="' + i + '" data-tool="pen" onclick="_noteSetDrawTool(' + i + ',\\'pen\\')" title="Ручка"><i data-lucide="pen" class="lucide" style="width:16px;height:16px"></i></button>' +
          '<button class="note-tool-btn" data-idx="' + i + '" data-tool="eraser" onclick="_noteSetDrawTool(' + i + ',\\'eraser\\')" title="Ластик"><i data-lucide="eraser" class="lucide" style="width:16px;height:16px"></i></button>' +
          '<span class="note-tool-sep"></span>' +
          '<input type="color" value="#000000" onchange="_noteSetDrawColor(' + i + ', this.value)" class="note-color-pick" title="Цвет">' +
          '<select onchange="_noteSetDrawSize(' + i + ', +this.value)" class="note-size-pick">' +
            '<option value="2">1</option><option value="4" selected>2</option><option value="8">4</option><option value="16">8</option>' +
          '</select>' +
          '<button class="note-tool-btn" onclick="_noteDrawClear(' + i + ')" title="Очистить холст" style="margin-left:auto"><i data-lucide="rotate-ccw" class="lucide" style="width:14px;height:14px"></i></button>' +
        '</div>' +
      '</div>';
    } else if (block.type === "image") {
      html += '<div class="note-image-wrap">' +
        '<img src="' + block.dataUrl + '" class="note-image">' +
      '</div>';
    }

    html += '<button class="note-block-remove" onclick="_noteRemoveBlock(' + i + ')" title="Удалить блок">&times;</button>';
    html += '</div>';
  });

  html += '<div class="note-add-bar">' +
    '<button class="note-add-btn" onclick="_noteAddBlock(\\'text\\')"><i data-lucide="type" class="lucide" style="width:15px;height:15px"></i> Текст</button>' +
    '<button class="note-add-btn" onclick="_noteAddBlock(\\'drawing\\')"><i data-lucide="pen-tool" class="lucide" style="width:15px;height:15px"></i> Рисунок</button>' +
  '</div>';

  html += '<div id="noteSaveIndicator" class="note-save-indicator"></div>';

  wrap.innerHTML = html;
  renderIcons();

  _noteBlocks.forEach(function(block, i) {
    if (block.type === "drawing") _noteInitCanvas(i, block.dataUrl);
  });
}

function _noteGetTitle() {
  var inp = document.getElementById("noteTitleInput");
  if (inp) return inp.value;
  var n = _notesListCache.find(function(x) { return x.id === _currentNoteId; });
  return n ? n.title : "Новая заметка";
}

function _noteMarkDirty() {
  _noteDirty = true;
  if (_noteSaveTimer) clearTimeout(_noteSaveTimer);
  _noteSaveTimer = setTimeout(function() { _noteSaveNow(); }, 3000);
}

function _noteTextChanged(idx, el) {
  _noteBlocks[idx].value = el.innerText;
  _noteMarkDirty();
}

function _noteHandlePaste(ev, idx) {
  var items = (ev.clipboardData || ev.originalEvent.clipboardData).items;
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") === 0) {
      ev.preventDefault();
      var blob = items[i].getAsFile();
      var reader = new FileReader();
      reader.onload = function(e) {
        _noteBlocks.splice(idx + 1, 0, { type: "image", dataUrl: e.target.result });
        _noteRenderBlocks();
        _noteMarkDirty();
      };
      reader.readAsDataURL(blob);
      return;
    }
  }
  setTimeout(function() { _noteTextChanged(idx, ev.target); }, 0);
}

function _noteAddBlock(type) {
  if (type === "text") _noteBlocks.push({ type: "text", value: "" });
  else if (type === "drawing") _noteBlocks.push({ type: "drawing", dataUrl: "" });
  _noteRenderBlocks();
  _noteMarkDirty();
}

function _noteRemoveBlock(idx) {
  if (_noteBlocks.length <= 1) return;
  _noteBlocks.splice(idx, 1);
  _noteRenderBlocks();
  _noteMarkDirty();
}

// ========== DRAWING ==========
function _noteInitCanvas(idx, existingDataUrl) {
  var canvas = document.getElementById("noteCanvas" + idx);
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var rect = canvas.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = 400 * dpr;
  canvas.style.height = "400px";
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, rect.width, 400);

  if (existingDataUrl) {
    var img = new Image();
    img.onload = function() { ctx.drawImage(img, 0, 0, rect.width, 400); };
    img.src = existingDataUrl;
  }

  var state = { canvas: canvas, ctx: ctx, active: false, color: "#000000", size: 4, eraser: false, lastPt: null };
  if (!window._noteDrawStates) window._noteDrawStates = {};
  window._noteDrawStates[idx] = state;

  canvas.addEventListener("pointerdown", function(e) { _noteDrawStart(e, idx); });
  canvas.addEventListener("pointermove", function(e) { _noteDrawMove(e, idx); });
  canvas.addEventListener("pointerup", function(e) { _noteDrawEnd(e, idx); });
  canvas.addEventListener("pointerleave", function(e) { _noteDrawEnd(e, idx); });
}

function _noteGetPt(e, canvas) {
  var rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure: e.pressure || 0.5 };
}

function _noteDrawStart(e, idx) {
  e.preventDefault();
  var st = window._noteDrawStates[idx]; if (!st) return;
  st.active = true;
  st.lastPt = _noteGetPt(e, st.canvas);
}

function _noteDrawMove(e, idx) {
  e.preventDefault();
  var st = window._noteDrawStates[idx]; if (!st || !st.active) return;
  var pt = _noteGetPt(e, st.canvas);
  var ctx = st.ctx;
  ctx.beginPath();
  ctx.moveTo(st.lastPt.x, st.lastPt.y);
  ctx.lineTo(pt.x, pt.y);
  ctx.lineWidth = st.eraser ? st.size * 4 : st.size * (0.5 + pt.pressure);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (st.eraser) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = st.color;
  }
  ctx.stroke();
  st.lastPt = pt;
}

function _noteDrawEnd(e, idx) {
  var st = window._noteDrawStates[idx]; if (!st) return;
  if (st.active) {
    st.active = false;
    _noteBlocks[idx].dataUrl = st.canvas.toDataURL("image/png");
    _noteMarkDirty();
  }
}

function _noteSetDrawTool(idx, tool) {
  var st = window._noteDrawStates[idx]; if (!st) return;
  st.eraser = (tool === "eraser");
  var toolbar = document.getElementById("noteDrawToolbar" + idx);
  if (toolbar) {
    toolbar.querySelectorAll(".note-tool-btn[data-tool]").forEach(function(btn) {
      if (btn.dataset.tool === tool) btn.classList.add("note-tool-active");
      else btn.classList.remove("note-tool-active");
    });
  }
}

function _noteSetDrawColor(idx, color) {
  var st = window._noteDrawStates[idx]; if (!st) return;
  st.color = color;
}

function _noteSetDrawSize(idx, size) {
  var st = window._noteDrawStates[idx]; if (!st) return;
  st.size = size;
}

function _noteDrawClear(idx) {
  var st = window._noteDrawStates[idx]; if (!st) return;
  var rect = st.canvas.getBoundingClientRect();
  st.ctx.globalCompositeOperation = "source-over";
  st.ctx.fillStyle = "#ffffff";
  st.ctx.fillRect(0, 0, rect.width, 400);
  _noteBlocks[idx].dataUrl = "";
  _noteMarkDirty();
}

// ========== FULLSCREEN ==========
function _noteToggleFullscreen() {
  var isFs = document.body.classList.toggle('notes-fullscreen');
  var existing = document.getElementById('noteFsExit');
  if (isFs && !existing) {
    var btn = document.createElement('button');
    btn.id = 'noteFsExit';
    btn.className = 'notes-fs-exit';
    btn.onclick = _noteToggleFullscreen;
    btn.innerHTML = '<i data-lucide="minimize-2" class="lucide" style="width:16px;height:16px"></i> Свернуть';
    document.body.appendChild(btn);
    renderIcons();
  } else if (!isFs && existing) {
    existing.remove();
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && document.body.classList.contains('notes-fullscreen')) {
    _noteToggleFullscreen();
  }
});

// ========== SAVE/DELETE ==========
async function _noteSaveNow() {
  if (!_currentNoteId || !_noteDirty) return;
  _noteDirty = false;
  var title = _noteGetTitle();
  var ind = document.getElementById("noteSaveIndicator");
  if (ind) { ind.textContent = "Сохранение..."; ind.classList.add("visible"); }
  try {
    await api("/notes/" + _currentNoteId, { method: "PUT", body: JSON.stringify({ title: title, content_json: _noteBlocks }) });
    var cached = _notesListCache.find(function(n) { return n.id === _currentNoteId; });
    if (cached) { cached.title = title; cached.updated_at = new Date().toISOString(); }
    _noteRenderList();
    if (ind) { ind.textContent = "Сохранено"; setTimeout(function() { ind.classList.remove("visible"); }, 1500); }
  } catch(e) {
    console.error("save note error", e);
    if (ind) { ind.textContent = "Ошибка"; ind.style.color = "var(--red)"; }
  }
}

async function _noteDelete() {
  if (!_currentNoteId) return;
  if (!confirm("Удалить заметку?")) return;
  try {
    await api("/notes/" + _currentNoteId, { method: "DELETE" });
    _notesListCache = _notesListCache.filter(function(n) { return n.id !== _currentNoteId; });
    _currentNoteId = null;
    _noteBlocks = [];
    document.getElementById("noteEmpty").style.display = "flex";
    document.getElementById("noteContent").style.display = "none";
    _noteRenderList();
  } catch(e) { console.error("delete note error", e); }
}
`;
