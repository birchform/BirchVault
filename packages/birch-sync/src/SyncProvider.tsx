// ============================================
// Birch Sync - React Provider Component
// ============================================

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initSupabase, isConfigured, getSupabase, getMachineId, getHostname, testConnection } from './client';
import { registerMachine, ensureMachineRegistered } from './machines';
import { getCurrentUser } from './auth';
import type { SyncState, SupabaseConfig, BirchMachine, BirchUser } from './types';

interface SyncContextValue {
  state: SyncState;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  configure: (config: SupabaseConfig) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  machine: BirchMachine | null;
  user: BirchUser | null;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncContext(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return ctx;
}

interface SyncProviderProps {
  children: ReactNode;
  onNeedsSetup?: () => void;
  onNeedsLogin?: () => void;
}

export function SyncProvider({ children, onNeedsSetup, onNeedsLogin }: SyncProviderProps) {
  const [state, setState] = useState<SyncState>({
    isConnected: false,
    isAuthenticated: false,
    userId: null,
    machineId: null,
    hostname: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [machine, setMachine] = useState<BirchMachine | null>(null);
  const [user, setUser] = useState<BirchUser | null>(null);

  const isReady = state.isConnected && state.isAuthenticated && !!machine;

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setIsLoading(true);
    setError(null);

    try {
      // Check if configured
      const configured = await isConfigured();
      if (!configured) {
        setIsLoading(false);
        onNeedsSetup?.();
        return;
      }

      // Initialize Supabase
      await initSupabase();
      
      // Test connection
      const connected = await testConnection();
      if (!connected) {
        setError('Could not connect to Supabase. Please check your configuration.');
        setIsLoading(false);
        return;
      }

      // Get machine info
      const machineId = await getMachineId();
      const hostname = await getHostname();

      setState(prev => ({
        ...prev,
        isConnected: true,
        machineId,
        hostname,
      }));

      // Check auth
      const client = getSupabase();
      const { data: { session } } = await client.auth.getSession();
      
      if (!session?.user) {
        setIsLoading(false);
        onNeedsLogin?.();
        return;
      }

      // User is authenticated
      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        userId: session.user.id,
      }));

      // Get user profile
      const userProfile = await getCurrentUser();
      setUser(userProfile);

      // Register/update machine
      const registeredMachine = await ensureMachineRegistered(hostname);
      setMachine(registeredMachine);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize sync');
    } finally {
      setIsLoading(false);
    }
  }

  async function configure(config: SupabaseConfig) {
    setIsLoading(true);
    setError(null);

    try {
      await initSupabase(config);
      const connected = await testConnection();
      
      if (!connected) {
        throw new Error('Could not connect to Supabase. Please verify your URL and key.');
      }

      // Get machine info
      const machineId = await getMachineId();
      const hostname = await getHostname();

      setState(prev => ({
        ...prev,
        isConnected: true,
        machineId,
        hostname,
      }));

      // Check if user is already logged in
      const client = getSupabase();
      const { data: { session } } = await client.auth.getSession();
      
      if (session?.user) {
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          userId: session.user.id,
        }));
        
        const userProfile = await getCurrentUser();
        setUser(userProfile);
        
        const registeredMachine = await ensureMachineRegistered(hostname);
        setMachine(registeredMachine);
      } else {
        onNeedsLogin?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Configuration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setIsLoading(true);
    setError(null);

    try {
      const client = getSupabase();
      const { data, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (!data.session) {
        throw new Error('Login failed: No session returned');
      }

      setState(prev => ({
        ...prev,
        isAuthenticated: true,
        userId: data.session.user.id,
      }));

      // Get user profile
      const userProfile = await getCurrentUser();
      setUser(userProfile);

      // Register machine
      const hostname = state.hostname || await getHostname();
      const registeredMachine = await ensureMachineRegistered(hostname);
      setMachine(registeredMachine);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    setIsLoading(true);
    
    try {
      const client = getSupabase();
      await client.auth.signOut();
      
      setState({
        isConnected: state.isConnected,
        isAuthenticated: false,
        userId: null,
        machineId: state.machineId,
        hostname: state.hostname,
      });
      setUser(null);
      setMachine(null);
      
      onNeedsLogin?.();
    } finally {
      setIsLoading(false);
    }
  }

  async function refresh() {
    await initialize();
  }

  return (
    <SyncContext.Provider value={{
      state,
      isReady,
      isLoading,
      error,
      configure,
      login,
      logout,
      refresh,
      machine,
      user,
    }}>
      {children}
    </SyncContext.Provider>
  );
}

// Simple setup wizard component
interface SetupWizardProps {
  onConfigured: (config: SupabaseConfig) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
}

export function SyncSetupWizard({ onConfigured, onLogin, isConfigured, isLoading, error }: SetupWizardProps) {
  const [step, setStep] = useState<'config' | 'login'>(isConfigured ? 'login' : 'config');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isConfigured) {
      setStep('login');
    }
  }, [isConfigured]);

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    try {
      await onConfigured({ url: supabaseUrl, anonKey });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Configuration failed');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    
    try {
      await onLogin(email, password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border shadow-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">
          {step === 'config' ? 'Connect to Supabase' : 'Sign In'}
        </h2>

        {displayError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {displayError}
          </div>
        )}

        {step === 'config' ? (
          <form onSubmit={handleConfigure} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Supabase URL</label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Anon Key</label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJ..."
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm font-mono"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
            {isConfigured && (
              <button
                type="button"
                onClick={() => setStep('config')}
                className="w-full py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
              >
                Change Supabase Settings
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}




