/* eslint-disable */
module.exports = `
// === MODALS ===

// ============ MODALS ============

var _modalSize = 'normal';

// Show modal with spinner immediately (before async data loads)
function showLoadingModal() {
  var el = document.getElementById('modal');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:60px 40px"><div class="spinner-ring"></div><p style="margin-top:16px;color:var(--text-muted);font-size:14px">Загрузка...</p></div>';
  el.classList.remove('modal--wide', 'modal--full');
  document.getElementById('modalOverlay').classList.add('show');
}

function setModalContent(html) {
  var sizes = ['normal', 'wide', 'full'];
  var labels = {'normal': '▭', 'wide': '⊟', 'full': '⛶'};
  var titles = {'normal': 'Стандарт', 'wide': 'Широкий', 'full': 'На всю страницу'};
  var resizeBar = '<div class="modal-resize-bar">';
  sizes.forEach(function(s) {
    var active = (_modalSize === s) ? ' is-active' : '';
    resizeBar += '<button class="modal-resize-btn' + active + '" data-modal-size="' + s + '" title="' + titles[s] + '">' + labels[s] + '</button>';
  });
  resizeBar += '<button class="modal-resize-btn" onclick="closeModal()" title="Закрыть" style="margin-left:auto;font-size:18px;line-height:1">&times;</button>';
  resizeBar += '</div>';
  var el = document.getElementById('modal');
  el.innerHTML = resizeBar + html;
  el.classList.toggle('modal--wide', _modalSize === 'wide');
  el.classList.toggle('modal--full', _modalSize === 'full');
  document.getElementById('modalOverlay').classList.add('show');
  el.querySelectorAll('[data-modal-size]').forEach(function(btn) {
    btn.addEventListener('click', function() { setModalSize(btn.getAttribute('data-modal-size')); });
  });
  renderIcons();
}

function setModalSize(size) {
  _modalSize = size;
  var modal = document.getElementById('modal');
  modal.classList.toggle('modal--wide', size === 'wide');
  modal.classList.toggle('modal--full', size === 'full');
  document.querySelectorAll('[data-modal-size]').forEach(function(btn) {
    btn.classList.toggle('is-active', btn.getAttribute('data-modal-size') === size);
  });
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
  _actEquipmentList = null;
  _submitting = false;
}
`;
