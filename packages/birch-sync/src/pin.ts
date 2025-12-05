// ============================================
// Birch Sync - PIN Management
// ============================================

import { getSupabase } from './client';

/**
 * Check if user has a PIN set
 */
export async function hasPin(): Promise<boolean> {
  const client = getSupabase();
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) {
    return false;
  }

  const { data, error } = await client
    .from('birch_users')
    .select('global_pin_hash')
    .eq('id', session.user.id)
    .single();

  if (error) {
    return false;
  }

  return !!data?.global_pin_hash;
}

/**
 * Set or update PIN
 */
export async function setPin(pin: string): Promise<{ success: boolean; error: string | null }> {
  if (pin.length < 4 || pin.length > 8) {
    return { success: false, error: 'PIN must be 4-8 characters' };
  }

  const client = getSupabase();
  const { data, error } = await client.rpc('set_pin', {
    p_pin: pin,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data as boolean, error: null };
}

/**
 * Verify PIN
 */
export async function verifyPin(pin: string): Promise<{ valid: boolean; error: string | null }> {
  const client = getSupabase();
  const { data, error } = await client.rpc('verify_pin', {
    p_pin: pin,
  });

  if (error) {
    return { valid: false, error: error.message };
  }

  return { valid: data as boolean, error: null };
}

/**
 * Clear PIN (remove it)
 */
export async function clearPin(): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabase();
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { error } = await client
    .from('birch_users')
    .update({ global_pin_hash: null })
    .eq('id', session.user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

// Session-based PIN verification cache
const PIN_VERIFIED_KEY = 'birch-pin-verified';
const PIN_VERIFIED_EXPIRY_KEY = 'birch-pin-verified-expiry';

/**
 * Mark PIN as verified for this session
 */
export function markPinVerified(durationMs: number = 30 * 60 * 1000): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(PIN_VERIFIED_KEY, 'true');
    sessionStorage.setItem(PIN_VERIFIED_EXPIRY_KEY, (Date.now() + durationMs).toString());
  }
}

/**
 * Check if PIN was recently verified
 */
export function isPinVerifiedInSession(): boolean {
  if (typeof sessionStorage === 'undefined') {
    return false;
  }

  const verified = sessionStorage.getItem(PIN_VERIFIED_KEY);
  const expiry = sessionStorage.getItem(PIN_VERIFIED_EXPIRY_KEY);

  if (!verified || !expiry) {
    return false;
  }

  if (Date.now() > parseInt(expiry, 10)) {
    // Expired
    clearPinVerification();
    return false;
  }

  return true;
}

/**
 * Clear PIN verification
 */
export function clearPinVerification(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(PIN_VERIFIED_KEY);
    sessionStorage.removeItem(PIN_VERIFIED_EXPIRY_KEY);
  }
}

/**
 * Verify PIN and cache result
 */
export async function verifyPinWithCache(pin: string): Promise<{ valid: boolean; error: string | null }> {
  const result = await verifyPin(pin);
  
  if (result.valid) {
    markPinVerified();
  }

  return result;
}

/**
 * Require PIN verification (check cache first)
 */
export async function requirePinVerification(
  pin?: string
): Promise<{ verified: boolean; error: string | null }> {
  // Check if already verified in session
  if (isPinVerifiedInSession()) {
    return { verified: true, error: null };
  }

  // If no PIN provided, need to prompt user
  if (!pin) {
    return { verified: false, error: 'PIN required' };
  }

  // Verify the provided PIN
  const result = await verifyPinWithCache(pin);
  return { verified: result.valid, error: result.error };
}




