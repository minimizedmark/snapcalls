import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { businessName, hoursStart, hoursEnd } = body;

    // Save business settings
    await prisma.businessSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        businessName,
        hoursStart,
        hoursEnd,
        daysOpen: [1, 2, 3, 4, 5], // Monday-Friday default
        timezone: user.timezone,
      },
      update: {
        businessName,
        hoursStart,
        hoursEnd,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Business info save error:', error);
    return NextResponse.json(
      { error: 'Failed to save business info' },
      { status: 500 }
    );
  }
}
