'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useVaultStore } from '@/store/vault';
import { getSupabaseClient } from '@/lib/supabase';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, setUser, setSession, setLoading } = useAuthStore();
  const { encryptionKey } = useVaultStore();

  // Initialize auth state from Supabase session on mount
  useEffect(() => {
    const initAuth = async () => {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        setSession(session);
      }
      setLoading(false);
    };

    initAuth();
  }, [setUser, setSession, setLoading]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect to unlock if no encryption key (but not if already on unlock page)
  useEffect(() => {
    if (!isLoading && isAuthenticated && !encryptionKey && pathname !== '/unlock') {
      router.push('/unlock');
    }
  }, [isLoading, isAuthenticated, encryptionKey, pathname, router]);

  // Show nothing while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
