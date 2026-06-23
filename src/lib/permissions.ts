import { Role, type RolePermissions, type UserClaims } from '../types/auth';
import type { HarvesterRecord } from '../types/domain';

export const VISIBLE_TABS: Record<string, string[]> = {
  [Role.FIELD_COORDINATOR]: ['harvest', 'backlog'],
  [Role.PROCESSING_ADMIN]: ['harvest', 'process', 'distribute', 'backlog', 'ai'],
  [Role.DISTRIBUTION_MANAGER]: ['harvest', 'process', 'distribute', 'backlog', 'ai'],
  [Role.SUPER_ADMIN]: ['harvest', 'process', 'distribute', 'diagnostics', 'schemas', 'backlog', 'ai'],
};

const FULL_ACCESS: RolePermissions = {
  visibleTabs: ['harvest', 'process', 'distribute', 'diagnostics', 'schemas', 'backlog', 'ai'],
  sourcingFields: {
    harvester_id: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    harvester_name: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    region: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    raw_weight_kg: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    quality_grade: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    payout_amount_usd: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    is_synced: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
  },
  processingFields: {
    batch_id: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    raw_weight_kg: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    total_175ml_sachets_produced: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    yield_ratio: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    is_anomalous: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    waste_percentage: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
  },
  distributionFields: {
    consignment_id: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    vendor_name: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    sachets_dispatched: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    sachets_returned_spoiled: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    sachets_sold: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    netVendorMarginUsd: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    grossCollectedUsd: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    spoilageDebit: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
  },
};

const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  [Role.FIELD_COORDINATOR]: {
    visibleTabs: ['harvest', 'backlog'],
    sourcingFields: {
      harvester_id: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      harvester_name: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      region: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      raw_weight_kg: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      quality_grade: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      payout_amount_usd: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      is_synced: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
    },
    processingFields: {},
    distributionFields: {},
  },
  [Role.PROCESSING_ADMIN]: {
    visibleTabs: ['harvest', 'process', 'distribute', 'backlog', 'ai'],
    sourcingFields: {
      harvester_id: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      harvester_name: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      region: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      raw_weight_kg: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      quality_grade: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      payout_amount_usd: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      is_synced: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    },
    processingFields: {
      batch_id: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      raw_weight_kg: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      total_175ml_sachets_produced: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      yield_ratio: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      is_anomalous: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      waste_percentage: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    },
    distributionFields: {
      consignment_id: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      vendor_name: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      sachets_dispatched: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      sachets_returned_spoiled: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      sachets_sold: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      netVendorMarginUsd: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      grossCollectedUsd: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      spoilageDebit: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
    },
  },
  [Role.DISTRIBUTION_MANAGER]: {
    visibleTabs: ['harvest', 'process', 'distribute', 'backlog', 'ai'],
    sourcingFields: {},
    processingFields: {
      batch_id: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      raw_weight_kg: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      total_175ml_sachets_produced: { canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      yield_ratio: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      is_anomalous: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      waste_percentage: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
    },
    distributionFields: {
      consignment_id: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      vendor_name: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      sachets_dispatched: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      sachets_returned_spoiled: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      sachets_sold: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      netVendorMarginUsd: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      grossCollectedUsd: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
      spoilageDebit: { canCreate: true, canRead: true, canUpdate: true, canDelete: false },
    },
  },
  [Role.SUPER_ADMIN]: FULL_ACCESS,
};

export function getRolePermissions(role: Role): RolePermissions {
  return ROLE_PERMISSIONS[role];
}

export function getVisibleTabs(role: Role): string[] {
  return VISIBLE_TABS[role] ?? [];
}

export function canSeeField(role: Role, panel: 'sourcing' | 'processing' | 'distribution', field: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  const panelFields = panel === 'sourcing' ? perms.sourcingFields
    : panel === 'processing' ? perms.processingFields
    : perms.distributionFields;
  return panelFields[field]?.canRead ?? false;
}

export function canEditField(role: Role, panel: 'sourcing' | 'processing' | 'distribution', field: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  const panelFields = panel === 'sourcing' ? perms.sourcingFields
    : panel === 'processing' ? perms.processingFields
    : perms.distributionFields;
  return panelFields[field]?.canCreate ?? false;
}

export function filterHarvestsByRegion(harvests: HarvesterRecord[], user: UserClaims | null): HarvesterRecord[] {
  if (!user || user.role === Role.SUPER_ADMIN) return harvests;
  if (user.role === Role.FIELD_COORDINATOR && user.region) {
    return harvests.filter(h => h.region === user.region);
  }
  return harvests;
}

export function isOwnRegion(record: HarvesterRecord, user: UserClaims | null): boolean {
  if (!user || user.role === Role.SUPER_ADMIN) return true;
  if (user.role === Role.FIELD_COORDINATOR && user.region) {
    return record.region === user.region;
  }
  return true;
}
