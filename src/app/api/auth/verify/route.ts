import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicLink } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }

  const userId = await verifyMagicLink(token);

  if (!userId) {
    return NextResponse.redirect(new URL('/login?error=invalid_or_expired', request.url));
  }

  // Redirect to sign in with the token to create a session
  const signInUrl = new URL('/api/auth/callback/credentials', request.url);
  signInUrl.searchParams.set('token', token);

  // Redirect to dashboard after successful verification
  const redirectUrl = new URL('/dashboard', request.url);

  return NextResponse.redirect(redirectUrl);
}
