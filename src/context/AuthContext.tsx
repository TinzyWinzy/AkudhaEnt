import { createContext, useState, useCallback, type ReactNode } from 'react';
import { Role, type UserClaims } from '../types/auth';
import { VISIBLE_TABS } from '../lib/permissions';

export interface AuthContextValue {
  user: UserClaims | null;
  isLoggedIn: boolean;
  login: (role: Role, region?: string, hubId?: string) => void;
  logout: () => void;
  hasTabAccess: (tabId: string) => boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
  hasTabAccess: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserClaims | null>(null);

  const login = useCallback((role: Role, region?: string, hubId?: string) => {
    setUser({ role, region, hubId, name: role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const hasTabAccess = useCallback((tabId: string): boolean => {
    if (!user) return false;
    const tabs = VISIBLE_TABS[user.role];
    return tabs?.includes(tabId) ?? false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, login, logout, hasTabAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const AUTH_STORAGE_KEY = 'akudha_auth_user';
