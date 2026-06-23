import { useContext, useMemo } from 'react';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import { Role } from '../types/auth';
import { canSeeField, canEditField, isOwnRegion } from '../lib/permissions';

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function usePermission(panel: 'sourcing' | 'processing' | 'distribution') {
  const { user } = useAuth();

  return useMemo(() => ({
    canSee: (field: string) => {
      if (!user) return false;
      if (user.role === Role.SUPER_ADMIN) return true;
      return canSeeField(user.role, panel, field);
    },
    canEdit: (field: string) => {
      if (!user) return false;
      if (user.role === Role.SUPER_ADMIN) return true;
      return canEditField(user.role, panel, field);
    },
    isOwnRegion: (recordRegion: string) => {
      return isOwnRegion({ region: recordRegion } as any, user);
    },
    role: user?.role ?? null,
    isSuperAdmin: user?.role === Role.SUPER_ADMIN,
  }), [user, panel]);
}
