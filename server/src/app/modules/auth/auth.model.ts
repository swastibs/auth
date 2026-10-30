import crypto from "node:crypto";
import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";

import {
  BCRYPT_SALT_ROUNDS,
  JWT_ACCESS_EXPIRE,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_EXPIRE,
  JWT_REFRESH_SECRET,
} from "../../shared/config/env.config.js";
import {
  AccountStatus,
  AuthProvider,
  EMAIL_VERIFY_EXPIRE_MS,
  LOCK_TIME_MS,
  MAX_LOGIN_ATTEMPTS,
  MAX_REFRESH_SESSIONS,
  PASSWORD_RESET_EXPIRE_MS,
  SubscriptionStatus,
  SubscriptionTier,
  UserRole,
} from "./auth.constants.js";

/* ────────────────────────── Sub-document types ───────────────────────── */

export interface IRefreshTokenSession {
  token: string; // SHA-256 hash of the refresh JWT
  device?: string;
  ip?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IUserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  weekStartsOn: 0 | 1;
  notifications: {
    email: boolean;
    push: boolean;
    taskReminders: boolean;
    habitReminders: boolean;
    weeklyReports: boolean;
  };
}

export interface ISubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startedAt?: Date;
  expiresAt?: Date;
  paymentProvider: "none" | "stripe" | "razorpay";
  providerCustomerId?: string;
  providerSubscriptionId?: string;
}

/* ────────────────────────── Public document type ──────────────────────── */

export interface IUser {
  // Identity
  name: string;
  email: string;
  password?: string; // hashed; undefined for OAuth-only users
  avatar?: string;
  phone?: string;

  // Auth & security
  role: UserRole;
  provider: AuthProvider;
  providerId?: string;
  status: AccountStatus;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  lastActiveAt?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  refreshTokenSessions: IRefreshTokenSession[];

  // App-specific
  timezone: string;
  onboardingCompleted: boolean;
  preferences: IUserPreferences;
  subscription: ISubscription;
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate?: Date;
  tasksCompletedTotal: number;
  habitsCompletedTotal: number;

  // Meta
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ────────────────────────── Instance methods ──────────────────────────── */

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;

  generateAccessToken(): string;
  generateRefreshToken(): string;

  addRefreshTokenSession(
    plainToken: string,
    meta?: { device?: string; ip?: string; userAgent?: string },
  ): Promise<HydratedDocument<IUser, IUserMethods>>;

  removeRefreshTokenSession(
    plainToken: string,
  ): Promise<HydratedDocument<IUser, IUserMethods>>;

  removeAllRefreshTokenSessions(): Promise<
    HydratedDocument<IUser, IUserMethods>
  >;

  rotateRefreshTokenSession(
    oldPlain: string,
    newPlain: string,
    meta?: { device?: string; ip?: string; userAgent?: string },
  ): Promise<{ rotated: boolean }>;

  isLocked(): boolean;
  incLoginAttempts(): Promise<HydratedDocument<IUser, IUserMethods>>;
  resetLoginAttempts(): Promise<HydratedDocument<IUser, IUserMethods>>;

  createEmailVerificationToken(): string;
  createPasswordResetToken(): string;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

/* ────────────────────────── Helpers ───────────────────────────────────── */

const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

/** Parses a jwt-style duration string like "15m" / "7d" into milliseconds. */
const durationToMs = (raw: string): number => {
  const match = /^(\d+)\s*([smhd])$/.exec(raw.trim());
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2];
  if (!unit) return 0;
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const multiplier = multipliers[unit];
  return multiplier ? value * multiplier : 0;
};

const generateReadableReferralCode = (): string =>
  crypto.randomBytes(4).toString("hex").toUpperCase();

/* ────────────────────────── Sub-schemas ───────────────────────────────── */

const RefreshTokenSessionSchema = new Schema<IRefreshTokenSession>(
  {
    token: { type: String, required: true },
    device: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const PreferencesSchema = new Schema<IUserPreferences>(
  {
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
    language: { type: String, default: "en" },
    weekStartsOn: { type: Number, enum: [0, 1], default: 1 },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      taskReminders: { type: Boolean, default: true },
      habitReminders: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: true },
    },
  },
  { _id: false },
);

const SubscriptionSchema = new Schema<ISubscription>(
  {
    tier: {
      type: String,
      enum: Object.values(SubscriptionTier),
      default: SubscriptionTier.FREE,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.NONE,
    },
    startedAt: { type: Date },
    expiresAt: { type: Date },
    paymentProvider: {
      type: String,
      enum: ["none", "stripe", "razorpay"],
      default: "none",
    },
    providerCustomerId: { type: String },
    providerSubscriptionId: { type: String },
  },
  { _id: false },
);

