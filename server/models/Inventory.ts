import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IProduct extends Document {
  organizationId: string; clientId: string; name: string; variant: string; sku: string; gtin?: string;
  price: number; cost: number; reorder: number; active: boolean; createdAt: Date; updatedAt: Date;
  wholesalePrice?: number; retailPrice?: number; deliveryNotes?: string;
}
export interface IInventoryLot extends Document {
  organizationId: string; clientId: string; productId: Types.ObjectId; lot: string; receivedDate: Date;
  manufacturedDate?: Date; expiryDate: Date; quantityOnHand: number; createdAt: Date; updatedAt: Date;
}
export interface IStockMovement extends Document {
  organizationId: string; clientId: string; transactionId: string; productId: Types.ObjectId; lotId: Types.ObjectId;
  type: 'receipt' | 'sale' | 'waste'; quantity: number; unitPrice: number; note: string; occurredAt: Date;
  actorId: string; createdAt: Date;
}
export interface ILabelTemplate extends Document {
  organizationId: string; productId: Types.ObjectId; name: string; artworkUrl: string; artworkChecksum: string;
  widthMm: number; heightMm: number; version: number; status: 'draft' | 'approved' | 'retired'; createdBy: string;
}
export interface ILabelPrintJob extends Document {
  organizationId: string; productId: Types.ObjectId; lotId?: Types.ObjectId; templateId: Types.ObjectId;
  templateVersion: number; artworkChecksum: string; barcodeValue: string; widthMm: number; heightMm: number;
  copies: number; printedBy: string; reprintReason?: string; createdAt: Date;
  measuredWidthMm?: number; measuredHeightMm?: number; scannedValue?: string; scanAccepted?: boolean; calibrationOk?: boolean;
}
export interface ILabelArtwork extends Document {
  organizationId: string; productId?: Types.ObjectId; name: string; mime: string; bytes: Buffer; checksum: string;
  sizeBytes: number; widthMm?: number; heightMm?: number; version: number; status: 'draft' | 'approved' | 'retired'; createdBy: string; createdAt?: Date;
}
export interface IOpsQueueAction extends Document {
  organizationId: string; itemKey: string; acknowledgedAt?: Date; acknowledgedBy?: string;
  escalatedAt?: Date; escalatedBy?: string; escalatedTo?: string; note: string;
}

const money = { type: Number, required: true, min: 0, max: 1_000_000_000 };
const ProductSchema = new Schema<IProduct>({
  organizationId: { type: String, required: true, index: true }, clientId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 100 }, variant: { type: String, required: true, trim: true, maxlength: 60 },
  sku: { type: String, required: true, uppercase: true, trim: true, maxlength: 32 }, gtin: { type: String, trim: true, maxlength: 14 },
  price: money, cost: money, reorder: { type: Number, required: true, min: 0, max: 1_000_000_000 }, active: { type: Boolean, default: true },
  wholesalePrice: { type: Number, min: 0, max: 1e9 }, retailPrice: { type: Number, min: 0, max: 1e9 }, deliveryNotes: { type: String, trim: true, maxlength: 400 },
}, { timestamps: true });
ProductSchema.index({ organizationId: 1, clientId: 1 }, { unique: true });
ProductSchema.index({ organizationId: 1, sku: 1 }, { unique: true });
ProductSchema.index(
  { organizationId: 1, gtin: 1 },
  { unique: true, partialFilterExpression: { gtin: { $type: 'string' } } },
);

const InventoryLotSchema = new Schema<IInventoryLot>({
  organizationId: { type: String, required: true, index: true }, clientId: { type: String, required: true, trim: true },
  productId: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true, index: true }, lot: { type: String, required: true, trim: true, maxlength: 60 },
  receivedDate: { type: Date, required: true }, manufacturedDate: Date, expiryDate: { type: Date, required: true },
  quantityOnHand: { type: Number, required: true, default: 0, min: 0, max: 1_000_000_000 },
}, { timestamps: true });
InventoryLotSchema.index({ organizationId: 1, clientId: 1 }, { unique: true });
InventoryLotSchema.index({ organizationId: 1, productId: 1, lot: 1 }, { unique: true });

