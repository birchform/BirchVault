'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, Check, X } from 'lucide-react';
import { register } from '@/lib/auth';
import { useAuthStore } from '@/store/auth';
import { calculatePasswordStrength } from '@birchvault/core';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setSession } = useAuthStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordStrength = calculatePasswordStrength(masterPassword);
  const passwordsMatch = masterPassword === confirmPassword;

  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];

  const requirements = [
    { met: masterPassword.length >= 12, label: 'At least 12 characters' },
    { met: /[A-Z]/.test(masterPassword), label: 'One uppercase letter' },
    { met: /[a-z]/.test(masterPassword), label: 'One lowercase letter' },
    { met: /[0-9]/.test(masterPassword), label: 'One number' },
    { met: /[^A-Za-z0-9]/.test(masterPassword), label: 'One special character' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    if (passwordStrength < 2) {
      setError('Please choose a stronger master password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({ email, masterPassword, name });
      setUser(result.user);
      setSession(result.session);
      // Redirect to email confirmation page
      router.push('/confirm-email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-birch-950/20 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Shield className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">BirchVault</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-center mb-2">Create Your Vault</h1>
          <p className="text-muted-foreground text-center mb-6">
            Your master password is the key to your vault. Choose wisely.
          </p>

          {error && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive rounded-lg p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Name (Optional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Master Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Create a strong master password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {masterPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          level <= passwordStrength ? strengthColors[passwordStrength] : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Strength: {strengthLabels[passwordStrength]}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm Master Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring ${
                  confirmPassword && !passwordsMatch
                    ? 'border-destructive'
                    : 'border-input'
                }`}
                placeholder="Confirm your master password"
                required
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Password Requirements */}
            {masterPassword && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Password Requirements</p>
                <ul className="space-y-1">
                  {requirements.map((req) => (
                    <li key={req.label} className="flex items-center gap-2 text-sm">
                      {req.met ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className={req.met ? 'text-foreground' : 'text-muted-foreground'}>
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-600 dark:text-yellow-400">Important</p>
              <p className="text-muted-foreground mt-1">
                Your master password cannot be recovered if forgotten. We use zero-knowledge
                encryption, meaning we never see or store your password.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !passwordsMatch}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating Vault...' : 'Create Vault'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}




