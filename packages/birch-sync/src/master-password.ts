// ============================================
// Birch Sync - Master Password & Encryption
// ============================================

import { getSupabase } from './client';

// Session storage key for derived key
const DERIVED_KEY_KEY = 'birch-derived-key';
const MASTER_PW_VERIFIED_KEY = 'birch-master-pw-verified';

/**
 * Check if user has master password set up
 */
export async function hasMasterPassword(): Promise<boolean> {
  const client = getSupabase();
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) {
    return false;
  }

  const { data, error } = await client
    .from('birch_users')
    .select('master_key_salt')
    .eq('id', session.user.id)
    .single();

  if (error) {
    return false;
  }

  return !!data?.master_key_salt;
}

/**
 * Generate a random salt
 */
function generateSalt(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive encryption key from master password using PBKDF2
 */
async function deriveKey(password: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = new Uint8Array(salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export key to storable format
 */
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  const array = new Uint8Array(exported);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Import key from stored format
 */
async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyBuffer = new Uint8Array(keyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Set up master password (first time)
 */
export async function setupMasterPassword(password: string): Promise<{ success: boolean; error: string | null }> {
  if (password.length < 8) {
    return { success: false, error: 'Master password must be at least 8 characters' };
  }

  const salt = generateSalt();
  const key = await deriveKey(password, salt);

  const client = getSupabase();
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await client
    .from('birch_users')
    .update({ master_key_salt: salt })
    .eq('id', session.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Store derived key in session
  const exportedKey = await exportKey(key);
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(DERIVED_KEY_KEY, exportedKey);
    sessionStorage.setItem(MASTER_PW_VERIFIED_KEY, 'true');
  }

  return { success: true, error: null };
}

/**
 * Verify master password
 */
export async function verifyMasterPassword(password: string): Promise<{ valid: boolean; error: string | null }> {
  const client = getSupabase();
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) {
    return { valid: false, error: 'Not authenticated' };
  }

  const { data, error } = await client
    .from('birch_users')
    .select('master_key_salt')
    .eq('id', session.user.id)
    .single();

  if (error) {
    return { valid: false, error: error.message };
  }

  if (!data?.master_key_salt) {
    return { valid: false, error: 'Master password not set up' };
  }

  try {
    const key = await deriveKey(password, data.master_key_salt);
    const exportedKey = await exportKey(key);
    
    // Store derived key in session
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(DERIVED_KEY_KEY, exportedKey);
      sessionStorage.setItem(MASTER_PW_VERIFIED_KEY, 'true');
    }

    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Verification failed' };
  }
}

/**
 * Check if master password is verified in session
 */
export function isMasterPasswordVerified(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }
  return sessionStorage.getItem(MASTER_PW_VERIFIED_KEY) === 'true';
}

/**
 * Get derived key from session
 */
async function getDerivedKey(): Promise<CryptoKey | null> {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  const keyHex = sessionStorage.getItem(DERIVED_KEY_KEY);
  if (!keyHex) {
    return null;
  }

  try {
    return await importKey(keyHex);
  } catch {
    return null;
  }
}

/**
 * Encrypt data with master password derived key
 */
export async function encrypt(plaintext: string): Promise<{ ciphertext: string; error: string | null }> {
  const key = await getDerivedKey();
  if (!key) {
    return { ciphertext: '', error: 'Master password not verified' };
  }

  try {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );

    // Combine IV and ciphertext
    const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    const ciphertext = Array.from(combined, b => b.toString(16).padStart(2, '0')).join('');
    return { ciphertext, error: null };
  } catch (e) {
    return { ciphertext: '', error: e instanceof Error ? e.message : 'Encryption failed' };
  }
}

/**
 * Decrypt data with master password derived key
 */
export async function decrypt(ciphertext: string): Promise<{ plaintext: string; error: string | null }> {
  const key = await getDerivedKey();
  if (!key) {
    return { plaintext: '', error: 'Master password not verified' };
  }

  try {
    const combined = new Uint8Array(ciphertext.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const decoder = new TextDecoder();
    return { plaintext: decoder.decode(decrypted), error: null };
  } catch (e) {
    return { plaintext: '', error: e instanceof Error ? e.message : 'Decryption failed' };
  }
}

/**
 * Clear master password from session
 */
export function clearMasterPassword(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(DERIVED_KEY_KEY);
    sessionStorage.removeItem(MASTER_PW_VERIFIED_KEY);
  }
}

/**
 * Change master password
 */
export async function changeMasterPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  // First verify current password
  const { valid, error: verifyError } = await verifyMasterPassword(currentPassword);
  if (!valid) {
    return { success: false, error: verifyError || 'Current password is incorrect' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters' };
  }

  // Set up new password
  return setupMasterPassword(newPassword);
}




