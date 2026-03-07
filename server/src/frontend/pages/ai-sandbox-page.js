module.exports = `
// ============ AI SANDBOX PAGE ============
var _sbMessages = [];
var _sbSessionId = 'sandbox_' + Date.now();
var _sbCanvasHtml = null;
var _sbUsage = { used: 0, limit: 300000, remaining: 300000 };
var _sbSending = false;

async function showAISandbox() {
  setActiveNav('ai-sandbox');
  document.getElementById('pageTitle').textContent = 'AI Песочница';
  _setNavHash('ai-sandbox');
  _sbMessages = [];
  _sbCanvasHtml = null;
  _sbSending = false;
  _sbSessionId = 'sandbox_' + Date.now();

  try { _sbUsage = await api('/ai/chat/usage'); } catch(e) {}

  document.getElementById('content').innerHTML = _sbLayout();
  _sbInitStyles();
  _sbBindEvents();
}

function _sbInitStyles() {
  if (document.getElementById('sbStyles')) return;
  var st = document.createElement('style');
  st.id = 'sbStyles';
  st.textContent = [
    '@keyframes sbFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}',
    '@keyframes sbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}',
    '@keyframes sbPulse{0%,100%{opacity:.3}50%{opacity:1}}',
    '@keyframes sbSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '#sbMessages::-webkit-scrollbar{width:5px}',
    '#sbMessages::-webkit-scrollbar-thumb{background:var(--border);border-radius:5px}',
    '#sbInput:focus{border-color:var(--accent)!important;box-shadow:0 0 0 3px rgba(99,102,241,.12)}',
    '#sbSendBtn:hover{transform:scale(1.08);box-shadow:0 4px 12px rgba(99,102,241,.4)}',
    '#sbSendBtn:active{transform:scale(.95)}',
    '.sb-chip{padding:7px 14px;border-radius:20px;border:1px solid var(--border);background:var(--bg);cursor:pointer;font-size:12px;color:var(--text-secondary);transition:all .2s}',
    '.sb-chip:hover{border-color:var(--accent);color:var(--accent);background:rgba(99,102,241,.04)}',
    '@media(max-width:768px){#sbRoot{flex-direction:column!important}#sbChatPanel{width:100%!important;min-width:0!important;height:55vh!important;border-right:none!important;border-bottom:1px solid var(--border)!important}#sbCanvasPanel{height:45vh!important}}'
  ].join('');
  document.head.appendChild(st);
}

function _sbBindEvents() {
  var inp = document.getElementById('sbInput');
  if (inp) {
    inp.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    setTimeout(function() { inp.focus(); }, 200);
  }
}

function _sbLayout() {
  return '<div id="sbRoot" style="display:flex;height:100%;animation:sbFadeIn .4s ease">' +
    _sbChatPanel() +
    _sbCanvasPanel() +
  '</div>';
}

function _sbChatPanel() {
  return '<div id="sbChatPanel" style="width:40%;min-width:340px;display:flex;flex-direction:column;background:var(--bg-card);border-right:1px solid var(--border)">' +
    _sbChatHeader() +
    _sbUsageBar() +
    '<div id="sbMessages" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:12px">' + _sbEmptyChat() + '</div>' +
    _sbInputArea() +
  '</div>';
}

function _sbChatHeader() {
  return '<div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;flex-shrink:0">' +
    '<div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px rgba(99,102,241,.3)">&#10024;</div>' +
    '<div style="flex:1"><div style="font-weight:700;font-size:15px">AI Аналитик</div><div style="font-size:11px;color:var(--text-secondary)">Claude Sonnet &middot; Canvas Mode</div></div>' +
    '<button onclick="_sbNewChat()" class="btn btn-sm" style="gap:4px">&#128260; Новый</button>' +
  '</div>';
}

function _sbUsageBar() {
  var pct = Math.min(100, Math.round((_sbUsage.used / _sbUsage.limit) * 100));
  var col = pct > 80 ? '#EF4444' : pct > 50 ? '#F59E0B' : '#10B981';
  var usedK = Math.round(_sbUsage.used / 1000);
  var limK = Math.round(_sbUsage.limit / 1000);
  return '<div id="sbUsageBar" style="padding:8px 20px;border-bottom:1px solid var(--border);flex-shrink:0">' +
    '<div style="display:flex;align-items:center;gap:10px">' +
      '<div style="flex:1;height:5px;background:var(--bg-hover);border-radius:3px;overflow:hidden">' +
        '<div style="width:' + pct + '%;height:100%;background:' + col + ';border-radius:3px;transition:width .6s ease"></div>' +
      '</div>' +
      '<span style="font-size:11px;color:var(--text-muted);white-space:nowrap">' + usedK + 'K / ' + limK + 'K</span>' +
    '</div>' +
  '</div>';
}

function _sbInputArea() {
  return '<div style="padding:16px 20px;border-top:1px solid var(--border);flex-shrink:0">' +
    '<div style="display:flex;gap:10px;align-items:flex-end">' +
      '<textarea id="sbInput" onkeydown="_sbKeydown(event)" placeholder="Спросите что угодно или попросите визуализацию..." rows="1" style="flex:1;padding:12px 16px;border:2px solid var(--border);border-radius:12px;font-size:14px;font-family:inherit;resize:none;outline:none;max-height:120px;line-height:1.5;transition:border-color .2s,box-shadow .2s"></textarea>' +
      '<button id="sbSendBtn" onclick="_sbSend()" style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;border:none;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;box-shadow:0 2px 8px rgba(99,102,241,.25)">&#10148;</button>' +
    '</div>' +
    '<div style="margin-top:8px;font-size:11px;color:var(--text-muted);display:flex;gap:12px">' +
      '<span>&#128161; &laquo;Дашборд арендаторов&raquo;</span>' +
      '<span>&#128200; &laquo;График платежей&raquo;</span>' +
    '</div>' +
  '</div>';
}

function _sbEmptyChat() {
  return '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
    '<div style="text-align:center;padding:32px 20px">' +
      '<div style="font-size:48px;margin-bottom:16px">&#129302;</div>' +
      '<div style="font-size:16px;font-weight:600;margin-bottom:8px">Что вы хотите узнать?</div>' +
      '<div style="font-size:13px;color:var(--text-muted);line-height:1.6">Задайте вопрос по данным системы<br>или попросите создать визуализацию</div>' +
      '<div style="margin-top:20px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center">' +
        '<button class="sb-chip" onclick="_sbAsk(this.textContent)">&#128202; Дашборд арендаторов</button>' +
        '<button class="sb-chip" onclick="_sbAsk(this.textContent)">&#128176; Задолженности</button>' +
        '<button class="sb-chip" onclick="_sbAsk(this.textContent)">&#127970; Загрузка корпусов</button>' +
        '<button class="sb-chip" onclick="_sbAsk(this.textContent)">&#128200; Бюджет план-факт</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function _sbCanvasPanel() {
  return '<div id="sbCanvasPanel" style="flex:1;display:flex;flex-direction:column;background:#0F172A;position:relative;overflow:hidden">' +
    '<div id="sbCanvasHdr" style="display:none;padding:12px 20px;align-items:center;justify-content:space-between;flex-shrink:0;z-index:2;background:rgba(15,23,42,.9);backdrop-filter:blur(8px)">' +
      '<div style="font-size:13px;color:rgba(255,255,255,.5)">&#128202; Визуализация</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button onclick="_sbDownload()" style="padding:5px 12px;border-radius:6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);cursor:pointer;font-size:12px;transition:all .15s">&#11015; Скачать</button>' +
        '<button onclick="_sbFullscreen()" style="padding:5px 12px;border-radius:6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.6);cursor:pointer;font-size:12px;transition:all .15s">&#9974; Полный экран</button>' +
      '</div>' +
    '</div>' +
    '<div id="sbEmpty" style="flex:1;display:flex;align-items:center;justify-content:center">' +
      '<div style="text-align:center;animation:sbFloat 3s ease-in-out infinite">' +
        '<div style="font-size:64px;margin-bottom:20px;opacity:.2">&#10024;</div>' +
        '<div style="font-size:18px;color:rgba(255,255,255,.25);font-weight:600;line-height:1.7">Попросите AI создать<br>визуализацию</div>' +
        '<div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,.12)">Дашборды &middot; Графики &middot; Отчёты &middot; Таблицы</div>' +
      '</div>' +
    '</div>' +
    '<iframe id="sbFrame" sandbox="allow-scripts" style="display:none;flex:1;border:none;width:100%;background:white"></iframe>' +
  '</div>';
}

// ─── Chat logic ────────────────────────────────────────────────────────

function _sbAsk(text) {
  var inp = document.getElementById('sbInput');
  if (inp) { inp.value = text; inp.focus(); _sbSend(); }
}

function _sbNewChat() {
  _sbMessages = [];
  _sbCanvasHtml = null;
  _sbSessionId = 'sandbox_' + Date.now();
  var el = document.getElementById('sbMessages');
  if (el) el.innerHTML = _sbEmptyChat();
  var f = document.getElementById('sbFrame');
  var e = document.getElementById('sbEmpty');
  var h = document.getElementById('sbCanvasHdr');
  if (f) f.style.display = 'none';
  if (e) { e.style.display = 'flex'; e.style.flex = '1'; }
  if (h) h.style.display = 'none';
}

function _sbRenderMsgs() {
  var el = document.getElementById('sbMessages');
  if (!el) return;
  if (!_sbMessages.length) { el.innerHTML = _sbEmptyChat(); return; }
  var h = '';
  for (var i = 0; i < _sbMessages.length; i++) {
    var m = _sbMessages[i];
    var isLast = i === _sbMessages.length - 1;
    var anim = isLast ? ';animation:sbSlideUp .3s ease' : '';

    if (m.role === 'user') {
      h += '<div style="display:flex;justify-content:flex-end' + anim + '">' +
        '<div style="max-width:82%;padding:12px 16px;border-radius:16px 16px 4px 16px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;font-size:14px;line-height:1.6;box-shadow:0 2px 12px rgba(99,102,241,.3)">' +
        escapeHtml(m.content) + '</div></div>';

    } else if (m._typing) {
      h += '<div style="display:flex;gap:10px;align-items:flex-start' + anim + '">' +
        '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;box-shadow:0 2px 8px rgba(99,102,241,.2)">&#10024;</div>' +
        '<div style="padding:14px 18px;border-radius:4px 16px 16px 16px;background:var(--bg);border:1px solid var(--border)">' +
        '<div style="display:flex;gap:5px;align-items:center">' +
        '<span style="animation:sbPulse 1s infinite;font-size:10px;color:var(--accent)">&#9679;</span>' +
        '<span style="animation:sbPulse 1s .2s infinite;font-size:10px;color:var(--accent)">&#9679;</span>' +
        '<span style="animation:sbPulse 1s .4s infinite;font-size:10px;color:var(--accent)">&#9679;</span>' +
        '<span style="font-size:12px;color:var(--text-muted);margin-left:6px">Анализирую данные...</span>' +
        '</div></div></div>';

    } else {
      var cv = _sbExtractCanvas(m.content || '');
      var txt = m.content || '';
      if (cv) {
        // Remove canvas block from display text
        var openIdx = txt.indexOf('<canvas-html>');
        var closeStr = '</canvas-' + 'html>';
        var closeIdx = txt.indexOf(closeStr);
        if (openIdx !== -1 && closeIdx !== -1) {
          txt = (txt.substring(0, openIdx) + txt.substring(closeIdx + closeStr.length)).trim();
        }
        if (!txt) txt = '\\u{1F4CA} Визуализация готова — смотрите справа \\u{2192}';
      }
      h += '<div style="display:flex;gap:10px;align-items:flex-start' + anim + '">' +
        '<div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;box-shadow:0 2px 8px rgba(99,102,241,.2)">&#10024;</div>' +
        '<div style="flex:1;max-width:calc(100% - 44px);padding:14px 18px;border-radius:4px 16px 16px 16px;background:var(--bg);border:1px solid var(--border);font-size:14px;line-height:1.7">' +
        _sbFmt(txt);
      if (cv) {
        h += '<div style="margin-top:12px"><button onclick="_sbShowLast()" class="btn btn-primary btn-sm" style="gap:4px">&#128202; Показать визуализацию</button></div>';
      }
      h += '</div></div>';
    }
  }
  el.innerHTML = h;
  el.scrollTop = el.scrollHeight;
}

function _sbFmt(t) {
  if (!t) return '';
  var s = escapeHtml(t);
  s = s.replace(/\\n/g, '<br>');
  return s;
}

function _sbExtractCanvas(text) {
  var openTag = '<canvas-html>';
  var closeTag = '</canvas-' + 'html>';
  var start = text.indexOf(openTag);
  if (start === -1) return null;
  var contentStart = start + openTag.length;
  var end = text.indexOf(closeTag, contentStart);
  if (end === -1) return null;
  return text.substring(contentStart, end).trim();
}

function _sbShowCanvas(html) {
  _sbCanvasHtml = html;
  var f = document.getElementById('sbFrame');
  var e = document.getElementById('sbEmpty');
  var h = document.getElementById('sbCanvasHdr');
  if (f) { f.style.display = 'block'; f.style.flex = '1'; f.srcdoc = html; }
  if (e) e.style.display = 'none';
  if (h) h.style.display = 'flex';
}

function _sbShowLast() {
  for (var i = _sbMessages.length - 1; i >= 0; i--) {
    var cv = _sbExtractCanvas(_sbMessages[i].content || '');
    if (cv) { _sbShowCanvas(cv); return; }
  }
}

function _sbDownload() {
  if (!_sbCanvasHtml) return;
  var blob = new Blob([_sbCanvasHtml], {type: 'text/html'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dashboard_' + new Date().toISOString().slice(0, 10) + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
}

function _sbFullscreen() {
  var p = document.getElementById('sbCanvasPanel');
  if (p && p.requestFullscreen) p.requestFullscreen();
}

function _sbKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sbSend(); }
}

async function _sbSend() {
  if (_sbSending) return;
  var inp = document.getElementById('sbInput');
  if (!inp || !inp.value.trim()) return;
  var msg = inp.value.trim();
  inp.value = '';
  inp.style.height = 'auto';

  _sbSending = true;
  var btn = document.getElementById('sbSendBtn');
  if (btn) { btn.style.opacity = '.5'; btn.style.pointerEvents = 'none'; }

  _sbMessages.push({ role: 'user', content: msg });
  _sbMessages.push({ role: 'assistant', _typing: true });
  _sbRenderMsgs();

  try {
    var res = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: msg, session_id: _sbSessionId })
    });

    _sbMessages = _sbMessages.filter(function(m) { return !m._typing; });

    if (res.reply) {
      _sbMessages.push({ role: 'assistant', content: res.reply.content, created_at: res.reply.created_at });
      var cv = _sbExtractCanvas(res.reply.content);
      if (cv) _sbShowCanvas(cv);
    }
    _sbRenderMsgs();

    // Refresh usage
    try { _sbUsage = await api('/ai/chat/usage'); } catch(e2) {}
    var bar = document.getElementById('sbUsageBar');
    if (bar) bar.outerHTML = _sbUsageBar();
  } catch(e) {
    _sbMessages = _sbMessages.filter(function(m) { return !m._typing; });
    _sbMessages.push({ role: 'assistant', content: '\\u26A0\\uFE0F ' + (e.message || 'Ошибка соединения') });
    _sbRenderMsgs();
  }

  _sbSending = false;
  if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
}
`;
