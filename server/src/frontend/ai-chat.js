module.exports = `// ============ AI CHAT WIDGET ============
var _aiChatOpen = false;
var _aiLastId = 0;
var _aiPollTimer = null;
var _aiMessages = [];

function toggleAIChat() {
  _aiChatOpen = !_aiChatOpen;
  var panel = document.getElementById('aiChatPanel');
  var btn = document.getElementById('aiChatBtn');
  if (_aiChatOpen) {
    panel.style.display = 'flex';
    btn.style.display = 'none';
    if (_aiMessages.length === 0) loadAIChatHistory();
    startAIPoll();
    var inp = document.getElementById('aiChatInput');
    if (inp) setTimeout(function() { inp.focus(); }, 100);
  } else {
    panel.style.display = 'none';
    btn.style.display = 'flex';
    stopAIPoll();
  }
}

async function loadAIChatHistory() {
  try {
    var res = await api('/ai/chat/history?limit=50');
    _aiMessages = res.messages || [];
    if (_aiMessages.length > 0) _aiLastId = _aiMessages[_aiMessages.length - 1].id;
    renderAIMessages();
  } catch(e) {}
}

function renderAIMessages() {
  var el = document.getElementById('aiChatMessages');
  if (!el) return;
  if (_aiMessages.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:13px;padding:40px 20px">Задайте вопрос по данным системы.<br>Например: <em>«Какие ставки аренды в 12 корпусе?»</em></div>';
    return;
  }
  var h = '';
  _aiMessages.forEach(function(m) {
    var isUser = m.role === 'user';
    var align = isUser ? 'flex-end' : 'flex-start';
    var bg = isUser ? 'var(--accent)' : 'var(--bg-secondary)';
    var color = isUser ? 'white' : 'var(--text)';
    var icon = isUser ? '' : '<div style="font-size:16px;margin-bottom:4px">🤖</div>';
    var meta = m.metadata || {};
    var tableHtml = '';
    if (meta.table && Array.isArray(meta.table) && meta.table.length > 0) {
      tableHtml = '<div style="margin-top:8px;overflow-x:auto;max-height:300px;overflow-y:auto">';
      tableHtml += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
      var keys = Object.keys(meta.table[0]);
      tableHtml += '<tr>' + keys.map(function(k) { return '<th style="text-align:left;padding:4px 8px;border-bottom:2px solid var(--border);white-space:nowrap">' + escapeHtml(k) + '</th>'; }).join('') + '</tr>';
      meta.table.forEach(function(row) {
        tableHtml += '<tr>' + keys.map(function(k) { return '<td style="padding:4px 8px;border-bottom:1px solid var(--border)">' + escapeHtml(String(row[k] != null ? row[k] : '')) + '</td>'; }).join('') + '</tr>';
      });
      tableHtml += '</table></div>';
    }
    h += '<div style="display:flex;justify-content:' + align + ';margin-bottom:10px">';
    h += '<div style="max-width:85%;padding:10px 14px;border-radius:12px;background:' + bg + ';color:' + color + ';font-size:13px;line-height:1.5;word-break:break-word">';
    h += icon;
    if (m._typing) {
      h += '<div style="display:flex;gap:4px;align-items:center;padding:4px 0"><span style="animation:blink 1s infinite;opacity:.5">●</span><span style="animation:blink 1s .3s infinite;opacity:.5">●</span><span style="animation:blink 1s .6s infinite;opacity:.5">●</span></div>';
    } else {
      h += '<div style="white-space:pre-wrap">' + escapeHtml(m.content) + '</div>';
      h += tableHtml;
      var time = new Date(m.created_at);
      h += '<div style="font-size:10px;opacity:0.6;margin-top:4px;text-align:right">' + time.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) + '</div>';
    }
    h += '</div></div>';
  });
  el.innerHTML = h;
  el.scrollTop = el.scrollHeight;
}

async function sendAIMessage() {
  var inp = document.getElementById('aiChatInput');
  if (!inp || !inp.value.trim()) return;
  var msg = inp.value.trim();
  inp.value = '';
  // Optimistic: добавляем сообщение пользователя
  _aiMessages.push({id: 0, role: 'user', content: msg, metadata: {}, created_at: new Date().toISOString()});
  // Добавляем индикатор "печатает..."
  var typingId = '__typing__';
  _aiMessages.push({id: typingId, role: 'assistant', content: '…', metadata: {}, created_at: new Date().toISOString(), _typing: true});
  renderAIMessages();
  try {
    var res = await api('/ai/chat', {method: 'POST', body: JSON.stringify({message: msg})});
    // Убираем typing indicator
    _aiMessages = _aiMessages.filter(function(m) { return m.id !== typingId; });
    // Обновляем id пользовательского сообщения
    if (res.user_id) {
      var um = _aiMessages.find(function(m) { return m.role === 'user' && m.id === 0; });
      if (um) um.id = res.user_id;
    }
    // Добавляем ответ ИИ сразу (inline response)
    if (res.reply) {
      _aiMessages.push({id: res.reply.id, role: 'assistant', content: res.reply.content, metadata: {}, created_at: res.reply.created_at});
      _aiLastId = Math.max(_aiLastId, res.reply.id || 0);
    } else if (res.id) {
      // Старый формат — ждём через polling
      _aiLastId = Math.max(_aiLastId, res.id);
      startAIPoll();
    }
    renderAIMessages();
  } catch(e) {
    _aiMessages = _aiMessages.filter(function(m) { return m.id !== typingId; });
    _aiMessages.push({id: 0, role: 'assistant', content: '⚠️ Ошибка: ' + (e.message || 'попробуйте позже'), metadata: {}, created_at: new Date().toISOString()});
    renderAIMessages();
  }
}

function startAIPoll() {
  stopAIPoll();
  _aiPollTimer = setInterval(pollAIMessages, 3000);
}
function stopAIPoll() {
  if (_aiPollTimer) { clearInterval(_aiPollTimer); _aiPollTimer = null; }
}

async function pollAIMessages() {
  if (!_aiChatOpen) return;
  try {
    var res = await api('/ai/chat/messages?after=' + _aiLastId);
    var msgs = res.messages || [];
    if (msgs.length > 0) {
      msgs.forEach(function(m) {
        if (!_aiMessages.find(function(x) { return x.id === m.id; })) {
          _aiMessages.push(m);
        }
      });
      _aiLastId = msgs[msgs.length - 1].id;
      renderAIMessages();
    }
  } catch(e) {}
}

function aiChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
}`;
