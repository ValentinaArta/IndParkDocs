/* eslint-disable */
module.exports = `
// === CONTACTS — moved from entity-form.js ===

var _contactsCounter = 0;
function _renderContactsList(id, contacts) {
  _contactsCounter = contacts.length;
  var h = '<div id="' + id + '_wrap">';
  contacts.forEach(function(c, i) { h += _renderContactBlock(id, i, c); });
  h += '</div>';
  h += '<button type="button" class="btn btn-sm" style="margin-top:4px;font-size:11px" onclick="_addContact(\\''+id+'\\')">+ Добавить контакт</button>';
  h += '<input type="hidden" id="' + id + '">';
  return h;
}

function _renderContactBlock(fieldId, index, c) {
  c = c || {};
  var h = '<div class="contact-block" data-field="' + fieldId + '" data-idx="' + index + '" style="border-left:3px solid var(--accent);padding:8px 10px;margin-bottom:8px;background:var(--bg);border-radius:4px;position:relative">';
  if (index > 0) h += '<button type="button" onclick="_removeContact(\\''+fieldId+'\\','+index+')" style="position:absolute;top:4px;right:6px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:13px">✕</button>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';
  h += '<div><label style="font-size:11px;color:var(--text-secondary)">ФИО</label><input class="ct-name" data-idx="'+index+'" value="'+escapeHtml(c.name||'')+'" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px"></div>';
  h += '<div><label style="font-size:11px;color:var(--text-secondary)">Должность</label><input class="ct-position" data-idx="'+index+'" value="'+escapeHtml(c.position||'')+'" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px"></div>';
  h += '<div><label style="font-size:11px;color:var(--text-secondary)">Телефон</label><input class="ct-phone" data-idx="'+index+'" value="'+escapeHtml(c.phone||'')+'" placeholder="+7..." style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px"></div>';
  h += '<div><label style="font-size:11px;color:var(--text-secondary)">Email</label><input class="ct-email" data-idx="'+index+'" value="'+escapeHtml(c.email||'')+'" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:4px;font-size:13px"></div>';
  h += '</div></div>';
  return h;
}

function _addContact(fieldId) {
  var wrap = document.getElementById(fieldId + '_wrap');
  if (!wrap) return;
  var div = document.createElement('div');
  div.innerHTML = _renderContactBlock(fieldId, _contactsCounter, {});
  wrap.appendChild(div.firstElementChild);
  _contactsCounter++;
}

function _removeContact(fieldId, index) {
  var block = document.querySelector('.contact-block[data-field="'+fieldId+'"][data-idx="'+index+'"]');
  if (block) block.remove();
}

function _collectContacts(fieldId) {
  var blocks = document.querySelectorAll('.contact-block[data-field="'+fieldId+'"]');
  var arr = [];
  blocks.forEach(function(b) {
    var name = (b.querySelector('.ct-name') || {}).value || '';
    var position = (b.querySelector('.ct-position') || {}).value || '';
    var phone = (b.querySelector('.ct-phone') || {}).value || '';
    var email = (b.querySelector('.ct-email') || {}).value || '';
    if (name || phone || email) arr.push({name:name, position:position, phone:phone, email:email});
  });
  return arr;
}

`;
