// ============================================
// Auth State Store (Zustand)
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '@birchvault/supabase-client';

// Plan limits configuration
export const PLAN_LIMITS = {
  free: { maxItems: 5, maxDevices: 1, name: 'Free' },
  premium: { maxItems: null, maxDevices: null, name: 'Premium' },
  families: { maxItems: null, maxDevices: null, name: 'Families' },
  teams: { maxItems: null, maxDevices: null, name: 'Teams' },
  enterprise: { maxItems: null, maxDevices: null, name: 'Enterprise' },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export interface Subscription {
  planId: PlanId;
  planOverride: PlanId | null;
  planOverrideExpiresAt: string | null;
  status: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setSubscription: (subscription: Subscription | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
  
  // Computed helpers
  getEffectivePlan: () => PlanId;
  getPlanLimits: () => { maxItems: number | null; maxDevices: number | null; name: string };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      subscription: null,
      isLoading: true,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setSubscription: (subscription) => set({ subscription }),
      setLoading: (isLoading) => set({ isLoading }),
      clear: () => set({ user: null, session: null, subscription: null, isAuthenticated: false }),
      
      getEffectivePlan: () => {
        const { subscription } = get();
        if (!subscription) return 'free';
        
        // Check for active override
        if (subscription.planOverride) {
          if (subscription.planOverrideExpiresAt) {
            const expiresAt = new Date(subscription.planOverrideExpiresAt);
            if (expiresAt > new Date()) {
              return subscription.planOverride;
            }
          } else {
            // Permanent override
            return subscription.planOverride;
          }
        }
        
        return subscription.planId;
      },
      
      getPlanLimits: () => {
        const effectivePlan = get().getEffectivePlan();
        return PLAN_LIMITS[effectivePlan];
      },
    }),
    {
      name: 'birchvault-auth',
      partialize: (state) => ({
        // Only persist non-sensitive data
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);







