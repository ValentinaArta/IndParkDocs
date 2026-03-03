/* eslint-disable */
module.exports = `
// === LEGAL ZACHETY ===

function showLegalZachety() {
  setActiveNav('legal-zachety');
  var content = document.getElementById('content');
  content.innerHTML = '<div style="padding:24px;max-width:1200px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">' +
    '<h2 style="font-size:20px;font-weight:700">⚖️ Зачёты с ПАО</h2>' +
    '<button class="btn btn-primary" onclick="addZachet()"><i data-lucide="plus" class="lucide" style="width:14px;height:14px"></i> Добавить</button>' +
    '</div>' +
    '<div id="zachetyContent"><div style="padding:40px;text-align:center;color:var(--text-muted)">Загрузка...</div></div>' +
    '</div>';
  if (window.lucide) lucide.createIcons();
  loadZachety();
}

async function loadZachety() {
  try {
    var data = await api('/legal/zachety');
    var el = document.getElementById('zachetyContent');
    if (!data || !Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">' +
        '<div style="font-size:48px;margin-bottom:16px">⚖️</div>' +
        '<p style="font-size:16px;margin-bottom:8px">Нет записей</p>' +
        '<p style="font-size:13px">Нажмите «Добавить» чтобы создать первый зачёт</p></div>';
      return;
    }
    var html = '';
    data.forEach(function(z) {
      var dateStr = z.date ? new Date(z.date).toLocaleDateString('ru') : '—';
      var ipOwes = z.before_ip_owes ? Number(z.before_ip_owes).toLocaleString('ru', {minimumFractionDigits:2}) + ' ₽' : '—';
      var paoOwes = z.before_pao_owes ? Number(z.before_pao_owes).toLocaleString('ru', {minimumFractionDigits:2}) + ' ₽' : '—';
      var zachet = z.zachet_amount ? Number(z.zachet_amount).toLocaleString('ru', {minimumFractionDigits:2}) + ' ₽' : '—';
      html += '<div onclick="showZachetDetail(' + z.id + ')" style="background:var(--bg-card);border-radius:10px;padding:16px;margin-bottom:12px;cursor:pointer;box-shadow:var(--shadow);position:relative">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
        '<span style="font-size:13px;color:var(--text-muted)">' + dateStr + '</span>' +
        '<button class="btn" style="padding:2px 8px;font-size:11px;position:absolute;top:12px;right:12px" onclick="event.stopPropagation();deleteZachet(' + z.id + ')">✕</button></div>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted);font-size:13px">ИП → ПАО</span><span style="font-weight:600">' + ipOwes + '</span></div>' +
        '<div style="display:flex;justify-content:space-between"><span style="color:var(--text-muted);font-size:13px">ПАО → ИП</span><span style="font-weight:600">' + paoOwes + '</span></div>' +
        '<div style="border-top:1px solid var(--border);padding-top:8px;display:flex;justify-content:space-between"><span style="color:var(--accent);font-weight:700;font-size:13px">Сумма зачёта</span><span style="font-weight:700;color:var(--accent);font-size:16px">' + zachet + '</span></div>' +
        '</div></div>';
    });
    el.innerHTML = html;
  } catch (e) {
    document.getElementById('zachetyContent').innerHTML = '<div style="color:var(--red);padding:20px">Ошибка загрузки: ' + (e.message || e) + '</div>';
  }
}

function addZachet(editData) {
  var isEdit = !!editData;
  var content = document.getElementById('zachetyContent');
  var lines = editData ? editData.lines || [] : [];

  function getLines(section, direction) {
    var ll = lines.filter(function(l) { return l.section === section && l.direction === direction; });
    return ll.length ? ll : [{ contract_name: '', amount: '' }];
  }

  var bIp = getLines('before', 'ip_owes_pao');
  var bPao = getLines('before', 'pao_owes_ip');
  var aIp = getLines('after', 'ip_owes_pao');
  var aPao = getLines('after', 'pao_owes_ip');

  function renderLineRows(containerId, items) {
    return items.map(function(item, i) {
      return '<div class="z-line-row" style="display:flex;gap:8px;align-items:center;margin-bottom:6px">' +
        '<input class="z-contract" placeholder="Договор-основание" value="' + (item.contract_name || '').replace(/"/g, '&quot;') + '" style="flex:2" onfocus="suggestContracts(this)">' +
        '<input class="z-amount" type="text" inputmode="decimal" placeholder="Сумма" value="' + formatAmountDisplay(item.amount) + '" style="flex:1" oninput="recalcTotals()">' +
        (i === 0 ? '<button class="btn" style="padding:4px 10px;font-size:16px;flex-shrink:0" onclick="addLineRow(this.parentElement.parentElement)" title="Добавить строку">+</button>' : '<button class="btn" style="padding:4px 10px;font-size:16px;flex-shrink:0;color:var(--red)" onclick="this.parentElement.remove();recalcTotals()" title="Удалить строку">✕</button>') +
        '</div>';
    }).join('');
  }

  var sectionStyle = 'background:var(--bg);border-radius:10px;padding:16px;margin-bottom:16px';
  var labelStyle = 'font-weight:600;margin-bottom:8px;font-size:13px;color:var(--text-muted)';
  var dirStyle = 'margin-bottom:12px';

  content.innerHTML = '<div style="max-width:700px;background:var(--bg-card);border-radius:12px;padding:24px;box-shadow:var(--shadow)">' +
    '<h3 style="margin-bottom:16px">' + (isEdit ? 'Редактирование зачёта' : 'Новый зачёт') + '</h3>' +
    '<div style="margin-bottom:16px">' +
    '<div class="form-group" style="max-width:200px"><label>Дата</label><input id="zDate" type="date" value="' + (editData && editData.date ? editData.date.substring(0, 10) : '') + '"></div></div>' +

    // Section 1: До зачёта
    '<div style="' + sectionStyle + '">' +
    '<div style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--accent)">📋 До зачёта</div>' +
    '<div style="' + dirStyle + '">' +
    '<div style="' + labelStyle + '">Инд.парк должен ПАО</div>' +
    '<div id="before_ip_owes_pao">' + renderLineRows('before_ip_owes_pao', bIp) + '</div>' +
    '<div style="text-align:right;font-size:13px;color:var(--text-muted)">Итого: <b id="total_before_ip">0</b> ₽</div></div>' +
    '<div style="' + dirStyle + '">' +
    '<div style="' + labelStyle + '">ПАО должно Инд.Парку</div>' +
    '<div id="before_pao_owes_ip">' + renderLineRows('before_pao_owes_ip', bPao) + '</div>' +
    '<div style="text-align:right;font-size:13px;color:var(--text-muted)">Итого: <b id="total_before_pao">0</b> ₽</div></div>' +
    '</div>' +

    // Section 2: Зачёт
    '<div style="' + sectionStyle + ';border:2px solid var(--accent)">' +
    '<div style="font-size:15px;font-weight:700;margin-bottom:12px;color:var(--accent)">⚖️ Сумма зачёта</div>' +
    '<div class="form-group"><input id="zZachetAmount" type="text" inputmode="decimal" placeholder="Сумма зачёта" value="' + formatAmountDisplay(editData ? editData.zachet_amount : '') + '" style="font-size:20px;font-weight:700;text-align:center" oninput="recalcTotals()"></div>' +
    '</div>' +

    // Section 3: После зачёта
    '<div style="' + sectionStyle + '">' +
    '<div style="font-size:15px;font-weight:700;margin-bottom:12px;color:#10b981">📋 После зачёта</div>' +
    '<div style="' + dirStyle + '">' +
    '<div style="' + labelStyle + '">Инд.парк должен ПАО</div>' +
    '<div id="after_ip_owes_pao">' + renderLineRows('after_ip_owes_pao', aIp) + '</div>' +
    '<div style="text-align:right;font-size:13px;color:var(--text-muted)">Итого: <b id="total_after_ip">0</b> ₽</div></div>' +
    '<div style="' + dirStyle + '">' +
    '<div style="' + labelStyle + '">ПАО должно Инд.Парку</div>' +
    '<div id="after_pao_owes_ip">' + renderLineRows('after_pao_owes_ip', aPao) + '</div>' +
    '<div style="text-align:right;font-size:13px;color:var(--text-muted)">Итого: <b id="total_after_pao">0</b> ₽</div></div>' +
    '</div>' +

    '<div style="' + sectionStyle + ';border:2px solid var(--text-muted);text-align:center;padding:12px">' +
    '<div style="font-size:13px;font-weight:600;margin-bottom:4px;color:var(--text-muted)">🔍 Проверка: (до зачёта) − (после зачёта) = сумма зачёта (по каждой стороне)</div>' +
    '<div id="zCheckResult" style="font-size:15px"></div></div>' +
    '<div class="form-group"><label>Комментарий</label><textarea id="zComment" rows="2" placeholder="Примечания">' + (editData ? (editData.comment || '') : '') + '</textarea></div>' +
    '<div id="zMsg" style="color:var(--red);font-size:13px;margin-bottom:8px"></div>' +
    '<div style="display:flex;gap:8px">' +
    '<button class="btn btn-primary" onclick="saveZachet(' + (isEdit ? editData.id : 'null') + ')">Сохранить</button>' +
    '<button class="btn" onclick="loadZachety()">Отмена</button></div></div>';

  // Add input listeners for recalc
  document.querySelectorAll('.z-amount').forEach(function(el) { el.addEventListener('input', recalcTotals); });
  initAmountFormatting();
  recalcTotals();
}

function addLineRow(container) {
  var row = document.createElement('div');
  row.className = 'z-line-row';
  row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:6px';
  row.innerHTML = '<input class="z-contract" placeholder="Договор-основание" style="flex:2" onfocus="suggestContracts(this)">' +
    '<input class="z-amount" type="text" inputmode="decimal" placeholder="Сумма" style="flex:1" oninput="recalcTotals()">' +
    '<button class="btn" style="padding:4px 10px;font-size:16px;flex-shrink:0;color:var(--red)" onclick="this.parentElement.remove();recalcTotals()" title="Удалить строку">✕</button>';
  container.appendChild(row);
  initAmountFormatting();
  row.querySelector('.z-contract').focus();
}

function recalcTotals() {
  var totals = {};
  ['before_ip_owes_pao', 'before_pao_owes_ip', 'after_ip_owes_pao', 'after_pao_owes_ip'].forEach(function(id) {
    var container = document.getElementById(id);
    if (!container) return;
    var total = 0;
    container.querySelectorAll('.z-amount').forEach(function(el) { total += parseAmount(el.value); });
    totals[id] = total;
    var labelMap = { before_ip_owes_pao: 'total_before_ip', before_pao_owes_ip: 'total_before_pao', after_ip_owes_pao: 'total_after_ip', after_pao_owes_ip: 'total_after_pao' };
    var el = document.getElementById(labelMap[id]);
    if (el) el.textContent = total.toLocaleString('ru');
  });

  // Проверка: обе стороны должны уменьшиться ровно на сумму зачёта
  var zachetAmount = parseAmount((document.getElementById('zZachetAmount') || {}).value);
  var diffIp = (totals.before_ip_owes_pao || 0) - (totals.after_ip_owes_pao || 0);
  var diffPao = (totals.before_pao_owes_ip || 0) - (totals.after_pao_owes_ip || 0);
  var errIp = diffIp - zachetAmount;
  var errPao = diffPao - zachetAmount;

  var checkEl = document.getElementById('zCheckResult');
  if (checkEl) {
    if (!zachetAmount && !(totals.before_ip_owes_pao || 0) && !(totals.before_pao_owes_ip || 0)) {
      checkEl.innerHTML = '<span style="color:var(--text-muted)">Заполните данные для проверки</span>';
    } else if (Math.abs(errIp) < 0.01 && Math.abs(errPao) < 0.01) {
      checkEl.innerHTML = '<span style="color:var(--green);font-weight:700">✅ Сходится — обе стороны уменьшились на сумму зачёта</span>';
    } else {
      var msgs = [];
      if (Math.abs(errIp) >= 0.01) msgs.push('ИП→ПАО: разница ' + errIp.toLocaleString('ru', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' ₽');
      if (Math.abs(errPao) >= 0.01) msgs.push('ПАО→ИП: разница ' + errPao.toLocaleString('ru', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' ₽');
      checkEl.innerHTML = '<span style="color:var(--red);font-weight:700">❌ Не сходится (' + msgs.join('; ') + ')</span>';
    }
  }
}

var _contractSuggestTimeout;
function suggestContracts(input) {
  if (input._suggestBound) return;
  input._suggestBound = true;
  input.addEventListener('input', function() {
    clearTimeout(_contractSuggestTimeout);
    var val = input.value.trim();
    if (val.length < 1) { removeSuggestDropdown(input); return; }
    _contractSuggestTimeout = setTimeout(async function() {
      try {
        // Search across all contract-like entities
        var data = await api('/entities?search=' + encodeURIComponent(val) + '&limit=15');
        showSuggestDropdown(input, data, val);
      } catch (e) { console.error(e); }
    }, 250);
  });
}

function showSuggestDropdown(input, items, query) {
  removeSuggestDropdown(input);
  var dd = document.createElement('div');
  dd.className = 'z-suggest-dd';
  dd.style.cssText = 'position:absolute;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:100;max-height:220px;overflow-y:auto;width:' + Math.max(input.offsetWidth, 350) + 'px';

  if (items && items.length > 0) {
    items.forEach(function(e) {
      var num = (e.properties && e.properties.number) || '';
      var typeName = e.type_name_ru || '';
      var label = (num || e.name) + (typeName ? ' (' + typeName + ')' : '');
      var opt = document.createElement('div');
      opt.style.cssText = 'padding:10px 14px;cursor:pointer;font-size:13px;border-bottom:1px solid var(--bg);transition:background .1s';
      opt.innerHTML = '<div style="font-weight:600">' + escapeHtml(num || e.name) + '</div>' +
        (typeName ? '<div style="font-size:11px;color:var(--text-muted)">' + escapeHtml(typeName) + (e.properties && e.properties.contractor_name ? ' — ' + escapeHtml(e.properties.contractor_name) : '') + '</div>' : '');
      opt.onmouseenter = function() { opt.style.background = 'var(--bg-hover)'; };
      opt.onmouseleave = function() { opt.style.background = ''; };
      opt.onmousedown = function(ev) {
        ev.preventDefault();
        input.value = num || e.name;
        input.dataset.entityId = e.id;
        removeSuggestDropdown(input);
      };
      dd.appendChild(opt);
    });
  }

  // "Add new" button at bottom
  var addBtn = document.createElement('div');
  addBtn.style.cssText = 'padding:10px 14px;cursor:pointer;font-size:13px;color:var(--accent);font-weight:600;border-top:2px solid var(--bg);display:flex;align-items:center;gap:6px';
  addBtn.innerHTML = '<span style="font-size:16px">+</span> Добавить новый договор';
  addBtn.onmouseenter = function() { addBtn.style.background = 'var(--bg-hover)'; };
  addBtn.onmouseleave = function() { addBtn.style.background = ''; };
  addBtn.onmousedown = function(ev) {
    ev.preventDefault();
    removeSuggestDropdown(input);
    showNewContractForm(input);
  };
  dd.appendChild(addBtn);

  input.parentElement.style.position = 'relative';
  input.parentElement.appendChild(dd);
  dd.style.top = (input.offsetTop + input.offsetHeight + 2) + 'px';
  dd.style.left = input.offsetLeft + 'px';
  setTimeout(function() { document.addEventListener('click', function handler(e) { if (!dd.contains(e.target) && e.target !== input) { removeSuggestDropdown(input); document.removeEventListener('click', handler); } }); }, 100);
}

function removeSuggestDropdown(input) {
  var dd = input.parentElement.querySelector('.z-suggest-dd');
  if (dd) dd.remove();
}

function collectLines() {
  var lines = [];
  ['before_ip_owes_pao', 'before_pao_owes_ip', 'after_ip_owes_pao', 'after_pao_owes_ip'].forEach(function(id) {
    var parts = id.split('_');
    var section = parts[0]; // before or after
    var direction = parts.slice(1).join('_'); // ip_owes_pao or pao_owes_ip
    var container = document.getElementById(id);
    if (!container) return;
    var rows = container.querySelectorAll('.z-line-row');
    rows.forEach(function(row, i) {
      var contract = row.querySelector('.z-contract').value.trim();
      var amount = parseAmount(row.querySelector('.z-amount').value) || null;
      if (contract || amount) {
        lines.push({ section: section, direction: direction, contract_name: contract, amount: amount, sort_order: i });
      }
    });
  });
  return lines;
}

async function saveZachet(editId) {
  var body = {
    number: (document.getElementById('zNum') || {}).value || '',
    date: document.getElementById('zDate').value || null,
    zachet_amount: parseAmount(document.getElementById('zZachetAmount').value) || null,
    status: (document.getElementById('zStatus') || {}).value || 'черновик',
    comment: (document.getElementById('zComment') || {}).value || '',
    lines: collectLines()
  };
  try {
    var r;
    if (editId) {
      r = await api('/legal/zachety/' + editId, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      r = await api('/legal/zachety', { method: 'POST', body: JSON.stringify(body) });
    }
    if (r.error) { document.getElementById('zMsg').textContent = r.error; return; }
    loadZachety();
  } catch (e) { document.getElementById('zMsg').textContent = 'Ошибка: ' + (e.message || e); }
}

async function showZachetDetail(id) {
  try {
    var z = await api('/legal/zachety/' + id);
    addZachet(z);
  } catch (e) { console.error(e); }
}

async function deleteZachet(id) {
  if (!confirm('Удалить зачёт?')) return;
  try {
    await api('/legal/zachety/' + id, { method: 'DELETE' });
    loadZachety();
  } catch (e) { alert('Ошибка: ' + (e.message || e)); }
}
`;
