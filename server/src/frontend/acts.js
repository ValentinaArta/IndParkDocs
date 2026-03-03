module.exports = `// ============ ACTS ============

async function openEditActModal(actId, actEntity) {
  try {
    await loadEntityLists();
    var e = actEntity || await api('/entities/' + actId);
    var props = e.properties || {};
    var parentContractId = e.parent_id || parseInt(props.parent_contract_id) || null;

    // Загружаем список оборудования для этого договора
    _actEquipmentList = null;
    if (parentContractId) {
      try {
        var parentEntity = await api('/entities/' + parentContractId);
        var contractEqItems = [];
        try { contractEqItems = JSON.parse((parentEntity.properties || {}).equipment_list || '[]'); } catch(ex) {}
        var contractEqIds = contractEqItems.map(function(i) { return parseInt(i.equipment_id); }).filter(Boolean);
        _actEquipmentList = contractEqIds.length > 0
          ? _equipment.filter(function(eq) { return contractEqIds.indexOf(eq.id) !== -1; })
          : null;
      } catch(ex) {}
    }

    // Разбираем сохранённые позиции
    var savedItems = [];
    try { savedItems = JSON.parse(props.act_items || '[]'); } catch(ex) {}

    var parentName = props.parent_contract_name || (parentContractId ? 'Договор #' + parentContractId : '—');
    var html = '<h3>Редактировать акт</h3>';
    html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;padding:8px;background:var(--bg-hover);border-radius:6px">Договор-основание: <strong>' + escapeHtml(parentName) + '</strong></div>';
    html += '<div class="form-group"><label>Номер акта *</label><input id="f_act_number" value="' + escapeHtml(props.act_number || '') + '"></div>';
    html += '<div class="form-group"><label>Дата акта</label><input type="date" id="f_act_date" value="' + escapeHtml(props.act_date || '') + '"></div>';
    html += '<div class="form-group"><label>Комментарий</label><textarea id="f_comment" style="width:100%;resize:both;min-height:48px;box-sizing:border-box">' + escapeHtml(props.comment || '') + '</textarea></div>';
    html += '<div class="form-group"><label>Заключение</label><textarea id="f_conclusion" style="width:100%;resize:both;min-height:72px;box-sizing:border-box">' + escapeHtml(props.conclusion || '') + '</textarea></div>';
    html += '<div class="form-group"><label>Итого по акту, ₽</label><input type="number" id="f_total_amount" value="' + escapeHtml(String(props.total_amount || 0)) + '" readonly style="background:var(--bg-hover);color:var(--text-muted)"></div>';
    html += '<div class="form-group"><label>Оборудование и работы</label>' + renderActItemsField(savedItems) + '</div>';
    html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>';
    html += '<button class="btn btn-primary" onclick="if(!_submitting){_submitting=true;_doSubmitEditAct(' + actId + ',' + (parentContractId||'null') + ').finally(function(){_submitting=false;})}">Сохранить</button></div>';
    setModalContent(html);
    // Пересчитать итого из уже заполненных позиций
    recalcActTotal();
  } catch(err) {
    setModalContent('<div style="color:#dc2626;padding:20px">Ошибка открытия акта: ' + escapeHtml(String(err.message || err)) + '</div>');
  }
}

async function _doSubmitEditAct(actId, parentContractId) {
  try {
    var actNumber = (document.getElementById('f_act_number') || {}).value || '';
    if (!actNumber.trim()) { alert('Введите номер акта'); _submitting = false; return; }
    var actItems = getActItemsValue();
    var actDate = (document.getElementById('f_act_date') || {}).value || '';
    var comment = (document.getElementById('f_comment') || {}).value || '';
    var conclusion = (document.getElementById('f_conclusion') || {}).value || '';
    var total = actItems.reduce(function(s, i) { return s + (i.amount || 0); }, 0);

    var parentName = '';
    if (parentContractId) {
      try { var pe = await api('/entities/' + parentContractId); parentName = pe.name; } catch(ex) {}
    }

    var properties = {
      act_number: actNumber.trim(),
      act_date: actDate,
      comment: comment,
      conclusion: conclusion,
      parent_contract_id: String(parentContractId || ''),
      parent_contract_name: parentName,
      act_items: JSON.stringify(actItems),
      total_amount: String(total),
    };

    var actName = 'Акт №' + actNumber.trim() + (actDate ? ' от ' + actDate : '') + (parentName ? ' — ' + parentName : '');
    await api('/entities/' + actId, { method: 'PUT', body: JSON.stringify({ name: actName, properties }) });
    closeModal();
    clearEntityCache();
    showEntity(actId);
  } catch(err) {
    alert('Ошибка сохранения: ' + (err.message || String(err)));
  }
}

async function openCreateActModal(parentContractId) {
  try {
  clearEntityCache();
  entityTypes = await api('/entity-types');  // принудительно обновить типы
  await loadEntityLists();
  const parentEntity = await api('/entities/' + parentContractId);
  const parentProps = parentEntity.properties || {};
  const actType = entityTypes.find(function(t) { return t.name === 'act'; });
  if (!actType) return alert('Тип "Акт" не найден. Возможно, сервер ещё не перезапустился после добавления миграции.');

  // Filter equipment to only those linked to this contract via equipment_list
  var contractEqItems = [];
  try { contractEqItems = JSON.parse(parentProps.equipment_list || '[]'); } catch(ex) {}
  var contractEqIds = contractEqItems.map(function(i) { return parseInt(i.equipment_id); }).filter(Boolean);
  _actEquipmentList = contractEqIds.length > 0
    ? _equipment.filter(function(e) { return contractEqIds.indexOf(e.id) !== -1; })
    : null;  // null = show all if contract has no equipment_list

  var eqNote = contractEqIds.length > 0
    ? '<span style="color:var(--accent)">' + (_actEquipmentList ? _actEquipmentList.length : 0) + ' ед. из договора</span>'
    : '<span style="color:var(--text-muted)">весь реестр (по договору нет оборудования)</span>';

  var html = '<h3>Новый акт</h3>';
  html += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;padding:8px;background:var(--bg-hover);border-radius:6px">Договор-основание: <strong>' + escapeHtml(parentEntity.name) + '</strong><br>Оборудование: ' + eqNote + '</div>';
  html += '<div class="form-group"><label>Номер акта *</label><input id="f_act_number" placeholder="№ акта"></div>';
  html += '<div class="form-group"><label>Дата акта</label><input type="date" id="f_act_date"></div>';
  html += '<div class="form-group"><label>Комментарий</label><textarea id="f_comment" placeholder="примечание к акту" style="width:100%;resize:both;min-height:48px;box-sizing:border-box"></textarea></div>';
  html += '<div class="form-group"><label>Заключение</label><textarea id="f_conclusion" placeholder="итоговое заключение по акту..." style="width:100%;resize:both;min-height:72px;box-sizing:border-box"></textarea></div>';
  html += '<div class="form-group"><label>Итого по акту, ₽</label><input type="number" id="f_total_amount" value="0" readonly style="background:var(--bg-hover);color:var(--text-muted)"></div>';
  html += '<div class="form-group"><label>Оборудование и работы *</label>' + renderActItemsField([]) + '</div>';

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>';
  html += '<button class="btn btn-primary" onclick="if(!_submitting){_submitting=true;_doSubmitCreateAct(' + parentContractId + ').finally(function(){_submitting=false;})}">Создать акт</button></div>';

  setModalContent(html);
  } catch(err) { alert('Ошибка открытия формы акта: ' + (err && err.message ? err.message : String(err))); }
}

async function _doSubmitCreateAct(parentContractId) {
  try {
    var actNumber = (document.getElementById('f_act_number') || {}).value || '';
    if (!actNumber.trim()) { alert('Введите номер акта'); return; }
    var actItems = getActItemsValue();
    if (actItems.length === 0) { alert('Добавьте хотя бы одну единицу оборудования. Убедитесь что в строке выбрано оборудование из списка.'); return; }

    var actDate = (document.getElementById('f_act_date') || {}).value || '';
    var comment = (document.getElementById('f_comment') || {}).value || '';
    var conclusion = (document.getElementById('f_conclusion') || {}).value || '';
    var total = actItems.reduce(function(s, i) { return s + (i.amount || 0); }, 0);
    var parentEntity = await api('/entities/' + parentContractId);

    var properties = {
      act_number: actNumber.trim(),
      act_date: actDate,
      comment: comment,
      conclusion: conclusion,
      parent_contract_id: String(parentContractId),
      parent_contract_name: parentEntity.name,
      act_items: JSON.stringify(actItems),
      total_amount: String(total),
    };

    // Refresh entityTypes if act type missing
    if (!entityTypes.find(function(t) { return t.name === 'act'; })) {
      entityTypes = await api('/entity-types');
    }
    var actType = entityTypes.find(function(t) { return t.name === 'act'; });
    if (!actType) { alert('Тип "Акт" не найден в entity-types. Попробуйте обновить страницу.'); return; }

    var actName = 'Акт №' + actNumber.trim() + (actDate ? ' от ' + actDate : '') + ' — ' + parentEntity.name;
    var created;
    try {
      created = await api('/entities', { method: 'POST', body: JSON.stringify({ entity_type_id: actType.id, name: actName, properties: properties, parent_id: parentContractId }) });
    } catch(postErr) {
      if (postErr.status === 409 && postErr.data && postErr.data.existing) {
        var ex = postErr.data.existing;
        if (confirm('Акт с таким номером и датой уже существует: ' + ex.name + '. Открыть существующий акт?')) {
          closeModal();
          showEntity(ex.id);
        }
        return;
      }
      throw postErr;
    }
    closeModal();
    showEntity(parentContractId);
  } catch(err) {
    alert('Ошибка сохранения акта: ' + (err && err.message ? err.message : JSON.stringify(err)));
  }
}
`;
