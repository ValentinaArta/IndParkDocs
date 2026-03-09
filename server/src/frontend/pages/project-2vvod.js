/* eslint-disable */
module.exports = `
// === PROJECT: 2й ввод ===

var _p2vTab = 'lenenergo';

var _P2V_TABS = [
  { key: 'lenenergo',    label: 'ЛенЭнерго' },
  { key: 'zheldorenergo', label: 'ЖелДорЭнерго' },
  { key: 'pao_zvezda',   label: 'ПАО ЗВЕЗДА' },
  { key: 'gpu',          label: 'ГПУ' }
];

function showProject2Vvod(tab) {
  if (tab) _p2vTab = tab;
  currentView = 'project-2vvod';
  _setNavHash('project-2vvod');
  setActive('[data-type="project-2vvod"]');

  var h = '<div style="max-width:1100px">';
  h += '<h2 style="margin-bottom:16px">2й ввод</h2>';

  // Tabs
  h += '<div style="display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid var(--border);padding-bottom:0">';
  _P2V_TABS.forEach(function(t) {
    var isActive = t.key === _p2vTab;
    h += '<button data-p2v-tab="' + t.key + '" onclick="showProject2Vvod(this.dataset.p2vTab)" style="padding:8px 16px;font-size:14px;font-weight:' + (isActive ? '600' : '400') + ';border:none;background:none;cursor:pointer;color:' + (isActive ? 'var(--accent)' : 'var(--text-secondary)') + ';border-bottom:2px solid ' + (isActive ? 'var(--accent)' : 'transparent') + ';margin-bottom:-2px;transition:all 0.15s">' + t.label + '</button>';
  });
  h += '</div>';

  // Content
  h += '<div id="p2v_content" style="min-height:200px">';
  h += _p2vRenderTab(_p2vTab);
  h += '</div>';

  h += '</div>';
  document.getElementById('content').innerHTML = h;
}

function _p2vRenderTab(tab) {
  var tabObj = _P2V_TABS.find(function(t) { return t.key === tab; });
  var label = tabObj ? tabObj.label : tab;
  var h = '<div style="padding:40px 20px;text-align:center;color:var(--text-muted)">';
  h += '<i data-lucide="construction" class="lucide" style="width:48px;height:48px;margin-bottom:12px;opacity:0.3"></i>';
  h += '<div style="font-size:16px;margin-bottom:4px">' + label + '</div>';
  h += '<div style="font-size:13px">Раздел в разработке</div>';
  h += '</div>';
  return h;
}
`;
