import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }

  // Redirect to login page with token to trigger sign in
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('token', token);

  return NextResponse.redirect(loginUrl);
}
