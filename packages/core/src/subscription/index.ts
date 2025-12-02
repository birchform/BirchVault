// ============================================
// BirchVault Subscription Module
// Plan limits, feature checks, and utilities
// ============================================

// Plan IDs
export type PlanId = 'free' | 'premium' | 'families' | 'teams' | 'enterprise';

// Device types
export type DeviceType = 'mobile' | 'tablet' | 'computer' | 'browser_extension';

// Feature flags
export interface PlanFeatures {
  folders: boolean;
  totp: boolean;
  webauthn: boolean;
  attachments: boolean;
  sharing: boolean;
  organizations: boolean;
  parental_controls: boolean;
  audit_logs: boolean;
  sso: boolean;
  custom_branding: boolean;
}

// Subscription plan definition
export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number; // In pence (GBP)
  priceYearly: number;
  maxUsers: number | null; // null = unlimited
  maxVaultItems: number | null;
  maxDevices: number | null;
  devicePerType: boolean;
  features: PlanFeatures;
}

// User subscription
export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingCycle?: 'monthly' | 'yearly';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
}

// Usage tracking
export interface UsageTracking {
  userId: string;
  vaultItemsCount: number;
  attachmentsCount: number;
  attachmentsSizeBytes: number;
  sharedItemsCount: number;
}

// Device session
export interface DeviceSession {
  id: string;
  userId: string;
  deviceType: DeviceType;
  deviceName?: string;
  deviceId: string;
  lastActiveAt: Date;
}

// ============================================
// Plan Definitions (GBP pricing in pence)
// ============================================

export const PLANS: Record<PlanId, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic password management',
    priceMonthly: 0,
    priceYearly: 0,
    maxUsers: 1,
    maxVaultItems: 5,
    maxDevices: 1,
    devicePerType: false,
    features: {
      folders: false,
      totp: false,
      webauthn: false,
      attachments: false,
      sharing: false,
      organizations: false,
      parental_controls: false,
      audit_logs: false,
      sso: false,
      custom_branding: false,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'For individuals who want more security',
    priceMonthly: 300, // £3
    priceYearly: 3000, // £30 (2 months free)
    maxUsers: 1,
    maxVaultItems: null,
    maxDevices: null,
    devicePerType: true, // 1 per device type
    features: {
      folders: true,
      totp: true,
      webauthn: true,
      attachments: true,
      sharing: false,
      organizations: false,
      parental_controls: false,
      audit_logs: false,
      sso: false,
      custom_branding: false,
    },
  },
  families: {
    id: 'families',
    name: 'Families',
    description: 'Secure password sharing for your family',
    priceMonthly: 1500, // £15
    priceYearly: 15000, // £150
    maxUsers: 6,
    maxVaultItems: null,
    maxDevices: null,
    devicePerType: true,
    features: {
      folders: true,
      totp: true,
      webauthn: true,
      attachments: true,
      sharing: true,
      organizations: true,
      parental_controls: true,
      audit_logs: false,
      sso: false,
      custom_branding: false,
    },
  },
  teams: {
    id: 'teams',
    name: 'Teams',
    description: 'For small to medium businesses',
    priceMonthly: 400, // £4 per user
    priceYearly: 4000, // £40 per user
    maxUsers: null,
    maxVaultItems: null,
    maxDevices: null,
    devicePerType: true,
    features: {
      folders: true,
      totp: true,
      webauthn: true,
      attachments: true,
      sharing: true,
      organizations: true,
      parental_controls: false,
      audit_logs: true,
      sso: false,
      custom_branding: false,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Advanced security for large organisations',
    priceMonthly: 600, // £6 per user
    priceYearly: 6000, // £60 per user
    maxUsers: null,
    maxVaultItems: null,
    maxDevices: null,
    devicePerType: true,
    features: {
      folders: true,
      totp: true,
      webauthn: true,
      attachments: true,
      sharing: true,
      organizations: true,
      parental_controls: false,
      audit_logs: true,
      sso: true,
      custom_branding: true,
    },
  },
};

// ============================================
// Feature Check Utilities
// ============================================

/**
 * Check if a plan has a specific feature
 */
export function hasFeature(planId: PlanId, feature: keyof PlanFeatures): boolean {
  const plan = PLANS[planId];
  return plan?.features[feature] ?? false;
}

/**
 * Check if user can create more vault items
 */
export function canCreateVaultItem(planId: PlanId, currentCount: number): boolean {
  const plan = PLANS[planId];
  if (!plan) return false;
  if (plan.maxVaultItems === null) return true;
  return currentCount < plan.maxVaultItems;
}

/**
 * Get remaining vault item slots
 */
export function getRemainingVaultItems(planId: PlanId, currentCount: number): number | null {
  const plan = PLANS[planId];
  if (!plan || plan.maxVaultItems === null) return null;
  return Math.max(0, plan.maxVaultItems - currentCount);
}

/**
 * Check if user can add more devices
 */
