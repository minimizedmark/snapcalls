import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { getUserDataExport } from '@/lib/data-export';

export const GET = requireAdmin(async (req: NextRequest) => {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const email = req.nextUrl.searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'Missing userId or email' },
        { status: 400 }
      );
    }

    let resolvedUserId = userId;

    if (!resolvedUserId && email) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      resolvedUserId = user.id;
    }

    const exportData = await getUserDataExport(resolvedUserId!);

    if (!exportData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('Error exporting admin user data:', error);
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
});
