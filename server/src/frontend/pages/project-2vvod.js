/* eslint-disable */
module.exports = `
// === PROJECT: 2й ввод ===

var _p2vTab = 'lenenergo';

var _P2V_TABS = [
  { key: 'lenenergo',     label: 'ЛенЭнерго',    companyIds: [472] },
  { key: 'zheldorenergo', label: 'ЖелДорЭнерго',  companyIds: [] },
  { key: 'pao_zvezda',    label: 'ПАО ЗВЕЗДА',    companyIds: [350] },
  { key: 'gpu',           label: 'ГПУ',           companyIds: [] }
];

function showProject2Vvod(tab) {
  if (tab) _p2vTab = tab;
  currentView = 'project-2vvod';
  _setNavHash('project-2vvod');
  setActive('[data-type="project-2vvod"]');

  var h = '<div style="max-width:1200px">';
  h += '<h2 style="margin-bottom:16px">2й ввод</h2>';

  // Tabs
  h += '<div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid var(--border);padding-bottom:0">';
  _P2V_TABS.forEach(function(t) {
    var isActive = t.key === _p2vTab;
    h += '<button data-p2v-tab="' + t.key + '" onclick="showProject2Vvod(this.dataset.p2vTab)" style="padding:8px 16px;font-size:14px;font-weight:' + (isActive ? '600' : '400') + ';border:none;background:none;cursor:pointer;color:' + (isActive ? 'var(--accent)' : 'var(--text-secondary)') + ';border-bottom:2px solid ' + (isActive ? 'var(--accent)' : 'transparent') + ';margin-bottom:-2px;transition:all 0.15s">' + t.label + '</button>';
  });
  h += '</div>';

  // Content
  h += '<div id="p2v_content"><div style="padding:40px;text-align:center;color:var(--text-muted)">Загрузка...</div></div>';
  h += '</div>';
  document.getElementById('content').innerHTML = h;

  _p2vLoadTab(_p2vTab);
}

async function _p2vLoadTab(tabKey) {
  var tabObj = _P2V_TABS.find(function(t) { return t.key === tabKey; });
  if (!tabObj) return;
  var el = document.getElementById('p2v_content');
  if (!el) return;

  if (!tabObj.companyIds.length) {
    el.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--text-muted)">' +
      '<i data-lucide="building-2" class="lucide" style="width:48px;height:48px;margin-bottom:12px;opacity:0.3"></i>' +
      '<div style="font-size:16px;margin-bottom:4px">' + escapeHtml(tabObj.label) + '</div>' +
      '<div style="font-size:13px">Контрагент ещё не добавлен в систему. Создайте компанию и обновите настройки.</div></div>';
    renderIcons();
    return;
  }

  try {
    var url = '/letters/by-topic/2й ввод?companies=' + tabObj.companyIds.join(',');
    var letters = await api(url);
    _p2vRenderLetters(el, tabObj, letters);
  } catch(ex) {
    el.innerHTML = '<div style="padding:20px;color:var(--danger)">Ошибка загрузки: ' + escapeHtml(ex.message || String(ex)) + '</div>';
  }
}

function _p2vRenderLetters(el, tabObj, letters) {
  if (!letters || !letters.length) {
    el.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--text-muted)">' +
      '<div style="font-size:14px">Нет писем по теме «2й ввод» для ' + escapeHtml(tabObj.label) + '</div>' +
      '<div style="margin-top:12px"><button class="btn btn-primary btn-sm" onclick="showLetters()">Перейти в Письма</button></div></div>';
    return;
  }

  var h = '<table style="width:100%;border-collapse:collapse;font-size:13px">';
  h += '<thead><tr style="background:#4F6BCC;color:#fff">';
  h += '<th style="padding:8px 10px;text-align:left;border-radius:4px 0 0 0">Дата</th>';
  h += '<th style="padding:8px 10px;text-align:left">Исх. №</th>';
  h += '<th style="padding:8px 10px;text-align:left">От</th>';
  h += '<th style="padding:8px 10px;text-align:left">Кому</th>';
  h += '<th style="padding:8px 10px;text-align:left">Суть</th>';
  h += '<th style="padding:8px 10px;text-align:left;border-radius:0 4px 0 0">Срок</th>';
  h += '</tr></thead><tbody>';

  letters.forEach(function(e, i) {
    var p = e.properties || {};
    var bg = i % 2 ? 'background:var(--bg-secondary)' : '';
    var dt = p.letter_date || '';
    if (dt) dt = dt.split('-').reverse().join('.');
    var deadline = p.deadline || '';
    if (deadline) deadline = deadline.split('-').reverse().join('.');
    var dlStyle = '';
    if (deadline) {
      var dlDate = new Date(p.deadline);
      if (dlDate < new Date()) dlStyle = 'color:#dc2626;font-weight:600';
    }
    h += '<tr style="cursor:pointer;' + bg + '" onclick="showEntity(' + e.id + ')">';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);white-space:nowrap">' + dt + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.outgoing_number || '') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.from_name || '') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border)">' + escapeHtml(p.to_name || '') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);max-width:300px;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(p.summary || '') + '</td>';
    h += '<td style="padding:7px 10px;border-bottom:1px solid var(--border);white-space:nowrap;' + dlStyle + '">' + deadline + '</td>';
    h += '</tr>';
  });

  h += '</tbody></table>';
  h += '<div style="margin-top:8px;font-size:12px;color:var(--text-muted)">Всего: ' + letters.length + '</div>';
  el.innerHTML = h;
}
`;
