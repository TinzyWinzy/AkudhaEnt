import {
  SACHET_RETAIL_PRICE,
  SACHET_VENDOR_COST,
  TARGET_MARGIN_MIN,
  TARGET_MARGIN_MAX,
} from '../constants';

export interface MarginResult {
  grossCollectedUsd: number;
  netVendorMarginUsd: number;
  spoilageDebit: number;
  status: 'DISPATCHED' | 'SETTLED' | 'AUDIT_REQUIRED' | 'SHORTFALL';
  sustenanceLevel: 'below' | 'target' | 'exceptional';
}

export function calculateVendorMargins(
  sachetsDispatched: number,
  sachetsSold: number,
  sachetsReturnedSpoiled: number
): MarginResult {
  const retailRevenue = sachetsSold * SACHET_RETAIL_PRICE;
  const spoilageDebit = sachetsReturnedSpoiled * SACHET_VENDOR_COST;
  const netVendorMarginUsd = Math.round(
    (sachetsSold * (SACHET_RETAIL_PRICE - SACHET_VENDOR_COST) - spoilageDebit) * 100
  ) / 100;

  const cumulative = sachetsSold + sachetsReturnedSpoiled;
  let status: MarginResult['status'] = 'DISPATCHED';
  if (cumulative < sachetsDispatched) status = 'SHORTFALL';
  else if (cumulative > sachetsDispatched) status = 'AUDIT_REQUIRED';
  else status = 'SETTLED';

  let sustenanceLevel: MarginResult['sustenanceLevel'] = 'below';
  if (netVendorMarginUsd >= TARGET_MARGIN_MIN && netVendorMarginUsd <= TARGET_MARGIN_MAX) {
    sustenanceLevel = 'target';
  } else if (netVendorMarginUsd > TARGET_MARGIN_MAX) {
    sustenanceLevel = 'exceptional';
  }

  return {
    grossCollectedUsd: retailRevenue,
    netVendorMarginUsd,
    spoilageDebit,
    status,
    sustenanceLevel,
  };
}

export function validateConsignment(sachetsSold: number, sachetsReturnedSpoiled: number, sachetsDispatched: number): string | null {
  if (sachetsDispatched <= 0) return 'Dispatch count must be greater than zero.';
  if (sachetsSold < 0) return 'Sold count cannot be negative.';
  if (sachetsReturnedSpoiled < 0) return 'Returned count cannot be negative.';
  if (sachetsSold + sachetsReturnedSpoiled > sachetsDispatched) {
    return `CONSIGNMENT DISCREPANCY: Dispatched (${sachetsDispatched}) < Sold (${sachetsSold}) + Returned (${sachetsReturnedSpoiled})`;
  }
  return null;
}
