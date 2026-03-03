/* eslint-disable */
module.exports = `
// === FINANCE PAGE ===

async function showFinancePage() {
  currentView = 'finance';
  setActive('[onclick*="showFinancePage"]');
  document.getElementById('pageTitle').textContent = 'Расходы';
  document.getElementById('breadcrumb').textContent = '';
  document.getElementById('topActions').innerHTML =
    '<button class="btn btn-sm" onclick="showFinancePage()"><i data-lucide="refresh-cw" class="lucide" style="width:14px;height:14px"></i> Обновить</button>';
  var content = document.getElementById('content');
  content.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)"><div class="spinner-ring" style="margin:40px auto"></div><div style="margin-top:12px">Загружаю данные из 1С...</div></div>';
  renderIcons();
  try {
    var [d, exp] = await Promise.all([
      api('/finance/summary').catch(function() { return null; }),
      api('/finance/expenses').catch(function() { return null; }),
    ]);
    if (currentView !== 'finance') return;
    _renderFinancePage(d, exp);
  } catch(e) {
    content.innerHTML = '<div style="padding:24px"><div style="color:var(--red);font-size:14px;padding:20px;background:var(--bg-secondary);border-radius:8px">⚠️ Ошибка: ' + escapeHtml(e.message || String(e)) + '</div></div>';
  }
}

function _finFmt(n) {
  if (!n) return '0';
  return Math.round(n).toLocaleString('ru-RU');
}

function _finCard(title, ipz, ekz, icon, color) {
  return '<div class="stat-card" style="padding:16px;min-width:0">' +
    '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;display:flex;align-items:center;gap:6px">' +
      '<span style="font-size:18px">' + icon + '</span>' + escapeHtml(title) +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      '<div style="text-align:center;padding:8px;background:rgba(79,107,204,0.07);border-radius:6px">' +
        '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">ИПЗ</div>' +
        '<div style="font-size:16px;font-weight:700;color:' + color + '">' + _finFmt(ipz) + '</div>' +
        '<div style="font-size:10px;color:var(--text-muted)">₽</div>' +
      '</div>' +
      '<div style="text-align:center;padding:8px;background:rgba(79,107,204,0.07);border-radius:6px">' +
        '<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">ЭКЗ</div>' +
        '<div style="font-size:16px;font-weight:700;color:' + color + '">' + _finFmt(ekz) + '</div>' +
        '<div style="font-size:10px;color:var(--text-muted)">₽</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function _renderFinancePage(d, exp) {
  var content = document.getElementById('content');
  if (!d || !d.totals) {
    content.innerHTML = '<div style="padding:24px;color:var(--red)">Нет данных</div>';
    return;
  }
  var t = d.totals;
  var period = d.period || '2026-01-01';
  var asOf = d.data_as_of ? new Date(d.data_as_of).toLocaleString('ru-RU') : '';

  var h = '<div style="padding:24px">';
  h += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Данные из 1С · С ' + period.slice(0,10) + ' · Обновлено ' + asOf + '</div>';

  // ── KPI cards ──
  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:24px">';
  h += _finCard('Входящие платежи', t.incoming.ipz, t.incoming.ekz, '💰', '#22c55e');
  h += _finCard('Расходы', t.outgoing.ipz, t.outgoing.ekz, '📤', '#ef4444');
  h += _finCard('Выручка (реализация)', t.revenue.ipz, t.revenue.ekz, '📈', '#4F6BCC');
  h += _finCard('Счета покупателям', t.invoices.ipz, t.invoices.ekz, '🧾', '#f59e0b');
  h += '</div>';

  // ── Monthly chart ──
  var months = Object.keys(d.monthly_revenue || {}).sort();
  if (months.length > 0) {
    h += '<h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Выручка по месяцам</h3>';
    h += '<div style="display:flex;gap:6px;align-items:flex-end;height:120px;margin-bottom:24px;overflow-x:auto">';
    var maxVal = Math.max.apply(null, months.map(function(m) {
      var mv = d.monthly_revenue[m] || {};
      return (mv.ipz || 0) + (mv.ekz || 0);
    })) || 1;
    months.forEach(function(m) {
      var mv = d.monthly_revenue[m] || {};
      var ipzH = Math.round(((mv.ipz || 0) / maxVal) * 90);
      var ekzH = Math.round(((mv.ekz || 0) / maxVal) * 90);
      var mn = m.slice(5); // MM
      h += '<div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:40px">';
      h += '<div style="display:flex;gap:2px;align-items:flex-end;height:90px">';
      if (ipzH > 0) h += '<div style="width:14px;height:' + ipzH + 'px;background:#4F6BCC;border-radius:2px 2px 0 0" title="ИПЗ ' + _finFmt(mv.ipz) + '₽"></div>';
      if (ekzH > 0) h += '<div style="width:14px;height:' + ekzH + 'px;background:#22c55e;border-radius:2px 2px 0 0" title="ЭКЗ ' + _finFmt(mv.ekz) + '₽"></div>';
      h += '</div>';
      h += '<div style="font-size:10px;color:var(--text-muted);margin-top:4px">' + mn + '</div>';
      h += '</div>';
    });
    h += '</div>';
    h += '<div style="display:flex;gap:16px;font-size:11px;color:var(--text-secondary);margin-bottom:24px">';
    h += '<span><span style="display:inline-block;width:10px;height:10px;background:#4F6BCC;border-radius:2px;margin-right:4px"></span>ИПЗ</span>';
    h += '<span><span style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:2px;margin-right:4px"></span>ЭКЗ</span>';
    h += '</div>';
  }

  // ── Two columns: invoices + payments ──
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;flex-wrap:wrap">';

  // Invoices
  h += '<div>';
  h += '<h3 style="font-size:14px;font-weight:600;margin-bottom:10px">🧾 Последние счета покупателям</h3>';
  h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
  h += '<tr style="background:var(--bg-secondary)"><th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--border)">Дата</th><th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--border)">№</th><th style="text-align:right;padding:6px 8px;border-bottom:2px solid var(--border)">Сумма, ₽</th><th style="padding:6px 8px;border-bottom:2px solid var(--border)">Орг</th></tr>';
  (d.recent_invoices || []).forEach(function(inv) {
    h += '<tr style="border-bottom:1px solid var(--border)">';
    h += '<td style="padding:5px 8px">' + escapeHtml(inv.date) + '</td>';
    h += '<td style="padding:5px 8px;color:var(--accent)">' + escapeHtml(inv.number) + '</td>';
    h += '<td style="padding:5px 8px;text-align:right;font-weight:500">' + _finFmt(inv.amount) + '</td>';
    h += '<td style="padding:5px 8px;text-align:center"><span style="font-size:10px;background:var(--bg-secondary);padding:2px 5px;border-radius:4px">' + escapeHtml(inv.org) + '</span></td>';
    h += '</tr>';
  });
  h += '</table></div>';

  // Payments
  h += '<div>';
  h += '<h3 style="font-size:14px;font-weight:600;margin-bottom:10px">💰 Последние входящие платежи</h3>';
  h += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
  h += '<tr style="background:var(--bg-secondary)"><th style="text-align:left;padding:6px 8px;border-bottom:2px solid var(--border)">Дата</th><th style="text-align:right;padding:6px 8px;border-bottom:2px solid var(--border)">Сумма, ₽</th><th style="padding:6px 8px;border-bottom:2px solid var(--border)">Орг</th></tr>';
  (d.recent_payments || []).forEach(function(p) {
    h += '<tr style="border-bottom:1px solid var(--border)">';
    h += '<td style="padding:5px 8px">' + escapeHtml(p.date) + '</td>';
    h += '<td style="padding:5px 8px;text-align:right;font-weight:500;color:#22c55e">' + _finFmt(p.amount) + '</td>';
    h += '<td style="padding:5px 8px;text-align:center"><span style="font-size:10px;background:var(--bg-secondary);padding:2px 5px;border-radius:4px">' + escapeHtml(p.org) + '</span></td>';
    h += '</tr>';
  });
  h += '</table></div>';

  h += '</div>';
  h += '</div>';

  // ── Аналитика расходов (факт vs план) ─────────────────────────────────────
  if (exp && exp.kpi) {
    h += _renderExpensesSection(exp);
  } else if (!exp) {
    h += '<div style="margin:16px;padding:14px;background:var(--bg-secondary);border-radius:8px;color:var(--text-muted);font-size:13px">📡 Аналитика расходов недоступна (ошибка загрузки данных)</div>';
  }

  content.innerHTML = h;
  renderIcons();
  // Восстанавливаем раскрытые строки контрагентов
  _expOpenGids.forEach(function(gid) {
    var rows = document.querySelectorAll('[data-expgroup="' + gid + '"]');
    var icon = document.getElementById('expicon_' + gid);
    if (rows.length) {
      rows.forEach(function(r) { r.style.display = 'table-row'; });
      if (icon) icon.textContent = '▼';
    }
  });
}

function _expFmt(n) {
  if (!n) return '0';
  var abs = Math.abs(Math.round(n));
  var s = abs >= 1e6 ? (abs/1e6).toFixed(1) + ' млн' : abs >= 1e3 ? (abs/1e3).toFixed(0) + ' тыс' : String(abs);
  return (n < 0 ? '−' : '') + s;
}

var _expOrg = 'ИП'; // текущая вкладка
var _expOpenGids = new Set(); // раскрытые строки контрагентов

function switchExpOrg(org) {
  _expOrg = org;
  document.querySelectorAll('.exp-org-tab').forEach(function(t) {
    t.style.background = t.dataset.org === org ? 'var(--accent)' : 'var(--bg-secondary)';
    t.style.color = t.dataset.org === org ? '#fff' : 'var(--text-muted)';
  });
  var ipz = document.getElementById('expSection_ИП');
  var ekz = document.getElementById('expSection_ЭК');
  if (ipz) ipz.style.display = org === 'ИП' ? 'block' : 'none';
  if (ekz) ekz.style.display = org === 'ЭК' ? 'block' : 'none';
}

function _renderExpensesSection(exp) {
  var MONTHS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
  var h = '';
  h += '<div style="margin:0 16px 16px">';
  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">';
  h += '<div style="font-size:14px;font-weight:700;color:var(--text)">📊 Аналитика расходов (факт 1С vs план бюджет)</div>';
  if (exp.cached) h += '<span style="font-size:10px;color:var(--text-muted);background:var(--bg-secondary);padding:2px 7px;border-radius:8px">кеш 5 мин</span>';
  h += '</div>';

  // Вкладки орг (используем _expOrg для начального состояния)
  h += '<div style="display:flex;gap:8px;margin-bottom:16px">';
  ['ИП', 'ЭК'].forEach(function(org) {
    var isActive = (org === _expOrg);
    var label = org === 'ИП' ? 'АО ИПЗ' : 'ЭКЗ';
    h += '<button class="exp-org-tab" data-org="' + org + '" onclick="switchExpOrg(this.dataset.org)" style="padding:6px 18px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;background:' + (isActive ? 'var(--accent)' : 'var(--bg-secondary)') + ';color:' + (isActive ? '#fff' : 'var(--text-muted)') + '">' + label + '</button>';
  });
  h += '</div>';

  ['ИП', 'ЭК'].forEach(function(cfo) {
    var k = exp.kpi[cfo] || {};
    var contractors = (exp.contractors || {})[cfo] || [];
    var months = exp.months || [];
    var orgLabel = cfo === 'ИП' ? 'АО «Индустриальный Парк Звезда»' : 'Экспериментальный комплекс';
    var dev = k.fact_ytd - k.plan_ytd;
    var devCls = dev <= 0 ? '#22c55e' : '#ef4444'; // расходы: меньше плана = хорошо
    var devSign = dev >= 0 ? '+' : '−';

    h += '<div id="expSection_' + cfo + '" style="display:' + (cfo === _expOrg ? 'block' : 'none') + '">';
    h += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">' + escapeHtml(orgLabel) + ' · 2026 г.</div>';

    // KPI cards
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">';
    h += '<div class="stat-card" style="padding:14px"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Факт YTD</div><div style="font-size:20px;font-weight:700;color:#60a5fa">' + _expFmt(k.fact_ytd) + '</div><div style="font-size:10px;color:var(--text-muted);margin-top:3px">фактические расходы</div></div>';
    h += '<div class="stat-card" style="padding:14px"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">План YTD</div><div style="font-size:20px;font-weight:700;color:#4ade80">' + _expFmt(k.plan_ytd) + '</div><div style="font-size:10px;color:var(--text-muted);margin-top:3px">бюджет на этот период</div></div>';
    h += '<div class="stat-card" style="padding:14px"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Отклонение</div><div style="font-size:20px;font-weight:700;color:' + devCls + '">' + devSign + _expFmt(Math.abs(dev)) + '</div><div style="font-size:10px;color:var(--text-muted);margin-top:3px">' + (dev <= 0 ? '▼ экономия' : '▲ перерасход') + '</div></div>';
    h += '<div class="stat-card" style="padding:14px"><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Прогноз год</div><div style="font-size:20px;font-weight:700;color:#c084fc">' + _expFmt(k.forecast) + '</div><div style="font-size:10px;color:var(--text-muted);margin-top:3px">план: ' + _expFmt(k.plan_year) + '</div></div>';
    h += '</div>';

    // Помесячный график (CSS bars)
    var maxBar = 0;
    months.forEach(function(m) {
      maxBar = Math.max(maxBar, m.fact[cfo] || 0, m.plan[cfo] || 0);
    });
    if (maxBar > 0) {
      h += '<div style="background:var(--bg-secondary);border-radius:8px;padding:14px;margin-bottom:16px">';
      h += '<div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--text)">Помесячная динамика расходов</div>';
      h += '<div style="display:flex;align-items:flex-end;gap:4px;height:100px">';
      months.forEach(function(m) {
        var fh = Math.round((m.fact[cfo] || 0) / maxBar * 90);
        var ph = Math.round((m.plan[cfo] || 0) / maxBar * 90);
        h += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px">';
        h += '<div style="width:100%;display:flex;align-items:flex-end;gap:1px;height:90px">';
        // Факт
        h += '<div style="flex:1;background:' + (m.isPast ? '#3b82f6' : '#1e3a5f') + ';height:' + fh + 'px;border-radius:2px 2px 0 0;min-height:2px" title="Факт: ' + _expFmt(m.fact[cfo]) + '"></div>';
        // План
        h += '<div style="flex:1;background:' + (m.isPast ? '#16a34a55' : '#16a34a') + ';height:' + ph + 'px;border-radius:2px 2px 0 0;min-height:2px;border:1px dashed #16a34a" title="План: ' + _expFmt(m.plan[cfo]) + '"></div>';
        h += '</div>';
        h += '<div style="font-size:9px;color:var(--text-muted);margin-top:3px">' + escapeHtml(m.name) + '</div>';
        h += '</div>';
      });
      h += '</div>';
      h += '<div style="display:flex;gap:16px;margin-top:6px;font-size:10px;color:var(--text-muted)">';
      h += '<span><span style="display:inline-block;width:10px;height:10px;background:#3b82f6;border-radius:2px;margin-right:4px"></span>Факт (1С)</span>';
      h += '<span><span style="display:inline-block;width:10px;height:10px;background:transparent;border:1px dashed #16a34a;border-radius:2px;margin-right:4px"></span>План (бюджет)</span>';
      h += '</div>';
      h += '</div>';
    }

    // Таблица по контрагентам (раскрываемая до договоров)
    if (contractors.length > 0) {
      var pastMonths = months.filter(function(m) { return m.isPast; });
      h += '<div style="background:var(--bg-secondary);border-radius:8px;padding:14px;margin-bottom:16px">';
      h += '<div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--text)">Расходы по контрагентам (топ-20) — факт с начала 2026 <span style="font-weight:400;color:var(--text-muted);font-size:11px">— нажмите строку для раскрытия договоров</span></div>';
      h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">';
      h += '<thead><tr style="border-bottom:2px solid var(--border)">';
      h += '<th style="width:22px;padding:6px 4px"></th>';
      h += '<th style="text-align:left;padding:6px 10px;color:var(--text-muted);font-weight:500">Контрагент</th>';
      pastMonths.forEach(function(m) {
        h += '<th style="text-align:right;padding:6px 6px;color:var(--text-muted);font-weight:500;font-size:10px">' + escapeHtml(m.name) + '</th>';
      });
      h += '<th style="text-align:right;padding:6px 10px;color:var(--text-muted);font-weight:500">Итого</th>';
      h += '</tr></thead><tbody>';

      var grandTotal = contractors.reduce(function(s, c) { return s + c.total; }, 0);
      var cfoKey = cfo === 'ИП' ? 'IP' : (cfo === 'ЭК' ? 'EK' : cfo.replace(/[^a-zA-Z0-9]/g, ''));
      contractors.forEach(function(c, idx) {
        var gid = 'exp_' + cfoKey + '_' + idx;
        var hasBreakdown = c.contractBreakdown && c.contractBreakdown.length > 1;
        var rowBg = idx % 2 === 0 ? '' : 'background:rgba(255,255,255,0.02)';
        h += '<tr data-gid="' + gid + '" style="border-bottom:1px solid var(--border);' + rowBg + ';cursor:' + (hasBreakdown ? 'pointer' : 'default') + '" onclick="toggleExpense(this.dataset.gid)">';
        h += '<td style="padding:6px 4px;color:var(--text-muted);font-size:10px;text-align:center"><span id="expicon_' + gid + '">' + (hasBreakdown ? '▶' : '') + '</span></td>';
        h += '<td style="padding:6px 10px;font-weight:500;color:var(--text)">' + escapeHtml(c.name) + '</td>';
        months.forEach(function(m, i) {
          if (!m.isPast) return;
          var v = c.monthly[i] || 0;
          h += '<td style="text-align:right;padding:6px 6px;color:' + (v > 0 ? '#e2e8f0' : '#374151') + '">' + (v > 0 ? _expFmt(v) : '—') + '</td>';
        });
        var pct = grandTotal > 0 ? Math.round(c.total / grandTotal * 100) : 0;
        h += '<td style="text-align:right;padding:6px 10px;font-weight:700;color:#60a5fa">' + _expFmt(c.total) + ' <span style="font-size:10px;color:var(--text-muted)">(' + pct + '%)</span></td>';
        h += '</tr>';
        // Строки по договорам (скрыты)
        if (hasBreakdown) {
          c.contractBreakdown.forEach(function(br) {
            var cname = br.contract_num === '—' ? 'без договора' : br.contract_num;
            h += '<tr data-expgroup="' + gid + '" style="display:none;background:rgba(0,0,0,0.2)">';
            h += '<td></td>';
            h += '<td style="padding:4px 10px 4px 28px;color:var(--accent);font-size:11px">📄 ' + escapeHtml(cname) + '</td>';
            months.forEach(function(m, i) {
              if (!m.isPast) return;
              var v = br.monthly[i] || 0;
              h += '<td style="text-align:right;padding:4px 6px;font-size:11px;color:' + (v > 0 ? '#94a3b8' : '#374151') + '">' + (v > 0 ? _expFmt(v) : '—') + '</td>';
            });
            var bpct = c.total > 0 ? Math.round(br.total / c.total * 100) : 0;
            h += '<td style="text-align:right;padding:4px 10px;font-size:11px;color:#93c5fd">' + _expFmt(br.total) + ' <span style="color:#475569">(' + bpct + '%)</span></td>';
            h += '</tr>';
          });
        }
      });

      h += '</tbody></table></div>';
      h += '</div>';
    }

    h += '</div>'; // expSection
  });

  h += '</div>'; // outer
  return h;
}

function toggleExpense(gid) {
  var rows = document.querySelectorAll('[data-expgroup="' + gid + '"]');
  var icon = document.getElementById('expicon_' + gid);
  if (!rows.length) return;
  var isOpen = rows[0].style.display !== 'none';
  rows.forEach(function(r) { r.style.display = isOpen ? 'none' : 'table-row'; });
  if (icon) icon.textContent = isOpen ? '▶' : '▼';
  if (isOpen) { _expOpenGids.delete(gid); } else { _expOpenGids.add(gid); }
}
`;
