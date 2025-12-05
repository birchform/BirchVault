// ============================================
// Birch Sync - Authentication
// ============================================

import { getSupabase } from './client';
import type { BirchUser } from './types';

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ user: BirchUser | null; error: string | null }> {
  const client = getSupabase();
  
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, error: 'No user returned' };
  }

  // Ensure birch_users record exists
  const { data: birchUser, error: birchError } = await client
    .from('birch_users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (birchError && birchError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which means we need to create one
    return { user: null, error: birchError.message };
  }

  if (!birchUser) {
    // Create birch_users record
    const { data: newUser, error: createError } = await client
      .from('birch_users')
      .insert({ id: data.user.id })
      .select()
      .single();

    if (createError) {
      return { user: null, error: createError.message };
    }

    return { user: newUser as BirchUser, error: null };
  }

  return { user: birchUser as BirchUser, error: null };
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<{ user: BirchUser | null; error: string | null }> {
  const client = getSupabase();
  
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  if (!data.user) {
    return { user: null, error: 'No user returned' };
  }

  // The birch_users record should be created by trigger, but let's ensure it exists
  const { data: birchUser, error: birchError } = await client
    .from('birch_users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (birchError) {
    // Try to create it manually
    const { data: newUser, error: createError } = await client
      .from('birch_users')
      .insert({ id: data.user.id })
      .select()
      .single();

    if (createError) {
      return { user: null, error: createError.message };
    }

    return { user: newUser as BirchUser, error: null };
  }

  return { user: birchUser as BirchUser, error: null };
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: string | null }> {
  const client = getSupabase();
  const { error } = await client.auth.signOut();
  
  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Get current session
 */
export async function getSession() {
  const client = getSupabase();
  const { data: { session }, error } = await client.auth.getSession();
  
  if (error) {
    return { session: null, error: error.message };
  }

  return { session, error: null };
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<{ user: BirchUser | null; error: string | null }> {
  const client = getSupabase();
  
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  
  if (sessionError) {
    return { user: null, error: sessionError.message };
  }

  if (!session?.user) {
    return { user: null, error: null };
  }

  const { data: birchUser, error } = await client
    .from('birch_users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: birchUser as BirchUser, error: null };
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const { user } = await getCurrentUser();
  return user?.is_admin ?? false;
}

/**
 * Set user as admin (requires database access)
 */
export async function setAdmin(isAdmin: boolean): Promise<{ error: string | null }> {
  const client = getSupabase();
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await client
    .from('birch_users')
    .update({ is_admin: isAdmin })
    .eq('id', session.user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Update display name
 */
export async function updateDisplayName(displayName: string): Promise<{ error: string | null }> {
  const client = getSupabase();
  
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await client
    .from('birch_users')
    .update({ display_name: displayName })
    .eq('id', session.user.id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(email: string): Promise<{ error: string | null }> {
  const client = getSupabase();
  const { error } = await client.auth.resetPasswordForEmail(email);
  
  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  const client = getSupabase();
  return client.auth.onAuthStateChange(callback);
}




