/* eslint-disable */
module.exports = `
// ============================================================
// building-floor-plan.js — Поэтажные планы корпуса
// Зависимости: api(), escapeHtml(), setModalContent(), closeModal(), showEntity()
// ============================================================

var _fpBuildingId   = null;
var _fpFloorPlans   = [];      // [{file_id, floor_name, polygons:[{room_id, pts:[[x%,y%],...]}]}]
var _fpCurrentFloor = 0;
var _fpRoomStatuses = [];      // [{room_id, room_name, status, contract_id, contractor_name}]
var _fpEditMode     = false;
var _fpDrawing      = false;
var _fpCurrentPts   = [];      // [[x%, y%], ...] рисуемый полигон
var _fpDirty        = false;
var _fpBlobUrls     = {};      // "fileId" (image) or "fileId_pN" (pdf page) -> blob URL
var _fpFileInfo     = {};      // file_id -> {mimetype, name, page_count?}
var _fpLoadGen      = 0;       // поколение загрузки (чтобы отменять устаревшие)

var FP_COLORS = {
  rented:    { fill: 'rgba(59,130,246,0.30)',  stroke: '#2563eb', text: '#1d4ed8' },
  available: { fill: 'rgba(34,197,94,0.30)',   stroke: '#16a34a', text: '#15803d' },
  tech:      { fill: 'rgba(148,163,184,0.28)', stroke: '#94a3b8', text: '#64748b' },
};

// ── Инициализация (вызывается из entity-detail после рендера) ─────────────
async function _fpInit(buildingId) {
  _fpBuildingId   = buildingId;
  _fpFloorPlans   = [];
  _fpCurrentFloor = 0;
  _fpEditMode     = false;
  _fpDrawing      = false;
  _fpCurrentPts   = [];
  _fpDirty        = false;
  _fpFileInfo     = {};
  _fpLoadGen++;

  var el = document.getElementById('fpContainer');
  if (!el) return;
  el.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:13px">Загрузка планов...</div>';

  try {
    var results = await Promise.all([
      api('/buildings/' + buildingId + '/room-status'),
      api('/entities/' + buildingId + '/files'),
      api('/entities/' + buildingId),
    ]);
    var statuses   = results[0];
    var filesResp  = results[1];
    var entityResp = results[2];

    _fpRoomStatuses = Array.isArray(statuses) ? statuses : [];

    var imgFiles = Array.isArray(filesResp)
      ? filesResp.filter(function(f) { return f.mimetype && (f.mimetype.startsWith('image/') || f.mimetype === 'application/pdf'); })
      : [];
    // Кэшируем info о файлах (нужно для PDF-рендера)
    imgFiles.forEach(function(f) { _fpFileInfo[f.id] = { mimetype: f.mimetype, name: f.original_name || '' }; });

    var savedPlans = null;
    var rawPlans = (entityResp.properties || {}).floor_plans;
    if (Array.isArray(rawPlans)) {
      savedPlans = rawPlans;
    } else if (typeof rawPlans === 'string') {
      try { savedPlans = JSON.parse(rawPlans); } catch(e) {}
    }

    if (Array.isArray(savedPlans) && savedPlans.length > 0) {
      _fpFloorPlans = savedPlans;
    } else {
      // Авто-создаём вкладки из загруженных файлов (изображения + PDF)
      _fpFloorPlans = imgFiles.map(function(f) {
        var nm = f.original_name || '';
        var isPdf = f.mimetype === 'application/pdf';
        return { file_id: f.id, floor_name: nm.replace(/[.][^.]+$/, ''), polygons: [], page_number: isPdf ? 1 : undefined };
      });
    }
    _fpRender();
  } catch(err) {
    var el2 = document.getElementById('fpContainer');
    if (el2) el2.innerHTML = '<div style="color:#dc2626;padding:12px;font-size:13px">Ошибка: ' +
      escapeHtml(String(err && err.message ? err.message : err)) + '</div>';
  }
}

// ── Главный рендер ────────────────────────────────────────────────────────
function _fpRender() {
  var el = document.getElementById('fpContainer');
  if (!el) return;

  var h = '';

  // Панель вкладок + кнопки
  h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap">';

  _fpFloorPlans.forEach(function(fp, i) {
    var active = i === _fpCurrentFloor;
    var tabStyle = 'padding:4px 12px;border-radius:6px;border:1px solid var(--border);cursor:pointer;font-size:12px;font-weight:' + (active ? '600' : '400') + ';background:' + (active ? 'var(--accent)' : 'var(--surface)') + ';color:' + (active ? '#fff' : 'var(--text)') + ';';
    h += '<button onclick="_fpSwitchFloor(' + i + ')" style="' + tabStyle + '">' + escapeHtml(fp.floor_name) + '</button>';
  });

  h += '<label style="padding:4px 10px;border-radius:6px;border:1px dashed var(--border);background:transparent;cursor:pointer;font-size:12px;color:var(--text-muted)">';
  h += '+ Добавить план<input type="file" accept="image/*,application/pdf" style="display:none" onchange="_fpHandleUpload(this)"></label>';

  h += '<span style="flex:1"></span>';

  if (_fpFloorPlans.length > 0) {
    if (!_fpEditMode) {
      h += '<button onclick="_fpToggleEdit()" class="btn btn-sm">✏ Разметить</button>';
    } else {
      var hint = _fpDrawing
        ? 'Двойной клик — закрыть полигон &nbsp;·&nbsp; ESC — отмена'
        : 'Кликай по плану чтобы нанести помещение';
      h += '<span style="font-size:11px;color:var(--text-muted)">' + hint + '</span>';
      h += '<button onclick="_fpToggleEdit()" class="btn btn-sm" style="margin-left:6px">✕ Выйти</button>';
      if (_fpDirty) {
        h += '<button onclick="_fpSave()" class="btn btn-sm btn-primary" style="margin-left:4px">💾 Сохранить</button>';
      }
    }
  }
  h += '</div>';

  // Легенда
  if (_fpFloorPlans.length > 0) {
    h += '<div style="display:flex;gap:14px;margin-bottom:8px;font-size:11px;color:var(--text-muted);flex-wrap:wrap">';
    ['rented','available','tech'].forEach(function(s) {
      var c = FP_COLORS[s];
      var lbl = s === 'rented' ? 'Арендовано' : (s === 'available' ? 'Свободно' : 'Тех. помещение');
      h += '<span><span style="display:inline-block;width:11px;height:11px;border-radius:2px;background:' + c.fill + ';border:1.5px solid ' + c.stroke + ';vertical-align:middle;margin-right:3px"></span>' + lbl + '</span>';
    });
    h += '</div>';
  }

  // Изображение с SVG-оверлеем
  if (_fpFloorPlans.length === 0) {
    h += '<div style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px;border:1.5px dashed var(--border);border-radius:8px">' +
      'Нет поэтажных планов. Нажми «+ Добавить план» чтобы загрузить изображение.' +
      '</div>';
  } else {
    var plan = _fpFloorPlans[_fpCurrentFloor];
    if (plan) {
      var wrapCursor = _fpEditMode ? 'crosshair' : 'default';
      h += '<div id="fpImgWrap" style="position:relative;display:inline-block;max-width:100%;border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:' + wrapCursor + ';line-height:0">';
      h += '<img id="fpImg" src="" alt="план этажа" style="display:block;max-width:100%;height:auto;user-select:none" draggable="false">';
      // SVG-оверлей
      h += '<svg id="fpSvg" viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible">';

      (plan.polygons || []).forEach(function(poly, pi) {
        var rs = _fpGetRoomStatus(poly.room_id);
        var c  = FP_COLORS[rs ? rs.status : 'available'];
        var pts = (poly.pts || []).map(function(p) { return p[0] + ',' + p[1]; }).join(' ');
        var centX = 0, centY = 0;
        (poly.pts || []).forEach(function(p) { centX += p[0]; centY += p[1]; });
        if (poly.pts && poly.pts.length) { centX /= poly.pts.length; centY /= poly.pts.length; }

        h += '<g>';
        // Полигон (в режиме редактирования — pointer-events:none, чтобы клики проходили к враперу)
        var peCursor = (!_fpEditMode && rs && rs.status === 'rented') ? 'pointer' : 'default';
        var peEvents = _fpEditMode ? 'none' : 'all';
        h += '<polygon points="' + pts + '" fill="' + c.fill + '" stroke="' + c.stroke + '" stroke-width="0.5"' +
          ' style="cursor:' + peCursor + ';pointer-events:' + peEvents + '"' +
          ' onclick="_fpPolyClick(' + pi + ')"></polygon>';
        // Лейбл
        var lbl = escapeHtml(_fpRoomLabel(poly.room_id));
        h += '<text x="' + centX + '" y="' + centY + '" text-anchor="middle" dominant-baseline="middle"' +
          ' style="font-size:2.5px;fill:' + c.text + ';pointer-events:none;user-select:none;font-weight:600">' + lbl + '</text>';
        // Кнопка удаления (только в режиме редактирования)
        if (_fpEditMode && poly.pts && poly.pts.length > 0) {
          var dx = poly.pts[0][0], dy = poly.pts[0][1];
          h += '<g onclick="event.stopPropagation();_fpDeletePolygon(' + _fpCurrentFloor + ',' + pi + ')" style="cursor:pointer;pointer-events:all">';
          h += '<circle cx="' + dx + '" cy="' + dy + '" r="2.8" fill="#ef4444" stroke="#fff" stroke-width="0.4"></circle>';
          h += '<text x="' + dx + '" y="' + dy + '" text-anchor="middle" dominant-baseline="middle" style="font-size:3.2px;fill:#fff;pointer-events:none;font-weight:700">x</text>';
          h += '</g>';
        }
        h += '</g>';
      });

      // Превью рисуемого полигона
      if (_fpDrawing && _fpCurrentPts.length > 0) {
        var dPts = _fpCurrentPts.map(function(p) { return p[0] + ',' + p[1]; }).join(' ');
        h += '<polyline points="' + dPts + '" fill="none" stroke="#f59e0b" stroke-width="0.6" stroke-dasharray="1.2,0.6" style="pointer-events:none"></polyline>';
        _fpCurrentPts.forEach(function(p) {
          h += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.1" fill="#f59e0b" style="pointer-events:none"></circle>';
        });
      }

      h += '</svg>';
      h += '</div>';
    }
  }

  el.innerHTML = h;

  // Загружаем изображение/PDF (через fetch с auth, создаём blob URL)
  if (_fpFloorPlans.length > 0 && _fpFloorPlans[_fpCurrentFloor]) {
    var curPlan = _fpFloorPlans[_fpCurrentFloor];
    _fpLoadFloorImg(curPlan.file_id, _fpLoadGen, curPlan.page_number);
  }

  // Навешиваем обработчики на враппер (в режиме редактирования)
  if (_fpEditMode) {
    var wrap = document.getElementById('fpImgWrap');
    if (wrap) {
      wrap.addEventListener('click',    _fpHandleClick);
      wrap.addEventListener('dblclick', _fpHandleDblClick);
    }
    document.addEventListener('keydown', _fpHandleKey);
  }
}

// ── Загрузка картинки/PDF через fetch (auth) ─────────────────────────────
async function _fpLoadFloorImg(fileId, gen, pageNum) {
  pageNum = pageNum || 1;
  var info = _fpFileInfo[fileId] || {};
  // Для PDF — отдельный рендер через pdf.js
  if (info.mimetype === 'application/pdf') {
    await _fpRenderPdfPage(fileId, pageNum, gen);
    return;
  }

  var img = document.getElementById('fpImg');
  if (!img) return;

  // Используем кэшированный blob URL если есть
  if (_fpBlobUrls[fileId]) { img.src = _fpBlobUrls[fileId]; return; }

  var token = TOKEN || localStorage.getItem('accessToken') || '';
  try {
    var resp = await fetch('/api/entities/' + _fpBuildingId + '/files/' + fileId, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (!resp.ok) return;
    var blob = await resp.blob();
    var url  = URL.createObjectURL(blob);
    _fpBlobUrls[fileId] = url;
    // Проверяем что пользователь не переключился на другой этаж за время загрузки
    if (gen !== _fpLoadGen) return;
    var img2 = document.getElementById('fpImg');
    if (img2) img2.src = url;
  } catch(e) {}
}

// ── Загрузка pdf.js из CDN (лениво, один раз) ────────────────────────────
async function _fpLoadPdfJs() {
  if (typeof pdfjsLib !== 'undefined') return;
  await new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = resolve;
    s.onerror = function() { reject(new Error('Не удалось загрузить pdf.js')); };
    document.head.appendChild(s);
  });
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ── Рендер страницы PDF в blob URL (кэшируется) ───────────────────────────
async function _fpRenderPdfPage(fileId, pageNum, gen) {
  var cacheKey = fileId + '_p' + pageNum;
  var img = document.getElementById('fpImg');
  if (!img) return;

  if (_fpBlobUrls[cacheKey]) {
    if (gen === _fpLoadGen) { img.src = _fpBlobUrls[cacheKey]; }
    return;
  }

  var token = TOKEN || localStorage.getItem('accessToken') || '';
  try {
    await _fpLoadPdfJs();
    var resp = await fetch('/api/entities/' + _fpBuildingId + '/files/' + fileId, {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (!resp.ok) return;
    var arrayBuf = await resp.arrayBuffer();
    var pdfDoc   = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
    var page     = await pdfDoc.getPage(pageNum);
    var viewport = page.getViewport({ scale: 2.0 }); // 2x — резкость для разметки
    var canvas   = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
    var blob = await new Promise(function(res) { canvas.toBlob(res, 'image/png'); });
    var url  = URL.createObjectURL(blob);
    _fpBlobUrls[cacheKey] = url;
    if (gen !== _fpLoadGen) return;
    var img2 = document.getElementById('fpImg');
    if (img2) img2.src = url;
  } catch(e) {
    console.error('PDF render error:', e);
  }
}

// ── Переключение вкладок ──────────────────────────────────────────────────
function _fpSwitchFloor(idx) {
  _fpLoadGen++;
  _fpCurrentFloor = idx;
  _fpDrawing      = false;
  _fpCurrentPts   = [];
  document.removeEventListener('keydown', _fpHandleKey);
  _fpRender();
}

// ── Режим редактирования ──────────────────────────────────────────────────
function _fpToggleEdit() {
  _fpEditMode = !_fpEditMode;
  if (!_fpEditMode) {
    _fpDrawing    = false;
    _fpCurrentPts = [];
    document.removeEventListener('keydown', _fpHandleKey);
  }
  _fpRender();
}

function _fpHandleKey(evt) {
  if (evt.key !== 'Escape') return;
  _fpDrawing    = false;
  _fpCurrentPts = [];
  _fpRender();
  // Переприкрепляем обработчики
  if (_fpEditMode) {
    var wrap = document.getElementById('fpImgWrap');
    if (wrap) {
      wrap.addEventListener('click',    _fpHandleClick);
      wrap.addEventListener('dblclick', _fpHandleDblClick);
    }
  }
}

// ── Рисование полигона ────────────────────────────────────────────────────
function _fpGetImgCoords(evt) {
  var img = document.getElementById('fpImg');
  if (!img) return null;
  var rect = img.getBoundingClientRect();
  var x = ((evt.clientX - rect.left) / rect.width)  * 100;
  var y = ((evt.clientY - rect.top)  / rect.height) * 100;
  // Округляем до 1 знака после запятой
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function _fpHandleClick(evt) {
  if (evt.detail >= 2) return;          // пропускаем второй клик двойного
  var pt = _fpGetImgCoords(evt);
  if (!pt) return;
  _fpDrawing = true;
  _fpCurrentPts.push(pt);
  _fpRender();
  if (_fpEditMode) {
    var wrap = document.getElementById('fpImgWrap');
    if (wrap) {
      wrap.addEventListener('click',    _fpHandleClick);
      wrap.addEventListener('dblclick', _fpHandleDblClick);
    }
  }
}

function _fpHandleDblClick(evt) {
  evt.preventDefault();
  if (_fpCurrentPts.length < 3) {
    _fpDrawing    = false;
    _fpCurrentPts = [];
    _fpRender();
    if (_fpEditMode) {
      var wrap = document.getElementById('fpImgWrap');
      if (wrap) { wrap.addEventListener('click', _fpHandleClick); wrap.addEventListener('dblclick', _fpHandleDblClick); }
    }
    return;
  }
  var pts = _fpCurrentPts.slice();
  _fpDrawing    = false;
  _fpCurrentPts = [];
  _fpShowRoomPicker(pts);
}

// ── Выбор помещения после рисования ──────────────────────────────────────
function _fpShowRoomPicker(pts) {
  var plan    = _fpFloorPlans[_fpCurrentFloor];
  var usedIds = new Set((plan ? plan.polygons || [] : []).map(function(p) { return p.room_id; }));
  var free    = _fpRoomStatuses.filter(function(r) { return !usedIds.has(r.room_id); });

  var m = '<div style="padding:20px;max-width:360px">';
  m += '<h3 style="margin:0 0 14px;font-size:15px">Выберите помещение</h3>';

  if (!free.length) {
    m += '<div style="color:var(--text-muted);font-size:13px;margin-bottom:14px">Все помещения уже размечены на этом этаже.</div>';
    m += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Закрыть</button></div></div>';
    setModalContent(m);
    return;
  }

  m += '<select id="fpRoomSel" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius);font-size:13px;margin-bottom:14px">';
  m += '<option value="">— выберите помещение —</option>';
  free.forEach(function(r) {
    var lbl = r.room_name + (r.object_type ? ' (' + r.object_type + ')' : '');
    m += '<option value="' + r.room_id + '">' + escapeHtml(lbl) + '</option>';
  });
  m += '</select>';

  // Передаём точки через скрытый input (данные не содержат кавычек — числа)
  var ptsJson = JSON.stringify(pts);
  m += '<input type="hidden" id="fpPickerPts" value="' + escapeHtml(ptsJson) + '">';

  m += '<div class="modal-actions">';
  m += '<button class="btn" onclick="closeModal()">Отмена</button>';
  m += '<button class="btn btn-primary" onclick="_fpConfirmRoom()">Привязать</button>';
  m += '</div></div>';

  setModalContent(m);
}

function _fpConfirmRoom() {
  var sel   = document.getElementById('fpRoomSel');
  var ptsEl = document.getElementById('fpPickerPts');
  if (!sel || !sel.value) { alert('Выберите помещение'); return; }

  var roomId = parseInt(sel.value);
  var pts    = [];
  try { pts = JSON.parse(ptsEl ? ptsEl.value : '[]'); } catch(e) {}

  var plan = _fpFloorPlans[_fpCurrentFloor];
  if (!plan) return;
  if (!plan.polygons) plan.polygons = [];
  plan.polygons.push({ room_id: roomId, pts: pts });
  _fpDirty = true;
  closeModal();
  _fpRender();
  if (_fpEditMode) {
    var wrap = document.getElementById('fpImgWrap');
    if (wrap) {
      wrap.addEventListener('click',    _fpHandleClick);
      wrap.addEventListener('dblclick', _fpHandleDblClick);
    }
  }
}

// ── Удаление полигона ─────────────────────────────────────────────────────
function _fpDeletePolygon(floorIdx, polyIdx) {
  if (!_fpFloorPlans[floorIdx]) return;
  _fpFloorPlans[floorIdx].polygons.splice(polyIdx, 1);
  _fpDirty = true;
  _fpRender();
  if (_fpEditMode) {
    var wrap = document.getElementById('fpImgWrap');
    if (wrap) {
      wrap.addEventListener('click',    _fpHandleClick);
      wrap.addEventListener('dblclick', _fpHandleDblClick);
    }
  }
}

// ── Клик по полигону (режим просмотра) ───────────────────────────────────
function _fpPolyClick(polyIdx) {
  if (_fpEditMode) return;
  var plan = _fpFloorPlans[_fpCurrentFloor];
  if (!plan) return;
  var poly = plan.polygons[polyIdx];
  if (!poly) return;
  var rs = _fpGetRoomStatus(poly.room_id);
  if (rs && rs.status === 'rented' && rs.contract_id) {
    showEntity(rs.contract_id);
  } else if (poly.room_id) {
    showEntity(poly.room_id);
  }
}

// ── Сохранение ────────────────────────────────────────────────────────────
async function _fpSave() {
  try {
    await api('/buildings/' + _fpBuildingId + '/floor-plans', {
      method: 'PUT',
      body: JSON.stringify({ floor_plans: _fpFloorPlans }),
    });
    _fpDirty = false;
    _fpRender();
    if (_fpEditMode) {
      var wrap = document.getElementById('fpImgWrap');
      if (wrap) { wrap.addEventListener('click', _fpHandleClick); wrap.addEventListener('dblclick', _fpHandleDblClick); }
    }
  } catch(err) {
    alert('Ошибка сохранения: ' + (err && err.message ? err.message : String(err)));
  }
}

// ── Загрузка файла плана (изображение или PDF) ───────────────────────────
async function _fpHandleUpload(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  var isPdf    = file.type === 'application/pdf';
  var baseName = (file.name || '').replace(/[.][^.]+$/, '') || 'Этаж ' + (_fpFloorPlans.length + 1);

  var form  = new FormData();
  form.append('file', file);
  var token = TOKEN || localStorage.getItem('accessToken') || '';

  try {
    var resp = await fetch('/api/entities/' + _fpBuildingId + '/files', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body:    form,
    });
    if (!resp.ok) { var t = await resp.text(); throw new Error(t); }
    var data      = await resp.json();
    var newFileId = data.id;

    // Кэшируем info о новом файле
    _fpFileInfo[newFileId] = { mimetype: file.type, name: file.name };

    var insertIdx = _fpFloorPlans.length;

    if (isPdf) {
      // Определяем кол-во страниц через pdf.js и создаём вкладку на каждую
      try {
        await _fpLoadPdfJs();
        var arrayBuf = await file.arrayBuffer();
        var pdfDoc   = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
        var numPages = pdfDoc.numPages;
        _fpFileInfo[newFileId].page_count = numPages;
        for (var p = 1; p <= numPages; p++) {
          var pgName = numPages > 1 ? baseName + ' — стр. ' + p : baseName;
          _fpFloorPlans.push({ file_id: newFileId, floor_name: pgName, polygons: [], page_number: p });
        }
      } catch(pdfErr) {
        // Fallback: создаём одну вкладку
        _fpFloorPlans.push({ file_id: newFileId, floor_name: baseName, polygons: [], page_number: 1 });
      }
    } else {
      _fpFloorPlans.push({ file_id: newFileId, floor_name: baseName, polygons: [] });
    }

    _fpCurrentFloor = insertIdx; // переключиться на первую новую вкладку
    _fpDirty  = true;
    _fpLoadGen++;
    _fpRender();
  } catch(err) {
    alert('Ошибка загрузки: ' + (err && err.message ? err.message : String(err)));
  }
}

// ── Вспомогательные функции ───────────────────────────────────────────────
function _fpGetRoomStatus(roomId) {
  for (var i = 0; i < _fpRoomStatuses.length; i++) {
    if (_fpRoomStatuses[i].room_id === roomId) return _fpRoomStatuses[i];
  }
  return null;
}

function _fpRoomLabel(roomId) {
  var rs = _fpGetRoomStatus(roomId);
  if (!rs) return '?';
  // Короткий лейбл: только название помещения
  return rs.room_name;
}
`;
