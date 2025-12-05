import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Cloud, CloudOff, Loader2 } from 'lucide-react';

// Environment variables from .env.local (Vite injects these at build time)
const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ENV_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface SyncState {
  isConfigured: boolean;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface SyncWrapperProps {
  children: React.ReactNode;
}

export function SyncWrapper({ children }: SyncWrapperProps) {
  const [state, setState] = useState<SyncState>({
    isConfigured: false,
    isConnected: false,
    isAuthenticated: false,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    checkSyncStatus();
  }, []);

  async function checkSyncStatus() {
    setIsLoading(true);
    try {
      // First check if we have env variables
      if (ENV_SUPABASE_URL && ENV_SUPABASE_ANON_KEY) {
        // Auto-configure from .env.local
        await invoke('set_supabase_config', { 
          config: { url: ENV_SUPABASE_URL, anonKey: ENV_SUPABASE_ANON_KEY } 
        });
        setState(prev => ({ 
          ...prev, 
          isConfigured: true,
          isConnected: true,
        }));
        setIsLoading(false);
        return;
      }

      const config = await invoke<{ url: string; anonKey: string } | null>('get_supabase_config');
      
      if (!config) {
        setState(prev => ({ ...prev, isConfigured: false }));
        setIsLoading(false);
        return;
      }

      setState(prev => ({ 
        ...prev, 
        isConfigured: true,
        isConnected: true,
      }));
    } catch (err) {
      console.log('Sync check skipped:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const SyncIndicator = () => {
    if (isLoading) {
      return (
        <div className="fixed bottom-4 right-4 p-2 rounded-lg bg-github-card/80 border border-github-border backdrop-blur-sm z-50">
          <Loader2 className="w-4 h-4 text-github-muted animate-spin" />
        </div>
      );
    }

    if (!state.isConfigured) {
      return (
        <button
          onClick={() => setShowSetup(true)}
          className="fixed bottom-4 right-4 p-2 rounded-lg bg-github-card/80 border border-github-border backdrop-blur-sm hover:bg-github-bg transition-colors group z-50"
          title="Setup cloud sync"
        >
          <CloudOff className="w-4 h-4 text-github-muted group-hover:text-github-accent" />
        </button>
      );
    }

    return (
      <div 
        className="fixed bottom-4 right-4 p-2 rounded-lg bg-github-card/80 border border-github-border backdrop-blur-sm z-50"
        title="Cloud sync enabled"
      >
        <Cloud className="w-4 h-4 text-github-accent" />
      </div>
    );
  };

  return (
    <>
      {children}
      <SyncIndicator />
      {showSetup && <SyncSetupDialog onClose={() => setShowSetup(false)} onComplete={checkSyncStatus} />}
    </>
  );
}

interface SyncSetupDialogProps {
  onClose: () => void;
  onComplete: () => void;
}

function SyncSetupDialog({ onClose, onComplete }: SyncSetupDialogProps) {
  const [step, setStep] = useState<'intro' | 'config' | 'login'>('intro');
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfigure = async () => {
    if (!url || !key) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await invoke('set_supabase_config', { 
        config: { url, anonKey: key } 
      });
      setStep('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-github-card rounded-2xl border border-github-border shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {step === 'intro' && 'Enable Cloud Sync'}
            {step === 'config' && 'Connect to Supabase'}
            {step === 'login' && 'Sign In'}
          </h2>
          <button onClick={onClose} className="text-github-muted hover:text-white text-xl">
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {step === 'intro' && (
          <div className="space-y-4">
            <p className="text-sm text-github-muted">
              Enable cloud sync to manage runners and view status from any computer.
            </p>
            <ul className="space-y-2 text-sm text-github-muted">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-github-accent" />
                Remote runner control
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-github-accent" />
                Multi-machine dashboard
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-github-accent" />
                Sync settings across devices
              </li>
            </ul>
            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-github-border text-sm text-github-muted hover:bg-github-bg transition-colors"
              >
                Skip for Now
              </button>
              <button
                onClick={() => setStep('config')}
                className="flex-1 py-2 rounded-lg bg-github-accent text-white text-sm font-medium hover:bg-github-accent/90 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        )}

        {step === 'config' && (
          <div className="space-y-4">
            <p className="text-sm text-github-muted">
              Enter your Supabase project credentials.
            </p>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Project URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxxx.supabase.co"
                className="w-full px-3 py-2 rounded-lg bg-github-bg border border-github-border text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Anon/Public Key</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiI..."
                className="w-full px-3 py-2 rounded-lg bg-github-bg border border-github-border text-sm font-mono text-white"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep('intro')}
                className="flex-1 py-2 rounded-lg border border-github-border text-sm text-github-muted hover:bg-github-bg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfigure}
                disabled={isLoading || !url || !key}
                className="flex-1 py-2 rounded-lg bg-github-accent text-white text-sm font-medium hover:bg-github-accent/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {step === 'login' && (
          <div className="space-y-4">
            <p className="text-sm text-github-muted">
              Sign in to your Birch account.
            </p>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg bg-github-bg border border-github-border text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-github-bg border border-github-border text-sm text-white"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep('config')}
                className="flex-1 py-2 rounded-lg border border-github-border text-sm text-github-muted hover:bg-github-bg transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="flex-1 py-2 rounded-lg bg-github-accent text-white text-sm font-medium hover:bg-github-accent/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Signing in...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

