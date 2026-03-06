module.exports = `
var _sbMessages = [];

async function showAISandbox() {
  setActiveNav('ai-sandbox');
  document.getElementById('pageTitle').textContent = 'AI Песочница';
  _setNavHash('ai-sandbox');
  document.getElementById('content').innerHTML = '<div style="padding:24px;text-align:center"><h2>🤖 AI Аналитик</h2><p style="color:var(--text-muted);margin-top:16px">Скоро здесь появится интерактивная песочница с красивыми визуализациями...</p></div>';
}
`;
