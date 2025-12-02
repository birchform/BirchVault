import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { fetch } from '@tauri-apps/plugin-http';
import { useAuthStore } from '../../store/auth';
import { useVaultStore } from '../../store/vault';
import { useSettingsStore, type ColorTheme, type AppearanceMode } from '../../store/settings';
import { deriveKeys, decryptSymmetricKey, type EncryptedData } from '@birchvault/core';

const SUPABASE_URL = 'https://lbkumiynfiolodygvvnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxia3VtaXluZmlvbG9keWd2dm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTk0NzcsImV4cCI6MjA2OTk5NTQ3N30.Wm_VrmiVcrb-Xnn5wmbmy8mDEzRS6nxQ2QoXJHXbixE';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, fetchSubscription, isLoading } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      console.log('[LoginPage] Starting login for:', email);
      
      // Derive keys from master password - need masterKey to decrypt symmetric key
      const { authHash, masterKey } = await deriveKeys(masterPassword, email);
      console.log('[LoginPage] Keys derived');
      
      // Convert master key to storable format for unlock verification
      const exportedKey = await crypto.subtle.exportKey('raw', masterKey);
      const masterKeyHash = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

      console.log('[LoginPage] Calling login...');
      const result = await login(email, authHash, masterKeyHash);
      console.log('[LoginPage] Login successful, userId:', result.userId);
      
      // Fetch encrypted symmetric key from profile
      console.log('[LoginPage] Fetching profile to get symmetric key...');
      const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${result.userId}&select=encrypted_symmetric_key,color_theme,appearance_mode`;
      const profileResponse = await fetch(profileUrl, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${result.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      interface ProfileData {
        encrypted_symmetric_key: string | null;
        color_theme: string | null;
        appearance_mode: string | null;
      }
      const profiles = await profileResponse.json() as ProfileData[];
      console.log('[LoginPage] Profile fetched, has symmetric key:', !!profiles[0]?.encrypted_symmetric_key);
      
      let encryptionKey: CryptoKey;
      
      if (profiles[0]?.encrypted_symmetric_key) {
        // Decrypt the symmetric key using the master key
        const encryptedKeyData: EncryptedData = JSON.parse(profiles[0].encrypted_symmetric_key);
        encryptionKey = await decryptSymmetricKey(encryptedKeyData, masterKey);
        console.log('[LoginPage] Decrypted symmetric key from profile');
      } else {
        // Fallback for legacy accounts - use derived encryption key directly
        // Note: This won't work if items were encrypted with a symmetric key
        console.warn('[LoginPage] No symmetric key in profile, using derived key (may not work)');
        const { encryptionKey: derivedKey } = await deriveKeys(masterPassword, email);
        encryptionKey = derivedKey;
      }
      
      // Store encryption key for vault decryption
      useVaultStore.getState().setEncryptionKey(encryptionKey);
      console.log('[LoginPage] Encryption key stored in vault store');
      
      // Apply theme settings from profile
      if (profiles[0]) {
        const colorTheme = (profiles[0].color_theme || 'birch') as ColorTheme;
        const appearanceMode = (profiles[0].appearance_mode || 'dark') as AppearanceMode;
        console.log('[LoginPage] Applying theme from profile:', colorTheme, appearanceMode);
        useSettingsStore.getState().setColorTheme(colorTheme);
        useSettingsStore.getState().setTheme(appearanceMode);
      }
      
      // Fetch subscription data
      console.log('[LoginPage] Fetching subscription...');
      await fetchSubscription(result.userId, result.accessToken);
      console.log('[LoginPage] Subscription fetched');
      
      // Sync vault data from Supabase
      console.log('[LoginPage] Syncing vault...');
      await useVaultStore.getState().sync();
      console.log('[LoginPage] Sync complete');
      
      navigate('/vault');
    } catch (err) {
      console.error('[LoginPage] Login failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-2">Welcome Back</h1>
      <p className="text-muted-foreground text-center mb-6">
        Enter your credentials to unlock your vault
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
              placeholder="Enter your master password"
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Unlocking...' : 'Unlock Vault'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}







