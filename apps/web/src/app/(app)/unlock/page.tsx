'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, Lock } from 'lucide-react';
import { deriveKeys, decryptSymmetricKey, generateSymmetricKey, encryptSymmetricKey } from '@birchvault/core';
import { getSupabaseClient } from '@/lib/supabase';
import { useVaultStore } from '@/store/vault';
import { useAuthStore } from '@/store/auth';

export default function UnlockPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setEncryptionKey } = useVaultStore();
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!user?.email) {
        setError('No user session found');
        setIsLoading(false);
        return;
      }

      const supabase = getSupabaseClient();
      const email = user.email.toLowerCase().trim();

      // Derive keys from master password
      const derivedKeys = await deriveKeys(masterPassword, email);

      // Fetch profile to get encrypted symmetric key
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('encrypted_symmetric_key')
        .eq('id', user.id)
        .single();

      if (profileError) {
        setError('Failed to fetch profile');
        setIsLoading(false);
        return;
      }

      let encryptionKey: CryptoKey;

      if (profile.encrypted_symmetric_key) {
        try {
          const encryptedKeyData = JSON.parse(profile.encrypted_symmetric_key);
          encryptionKey = await decryptSymmetricKey(encryptedKeyData, derivedKeys.masterKey);
        } catch {
          setError('Invalid master password');
          setIsLoading(false);
          return;
        }
      } else {
        // Generate new symmetric key for legacy account
        encryptionKey = await generateSymmetricKey();
        const encryptedSymmetricKey = await encryptSymmetricKey(encryptionKey, derivedKeys.masterKey);
        
        await supabase
          .from('profiles')
          .update({ encrypted_symmetric_key: JSON.stringify(encryptedSymmetricKey) })
          .eq('id', user.id);
      }

      // Store the encryption key
      setEncryptionKey(encryptionKey);
      console.log('Encryption key set in store');
      
      // Verify it was set
      const storeKey = useVaultStore.getState().encryptionKey;
      console.log('Verified encryption key in store:', !!storeKey);
      
      // Navigate to vault
      router.push('/vault');
    } catch (err) {
      console.error('Unlock error:', err);
      setError('Failed to unlock vault. Check your master password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-birch-950/20 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <Shield className="w-10 h-10 text-primary" />
            <span className="text-2xl font-bold">BirchVault</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">Vault Locked</h1>
          <p className="text-muted-foreground text-center mb-6">
            Enter your master password to unlock
          </p>

          {user?.email && (
            <p className="text-center text-sm text-muted-foreground mb-4">
              Logged in as <strong>{user.email}</strong>
            </p>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/50 text-destructive rounded-lg p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleUnlock} className="space-y-4">
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
                  placeholder="Enter your master password"
                  required
                  autoFocus
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Unlocking...' : 'Unlock Vault'}
            </button>
          </form>

          <button
            onClick={handleLogout}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
}

