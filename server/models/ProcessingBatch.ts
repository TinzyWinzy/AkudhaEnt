import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProcessingBatch extends Document {
  organizationId: string;
  actorId: string;
  syncId: string;
  batchId: string;
  inputRawWeightKg: number;
  outputSachetCount: number;
  processingDate: Date;
  operatorId: string;
  wastageLossPercentage: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProcessingBatchSchema = new Schema<IProcessingBatch>(
  {
    organizationId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    syncId: { type: String, required: true, trim: true },
    batchId: { type: String, required: true, index: true, trim: true },
    inputRawWeightKg: { type: Number, required: true, min: 1 },
    outputSachetCount: { type: Number, required: true, min: 0 },
    processingDate: { type: Date, required: true, default: Date.now },
    operatorId: { type: String, required: true, trim: true },
    wastageLossPercentage: { type: Number, default: 0 },
  },
  { timestamps: true }
);
ProcessingBatchSchema.index({ organizationId: 1, batchId: 1 }, { unique: true });
ProcessingBatchSchema.index({ organizationId: 1, syncId: 1 }, { unique: true });

ProcessingBatchSchema.pre<IProcessingBatch>('save', function () {
  const actualRatio = this.outputSachetCount / this.inputRawWeightKg;
  const optimalRatio = 10.0;
  if (actualRatio < optimalRatio) {
    const expectedSachets = this.inputRawWeightKg * optimalRatio;
    const lossCount = expectedSachets - this.outputSachetCount;
    this.wastageLossPercentage = Math.round((lossCount / expectedSachets) * 100 * 100) / 100;
  } else {
    this.wastageLossPercentage = 0;
  }
});

export const ProcessingBatchModel: Model<IProcessingBatch> =
  mongoose.models.ProcessingBatch ||
  mongoose.model<IProcessingBatch>('ProcessingBatch', ProcessingBatchSchema);
