// ============================================
// BirchVault Authentication Utilities
// ============================================

import { getSupabaseClient } from './supabase';
import { deriveKeys, generateSymmetricKey, encryptSymmetricKey, decryptSymmetricKey } from '@birchvault/core';

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

  // Sign up with Supabase Auth (disable auto email - we'll send our own)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: derivedKeys.authHash, // Use auth hash, not master password
    options: {
      data: {
        name,
      },
      // Note: Supabase will still send its default email, but we send our branded one too
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
    .from('vault_profiles')
    .update({
      name,
      encrypted_symmetric_key: JSON.stringify(encryptedSymmetricKey),
      auth_hash: derivedKeys.authHash,
    })
    .eq('id', authData.user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  // Send custom verification email via Resend
  try {
    await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        userId: authData.user.id,
        userName: name,
        type: 'signup',
      }),
    });
  } catch (emailError) {
    // Don't fail registration if email fails - Supabase's default email is a fallback
    console.error('Failed to send custom verification email:', emailError);
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

  // Fetch profile to get encrypted symmetric key
  const { data: profile, error: profileError } = await supabase
    .from('vault_profiles')
    .select('encrypted_symmetric_key')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    throw new Error('Failed to fetch profile');
  }

  // Decrypt the symmetric key
  let encryptionKey: CryptoKey;
  
  console.log('Profile encrypted_symmetric_key:', profile.encrypted_symmetric_key ? 'exists' : 'null');
  
  if (profile.encrypted_symmetric_key) {
    const encryptedKeyData = JSON.parse(profile.encrypted_symmetric_key);
    encryptionKey = await decryptSymmetricKey(encryptedKeyData, derivedKeys.masterKey);
    console.log('Decrypted existing symmetric key');
  } else {
    // Legacy account without symmetric key - generate and save one
    console.log('No symmetric key found, generating new one...');
    encryptionKey = await generateSymmetricKey();
    const encryptedSymmetricKey = await encryptSymmetricKey(encryptionKey, derivedKeys.masterKey);
    
    const { error: updateError } = await supabase
      .from('vault_profiles')
      .update({ encrypted_symmetric_key: JSON.stringify(encryptedSymmetricKey) })
      .eq('id', authData.user.id);
    
    if (updateError) {
      console.error('Failed to save symmetric key to profile:', updateError);
    } else {
      console.log('Successfully saved symmetric key to profile');
    }
  }

  return {
    user: authData.user,
    session: authData.session,
    encryptionKey,
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
