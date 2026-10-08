const configuredBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export const API_BASE = configuredBase;

export async function apiFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, { ...init, credentials: 'include', headers: { 'content-type': 'application/json', ...init.headers } });
  const cannotRefresh = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'].includes(path);
  if (response.status === 401 && retry && !cannotRefresh) {
    const refreshed = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (refreshed.ok) return apiFetch(path, init, false);
  }
  return response;
}

export async function readApiError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: string };
    return body.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}
