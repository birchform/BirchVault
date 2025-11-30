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
  planId: PlanId;
  status: string;
  isLoading: boolean;
  vaultItemsCount: number;
  maxVaultItems: number | null;
}

export function useSubscription() {
  const { user } = useAuthStore();
  const [state, setState] = useState<SubscriptionState>({
    planId: 'free',
    status: 'active',
    isLoading: true,
    vaultItemsCount: 0,
    maxVaultItems: 5,
  });

  useEffect(() => {
    if (!user?.id) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    async function fetchSubscription() {
      const supabase = getSupabaseClient();
      
      // Fetch subscription and usage in parallel
      const [subResult, usageResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('plan_id, status')
          .eq('user_id', user!.id)
          .single(),
        supabase
          .from('usage_tracking')
          .select('vault_items_count')
          .eq('user_id', user!.id)
          .single(),
      ]);

      const planId = (subResult.data?.plan_id || 'free') as PlanId;
      const plan = PLANS[planId];

      setState({
        planId,
        status: subResult.data?.status || 'active',
        isLoading: false,
        vaultItemsCount: usageResult.data?.vault_items_count || 0,
        maxVaultItems: plan.maxVaultItems,
      });
    }

    fetchSubscription();
  }, [user?.id]);

  const plan = PLANS[state.planId];

  return {
    ...state,
    plan,
    
    // Feature checks
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
        .select('plan_id, status')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const planId = data.plan_id as PlanId;
        setState(prev => ({
          ...prev,
          planId,
          status: data.status,
          maxVaultItems: PLANS[planId].maxVaultItems,
        }));
      }
    },
  };
}


