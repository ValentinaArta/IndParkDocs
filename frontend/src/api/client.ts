const API_BASE = '/api';

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken || refresh);
    return true;
  } catch {
    return false;
  }
}

export async function api<T = unknown>(
  url: string,
  options: ApiOptions = {},
): Promise<T> {
  const { skipAuth, ...fetchOpts } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOpts.headers as Record<string, string> || {}),
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res = await fetch(`${API_BASE}${url}`, { ...fetchOpts, headers });

  // Auto-refresh on 401
  if (res.status === 401 && !skipAuth) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getToken();
      if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${url}`, { ...fetchOpts, headers });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }

  return res.json();
}

// Convenience methods
export const apiGet = <T>(url: string) => api<T>(url);
export const apiPost = <T>(url: string, body: unknown) =>
  api<T>(url, { method: 'POST', body: JSON.stringify(body) });
export const apiPut = <T>(url: string, body: unknown) =>
  api<T>(url, { method: 'PUT', body: JSON.stringify(body) });
export const apiDelete = <T>(url: string) =>
  api<T>(url, { method: 'DELETE' });
export const apiPatch = <T>(url: string, body: unknown) =>
  api<T>(url, { method: 'PATCH', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
