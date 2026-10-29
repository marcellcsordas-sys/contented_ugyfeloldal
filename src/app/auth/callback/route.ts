import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Magic link és meghívó link érkezik ide (PKCE "code" vagy "token_hash").
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const supabase = await createClient();

  // Se code, se token_hash: a token a # részben jött (alap meghívó link).
  // A böngésző az átirányításnál megtartja a # részt, a /auth/hash oldal kezeli.
  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL('/auth/hash', url.origin));
  }

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }

  return NextResponse.redirect(new URL(ok ? '/' : '/login?error=1', url.origin));
}
