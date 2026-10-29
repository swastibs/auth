export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  SUPER_ADMIN = "super_admin",
}

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
  GITHUB = "github",
}

export enum AccountStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DELETED = "deleted",
}

export enum SubscriptionTier {
  FREE = "free",
  PRO = "pro",
  TEAM = "team",
}

export enum SubscriptionStatus {
  NONE = "none",
  TRIALING = "trialing",
  ACTIVE = "active",
  PAST_DUE = "past_due",
  CANCELED = "canceled",
}

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_REFRESH_SESSIONS = 5; // devices per user
export const EMAIL_VERIFY_EXPIRE_MS = 24 * 60 * 60 * 1000; // 24h
export const PASSWORD_RESET_EXPIRE_MS = 60 * 60 * 1000; // 1h
