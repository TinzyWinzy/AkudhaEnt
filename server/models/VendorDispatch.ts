import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVendorDispatch extends Document {
  dispatchId: string;
  vendorId: string;
  hubLocation: string;
  sachetsDispatched: number;
  sachetsReturnedSpoiled: number;
  sachetsSold: number;
  grossCollectedUsd: number;
  netVendorMarginUsd: number;
  status: 'DISPATCHED' | 'SETTLED' | 'AUDIT_REQUIRED' | 'SHORTFALL';
  createdAt?: Date;
  updatedAt?: Date;
}

const VendorDispatchSchema = new Schema<IVendorDispatch>(
  {
    dispatchId: { type: String, required: true, unique: true, index: true, trim: true },
    vendorId: { type: String, required: true, trim: true },
    hubLocation: { type: String, required: true, trim: true },
    sachetsDispatched: { type: Number, required: true, min: 1 },
    sachetsReturnedSpoiled: { type: Number, required: true, min: 0, default: 0 },
    sachetsSold: { type: Number, required: true, min: 0, default: 0 },
    grossCollectedUsd: { type: Number, default: 0 },
    netVendorMarginUsd: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['DISPATCHED', 'SETTLED', 'AUDIT_REQUIRED', 'SHORTFALL'],
      default: 'DISPATCHED',
    },
  },
  { timestamps: true }
);

VendorDispatchSchema.path('sachetsSold').validate(function (this: IVendorDispatch, value: number) {
  return value + this.sachetsReturnedSpoiled <= this.sachetsDispatched;
}, 'QUANTITY INCONSISTENCY: Sold + Returned cannot exceed dispatched.');

VendorDispatchSchema.pre<IVendorDispatch>('save', function () {
  const retailPrice = 0.50;
  const wholesaleCost = 0.25;
  const marginPerSachet = 0.25;

  this.grossCollectedUsd = this.sachetsSold * retailPrice;
  const grossProfit = this.sachetsSold * marginPerSachet;
  const spoilageDebit = this.sachetsReturnedSpoiled * wholesaleCost;
  this.netVendorMarginUsd = Math.round((grossProfit - spoilageDebit) * 100) / 100;

  const cumulative = this.sachetsSold + this.sachetsReturnedSpoiled;
  if (cumulative < this.sachetsDispatched) this.status = 'SHORTFALL';
  else if (cumulative > this.sachetsDispatched) this.status = 'AUDIT_REQUIRED';
  else this.status = 'SETTLED';
});

export const VendorDispatchModel: Model<IVendorDispatch> =
  mongoose.models.VendorDispatch ||
  mongoose.model<IVendorDispatch>('VendorDispatch', VendorDispatchSchema);
