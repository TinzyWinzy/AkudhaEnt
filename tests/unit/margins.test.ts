import { describe, it, expect } from 'vitest';
import { calculateVendorMargins, validateConsignment } from '../../src/lib/margins';

// Maps to: AKU-301 - Outbound Consignment & Spoilage Settlement
describe('Vendor Margins (AKU-301)', () => {
  it('calculates margins for standard consignment', () => {
    // Gherkin: 80 dispatched, 75 sold, 2 returned
    const result = calculateVendorMargins(80, 75, 2);
    expect(result.grossCollectedUsd).toBe(37.50); // 75 * $0.50
    expect(result.netVendorMarginUsd).toBe(18.25); // (75*0.25) - (2*0.25)
    expect(result.spoilageDebit).toBe(0.50); // 2 * $0.25
    expect(result.status).toBe('SHORTFALL'); // 75 + 2 = 77 < 80
  });

  it('detects shortfall when sold + returned < dispatched', () => {
    const result = calculateVendorMargins(100, 80, 5);
    expect(result.status).toBe('SHORTFALL');
  });

  it('detects audit required when sold + returned > dispatched', () => {
    const result = calculateVendorMargins(100, 95, 10);
    expect(result.status).toBe('AUDIT_REQUIRED');
  });

  it('detects settled when sold + returned = dispatched', () => {
    // Gherkin: 100 dispatched, 90 sold, 10 returned = 100
    const result = calculateVendorMargins(100, 90, 10);
    expect(result.status).toBe('SETTLED');
  });
});

// Maps to: AKU-302 - Vendor Profit Sustainment Auditing
describe('Sustenance Auditing (AKU-302)', () => {
  it('flags below daily threshold ($2.75 < $6.00)', () => {
    // Gherkin: 20 dispatched, 15 sold, 4 returned → $2.75
    const result = calculateVendorMargins(20, 15, 4);
    expect(result.netVendorMarginUsd).toBe(2.75);
    expect(result.sustenanceLevel).toBe('below');
  });

  it('flags target threshold met ($18.25 in $6-$18 range)', () => {
    // Gherkin: 80 dispatched, 75 sold, 2 returned → $18.25
    const result = calculateVendorMargins(80, 75, 2);
    expect(result.netVendorMarginUsd).toBe(18.25);
    expect(result.sustenanceLevel).toBe('target');
  });

  it('flags exceptional return above max threshold', () => {
    const result = calculateVendorMargins(120, 100, 0);
    expect(result.netVendorMarginUsd).toBe(25.00);
    expect(result.sustenanceLevel).toBe('exceptional');
  });
});

// Maps to: AKU-301 - Double ledger math validation
describe('Consignment Validation (AKU-301)', () => {
  it('rejects when sold + returned exceeds dispatched', () => {
    // Gherkin: 100 dispatched, 90 sold, 15 returned = 105 > 100
    const error = validateConsignment(90, 15, 100);
    expect(error).not.toBeNull();
    expect(error).toContain('CONSIGNMENT DISCREPANCY');
  });

  it('accepts when sold + returned <= dispatched', () => {
    const error = validateConsignment(75, 2, 80);
    expect(error).toBeNull();
  });

  it('rejects zero dispatch', () => {
    const error = validateConsignment(0, 0, 0);
    expect(error).toContain('greater than zero');
  });
});
