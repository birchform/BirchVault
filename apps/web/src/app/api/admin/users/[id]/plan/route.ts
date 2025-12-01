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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { isAdmin, email } = await verifyAdmin(request);
  
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = params.id;
  const body = await request.json();
  const { plan_override, duration_days, reason } = body;

  if (!plan_override) {
    return NextResponse.json({ error: 'plan_override is required' }, { status: 400 });
  }

  // Use service role client to bypass RLS
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Calculate expiration date if duration is provided
  let plan_override_expires_at: string | null = null;
  if (duration_days) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration_days);
    plan_override_expires_at = expiresAt.toISOString();
  }

  // Upsert the subscription with override
  const { error } = await serviceClient
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_id: 'free', // Base plan
      status: 'active',
      plan_override,
      plan_override_expires_at,
      plan_override_reason: reason || null,
      plan_override_set_by: email,
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Failed to set plan override:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { isAdmin } = await verifyAdmin(request);
  
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = params.id;

  // Use service role client to bypass RLS
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Clear the override
  const { error } = await serviceClient
    .from('subscriptions')
    .update({
      plan_override: null,
      plan_override_expires_at: null,
      plan_override_reason: null,
      plan_override_set_by: null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to clear plan override:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
