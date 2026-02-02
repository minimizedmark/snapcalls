import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fromDecimal } from '@/lib/pricing';

/**
 * Admin metrics endpoint
 * GET /api/admin/metrics
 */
export async function GET() {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User counts
    const [
      totalUsers,
      basicUsers,
      publicLineUsers,
      activeUsers,
      pausedUsers,
      todaySignups,
      monthSignups,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { subscriptionType: 'BASIC' } }),
      prisma.user.count({ where: { subscriptionType: 'PUBLIC_LINE' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { subscriptionStatus: 'paused' } }),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    ]);

    // Auto-upgrade funnel
    const [
      usersAt10Calls,
      usersAt15Calls,
      usersAt20Calls,
      todayUpgrades,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          subscriptionType: 'BASIC',
          directCallsThisMonth: { gte: 10 },
        },
      }),
      prisma.user.count({
        where: {
          subscriptionType: 'BASIC',
          directCallsThisMonth: { gte: 15 },
        },
      }),
      prisma.user.count({
        where: {
          subscriptionType: 'BASIC',
          directCallsThisMonth: { gte: 20 },
        },
      }),
      prisma.user.count({
        where: {
          subscriptionType: 'PUBLIC_LINE',
          createdAt: { gte: todayStart },
        },
      }),
    ]);

    // Revenue calculations
    const publicLineCount = publicLineUsers;
    const mrr = publicLineCount * 20; // $20/month per Public Line user

    // Call statistics
    const [
      totalCalls,
      todayCalls,
      monthCalls,
    ] = await Promise.all([
      prisma.callLog.count(),
      prisma.callLog.count({ where: { timestamp: { gte: todayStart } } }),
      prisma.callLog.count({ where: { timestamp: { gte: monthStart } } }),
    ]);

    // Calculate revenue from calls
    const callRevenue = await prisma.callLog.aggregate({
      where: { timestamp: { gte: monthStart } },
      _sum: { totalCost: true },
    });
    const monthUsageRevenue = callRevenue._sum.totalCost
      ? fromDecimal(callRevenue._sum.totalCost)
      : 0;

    const todayCallRevenue = await prisma.callLog.aggregate({
      where: { timestamp: { gte: todayStart } },
      _sum: { totalCost: true },
    });
    const todayRevenue = todayCallRevenue._sum.totalCost
      ? fromDecimal(todayCallRevenue._sum.totalCost)
      : 0;

    // Problem detection
    const [
      lowBalanceUsers,
      failedPayments,
      inactiveUsers,
    ] = await Promise.all([
      prisma.wallet.count({
        where: { balance: { lt: 5 } },
      }),
      prisma.user.count({
        where: { subscriptionStatus: 'paused' },
      }),
      prisma.user.count({
        where: {
          callLogs: {
            none: {
              timestamp: { gte: last30Days },
            },
          },
          createdAt: { lt: last30Days },
        },
      }),
    ]);

    // Wallet totals
    const walletTotal = await prisma.wallet.aggregate({
      _sum: { balance: true },
    });
    const totalWalletBalance = walletTotal._sum.balance
      ? fromDecimal(walletTotal._sum.balance)
      : 0;

    // Calculate estimated costs (SMS at $0.017 per message)
    const estimatedCosts = monthCalls * 0.017;
    const profitMargin = monthUsageRevenue > 0
      ? ((monthUsageRevenue - estimatedCosts) / monthUsageRevenue) * 100
      : 0;

    return NextResponse.json({
      users: {
        total: totalUsers,
        basic: basicUsers,
        publicLine: publicLineUsers,
        active: activeUsers,
        paused: pausedUsers,
        todaySignups,
        monthSignups,
      },
      autoUpgradeFunnel: {
        at10Calls: usersAt10Calls,
        at15Calls: usersAt15Calls,
        at20Calls: usersAt20Calls,
        todayUpgrades,
      },
      revenue: {
        mrr,
        arr: mrr * 12,
        monthUsageRevenue,
        todayRevenue,
        totalRevenue: mrr + monthUsageRevenue,
      },
      calls: {
        total: totalCalls,
        today: todayCalls,
        month: monthCalls,
      },
      costs: {
        estimated: estimatedCosts,
        profitMargin: profitMargin.toFixed(1),
      },
      problems: {
        lowBalance: lowBalanceUsers,
        failedPayments,
        inactive: inactiveUsers,
      },
      wallet: {
        totalBalance: totalWalletBalance,
      },
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
