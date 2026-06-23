import { describe, it, expect } from 'vitest';
import { calculateYield } from '../../src/lib/yield';

// Maps to: AKU-202 - Processing Yield Anomaly Flagging
describe('Yield Calculations (AKU-202)', () => {
  it('calculates optimum 10x yield ratio', () => {
    // Gherkin: 25.0kg input, 250 sachets output → 10.0 ratio, 0% deviation
    const result = calculateYield(25.0, 250);
    expect(result.ratio).toBe(10);
    expect(result.deviationPercent).toBe(0);
    expect(result.isAnomalous).toBe(false);
    expect(result.wastePercentage).toBe(0);
  });

  it('flags anomalous yield below threshold', () => {
    // Gherkin: 25.0kg input, 180 sachets → 7.2 ratio, -28% deviation, anomalous
    const result = calculateYield(25.0, 180);
    expect(result.ratio).toBeCloseTo(7.2, 1);
    expect(result.deviationPercent).toBeCloseTo(-28.0, 1);
    expect(result.isAnomalous).toBe(true);
  });

  it('calculates waste percentage for sub-optimal yield', () => {
    // 80kg input, 640 sachets → 8.0 ratio, 20% waste
    const result = calculateYield(80, 640);
    expect(result.ratio).toBe(8);
    expect(result.wastePercentage).toBe(20);
    expect(result.isAnomalous).toBe(true);
  });

  it('does not flag yield within normal range (8.5-11.5)', () => {
    // 20kg input, 200 sachets → 10.0 ratio, not anomalous
    const result = calculateYield(20.0, 200);
    expect(result.ratio).toBe(10);
    expect(result.isAnomalous).toBe(false);
  });

  it('flags high yield above threshold', () => {
    // Unrealistically high yield
    const result = calculateYield(10, 120);
    expect(result.isAnomalous).toBe(true);
    expect(result.deviationPercent).toBe(20);
  });

  it('returns zeroes for zero weight', () => {
    const result = calculateYield(0, 0);
    expect(result.ratio).toBe(0);
    expect(result.isAnomalous).toBe(false);
  });
});