const StockMovementSchema = new Schema<IStockMovement>({
  organizationId: { type: String, required: true, index: true }, clientId: { type: String, required: true, trim: true },
  transactionId: { type: String, required: true, trim: true, index: true }, productId: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true },
  lotId: { type: Schema.Types.ObjectId, ref: 'InventoryLot', required: true }, type: { type: String, required: true, enum: ['receipt', 'sale', 'waste'] },
  quantity: { type: Number, required: true, min: 1, max: 1_000_000_000 }, unitPrice: money, note: { type: String, default: '', maxlength: 200 },
  occurredAt: { type: Date, required: true }, actorId: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
StockMovementSchema.index({ organizationId: 1, clientId: 1 }, { unique: true });

const LabelTemplateSchema = new Schema<ILabelTemplate>({
  organizationId: { type: String, required: true, index: true }, productId: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true },
  name: { type: String, required: true, trim: true }, artworkUrl: { type: String, required: true }, artworkChecksum: { type: String, required: true },
  widthMm: { type: Number, required: true, min: 1, max: 1000 }, heightMm: { type: Number, required: true, min: 1, max: 1000 },
  version: { type: Number, required: true, min: 1 }, status: { type: String, required: true, enum: ['draft', 'approved', 'retired'], default: 'draft' }, createdBy: { type: String, required: true },
}, { timestamps: true });
LabelTemplateSchema.index({ organizationId: 1, productId: 1, version: 1 }, { unique: true });

const LabelPrintJobSchema = new Schema<ILabelPrintJob>({
  organizationId: { type: String, required: true, index: true }, productId: { type: Schema.Types.ObjectId, ref: 'InventoryProduct', required: true },
  lotId: { type: Schema.Types.ObjectId, ref: 'InventoryLot' }, templateId: { type: Schema.Types.ObjectId, ref: 'LabelTemplate', required: true },
  templateVersion: { type: Number, required: true }, artworkChecksum: { type: String, required: true }, barcodeValue: { type: String, required: true, maxlength: 64 },
  widthMm: { type: Number, required: true, min: 1, max: 1000 }, heightMm: { type: Number, required: true, min: 1, max: 1000 },
  copies: { type: Number, required: true, min: 1, max: 1000 }, printedBy: { type: String, required: true }, reprintReason: { type: String, maxlength: 200 },
  measuredWidthMm: Number, measuredHeightMm: Number, scannedValue: String, scanAccepted: Boolean, calibrationOk: Boolean,
}, { timestamps: { createdAt: true, updatedAt: false } });
LabelPrintJobSchema.index({ organizationId: 1, createdAt: -1 });
LabelPrintJobSchema.index({ organizationId: 1, productId: 1, createdAt: -1 });

const LabelArtworkSchema = new Schema<ILabelArtwork>({
  organizationId: { type: String, required: true, index: true }, productId: { type: Schema.Types.ObjectId, ref: 'InventoryProduct' },
  name: { type: String, required: true, trim: true }, mime: { type: String, required: true, enum: ['image/png', 'image/jpeg', 'image/webp'] },
  bytes: { type: Buffer, required: true }, checksum: { type: String, required: true }, sizeBytes: { type: Number, required: true },
  widthMm: Number, heightMm: Number, version: { type: Number, required: true, min: 1 },
  status: { type: String, required: true, enum: ['draft', 'approved', 'retired'], default: 'draft' }, createdBy: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });
LabelArtworkSchema.index({ organizationId: 1, checksum: 1 });
LabelArtworkSchema.index({ organizationId: 1, productId: 1, name: 1, version: -1 });

const OpsQueueActionSchema = new Schema<IOpsQueueAction>({
  organizationId: { type: String, required: true, index: true }, itemKey: { type: String, required: true, index: true },
  acknowledgedAt: Date, acknowledgedBy: String, escalatedAt: Date, escalatedBy: String, escalatedTo: String,
  note: { type: String, default: '', maxlength: 400 },
}, { timestamps: true });
OpsQueueActionSchema.index({ organizationId: 1, itemKey: 1 }, { unique: true });

export const ProductModel: Model<IProduct> = mongoose.models.InventoryProduct || mongoose.model<IProduct>('InventoryProduct', ProductSchema);
export const InventoryLotModel: Model<IInventoryLot> = mongoose.models.InventoryLot || mongoose.model<IInventoryLot>('InventoryLot', InventoryLotSchema);
export const StockMovementModel: Model<IStockMovement> = mongoose.models.StockMovement || mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);
export const LabelTemplateModel: Model<ILabelTemplate> = mongoose.models.LabelTemplate || mongoose.model<ILabelTemplate>('LabelTemplate', LabelTemplateSchema);
export const LabelPrintJobModel: Model<ILabelPrintJob> = mongoose.models.LabelPrintJob || mongoose.model<ILabelPrintJob>('LabelPrintJob', LabelPrintJobSchema);
export const OpsQueueActionModel: Model<IOpsQueueAction> = mongoose.models.OpsQueueAction || mongoose.model<IOpsQueueAction>('OpsQueueAction', OpsQueueActionSchema);
export const LabelArtworkModel: Model<ILabelArtwork> = mongoose.models.LabelArtwork || mongoose.model<ILabelArtwork>('LabelArtwork', LabelArtworkSchema);
