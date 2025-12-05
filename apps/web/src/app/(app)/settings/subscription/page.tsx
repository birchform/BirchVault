'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Shield,
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { redirectToCustomerPortal } from '@/lib/stripe';
import { useAuthStore } from '@/store/auth';
import { PLANS, formatPrice, type PlanId } from '@birchvault/core';

interface SubscriptionData {
  plan_id: PlanId;
  status: string;
  billing_cycle: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
}

export default function SubscriptionPage() {
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Check for success/cancel from Stripe
    if (searchParams.get('success')) {
      setMessage({ type: 'success', text: 'Your subscription has been updated successfully!' });
    } else if (searchParams.get('canceled')) {
      setMessage({ type: 'error', text: 'Subscription process was canceled.' });
    }

    // Fetch subscription data
    fetchSubscription();
  }, [searchParams]);

  async function fetchSubscription() {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('vault_subscriptions')
        .select('plan_id, status, billing_cycle, current_period_end, cancel_at_period_end, trial_end')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      await redirectToCustomerPortal();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to open subscription portal' });
      setPortalLoading(false);
    }
  }

  const currentPlan = subscription ? PLANS[subscription.plan_id] : PLANS.free;
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue = subscription?.status === 'past_due';
  const isCanceling = subscription?.cancel_at_period_end;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/vault"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Subscription</h1>
              <p className="text-sm text-muted-foreground">Manage your BirchVault subscription</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-500/10 text-green-500'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold">{currentPlan.name} Plan</h2>
                {isTrialing && (
                  <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                    Trial
                  </span>
                )}
                {isPastDue && (
                  <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-500 rounded-full">
                    Past Due
                  </span>
                )}
                {isCanceling && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-500/10 text-yellow-500 rounded-full">
                    Canceling
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">{currentPlan.description}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {formatPrice(
                  subscription?.billing_cycle === 'yearly'
                    ? currentPlan.priceYearly / 12
                    : currentPlan.priceMonthly
                )}
                <span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              {subscription?.billing_cycle === 'yearly' && (
                <p className="text-xs text-muted-foreground">
                  Billed {formatPrice(currentPlan.priceYearly)} yearly
                </p>
              )}
            </div>
          </div>

          {/* Subscription Details */}
          {subscription && subscription.plan_id !== 'free' && (
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isCanceling ? 'Access until' : 'Next billing date'}
                  </p>
                  <p className="font-medium">
                    {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billing cycle</p>
                  <p className="font-medium capitalize">
                    {subscription.billing_cycle || 'Monthly'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trial Info */}
          {isTrialing && subscription?.trial_end && (
            <div className="mt-4 p-3 bg-primary/5 rounded-lg">
              <p className="text-sm">
                <Sparkles className="w-4 h-4 inline mr-2 text-primary" />
                Your free trial ends on{' '}
                <strong>
                  {new Date(subscription.trial_end).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </strong>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            {subscription?.plan_id !== 'free' ? (
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {portalLoading ? (
                  'Loading...'
                ) : (
                  <>
                    Manage Subscription
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <Link
                href="/pricing"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Upgrade Plan
                <Sparkles className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Your Plan Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FeatureItem
              label="Vault items"
              value={currentPlan.maxVaultItems === null ? 'Unlimited' : `${currentPlan.maxVaultItems} items`}
            />
            <FeatureItem
              label="Devices"
              value={
                currentPlan.maxDevices === 1
                  ? '1 device'
                  : currentPlan.devicePerType
                  ? '1 per device type'
                  : 'Unlimited'
              }
            />
            <FeatureItem
              label="Two-factor authentication"
              enabled={currentPlan.features.totp}
            />
            <FeatureItem
              label="File attachments"
              enabled={currentPlan.features.attachments}
            />
            <FeatureItem
              label="Secure sharing"
              enabled={currentPlan.features.sharing}
            />
            <FeatureItem
              label="Organisations"
              enabled={currentPlan.features.organizations}
            />
            <FeatureItem
              label="Parental controls"
              enabled={currentPlan.features.parental_controls}
            />
            <FeatureItem
              label="Audit logs"
              enabled={currentPlan.features.audit_logs}
            />
          </div>

          {subscription?.plan_id === 'free' && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Upgrade to Premium or higher to unlock all features including unlimited vault items,
                multi-device sync, 2FA, and more.
              </p>
              <Link
                href="/pricing"
                className="inline-block mt-3 text-primary hover:underline text-sm font-medium"
              >
                View all plans →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function FeatureItem({
  label,
  value,
  enabled,
}: {
  label: string;
  value?: string;
  enabled?: boolean;
}) {
  const isEnabled = value !== undefined || enabled;

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          isEnabled ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'
        }`}
      >
        {isEnabled ? (
          <CheckCircle className="w-3.5 h-3.5" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-current" />
        )}
      </div>
      <div>
        <span className={isEnabled ? '' : 'text-muted-foreground'}>{label}</span>
        {value && <span className="ml-2 text-sm text-muted-foreground">({value})</span>}
      </div>
    </div>
  );
}


