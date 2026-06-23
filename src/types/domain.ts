export enum QualityGrade {
  A = 'A',
  B = 'B',
  C = 'C'
}

export interface HarvesterRecord {
  harvester_id: string;
  harvester_name: string;
  region: string;
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
  yield_ratio: number;
  is_anomalous: boolean;
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
