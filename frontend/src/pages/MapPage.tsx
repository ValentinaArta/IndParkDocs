import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Topbar } from '../components/Topbar';
import { useEntities } from '../api/hooks';
import { apiPatch } from '../api/client';
import { Minus, Plus, Maximize2, Pencil, Check, Square, Pentagon, X } from 'lucide-react';
import type { Entity } from '../api/types';

// ── Types ──
interface Hotspot {
  shape: 'rect' | 'polygon';
  entity_id: number;
  entity_name: string;
  short_name: string;
  type_name: string;
  color: string;
  // rect
  x?: number; y?: number; w?: number; h?: number;
  // polygon
  points?: number[][];
}

interface RectDraw {
  sx: number; sy: number; cx: number; cy: number;
}

// ── Color presets ──
const COLOR_PRESETS = [
  { name: 'Синий',       value: 'rgba(59,130,246,0.65)' },
  { name: 'Голубой',     value: 'rgba(100,200,230,0.60)' },
  { name: 'Зелёный',     value: 'rgba(34,197,94,0.65)' },
  { name: 'Тёмно-зел.',  value: 'rgba(22,163,74,0.65)' },
  { name: 'Жёлтый',      value: 'rgba(234,179,8,0.65)' },
  { name: 'Оранжевый',   value: 'rgba(249,115,22,0.60)' },
  { name: 'Красный',     value: 'rgba(239,68,68,0.55)' },
  { name: 'Фиолетовый',  value: 'rgba(139,92,246,0.60)' },
  { name: 'Серый',       value: 'rgba(107,114,128,0.55)' },
  { name: 'Бирюзовый',   value: 'rgba(20,184,166,0.60)' },
];

function boostOpacity(color: string): string {
  return color.replace(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/, (_, r, g, b, a) =>
    `rgba(${r},${g},${b},${Math.max(parseFloat(a), 0.65)})`
  );
}

function polyAreaCentroid(pts: number[][]): [number, number] {
  const n = pts.length;
  if (n < 3) return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
    area += cross; cx += (pts[i][0] + pts[j][0]) * cross; cy += (pts[i][1] + pts[j][1]) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 1e-10) return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n];
  return [cx / (6 * area), cy / (6 * area)];
}

function getLabel(hs: Hotspot): string {
  if (hs.short_name) return hs.short_name;
  const m = hs.entity_name.match(/\(([^)]+)\)/);
  return m ? m[1] : hs.entity_name;
}

function getCentroid(hs: Hotspot): [number, number] {
  if (hs.shape === 'rect') return [(hs.x || 0) + (hs.w || 0) / 2, (hs.y || 0) + (hs.h || 0) / 2];
  return hs.points ? polyAreaCentroid(hs.points) : [50, 50];
}

