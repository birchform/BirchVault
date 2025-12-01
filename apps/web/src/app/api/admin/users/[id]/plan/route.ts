// ============================================
// Admin API - Update User Plan Override
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Prevent static pre-rendering at build time
export const dynamic = 'force-dynamic';

// Lazy initialization to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getAdminEmails(): string[] {
  const emails = process.env.ADMIN_EMAILS || '';
  return emails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

async function verifyAdmin(request: NextRequest) {
  const supabase = getSupabase();
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email?.toLowerCase() || '')) {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }

  return { user };
}

// PUT - Set or update plan override
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  
  // Verify admin access
  const adminCheck = await verifyAdmin(request);
  if ('error' in adminCheck) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status }
    );
  }

  try {
    const { id: userId } = await params;
    const body = await request.json();
    const { plan, type, expiresAt, durationDays, reason } = body;

    // Validate plan
    const validPlans = ['free', 'premium', 'families', 'teams', 'enterprise'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Calculate expiry date
    let overrideExpiresAt: string | null = null;
    
    if (type === 'temporary') {
      if (expiresAt) {
        // Use specific date
        overrideExpiresAt = new Date(expiresAt).toISOString();
      } else if (durationDays) {
        // Use duration
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + parseInt(durationDays));
        overrideExpiresAt = expiry.toISOString();
      } else {
        return NextResponse.json(
          { error: 'Temporary override requires expiresAt or durationDays' },
          { status: 400 }
        );
      }
    }

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update subscription with override
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_override: plan,
        plan_override_expires_at: overrideExpiresAt,
        plan_override_reason: reason || null,
        plan_override_set_by: adminCheck.user.email,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return NextResponse.json(
        { error: 'Failed to update plan override' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Plan override set to ${plan} for ${profile.email}`,
      override: {
        plan,
        expiresAt: overrideExpiresAt,
        reason,
        setBy: adminCheck.user.email,
      },
    });
  } catch (error) {
    console.error('Error in admin plan update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Clear plan override
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabase();
  
  // Verify admin access
  const adminCheck = await verifyAdmin(request);
  if ('error' in adminCheck) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status }
    );
  }

  try {
    const { id: userId } = await params;

    // Check if user exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Clear the override
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_override: null,
        plan_override_expires_at: null,
        plan_override_reason: null,
        plan_override_set_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error clearing override:', updateError);
      return NextResponse.json(
        { error: 'Failed to clear plan override' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Plan override cleared for ${profile.email}`,
    });
  } catch (error) {
    console.error('Error in admin plan delete API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

