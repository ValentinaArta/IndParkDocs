/* eslint-disable */
module.exports = `
// === BUDGET / BI PAGE ===

// ── BI Dashboard ─────────────────────────────────────────────────────────────
var _biDashboardUrl = localStorage.getItem('bi_dashboard_url') || '';

function showBIPage() {
  currentView = 'bi';
  _setNavHash('bi');
  setActive('[onclick*="showBIPage"]');
  document.getElementById('pageTitle').textContent = 'BI-дашборды';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';
  var content = document.getElementById('content');
  var h = '<div style="padding:24px">';
  if (_biDashboardUrl) {
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">';
    h += '<span style="font-size:13px;color:var(--text-secondary)">Metabase dashboard</span>';
    h += '<button class="btn btn-sm" onclick="editBIUrl()">Изменить URL</button>';
    h += '</div>';
    h += '<div id="bi_url_edit" style="display:none;margin-bottom:12px;display:flex;gap:8px">';
    h += '<input id="biUrlInput" value="' + escapeHtml(_biDashboardUrl) + '" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:13px" placeholder="https://...metabaseapp.com/public/dashboard/...">';
    h += '<button class="btn btn-primary btn-sm" onclick="saveBIUrl()">Сохранить</button>';
    h += '<button class="btn btn-sm" onclick="showBIPage()">Отмена</button>';
    h += '</div>';
    h += '<iframe src="' + escapeHtml(_biDashboardUrl) + '" style="width:100%;height:calc(100vh - 130px);border:none;border-radius:8px" allowtransparency></iframe>';
  } else {
    h += '<div style="max-width:560px">';
    h += '<div style="font-size:15px;font-weight:600;margin-bottom:8px">Подключение Metabase</div>';
    h += '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Вставьте публичную ссылку из Metabase: Поделиться → Публичная ссылка → скопировать URL</div>';
    h += '<div style="display:flex;gap:8px">';
    h += '<input id="biUrlInput" placeholder="https://...metabaseapp.com/public/dashboard/..." style="flex:1;padding:8px;border:1px solid var(--border);border-radius:6px;font-size:13px">';
    h += '<button class="btn btn-primary" onclick="saveBIUrl()">Сохранить</button>';
    h += '</div></div>';
  }
  h += '</div>';
  content.innerHTML = h;
  renderIcons();
}

function saveBIUrl() {
  var inp = document.getElementById('biUrlInput');
  if (!inp || !inp.value.trim()) return;
  _biDashboardUrl = inp.value.trim();
  localStorage.setItem('bi_dashboard_url', _biDashboardUrl);
  showBIPage();
}

// ============ BUDGET PAGE ============
function showBudgetPage() {
  currentView = 'budget';
  _setNavHash('budget');
  setActive('[onclick*="showBudgetPage"]');
  document.getElementById('pageTitle').textContent = 'Бюджеты';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';
  var content = document.getElementById('content');
  content.innerHTML = '<iframe src="/budget" style="width:100%;height:calc(100vh - 56px);border:none;display:block" allowfullscreen></iframe>';
}

function editBIUrl() {
  var editDiv = document.getElementById('bi_url_edit');
  if (editDiv) editDiv.style.display = 'flex';
}
`;
