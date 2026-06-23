import { QualityGrade } from '../types';
import { ETHICAL_BASE_PRICES } from '../constants';

export function calculateFairPayout(weightKg: number, grade: QualityGrade): number {
  const rate = ETHICAL_BASE_PRICES[grade];
  return Math.round(weightKg * rate * 100) / 100;
}

export function getMinimumFairPayout(weightKg: number, grade: QualityGrade): number {
  const rate = ETHICAL_BASE_PRICES[grade];
  return weightKg * rate;
}

export function validateEthicalPayout(
  weightKg: number,
  grade: QualityGrade,
  payoutUsd: number,
  tolerance = 0.01
): { valid: boolean; deficit: number; minimumRequired: number } {
  const minimumRequired = getMinimumFairPayout(weightKg, grade);
  const deficit = Math.max(0, minimumRequired - payoutUsd);
  const valid = payoutUsd >= minimumRequired - tolerance;
  return { valid, deficit, minimumRequired };
}
