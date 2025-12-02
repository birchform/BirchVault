import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sendAccountDeletionEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// 60 days in milliseconds
const DELETION_DELAY_MS = 60 * 24 * 60 * 60 * 1000;

function generateRestoreToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { authHash } = body;

    if (!authHash) {
      return NextResponse.json({ error: 'Master password verification required' }, { status: 400 });
    }

    // Use service role client to access profiles
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user's profile to verify auth hash
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, email, auth_hash')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify master password via auth hash (constant-time comparison)
    if (!profile.auth_hash || !secureCompare(authHash, profile.auth_hash)) {
      return NextResponse.json({ error: 'Invalid master password' }, { status: 403 });
    }

    // Generate restore token and calculate deletion date
    const restoreToken = generateRestoreToken();
    const now = new Date();
    const deletionScheduledAt = new Date(now.getTime() + DELETION_DELAY_MS);

    // Soft delete: update profile with deletion info
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({
        deleted_at: now.toISOString(),
        deletion_scheduled_at: deletionScheduledAt.toISOString(),
        restore_token: restoreToken,
        restore_token_expires_at: deletionScheduledAt.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    // Sign out the user from all sessions
    await serviceClient.auth.admin.signOut(user.id, 'global');

    // Send email with restore link
    const restoreUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/restore-account?token=${restoreToken}`;

    const emailResult = await sendAccountDeletionEmail({
      to: profile.email,
      restoreUrl,
      deletionDate: deletionScheduledAt,
    });

    if (!emailResult.success) {
      console.error('Failed to send deletion email:', emailResult.error);
      // Don't fail the request - account is still deleted, just email failed
    }

    console.log(`Account deletion initiated for ${profile.email}`);

    return NextResponse.json({
      success: true,
      message: 'Account scheduled for deletion. Check your email for restoration instructions.',
      deletionScheduledAt: deletionScheduledAt.toISOString(),
      // Only include restore URL in development for testing
      ...(process.env.NODE_ENV === 'development' && { restoreUrl }),
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Securely compares two strings (constant-time)
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}








