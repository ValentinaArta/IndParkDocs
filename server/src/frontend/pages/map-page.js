/* eslint-disable */
module.exports = `
// === INTERACTIVE MAP ===

// ============ INTERACTIVE MAP ============

var _mapEditMode = false;
var _mapDrawTool  = 'rect';   // 'rect' | 'poly'
var _mapHotspots  = [];       // [{shape, entity_id, entity_name, ...}]
var _mapRectDraw  = null;     // {startX,startY,curX,curY} during rect drag
var _mapPolyPts   = [];       // [[x,y],...] accumulating polygon vertices
var _mapMousePos  = {x:0,y:0};// current cursor on map (% coords)
var _mapZoom      = 1;        // current zoom level
var _mapPanX      = 0;        // pan offset X (px)
var _mapPanY      = 0;        // pan offset Y (px)
var _mapPanDrag   = null;     // {sx,sy} drag origin minus pan offset

async function showMapPage() {
  currentView = 'map';
  currentTypeFilter = null;
  _mapEditMode = false; _mapDrawTool = 'rect'; _mapPolyPts = []; _mapRectDraw = null;
  _mapZoom = 1; _mapPanX = 0; _mapPanY = 0; _mapPanDrag = null;
  setActive('.nav-item[onclick*="showMapPage"]');
  document.getElementById('pageTitle').textContent = 'Карта территории';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';

  var buildings = await api('/entities?type=building');
  var landPlots  = await api('/entities?type=land_plot');
  _mapHotspots = [];
  buildings.concat(landPlots).forEach(function(e) {
    var p = e.properties || {};
    if (p.map_shape === 'polygon' && p.map_points) {
      try { var pts = JSON.parse(p.map_points);
        _mapHotspots.push({ shape:'polygon', entity_id:e.id, entity_name:e.name, short_name:p.short_name||'', type_name:e.type_name, points:pts, color:p.map_color||'rgba(99,102,241,0.35)' });
      } catch(ex) {}
    } else if (p.map_x != null) {
      _mapHotspots.push({ shape:'rect', entity_id:e.id, entity_name:e.name, short_name:p.short_name||'', type_name:e.type_name,
        x:parseFloat(p.map_x), y:parseFloat(p.map_y), w:parseFloat(p.map_w), h:parseFloat(p.map_h), color:p.map_color||'rgba(99,102,241,0.35)' });
    }
  });

  var html = '<div style="padding:16px">';
  html += '<div class="map-editor-bar">';
  html += '<button class="btn btn-sm" id="mapEditBtn" onclick="_mapToggleEdit()">' + icon('pencil',14) + ' Разметить</button>';
  html += '<div style="display:flex;align-items:center;gap:4px;margin-left:8px">';
  html += '<button class="btn btn-sm" onclick="_mapZoomOut()" title="Уменьшить">' + icon('minus',13) + '</button>';
  html += '<span id="mapZoomPct" style="font-size:12px;min-width:36px;text-align:center;color:var(--text-muted)">100%</span>';
  html += '<button class="btn btn-sm" onclick="_mapZoomIn()" title="Увеличить">' + icon('plus',13) + '</button>';
  html += '<button class="btn btn-sm" onclick="_mapZoomReset()" title="Сбросить масштаб" style="padding:4px 6px">' + icon('maximize-2',13) + '</button>';
  html += '</div>';
  html += '<span id="mapEditTools" style="display:none;align-items:center;gap:8px;flex-wrap:wrap">';
  html += '<button class="btn btn-sm btn-primary" id="mapToolRect" onclick="_mapSetTool(\\'rect\\')">' + icon('square',13) + ' Прямоугольник</button>';
  html += '<button class="btn btn-sm" id="mapToolPoly" onclick="_mapSetTool(\\'poly\\')">' + icon('pentagon',13) + ' Многоугольник</button>';
  html += '<span id="mapPolyStatus" style="font-size:12px;color:var(--text-muted);display:none"></span>';
  html += '<button id="mapPolyCancelBtn" class="btn btn-sm" style="display:none" onclick="_mapPolyCancelDraw()">Отмена</button>';
  html += '</span>';
  html += '</div>';
  html += '<div id="mapViewport" style="position:relative;overflow:hidden;width:100%;cursor:default;background:#e8e8e8;border-radius:6px">';
  html += '<div id="mapInner" style="transform-origin:0 0;transform:translate(0,0) scale(1);position:relative;line-height:0">';
  html += '<img src="/maps/territory.jpg" id="mapImg" style="display:block;width:100%;height:auto;user-select:none" draggable="false">';
  html += '<svg id="mapSvg" viewBox="0 0 100 100" preserveAspectRatio="none"';
  html += ' style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible">';
  html += '<defs></defs>';
  html += '<g id="mapShapes"></g><g id="mapDrawPreview"></g>';
  html += '</svg>';
  html += '<div id="mapLabels" style="position:absolute;top:0;left:0;width:100%;height:100%;overflow:visible;pointer-events:none"></div>';
  html += '</div></div></div>';

  document.getElementById('content').innerHTML = html;
  renderIcons();
  var img = document.getElementById('mapImg');
  img.addEventListener('load', _mapRenderShapes);
  if (img.complete) _mapRenderShapes();
  _mapBindEvents();
}

// ── Coordinate helper ───────────────────────────────────────────────────────
function _mapPct(e) {
  var img = document.getElementById('mapImg');
  var r   = img.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width)  * 100)),
    y: Math.max(0, Math.min(100, ((e.clientY - r.top)  / r.height) * 100))
  };
}

// ── Event binding ────────────────────────────────────────────────────────────
function _mapBindEvents() {
  var c = document.getElementById('mapViewport');
  if (!c) return;
  c.addEventListener('mousedown',    _mapEvtDown);
  c.addEventListener('mousemove',    _mapEvtMove);
  c.addEventListener('mouseup',      _mapEvtUp);
  c.addEventListener('click',        _mapEvtClick);
  c.addEventListener('dblclick',     _mapEvtDbl);
  c.addEventListener('wheel',        _mapEvtWheel, {passive:false});
  c.addEventListener('contextmenu',  function(e){ if(_mapPolyPts.length){ e.preventDefault(); _mapPolyCancelDraw(); } });
  // Also stop pan if mouse released outside viewport
  document.addEventListener('mouseup', function(e){ if(_mapPanDrag){ _mapPanDrag=null; var v=document.getElementById('mapViewport'); if(v) v.style.cursor=_mapEditMode?'crosshair':(_mapZoom>1?'grab':'default'); } });
}

function _mapEvtDown(e) {
  if (e.target.closest('[data-mapbtn]')) return;
  if (!_mapEditMode) {
    // View mode — start pan
    e.preventDefault();
    _mapPanDrag = { sx: e.clientX - _mapPanX, sy: e.clientY - _mapPanY };
    var vp = document.getElementById('mapViewport');
    if (vp) vp.style.cursor = 'grabbing';
    return;
  }
  if (_mapDrawTool !== 'rect') return;
  e.preventDefault();
  var p = _mapPct(e);
  _mapRectDraw = { sx:p.x, sy:p.y, cx:p.x, cy:p.y };
  _mapRenderPreview();
}
function _mapEvtMove(e) {
  if (_mapPanDrag) {
    _mapPanX = e.clientX - _mapPanDrag.sx;
    _mapPanY = e.clientY - _mapPanDrag.sy;
    _mapApplyTransform();
    return;
  }
  var p = _mapPct(e); _mapMousePos = p;
  if (_mapEditMode && _mapDrawTool === 'rect' && _mapRectDraw) {
    _mapRectDraw.cx = p.x; _mapRectDraw.cy = p.y; _mapRenderPreview();
  }
  if (_mapEditMode && _mapDrawTool === 'poly' && _mapPolyPts.length) _mapRenderPreview();
}
function _mapEvtUp(e) {
  if (_mapPanDrag) {
    _mapPanDrag = null;
    var vp = document.getElementById('mapViewport');
    if (vp) vp.style.cursor = _mapZoom > 1 ? 'grab' : 'default';
    return;
  }
  if (!_mapEditMode || _mapDrawTool !== 'rect' || !_mapRectDraw) return;
  if (e.target.closest('[data-mapbtn]')) return;
  var p = _mapPct(e);
  var x = Math.min(_mapRectDraw.sx, p.x), y = Math.min(_mapRectDraw.sy, p.y);
  var w = Math.abs(p.x - _mapRectDraw.sx),  h = Math.abs(p.y - _mapRectDraw.sy);
  _mapRectDraw = null; _mapRenderPreview();
  if (w < 0.8 || h < 0.8) return;
  _mapOpenAssignModal({ shape:'rect', x:parseFloat(x.toFixed(2)), y:parseFloat(y.toFixed(2)), w:parseFloat(w.toFixed(2)), h:parseFloat(h.toFixed(2)) });
}
function _mapEvtClick(e) {
  if (!_mapEditMode || _mapDrawTool !== 'poly') return;
  if (e.target.closest('[data-mapbtn]')) return;
  if (e.detail >= 2) return; // let dblclick handle
  e.preventDefault();
  var p = _mapPct(e);
  _mapPolyPts.push([parseFloat(p.x.toFixed(2)), parseFloat(p.y.toFixed(2))]);
  _mapPolyStatus(); _mapRenderPreview();
}
function _mapEvtDbl(e) {
  if (!_mapEditMode || _mapDrawTool !== 'poly') return;
  if (e.target.closest('[data-mapbtn]')) return;
  e.preventDefault();
  if (_mapPolyPts.length < 3) { alert('Минимум 3 вершины'); return; }
  var pts = _mapPolyPts.slice(); _mapPolyPts = [];
  _mapPolyStatus(); _mapRenderPreview();
  _mapOpenAssignModal({ shape:'polygon', points:pts });
}
function _mapPolyCancelDraw() { _mapPolyPts = []; _mapPolyStatus(); _mapRenderPreview(); }
function _mapPolyStatus() {
  var s = document.getElementById('mapPolyStatus');
  var b = document.getElementById('mapPolyCancelBtn');
  if (!s) return;
  if (_mapDrawTool === 'poly' && _mapPolyPts.length) {
    s.style.display = ''; s.textContent = 'Вершин: ' + _mapPolyPts.length + ' · двойной клик — закрыть';
    if (b) b.style.display = '';
  } else { s.style.display = 'none'; if (b) b.style.display = 'none'; }
}

// ── Toolbar ──────────────────────────────────────────────────────────────────
function _mapToggleEdit() {
  _mapEditMode = !_mapEditMode;
  _mapPolyPts = []; _mapRectDraw = null;
  var btn   = document.getElementById('mapEditBtn');
  var tools = document.getElementById('mapEditTools');
  var vp    = document.getElementById('mapViewport');
  if (_mapEditMode) {
    btn.classList.add('btn-primary');
    btn.innerHTML = icon('check',14) + ' Готово';
    if (tools) { tools.style.display = 'flex'; }
    if (vp)  vp.style.cursor = 'crosshair';
  } else {
    btn.classList.remove('btn-primary');
    btn.innerHTML = icon('pencil',14) + ' Разметить';
    if (tools) tools.style.display = 'none';
    if (vp)  vp.style.cursor = _mapZoom > 1 ? 'grab' : 'default';
  }
  renderIcons(); _mapRenderShapes(); _mapRenderPreview();
}
function _mapSetTool(t) {
  _mapDrawTool = t; _mapPolyPts = []; _mapPolyStatus(); _mapRenderPreview();
  var r = document.getElementById('mapToolRect'), p = document.getElementById('mapToolPoly');
  if (r) r.className = 'btn btn-sm' + (t==='rect'?' btn-primary':'');
  if (p) p.className = 'btn btn-sm' + (t==='poly'?' btn-primary':'');
}

// ── Zoom / pan ────────────────────────────────────────────────────────────────
function _mapApplyTransform() {
  var inner = document.getElementById('mapInner');
  if (inner) inner.style.transform = 'translate('+_mapPanX.toFixed(1)+'px,'+_mapPanY.toFixed(1)+'px) scale('+_mapZoom+')';
  var zd = document.getElementById('mapZoomPct');
  if (zd) zd.textContent = Math.round(_mapZoom*100)+'%';
  var vp = document.getElementById('mapViewport');
  if (vp && !_mapPanDrag) vp.style.cursor = _mapEditMode ? 'crosshair' : (_mapZoom > 1 ? 'grab' : 'default');
  _mapRenderShapes();
  _mapRenderPreview();
}
function _mapZoomIn()    { _mapZoomTo(_mapZoom * 1.4); }
function _mapZoomOut()   { _mapZoomTo(_mapZoom / 1.4); }
function _mapZoomReset() { _mapZoom=1; _mapPanX=0; _mapPanY=0; _mapApplyTransform(); }
function _mapZoomTo(newZoom, cx, cy) {
  var vp = document.getElementById('mapViewport');
  if (!vp) return;
  newZoom = Math.max(0.5, Math.min(16, newZoom));
  if (cx === undefined) { cx = vp.offsetWidth/2; cy = vp.offsetHeight/2; }
  var innerX = (cx - _mapPanX) / _mapZoom;
  var innerY = (cy - _mapPanY) / _mapZoom;
  _mapZoom = newZoom;
  _mapPanX = cx - innerX * _mapZoom;
  _mapPanY = cy - innerY * _mapZoom;
  _mapApplyTransform();
}
function _mapEvtWheel(e) {
  e.preventDefault();
  var r = document.getElementById('mapViewport').getBoundingClientRect();
  var cx = e.clientX - r.left;
  var cy = e.clientY - r.top;
  var delta = e.deltaY > 0 ? 0.92 : 1.09;
  _mapZoomTo(_mapZoom * delta, cx, cy);
}

// ── Render hotspot shapes (SVG) ───────────────────────────────────────────────
function _mapRenderShapes() {
  var layer = document.getElementById('mapShapes');
  if (!layer) return;
  var z = _mapZoom || 1;   // scale-invariant factor: divide by z to keep screen-size constant
  var h = '';
  _mapHotspots.forEach(function(hs, i) {
    // Boost fill opacity to minimum 0.65 so all zones look solid
    var fill = hs.color.replace(/rgba((d+),(d+),(d+),([d.]+))/, function(_, r,g,b,a){
      return 'rgba('+r+','+g+','+b+','+Math.max(parseFloat(a),0.65)+')';
    });
    var stroke = 'rgba(0,0,0,0.5)', sw = (0.3/z).toFixed(3);
    var cur  = _mapEditMode ? 'default' : 'pointer';
    var clk  = _mapEditMode ? '' : ' onclick="'+('_mapHotspotClick('+i+')')+'"';
    var title = '<title>'+escapeHtml(hs.entity_name)+'</title>';
    var cx, cy;
    if (hs.shape === 'rect') {
      h += '<rect class="map-shape" x="'+hs.x+'" y="'+hs.y+'" width="'+hs.w+'" height="'+hs.h+'"'
         + ' fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"'
         + clk+' style="cursor:'+cur+'">'+title+'</rect>';
      cx = hs.x + hs.w/2; cy = hs.y + hs.h/2;
    } else {
      var pts = hs.points.map(function(p){return p[0]+','+p[1];}).join(' ');
      h += '<polygon class="map-shape" points="'+pts+'"'
         + ' fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+sw+'"'
         + clk+' style="cursor:'+cur+'">'+title+'</polygon>';
      cx = hs.points.reduce(function(s,p){return s+p[0];},0)/hs.points.length;
      cy = hs.points.reduce(function(s,p){return s+p[1];},0)/hs.points.length;
    }
    // Labels are rendered as HTML in _mapRenderLabels()
    // Delete handle in edit mode
    if (_mapEditMode) {
      var dx = hs.shape==='rect' ? (hs.x+hs.w) : hs.points[0][0];
      var dy = hs.shape==='rect' ? hs.y         : hs.points[0][1];
      var cr = (2/z).toFixed(3), cf = (3/z).toFixed(3);
      h += '<g data-mapbtn="1" onclick="event.stopPropagation();_mapDeleteHotspot('+i+')" style="cursor:pointer">'
         + '<circle cx="'+dx+'" cy="'+dy+'" r="'+cr+'" fill="#ef4444"/>'
         + '<text x="'+dx+'" y="'+(dy+0.7/z)+'" text-anchor="middle" font-size="'+cf+'" fill="white" style="pointer-events:none">×</text>'
         + '</g>';
    }
  });
  layer.innerHTML = h;
  _mapRenderLabels();
}

// ── Signed-area centroid (correct for concave/L-shaped polygons) ─────────────
function _polyAreaCentroid(pts) {
  var n = pts.length;
  if (n < 3) {
    return [pts.reduce(function(s,p){return s+p[0];},0)/n,
            pts.reduce(function(s,p){return s+p[1];},0)/n];
  }
  var area = 0, cx = 0, cy = 0;
  for (var i = 0; i < n; i++) {
    var j = (i + 1) % n;
    var cross = pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
    area += cross;
    cx += (pts[i][0] + pts[j][0]) * cross;
    cy += (pts[i][1] + pts[j][1]) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-10) {
    return [pts.reduce(function(s,p){return s+p[0];},0)/n,
            pts.reduce(function(s,p){return s+p[1];},0)/n];
  }
  return [cx / (6 * area), cy / (6 * area)];
}

// ── HTML labels (fixed pixel size, positioned by %) ───────────────────────────
function _mapRenderLabels() {
  var container = document.getElementById('mapLabels');
  if (!container) return;
  var h = '';
  _mapHotspots.forEach(function(hs) {
    try {
      var cx = 0, cy = 0;
      if (hs.shape === 'rect') {
        var rx = isNaN(hs.x) ? 0 : (hs.x||0);
        var ry = isNaN(hs.y) ? 0 : (hs.y||0);
        var rw = isNaN(hs.w) ? 0 : (hs.w||0);
        var rh = isNaN(hs.h) ? 0 : (hs.h||0);
        cx = rx + rw/2;
        cy = ry + rh/2;
      } else if (hs.points && hs.points.length >= 2) {
        var c = _polyAreaCentroid(hs.points);
        cx = c[0]; cy = c[1];
      }
      if (isNaN(cx) || isNaN(cy)) return;
      var name = hs.entity_name || '';
      // Priority: 1) short_name field, 2) text in brackets, 3) full name
      var shortLbl = hs.short_name || '';
      if (!shortLbl) { var m = name.match(/(([^)]+))/); shortLbl = m ? m[1] : name; }
      if (!shortLbl) return;
      h += '<div title="'+escapeHtml(name)+'"'
         + ' style="position:absolute;left:'+cx+'%;top:'+cy+'%;'
         + 'transform:translate(-50%,-50%);'
         + 'font-size:13px;font-weight:800;color:#fff;line-height:1;text-align:center;'
         + 'background:rgba(0,0,0,0.6);border-radius:4px;padding:2px 7px;'
         + 'border:1px solid rgba(255,255,255,0.3);'
         + 'white-space:nowrap;pointer-events:none">'
         + escapeHtml(shortLbl) + '</div>';
    } catch(e) { console.warn('mapLabel err', e); }
  });
  container.innerHTML = h;
}

// ── Render drawing preview ────────────────────────────────────────────────────
function _mapRenderPreview() {
  var layer = document.getElementById('mapDrawPreview');
  if (!layer) return;
  var z = _mapZoom || 1;
  var h = '';
  // Rectangle drag preview
  if (_mapRectDraw) {
    var x = Math.min(_mapRectDraw.sx,_mapRectDraw.cx), y = Math.min(_mapRectDraw.sy,_mapRectDraw.cy);
    var w = Math.abs(_mapRectDraw.cx-_mapRectDraw.sx), hh = Math.abs(_mapRectDraw.cy-_mapRectDraw.sy);
    h += '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+hh+'"'
       + ' fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.8)"'
       + ' stroke-width="'+(0.4/z).toFixed(3)+'" stroke-dasharray="'+(2/z)+','+(1/z)+'" style="pointer-events:none"/>';
  }
  // Polygon drawing preview
  if (_mapDrawTool === 'poly' && _mapPolyPts.length) {
    var pts = _mapPolyPts, m = _mapMousePos;
    if (pts.length > 1) {
      h += '<polyline points="'+pts.map(function(p){return p[0]+','+p[1];}).join(' ')+'"'
         + ' fill="none" stroke="rgba(99,102,241,0.85)"'
         + ' stroke-width="'+(0.4/z).toFixed(3)+'" stroke-dasharray="'+(2/z)+','+(1/z)+'" style="pointer-events:none"/>';
    }
    var last = pts[pts.length-1];
    h += '<line x1="'+last[0]+'" y1="'+last[1]+'" x2="'+m.x+'" y2="'+m.y+'"'
       + ' stroke="rgba(99,102,241,0.7)" stroke-width="'+(0.35/z).toFixed(3)+'"'
       + ' stroke-dasharray="'+(1.5/z)+','+(1/z)+'" style="pointer-events:none"/>';
    if (pts.length >= 3) {
      h += '<line x1="'+m.x+'" y1="'+m.y+'" x2="'+pts[0][0]+'" y2="'+pts[0][1]+'"'
         + ' stroke="rgba(99,102,241,0.3)" stroke-width="'+(0.25/z).toFixed(3)+'"'
         + ' stroke-dasharray="'+(1/z)+','+(1/z)+'" style="pointer-events:none"/>';
    }
    // Vertex dots — fixed screen size regardless of zoom
    pts.forEach(function(p,i){
      h += '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+((i===0?1.3:0.8)/z).toFixed(3)+'"'
         + ' fill="'+(i===0?'rgba(99,102,241,0.9)':'white')+'"'
         + ' stroke="'+(i===0?'white':'rgba(99,102,241,0.8)')+'"'
         + ' stroke-width="'+(0.25/z).toFixed(3)+'" style="pointer-events:none"/>';
    });
  }
  layer.innerHTML = h;
}

// ── Assign modal ──────────────────────────────────────────────────────────────
async function _mapOpenAssignModal(shapeData) {
  var buildings  = await api('/entities?type=building');
  var landPlots  = await api('/entities?type=land_plot');
  var placedIds  = new Set(_mapHotspots.map(function(hs){return hs.entity_id;}));
  var available  = buildings.concat(landPlots).filter(function(e){return !placedIds.has(e.id);});

  var colors = [
    {n:'Синий',      v:'rgba(59,130,246,0.65)'},
    {n:'Голубой',    v:'rgba(100,200,230,0.60)'},
    {n:'Зелёный',    v:'rgba(34,197,94,0.65)'},
    {n:'Тёмно-зел.', v:'rgba(22,163,74,0.65)'},
    {n:'Жёлтый',     v:'rgba(234,179,8,0.65)'},
    {n:'Оранжевый',  v:'rgba(249,115,22,0.60)'},
    {n:'Красный',    v:'rgba(239,68,68,0.55)'},
    {n:'Фиолетовый', v:'rgba(139,92,246,0.60)'},
    {n:'Серый',      v:'rgba(107,114,128,0.55)'},
    {n:'Бирюзовый',  v:'rgba(20,184,166,0.60)'},
  ];

  var m = '<h3>Назначить объект</h3>';
  m += '<div class="form-group"><label>Объект</label><select id="mapSelEnt" class="form-input">';
  m += '<option value="">— выберите —</option>';
  available.forEach(function(e){ m += '<option value="'+e.id+'">'+escapeHtml(e.name)+' ('+escapeHtml(e.type_name_ru||e.type_name)+')</option>'; });
  m += '</select></div>';
  m += '<div class="form-group"><label>Цвет зоны</label><div style="display:flex;gap:6px;flex-wrap:wrap">';
  colors.forEach(function(c,i){
    m += '<label style="display:flex;align-items:center;gap:4px;cursor:pointer">'
       + '<input type="radio" name="mapColor" value="'+c.v+'"'+(i===0?' checked':'')+'>'
       + '<span style="width:20px;height:20px;border-radius:4px;background:'+c.v+';border:1px solid var(--border);display:inline-block"></span>'
       + '<span style="font-size:12px">'+c.n+'</span></label>';
  });
  m += '</div></div>';
  m += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>';
  m += '<button class="btn btn-primary" onclick="_mapSaveHotspot()">Сохранить</button></div>';

  window._mapPendingShape = shapeData;
  setModalContent(m);
}

async function _mapSaveHotspot() {
  var sel = document.getElementById('mapSelEnt');
  var eid = parseInt(sel.value);
  if (!eid) return alert('Выберите объект');
  var colorEl = document.querySelector('input[name="mapColor"]:checked');
  var color   = colorEl ? colorEl.value : 'rgba(99,102,241,0.35)';
  var sd      = window._mapPendingShape;
  if (!sd) return;
  try {
    var entity = await api('/entities/' + eid);
    var props  = entity.properties || {};
    ['map_x','map_y','map_w','map_h','map_points','map_shape','map_color'].forEach(function(k){delete props[k];});
    props.map_color = color;
    if (sd.shape === 'rect') {
      props.map_shape = 'rect'; props.map_x = String(sd.x); props.map_y = String(sd.y);
      props.map_w = String(sd.w); props.map_h = String(sd.h);
    } else {
      props.map_shape = 'polygon'; props.map_points = JSON.stringify(sd.points);
    }
    await api('/entities/' + eid, { method:'PATCH', body:JSON.stringify({properties:props}) });
    var rawName = sel.options[sel.selectedIndex].text;
    var dispIdx = rawName.lastIndexOf(' (');
    var dispName = dispIdx > -1 ? rawName.substring(0, dispIdx) : rawName;
    _mapHotspots.push(Object.assign({ entity_id:eid, entity_name:dispName, type_name:entity.type_name, color:color }, sd));
  } catch(e) { return alert('Ошибка: ' + e.message); }
  window._mapPendingShape = null;
  closeModal(); _mapRenderShapes();
}

async function _mapDeleteHotspot(idx) {
  var hs = _mapHotspots[idx];
  if (!confirm('Удалить зону «' + hs.entity_name + '» с карты?')) return;
  try {
    var entity = await api('/entities/' + hs.entity_id);
    var props  = entity.properties || {};
    ['map_x','map_y','map_w','map_h','map_points','map_shape','map_color'].forEach(function(k){delete props[k];});
    await api('/entities/' + hs.entity_id, { method:'PATCH', body:JSON.stringify({properties:props}) });
  } catch(e) { console.error(e); }
  _mapHotspots.splice(idx, 1);
  _mapRenderShapes();
}

function _mapHotspotClick(idx) {
  if (_mapEditMode) return;
  showEntity(_mapHotspots[idx].entity_id);
}
`;
