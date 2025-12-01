// ============================================
// Admin API - List Users
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

export async function GET(request: NextRequest) {
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
    // Get search query
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Fetch users with their subscriptions using service role (bypasses RLS)
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        display_name,
        created_at,
        subscriptions (
          plan_id,
          status,
          plan_override,
          plan_override_expires_at,
          plan_override_reason,
          plan_override_set_by,
          current_period_end
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add search filter if provided
    if (search) {
      query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Transform data to flatten subscription
    const transformedUsers = users?.map(user => {
      const subscription = Array.isArray(user.subscriptions) 
        ? user.subscriptions[0] 
        : user.subscriptions;
      
      // Determine effective plan
      let effectivePlan = subscription?.plan_id || 'free';
      let hasActiveOverride = false;
      
      if (subscription?.plan_override) {
        const expiresAt = subscription.plan_override_expires_at 
          ? new Date(subscription.plan_override_expires_at) 
          : null;
        
        if (!expiresAt || expiresAt > new Date()) {
          effectivePlan = subscription.plan_override;
          hasActiveOverride = true;
        }
      }

      return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        createdAt: user.created_at,
        basePlan: subscription?.plan_id || 'free',
        effectivePlan,
        hasActiveOverride,
        override: subscription ? {
          plan: subscription.plan_override,
          expiresAt: subscription.plan_override_expires_at,
          reason: subscription.plan_override_reason,
          setBy: subscription.plan_override_set_by,
        } : null,
        subscriptionStatus: subscription?.status || 'active',
      };
    }) || [];

    return NextResponse.json({
      users: transformedUsers,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error in admin users API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

