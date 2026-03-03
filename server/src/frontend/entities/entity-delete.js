module.exports = `
async function deleteEntity(id) {
  if (!confirm('Удалить эту запись?')) return;
  await api('/entities/' + id, { method: 'DELETE' });
  if (currentTypeFilter) showEntityList(currentTypeFilter);
  else showDashboard();
}

`;
