module.exports = `// ============ RELATIONS ============

async function openRelationModal(entityId) {
  const allEntities = await api('/entities');

  let html = '<h3>Добавить связь</h3>';
  html += '<div class="form-group"><label>Тип связи</label><select id="r_type">';
  relationTypes.forEach(rt => {
    html += '<option value="' + rt.name + '">' + rt.name_ru + '</option>';
  });
  html += '</select></div>';

  html += '<div class="form-group"><label>Связать с</label><select id="r_target">';
  allEntities.filter(e => e.id !== entityId).forEach(e => {
    html += '<option value="' + e.id + '">' + escapeHtml(e.name) + ' (' + e.type_name_ru + ')</option>';
  });
  html += '</select></div>';

  html += '<div class="modal-actions"><button class="btn" onclick="closeModal()">Отмена</button>' +
    '<button class="btn btn-primary" onclick="submitRelation(' + entityId + ')">Создать</button></div>';

  setModalContent(html);
}

async function submitRelation(entityId) {
  const relation_type = document.getElementById('r_type').value;
  const to_entity_id = document.getElementById('r_target').value;
  await api('/relations', { method: 'POST', body: JSON.stringify({ from_entity_id: entityId, to_entity_id: parseInt(to_entity_id), relation_type }) });
  closeModal();
  showEntity(entityId);
}

async function deleteRelation(relId, entityId) {
  await api('/relations/' + relId, { method: 'DELETE' });
  showEntity(entityId);
}
`;
