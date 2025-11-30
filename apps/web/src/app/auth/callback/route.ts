import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const type = requestUrl.searchParams.get('type');

  if (code) {
    // Create a Supabase client for server-side auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if this is email confirmation (type=signup or type=email)
      if (type === 'signup' || type === 'email' || type === 'magiclink') {
        return NextResponse.redirect(new URL('/auth/confirmed', requestUrl.origin));
      }
      // OAuth callback - redirect to vault
      return NextResponse.redirect(new URL('/vault', requestUrl.origin));
    }
  }

  // If no code or error, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
