/* eslint-disable */
module.exports = `
// === CORE API — fetch wrapper, defined ONCE ===
// Depends on: TOKEN, REFRESH, API, logout() from core.js (same script scope)

async function api(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  const r = await fetch(API + url, { ...opts, headers });
  if (r.status === 401 && REFRESH) {
    const ref = await fetch(API + '/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: REFRESH })
    });
    if (ref.ok) {
      const data = await ref.json();
      TOKEN = data.accessToken;
      localStorage.setItem('accessToken', TOKEN);
      headers['Authorization'] = 'Bearer ' + TOKEN;
      const r2 = await fetch(API + url, { ...opts, headers });
      return r2.json();
    } else {
      logout();
      return {};
    }
  }
  if (r.status === 401) { logout(); return {}; }
  if (!r.ok) {
    const errData = await r.json().catch(() => ({ error: 'Ошибка сервера' }));
    const err = new Error(errData.error || 'Ошибка');
    err.status = r.status;
    err.data = errData;
    if (r.status !== 409) alert(errData.error || 'Ошибка');
    throw err;
  }
  return r.json();
}
`;
