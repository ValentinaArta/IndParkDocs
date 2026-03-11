module.exports = `:root {
  --bg: #F8FAFC; --bg-card: #FFFFFF; --bg-sidebar: #1E293B; --bg-hover: #F1F5F9;
  --text: #0F172A; --text-secondary: #64748B; --text-muted: #94A3B8;
  --border: #E2E8F0; --accent: #6366F1; --accent-hover: #4F46E5;
  --red: #EF4444; --green: #10B981; --yellow: #F59E0B; --blue: #3B82F6;
  --radius: 8px; --shadow: 0 1px 3px rgba(0,0,0,0.08);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--text); height: 100vh; height: 100dvh; overflow: hidden; }

.app { display: flex; height: 100vh; height: 100dvh; }
.sidebar { width: 260px; background: var(--bg-sidebar); color: white; display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.sidebar-header h1 { font-size: 18px; font-weight: 700; }
.sidebar-header p { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px; }
.sidebar-nav { flex: 1; overflow-y: auto; padding: 8px; }
.nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.7); transition: all 0.15s; }
.nav-item:hover { background: rgba(255,255,255,0.08); color: white; }
.nav-item.active { background: var(--accent); color: white; }
.nav-item .icon { font-size: 16px; width: 24px; text-align: center; }
.nav-item .count { margin-left: auto; background: rgba(255,255,255,0.15); padding: 1px 8px; border-radius: 10px; font-size: 11px; }
.nav-section { padding: 16px 12px 6px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.3); }
.nav-sub-item { padding: 5px 8px 5px 28px; font-size: 12px; cursor: pointer; color: rgba(255,255,255,0.65); border-radius: 4px; margin: 1px 4px; display: flex; align-items: center; gap: 4px; }
.nav-sub-item:hover { background: rgba(255,255,255,0.1); color: white; }
.nav-sub-item.active { background: rgba(255,255,255,0.15); color: white; }

.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.topbar { padding: 16px 24px; background: var(--bg-card); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 12px; }
.topbar h2 { font-size: 18px; font-weight: 600; }
.topbar .breadcrumb { font-size: 13px; color: var(--text-secondary); }
.topbar .actions { margin-left: auto; display: flex; gap: 8px; }

.btn { padding: 8px 16px; border-radius: var(--radius); border: 1px solid var(--border); background: white; color: var(--text); font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
.btn:hover { background: var(--bg-hover); }
.btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
.btn-primary:hover { background: var(--accent-hover); }
.btn-danger { color: var(--red); border-color: #FCA5A5; }
.btn-danger:hover { background: #FEF2F2; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-swap-roles { background: none; border: 1px solid var(--border); border-radius: 20px; padding: 3px 12px; cursor: pointer; font-size: 12px; color: var(--text-secondary); transition: background .15s; }
.btn-swap-roles:hover { background: var(--bg-secondary); }

.content { flex: 1; overflow-y: auto; padding: 24px; }

/* Entity list */
.entity-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.entity-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; cursor: pointer; transition: all 0.15s; }
.entity-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(99,102,241,0.1); transform: translateY(-1px); }
.meter-row:hover td { background: rgba(99,102,241,0.05) !important; }
.entity-card .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.entity-card .card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
.entity-card .card-title { font-weight: 600; font-size: 14px; }
.entity-card .card-type { font-size: 11px; color: var(--text-muted); }
.entity-card .card-props { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.entity-card .prop-tag { font-size: 11px; padding: 2px 8px; background: var(--bg); border-radius: 4px; color: var(--text-secondary); }

/* Entity detail */
.detail-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
.detail-icon { width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
.detail-title { font-size: 24px; font-weight: 700; }
.detail-type { font-size: 13px; color: var(--text-secondary); }

.detail-section { margin-bottom: 24px; }
.detail-section h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
.props-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.prop-item { background: var(--bg); padding: 12px; border-radius: var(--radius); }
.prop-label { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.prop-value { font-size: 14px; font-weight: 500; }

.relation-list { display: flex; flex-direction: column; gap: 8px; }
.relation-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); cursor: pointer; transition: all 0.15s; }
.relation-item:hover { border-color: var(--accent); }
.relation-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; color: white; }
.relation-name { font-weight: 500; font-size: 13px; }
.relation-type-label { font-size: 11px; color: var(--text-muted); }

/* Dashboard */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; text-align: center; cursor: pointer; transition: all 0.15s; }
.stat-card:hover { border-color: var(--accent); }
.stat-icon { font-size: 24px; margin-bottom: 4px; }
.stat-count { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--text-secondary); }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: none; align-items: center; justify-content: center; z-index: 100; overscroll-behavior: contain; touch-action: none; }
.modal-overlay.show { display: flex; }
.modal { position: relative; background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; overscroll-behavior: contain; box-shadow: 0 20px 60px rgba(0,0,0,0.15); transition: max-width 0.15s, width 0.15s, height 0.15s, max-height 0.15s, border-radius 0.15s; }
.modal.modal--wide { max-width: min(860px, 95vw); }
.modal.modal--full { width: 100vw; max-width: 100vw; height: 100dvh; max-height: 100dvh; border-radius: 0; padding-top: max(24px, env(safe-area-inset-top)); padding-bottom: max(24px, env(safe-area-inset-bottom)); }
/* Spinner */
@keyframes _spin { to { transform: rotate(360deg); } }
@keyframes blink { 0%,100%{opacity:.2} 50%{opacity:1} }
.spinner-ring { display: inline-block; width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: _spin 0.7s linear infinite; }
/* Searchable select */
.srch-wrap { position:relative; }
.srch-input { width:100%; box-sizing:border-box; }
.srch-drop { position:absolute;top:100%;left:0;right:0;z-index:9999;background:var(--bg);border:1px solid var(--primary);border-top:none;border-radius:0 0 6px 6px;max-height:320px;overflow-y:auto;box-shadow:0 4px 16px rgba(0,0,0,0.12); }
.srch-wrap { position:relative; }
.srch-item { padding:8px 12px;cursor:pointer;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;touch-action:manipulation; }
.srch-item:hover,.srch-item.srch-active { background:var(--bg-hover); }
.srch-new { color:var(--primary);font-style:italic;border-top:1px solid var(--border); }
.srch-custom { width:100%;box-sizing:border-box;margin-top:6px; }
.srch-group-hdr { padding:5px 12px 3px;font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;background:var(--bg-secondary);border-top:1px solid var(--border);position:sticky;top:0; }
.srch-group-toggle { cursor:pointer;pointer-events:auto; }
.srch-group-toggle::before { content:'\\25B6';display:inline-block;margin-right:4px;font-size:9px;transition:transform 0.15s; }
.srch-group-toggle[data-srch-grp="expanded"]::before { transform:rotate(90deg); }
.srch-eq-tabs { display:flex;gap:2px;padding:4px 6px;background:var(--bg-secondary);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:1; }
.srch-eq-tab { flex:1;padding:4px 6px;font-size:11px;border:1px solid var(--border);border-radius:4px;background:var(--bg);cursor:pointer;text-align:center;white-space:nowrap; }
.srch-eq-tab.is-active { background:var(--accent);color:#fff;border-color:var(--accent); }
.modal h3 { font-size: 16px; margin-bottom: 16px; padding-right: 80px; }
.modal .form-group { margin-bottom: 14px; }
.modal label { display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500; }
.modal input, .modal select, .modal textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; font-family: inherit; }
.modal input:focus, .modal select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
/* Modal resize controls */
.modal-resize-bar { position: sticky; top: 0; float: right; margin: -4px -4px 0 8px; display: flex; gap: 2px; z-index: 10; background: transparent; }
.modal-resize-btn { background: none; border: 1px solid transparent; border-radius: 5px; cursor: pointer; padding: 3px 6px; font-size: 13px; color: var(--text-muted); line-height: 1.2; transition: all 0.1s; }
.modal-resize-btn:hover { background: var(--bg-hover); border-color: var(--border); color: var(--text-primary); }
.modal-resize-btn.is-active { background: var(--accent); color: white; border-color: var(--accent); }

/* Search */
.search-bar { padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius); font-size: 14px; width: 240px; font-family: inherit; }
.search-bar:focus { outline: none; border-color: var(--accent); }

/* Children list */
.children-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.pivot-field-pool { display: flex; flex-wrap: wrap; gap: 6px; min-height: 44px; padding: 8px; background: var(--bg-secondary); border-radius: var(--radius); border: 2px dashed var(--border); }
.pivot-zone { min-height: 60px; padding: 8px; background: var(--bg-secondary); border-radius: var(--radius); border: 2px dashed var(--border); display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; transition: border-color 0.15s, background 0.15s; }
.pivot-zone.drag-over { border-color: var(--accent); background: rgba(99,102,241,0.08); }
.pivot-chip { background: var(--bg-hover); border: 1px solid var(--border); border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.pivot-chip:active { cursor: grabbing; opacity: 0.7; }
.pivot-chip-row { background: #4ade80; color: #14532d; border-color: #16a34a; }
.pivot-chip-col { background: #60a5fa; color: #1e3a5f; border-color: #2563eb; }
.pivot-chip-remove { font-size: 14px; line-height: 1; cursor: pointer; opacity: 0.7; margin-left: 2px; }
.pivot-type-btn { background: var(--bg-secondary); border: 1px solid var(--border); color: var(--text-secondary); }
.pivot-type-btn:hover { border-color: var(--accent); color: var(--accent); }
.pivot-type-btn.active { background: var(--accent); color: white; border-color: var(--accent); }
.agg-tree-row { display:flex;align-items:center;gap:8px;padding:5px 8px;border-bottom:1px solid var(--border);cursor:pointer;border-radius:4px; }
.agg-tree-row:hover { background:var(--bg-hover); }
.agg-tree-leaf { display:flex;align-items:center;gap:8px;padding:4px 8px;cursor:pointer;color:var(--text-secondary);font-size:13px; }
.agg-tree-leaf:hover { background:var(--bg-hover);border-radius:4px; }
.agg-total { color:var(--accent);font-weight:600;white-space:nowrap; }
.pivot-chip-remove:hover { opacity: 1; }
.pivot-zone-hint { color: var(--text-muted); font-size: 12px; padding: 4px; width: 100%; text-align: center; }
.pivot-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
.pivot-table th, .pivot-table td { border: 1px solid var(--border); padding: 7px 12px; }
.pivot-table thead th { background: var(--bg-hover); font-weight: 600; text-align: left; }
.pivot-table thead th:not(:first-child) { text-align: center; }
.pivot-table tfoot th { background: var(--bg-hover); font-weight: 600; text-align: center; }
.pivot-table tfoot th:first-child { text-align: left; }
.pivot-table tbody tr:hover { background: var(--bg-hover); }
.pivot-table td:not(:first-child) { text-align: center; }
.pivot-table .cell-empty { color: var(--text-muted); }
.pivot-table .cell-value { font-weight: 600; color: var(--accent); cursor: pointer; }
.pivot-table .cell-value:hover { text-decoration: underline; }
.pivot-table .row-total { font-weight: 600; border-left: 2px solid var(--border); }
.child-card { display: flex; align-items: center; gap: 8px; padding: 10px; background: var(--bg); border-radius: var(--radius); cursor: pointer; transition: all 0.15s; }
.child-card:hover { background: var(--bg-hover); }

#menuBtn { display: inline-flex; min-width:44px; min-height:44px; }
/* Sidebar toggle (desktop) */
@media (min-width: 769px) {
  .app.sidebar-hidden .sidebar { display: none; }
  .app.sidebar-hidden .sidebar-overlay { display: none; }
}
/* Notes fullscreen */
.notes-fullscreen .sidebar { display: none !important; }
.notes-fullscreen .sidebar-overlay { display: none !important; }
.notes-fullscreen .topbar { display: none !important; }
.notes-fullscreen #notesSidebar { display: none !important; }
.notes-fullscreen #notesEditor { padding: 0; }
.notes-fullscreen #noteContent { max-width: 1200px; padding: 24px 48px 80px 48px; }
.notes-fs-exit { position:fixed; top:16px; right:16px; z-index:200; background:var(--bg-card); border:1px solid var(--border); border-radius:8px; padding:8px 12px; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:flex; align-items:center; gap:6px; font-size:13px; }
.sidebar-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:49; }
.sidebar-overlay.open { display:block; }
/* Responsive */
@media (max-width: 768px) {
  #menuBtn { display: inline-flex; }
  .sidebar { display: none; }
  .sidebar.open { display: flex; position: fixed; top: 0; left: 0; bottom: 0; z-index: 50; width: 280px; max-width: 85vw; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); padding-left: env(safe-area-inset-left); }
  .topbar { padding: 12px 16px; padding-left: max(16px, env(safe-area-inset-left)); padding-right: max(16px, env(safe-area-inset-right)); overflow: hidden; }
  .topbar h2 { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .content { padding: 16px; padding-bottom: max(16px, env(safe-area-inset-bottom)); overflow-x: hidden; }
  .entity-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  input, select, textarea { max-width: 100%; box-sizing: border-box; }
  .btn { min-height: 44px; min-width: 44px; }
  .nav-item { min-height: 44px; }
}
.rent-filter-dropdown { position:absolute;top:100%;left:0;z-index:100;background:var(--bg-primary);border:1px solid var(--border);border-radius:6px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:220px;max-width:320px;padding:6px 0; }
.rent-filter-dropdown label { display:flex;align-items:center;gap:6px;padding:4px 10px;cursor:pointer;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.rent-filter-dropdown label:hover { background:var(--bg-hover); }
.rent-th { position:relative;white-space:nowrap;padding:6px 8px 6px 8px;background:var(--bg-secondary);border:1px solid var(--border);font-size:12px;font-weight:600;user-select:none; }
.rent-th-inner { display:flex;align-items:center;gap:4px;cursor:pointer;padding-right:4px; }
.rent-th-inner:hover { color:var(--accent); }
.rent-filter-btn { background:none;border:none;cursor:pointer;padding:1px 3px;color:var(--text-muted);font-size:11px;line-height:1;border-radius:3px; }
.rent-filter-btn.active { color:var(--accent);background:rgba(99,102,241,.12); }
.rent-col-resizer { position:absolute;right:0;top:0;bottom:0;width:5px;cursor:col-resize;z-index:2;background:transparent;transition:background 0.1s; }
.rent-col-resizer:hover { background:var(--accent);opacity:.4; }
.rent-col-resizer.resizing { background:var(--accent);opacity:.7; }
.rent-filter-search { width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:4px;padding:4px 7px;font-size:12px;margin-bottom:4px;outline:none; }
.rent-filter-search:focus { border-color:var(--accent); }
.rent-group-tag { display:flex;align-items:center;gap:4px;padding:3px 8px 3px 10px;background:var(--accent);color:white;border-radius:12px;font-size:12px; }
.rent-group-tag button { background:none;border:none;color:white;cursor:pointer;font-size:14px;line-height:1;padding:0 0 1px; }
.list-editor-item:hover { background:var(--bg-hover) !important; }
.list-editor-item { transition: background .15s; }
.rent-field-btn { font-size:11px;padding:3px 8px;border-radius:12px; }
.eq-broken-row td, .eq-broken-cell { background:rgba(239,68,68,.10) !important; color:var(--text-primary); }
.eq-broken-row td:first-child a, .eq-broken-cell a { color:#dc2626 !important; }
.eq-broken-badge { display:inline-block;font-size:10px;background:#dc2626;color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px;vertical-align:middle; }
.eq-emergency-badge { display:inline-block;font-size:10px;background:#b85c5c;color:#fff;border-radius:4px;padding:1px 5px;margin-left:4px;vertical-align:middle; }
/* Lucide icons */
.lucide { width:16px;height:16px;vertical-align:-3px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0; }
.nav-item .lucide { width:15px;height:15px;opacity:.8; }
.nav-item:hover .lucide, .nav-item.active .lucide { opacity:1; }
.nav-section-title .lucide { width:13px;height:13px;opacity:.6; }
/* Map page */
.map-container { position:relative;display:inline-block;user-select:none; }
.map-container img { display:block;max-width:100%;height:auto; }
.map-editor-bar { display:flex;align-items:center;gap:10px;padding:10px 0;flex-wrap:wrap; }
.map-shape { transition:filter .15s,stroke-width .15s; }
.map-shape[style*="pointer"] { cursor:pointer; }
.map-shape:hover { filter:brightness(1.15) saturate(1.2); }
/* File attachments */
.files-section { margin-top:20px; border-top:1px solid var(--border); padding-top:14px; }
.files-section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.files-section-title { font-size:13px; font-weight:600; color:var(--text-secondary); }
.btn-attach { display:inline-block; padding:5px 12px; font-size:12px; border:1px solid var(--border); border-radius:var(--radius); cursor:pointer; background:var(--bg); color:var(--text); transition:background .15s; }
.btn-attach:hover { background:var(--bg-secondary); }
.btn-attach.is-loading { opacity:.6; pointer-events:none; }
.files-list { display:flex; flex-direction:column; gap:6px; }
.files-empty { font-size:13px; color:var(--text-muted); }
.file-item { display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:var(--bg); }
.file-link { display:flex; align-items:center; gap:8px; flex:1; text-decoration:none; color:var(--text); min-width:0; }
.file-link:hover .file-name { text-decoration:underline; }
.file-ext { font-size:10px; font-weight:700; color:#fff; background:var(--accent); border-radius:3px; padding:1px 5px; white-space:nowrap; flex-shrink:0; }
.file-name { font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.file-size { font-size:11px; color:var(--text-muted); white-space:nowrap; flex-shrink:0; }
.file-delete { border:none; background:none; cursor:pointer; color:var(--text-muted); font-size:13px; padding:2px 6px; border-radius:4px; flex-shrink:0; }
.file-delete:hover { color:var(--red); background:var(--bg-secondary); }
/* Contract form sections */
.form-section { border:1px solid var(--border);border-radius:8px;margin-bottom:14px;overflow:hidden; }
.form-section-title { font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.7px;padding:8px 14px;background:var(--bg-secondary);border-bottom:1px solid var(--border); }
.form-section-body { padding:14px; }`;
