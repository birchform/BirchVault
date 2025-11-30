'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, CheckCircle, ArrowRight } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

export default function EmailConfirmedPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    
    // Check if user has a valid session
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });

    // Broadcast to other tabs that email was confirmed
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('birchvault-auth');
      channel.postMessage('email-confirmed');
      channel.close();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-birch-950/20 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Shield className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">BirchVault</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
          <p className="text-muted-foreground mb-6">
            Your email has been successfully verified. Your vault is ready to use.
          </p>

          {isLoggedIn ? (
            <Link
              href="/vault"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Go to My Vault
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Sign In to Your Vault
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <p className="text-sm text-muted-foreground mt-6">
            If you had another tab open, you can close this one.
          </p>
        </div>
      </div>
    </div>
  );
}

