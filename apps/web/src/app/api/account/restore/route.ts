import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Restore token required' }, { status: 400 });
    }

    // Use service role client to access profiles
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find profile with this restore token
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id, email, restore_token_expires_at, deleted_at')
      .eq('restore_token', token)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Invalid or expired restore token' }, { status: 404 });
    }

    // Check if account was actually deleted
    if (!profile.deleted_at) {
      return NextResponse.json({ error: 'Account is not deleted' }, { status: 400 });
    }

    // Check if restore token has expired
    if (profile.restore_token_expires_at) {
      const expiresAt = new Date(profile.restore_token_expires_at);
      if (new Date() > expiresAt) {
        return NextResponse.json({ error: 'Restore token has expired. Account has been permanently deleted.' }, { status: 410 });
      }
    }

    // Restore the account: clear deletion fields
    const { error: updateError } = await serviceClient
      .from('profiles')
      .update({
        deleted_at: null,
        deletion_scheduled_at: null,
        restore_token: null,
        restore_token_expires_at: null,
      })
      .eq('id', profile.id);

    if (updateError) {
      console.error('Failed to restore profile:', updateError);
      return NextResponse.json({ error: 'Failed to restore account' }, { status: 500 });
    }

    console.log(`Account restored for ${profile.email}`);

    return NextResponse.json({
      success: true,
      message: 'Account restored successfully',
      email: profile.email,
    });
  } catch (error) {
    console.error('Restore account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}




