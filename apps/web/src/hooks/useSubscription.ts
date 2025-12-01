'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import {
  PLANS,
  hasFeature,
  canCreateVaultItem,
  canUseTwoFactor,
  canShare,
  canUseOrganizations,
  canUseAttachments,
  canUseParentalControls,
  type PlanId,
  type PlanFeatures,
} from '@birchvault/core';

interface SubscriptionState {
  planId: PlanId;  // Effective plan (considering override)
  basePlanId: PlanId;  // Original plan from Stripe
  status: string;
  isLoading: boolean;
  vaultItemsCount: number;
  maxVaultItems: number | null;
  hasActiveOverride: boolean;
  overrideExpiresAt: string | null;
}

/**
 * Determine the effective plan considering any admin override
 */
function getEffectivePlan(
  basePlanId: PlanId,
  planOverride: string | null,
  planOverrideExpiresAt: string | null
): { effectivePlan: PlanId; hasActiveOverride: boolean } {
  if (!planOverride) {
    return { effectivePlan: basePlanId, hasActiveOverride: false };
  }

  // Check if override is expired
  if (planOverrideExpiresAt) {
    const expiresAt = new Date(planOverrideExpiresAt);
    if (expiresAt <= new Date()) {
      // Override has expired
      return { effectivePlan: basePlanId, hasActiveOverride: false };
    }
  }

  // Override is active (no expiry or not yet expired)
  return { 
    effectivePlan: planOverride as PlanId, 
    hasActiveOverride: true 
  };
}

export function useSubscription() {
  const { user } = useAuthStore();
  const [state, setState] = useState<SubscriptionState>({
    planId: 'free',
    basePlanId: 'free',
    status: 'active',
    isLoading: true,
    vaultItemsCount: 0,
    maxVaultItems: 5,
    hasActiveOverride: false,
    overrideExpiresAt: null,
  });

  useEffect(() => {
    if (!user?.id) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    async function fetchSubscription() {
      const supabase = getSupabaseClient();
      
      // Fetch subscription (including override fields) and usage in parallel
      const [subResult, usageResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('plan_id, status, plan_override, plan_override_expires_at')
          .eq('user_id', user!.id)
          .single(),
        supabase
          .from('usage_tracking')
          .select('vault_items_count')
          .eq('user_id', user!.id)
          .single(),
      ]);

      const basePlanId = (subResult.data?.plan_id || 'free') as PlanId;
      const { effectivePlan, hasActiveOverride } = getEffectivePlan(
        basePlanId,
        subResult.data?.plan_override,
        subResult.data?.plan_override_expires_at
      );
      
      const plan = PLANS[effectivePlan];

      setState({
        planId: effectivePlan,
        basePlanId,
        status: subResult.data?.status || 'active',
        isLoading: false,
        vaultItemsCount: usageResult.data?.vault_items_count || 0,
        maxVaultItems: plan.maxVaultItems,
        hasActiveOverride,
        overrideExpiresAt: hasActiveOverride ? subResult.data?.plan_override_expires_at : null,
      });
    }

    fetchSubscription();
  }, [user?.id]);

  const plan = PLANS[state.planId];

  return {
    ...state,
    plan,
    
    // Feature checks (use effective planId)
    canCreateItem: canCreateVaultItem(state.planId, state.vaultItemsCount),
    canUseTwoFactor: canUseTwoFactor(state.planId),
    canShare: canShare(state.planId),
    canUseOrganizations: canUseOrganizations(state.planId),
    canUseAttachments: canUseAttachments(state.planId),
    canUseParentalControls: canUseParentalControls(state.planId),
    
    // Remaining items
    remainingItems: state.maxVaultItems !== null
      ? Math.max(0, state.maxVaultItems - state.vaultItemsCount)
      : null,

    // Check any feature
    hasFeature: (feature: keyof PlanFeatures) => hasFeature(state.planId, feature),

    // Is active subscription
    isActive: state.status === 'active' || state.status === 'trialing',

    // Refresh subscription data
    refresh: async () => {
      if (!user?.id) return;
      
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('subscriptions')
        .select('plan_id, status, plan_override, plan_override_expires_at')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const basePlanId = data.plan_id as PlanId;
        const { effectivePlan, hasActiveOverride } = getEffectivePlan(
          basePlanId,
          data.plan_override,
          data.plan_override_expires_at
        );
        
        setState(prev => ({
          ...prev,
          planId: effectivePlan,
          basePlanId,
          status: data.status,
          maxVaultItems: PLANS[effectivePlan].maxVaultItems,
          hasActiveOverride,
          overrideExpiresAt: hasActiveOverride ? data.plan_override_expires_at : null,
        }));
      }
    },
  };
}


