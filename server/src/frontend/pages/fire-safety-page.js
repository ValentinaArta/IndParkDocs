/* eslint-disable */
module.exports = `
// === FIRE SAFETY PAGE ===

var _fireSafetyParks = [
  { id: 11, name: 'Индустриальный парк', short: 'ИПЗ' },
  { id: 12, name: 'Экспериментальный комплекс', short: 'ЭК' },
  { id: 63, name: 'Складской Терминал', short: 'СТ' }
];
var _fireSafetyTab = 0;

function showFireSafety() {
  currentView = 'fire-safety';
  _setNavHash('fire-safety');
  setActiveNav('fire-safety');
  document.getElementById('pageTitle').textContent = 'Пожарка';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML = '';
  var content = document.getElementById('content');
  var h = '<div style="padding:24px;max-width:1200px">';

  // Tabs
  h += '<div style="display:flex;gap:0;margin-bottom:24px;border-bottom:2px solid var(--border)">';
  _fireSafetyParks.forEach(function(park, i) {
    h += '<button class="btn" id="fsTab' + i + '" onclick="_switchFireTab(' + i + ')" ' +
      'style="border:none;border-bottom:2px solid ' + (i===0?'var(--primary)':'transparent') + ';border-radius:0;padding:10px 20px;font-weight:' + (i===0?'700':'400') + ';color:' + (i===0?'var(--primary)':'var(--text-secondary)') + '">' +
      escapeHtml(park.name) + '</button>';
  });
  h += '</div>';

  h += '<div id="fireSafetyContent"><div style="padding:40px;text-align:center;color:var(--text-muted)">Загрузка...</div></div>';
  h += '</div>';
  content.innerHTML = h;
  _fireSafetyTab = 0;
  _loadFireSafetyTab(0);
}

function _switchFireTab(idx) {
  _fireSafetyTab = idx;
  _fireSafetyParks.forEach(function(_, i) {
    var btn = document.getElementById('fsTab' + i);
    if (btn) {
      btn.style.borderBottomColor = (i === idx) ? 'var(--primary)' : 'transparent';
      btn.style.fontWeight = (i === idx) ? '700' : '400';
      btn.style.color = (i === idx) ? 'var(--primary)' : 'var(--text-secondary)';
    }
  });
  _loadFireSafetyTab(idx);
}

async function _loadFireSafetyTab(idx) {
  var park = _fireSafetyParks[idx];
  var el = document.getElementById('fireSafetyContent');
  el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)">Загрузка...</div>';

  // Load tenants
  var tenants = [];
  try {
    tenants = await api('/letters/tenants/' + park.id);
  } catch(e) {}

  var h = '';

  // Section 1: Статус по предписанию
  h += '<div style="margin-bottom:32px">';
  h += '<h3 style="font-size:16px;font-weight:600;margin-bottom:12px">📋 Статус по предписанию</h3>';
  h += '<table class="data-table" style="width:100%"><thead><tr>';
  h += '<th>№ п/п</th><th>Пункт предписания</th><th>Статус</th><th>Срок</th><th>Примечание</th>';
  h += '</tr></thead><tbody>';
  h += '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Нет данных</td></tr>';
  h += '</tbody></table>';
  h += '</div>';

  // Section 2: Арендаторы / Субарендаторы
  h += '<div>';
  h += '<h3 style="font-size:16px;font-weight:600;margin-bottom:12px">🏢 Арендаторы / Субарендаторы</h3>';

  if (!tenants.length) {
    h += '<div style="color:var(--text-muted);padding:20px;text-align:center">Нет арендаторов / субарендаторов по договорам</div>';
  } else {
    tenants.forEach(function(t, i) {
      var secId = 'fsTenant_' + idx + '_' + i;
      h += '<div style="border:1px solid var(--border);border-radius:8px;margin-bottom:8px">';
      h += '<button onclick="_toggleFireTenant(\\x27' + secId + '\\x27, this)" ' +
        'style="width:100%;text-align:left;padding:12px 16px;background:var(--bg-secondary);border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:space-between">' +
        '<span>' + escapeHtml(t.tenant_name) + '</span>' +
        '<span style="font-size:12px;color:var(--text-muted);transition:transform .2s" id="' + secId + '_arrow">▶</span>' +
        '</button>';
      h += '<div id="' + secId + '" style="display:none;padding:12px 16px">' +
        '<div style="text-align:center;color:var(--text-muted);padding:10px" id="' + secId + '_content">Загрузка писем...</div>' +
        '</div>';
      h += '</div>';
    });
  }
  h += '</div>';

  el.innerHTML = h;
}

function _toggleFireTenant(secId, btn) {
  var el = document.getElementById(secId);
  var arrow = document.getElementById(secId + '_arrow');
  if (!el) return;
  var isHidden = el.style.display === 'none';
  el.style.display = isHidden ? 'block' : 'none';
  if (arrow) arrow.textContent = isHidden ? '▼' : '▶';

  // Load letters on first open
  if (isHidden) {
    var contentEl = document.getElementById(secId + '_content');
    if (contentEl && contentEl.textContent === 'Загрузка писем...') {
      _loadTenantFireLetters(secId, contentEl);
    }
  }
}

async function _loadTenantFireLetters(secId, contentEl) {
  // Parse tenant info from secId: fsTenant_{parkIdx}_{tenantIdx}
  var parts = secId.replace('fsTenant_', '').split('_');
  var parkIdx = parseInt(parts[0]);
  var tenantIdx = parseInt(parts[1]);
  var park = _fireSafetyParks[parkIdx];

  var tenants = [];
  try { tenants = await api('/letters/tenants/' + park.id); } catch(e) {}
  var tenant = tenants[tenantIdx];
  if (!tenant) { contentEl.innerHTML = '<div style="color:var(--text-muted)">Ошибка</div>'; return; }

  // Get all fire-safety letters involving this tenant and this park
  try {
    var letters = await api('/letters/by-topic/Пожарка?companies=' + park.id + ',' + tenant.tenant_id);
    if (!letters || !letters.length) {
      contentEl.innerHTML = '<div style="color:var(--text-muted);padding:10px">Нет писем по теме «Пожарка»</div>';
      return;
    }

    var h = '<div style="display:flex;flex-direction:column;gap:12px">';
    letters.forEach(function(letter) {
      var p = letter.properties || {};
      var files = letter.files || [];
      var deadlineStyle = '';
      if (p.deadline) {
        var dl = new Date(p.deadline);
        if (dl < new Date()) deadlineStyle = 'color:var(--danger);font-weight:600';
      }
      h += '<div style="padding:12px;border:1px solid var(--border);border-radius:6px;background:var(--bg-secondary)">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
      h += '<span style="font-weight:600;font-size:13px">' + _fmtDate(p.letter_date) + '</span>';
      if (p.deadline) {
        h += '<span style="font-size:12px;' + deadlineStyle + '">Срок: ' + _fmtDate(p.deadline) + '</span>';
      }
      h += '</div>';
      h += '<div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px">' +
        escapeHtml(p.from_company_name || '') + ' → ' + escapeHtml(p.to_company_name || '') +
        (p.outgoing_number ? ' (исх. №' + escapeHtml(p.outgoing_number) + ')' : '') + '</div>';
      if (p.description) {
        h += '<div style="font-size:14px;white-space:pre-wrap;margin-top:4px">' + escapeHtml(p.description) + '</div>';
      }
      if (files.length) {
        h += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">';
        files.forEach(function(f) {
          h += '<a href="/api/entities/' + letter.id + '/files/' + f.id + '" target="_blank" ' +
            'style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:4px;background:var(--bg-primary);border:1px solid var(--border);font-size:12px;text-decoration:none;color:var(--text-primary)">' +
            '📎 ' + escapeHtml(f.filename) + '</a>';
        });
        h += '</div>';
      }
      h += '</div>';
    });
    h += '</div>';
    contentEl.innerHTML = h;
  } catch(e) {
    contentEl.innerHTML = '<div style="color:var(--danger)">Ошибка: ' + escapeHtml(e.message) + '</div>';
  }
}
`;
