import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple admin authentication
 * In production, use a proper auth system
 */
export function isAdminAuthenticated(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('⚠️ ADMIN_PASSWORD not set in environment');
    return false;
  }

  // Check cookie first
  const adminToken = req.cookies.get('admin_token')?.value;
  if (adminToken === adminPassword) {
    return true;
  }

  // Check Authorization header
  if (authHeader === `Bearer ${adminPassword}`) {
    return true;
  }

  return false;
}

/**
 * Middleware to protect admin routes
 */
export function requireAdmin(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    if (!isAdminAuthenticated(req)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return handler(req);
  };
}
