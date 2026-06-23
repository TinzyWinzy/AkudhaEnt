import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// 1. HARVESTER PROFILE & SOURCING TRANSACTION
// ==========================================

export interface IHarvesterSourcing extends Document {
  harvesterId: string;
  name: string;
  region: 'Chimanimani' | 'Mudzi' | 'Binga' | 'Mt Darwin' | 'Chiredzi';
  phone: string;
  weightKg: number;
  qualityGrade: 'A' | 'B' | 'C';
  payoutUsd: number;
  offlineCreatedAt: Date;
  syncId: string; // The idempotency UUID key
  createdAt?: Date;
  updatedAt?: Date;
}

export const SourcingTransactionSchema = new Schema<IHarvesterSourcing>(
  {
    harvesterId: {
      type: String,
      required: [true, 'Harvester identifier (harvesterId) is required.'],
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Harvester or Cooperative contact name is required.'],
      trim: true,
    },
    region: {
      type: String,
      required: [true, 'Sourcing rural region is required.'],
      enum: {
        values: ['Chimanimani', 'Mudzi', 'Binga', 'Mt Darwin', 'Chiredzi'],
        message: '{VALUE} is not a valid certified Akudha supply region.',
      },
    },
    phone: {
      type: String,
      required: [true, 'Zimbabwe contact phone number is required.'],
    },
    weightKg: {
      type: Number,
      required: [true, 'Raw baobab pulp weight in kilograms is required.'],
      min: [0.1, 'Weight must be at least 100 grams (0.1 kg).'],
    },
    qualityGrade: {
      type: String,
      required: [true, 'Quality grade rating is required.'],
      enum: {
        values: ['A', 'B', 'C'],
        message: 'Grade must be A, B, or C tier.',
      },
    },
    payoutUsd: {
      type: Number,
      required: [true, 'Cash payout USD is required.'],
    },
    offlineCreatedAt: {
      type: Date,
      required: [true, 'Offline record date/time is required.'],
      default: Date.now,
    },
    syncId: {
      type: String,
      required: [true, 'Strict Idempotency key (syncId) is required for offline audit.'],
      unique: true, // Prevents duplicate syncing at DB index level
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Built-in Validation: Ethical minimum wage check
SourcingTransactionSchema.path('payoutUsd').validate(function (this: IHarvesterSourcing, value: number) {
  // Fair premium check according to Zimbabwean supply agreements:
  // Grade A should yield $1.50/kg, Grade B $1.00/kg, Grade C $0.70/kg
  let minPremium = 0.7;
  if (this.qualityGrade === 'A') minPremium = 1.5;
  else if (this.qualityGrade === 'B') minPremium = 1.0;

  const minimumFairPayout = this.weightKg * minPremium;
  // Account for tiny rounding tolerances (0.01 margin)
  return value >= minimumFairPayout - 0.01;
}, 'ETHICAL AUDIT FAILED: Input payout is below the minimum fair premium floor for this quality grade. Harvest gatherer must be fairly compensated.');

// Pre-save hook that checks for duplicate transactions (idempotency key protection)
SourcingTransactionSchema.pre<IHarvesterSourcing>('save', async function (next) {
  const SourcingModel = this.constructor as Model<IHarvesterSourcing>;
  
  if (this.isNew && this.syncId) {
    const duplicate = await SourcingModel.findOne({ syncId: this.syncId }).exec();
    if (duplicate) {
      const err = new Error(`IDEMPOTENCY CONFLICT: A sourcing transaction with syncId "${this.syncId}" has already been processed.`);
      return next(err);
    }
  }
  next();
});

// ==========================================
// 2. PROCESSING BATCH SCHEMA
// ==========================================

export interface IProcessingBatch extends Document {
  batchId: string;
  inputRawWeightKg: number;
  outputSachetCount: number;
  processingDate: Date;
  operatorId: string;
  wastageLossPercentage: number; // Automatically calculated
  createdAt?: Date;
  updatedAt?: Date;
}

export const ProcessingBatchSchema = new Schema<IProcessingBatch>(
  {
    batchId: {
      type: String,
      required: [true, 'Batch identifier is required.'],
      unique: true,
      trim: true,
      index: true,
    },
    inputRawWeightKg: {
      type: Number,
      required: [true, 'Input raw baobab weight (kg) processed in batch is required.'],
      min: [1, 'Minimum input weight for batch operations is 1 kg.'],
    },
    outputSachetCount: {
      type: Number,
      required: [true, 'Yield count of completed 175ml sachets is required.'],
      min: [0, 'Completed sachet count cannot be negative.'],
    },
    processingDate: {
      type: Date,
      required: [true, 'Processing date is required.'],
      default: Date.now,
    },
    operatorId: {
      type: String,
      required: [true, 'Processing Operator identification code is required.'],
      trim: true,
    },
    wastageLossPercentage: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save: Computes wastage percentage based on raw extraction parameters
// Baseline optimum standard is 10 sachets from every 1.0 kg raw pulp.
// If actual yield ratio is lower than optimal, wastage loss percentage is computed.
ProcessingBatchSchema.pre<IProcessingBatch>('save', function (next) {
  const actualRatio = this.outputSachetCount / this.inputRawWeightKg;
  const optimalRatio = 10.0; // 10 sachets per kg
  
  if (actualRatio >= optimalRatio) {
    this.wastageLossPercentage = 0;
  } else {
    // Percentage loss of theoretical ideal output
    const expectedSachets = this.inputRawWeightKg * optimalRatio;
    const lossCount = expectedSachets - this.outputSachetCount;
    this.wastageLossPercentage = Math.round((lossCount / expectedSachets) * 100 * 100) / 100;
  }
  next();
});

// ==========================================
// 3. VENDOR DISPATCH & SETTLEMENT SCHEMA
// ==========================================

export interface IVendorDispatch extends Document {
  dispatchId: string;
  vendorId: string;
  hubLocation: string;
  sachetsDispatched: number;
  sachetsReturnedSpoiled: number;
  sachetsSold: number;
  grossCollectedUsd: number;      // Calculated (sachetsSold * $0.50 sachet retail)
  netVendorMarginUsd: number;     // Calculated (sold * $0.25 margin) - (spoiled * $0.25 wholesale cost)
  status: 'DISPATCHED' | 'SETTLED' | 'AUDIT_REQUIRED' | 'SHORTFALL'; // Auto Audit Status
  createdAt?: Date;
  updatedAt?: Date;
}

export const VendorDispatchSchema = new Schema<IVendorDispatch>(
  {
    dispatchId: {
      type: String,
      required: [true, 'Outbound dispatch transaction ID is required.'],
      unique: true,
      trim: true,
      index: true,
    },
    vendorId: {
      type: String,
      required: [true, 'Micro-vendor identifier is required.'],
      trim: true,
    },
    hubLocation: {
      type: String,
      required: [true, 'Regional distribution hub location is required.'],
      trim: true,
    },
    sachetsDispatched: {
      type: Number,
      required: [true, 'Quantity of sachets checked out to the vendor is required.'],
      min: [1, 'Must dispatch at least 1 sachet.'],
    },
    sachetsReturnedSpoiled: {
      type: Number,
      required: [true, 'Sachets returned spoiled or burst is required.'],
      min: [0, 'Returned counts cannot be negative.'],
      default: 0,
    },
    sachetsSold: {
      type: Number,
      required: [true, 'Sachets sold for currency count is required.'],
      min: [0, 'Sold counts cannot be negative.'],
      default: 0,
    },
    grossCollectedUsd: {
      type: Number,
      default: 0,
    },
    netVendorMarginUsd: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['DISPATCHED', 'SETTLED', 'AUDIT_REQUIRED', 'SHORTFALL'],
        message: 'Status must be DISPATCHED, SETTLED, AUDIT_REQUIRED, or SHORTFALL.',
      },
      default: 'DISPATCHED',
    },
  },
  {
    timestamps: true,
  }
);

// Built-in validation: Cumulative integrity constraints
VendorDispatchSchema.path('sachetsSold').validate(function (this: IVendorDispatch, value: number) {
  // Sold + Returned quantities must never exceed initial dispatches
  return (value + this.sachetsReturnedSpoiled) <= this.sachetsDispatched;
}, 'QUANTITY INCONSISTENCY: The sum of sold sachets and returned/spoiled assets cannot exceed raw initialized dispatches.');

// Pre-save: Auto calculate finances, gross turnover & net family margin, then verify status
VendorDispatchSchema.pre<IVendorDispatch>('save', function (next) {
  const retailPrice = 0.50;    // Sold to consumers at $0.50 USD
  const wholesaleCost = 0.25;  // Consigned to vendor at $0.25 USD
  const marginPerSachet = 0.25; // Vendor retains $0.25 per sold unit
  
  // 1. Compute financial values
  this.grossCollectedUsd = this.sachetsSold * retailPrice;
  
  // Margins calculated as: (Sold * $0.25 margin) minus (Returned Spoilage wholesale penalties, debited to ensure care)
  const grossProfit = this.sachetsSold * marginPerSachet;
  const spoilageDebit = this.sachetsReturnedSpoiled * wholesaleCost;
  this.netVendorMarginUsd = Math.round((grossProfit - spoilageDebit) * 100) / 100;

  // 2. Automate state auditing status tags
  const cumulativeCount = this.sachetsSold + this.sachetsReturnedSpoiled;
  
  if (cumulativeCount < this.sachetsDispatched) {
    // Vendor has unaccounted inventory leakage or hasn't finished reporting
    this.status = 'SHORTFALL';
  } else if (cumulativeCount > this.sachetsDispatched) {
    // Physical impossibility
    this.status = 'AUDIT_REQUIRED';
  } else {
    // Balancing is mathematically perfect
    this.status = 'SETTLED';
  }
  
  next();
});

// ==========================================
// 4. MAIN MODELS EXPORT
// ==========================================

export const HarvesterSourcingModel: Model<IHarvesterSourcing> = 
  mongoose.models.HarvesterSourcing || mongoose.model<IHarvesterSourcing>('HarvesterSourcing', SourcingTransactionSchema);

export const ProcessingBatchModel: Model<IProcessingBatch> = 
  mongoose.models.ProcessingBatch || mongoose.model<IProcessingBatch>('ProcessingBatch', ProcessingBatchSchema);

export const VendorDispatchModel: Model<IVendorDispatch> = 
  mongoose.models.VendorDispatch || mongoose.model<IVendorDispatch>('VendorDispatch', VendorDispatchSchema);