/* ────────────────────────── Main schema ───────────────────────────────── */

const UserSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    /* Identity */
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
    },
    avatar: { type: String },
    phone: { type: String, trim: true },

    /* Auth & security */
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    provider: {
      type: String,
      enum: Object.values(AuthProvider),
      default: AuthProvider.LOCAL,
    },
    providerId: { type: String, index: true, sparse: true },
    status: {
      type: String,
      enum: Object.values(AccountStatus),
      default: AccountStatus.ACTIVE,
    },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLogin: { type: Date },
    lastActiveAt: { type: Date },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    refreshTokenSessions: {
      type: [RefreshTokenSessionSchema],
      default: [],
      select: false,
    },

    /* App-specific */
    timezone: { type: String, default: "UTC" },
    onboardingCompleted: { type: Boolean, default: false },
    preferences: { type: PreferencesSchema, default: () => ({}) },
    subscription: { type: SubscriptionSchema, default: () => ({}) },
    referralCode: {
      type: String,
    },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    totalXp: { type: Number, default: 0, min: 0 },
    currentLevel: { type: Number, default: 1, min: 1 },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastCompletionDate: { type: Date },
    tasksCompletedTotal: { type: Number, default: 0, min: 0 },
    habitsCompletedTotal: { type: Number, default: 0, min: 0 },

    /* Soft delete */
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        const publicUser = ret as Record<string, unknown>;
        delete publicUser.password;
        delete publicUser.refreshTokenSessions;
        delete publicUser.emailVerificationToken;
        delete publicUser.emailVerificationExpires;
        delete publicUser.passwordResetToken;
        delete publicUser.passwordResetExpires;
        delete publicUser.loginAttempts;
        delete publicUser.lockUntil;
        return ret;
      },
    },
  },
);

/* ────────────────────────── Indexes ───────────────────────────────────── */

UserSchema.index({ email: 1, status: 1 });
UserSchema.index({ deletedAt: 1 });
UserSchema.index({ referralCode: 1 }, { unique: true, sparse: true });

/* ────────────────────────── Virtuals ──────────────────────────────────── */

UserSchema.virtual("fullName").get(function (this: IUser) {
  return this.name;
});

UserSchema.virtual("isEmailVerifiedBool").get(function (this: IUser) {
  return this.isEmailVerified;
});

UserSchema.set("toObject", { virtuals: true });

/* ────────────────────────── Middleware ────────────────────────────────── */

/**
 * Hash password on create/update.
 * Only runs if the password field was actually set/changed.
 */
UserSchema.pre("save", async function () {
  // Auto-generate referral code on first save
  if (!this.referralCode) {
    let candidate = generateReadableReferralCode();
    // Extremely low chance of collision, but loop to be safe
    while (
      await (this.constructor as UserModel).exists({ referralCode: candidate })
    ) {
      candidate = generateReadableReferralCode();
    }
    this.referralCode = candidate;
  }

  if (!this.isModified("password") || !this.password) return;

  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ────────────────────────── Methods ───────────────────────────────────── */

UserSchema.methods.comparePassword = async function (
  this: UserDocument,
  candidate: string,
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.generateAccessToken = function (this: UserDocument): string {
  const payload = {
    sub: this._id.toString(),
    email: this.email,
    role: this.role,
    type: "access" as const,
  };

  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRE,
  } as SignOptions);
};

UserSchema.methods.generateRefreshToken = function (
  this: UserDocument,
): string {
  const payload = {
    sub: this._id.toString(),
    type: "refresh" as const,
    // jti makes each refresh token unique even if generated in the same second
    jti: crypto.randomUUID(),
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE,
  } as SignOptions);
};

UserSchema.methods.addRefreshTokenSession = async function (
  this: UserDocument,
  plainToken: string,
  meta: { device?: string; ip?: string; userAgent?: string } = {},
): Promise<UserDocument> {
  const now = new Date();
  const ttlMs = durationToMs(JWT_REFRESH_EXPIRE) || 7 * 24 * 60 * 60 * 1000;

  // Drop expired sessions
  this.refreshTokenSessions = this.refreshTokenSessions.filter(
    (session) => session.expiresAt > now,
  );

  // Cap number of concurrent devices
  if (this.refreshTokenSessions.length >= MAX_REFRESH_SESSIONS) {
    this.refreshTokenSessions.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
    this.refreshTokenSessions.shift();
  }

  this.refreshTokenSessions.push({
    token: sha256(plainToken),
    ...(meta.device !== undefined && { device: meta.device }),
    ...(meta.ip !== undefined && { ip: meta.ip }),
    ...(meta.userAgent !== undefined && { userAgent: meta.userAgent }),
    expiresAt: new Date(now.getTime() + ttlMs),
    createdAt: now,
  });

  return this.save();
};

