import { createContext, useState, useCallback, type ReactNode } from 'react';
import { Role, type UserClaims } from '../types/auth';

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

const VISIBLE_TABS: Record<Role, string[]> = {
  [Role.FIELD_COORDINATOR]: ['harvest', 'backlog'],
  [Role.PROCESSING_ADMIN]: ['harvest', 'process', 'distribute', 'backlog', 'ai'],
  [Role.DISTRIBUTION_MANAGER]: ['harvest', 'process', 'distribute', 'backlog', 'ai'],
  [Role.SUPER_ADMIN]: ['harvest', 'process', 'distribute', 'diagnostics', 'schemas', 'backlog', 'ai'],
};

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
    return tabs.includes(tabId);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: user !== null, login, logout, hasTabAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export const AUTH_STORAGE_KEY = 'akudha_auth_user';
