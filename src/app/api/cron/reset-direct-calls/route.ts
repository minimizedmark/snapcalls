import { NextRequest, NextResponse } from 'next/server';
import { resetMonthlyDirectCallCounts } from '@/lib/subscription';

/**
 * Cron job to reset direct call counts on the 1st of each month
 * 
 * Setup with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/reset-direct-calls",
 *     "schedule": "0 0 1 * *"
 *   }]
 * }
 * 
 * Or use external cron service (cron-job.org):
 * - URL: https://yourdomain.com/api/cron/reset-direct-calls
 * - Schedule: 0 0 1 * * (1st of month at midnight)
 * - Add header: Authorization: Bearer YOUR_CRON_SECRET
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    console.error('❌ Unauthorized cron request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    await resetMonthlyDirectCallCounts();
    
    console.log('✅ Monthly direct call counts reset successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Direct call counts reset',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error resetting direct call counts:', error);
    
    return NextResponse.json(
      { error: 'Failed to reset counts' },
      { status: 500 }
    );
  }
}
