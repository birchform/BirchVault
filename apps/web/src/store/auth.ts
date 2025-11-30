// ============================================
// Auth State Store (Zustand)
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '@birchvault/supabase-client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
      clear: () => set({ user: null, session: null, isAuthenticated: false }),
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







