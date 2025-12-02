'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function RestoreAccountPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function restoreAccount() {
      if (!token) {
        setStatus('error');
        setMessage('No restore token provided');
        return;
      }

      try {
        const response = await fetch('/api/account/restore', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Your account has been restored successfully!');
          setEmail(data.email || '');
        } else {
          setStatus('error');
          setMessage(data.error || 'Failed to restore account');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An unexpected error occurred');
      }
    }

    restoreAccount();
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
            <Shield className="w-8 h-8 text-primary" />
            BirchVault
          </Link>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">Restoring Your Account</h1>
              <p className="text-muted-foreground">
                Please wait while we restore your account...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">Account Restored!</h1>
              <p className="text-muted-foreground mb-6">
                {message}
                {email && (
                  <>
                    <br />
                    <span className="text-foreground font-medium">{email}</span>
                  </>
                )}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Log In to Your Account
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-semibold mb-2">Restoration Failed</h1>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Go to Login
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center w-full py-3 border border-border rounded-lg font-medium hover:bg-accent transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Need help?{' '}
          <a href="mailto:support@birchvault.com" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}







