// ============================================
// BirchVault Authentication Utilities
// ============================================

import { getSupabaseClient } from './supabase';
import { deriveKeys, generateSymmetricKey, encryptSymmetricKey, exportKey } from '@birchvault/core';

export interface RegisterCredentials {
  email: string;
  masterPassword: string;
  name?: string;
}

export interface LoginCredentials {
  email: string;
  masterPassword: string;
}

/**
 * Register a new user
 * 1. Derive keys from master password
 * 2. Generate symmetric key for vault encryption
 * 3. Encrypt symmetric key with master key
 * 4. Create Supabase auth user
 * 5. Store encrypted symmetric key in profile
 */
export async function register(credentials: RegisterCredentials) {
  const supabase = getSupabaseClient();
  const { masterPassword, name } = credentials;
  const email = credentials.email.toLowerCase().trim(); // Normalize email

  // Derive keys from master password
  const derivedKeys = await deriveKeys(masterPassword, email);

  // Generate symmetric key for vault encryption
  const symmetricKey = await generateSymmetricKey();

  // Encrypt symmetric key with master key
  const encryptedSymmetricKey = await encryptSymmetricKey(symmetricKey, derivedKeys.masterKey);

  // Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: derivedKeys.authHash, // Use auth hash, not master password
    options: {
      data: {
        name,
      },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('Failed to create user');
  }

  // Update profile with encrypted symmetric key
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      name,
      encrypted_symmetric_key: JSON.stringify(encryptedSymmetricKey),
      auth_hash: derivedKeys.authHash,
    })
    .eq('id', authData.user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    user: authData.user,
    session: authData.session,
    encryptionKey: symmetricKey,
  };
}

/**
 * Log in an existing user
 * 1. Derive keys from master password
 * 2. Authenticate with Supabase
 * 3. Fetch and decrypt symmetric key
 */
export async function login(credentials: LoginCredentials) {
  const supabase = getSupabaseClient();
  const { masterPassword } = credentials;
  const email = credentials.email.toLowerCase().trim(); // Normalize email

  // Derive keys from master password
  const derivedKeys = await deriveKeys(masterPassword, email);

  // Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: derivedKeys.authHash,
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user || !authData.session) {
    throw new Error('Failed to sign in');
  }

  // Return derived keys for later symmetric key decryption
  return {
    user: authData.user,
    session: authData.session,
    derivedKeys,
  };
}

/**
 * Log out the current user
 */
export async function logout() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Get the current session
 */
export async function getSession() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }
  return data.session;
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: 'google' | 'github') {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) {
    throw new Error(error.message);
  }
}




