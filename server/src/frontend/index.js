// Inline frontend served as HTML
// This keeps the MVP simple — one deploy, no build step
// Assembled from modules in server/src/frontend/
//
// Load order (matters for dependencies):
//   1. core/utils.js  — pure utils (escapeHtml, _fmtNum, _fmtDate) — no deps
//   2. core.js        — globals (API, TOKEN, CONTRACT_TYPE_FIELDS, icon, etc.)
//   3. core/api.js    — fetch wrapper (depends on TOKEN, API, logout from core.js)
//   4. core/globals.js — ENTITY_TYPE_ICONS, entityIcon (depends on icon from core.js)
//   5. components, forms, entities, reports...

const coreUtils    = require('./core/utils');
const core         = require('./core');
const coreApi      = require('./core/api');
const coreGlobals  = require('./core/globals');
const searchableSelect = require('./searchable-select');
const entityForm = require('./entity-form');
const rentObjects = require('./rent-objects');
const entityCrud = require('./entity-crud');
const supplements = require('./supplements');
const landPlotParts = require('./land-plot-parts');
const acts = require('./acts');
const reports = require('./reports');
const relations = require('./relations');
const settings = require('./settings');
const aiChat = require('./ai-chat');
const css = require('./css');
const layout = require('./layout');

const FRONTEND_HTML =
  `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>IndParkDocs</title>
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1E293B">
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>` +
  '\n<style>\n' + css + '\n</style>\n' +
  layout +
  '\n<script>\n' +
  coreUtils +
  '\n' +
  core +
  '\n' +
  coreApi +
  '\n' +
  coreGlobals +
  '\n' +
  searchableSelect +
  '\n' +
  entityForm +
  '\n' +
  rentObjects +
  '\n' +
  entityCrud +
  '\n' +
  supplements +
  '\n' +
  landPlotParts +
  '\n' +
  acts +
  '\n' +
  reports +
  '\n' +
  relations +
  '\n' +
  settings +
  '\n' +
  aiChat +
  '\n</script>\n' +
  `
<!-- AI Chat Button -->
<button id="aiChatBtn" onclick="toggleAIChat()" style="position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:var(--accent);color:white;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;font-size:24px;z-index:1000;transition:transform 0.2s" onmouseenter="this.style.transform='scale(1.1)'" onmouseleave="this.style.transform='scale(1)'">💬</button>

<!-- AI Chat Panel -->
<div id="aiChatPanel" style="display:none;position:fixed;bottom:24px;right:24px;width:400px;max-width:calc(100vw - 48px);height:500px;max-height:calc(100vh - 48px);background:var(--bg);border:1px solid var(--border);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:1001;flex-direction:column;overflow:hidden">
  <!-- Header -->
  <div style="padding:14px 16px;background:var(--accent);color:white;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:20px">🤖</span>
      <div>
        <div style="font-weight:600;font-size:14px">AI Ассистент</div>
        <div style="font-size:11px;opacity:0.8">Вопросы по данным и отчёты</div>
      </div>
    </div>
    <button onclick="toggleAIChat()" style="background:none;border:none;color:white;font-size:20px;cursor:pointer;padding:4px">✕</button>
  </div>
  <!-- Messages -->
  <div id="aiChatMessages" style="flex:1;overflow-y:auto;padding:16px"></div>
  <!-- Input -->
  <div style="padding:12px;border-top:1px solid var(--border);flex-shrink:0;display:flex;gap:8px">
    <textarea id="aiChatInput" onkeydown="aiChatKeydown(event)" placeholder="Задайте вопрос..." rows="1" style="flex:1;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;resize:none;outline:none;max-height:80px"></textarea>
    <button onclick="sendAIMessage()" style="padding:10px 14px;background:var(--accent);color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px">➤</button>
  </div>
</div>
</body>
</html>`;

module.exports = FRONTEND_HTML;
