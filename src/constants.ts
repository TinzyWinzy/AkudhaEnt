import { QualityGrade } from './types';

export const ZIM_REGIONS = [
  'Chimanimani',
  'Mudzi',
  'Binga',
  'Mt Darwin',
  'Chiredzi',
] as const;

export type Region = typeof ZIM_REGIONS[number];

export const ETHICAL_BASE_PRICES: Record<QualityGrade, number> = {
  [QualityGrade.A]: 1.50,
  [QualityGrade.B]: 1.00,
  [QualityGrade.C]: 0.70,
};

export const SACHET_RETAIL_PRICE = 0.50;
export const SACHET_VENDOR_COST = 0.25;
export const TARGET_MARGIN_MIN = 6.00;
export const TARGET_MARGIN_MAX = 18.50;

export const OPTIMAL_YIELD_RATIO = 10;
export const ANOMALY_THRESHOLD_LOW = 8.5;
export const ANOMALY_THRESHOLD_HIGH = 11.5;

export const ANOMALY_DEVIATION_PERCENT = 15;

export const ROUNDING_TOLERANCE = 0.01;

export const DEFAULT_SYNC_DELAY_MS = 800;
export const SYNC_LATENCY_OPTIONS = [
  { value: 0, label: '0ms (Instant)' },
  { value: 800, label: '800ms (Slow edge)' },
  { value: 2500, label: '2.5s (Dial-up GPRS)' },
  { value: 5000, label: '5.0s (Sat link)' },
] as const;

export const VAULT_BASELINE_RAW_PULP_KG = 400.0;
export const VAULT_BASELINE_SACHETS = 250;

export const LOCALSTORAGE_KEYS = {
  SYNCED_HARVESTS: 'akudha_synced_harvests',
  SYNCED_BATCHES: 'akudha_synced_batches',
  SYNCED_CONSIGNMENTS: 'akudha_synced_consignments',
  OFFLINE_QUEUE: 'akudha_offline_queue',
} as const;
