import { QualityGrade, HarvesterRecord, ProcessingBatch, OutboundConsignment, Vendor } from './types';

export const INITIAL_HARVESTERS = [
  { id: 'H-001', name: 'Farai Moyo', region: 'Chimanimani' },
  { id: 'H-002', name: 'Ruvimbo Chida', region: 'Mudzi' },
  { id: 'H-003', name: 'Silibaziso Ncube', region: 'Binga' },
  { id: 'H-004', name: 'Tendai Mutasa', region: 'Mt Darwin' },
  { id: 'H-005', name: 'Chipo Zhou', region: 'Chiredzi' },
  { id: 'H-006', name: 'Nyasha Gumbo', region: 'Chimanimani' },
  { id: 'H-007', name: 'Blessing Shumba', region: 'Binga' },
];

export const INITIAL_VENDORS: Vendor[] = [
  { vendor_id: 'V-101', name: 'Amaka Sibanda', location: 'Mbare Musika, Harare', contact: '+263 77 123 4567' },
  { vendor_id: 'V-102', name: 'Tinashe Marere', location: 'Chitungwiza Unit L', contact: '+263 78 234 5678' },
  { vendor_id: 'V-103', name: 'Sekai Makonese', location: 'Marondera Market', contact: '+263 71 345 6789' },
  { vendor_id: 'V-104', name: 'Gwinyai Hove', location: 'Highfield Machipisa', contact: '+263 73 456 7890' },
  { vendor_id: 'V-105', name: 'Monica Ndlovu', location: 'Bulawayo Renkini', contact: '+263 77 567 8901' },
];

export const INITIAL_HUBS = [
  { id: 'HUB-HARARE', name: 'Harare Central Transit Hub' },
  { id: 'HUB-BYO', name: 'Bulawayo Southern Distribution Hub' },
  { id: 'HUB-MUTARE', name: 'Mutare Eastern Border Hub' },
];

export const INITIAL_DISPATCHERS = [
  { id: 'DIS-09', name: 'Tafadzwa Ndoro' },
  { id: 'DIS-12', name: 'Marvelous Sibanda' },
  { id: 'DIS-15', name: 'Rufaro Mariga' },
];

export const HISTORICAL_HARVESTS: HarvesterRecord[] = [
  {
    harvester_id: 'H-001',
    harvester_name: 'Farai Moyo',
    region: 'Chimanimani',
    raw_weight_kg: 120.5,
    quality_grade: QualityGrade.A,
    payout_amount_usd: 185.00, // Above baseline ($1.50 * 120.5 = $180.75)
    idempotent_uuid: '8fbd926c-d28c-4a34-becc-429be11ae301',
    offline_created_at: '2026-06-20T10:30:00Z',
    is_synced: true,
  },
  {
    harvester_id: 'H-003',
    harvester_name: 'Silibaziso Ncube',
    region: 'Binga',
    raw_weight_kg: 85.0,
    quality_grade: QualityGrade.B,
    payout_amount_usd: 90.00, // Meets/exceeds baseline ($1.00 * 85.0 = $85.00)
    idempotent_uuid: 'ca192b00-3fc1-46da-b783-6ccf1a0ddda2',
    offline_created_at: '2026-06-21T09:15:00Z',
    is_synced: true,
  },
  {
    harvester_id: 'H-004',
    harvester_name: 'Tendai Mutasa',
    region: 'Mt Darwin',
    raw_weight_kg: 210.0,
    quality_grade: QualityGrade.C,
    payout_amount_usd: 150.00, // Above baseline ($0.70 * 210.0 = $147.00)
    idempotent_uuid: 'b337c76f-004e-4f10-bf9d-fcee7d3dddb3',
    offline_created_at: '2026-06-21T14:45:00Z',
    is_synced: true,
  },
];

export const HISTORICAL_BATCHES: ProcessingBatch[] = [
  {
    batch_id: 'B-001',
    raw_weight_kg: 50,
    total_175ml_sachets_produced: 500, // Exact 10x yield factor
    date_processed: '2026-06-19',
    idempotent_uuid: '5ebf7fbe-ffce-412f-987d-8fac106cc0a1',
    offline_created_at: '2026-06-19T16:00:00Z',
    is_synced: true,
    yield_ratio: 10,
    is_anomalous: false,
    waste_percentage: 0,
  },
  {
    batch_id: 'B-002',
    raw_weight_kg: 80,
    total_175ml_sachets_produced: 640.0, // yield factor 8.0 (Waste anomaly! -20% deviation)
    date_processed: '2026-06-21',
    idempotent_uuid: 'ab961011-0985-48fa-86e1-954df66ee0c2',
    offline_created_at: '2026-06-21T11:20:00Z',
    is_synced: true,
    yield_ratio: 8,
    is_anomalous: true,
    waste_percentage: 20,
  },
];

export const HISTORICAL_CONSIGNMENTS: OutboundConsignment[] = [
  {
    consignment_id: 'C-001',
    hub_id: 'HUB-HARARE',
    dispatcher_id: 'DIS-09',
    vendor_id: 'V-101',
    vendor_name: 'Amaka Sibanda',
    sachets_dispatched: 150,
    sachets_returned_spoiled: 3,
    sachets_sold: 140,
    idempotent_uuid: '9adcdb81-6cf1-4ff2-83b9-1cdcb0bee0c3',
    offline_created_at: '2026-06-21T08:00:00Z',
    is_synced: true,
  },
  {
    consignment_id: 'C-002',
    hub_id: 'HUB-HARARE',
    dispatcher_id: 'DIS-12',
    vendor_id: 'V-102',
    vendor_name: 'Tinashe Marere',
    sachets_dispatched: 200,
    sachets_returned_spoiled: 12,
    sachets_sold: 180,
    idempotent_uuid: 'fdbdc101-5cf5-4cf3-93d3-1cdcb0bee0f4',
    offline_created_at: '2026-06-22T08:00:00Z',
    is_synced: true,
  },
];
