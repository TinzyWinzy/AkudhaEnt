import { describe, it, expect } from 'vitest';
import { detectAnomaly } from '../../server/services/ai/anomalyAgent';

describe('Anomaly Agent — Rules Detection', () => {
  it('passes batch within 15% of moving average', () => {
    const result = detectAnomaly({
      region: 'Chimanimani',
      rawWeightKg: 25,
      sachetCount: 250,
      batchId: 'B-101',
      historicalYields: [10, 9.5, 10.5],
    });
    expect(result.isAnomalous).toBe(false);
    expect(result.yieldRatio).toBe(10);
    expect(result.deviationPercent).toBeCloseTo(0, 1);
  });

  it('flags batch deviating >15% from moving average', () => {
    const result = detectAnomaly({
      region: 'Chimanimani',
      rawWeightKg: 25,
      sachetCount: 180,
      batchId: 'B-102',
      historicalYields: [10, 9.5, 10.5],
    });
    expect(result.isAnomalous).toBe(true);
    expect(result.yieldRatio).toBeCloseTo(7.2, 1);
    expect(Math.abs(result.deviationPercent)).toBeGreaterThan(15);
  });

  it('falls back to optimal ratio when no history exists', () => {
    const result = detectAnomaly({
      region: 'Binga',
      rawWeightKg: 50,
      sachetCount: 500,
      batchId: 'B-103',
      historicalYields: [],
    });
    expect(result.isAnomalous).toBe(false);
    expect(result.movingAverage).toBe(10);
  });

  it('detects positive deviation (high yield)', () => {
    const result = detectAnomaly({
      region: 'Mudzi',
      rawWeightKg: 10,
      sachetCount: 140, // 14.0 sachets/kg, 40% above average
      batchId: 'B-104',
      historicalYields: [10, 10],
    });
    expect(result.isAnomalous).toBe(true);
    expect(result.deviationPercent).toBe(40);
  });
});
