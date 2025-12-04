// ============================================
// Desktop Auth Store (Zustand)
// ============================================

import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { fetch } from '@tauri-apps/plugin-http';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

export type PlanId = 'free' | 'premium' | 'family' | 'enterprise';

export interface User {
  id: string;
  email: string;
}

export interface Subscription {
  planId: PlanId;
  planOverride: PlanId | null;
  planOverrideExpiresAt: string | null;
  status: string;
}

interface PlanLimits {
  name: string;
  maxItems: number | null;
  maxFolders: number | null;
  canShare: boolean;
  canUseOrgs: boolean;
}

const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { name: 'Free', maxItems: 5, maxFolders: null, canShare: false, canUseOrgs: false },
  premium: { name: 'Premium', maxItems: null, maxFolders: null, canShare: true, canUseOrgs: false },
  family: { name: 'Family', maxItems: null, maxFolders: null, canShare: true, canUseOrgs: true },
  enterprise: { name: 'Enterprise', maxItems: null, maxFolders: null, canShare: true, canUseOrgs: true },
};

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  accessToken: string | null;
  isLoading: boolean;
  isLocked: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setLocked: (locked: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  getEffectivePlan: () => PlanId;
  getPlanLimits: () => PlanLimits;
  
  // API Actions
  login: (email: string, passwordHash: string, masterKeyHash: string) => Promise<{ userId: string; email: string; accessToken: string }>;
  logout: () => Promise<void>;
  unlock: (masterKeyHash: string) => Promise<{ userId: string; email: string }>;
  lock: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  fetchSubscription: (userId: string, accessToken: string) => Promise<void>;
  
  clear: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  subscription: null,
  accessToken: null,
  isLoading: false,
  isLocked: true,
  error: null,

  setUser: (user) => set({ user }),
  setSubscription: (subscription) => set({ subscription }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setLoading: (isLoading) => set({ isLoading }),
  setLocked: (isLocked) => set({ isLocked }),
  setError: (error) => set({ error }),

  getEffectivePlan: () => {
    const { subscription } = get();
    if (!subscription) return 'free';
    
    // Check for plan override
    if (subscription.planOverride) {
      // If no expiry date, it's permanent
      if (!subscription.planOverrideExpiresAt) {
        return subscription.planOverride;
      }
      // If there's an expiry date, check if it's still valid
      const expiresAt = new Date(subscription.planOverrideExpiresAt);
      if (expiresAt > new Date()) {
        return subscription.planOverride;
      }
    }
    
    return subscription.planId;
  },

  getPlanLimits: () => {
    const plan = get().getEffectivePlan();
    return PLAN_LIMITS[plan];
  },

  login: async (email, passwordHash, masterKeyHash) => {
    set({ isLoading: true, error: null });
    try {
      // Login via Rust backend (handles Supabase auth)
      const result = await invoke<{ userId: string; email: string; accessToken: string }>('login', {
        request: { email, passwordHash, masterKeyHash },
      });
      
      set({
        user: { id: result.userId, email: result.email },
        accessToken: result.accessToken,
        isLocked: false,
        isLoading: false,
      });

      return result;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await invoke('logout');
      set({
        user: null,
        subscription: null,
        accessToken: null,
        isLocked: true,
        isLoading: false,
      });
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  unlock: async (masterKeyHash) => {
    set({ isLoading: true, error: null });
    try {
      const result = await invoke<{ userId: string; email: string; accessToken: string }>('unlock_vault', {
        masterKeyHash,
      });
      
      set({
        user: { id: result.userId, email: result.email },
        accessToken: result.accessToken,
        isLocked: false,
        isLoading: false,
      });

      return result;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  lock: async () => {
    try {
      await invoke('lock_vault');
      set({ isLocked: true });
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  checkSession: async () => {
    try {
      const hasSession = await invoke<boolean>('has_stored_session');
      const isLocked = await invoke<boolean>('is_vault_locked');
      
      if (hasSession && !isLocked) {
        const session = await invoke<{ userId: string; email: string; accessToken: string } | null>('get_session');
        if (session) {
          set({
            user: { id: session.userId, email: session.email },
            accessToken: session.accessToken,
            isLocked: false,
          });
          
          // Fetch subscription data
          try {
            await get().fetchSubscription(session.userId, session.accessToken);
          } catch (e) {
            console.error('Failed to fetch subscription:', e);
          }
          
          return true;
        }
      }
      
      set({ isLocked: true });
      return hasSession;
    } catch (error) {
      set({ isLocked: true });
      return false;
    }
  },

  fetchSubscription: async (userId: string, accessToken: string) => {
    try {
      const url = `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&select=plan_id,status,plan_override,plan_override_expires_at`;
      console.log('[Auth] Fetching subscription for user:', userId);
      console.log('[Auth] URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Auth] Subscription response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Auth] Failed to fetch subscription:', response.status, errorText);
        // Default to free plan if fetch fails
        set({
          subscription: {
            planId: 'free',
            planOverride: null,
            planOverrideExpiresAt: null,
            status: 'active',
          },
        });
        return;
      }

      const data = await response.json() as Array<{
        plan_id: string;
        status: string;
        plan_override: string | null;
        plan_override_expires_at: string | null;
      }>;

      console.log('[Auth] Subscription data:', JSON.stringify(data));

      if (data && data.length > 0) {
        const sub = data[0];
        console.log('[Auth] Found subscription:', sub.plan_id, 'override:', sub.plan_override);
        set({
          subscription: {
            planId: (sub.plan_id || 'free') as PlanId,
            planOverride: sub.plan_override as PlanId | null,
            planOverrideExpiresAt: sub.plan_override_expires_at,
            status: sub.status || 'active',
          },
        });
      } else {
        console.log('[Auth] No subscription found, defaulting to free');
        // No subscription found, default to free
        set({
          subscription: {
            planId: 'free',
            planOverride: null,
            planOverrideExpiresAt: null,
            status: 'active',
          },
        });
      }
    } catch (error) {
      console.error('[Auth] Error fetching subscription:', error);
      // Default to free plan on error
      set({
        subscription: {
          planId: 'free',
          planOverride: null,
          planOverrideExpiresAt: null,
          status: 'active',
        },
      });
    }
  },

  clear: () => set({
    user: null,
    subscription: null,
    accessToken: null,
    isLocked: true,
    error: null,
  }),
}));





