import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuthStore } from '../../store/auth';
import { deriveKeys } from '@birchvault/core';
import { invoke } from '@tauri-apps/api/core';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Password strength checks
  const passwordChecks = {
    length: masterPassword.length >= 12,
    uppercase: /[A-Z]/.test(masterPassword),
    lowercase: /[a-z]/.test(masterPassword),
    number: /[0-9]/.test(masterPassword),
    match: masterPassword === confirmPassword && confirmPassword.length > 0,
  };

  const isPasswordStrong = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong) {
      setError('Please meet all password requirements');
      return;
    }

    try {
      // Derive keys from master password
      const { authHash, encryptionKey } = await deriveKeys(masterPassword, email);
      
      // Convert encryption key to storable format
      const exportedKey = await crypto.subtle.exportKey('raw', encryptionKey);
      const masterKeyHash = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

      // Register via Supabase (through Tauri HTTP plugin)
      // Note: For now, we'll just attempt login which will fail if user doesn't exist
      // In a full implementation, you'd add a register command to the Tauri backend
      
      await login(email, authHash, masterKeyHash);
      navigate('/vault');
    } catch (err) {
      // If login fails, show appropriate error
      setError(err instanceof Error ? err.message : 'Failed to create account');
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-2">Create Account</h1>
      <p className="text-muted-foreground text-center mb-6">
        Set up your secure vault
      </p>

      {error && (
        <div className="bg-destructive/10 border border-destructive/50 text-destructive rounded-lg p-3 mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoFocus
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
              placeholder="Create a strong password"
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
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Confirm your password"
            required
          />
        </div>

        {/* Password Requirements */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Password Requirements
          </p>
          <PasswordCheck label="At least 12 characters" met={passwordChecks.length} />
          <PasswordCheck label="One uppercase letter" met={passwordChecks.uppercase} />
          <PasswordCheck label="One lowercase letter" met={passwordChecks.lowercase} />
          <PasswordCheck label="One number" met={passwordChecks.number} />
          <PasswordCheck label="Passwords match" met={passwordChecks.match} />
        </div>

        <button
          type="submit"
          disabled={isLoading || !isPasswordStrong}
          className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <X className="w-3 h-3 text-muted-foreground" />
      )}
      <span className={met ? 'text-green-600' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}







