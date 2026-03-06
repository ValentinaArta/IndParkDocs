module.exports = `
// ============ AI SANDBOX PAGE ============
var _sbMessages = [];
var _sbLastId = 0;
var _sbSessionId = 'sandbox_' + Date.now();
var _sbCanvasHtml = null;
var _sbUsage = { used: 0, limit: 300000, remaining: 300000 };
var _sbSending = false;

async function showAISandbox() {
  setActiveNav('ai-sandbox');
  document.getElementById('pageTitle').textContent = 'AI Песочница';
  _setNavHash('ai-sandbox');
  _sbMessages = [];
  _sbLastId = 0;
  _sbCanvasHtml = null;
  _sbSending = false;

  try { _sbUsage = await api('/ai/chat/usage'); } catch(e) {}

  document.getElementById('content').innerHTML = _sbBuildLayout();

  if (!document.getElementById('sbStyles')) {
    var st = document.createElement('style');
    st.id = 'sbStyles';
    st.textContent = '@keyframes sbFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}' +
      '@keyframes sbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}' +
      '@keyframes sbPulse{0%,100%{opacity:.35}50%{opacity:1}}' +
      '@keyframes sbSlideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}' +
      '#sbMessages::-webkit-scrollbar{width:6px}#sbMessages::-webkit-scrollbar-thumb{background:var(--border);border-radius:6px}' +
      '@media(max-width:768px){#sbRoot{flex-direction:column!important}#sbChatPanel{width:100%!important;min-width:0!important;height:55vh!important}#sbCanvasPanel{height:45vh!important}}' +
      '#sbInput:focus{border-color:var(--accent)!important;box-shadow:0 0 0 3px rgba(99,102,241,.1)}' +
      '#sbSendBtn:hover{transform:scale(1.08)}' +
      '#sbSendBtn:active{transform:scale(0.95)}';
    document.head.appendChild(st);
  }

  var inp = document.getElementById('sbInput');
  if (inp) {
    inp.addEventListener('input', function() { this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,120)+'px'; });
    setTimeout(function(){ inp.focus(); }, 200);
  }
}

function _sbBuildLayout() {
  return '<div id="sbRoot" style="display:flex;height:100%;gap:0;animation:sbFadeIn .4s ease">' +
    '<div id="sbChatPanel" style="width:40%;min-width:320px;display:flex;flex-direction:column;background:var(--bg-card);border-right:1px solid var(--border)">' +
      '<div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0">' +
        '<div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">✨</div>' +
        '<div style="flex:1"><div style="font-weight:700;font-size:14px">AI Аналитик</div><div style="font-size:11px;color:var(--text-secondary)">Claude Sonnet · Canvas</div></div>' +
        '<button onclick="_sbNewChat()" style="padding:5px 11px;border-radius:8px;border:1px solid var(--border);background:none;cursor:pointer;font-size:12px;color:var(--text-secondary)">🔄 Новый</button>' +
      '</div>' +
      '<div id="sbUsageBar" style="padding:8px 18px;border-bottom:1px solid var(--border);flex-shrink:0">' + _sbUsageBarHtml() + '</div>' +
      '<div id="sbMessages" style="flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:10px">' + _sbEmptyChatHtml() + '</div>' +
      '<div style="padding:14px 18px;border-top:1px solid var(--border);flex-shrink:0">' +
        '<div style="display:flex;gap:8px;align-items:flex-end">' +
          '<textarea id="sbInput" onkeydown="_sbKeydown(event)" placeholder="Спросите что угодно или попросите визуализацию..." rows="1" style="flex:1;padding:11px 14px;border:2px solid var(--border);border-radius:12px;font-size:14px;font-family:inherit;resize:none;outline:none;max-height:120px;line-height:1.5;transition:border-color .2s"></textarea>' +
          '<button id="sbSendBtn" onclick="_sbSend()" style="width:43px;height:43px;border-radius:12px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;border:none;cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:transform .15s"></button>' +
        '</div>' +
        '<div style="margin-top:7px;font-size:11px;color:var(--text-muted);display:flex;gap:10px">' +
          '<span>💡 «Дашборд арендаторов»</span><span>📊 «График платежей»</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="sbCanvasPanel" style="flex:1;display:flex;flex-direction:column;background:#0F172A;position:relative;overflow:hidden">' +
      '<div id="sbCanvasHeader" style="display:none;padding:10px 18px;align-items:center;justify-content:space-between;flex-shrink:0;z-index:2">' +
        '<div style="font-size:12px;color:rgba(255,255,255,.5)">📊 Визуализация</div>' +
        '<div style="display:flex;gap:6px">' +
          '<button onclick="_sbDownload()" style="padding:4px 11px;border-radius:6px;background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.65);cursor:pointer;font-size:12px">⬇ Скачать</button>' +
          '<button onclick="_sbFullscreen()" style="padding:4px 11px;border-radius:6px;background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.65);cursor:pointer;font-size:12px">⛶ Полный экран</button>' +
        '</div>' +
      '</div>' +
      '<div id="sbEmpty" style="flex:1;display:flex;align-items:center;justify-content:center">' +
        '<div style="text-align:center;animation:sbFloat 3s ease-in-out infinite">' +
          '<div style="font-size:60px;margin-bottom:16px;opacity:.25">✨</div>' +
          '<div style="font-size:17px;color:rgba(255,255,255,.28);font-weight:600;line-height:1.7">Попросите AI создать<br>визуализацию</div>' +
          '<div style="margin-top:12px;font-size:12px;color:rgba(255,255,255,.14)">Дашборды · Графики · Отчёты · Таблицы</div>' +
        '</div>' +
      '</div>' +
      '<iframe id="sbFrame" sandbox="allow-scripts" style="display:none;flex:1;border:none;width:100%;background:white"></iframe>' +
    '</div>' +
  '</div>';
}

function _sbUsageBarHtml() {
  var pct = Math.min(100, Math.round((_sbUsage.used / _sbUsage.limit) * 100));
  var col = pct > 80 ? '#EF4444' : pct > 50 ? '#F59E0B' : '#10B981';
  var usedK = Math.round(_sbUsage.used / 1000);
  var limK  = Math.round(_sbUsage.limit / 1000);
  return '<div style="display:flex;align-items:center;gap:10px">' +
    '<div style="flex:1;height:5px;background:var(--bg-hover);border-radius:3px;overflow:hidden">' +
      '<div style="width:' + pct + '%;height:100%;background:' + col + ';border-radius:3px;transition:width .5s"></div>' +
    '</div>' +
    '<span style="font-size:11px;color:var(--text-muted);white-space:nowrap">' + usedK + 'K / ' + limK + 'K</span>' +
  '</div>';
}

function _sbEmptyChatHtml() {
  return '<div style="flex:1;display:flex;align-items:center;justify-content:center">' +
    '<div style="text-align:center;padding:30px 20px">' +
      '<div style="font-size:44px;margin-bottom:14px">🤖</div>' +
      '<div style="font-size:15px;font-weight:600;margin-bottom:6px">Что вы хотите узнать?</div>' +
      '<div style="font-size:13px;color:var(--text-muted);line-height:1.6">Задайте вопрос или попросите<br>создать красивую визуализацию</div>' +
      '<div style="margin-top:18px;display:flex;flex-wrap:wrap;gap:7px;justify-content:center">' +
        _sbChip('📊 Дашборд арендаторов') + _sbChip('💰 Задолженности') +
        _sbChip('🏢 Загрузка корпусов')   + _sbChip('📈 Бюджет план-факт') +
      '</div>' +
    '</div>' +
  '</div>';
}

function _sbChip(txt) {
  return '<button onclick="_sbUseSuggestion(\'' + txt.replace(/'/g, '') + '\')" ' +
    'style="padding:7px 13px;border-radius:20px;border:1px solid var(--border);background:var(--bg);cursor:pointer;font-size:12px;color:var(--text-secondary);transition:all .15s" ' +
    'onmouseenter="this.style.borderColor=\'var(--accent)\';this.style.color=\'var(--accent)\'" ' +
    'onmouseleave="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-secondary)\'">' + txt + '</button>';
}

function _sbUseSuggestion(txt) {
  var inp = document.getElementById('sbInput');
  if (inp) { inp.value = txt; inp.focus(); _sbSend(); }
}

function _sbNewChat() {
  _sbMessages = []; _sbLastId = 0; _sbCanvasHtml = null;
  _sbSessionId = 'sandbox_' + Date.now();
  var el = document.getElementById('sbMessages');
  if (el) el.innerHTML = _sbEmptyChatHtml();
  _sbHideCanvas();
}

function _sbHideCanvas() {
  var f = document.getElementById('sbFrame'), e = document.getElementById('sbEmpty'), h = document.getElementById('sbCanvasHeader');
  if (f) f.style.display = 'none';
  if (e) { e.style.display = 'flex'; e.style.flex = '1'; }
  if (h) h.style.display = 'none';
}

function _sbShowCanvas(html) {
  _sbCanvasHtml = html;
  var f = document.getElementById('sbFrame'), e = document.getElementById('sbEmpty'), h = document.getElementById('sbCanvasHeader');
  if (e) e.style.display = 'none';
  if (f) { f.style.display = 'block'; f.style.flex = '1'; f.srcdoc = html; }
  if (h) h.style.display = 'flex';
}

function _sbExtractCanvas(text) {
  var open = '<canvas-html>', close = '<\\/canvas-html>'.replace('\\\\/','\/');
  // use indexOf for safe extraction without regex
  var startTag = text.indexOf(open);
  if (startTag === -1) {
    // try lowercase variant
    var lt = text.toLowerCase();
    startTag = lt.indexOf(open.toLowerCase());
    if (startTag === -1) return null;
  }
  var contentStart = startTag + open.length;
  var closeTag = text.indexOf('<' + '/canvas-html>', contentStart);
  if (closeTag === -1) return null;
  return text.substring(contentStart, closeTag).trim();
}

function _sbRenderMessages() {
  var el = document.getElementById('sbMessages');
  if (!el) return;
  if (!_sbMessages.length) { el.innerHTML = _sbEmptyChatHtml(); return; }
  var h = '';
  for (var i = 0; i < _sbMessages.length; i++) {
    var m = _sbMessages[i];
    var last = i === _sbMessages.length - 1;
    var anim = last ? 'animation:sbSlideUp .3s ease;' : '';
    if (m.role === 'user') {
      h += '<div style="display:flex;justify-content:flex-end;' + anim + '">' +
        '<div style="max-width:82%;padding:11px 15px;border-radius:16px 16px 4px 16px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;font-size:14px;line-height:1.6;box-shadow:0 2px 8px rgba(99,102,241,.3)">' +
        escapeHtml(m.content) + '</div></div>';
    } else if (m._typing) {
      h += '<div style="display:flex;gap:10px;align-items:flex-start;' + anim + '">' +
        '<div style="width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">✨</div>' +
        '<div style="padding:13px 17px;border-radius:4px 16px 16px 16px;background:var(--bg);border:1px solid var(--border);display:flex;gap:5px;align-items:center">' +
        '<span style="animation:sbPulse 1s infinite;font-size:9px;color:var(--accent)">●</span>' +
        '<span style="animation:sbPulse 1s .2s infinite;font-size:9px;color:var(--accent)">●</span>' +
        '<span style="animation:sbPulse 1s .4s infinite;font-size:9px;color:var(--accent)">●</span>' +
        '<span style="font-size:12px;color:var(--text-muted);margin-left:5px">Думаю...</span>' +
        '</div></div>';
    } else {
      var cv = _sbExtractCanvas(m.content || '');
      var txt = m.content || '';
      if (cv) {
        // strip canvas block from display text
        var si = txt.indexOf('<canvas-html>');
        var ei = txt.indexOf('<' + '/canvas-html>');
        if (si !== -1 && ei !== -1) txt = (txt.substring(0, si) + txt.substring(ei + ('<' + '/canvas-html>').length)).trim();
        if (!txt) txt = '📊 Визуализация готова — смотрите справа →';
      }
      h += '<div style="display:flex;gap:10px;align-items:flex-start;' + anim + '">' +
        '<div style="width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#6366F1,#8B5CF6);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">✨</div>' +
        '<div style="flex:1;padding:13px 17px;border-radius:4px 16px 16px 16px;background:var(--bg);border:1px solid var(--border);font-size:14px;line-height:1.7">' +
        _sbFmtText(txt);
      if (cv) h += '<div style="margin-top:10px"><button onclick="_sbShowLastCanvas()" style="padding:6px 14px;border-radius:8px;background:linear-gradient(135deg,#6366F1,#8B5CF6);color:white;border:none;cursor:pointer;font-size:12px">📊 Показать</button></div>';
      h += '</div></div>';
    }
  }
  el.innerHTML = h;
  el.scrollTop = el.scrollHeight;
}

function _sbFmtText(t) {
  if (!t) return '';
  var s = escapeHtml(t);
  s = s.replace(/\\n/g, '<br>');
  return s;
}

function _sbShowLastCanvas() {
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
  a.download = 'dashboard_' + new Date().toISOString().slice(0,10) + '.html';
  a.click(); URL.revokeObjectURL(a.href);
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
  inp.value = ''; inp.style.height = 'auto';

  _sbSending = true;
  var btn = document.getElementById('sbSendBtn');
  if (btn) { btn.style.opacity = '.45'; btn.style.pointerEvents = 'none'; }

  _sbMessages.push({role: 'user', content: msg, created_at: new Date().toISOString()});
  _sbMessages.push({role: 'assistant', _typing: true});
  _sbRenderMessages();

  try {
    var res = await api('/ai/chat', {method: 'POST', body: JSON.stringify({message: msg, session_id: _sbSessionId})});
    _sbMessages = _sbMessages.filter(function(m){ return !m._typing; });
    if (res.reply) {
      _sbMessages.push({role: 'assistant', content: res.reply.content, created_at: res.reply.created_at});
      var cv = _sbExtractCanvas(res.reply.content);
      if (cv) _sbShowCanvas(cv);
    }
    _sbRenderMessages();
    try { _sbUsage = await api('/ai/chat/usage'); } catch(e2) {}
    var bar = document.getElementById('sbUsageBar');
    if (bar) bar.innerHTML = _sbUsageBarHtml();
  } catch(e) {
    _sbMessages = _sbMessages.filter(function(m){ return !m._typing; });
    _sbMessages.push({role: 'assistant', content: '⚠️ ' + (e.message || 'Ошибка соединения'), created_at: new Date().toISOString()});
    _sbRenderMessages();
  }

  _sbSending = false;
  if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
}
`;
