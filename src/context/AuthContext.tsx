import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { Role, type UserClaims } from '../types/auth';
import { VISIBLE_TABS } from '../lib/permissions';
import { apiFetch, readApiError } from '../lib/api';

export interface AuthContextValue {
  user: UserClaims | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (staffId: string, pin: string) => Promise<void>;
  loginDemo: (role: Role, region?: string, hubId?: string) => void;
  logout: () => Promise<void>;
  hasTabAccess: (tabId: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  loading: true,
  login: async () => {},
  loginDemo: () => {},
  logout: async () => {},
  hasTabAccess: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiFetch('/api/auth/me').then(async response => {
      if (!active) return;
      if (response.ok) setUser((await response.json() as { user: UserClaims }).user);
    }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (staffId: string, pin: string) => {
    const response = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ staffId: staffId.trim().toUpperCase(), pin }) }, false);
    if (!response.ok) throw Error(await readApiError(response));
    setUser((await response.json() as { user: UserClaims }).user);
  }, []);

  const loginDemo = useCallback((role: Role, region?: string, hubId?: string) => {
    if (!import.meta.env.DEV) return;
    setUser({ id: 'local-demo', organizationId: 'akudha', staffId: 'LOCAL-DEMO', role, region, hubId, name: role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) });
  }, []);

  const logout = useCallback(async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }, false).catch(() => undefined);
    setUser(null);
  }, []);

  const hasTabAccess = useCallback((tabId: string): boolean => {
    if (!user) return false;
    const tabs = VISIBLE_TABS[user.role];
    return tabs?.includes(tabId) ?? false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, loading, login, loginDemo, logout, hasTabAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const AUTH_STORAGE_KEY = 'akudha_auth_user';
