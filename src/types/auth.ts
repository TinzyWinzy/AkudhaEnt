export enum Role {
  FIELD_COORDINATOR = 'field_coordinator',
  PROCESSING_ADMIN = 'processing_admin',
  DISTRIBUTION_MANAGER = 'distribution_manager',
  SUPER_ADMIN = 'super_admin',
}

export interface UserClaims {
  role: Role;
  region?: string;
  hubId?: string;
  name: string;
}

export interface Permission {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export type FieldPermission = Record<string, Permission>;

export interface RolePermissions {
  visibleTabs: string[];
  sourcingFields: FieldPermission;
  processingFields: FieldPermission;
  distributionFields: FieldPermission;
  scope?: {
    region?: string;
    hubId?: string;
  };
}
