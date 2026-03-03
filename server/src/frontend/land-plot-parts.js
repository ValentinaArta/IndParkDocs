module.exports = `// ============ LAND PLOT PART ============

async function openCreateLandPlotPartModal(parentLandPlotId) {
  clearEntityCache();
  await loadEntityLists();
  const lpPartType = entityTypes.find(function(t) { return t.name === 'land_plot_part'; });
  if (!lpPartType) return alert('Тип "Часть ЗУ" не найден. Перезапустите страницу.');
  const fields = await api('/entity-types/' + lpPartType.id + '/fields');

  // Find parent land plot name
  const parentLP = _landPlots.find(function(lp) { return lp.id === parentLandPlotId; });
  var parentName = parentLP ? parentLP.name : ('ЗУ #' + parentLandPlotId);

  var html = '<h3>Новая часть ЗУ</h3>';
  html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Земельный участок: ' + escapeHtml(parentName) + '</div>';
  html += '<input type="hidden" id="f_parent" value="' + parentLandPlotId + '">';
  html += '<div class="form-group"><label>Название (кадастровый номер или описание)</label><input id="f_name" required placeholder="Напр. 50:01:001:0001/1"></div>';
  fields.forEach(function(f) {
    html += '<div class="form-group"><label>' + (f.name_ru || f.name) + '</label><input id="f_' + f.name + '" type="' + (f.field_type === 'number' ? 'number' : 'text') + '" placeholder="' + (f.name_ru || '') + '"></div>';
  });
  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitCreateLandPlotPart(' + parentLandPlotId + ')">Создать</button></div>';
  setModalContent(html);
}

async function submitCreateLandPlotPart(parentLandPlotId) {
  if (_submitting) return;
  _submitting = true;
  try {
    const lpPartType = entityTypes.find(function(t) { return t.name === 'land_plot_part'; });
    if (!lpPartType) return;
    const fields = await api('/entity-types/' + lpPartType.id + '/fields');
    const name = document.getElementById('f_name').value.trim();
    if (!name) { alert('Укажите название'); return; }
    const properties = {};
    fields.forEach(function(f) {
      var el = document.getElementById('f_' + f.name);
      if (el && el.value) properties[f.name] = el.value;
    });
    const newPart = await api('/entities', {
      method: 'POST',
      body: JSON.stringify({ entity_type_id: lpPartType.id, name, properties, parent_id: parentLandPlotId })
    });
    _landPlotParts.push(newPart);
    closeModal();
    showEntity(parentLandPlotId);
  } catch(e) { alert('Ошибка: ' + e.message); }
  finally { _submitting = false; }
}
`;
