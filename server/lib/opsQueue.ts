import { Types } from 'mongoose';

export type OpsKind = 'out-of-stock' | 'low-stock' | 'expiring';
export interface OpsItem {
  key: string; kind: OpsKind; subjectId: string; subjectType: 'product' | 'lot';
  productId: string; name: string; detail: string; severity: 'critical' | 'warning';
}
export interface OpsLot { id: Types.ObjectId; productId: Types.ObjectId; lot: string; expiryDate: Date; quantityOnHand: number }
export interface OpsProduct { id: Types.ObjectId; name: string; reorder: number; quantityOnHand: number }

export function deriveOpsItems(products: OpsProduct[], lots: OpsLot[], now = new Date()): OpsItem[] {
  const items: OpsItem[] = [];
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  for (const product of products) {
    if (product.quantityOnHand <= 0) {
      items.push({ key: `out-of-stock:${String(product.id)}`, kind: 'out-of-stock', subjectId: String(product.id), subjectType: 'product', productId: String(product.id), name: product.name, detail: 'No saleable quantity on hand', severity: 'critical' });
    } else if (product.quantityOnHand <= product.reorder) {
      items.push({ key: `low-stock:${String(product.id)}`, kind: 'low-stock', subjectId: String(product.id), subjectType: 'product', productId: String(product.id), name: product.name, detail: `${product.quantityOnHand} on hand, reorder level ${product.reorder}`, severity: 'warning' });
    }
  }
  for (const lot of lots) {
    if (lot.quantityOnHand > 0 && lot.expiryDate <= soon) {
      items.push({ key: `expiring:${String(lot.id)}`, kind: 'expiring', subjectId: String(lot.id), subjectType: 'lot', productId: String(lot.productId), name: `Lot ${lot.lot}`, detail: `Expires ${lot.expiryDate.toISOString().slice(0, 10)} · ${lot.quantityOnHand} on hand`, severity: lot.expiryDate <= now ? 'critical' : 'warning' });
    }
  }
  return items.sort((a, b) => (a.severity === b.severity ? a.name.localeCompare(b.name) : a.severity === 'critical' ? -1 : 1));
}
