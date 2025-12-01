'use client';

import { useEffect, useState, ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { Shield, Loader2, XCircle } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError('Not logged in');
          setIsLoading(false);
          return;
        }

        console.log('Admin check: Session found for', session.user.email);

        // Verify admin status via API
        const response = await fetch('/api/admin/users?limit=1', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        console.log('Admin check: API response status', response.status);

        if (response.status === 401) {
          setError('Access denied - not an admin');
          setIsLoading(false);
          return;
        }

        if (response.ok) {
          setIsAdmin(true);
        } else {
          const data = await response.json();
          console.log('Admin check: Unexpected response', response.status, data);
          setError(data.error || 'Access denied');
        }
      } catch (err) {
        console.error('Admin check error:', err);
        setError('Failed to verify admin status');
      } finally {
        setIsLoading(false);
      }
    }

    checkAdmin();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            {error || 'You do not have permission to access the admin panel.'}
          </p>
          <a 
            href="/vault" 
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Return to Vault
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">BirchVault Admin</h1>
              <p className="text-xs text-muted-foreground">User & Subscription Management</p>
            </div>
          </div>
          <a 
            href="/vault" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Vault
          </a>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