UserSchema.methods.removeRefreshTokenSession = async function (
  this: UserDocument,
  plainToken: string,
): Promise<UserDocument> {
  const hash = sha256(plainToken);
  this.refreshTokenSessions = this.refreshTokenSessions.filter(
    (session) => session.token !== hash,
  );
  return this.save();
};

UserSchema.methods.removeAllRefreshTokenSessions = async function (
  this: UserDocument,
): Promise<UserDocument> {
  this.refreshTokenSessions = [];
  return this.save();
};

UserSchema.methods.rotateRefreshTokenSession = async function (
  this: UserDocument,
  oldPlain: string,
  newPlain: string,
  meta: { device?: string; ip?: string; userAgent?: string } = {},
): Promise<{ rotated: boolean }> {
  const now = new Date();
  const oldHash = sha256(oldPlain);
  const newHash = sha256(newPlain);
  const ttlMs = durationToMs(JWT_REFRESH_EXPIRE) || 7 * 24 * 60 * 60 * 1000;
  const newSession: IRefreshTokenSession = {
    token: newHash,
    ...(meta.device !== undefined && { device: meta.device }),
    ...(meta.ip !== undefined && { ip: meta.ip }),
    ...(meta.userAgent !== undefined && { userAgent: meta.userAgent }),
    expiresAt: new Date(now.getTime() + ttlMs),
    createdAt: now,
  };
  const sessionsExpression = { $ifNull: ["$refreshTokenSessions", []] };
  const remainingSessions = {
    $filter: {
      input: sessionsExpression,
      as: "session",
      cond: {
        $and: [
          { $ne: ["$$session.token", oldHash] },
          { $gt: ["$$session.expiresAt", now] },
        ],
      },
    },
  };
  const tokenExists = {
    $in: [
      oldHash,
      {
        $map: {
          input: sessionsExpression,
          as: "session",
          in: "$$session.token",
        },
      },
    ],
  };
  const cappedSessions = {
    $cond: [
      { $gte: [{ $size: "$$remaining" }, MAX_REFRESH_SESSIONS] },
      {
        $slice: [
          {
            $sortArray: {
              input: "$$remaining",
              sortBy: { createdAt: 1 },
            },
          },
          1,
          MAX_REFRESH_SESSIONS - 1,
        ],
      },
      "$$remaining",
    ],
  };

  const updatedUser = await (this.constructor as UserModel)
    .findOneAndUpdate(
      { _id: this._id },
      [
        {
          $set: {
            refreshTokenSessions: {
              $cond: [
                tokenExists,
                {
                  $let: {
                    vars: { remaining: remainingSessions },
                    in: {
                      $concatArrays: [
                        cappedSessions,
                        { $literal: [newSession] },
                      ],
                    },
                  },
                },
                [],
              ],
            },
          },
        },
      ],
      { new: true, projection: { refreshTokenSessions: 1 } },
    )
    .select("+refreshTokenSessions");

  if (!updatedUser) return { rotated: false };

  this.refreshTokenSessions = updatedUser.refreshTokenSessions;
  return {
    rotated: this.refreshTokenSessions.some(
      (session) => session.token === newHash,
    ),
  };
};

UserSchema.methods.isLocked = function (this: UserDocument): boolean {
  return !!(this.lockUntil && this.lockUntil.getTime() > Date.now());
};

UserSchema.methods.incLoginAttempts = async function (
  this: UserDocument,
): Promise<UserDocument> {
  // Reset lock if the previous lock already expired
  if (this.lockUntil && this.lockUntil.getTime() < Date.now()) {
    this.loginAttempts = 1;
    this.set("lockUntil", undefined);
  } else {
    this.loginAttempts += 1;
  }

  if (this.loginAttempts >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
    this.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
  }

  return this.save();
};

UserSchema.methods.resetLoginAttempts = async function (
  this: UserDocument,
): Promise<UserDocument> {
  this.loginAttempts = 0;
  this.set("lockUntil", undefined);
  return this.save();
};

UserSchema.methods.createEmailVerificationToken = function (
  this: UserDocument,
): string {
  const plain = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = sha256(plain);
  this.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFY_EXPIRE_MS);
  return plain;
};

UserSchema.methods.createPasswordResetToken = function (
  this: UserDocument,
): string {
  const plain = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = sha256(plain);
  this.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_EXPIRE_MS);
  return plain;
};

/* ────────────────────────── Export ────────────────────────────────────── */

const User: UserModel =
  (mongoose.models.User as UserModel) ??
  mongoose.model<IUser, UserModel>("User", UserSchema);

export default User;
