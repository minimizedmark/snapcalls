import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fromDecimal, toDecimal } from '@/lib/pricing';

/**
 * Get users with filtering and pagination
 * GET /api/admin/users?filter=...&page=...&limit=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    let where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { businessSettings: { businessName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Apply filters
    switch (filter) {
      case 'basic':
        where.subscriptionType = 'BASIC';
        break;
      case 'public-line':
        where.subscriptionType = 'PUBLIC_LINE';
        break;
      case 'paused':
        where.subscriptionStatus = 'paused';
        break;
      case 'low-balance':
        where.wallet = { balance: { lt: 500 } }; // Less than $5
        break;
      case 'approaching-upgrade':
        where.AND = [
          { subscriptionType: 'BASIC' },
          { directCallsThisMonth: { gte: 10 } },
        ];
        break;
      case 'ready-upgrade':
        where.AND = [
          { subscriptionType: 'BASIC' },
          { directCallsThisMonth: { gte: 20 } },
        ];
        break;
      case 'incomplete-setup':
        where.setupFeePaid = false;
        break;
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wallet: true,
          businessSettings: true,
          twilioConfig: true,
          stripeCustomer: true,
          _count: {
            select: {
              callLogs: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Format response
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      businessName: user.businessSettings?.businessName || 'N/A',
      phoneNumber: user.twilioConfig?.phoneNumber || 'N/A',
      subscriptionType: user.subscriptionType,
      subscriptionStatus: user.subscriptionStatus,
      setupFeePaid: user.setupFeePaid,
      walletBalance: user.wallet ? fromDecimal(user.wallet.balance) : 0,
      directCallsThisMonth: user.directCallsThisMonth,
      totalCalls: user._count.callLogs,
      isActive: user.isActive,
      createdAt: user.createdAt,
      stripeCustomerId: user.stripeCustomer?.stripeCustomerId || null,
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * Admin actions on specific user
 * POST /api/admin/users
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, action, data } = await req.json();

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'pause':
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: 'paused', isActive: false },
        });
        break;

      case 'resume':
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: 'active', isActive: true },
        });
        break;

      case 'add-wallet-funds':
        const amount = data.amount;
        if (!amount || amount <= 0) {
          return NextResponse.json(
            { error: 'Invalid amount' },
            { status: 400 }
          );
        }
        
        const wallet = await prisma.wallet.findUnique({
          where: { userId },
        });
        
        if (!wallet) {
          return NextResponse.json(
            { error: 'Wallet not found' },
            { status: 404 }
          );
        }

        const currentBalanceCents = fromDecimal(wallet.balance); // Already in cents
        const amountCents = amount * 100; // Convert dollars to cents
        const newBalanceCents = currentBalanceCents + amountCents;
        
        await prisma.wallet.update({
          where: { userId },
          data: {
            balance: toDecimal(newBalanceCents),
          },
        });
        
        // Log transaction
        await prisma.walletTransaction.create({
          data: {
            userId,
            amount: toDecimal(amountCents),
            type: 'CREDIT',
            description: 'Admin credit',
            balanceAfter: toDecimal(newBalanceCents),
          },
        });
        break;

      case 'manual-upgrade':
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionType: 'PUBLIC_LINE' },
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error performing user action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
