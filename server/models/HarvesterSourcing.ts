import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHarvesterSourcing extends Document {
  harvesterId: string;
  name: string;
  region: 'Chimanimani' | 'Mudzi' | 'Binga' | 'Mt Darwin' | 'Chiredzi';
  phone: string;
  weightKg: number;
  qualityGrade: 'A' | 'B' | 'C';
  payoutUsd: number;
  offlineCreatedAt: Date;
  syncId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const SourcingTransactionSchema = new Schema<IHarvesterSourcing>(
  {
    harvesterId: { type: String, required: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    region: {
      type: String,
      required: true,
      enum: ['Chimanimani', 'Mudzi', 'Binga', 'Mt Darwin', 'Chiredzi'],
    },
    phone: { type: String, required: true },
    weightKg: { type: Number, required: true, min: 0.1 },
    qualityGrade: { type: String, required: true, enum: ['A', 'B', 'C'] },
    payoutUsd: { type: Number, required: true },
    offlineCreatedAt: { type: Date, required: true, default: Date.now },
    syncId: { type: String, required: true, unique: true, index: true, trim: true },
  },
  { timestamps: true }
);

SourcingTransactionSchema.path('payoutUsd').validate(function (this: IHarvesterSourcing, value: number) {
  const minPremium: Record<string, number> = { A: 1.5, B: 1.0, C: 0.7 };
  const rate = minPremium[this.qualityGrade] || 0.7;
  return value >= this.weightKg * rate - 0.01;
}, 'ETHICAL AUDIT FAILED: Payout below minimum fair premium floor.');

SourcingTransactionSchema.pre<IHarvesterSourcing>('save', async function () {
  if (this.isNew && this.syncId) {
    const existing = await (this.constructor as Model<IHarvesterSourcing>).findOne({ syncId: this.syncId });
    if (existing) {
      throw new Error(`IDEMPOTENCY CONFLICT: syncId "${this.syncId}" already exists.`);
    }
  }
});

export const HarvesterSourcingModel: Model<IHarvesterSourcing> =
  mongoose.models.HarvesterSourcing ||
  mongoose.model<IHarvesterSourcing>('HarvesterSourcing', SourcingTransactionSchema);
