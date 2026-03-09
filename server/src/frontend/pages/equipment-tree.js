/* eslint-disable */
module.exports = `
// === EQUIPMENT TREE PAGE ===

var _eqCurrentView = 'building';
var _eqTreeData    = null;
var _eqExpanded    = {};   // key → true/false

var _EQ_VIEWS = [
  { key: 'building',   label: 'По корпусу'      },
  { key: 'category',   label: 'По типу'          },
  { key: 'balance',    label: 'По балансу'       },
  { key: 'hierarchy',  label: 'Иерархия'         },
];

var _EQ_STATUS_COLORS = {
  'В работе':        'var(--success)',
  'На ремонте':      'var(--warning)',
  'Законсервировано':'var(--text-muted)',
  'Списано':         'var(--danger)',
};

async function showEquipmentTree(view) {
  currentView = 'equipment-tree';
  _setNavHash('equipment-tree');
  setActive('[onclick*="showEquipmentTree"]');
  document.getElementById('pageTitle').textContent = 'Оборудование';
  document.getElementById('breadcrumb').textContent = '';
  if (view) { _eqCurrentView = view; _eqExpanded = {}; }
  document.getElementById('content').innerHTML =
    '<div style="padding:40px;text-align:center"><div class="spinner-ring" style="margin:0 auto"></div></div>';
  try {
    _eqTreeData = await api('/equipment/tree?view=' + _eqCurrentView);
    _renderEqTreePage();
  } catch(err) {
    document.getElementById('content').innerHTML =
      '<div style="color:var(--danger);padding:20px">Ошибка загрузки: ' + escapeHtml(String(err.message || err)) + '</div>';
  }
}

function _renderEqTreePage() {
  var tree = (_eqTreeData && _eqTreeData.tree) || [];
  var total = _countEqLeaves(tree);

  var h = '<div style="padding:16px 20px">';

  // View switcher
  h += '<div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap;align-items:center">';
  _EQ_VIEWS.forEach(function(v) {
    var isActive = _eqCurrentView === v.key;
    var style = isActive
      ? 'background:var(--accent);color:#fff;border-color:var(--accent)'
      : 'background:var(--bg-secondary);color:var(--text-primary)';
    h += '<button class="btn btn-sm" style="' + style + '" data-view="' + v.key + '" onclick="showEquipmentTree(this.dataset.view)">' + v.label + '</button>';
  });
  h += '<span style="margin-left:8px;font-size:12px;color:var(--text-muted)">Всего: ' + total + ' ед.</span>';

  // Expand/collapse all
  h += '<button class="btn btn-sm" style="margin-left:auto" onclick="_eqExpandAll()">Развернуть все</button>';
  h += '<button class="btn btn-sm" onclick="_eqCollapseAll()">Свернуть все</button>';
  h += '</div>';

  // Tree
  h += '<style>.eq-eq-row:hover{background:var(--bg-hover)}</style>';
  h += '<div id="eq-tree-root">';
  h += _renderEqNodes(tree, 0);
  h += '</div>';
  h += '</div>';

  document.getElementById('content').innerHTML = h;
}

function _countEqLeaves(nodes) {
  var count = 0;
  nodes.forEach(function(n) {
    if (n.type === 'equipment') count++;
    if (n.children && n.children.length) count += _countEqLeaves(n.children);
  });
  return count;
}

function _renderEqNodes(nodes, depth) {
  var h = '';
  nodes.forEach(function(node) {
    h += _renderEqNode(node, depth);
  });
  return h;
}

function _renderEqNode(node, depth) {
  var indent = depth * 20;
  var key = String(node.id) + '_' + depth;
  var hasChildren = node.children && node.children.length > 0;
  var isExpanded = !!_eqExpanded[key];

  if (node.type === 'group') {
    return _renderEqGroupNode(node, depth, key, indent, hasChildren, isExpanded);
  } else {
    return _renderEqEquipNode(node, depth, key, indent, hasChildren, isExpanded);
  }
}

function _renderEqGroupNode(node, depth, key, indent, hasChildren, isExpanded) {
  var chevron = hasChildren
    ? (isExpanded
        ? '<i data-lucide="chevron-down" class="lucide" style="width:14px;height:14px;flex-shrink:0"></i>'
        : '<i data-lucide="chevron-right" class="lucide" style="width:14px;height:14px;flex-shrink:0"></i>')
    : '<span style="width:14px;display:inline-block"></span>';

  var childCount = node.children ? _countEqLeaves(node.children) : 0;
  var bg = depth === 0 ? 'var(--bg-secondary)' : 'var(--bg-hover)';
  var fw = depth === 0 ? '600' : '500';

  var h = '<div style="margin-bottom:2px">';
  h += '<div class="eq-node-row" data-key="' + escapeHtml(key) + '"'
     + (hasChildren ? ' onclick="_eqToggle(this.dataset.key)" style="cursor:pointer"' : '')
     + ' style="display:flex;align-items:center;gap:6px;padding:7px 10px;padding-left:' + (10 + indent) + 'px'
     + ';background:' + bg + ';border-radius:6px;font-weight:' + fw + ';font-size:13px;margin-bottom:2px'
     + (hasChildren ? ';cursor:pointer' : '') + '">';
  h += chevron;
  h += '<span>' + escapeHtml(node.name) + '</span>';
  if (childCount > 0) {
    h += '<span style="font-size:11px;color:var(--text-muted);font-weight:400;margin-left:4px">(' + childCount + ')</span>';
  }
  h += '</div>';

  if (hasChildren && isExpanded) {
    h += '<div id="eq-children-' + escapeHtml(key) + '">';
    h += _renderEqNodes(node.children, depth + 1);
    h += '</div>';
  } else if (hasChildren) {
    h += '<div id="eq-children-' + escapeHtml(key) + '" style="display:none">';
    h += _renderEqNodes(node.children, depth + 1);
    h += '</div>';
  }

  h += '</div>';
  return h;
}

function _renderEqEquipNode(node, depth, key, indent, hasChildren, isExpanded) {
  var statusColor = _EQ_STATUS_COLORS[node.status] || 'var(--text-muted)';
  var chevron = hasChildren
    ? (isExpanded
        ? '<i data-lucide="chevron-down" class="lucide" style="width:13px;height:13px;flex-shrink:0"></i>'
        : '<i data-lucide="chevron-right" class="lucide" style="width:13px;height:13px;flex-shrink:0"></i>')
    : '<span style="width:13px;display:inline-block"></span>';

  var h = '<div style="margin-bottom:1px">';
  h += '<div class="eq-node-row eq-eq-row" style="display:flex;align-items:center;gap:6px;padding:6px 10px'
     + ';padding-left:' + (10 + indent) + 'px;border-radius:5px;font-size:13px'
     + ';transition:background .1s">';

  // Chevron (if has part_of children)
  if (hasChildren) {
    h += '<span data-key="' + escapeHtml(key) + '" onclick="_eqToggle(this.dataset.key)" style="cursor:pointer;display:flex;align-items:center">' + chevron + '</span>';
  } else {
    h += chevron;
  }

  // Status dot
  h += '<span style="width:8px;height:8px;border-radius:50%;background:' + statusColor
     + ';flex-shrink:0;display:inline-block"></span>';

  // Name (clickable)
  h += '<a href="#" data-eid="' + node.id + '" onclick="showEntity(parseInt(this.dataset.eid));return false"'
     + ' style="color:var(--accent);text-decoration:none;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'
     + escapeHtml(node.name) + '</a>';

  // Meta pills
  if (node.inv_number) {
    h += '<span style="font-size:11px;color:var(--text-muted);white-space:nowrap;flex-shrink:0">инв. ' + escapeHtml(node.inv_number) + '</span>';
  }
  if (node.category) {
    h += '<span style="font-size:11px;padding:1px 6px;background:var(--bg-secondary);border-radius:10px;color:var(--text-secondary);white-space:nowrap;flex-shrink:0">'
       + escapeHtml(node.category) + '</span>';
  }
  if (node.status) {
    h += '<span style="font-size:11px;color:' + statusColor + ';white-space:nowrap;flex-shrink:0">' + escapeHtml(node.status) + '</span>';
  }

  h += '</div>';

  if (hasChildren && isExpanded) {
    h += '<div id="eq-children-' + escapeHtml(key) + '">';
    h += _renderEqNodes(node.children, depth + 1);
    h += '</div>';
  } else if (hasChildren) {
    h += '<div id="eq-children-' + escapeHtml(key) + '" style="display:none">';
    h += _renderEqNodes(node.children, depth + 1);
    h += '</div>';
  }

  h += '</div>';
  return h;
}

function _eqToggle(key) {
  _eqExpanded[key] = !_eqExpanded[key];
  // Toggle the chevron icon and children visibility without full re-render
  var childDiv = document.getElementById('eq-children-' + key);
  var row = document.querySelector('[data-key="' + key + '"]');
  if (childDiv) childDiv.style.display = _eqExpanded[key] ? '' : 'none';
  if (row) {
    var icon = row.querySelector('i[data-lucide]');
    if (!icon) {
      // chevron might be in a child span
      var span = row.querySelector('span[data-key="' + key + '"] i[data-lucide]');
      icon = span;
    }
    if (icon) {
      icon.setAttribute('data-lucide', _eqExpanded[key] ? 'chevron-down' : 'chevron-right');
      if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [icon] });
    }
  }
}

function _eqExpandAll() {
  var tree = (_eqTreeData && _eqTreeData.tree) || [];
  function setExpanded(nodes, depth) {
    nodes.forEach(function(n) {
      if (n.children && n.children.length) {
        var key = String(n.id) + '_' + depth;
        _eqExpanded[key] = true;
        setExpanded(n.children, depth + 1);
      }
    });
  }
  setExpanded(tree, 0);
  _renderEqTreePage();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function _eqCollapseAll() {
  _eqExpanded = {};
  _renderEqTreePage();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
`;
