module.exports = `
var _ownCompanies = [];
var _allCompanies = [];
var _brokenEqIds = new Set(); // equipment IDs marked broken/emergency in their latest act
var _buildings = [];
var _rooms = [];
var _equipment = [];
var _landPlots = [];
var _landPlotParts = [];

async function loadEntityLists() {
  _ownCompanies = await loadEntitiesByType('company', 'is_own=true');
  _allCompanies = await loadEntitiesByType('company');
  _buildings = await loadEntitiesByType('building');
  _rooms = await loadEntitiesByType('room');
  _equipment = await loadEntitiesByType('equipment');
  _landPlots = await loadEntitiesByType('land_plot');
  _landPlotParts = await loadEntitiesByType('land_plot_part');
  await loadContractTypeFields(); // load contract type fields from DB
  loadBrokenEquipment(); // background load, no await
}

// Helper: land plot label = "кадастровый_номер — название" (или просто название)
function _lpLabel(lp) {
  var cn = ((lp.properties || {}).cadastral_number || '').trim();
  return cn ? cn + ' — ' + lp.name : lp.name;
}

async function loadBrokenEquipment() {
  try {
    var ids = await api('/reports/broken-equipment');
    _brokenEqIds = new Set(ids.map(function(id) { return parseInt(id); }));
  } catch(e) { /* non-fatal */ }
}


`;