// ── Main Component ──
export function MapPage() {
  const navigate = useNavigate();
  const { data: buildings = [] } = useEntities({ type: 'building' });
  const { data: landPlots = [] } = useEntities({ type: 'land_plot' });

  // State
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [drawTool, setDrawTool] = useState<'rect' | 'poly'>('rect');
  const [rectDraw, setRectDraw] = useState<RectDraw | null>(null);
  const [polyPts, setPolyPts] = useState<number[][]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [assignModal, setAssignModal] = useState<{ shape: Omit<Hotspot, 'entity_id' | 'entity_name' | 'short_name' | 'type_name' | 'color'> } | null>(null);
  const [assignEntity, setAssignEntity] = useState('');
  const [assignColor, setAssignColor] = useState(COLOR_PRESETS[0].value);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  const vpRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const panDrag = useRef<{ sx: number; sy: number } | null>(null);
  const zoomRef = useRef(zoom);
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  zoomRef.current = zoom;
  panXRef.current = panX;
  panYRef.current = panY;

  // Build hotspots from entities
  useEffect(() => {
    const all = [...buildings, ...landPlots];
    const hs: Hotspot[] = [];
    all.forEach((e) => {
      const p = e.properties || {};
      if (p.map_shape === 'polygon' && p.map_points) {
        try {
          const pts = JSON.parse(String(p.map_points));
          hs.push({ shape: 'polygon', entity_id: e.id, entity_name: e.name, short_name: String(p.short_name || ''), type_name: e.type_name || '', points: pts, color: String(p.map_color || 'rgba(99,102,241,0.35)') });
        } catch { /* skip */ }
      } else if (p.map_x != null) {
        hs.push({ shape: 'rect', entity_id: e.id, entity_name: e.name, short_name: String(p.short_name || ''), type_name: e.type_name || '',
          x: parseFloat(String(p.map_x)), y: parseFloat(String(p.map_y)), w: parseFloat(String(p.map_w)), h: parseFloat(String(p.map_h)), color: String(p.map_color || 'rgba(99,102,241,0.35)') });
      }
    });
    setHotspots(hs);
  }, [buildings, landPlots]);

  // Fit to view on load
  const fitToView = useCallback(() => {
    requestAnimationFrame(() => {
      const img = imgRef.current;
      const vp = vpRef.current;
      if (!img || !vp || !img.naturalWidth) return;
      const renderedH = vp.offsetWidth * img.naturalHeight / img.naturalWidth;
      const vpH = vp.offsetHeight;
      if (!vpH || !renderedH) return;
      const z = Math.min(1, vpH / renderedH);
      setZoom(z); setPanX(0); setPanY(0);
    });
  }, []);

  // Pct coordinates from mouse event
  const getPct = useCallback((e: React.MouseEvent | MouseEvent): { x: number; y: number } => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const r = img.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    };
  }, []);

  // Zoom to point
  const zoomTo = useCallback((newZoom: number, cx?: number, cy?: number) => {
    const vp = vpRef.current;
    if (!vp) return;
    newZoom = Math.max(0.5, Math.min(16, newZoom));
    const cxv = cx ?? vp.offsetWidth / 2;
    const cyv = cy ?? vp.offsetHeight / 2;
    const innerX = (cxv - panXRef.current) / zoomRef.current;
    const innerY = (cyv - panYRef.current) / zoomRef.current;
    setZoom(newZoom);
    setPanX(cxv - innerX * newZoom);
    setPanY(cyv - innerY * newZoom);
  }, []);

  // Mouse handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-mapbtn]')) return;
    if (!editMode) {
      e.preventDefault();
      panDrag.current = { sx: e.clientX - panXRef.current, sy: e.clientY - panYRef.current };
      return;
    }
    if (drawTool !== 'rect') return;
    e.preventDefault();
    const p = getPct(e);
    setRectDraw({ sx: p.x, sy: p.y, cx: p.x, cy: p.y });
  }, [editMode, drawTool, getPct]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (panDrag.current) {
      setPanX(e.clientX - panDrag.current.sx);
      setPanY(e.clientY - panDrag.current.sy);
      return;
    }
    const p = getPct(e);
    setMousePos(p);
    if (editMode && drawTool === 'rect') {
      setRectDraw(prev => prev ? { ...prev, cx: p.x, cy: p.y } : null);
    }
  }, [editMode, drawTool, getPct]);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (panDrag.current) {
      panDrag.current = null;
      return;
    }
    if (!editMode || drawTool !== 'rect') return;
    const p = getPct(e);
    setRectDraw(prev => {
      if (!prev) return null;
      const x = Math.min(prev.sx, p.x), y = Math.min(prev.sy, p.y);
      const w = Math.abs(p.x - prev.sx), h = Math.abs(p.y - prev.sy);
      if (w >= 0.8 && h >= 0.8) {
        setAssignModal({ shape: { shape: 'rect', x: +x.toFixed(2), y: +y.toFixed(2), w: +w.toFixed(2), h: +h.toFixed(2) } });
        setAssignEntity(''); setAssignColor(COLOR_PRESETS[0].value);
      }
      return null;
    });
  }, [editMode, drawTool, getPct]);

  const onClick = useCallback((e: React.MouseEvent) => {
    if (!editMode || drawTool !== 'poly') return;
    if ((e.target as HTMLElement).closest('[data-mapbtn]')) return;
    if (e.detail >= 2) return;
    e.preventDefault();
    const p = getPct(e);
    setPolyPts(prev => [...prev, [+p.x.toFixed(2), +p.y.toFixed(2)]]);
  }, [editMode, drawTool, getPct]);

  const onDblClick = useCallback((e: React.MouseEvent) => {
    if (!editMode || drawTool !== 'poly') return;
    e.preventDefault();
    if (polyPts.length < 3) { alert('Минимум 3 вершины'); return; }
    setAssignModal({ shape: { shape: 'polygon', points: polyPts.slice() } });
    setAssignEntity(''); setAssignColor(COLOR_PRESETS[0].value);
    setPolyPts([]);
  }, [editMode, drawTool, polyPts]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const vp = vpRef.current;
    if (!vp) return;
    const r = vp.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    const delta = e.deltaY > 0 ? 0.92 : 1.09;
    zoomTo(zoomRef.current * delta, cx, cy);
  }, [zoomTo]);

  // Available entities for assign
  const available = useMemo(() => {
    const placedIds = new Set(hotspots.map(h => h.entity_id));
    return [...buildings, ...landPlots].filter(e => !placedIds.has(e.id)).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [buildings, landPlots, hotspots]);

  // Save hotspot
  const saveHotspot = useCallback(async () => {
    if (!assignEntity || !assignModal) return;
    const eid = parseInt(assignEntity);
    const entity = [...buildings, ...landPlots].find(e => e.id === eid);
    if (!entity) return;
    const props: Record<string, unknown> = { ...(entity.properties || {}) };
    ['map_x', 'map_y', 'map_w', 'map_h', 'map_points', 'map_shape', 'map_color'].forEach(k => delete props[k]);
    props.map_color = assignColor;
    const sd = assignModal.shape as Record<string, unknown>;
    if (sd.shape === 'rect') {
      props.map_shape = 'rect'; props.map_x = String(sd.x); props.map_y = String(sd.y); props.map_w = String(sd.w); props.map_h = String(sd.h);
    } else {
      props.map_shape = 'polygon'; props.map_points = JSON.stringify(sd.points);
    }
    try {
      await apiPatch(`/entities/${eid}`, { properties: props });
      setHotspots(prev => [...prev, {
        ...(sd as Pick<Hotspot, 'shape' | 'x' | 'y' | 'w' | 'h' | 'points'>),
        entity_id: eid, entity_name: entity.name, short_name: String(entity.properties?.short_name || ''),
        type_name: entity.type_name || '', color: assignColor,
      } as Hotspot]);
    } catch (e) { alert('Ошибка: ' + (e as Error).message); return; }
    setAssignModal(null);
  }, [assignEntity, assignColor, assignModal, buildings, landPlots]);

  // Delete hotspot
  const deleteHotspot = useCallback(async (idx: number) => {
    const hs = hotspots[idx];
    if (!confirm(`Удалить зону «${hs.entity_name}» с карты?`)) return;
    try {
      const entity = [...buildings, ...landPlots].find(e => e.id === hs.entity_id);
      if (entity) {
        const props: Record<string, unknown> = { ...(entity.properties || {}) };
        ['map_x', 'map_y', 'map_w', 'map_h', 'map_points', 'map_shape', 'map_color'].forEach(k => delete props[k]);
        await apiPatch(`/entities/${hs.entity_id}`, { properties: props });
      }
    } catch (e) { console.error(e); }
    setHotspots(prev => prev.filter((_, i) => i !== idx));
  }, [hotspots, buildings, landPlots]);

  const cursor = editMode ? 'crosshair' : (zoom > 1 ? 'grab' : 'default');
  const sw = (0.3 / zoom).toFixed(3);

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Карта территории"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => { setEditMode(!editMode); setPolyPts([]); setRectDraw(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition ${editMode ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
              {editMode ? <><Check className="w-4 h-4" /> Готово</> : <><Pencil className="w-4 h-4" /> Разметить</>}
            </button>
            {editMode && (
              <div className="flex items-center gap-1">
                <button onClick={() => { setDrawTool('rect'); setPolyPts([]); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition ${drawTool === 'rect' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                  <Square className="w-3.5 h-3.5" /> Прямоугольник
                </button>
                <button onClick={() => { setDrawTool('poly'); setRectDraw(null); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition ${drawTool === 'poly' ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                  <Pentagon className="w-3.5 h-3.5" /> Многоугольник
                </button>
                {polyPts.length > 0 && (
                  <>
                    <span className="text-xs text-[var(--text-muted)] ml-2">Вершин: {polyPts.length}</span>
                    <button onClick={() => setPolyPts([])} className="text-xs text-red-500 hover:underline">Отмена</button>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => zoomTo(zoom / 1.4)} className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)]"><Minus className="w-3.5 h-3.5" /></button>
              <span className="text-xs text-[var(--text-muted)] min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => zoomTo(zoom * 1.4)} className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)]"><Plus className="w-3.5 h-3.5" /></button>
              <button onClick={fitToView} className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-hover)]"><Maximize2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        }
      />

      {/* Map viewport */}
      <div ref={vpRef} className="flex-1 overflow-hidden bg-[#e8e8e8] rounded-md mx-4 mb-4"
        style={{ cursor }}
        onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
        onClick={onClick} onDoubleClick={onDblClick} onWheel={onWheel}
        onContextMenu={(e) => { if (polyPts.length) { e.preventDefault(); setPolyPts([]); } }}
      >
        <div style={{ transformOrigin: '0 0', transform: `translate(${panX.toFixed(1)}px,${panY.toFixed(1)}px) scale(${zoom})`, position: 'relative', lineHeight: 0 }}>
          <img ref={imgRef} src="/maps/territory.jpg" alt="Территория" className="block w-full h-auto select-none" draggable={false}
            onLoad={fitToView} />

          {/* SVG overlay */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"
            className="absolute top-0 left-0 w-full h-full" style={{ overflow: 'visible' }}>
            {/* Hotspot shapes */}
            {hotspots.map((hs, i) => {
              const fill = boostOpacity(hs.color);
              if (hs.shape === 'rect') {
                return (
                  <rect key={i} x={hs.x} y={hs.y} width={hs.w} height={hs.h}
                    fill={fill} stroke="rgba(0,0,0,0.5)" strokeWidth={sw}
                    style={{ cursor: editMode ? 'default' : 'pointer' }}
                    onClick={(e) => { if (!editMode) { e.stopPropagation(); navigate(`/entities/${hs.type_name}/${hs.entity_id}`); } }}>
                    <title>{hs.entity_name}</title>
                  </rect>
                );
              }
              return (
                <polygon key={i} points={hs.points!.map(p => `${p[0]},${p[1]}`).join(' ')}
                  fill={fill} stroke="rgba(0,0,0,0.5)" strokeWidth={sw}
                  style={{ cursor: editMode ? 'default' : 'pointer' }}
                  onClick={(e) => { if (!editMode) { e.stopPropagation(); navigate(`/entities/${hs.type_name}/${hs.entity_id}`); } }}>
                  <title>{hs.entity_name}</title>
                </polygon>
              );
            })}

            {/* Delete handles in edit mode */}
            {editMode && hotspots.map((hs, i) => {
              const dx = hs.shape === 'rect' ? (hs.x || 0) + (hs.w || 0) : hs.points![0][0];
              const dy = hs.shape === 'rect' ? (hs.y || 0) : hs.points![0][1];
              const cr = (2 / zoom).toFixed(3);
              const cf = (3 / zoom).toFixed(3);
              return (
                <g key={`del-${i}`} data-mapbtn="1" style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); deleteHotspot(i); }}>
                  <circle cx={dx} cy={dy} r={cr} fill="#ef4444" />
                  <text x={dx} y={dy + 0.7 / zoom} textAnchor="middle" fontSize={cf} fill="white" style={{ pointerEvents: 'none' }}>×</text>
                </g>
              );
            })}

            {/* Rect draw preview */}
            {rectDraw && (
              <rect x={Math.min(rectDraw.sx, rectDraw.cx)} y={Math.min(rectDraw.sy, rectDraw.cy)}
                width={Math.abs(rectDraw.cx - rectDraw.sx)} height={Math.abs(rectDraw.cy - rectDraw.sy)}
                fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.8)"
                strokeWidth={(0.4 / zoom).toFixed(3)} strokeDasharray={`${2 / zoom},${1 / zoom}`}
                style={{ pointerEvents: 'none' }} />
            )}

            {/* Poly draw preview */}
            {drawTool === 'poly' && polyPts.length > 0 && (
              <>
                {polyPts.length > 1 && (
                  <polyline points={polyPts.map(p => `${p[0]},${p[1]}`).join(' ')}
                    fill="none" stroke="rgba(99,102,241,0.85)"
                    strokeWidth={(0.4 / zoom).toFixed(3)} strokeDasharray={`${2 / zoom},${1 / zoom}`}
                    style={{ pointerEvents: 'none' }} />
                )}
                <line x1={polyPts[polyPts.length - 1][0]} y1={polyPts[polyPts.length - 1][1]}
                  x2={mousePos.x} y2={mousePos.y}
                  stroke="rgba(99,102,241,0.7)" strokeWidth={(0.35 / zoom).toFixed(3)}
                  strokeDasharray={`${1.5 / zoom},${1 / zoom}`} style={{ pointerEvents: 'none' }} />
                {polyPts.length >= 3 && (
                  <line x1={mousePos.x} y1={mousePos.y} x2={polyPts[0][0]} y2={polyPts[0][1]}
                    stroke="rgba(99,102,241,0.3)" strokeWidth={(0.25 / zoom).toFixed(3)}
                    strokeDasharray={`${1 / zoom},${1 / zoom}`} style={{ pointerEvents: 'none' }} />
                )}
                {polyPts.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r={(i === 0 ? 1.3 : 0.8) / zoom}
                    fill={i === 0 ? 'rgba(99,102,241,0.9)' : 'white'}
                    stroke={i === 0 ? 'white' : 'rgba(99,102,241,0.8)'}
                    strokeWidth={(0.25 / zoom).toFixed(3)} style={{ pointerEvents: 'none' }} />
                ))}
              </>
            )}
          </svg>

          {/* Labels */}
          <div className="absolute top-0 left-0 w-full h-full overflow-visible" style={{ pointerEvents: 'none' }}>
            {hotspots.map((hs, i) => {
              const [cx, cy] = getCentroid(hs);
              const label = getLabel(hs);
              if (!label) return null;
              return (
                <div key={i} title={hs.entity_name}
                  className="absolute whitespace-nowrap text-white font-extrabold text-[13px] leading-none text-center rounded px-[7px] py-[2px]"
                  style={{
                    left: `${cx}%`, top: `${cy}%`, transform: 'translate(-50%,-50%)',
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.3)',
                    pointerEvents: 'none',
                  }}>
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Assign modal */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setAssignModal(null)}>
          <div className="bg-white rounded-xl p-6 w-[480px] max-w-[95vw] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Назначить объект</h3>
              <button onClick={() => setAssignModal(null)} className="p-1 hover:bg-[var(--bg-hover)] rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Объект</label>
              <select value={assignEntity} onChange={e => setAssignEntity(e.target.value)}
                className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm">
                <option value="">— выберите —</option>
                {available.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Цвет зоны</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <label key={c.value} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="mapColor" value={c.value} checked={assignColor === c.value}
                      onChange={() => setAssignColor(c.value)} className="sr-only" />
                    <span className={`w-6 h-6 rounded-md border-2 transition ${assignColor === c.value ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/30' : 'border-[var(--border)]'}`}
                      style={{ background: c.value }} />
                    <span className="text-xs">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setAssignModal(null)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-hover)]">Отмена</button>
              <button onClick={saveHotspot} disabled={!assignEntity}
                className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm hover:opacity-90 disabled:opacity-50">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
