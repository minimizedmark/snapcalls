import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

/**
 * Admin authentication endpoint
 * POST /api/admin/auth
 */
export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 400 }
      );
    }

    // Hash the provided password
    const hash = createHash('sha256').update(password).digest('hex');

    // Compare with environment variable
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminPasswordHash) {
      console.error('ADMIN_PASSWORD_HASH not set in environment');
      return NextResponse.json(
        { error: 'Admin authentication not configured' },
        { status: 500 }
      );
    }

    if (hash !== adminPasswordHash) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Set secure cookie
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('admin_auth', hash, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/admin',
    });

    return response;
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * Logout endpoint
 * DELETE /api/admin/auth
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_auth');
  return response;
}
