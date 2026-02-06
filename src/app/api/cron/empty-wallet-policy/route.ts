import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseNumberToInventory } from '@/lib/number-inventory';

const DAYS_EMPTY_WALLET = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    console.error('❌ Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - DAYS_EMPTY_WALLET * MS_PER_DAY);

  try {
    const users = await prisma.user.findMany({
      where: {
        wallet: { balance: 0 },
        twilioConfig: { isNot: null },
      },
      include: {
        twilioConfig: true,
        walletTransactions: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    let processed = 0;
    let released = 0;

    for (const user of users) {
      const lastActivity = user.walletTransactions[0]?.timestamp ?? user.createdAt;
      if (lastActivity > cutoff) {
        continue;
      }

      const phoneNumber = user.twilioConfig?.phoneNumber;
      if (!phoneNumber) {
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await releaseNumberToInventory(phoneNumber, tx);

        await tx.twilioConfig.delete({
          where: { userId: user.id },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            isActive: false,
            subscriptionStatus: 'paused',
          },
        });
      });

      released += 1;
      processed += 1;
    }

    return NextResponse.json({
      success: true,
      cutoff: cutoff.toISOString(),
      candidates: users.length,
      processed,
      released,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Empty wallet policy error:', error);
    return NextResponse.json({ error: 'Failed to process policy' }, { status: 500 });
  }
}
