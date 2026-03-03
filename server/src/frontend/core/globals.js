/* eslint-disable */
module.exports = `
// === ENTITY TYPE ICONS — defined ONCE here ===

var ENTITY_TYPE_ICONS = {
  building: 'building-2', workshop: 'warehouse', room: 'door-open',
  land_plot: 'map-pin', land_plot_part: 'map-pin', company: 'landmark',
  contract: 'file-text', supplement: 'paperclip', equipment: 'cog',
  order: 'scroll', document: 'file', crane_track: 'move-horizontal', act: 'file-check'
};

function entityIcon(typeName, size) { return icon(ENTITY_TYPE_ICONS[typeName] || 'file', size); }
`;
