import type { ClientSession, Types } from 'mongoose';
import { LabelTemplateModel } from '../models/Inventory.js';

export interface TemplateProduct {
  _id: Types.ObjectId;
  organizationId: string;
  sku: string;
  name: string;
}

interface SystemTemplate {
  name: string;
  artworkUrl: string;
  artworkChecksum: string;
  widthMm: number;
  heightMm: number;
  version: number;
}

const WRAP_TEMPLATES: Record<string, SystemTemplate> = {
  'AKU-BAO-100': { name: 'Akudha Baobab Oil wrap · 140 × 55 mm', artworkUrl: '/labels/baobab-oil.png?master=2', artworkChecksum: '0eea630673e6172a453f729b71e2ff5b3fafa21247d352cfa2770cd625a7b744', widthMm: 140, heightMm: 55, version: 5 },
  'AKU-KAL-100': { name: 'Akudha Kalahari Melon Oil wrap · size to confirm', artworkUrl: '/labels/kalahari-melon-oil.png?master=2', artworkChecksum: '47c1d5b1a2d39ae8a562efc7246ccc1f0044e5c26959cd262d632fa9ead3c1d6', widthMm: 200, heightMm: 100, version: 1 },
  'AKU-MON-100': { name: 'Akudha Mongongo Oil wrap · size to confirm', artworkUrl: '/labels/mongongo-oil.png?master=2', artworkChecksum: 'ec51a27331f8af9f33a9e1896be36992226e4464a20f238f9552cd9661cc10a4', widthMm: 200, heightMm: 100, version: 1 },
  'AKU-MAF-250': { name: 'Akudha Mafura Butter wrap · size to confirm', artworkUrl: '/labels/mafura-butter.png?master=2', artworkChecksum: '0168ac4ed5babc6555f00bb559f9b59feb7eff6923129c332542dc553c2e96c', widthMm: 200, heightMm: 100, version: 1 },
};

const CLEAN_TEMPLATES = [
  { name: 'Clean thermal label · 50 × 30 mm', artworkUrl: 'akudha://clean-label/thermal-50x30', artworkChecksum: 'cbafc5a81f58b5a93d73bb6314b85b265e724754f6fc65549f8c457c6f7f1c9d', widthMm: 50, heightMm: 30 },
  { name: 'Clean thermal label · 70 × 40 mm', artworkUrl: 'akudha://clean-label/thermal-70x40', artworkChecksum: '2e7dd510a832005eca41948f2425fe1ad8b0f65c0ede8b8cc02934ed77dac20e', widthMm: 70, heightMm: 40 },
  { name: 'Clean A4 label · 63.5 × 38.1 mm', artworkUrl: 'akudha://clean-label/a4-63x38', artworkChecksum: '102f4b895da1c06a4252cf9c6f4a04f6fff8a10fdd661fdb82ead282e4b9923a', widthMm: 63.5, heightMm: 38.1 },
] as const;

export function systemTemplatesForProduct(product: Pick<TemplateProduct, 'sku' | 'name'>): SystemTemplate[] {
  const wrap = WRAP_TEMPLATES[product.sku];
  const templates: SystemTemplate[] = [];
  if (wrap) templates.push(wrap);
  let version = 2;
  for (const clean of CLEAN_TEMPLATES) templates.push({ ...clean, version: version++ });
  return templates;
}

export async function ensureProductLabelTemplates(products: TemplateProduct[], createdBy: string, session?: ClientSession): Promise<number> {
  let created = 0;
  for (const product of products) {
    if (product.sku !== 'AKU-BAO-100' && WRAP_TEMPLATES[product.sku]) {
      await LabelTemplateModel.updateMany(
        { organizationId: product.organizationId, productId: product._id, version: 5, widthMm: 140, heightMm: 55, status: 'approved' },
        { $set: { status: 'retired' } },
        { session, runValidators: true },
      );
    }
    for (const template of systemTemplatesForProduct(product)) {
      const result = await LabelTemplateModel.updateOne(
        { organizationId: product.organizationId, productId: product._id, version: template.version },
        { $setOnInsert: { ...template, status: 'approved', createdBy } },
        { upsert: true, session, runValidators: true },
      );
      created += result.upsertedCount;
    }
  }
  return created;
}
