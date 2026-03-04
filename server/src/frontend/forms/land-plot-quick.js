/* eslint-disable */
module.exports = `
// === LAND PLOT QUICK CREATE — moved from entity-form.js ===


function quickCreateLandPlot() {
  var panel = document.getElementById('lp_quick_panel');
  if (panel) { panel.style.display = panel.style.display === 'none' ? '' : 'none'; return; }
  // Insert inline form after the button
  var btn = document.querySelector('[onclick*="quickCreateLandPlot"]');
  if (!btn) return;
  var wrap = btn.parentElement;
  var ownerOpts = (_ownCompanies||[]).map(function(c) {
    return '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>';
  }).join('');
  var formHtml = '<div id="lp_quick_panel" style="border:1px solid var(--border);border-radius:6px;padding:12px;margin-top:8px;background:var(--bg-hover)">';
  formHtml += '<div style="font-weight:600;margin-bottom:8px;font-size:13px">Новый земельный участок</div>';
  formHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  formHtml += '<div class="form-group" style="margin:0"><label style="font-size:12px">Название *</label><input id="qlp_name" placeholder="ЗУ кад.номер"></div>';
  formHtml += '<div class="form-group" style="margin:0"><label style="font-size:12px">Кадастровый номер</label><input id="qlp_cadastral"></div>';
  formHtml += '<div class="form-group" style="margin:0"><label style="font-size:12px">Площадь, кв.м.</label><input id="qlp_area" type="number"></div>';
  formHtml += '<div class="form-group" style="margin:0"><label style="font-size:12px">Собственник</label><select id="qlp_owner"><option value="">—</option>' + ownerOpts + '</select></div>';
  formHtml += '</div>';
  formHtml += '<div class="form-group" style="margin:8px 0 0"><label style="font-size:12px">Адрес</label><input id="qlp_address" placeholder="адрес"></div>';
  formHtml += '<div style="margin-top:8px;display:flex;gap:6px"><button type="button" class="btn btn-primary btn-sm" onclick="submitQuickLandPlot()">Создать ЗУ</button>';
  formHtml += '<button type="button" class="btn btn-sm" data-action="hide-lp-panel">Отмена</button></div>';
  formHtml += '</div>';
  wrap.insertAdjacentHTML('afterend', formHtml);
  var hideBtn = document.querySelector('[data-action="hide-lp-panel"]');
  if (hideBtn) hideBtn.addEventListener('click', function() { document.getElementById('lp_quick_panel').style.display = 'none'; });
}

async function submitQuickLandPlot() {
  var nameEl = document.getElementById('qlp_name');
  var name = nameEl ? nameEl.value.trim() : '';
  if (!name) return alert('Введите название');
  var lpType = entityTypes.find(function(t) { return t.name === 'land_plot'; });
  if (!lpType) { alert('Тип ЗУ не найден'); return; }
  var props = {};
  var cn = document.getElementById('qlp_cadastral'); if (cn && cn.value.trim()) props.cadastral_number = cn.value.trim();
  var ar = document.getElementById('qlp_area'); if (ar && ar.value) props.area = ar.value;
  var ad = document.getElementById('qlp_address'); if (ad && ad.value.trim()) props.address = ad.value.trim();
  var ow = document.getElementById('qlp_owner');
  if (ow && ow.value) {
    var owEnt = (_ownCompanies||[]).find(function(c){ return c.id === parseInt(ow.value); });
    if (owEnt) { props.balance_owner_id = owEnt.id; props.balance_owner_name = owEnt.name; }
  }
  try {
    var created = await api('/entities', { method: 'POST', body: JSON.stringify({
      entity_type_id: lpType.id, name: name, properties: props
    }) });
    _landPlots = await loadEntitiesByType('land_plot');
    var sel = document.getElementById('f_land_plot_id');
    if (sel) {
      sel.innerHTML = '<option value="">— не указано —</option>' + _landPlots.map(function(lp) {
        var s = lp.id === created.id ? ' selected' : '';
        return '<option value="' + lp.id + '"' + s + '>' + escapeHtml(_lpLabel(lp)) + '</option>';
      }).join('');
    }
    var panel = document.getElementById('lp_quick_panel');
    if (panel) panel.style.display = 'none';
  } catch(err) {
    if (err.status === 409) alert('Земельный участок с таким именем уже существует');
    else alert('Ошибка: ' + (err.message || String(err)));
  }
}

`;
