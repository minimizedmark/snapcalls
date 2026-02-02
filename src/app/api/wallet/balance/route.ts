import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getWalletBalance } from '@/lib/wallet';

/**
 * Get current wallet balance
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const balance = await getWalletBalance(session.user.id);

    return NextResponse.json({ balance });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return NextResponse.json({ error: 'Failed to get balance' }, { status: 500 });
  }
}
