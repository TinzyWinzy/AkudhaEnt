import mongoose, { Schema, type Document, type Model } from 'mongoose';

export const USER_ROLES = ['field_coordinator', 'processing_admin', 'distribution_manager', 'super_admin'] as const;
export type UserRole = typeof USER_ROLES[number];

export interface IUser extends Document {
  organizationId: string;
  staffId: string;
  email?: string;
  name: string;
  pinHash: string;
  passwordHash?: string;
  role: UserRole;
  region?: string;
  hubId?: string;
  active: boolean;
  refreshTokenHash?: string;
  failedPinAttempts: number;
  pinLockedUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  organizationId: { type: String, required: true, default: 'akudha', index: true },
  staffId: { type: String, required: true, uppercase: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  pinHash: { type: String, required: true, select: false },
  passwordHash: { type: String, select: false },
  role: { type: String, required: true, enum: USER_ROLES },
  region: { type: String, trim: true },
  hubId: { type: String, trim: true },
  active: { type: Boolean, required: true, default: true },
  refreshTokenHash: { type: String, select: false },
  failedPinAttempts: { type: Number, default: 0, select: false },
  pinLockedUntil: { type: Date, select: false },
  lastLoginAt: Date,
}, { timestamps: true });

UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1, staffId: 1 }, { unique: true, partialFilterExpression: { staffId: { $type: 'string' } } });

export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
