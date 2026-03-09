/* eslint-disable */
module.exports = `
// === ENTITY TYPE ICONS — defined ONCE here ===

var ENTITY_TYPE_ICONS = {
  building: 'building-2', room: 'door-open',
  land_plot: 'map-pin', land_plot_part: 'map-pin', company: 'landmark',
  contract: 'file-text', supplement: 'paperclip', equipment: 'cog',
  order: 'scroll', document: 'file', act: 'file-check'
};

function entityIcon(typeName, size) { return icon(ENTITY_TYPE_ICONS[typeName] || 'file', size); }
// CONTRACT_TYPE_FIELDS — loaded from DB via /api/contract-type-fields
var CONTRACT_TYPE_FIELDS = {};
var _ctfLoaded = false;

async function loadContractTypeFields() {
  if (_ctfLoaded) return CONTRACT_TYPE_FIELDS;
  try {
    var data = await api('/contract-type-fields');
    if (data && typeof data === 'object') {
      CONTRACT_TYPE_FIELDS = data;
      _ctfLoaded = true;
    }
  } catch (e) {
    console.error('Failed to load contract type fields:', e);
  }
  return CONTRACT_TYPE_FIELDS;
}

`;
