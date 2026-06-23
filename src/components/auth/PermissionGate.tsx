import type { ReactNode } from 'react';
import { usePermission } from '../../hooks/useAuth';

interface PermissionGateProps {
  panel: 'sourcing' | 'processing' | 'distribution';
  field: string;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ panel, field, fallback, children }: PermissionGateProps) {
  const { canSee } = usePermission(panel);

  if (canSee(field)) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  return null;
}

interface RegionMaskProps {
  recordRegion: string;
  children: ReactNode;
}

export function RegionMask({ recordRegion, children }: RegionMaskProps) {
  const { isOwnRegion, role } = usePermission('sourcing');

  if (isOwnRegion(recordRegion) || role === null) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      <div className="pointer-events-none opacity-30 blur-[1px] select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="bg-charcoal-900/80 text-white text-[10px] px-2 py-1 rounded font-semibold whitespace-nowrap shadow-lg">
          Other region — contact super admin
        </span>
      </div>
    </div>
  );
}
