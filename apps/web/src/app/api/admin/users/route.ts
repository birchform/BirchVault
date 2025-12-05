import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Admin emails from environment (comma-separated)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; email: string | null }> {
  const supabase = getSupabaseClient();
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { isAdmin: false, email: null };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user?.email) {
    return { isAdmin: false, email: null };
  }

  const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
  return { isAdmin, email: user.email };
}

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  // Use service role client to bypass RLS
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get users from auth.users with their subscriptions
  let query = serviceClient
    .from('vault_profiles')
    .select(`
      id,
      email,
      created_at,
      subscriptions (
        plan_id,
        status,
        plan_override,
        plan_override_expires_at,
        plan_override_reason,
        plan_override_set_by
      )
    `, { count: 'exact' });

  if (search) {
    query = query.ilike('email', `%${search}%`);
  }

  const { data: users, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform the data
  const transformedUsers = (users || []).map(user => {
    const sub = Array.isArray(user.subscriptions) 
      ? user.subscriptions[0] 
      : user.subscriptions;
    
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      plan_id: sub?.plan_id || 'free',
      status: sub?.status || 'active',
      plan_override: sub?.plan_override || null,
      plan_override_expires_at: sub?.plan_override_expires_at || null,
      plan_override_reason: sub?.plan_override_reason || null,
      plan_override_set_by: sub?.plan_override_set_by || null,
    };
  });

  return NextResponse.json({
    users: transformedUsers,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}
