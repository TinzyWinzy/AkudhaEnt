import { describe, it, expect } from 'vitest';
import { Role } from '../../src/types/auth';
import { getRolePermissions, canSeeField, canEditField } from '../../src/lib/permissions';

describe('Role Permissions', () => {
  describe('Tab visibility', () => {
    it('field_coordinator sees only Sourcing and Backlog', () => {
      const perms = getRolePermissions(Role.FIELD_COORDINATOR);
      expect(perms.visibleTabs).toEqual(['harvest', 'backlog']);
    });

    it('processing_admin sees Sourcing (read-only), Processing, Logistics, Backlog, AI', () => {
      const perms = getRolePermissions(Role.PROCESSING_ADMIN);
      expect(perms.visibleTabs).toEqual(['harvest', 'process', 'distribute', 'backlog', 'ai']);
    });

    it('distribution_manager sees Sourcing, Processing, Logistics, Backlog, AI', () => {
      const perms = getRolePermissions(Role.DISTRIBUTION_MANAGER);
      expect(perms.visibleTabs).toEqual(['harvest', 'process', 'distribute', 'backlog', 'ai']);
    });

    it('super_admin sees all tabs', () => {
      const perms = getRolePermissions(Role.SUPER_ADMIN);
      expect(perms.visibleTabs).toEqual(['harvest', 'process', 'distribute', 'diagnostics', 'schemas', 'backlog', 'ai']);
    });
  });

  describe('Sourcing field access', () => {
    it('field_coordinator can see weight and grade but not payout', () => {
      expect(canSeeField(Role.FIELD_COORDINATOR, 'sourcing', 'raw_weight_kg')).toBe(true);
      expect(canSeeField(Role.FIELD_COORDINATOR, 'sourcing', 'quality_grade')).toBe(true);
      expect(canSeeField(Role.FIELD_COORDINATOR, 'sourcing', 'payout_amount_usd')).toBe(false);
    });

    it('processing_admin can see weight but not payout', () => {
      expect(canSeeField(Role.PROCESSING_ADMIN, 'sourcing', 'raw_weight_kg')).toBe(true);
      expect(canSeeField(Role.PROCESSING_ADMIN, 'sourcing', 'payout_amount_usd')).toBe(false);
    });

    it('field_coordinator can edit harvest fields but not payout', () => {
      expect(canEditField(Role.FIELD_COORDINATOR, 'sourcing', 'harvester_id')).toBe(true);
      expect(canEditField(Role.FIELD_COORDINATOR, 'sourcing', 'raw_weight_kg')).toBe(true);
      expect(canEditField(Role.FIELD_COORDINATOR, 'sourcing', 'payout_amount_usd')).toBe(false);
    });

    it('processing_admin cannot edit any sourcing fields', () => {
      expect(canEditField(Role.PROCESSING_ADMIN, 'sourcing', 'harvester_id')).toBe(false);
    });

    it('super_admin can see and edit all sourcing fields', () => {
      expect(canSeeField(Role.SUPER_ADMIN, 'sourcing', 'payout_amount_usd')).toBe(true);
      expect(canEditField(Role.SUPER_ADMIN, 'sourcing', 'payout_amount_usd')).toBe(true);
    });
  });

  describe('Processing field access', () => {
    it('processing_admin can see and edit all processing fields', () => {
      expect(canSeeField(Role.PROCESSING_ADMIN, 'processing', 'yield_ratio')).toBe(true);
      expect(canEditField(Role.PROCESSING_ADMIN, 'processing', 'batch_id')).toBe(true);
    });

    it('distribution_manager can see raw weight and sachet count but not yield or waste', () => {
      expect(canSeeField(Role.DISTRIBUTION_MANAGER, 'processing', 'raw_weight_kg')).toBe(true);
      expect(canSeeField(Role.DISTRIBUTION_MANAGER, 'processing', 'total_175ml_sachets_produced')).toBe(true);
      expect(canSeeField(Role.DISTRIBUTION_MANAGER, 'processing', 'yield_ratio')).toBe(false);
      expect(canSeeField(Role.DISTRIBUTION_MANAGER, 'processing', 'waste_percentage')).toBe(false);
    });

    it('distribution_manager cannot edit processing fields', () => {
      expect(canEditField(Role.DISTRIBUTION_MANAGER, 'processing', 'batch_id')).toBe(false);
    });
  });

  describe('Distribution field access', () => {
    it('distribution_manager can see all distribution fields', () => {
      expect(canSeeField(Role.DISTRIBUTION_MANAGER, 'distribution', 'netVendorMarginUsd')).toBe(true);
      expect(canSeeField(Role.DISTRIBUTION_MANAGER, 'distribution', 'grossCollectedUsd')).toBe(true);
    });

    it('processing_admin cannot see financial distribution fields', () => {
      expect(canSeeField(Role.PROCESSING_ADMIN, 'distribution', 'netVendorMarginUsd')).toBe(false);
      expect(canSeeField(Role.PROCESSING_ADMIN, 'distribution', 'sachets_sold')).toBe(false);
    });

    it('processing_admin can see dispatch count only', () => {
      expect(canSeeField(Role.PROCESSING_ADMIN, 'distribution', 'sachets_dispatched')).toBe(true);
    });

    it('field_coordinator cannot see any distribution fields', () => {
      expect(canSeeField(Role.FIELD_COORDINATOR, 'distribution', 'sachets_dispatched')).toBe(false);
    });
  });
});
