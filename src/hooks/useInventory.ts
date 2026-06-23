import { useMemo } from 'react';
import { HarvesterRecord, ProcessingBatch, OutboundConsignment, SyncPayload } from '../types';
import { VAULT_BASELINE_RAW_PULP_KG, VAULT_BASELINE_SACHETS } from '../constants';

interface InventoryResult {
  rawPulpStockKg: number;
  processedSachetsStock: number;
  totalHarvestedKg: number;
  totalEthicalPayoutUSD: number;
  totalSachetsDistributed: number;
  totalSachetsSold: number;
  totalVendorRevenueUSD: number;
}

export function useInventory(
  syncedHarvests: HarvesterRecord[],
  syncedBatches: ProcessingBatch[],
  syncedConsignments: OutboundConsignment[],
  offlineQueue: SyncPayload[]
): InventoryResult {
  return useMemo(() => {
    let rawPulp = VAULT_BASELINE_RAW_PULP_KG;
    let sachets = VAULT_BASELINE_SACHETS;

    syncedHarvests.forEach(h => { rawPulp += h.raw_weight_kg; });

    syncedBatches.forEach(b => {
      rawPulp -= b.raw_weight_kg;
      sachets += b.total_175ml_sachets_produced;
    });

    syncedConsignments.forEach(c => {
      sachets -= c.sachets_dispatched;
    });

    offlineQueue.forEach(q => {
      if (q.status === 'PENDING') {
        if (q.type === 'HARVEST') rawPulp += q.payload.raw_weight_kg;
        else if (q.type === 'PROCESSING') {
          rawPulp -= q.payload.raw_weight_kg;
          sachets += q.payload.total_175ml_sachets_produced;
        } else if (q.type === 'CONSIGNMENT') {
          sachets -= q.payload.sachets_dispatched;
        }
      }
    });

    const totalHarvestedKg = syncedHarvests.reduce((sum, h) => sum + h.raw_weight_kg, 0);
    const totalEthicalPayoutUSD = syncedHarvests.reduce((sum, h) => sum + h.payout_amount_usd, 0);
    const totalSachetsDistributed = syncedConsignments.reduce((sum, c) => sum + c.sachets_dispatched, 0);
    const totalSachetsSold = syncedConsignments.reduce((sum, c) => sum + c.sachets_sold, 0);
    const totalVendorRevenueUSD = totalSachetsSold * 0.50;

    return {
      rawPulpStockKg: Math.max(0, parseFloat(rawPulp.toFixed(2))),
      processedSachetsStock: Math.max(0, Math.floor(sachets)),
      totalHarvestedKg,
      totalEthicalPayoutUSD,
      totalSachetsDistributed,
      totalSachetsSold,
      totalVendorRevenueUSD,
    };
  }, [syncedHarvests, syncedBatches, syncedConsignments, offlineQueue]);
}
