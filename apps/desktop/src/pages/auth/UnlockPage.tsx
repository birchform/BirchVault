import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Fingerprint } from 'lucide-react';
import { fetch } from '@tauri-apps/plugin-http';
import { useAuthStore } from '../../store/auth';
import { useVaultStore } from '../../store/vault';
import { useSettingsStore, type ColorTheme, type AppearanceMode } from '../../store/settings';
import { deriveKeys, decryptSymmetricKey, type EncryptedData } from '@birchvault/core';
import { invoke } from '@tauri-apps/api/core';

const SUPABASE_URL = 'https://lbkumiynfiolodygvvnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxia3VtaXluZmlvbG9keWd2dm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MTk0NzcsImV4cCI6MjA2OTk5NTQ3N30.Wm_VrmiVcrb-Xnn5wmbmy8mDEzRS6nxQ2QoXJHXbixE';

export function UnlockPage() {
  const navigate = useNavigate();
  const { unlock, fetchSubscription, isLoading, user } = useAuthStore();
  
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  // Get email from stored session
  useEffect(() => {
    async function getStoredEmail() {
      try {
        const session = await invoke<{ userId: string; email: string } | null>('get_session');
        if (session?.email) {
          setEmail(session.email);
        }
      } catch (err) {
        console.error('Failed to get session:', err);
      }
    }
    getStoredEmail();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('No session found. Please log in again.');
      return;
    }

    try {
      // Derive keys from master password - need masterKey to decrypt symmetric key
      const { masterKey } = await deriveKeys(masterPassword, email);
      
      // Convert master key to storable format for unlock verification
      const exportedKey = await crypto.subtle.exportKey('raw', masterKey);
      const masterKeyHash = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

      const result = await unlock(masterKeyHash);
      
      // Fetch encrypted symmetric key from profile
      const profileUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${result.userId}&select=encrypted_symmetric_key,color_theme,appearance_mode`;
      const profileResponse = await fetch(profileUrl, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${result.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      interface ProfileData {
        encrypted_symmetric_key: string | null;
        color_theme: string | null;
        appearance_mode: string | null;
      }
      
      let encryptionKey: CryptoKey;
      
      if (profileResponse.ok) {
        const profiles = await profileResponse.json() as ProfileData[];
        
        if (profiles[0]?.encrypted_symmetric_key) {
          // Decrypt the symmetric key using the master key
          const encryptedKeyData: EncryptedData = JSON.parse(profiles[0].encrypted_symmetric_key);
          encryptionKey = await decryptSymmetricKey(encryptedKeyData, masterKey);
        } else {
          // Fallback for legacy accounts
          const { encryptionKey: derivedKey } = await deriveKeys(masterPassword, email);
          encryptionKey = derivedKey;
        }
        
        // Apply theme settings from profile
        if (profiles[0]) {
          const colorTheme = (profiles[0].color_theme || 'birch') as ColorTheme;
          const appearanceMode = (profiles[0].appearance_mode || 'dark') as AppearanceMode;
          useSettingsStore.getState().setColorTheme(colorTheme);
          useSettingsStore.getState().setTheme(appearanceMode);
        }
      } else {
        // Fallback if profile fetch fails
        const { encryptionKey: derivedKey } = await deriveKeys(masterPassword, email);
        encryptionKey = derivedKey;
      }
      
      // Store encryption key for vault decryption
      useVaultStore.getState().setEncryptionKey(encryptionKey);
      
      // Fetch subscription data
      await fetchSubscription(result.userId, result.accessToken);
      
      // Sync vault data from server
      try {
        await useVaultStore.getState().sync();
      } catch (syncErr) {
        console.error('Sync after unlock failed:', syncErr);
        // Continue anyway - offline mode
      }
      
      navigate('/vault');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock vault');
    }
  };

  const handleBiometricUnlock = async () => {
    // TODO: Implement biometric unlock
    setError('Biometric unlock not yet implemented');
  };

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-2">Vault Locked</h1>
      <p className="text-muted-foreground text-center mb-6">
        Enter your master password to unlock
      </p>

      {email && (
        <div className="flex items-center justify-center gap-2 mb-6 text-sm">
          <span className="text-muted-foreground">Signed in as</span>
          <span className="font-medium">{email}</span>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/50 text-destructive rounded-lg p-3 mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          {isLoading ? 'Unlocking...' : 'Unlock'}
        </button>
      </form>

      {/* Biometric Unlock Button */}
      <button
        onClick={handleBiometricUnlock}
        className="w-full mt-4 flex items-center justify-center gap-2 py-2 border border-border rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Fingerprint className="w-5 h-5" />
        <span>Use Biometric</span>
      </button>

      <div className="mt-6 text-center">
        <button
          onClick={handleLogout}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Log out and use a different account
        </button>
      </div>
    </>
  );
}








