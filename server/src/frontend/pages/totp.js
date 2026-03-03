/* eslint-disable */
module.exports = `
// === TOTP SETUP ===

async function showTotpSetup() {
  try {
    var status = await api('/auth/totp/status');
    var content = document.getElementById('content');
    if (status.enabled) {
      content.innerHTML = '<div style="padding:32px;max-width:480px;margin:0 auto">' +
        '<h2 style="margin-bottom:16px">🔐 Двухфакторная аутентификация</h2>' +
        '<div style="background:var(--green);color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:16px">✅ 2FA включена</div>' +
        '<p style="margin-bottom:16px;color:var(--text-muted)">Для отключения введите текущий код из приложения-аутентификатора:</p>' +
        '<div class="form-group"><input id="totpDisableCode" placeholder="123456" maxlength="6" inputmode="numeric" pattern="[0-9]*" style="font-size:24px;text-align:center;letter-spacing:8px"></div>' +
        '<div id="totpMsg" style="color:var(--red);font-size:13px;margin-bottom:8px"></div>' +
        '<button class="btn" style="background:var(--red);color:#fff" onclick="disableTotp()">Отключить 2FA</button>' +
        '</div>';
    } else {
      var setup = await api('/auth/totp/setup');
      content.innerHTML = '<div style="padding:32px;max-width:480px;margin:0 auto">' +
        '<h2 style="margin-bottom:16px">🔐 Настройка 2FA</h2>' +
        '<p style="margin-bottom:16px">Отсканируйте QR-код в приложении <b>Google Authenticator</b>, <b>Authy</b> или <b>1Password</b>:</p>' +
        '<div style="text-align:center;margin-bottom:16px"><img src="' + setup.qrDataUrl + '" style="width:200px;height:200px;border-radius:12px"></div>' +
        '<p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;word-break:break-all">Или введите вручную: <code>' + setup.secret + '</code></p>' +
        '<p style="margin-bottom:8px">Введите 6-значный код из приложения для подтверждения:</p>' +
        '<div class="form-group"><input id="totpVerifyCode" placeholder="123456" maxlength="6" inputmode="numeric" pattern="[0-9]*" style="font-size:24px;text-align:center;letter-spacing:8px" onkeydown="if(event.key===\\'Enter\\')verifyTotp()"></div>' +
        '<div id="totpMsg" style="color:var(--red);font-size:13px;margin-bottom:8px"></div>' +
        '<button class="btn btn-primary" onclick="verifyTotp()">Включить 2FA</button>' +
        '</div>';
    }
  } catch (e) {
    console.error('TOTP setup error:', e);
  }
}

async function verifyTotp() {
  var code = document.getElementById('totpVerifyCode').value.trim();
  var msg = document.getElementById('totpMsg');
  if (!code || code.length !== 6) { msg.textContent = 'Введите 6-значный код'; return; }
  try {
    var r = await api('/auth/totp/verify', { method: 'POST', body: JSON.stringify({ code: code }) });
    if (r.success) {
      msg.style.color = 'var(--green)';
      msg.textContent = '✅ 2FA успешно включена!';
      setTimeout(function() { showTotpSetup(); }, 1500);
    } else {
      msg.textContent = r.error || 'Ошибка';
    }
  } catch (e) { msg.textContent = 'Ошибка: ' + (e.message || e); }
}

async function disableTotp() {
  var code = document.getElementById('totpDisableCode').value.trim();
  var msg = document.getElementById('totpMsg');
  if (!code || code.length !== 6) { msg.textContent = 'Введите 6-значный код'; return; }
  try {
    var r = await api('/auth/totp/disable', { method: 'POST', body: JSON.stringify({ code: code }) });
    if (r.success) {
      msg.style.color = 'var(--green)';
      msg.textContent = '2FA отключена';
      setTimeout(function() { showTotpSetup(); }, 1500);
    } else {
      msg.textContent = r.error || 'Ошибка';
    }
  } catch (e) { msg.textContent = 'Ошибка: ' + (e.message || e); }
}
`;
