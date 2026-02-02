import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Simple admin authentication
 * In production, upgrade to proper auth with sessions
 */
export function middleware(request: NextRequest) {
  // Check if accessing admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for admin session cookie
    const adminAuth = request.cookies.get('admin_auth');
    
    // If not authenticated and not on login page
    if (!adminAuth && !request.nextUrl.pathname.startsWith('/admin/login')) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    
    // Verify admin password hash (simple check)
    if (adminAuth && adminAuth.value !== process.env.ADMIN_PASSWORD_HASH) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
