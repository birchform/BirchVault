'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

export default function ConfirmEmailPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Get the current user's info
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setEmail(data.user.email);
        setUserId(data.user.id);
        
        // Check if already confirmed
        if (data.user.email_confirmed_at) {
          setIsConfirmed(true);
          setTimeout(() => router.push('/vault'), 1500);
        }
      }
    });

    // Listen for auth state changes (same-browser detection)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          setIsConfirmed(true);
          setTimeout(() => router.push('/vault'), 1500);
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, [router]);

  // Subscribe to Realtime changes on the profiles table
  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabaseClient();

    // Subscribe to changes on this user's profile row
    const channel = supabase
      .channel('email-confirmation')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          // Check if email_confirmed_at was set
          if (payload.new && (payload.new as any).email_confirmed_at) {
            setIsConfirmed(true);
            setTimeout(() => router.push('/vault'), 1500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setCheckMessage(null);
    
    try {
      const supabase = getSupabaseClient();
      
      // Check the profiles table directly for email_confirmed_at
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email_confirmed_at')
          .eq('id', userId)
          .single();
        
        if (profile?.email_confirmed_at) {
          setIsConfirmed(true);
          setTimeout(() => router.push('/vault'), 1500);
          return;
        }
      }

      // Also try refreshing the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (!error && data.user?.email_confirmed_at) {
        setIsConfirmed(true);
        setTimeout(() => router.push('/vault'), 1500);
      } else {
        setCheckMessage('Email not yet confirmed. Please click the link in your email.');
      }
    } catch (error) {
      setCheckMessage('Could not check status. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResendEmail = async () => {
    setIsChecking(true);
    setCheckMessage(null);
    
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      
      if (data.user?.email && data.user?.id) {
        // Use our custom Resend-powered email endpoint
        const response = await fetch('/api/auth/send-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: data.user.email,
            userId: data.user.id,
            userName: data.user.user_metadata?.name,
            type: 'signup',
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          setCheckMessage(result.error || 'Failed to send email');
        } else {
          setCheckMessage('Confirmation email sent! Check your inbox.');
        }
      }
    } catch (error) {
      setCheckMessage('Failed to resend email. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  if (isConfirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-birch-950/20 px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Email Confirmed!</h1>
          <p className="text-muted-foreground">Redirecting you to your vault...</p>
        </div>
      </div>
    );
  }

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
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-primary" />
          </div>

          <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
          <p className="text-muted-foreground mb-6">
            We've sent a confirmation link to
            {email && (
              <span className="block font-medium text-foreground mt-1">{email}</span>
            )}
          </p>

          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-sm text-muted-foreground">
            <p>Click the link in the email to confirm your account.</p>
            <p className="mt-2">This page will automatically detect when you confirm.</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Listening for confirmation...</span>
          </div>

          {checkMessage && (
            <div className={`text-sm mb-4 p-3 rounded-lg ${
              checkMessage.includes('not yet') || checkMessage.includes('Failed') || checkMessage.includes('Could not')
                ? 'bg-red-500/10 text-red-500'
                : 'bg-green-500/10 text-green-500'
            }`}>
              {checkMessage}
            </div>
          )}

          <button
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 mb-3"
          >
            <CheckCircle className={`w-4 h-4 ${isChecking ? 'animate-pulse' : ''}`} />
            {isChecking ? 'Checking...' : 'Check Status Manually'}
          </button>

          <button
            onClick={handleResendEmail}
            disabled={isChecking}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            Resend Confirmation Email
          </button>

          <p className="text-sm text-muted-foreground mt-6">
            Wrong email?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Go back
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
