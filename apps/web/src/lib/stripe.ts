// ============================================
// BirchVault Stripe Client Utilities
// ============================================

import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

/**
 * Get Stripe.js instance (client-side)
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

/**
 * Create a checkout session and redirect
 */
export async function redirectToCheckout(priceId: string, billingCycle: 'monthly' | 'yearly') {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, billingCycle }),
  });

  const { url, error } = await response.json();

  if (error) {
    throw new Error(error);
  }

  if (!url) {
    throw new Error('No checkout URL returned');
  }

  // Redirect to Stripe Checkout
  window.location.href = url;
}

/**
 * Redirect to customer portal for subscription management
 */
export async function redirectToCustomerPortal() {
  const response = await fetch('/api/stripe/portal', {
    method: 'POST',
  });

  const { url, error } = await response.json();

  if (error) {
    throw new Error(error);
  }

  window.location.href = url;
}

// Plan to Stripe Price ID mapping (to be configured in Stripe Dashboard)
export const STRIPE_PRICE_IDS = {
  premium: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID || '',
  },
  families: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_FAMILIES_MONTHLY_PRICE_ID || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_FAMILIES_YEARLY_PRICE_ID || '',
  },
  teams: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_TEAMS_MONTHLY_PRICE_ID || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_TEAMS_YEARLY_PRICE_ID || '',
  },
  enterprise: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_YEARLY_PRICE_ID || '',
  },
};

export type PaidPlanId = keyof typeof STRIPE_PRICE_IDS;

/**
 * Get the Stripe Price ID for a plan
 */
export function getStripePriceId(planId: PaidPlanId, billingCycle: 'monthly' | 'yearly'): string {
  return STRIPE_PRICE_IDS[planId][billingCycle];
}


