import { z } from 'zod';

const isoDateTime = z.string().datetime();
const id = z.string().trim().min(1).max(100);

export const harvestPayloadSchema = z.object({
  harvester_id: id,
  harvester_name: z.string().trim().min(1).max(120),
  region: z.enum(['Chimanimani', 'Mudzi', 'Binga', 'Mt Darwin', 'Chiredzi']),
  raw_weight_kg: z.number().positive().max(1_000_000),
  quality_grade: z.enum(['A', 'B', 'C']),
  payout_amount_usd: z.number().nonnegative().max(1_000_000_000),
  idempotent_uuid: id,
  offline_created_at: isoDateTime,
  is_synced: z.boolean().optional(),
}).strict();

export const processingPayloadSchema = z.object({
  batch_id: id,
  raw_weight_kg: z.number().positive().max(1_000_000),
  total_175ml_sachets_produced: z.number().int().nonnegative().max(1_000_000_000),
  date_processed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  idempotent_uuid: id,
  offline_created_at: isoDateTime,
  is_synced: z.boolean().optional(),
  yield_ratio: z.number().nonnegative().optional(),
  is_anomalous: z.boolean().optional(),
  waste_percentage: z.number().nonnegative().max(100).optional(),
}).strict();

export const consignmentPayloadSchema = z.object({
  consignment_id: id,
  hub_id: id,
  dispatcher_id: id,
  vendor_id: id,
  vendor_name: z.string().trim().min(1).max(120),
  sachets_dispatched: z.number().int().positive().max(1_000_000_000),
  sachets_returned_spoiled: z.number().int().nonnegative().max(1_000_000_000),
  sachets_sold: z.number().int().nonnegative().max(1_000_000_000),
  idempotent_uuid: id,
  offline_created_at: isoDateTime,
  is_synced: z.boolean().optional(),
}).strict().refine(value => value.sachets_sold + value.sachets_returned_spoiled <= value.sachets_dispatched, {
  message: 'Sold and returned quantities cannot exceed the dispatched quantity',
});

const syncBase = { uuid: id, action: z.literal('CREATE'), offline_created_at: isoDateTime };
export const syncPayloadsSchema = z.object({
  payloads: z.array(z.discriminatedUnion('type', [
    z.object({ ...syncBase, type: z.literal('HARVEST'), payload: harvestPayloadSchema }).strict(),
    z.object({ ...syncBase, type: z.literal('PROCESSING'), payload: processingPayloadSchema }).strict(),
    z.object({ ...syncBase, type: z.literal('CONSIGNMENT'), payload: consignmentPayloadSchema }).strict(),
  ])).min(1).max(500),
}).strict().superRefine(({ payloads }, context) => {
  payloads.forEach((item, index) => {
    if (item.uuid !== item.payload.idempotent_uuid) context.addIssue({ code: 'custom', path: ['payloads', index, 'uuid'], message: 'Envelope UUID must match payload idempotency UUID' });
    if (item.offline_created_at !== item.payload.offline_created_at) context.addIssue({ code: 'custom', path: ['payloads', index, 'offline_created_at'], message: 'Envelope timestamp must match payload timestamp' });
  });
});
