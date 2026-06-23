import { describe, it, expect } from 'vitest';
import { calculateFairPayout, validateEthicalPayout, getMinimumFairPayout } from '../../src/lib/pricing';
import { QualityGrade } from '../../src/types';

// Maps to: AKU-101 - Prevention of under-payout during manual entry
describe('Ethical Pricing (AKU-101)', () => {
  it('calculates fair payout for Grade A at $1.50/kg', () => {
    const payout = calculateFairPayout(45.0, QualityGrade.A);
    expect(payout).toBe(67.50);
  });

  it('calculates fair payout for Grade B at $1.00/kg', () => {
    const payout = calculateFairPayout(85.0, QualityGrade.B);
    expect(payout).toBe(85.00);
  });

  it('calculates fair payout for Grade C at $0.70/kg', () => {
    const payout = calculateFairPayout(210.0, QualityGrade.C);
    expect(payout).toBe(147.00);
  });

  it('validates payout meets minimum ethical floor for Grade A', () => {
    const result = validateEthicalPayout(45.0, QualityGrade.A, 67.50);
    expect(result.valid).toBe(true);
    expect(result.deficit).toBe(0);
  });

  it('rejects payout below ethical floor for Grade A', () => {
    // Gherkin: coordinator attempts $50.00 for 45.0kg Grade A (floor is $67.50)
    const result = validateEthicalPayout(45.0, QualityGrade.A, 50.00);
    expect(result.valid).toBe(false);
    expect(result.deficit).toBeCloseTo(17.50, 2);
    expect(result.minimumRequired).toBe(67.50);
  });

  it('allows payout above floor with tolerance', () => {
    const result = validateEthicalPayout(45.0, QualityGrade.A, 67.49);
    expect(result.valid).toBe(true); // within 0.01 tolerance
  });
});
