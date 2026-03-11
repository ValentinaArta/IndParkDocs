/* eslint-disable */
module.exports = `
// ========== NOTES PAGE ==========
var _notesListCache = [];
var _currentNoteId = null;
var _noteBlocks = [];     // [{type:'text',value:''}, {type:'drawing',dataUrl:''}, {type:'image',dataUrl:''}]
var _noteSaveTimer = null;
var _noteDrawing = null;   // {canvas, ctx, active, color, size, eraser, lastPt}
var _noteDirty = false;

function showNotesPage() {
  _setNavHash('notes');
  setActive('[data-type="notes"]');
  document.getElementById('pageTitle').textContent = 'Заметки';
  document.getElementById('topActions').innerHTML = '';
  var content = document.getElementById('content');
  content.innerHTML =
    '<div style="display:flex;height:calc(100vh - 56px);overflow:hidden">' +
      '<div id="notesSidebar" style="width:260px;min-width:260px;border-right:1px solid var(--border);background:var(--bg);overflow-y:auto;display:flex;flex-direction:column">' +
        '<div style="padding:12px">' +
          '<button class="btn btn-primary" style="width:100%" onclick="_noteCreate()"><i data-lucide="plus" class="lucide" style="width:14px;height:14px"></i> Новая заметка</button>' +
        '</div>' +
        '<div id="notesList" style="flex:1;overflow-y:auto"></div>' +
      '</div>' +
      '<div id="notesEditor" style="flex:1;overflow-y:auto;padding:0;position:relative">' +
        '<div id="noteEmpty" style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary)">Выберите заметку или создайте новую</div>' +
        '<div id="noteContent" style="display:none;padding:16px 24px 80px 24px;max-width:900px;margin:0 auto"></div>' +
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
    el.innerHTML = '<div style="padding:16px;color:var(--text-secondary);font-size:13px;text-align:center">Нет заметок</div>';
    return;
  }
  var html = "";
  _notesListCache.forEach(function(n) {
    var active = n.id === _currentNoteId ? "background:var(--bg-secondary);" : "";
    var dt = _fmtDate(n.updated_at);
    html += '<div class="note-list-item" style="' + active + 'padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border)" onclick="_noteOpen(' + n.id + ')" data-note-id="' + n.id + '">' +
      '<div style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(n.title) + '</div>' +
      '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">' + escapeHtml(dt) + '</div>' +
    '</div>';
  });
  el.innerHTML = html;
}

async function _noteCreate() {
  try {
    var note = await api("/notes", "POST", { title: "Новая заметка", content_json: [{ type: "text", value: "" }] });
    _notesListCache.unshift({ id: note.id, title: note.title, updated_at: note.updated_at });
    _noteRenderList();
    _noteOpen(note.id);
  } catch(e) { console.error("create note error", e); }
}

async function _noteOpen(id) {
  // save current note first
  if (_currentNoteId && _noteDirty) await _noteSaveNow();
  _currentNoteId = id;
  _noteRenderList();
  document.getElementById("noteEmpty").style.display = "none";
  document.getElementById("noteContent").style.display = "block";
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
  // Title
  var html = '<div style="margin-bottom:12px;display:flex;align-items:center;gap:8px">' +
    '<input id="noteTitleInput" value="' + escapeHtml(_noteGetTitle()) + '" ' +
      'style="flex:1;font-size:20px;font-weight:600;border:none;border-bottom:2px solid var(--border);padding:4px 0;background:transparent;outline:none" ' +
      'oninput="_noteMarkDirty()" placeholder="Название">' +
    '<button class="btn btn-sm" onclick="_noteDelete()" title="Удалить" style="color:var(--red);flex-shrink:0"><i data-lucide="trash-2" class="lucide" style="width:16px;height:16px"></i></button>' +
  '</div>';

  // Blocks
  _noteBlocks.forEach(function(block, i) {
    html += '<div class="note-block" data-block-idx="' + i + '" style="margin-bottom:12px;position:relative">';
    if (block.type === "text") {
      html += '<div contenteditable="true" class="note-text-block" data-idx="' + i + '" ' +
        'style="min-height:40px;padding:8px;border:1px solid var(--border);border-radius:6px;outline:none;font-size:14px;line-height:1.6;white-space:pre-wrap" ' +
        'oninput="_noteTextChanged(' + i + ', this)" onpaste="_noteHandlePaste(event, ' + i + ')">' +
        escapeHtml(block.value || "") + '</div>';
    } else if (block.type === "drawing") {
      html += '<div style="border:1px solid var(--border);border-radius:6px;overflow:hidden;position:relative">' +
        '<div id="noteDrawToolbar' + i + '" style="display:flex;gap:4px;padding:6px 8px;background:var(--bg-secondary);border-bottom:1px solid var(--border);flex-wrap:wrap;align-items:center">' +
          '<button class="btn btn-sm note-draw-tool" data-idx="' + i + '" data-tool="pen" onclick="_noteSetDrawTool(' + i + ',\\'pen\\')" style="background:var(--primary);color:white"><i data-lucide="pen" class="lucide" style="width:14px;height:14px"></i></button>' +
          '<button class="btn btn-sm note-draw-tool" data-idx="' + i + '" data-tool="eraser" onclick="_noteSetDrawTool(' + i + ',\\'eraser\\')"><i data-lucide="eraser" class="lucide" style="width:14px;height:14px"></i></button>' +
          '<span style="width:1px;height:20px;background:var(--border);margin:0 4px"></span>' +
          '<input type="color" value="#000000" onchange="_noteSetDrawColor(' + i + ', this.value)" style="width:28px;height:28px;padding:0;border:1px solid var(--border);border-radius:4px;cursor:pointer">' +
          '<select onchange="_noteSetDrawSize(' + i + ', +this.value)" style="padding:2px 6px;border:1px solid var(--border);border-radius:4px;font-size:12px">' +
            '<option value="2">Тонкая</option><option value="4" selected>Средняя</option><option value="8">Толстая</option><option value="16">Жирная</option>' +
          '</select>' +
          '<button class="btn btn-sm" onclick="_noteDrawClear(' + i + ')" title="Очистить" style="margin-left:auto"><i data-lucide="trash" class="lucide" style="width:14px;height:14px"></i></button>' +
        '</div>' +
        '<canvas id="noteCanvas' + i + '" width="800" height="400" style="width:100%;cursor:crosshair;touch-action:none;display:block" data-idx="' + i + '"></canvas>' +
      '</div>';
    } else if (block.type === "image") {
      html += '<div style="border:1px solid var(--border);border-radius:6px;overflow:hidden;position:relative">' +
        '<img src="' + block.dataUrl + '" style="max-width:100%;display:block">' +
      '</div>';
    }
    // block remove button
    html += '<button class="btn btn-sm" onclick="_noteRemoveBlock(' + i + ')" ' +
      'style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:var(--red);color:white;padding:0;display:flex;align-items:center;justify-content:center;font-size:12px;opacity:0.7" ' +
      'title="Удалить блок">&times;</button>';
    html += '</div>';
  });

  // Add block buttons
  html += '<div style="display:flex;gap:8px;margin-top:8px">' +
    '<button class="btn btn-sm" onclick="_noteAddBlock(\\'text\\')"><i data-lucide="type" class="lucide" style="width:14px;height:14px"></i> Текст</button>' +
    '<button class="btn btn-sm" onclick="_noteAddBlock(\\'drawing\\')"><i data-lucide="pen-tool" class="lucide" style="width:14px;height:14px"></i> Рисунок</button>' +
  '</div>';

  // Autosave indicator
  html += '<div id="noteSaveIndicator" style="position:fixed;bottom:16px;right:16px;font-size:12px;color:var(--text-secondary);background:white;padding:4px 10px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.1);display:none"></div>';

  wrap.innerHTML = html;
  renderIcons();

  // Init canvases
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
  // text paste — allow default contenteditable behavior
  setTimeout(function() { _noteTextChanged(idx, ev.target); }, 0);
}

function _noteAddBlock(type) {
  if (type === "text") {
    _noteBlocks.push({ type: "text", value: "" });
  } else if (type === "drawing") {
    _noteBlocks.push({ type: "drawing", dataUrl: "" });
  }
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

  // High DPI
  var rect = canvas.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = 400 * dpr;
  canvas.style.height = "400px";
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, rect.width, 400);

  // Load existing drawing
  if (existingDataUrl) {
    var img = new Image();
    img.onload = function() { ctx.drawImage(img, 0, 0, rect.width, 400); };
    img.src = existingDataUrl;
  }

  var state = { canvas: canvas, ctx: ctx, active: false, color: "#000000", size: 4, eraser: false, lastPt: null };
  canvas.dataset.drawState = idx;
  if (!window._noteDrawStates) window._noteDrawStates = {};
  window._noteDrawStates[idx] = state;

  // Pointer events (works with stylus, touch, mouse)
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
    // Save canvas to block
    _noteBlocks[idx].dataUrl = st.canvas.toDataURL("image/png");
    _noteMarkDirty();
  }
}

function _noteSetDrawTool(idx, tool) {
  var st = window._noteDrawStates[idx]; if (!st) return;
  st.eraser = (tool === "eraser");
  // Update toolbar active state
  var toolbar = document.getElementById("noteDrawToolbar" + idx);
  if (toolbar) {
    toolbar.querySelectorAll(".note-draw-tool").forEach(function(btn) {
      btn.style.background = (btn.dataset.tool === tool) ? "var(--primary)" : "";
      btn.style.color = (btn.dataset.tool === tool) ? "white" : "";
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

// ========== SAVE/DELETE ==========
async function _noteSaveNow() {
  if (!_currentNoteId || !_noteDirty) return;
  _noteDirty = false;
  var title = _noteGetTitle();
  var ind = document.getElementById("noteSaveIndicator");
  if (ind) { ind.textContent = "Сохранение..."; ind.style.display = "block"; }
  try {
    await api("/notes/" + _currentNoteId, "PUT", { title: title, content_json: _noteBlocks });
    // Update cache
    var cached = _notesListCache.find(function(n) { return n.id === _currentNoteId; });
    if (cached) { cached.title = title; cached.updated_at = new Date().toISOString(); }
    _noteRenderList();
    if (ind) { ind.textContent = "Сохранено"; setTimeout(function() { ind.style.display = "none"; }, 1500); }
  } catch(e) {
    console.error("save note error", e);
    if (ind) { ind.textContent = "Ошибка сохранения"; ind.style.color = "var(--red)"; }
  }
}

async function _noteDelete() {
  if (!_currentNoteId) return;
  if (!confirm("Удалить заметку?")) return;
  try {
    await api("/notes/" + _currentNoteId, "DELETE");
    _notesListCache = _notesListCache.filter(function(n) { return n.id !== _currentNoteId; });
    _currentNoteId = null;
    _noteBlocks = [];
    document.getElementById("noteEmpty").style.display = "flex";
    document.getElementById("noteContent").style.display = "none";
    _noteRenderList();
  } catch(e) { console.error("delete note error", e); }
}
`;
