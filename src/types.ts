export enum QualityGrade {
  A = 'A',
  B = 'B',
  C = 'C'
}

export interface HarvesterRecord {
  harvester_id: string;
  harvester_name: string;
  region: string; // Chimanimani, Mudzi, Binga, Mt Darwin, Chiredzi
  raw_weight_kg: number;
  quality_grade: QualityGrade;
  payout_amount_usd: number;
  idempotent_uuid: string;
  offline_created_at: string;
  is_synced: boolean;
}

export interface ProcessingBatch {
  batch_id: string;
  raw_weight_kg: number;
  total_175ml_sachets_produced: number;
  date_processed: string;
  idempotent_uuid: string;
  offline_created_at: string;
  is_synced: boolean;
  yield_ratio: number; // Sachets per kg (benchmark is 10)
  is_anomalous: boolean; // true if yield_ratio deviates > 15% from 10 (i.e. < 8.5 or > 11.5)
  waste_percentage: number;
}

export interface OutboundConsignment {
  consignment_id: string;
  hub_id: string;
  dispatcher_id: string;
  vendor_id: string;
  vendor_name: string;
  sachets_dispatched: number;
  sachets_returned_spoiled: number;
  sachets_sold: number;
  idempotent_uuid: string;
  offline_created_at: string;
  is_synced: boolean;
}

export interface Vendor {
  vendor_id: string;
  name: string;
  location: string;
  contact: string;
}

export interface SyncPayload {
  uuid: string;
  type: 'HARVEST' | 'PROCESSING' | 'CONSIGNMENT';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  offline_created_at: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  error_message?: string;
}

// Zimbabwean Regions for Baobab Harvesting
export const ZIM_REGIONS = [
  'Chimanimani',
  'Mudzi',
  'Binga',
  'Mt Darwin',
  'Chiredzi',
];

// Baseline prices for ethical harvesting
export const ETHICAL_BASE_PRICES: Record<QualityGrade, number> = {
  [QualityGrade.A]: 1.50, // $1.50 USD per kg
  [QualityGrade.B]: 1.00, // $1.00 USD per kg
  [QualityGrade.C]: 0.70, // $0.70 USD per kg
};

// Sachet Retail Economics
export const SACHET_RETAIL_PRICE = 0.50; // Retails for $0.50 USD
export const SACHET_VENDOR_COST = 0.25;  // Consigned to vendor at $0.25 USD
export const TARGET_MARGIN_MIN = 6.00;    // Target daily net margin min ($6 USD)
export const TARGET_MARGIN_MAX = 18.00;   // Target daily net margin max ($18 USD)
