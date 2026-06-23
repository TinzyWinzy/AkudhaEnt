import {
  OPTIMAL_YIELD_RATIO,
  ANOMALY_THRESHOLD_LOW,
  ANOMALY_THRESHOLD_HIGH,
} from '../constants';

export interface YieldResult {
  ratio: number;
  deviationPercent: number;
  isAnomalous: boolean;
  wastePercentage: number;
}

export function calculateYield(rawWeightKg: number, sachetsProduced: number): YieldResult {
  if (rawWeightKg <= 0) {
    return { ratio: 0, deviationPercent: 0, isAnomalous: false, wastePercentage: 0 };
  }

  const ratio = sachetsProduced / rawWeightKg;
  const deviationPercent = ((ratio - OPTIMAL_YIELD_RATIO) / OPTIMAL_YIELD_RATIO) * 100;
  const isAnomalous = ratio < ANOMALY_THRESHOLD_LOW || ratio > ANOMALY_THRESHOLD_HIGH;

  let wastePercentage = 0;
  if (ratio < OPTIMAL_YIELD_RATIO) {
    const expectedSachets = rawWeightKg * OPTIMAL_YIELD_RATIO;
    const lossCount = expectedSachets - sachetsProduced;
    wastePercentage = Math.round((lossCount / expectedSachets) * 100 * 100) / 100;
  }

  return {
    ratio: Math.round(ratio * 100) / 100,
    deviationPercent: Math.round(deviationPercent * 10) / 10,
    isAnomalous,
    wastePercentage,
  };
}