export function canAddDevice(
  planId: PlanId,
  deviceType: DeviceType,
  currentSessions: DeviceSession[]
): boolean {
  const plan = PLANS[planId];
  if (!plan) return false;

  // Free tier: only 1 device total
  if (planId === 'free') {
    return currentSessions.length === 0;
  }

  // Other tiers with devicePerType: 1 per type
  if (plan.devicePerType) {
    const sameTypeSessions = currentSessions.filter(s => s.deviceType === deviceType);
    return sameTypeSessions.length === 0;
  }

  // Unlimited devices
  if (plan.maxDevices === null) return true;

  return currentSessions.length < plan.maxDevices;
}

/**
 * Get devices that would be logged out when adding a new device
 */
export function getDevicesToLogout(
  planId: PlanId,
  deviceType: DeviceType,
  newDeviceId: string,
  currentSessions: DeviceSession[]
): DeviceSession[] {
  const plan = PLANS[planId];
  if (!plan) return [];

  // Free tier: logout all other devices
  if (planId === 'free') {
    return currentSessions.filter(s => s.deviceId !== newDeviceId);
  }

  // Device per type: logout same type devices
  if (plan.devicePerType) {
    return currentSessions.filter(
      s => s.deviceType === deviceType && s.deviceId !== newDeviceId
    );
  }

  return [];
}

/**
 * Check if user can use 2FA (TOTP or WebAuthn)
 */
export function canUseTwoFactor(planId: PlanId): boolean {
  return hasFeature(planId, 'totp') || hasFeature(planId, 'webauthn');
}

/**
 * Check if user can use folders to organize vault items
 */
export function canUseFolders(planId: PlanId): boolean {
  return hasFeature(planId, 'folders');
}

/**
 * Check if user can share items
 */
export function canShare(planId: PlanId): boolean {
  return hasFeature(planId, 'sharing');
}

/**
 * Check if user can create/join organisations
 */
export function canUseOrganisations(planId: PlanId): boolean {
  return hasFeature(planId, 'organizations');
}

// Legacy alias for backwards compatibility
export const canUseOrganizations = canUseOrganisations;

/**
 * Check if user can use attachments
 */
export function canUseAttachments(planId: PlanId): boolean {
  return hasFeature(planId, 'attachments');
}

/**
 * Check if user can use parental controls
 */
export function canUseParentalControls(planId: PlanId): boolean {
  return hasFeature(planId, 'parental_controls');
}

/**
 * Check if organisation can view audit logs
 */
export function canViewAuditLogs(planId: PlanId): boolean {
  return hasFeature(planId, 'audit_logs');
}

/**
 * Check if organisation can use SSO
 */
export function canUseSSO(planId: PlanId): boolean {
  return hasFeature(planId, 'sso');
}

// ============================================
// Pricing Utilities
// ============================================

/**
 * Format price in GBP
 */
export function formatPrice(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pounds);
}

/**
 * Get monthly equivalent price (for yearly plans)
 */
export function getMonthlyEquivalent(yearlyPence: number): number {
  return Math.round(yearlyPence / 12);
}

/**
 * Calculate yearly savings
 */
export function getYearlySavings(planId: PlanId): number {
  const plan = PLANS[planId];
  if (!plan) return 0;
  const monthlyTotal = plan.priceMonthly * 12;
  return monthlyTotal - plan.priceYearly;
}

/**
 * Get all available plans sorted by price
 */
export function getAvailablePlans(): SubscriptionPlan[] {
  return Object.values(PLANS).sort((a, b) => a.priceMonthly - b.priceMonthly);
}

/**
 * Check if a plan is better than another
 */
export function isPlanUpgrade(currentPlan: PlanId, newPlan: PlanId): boolean {
  const planOrder: PlanId[] = ['free', 'premium', 'families', 'teams', 'enterprise'];
  return planOrder.indexOf(newPlan) > planOrder.indexOf(currentPlan);
}

// ============================================
// Subscription Status Utilities
// ============================================

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(subscription: Subscription): boolean {
  return subscription.status === 'active' || subscription.status === 'trialing';
}

/**
 * Check if subscription is expiring soon (within 7 days)
 */
export function isExpiringSoon(subscription: Subscription): boolean {
  if (!subscription.currentPeriodEnd) return false;
  const daysUntilExpiry = Math.ceil(
    (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
}

/**
 * Get days until subscription expires
 */
export function getDaysUntilExpiry(subscription: Subscription): number | null {
  if (!subscription.currentPeriodEnd) return null;
  return Math.ceil(
    (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

// ============================================
// Device Detection Utilities
// ============================================

/**
 * Detect device type from user agent
 */
export function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  
  // Check for mobile
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile';
  }
  
  // Check for tablet
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 'tablet';
  }
  
  // Check for browser extension
  if (/chrome-extension|moz-extension|safari-extension/i.test(ua)) {
    return 'browser_extension';
  }
  
  // Default to computer
  return 'computer';
}

/**
 * Generate a unique device ID
 */
export function generateDeviceId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}




