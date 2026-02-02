import { NextRequest, NextResponse } from 'next/server';
import { checkSystemAlerts, notifyAdmin } from '@/lib/alerts';

/**
 * Cron job to check for critical alerts and notify admin
 * 
 * Setup with Vercel Cron (runs every 15 minutes):
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-alerts",
 *     "schedule": "*/15 * * * *"
 *   }]
 * }
 * 
 * Or use external cron service (cron-job.org):
 * - URL: https://yourdomain.com/api/cron/check-alerts
 * - Schedule: */15 * * * * (every 15 minutes)
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
    const alerts = await checkSystemAlerts();
    const criticalCount = alerts.filter(a => a.level === 'critical').length;
    
    // Only notify if there are critical alerts
    if (criticalCount > 0) {
      await notifyAdmin(alerts);
      console.log(`🚨 Alert notification sent: ${criticalCount} critical issues`);
    }
    
    return NextResponse.json({
      success: true,
      alerts: alerts.length,
      critical: criticalCount,
      notificationSent: criticalCount > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error checking alerts:', error);
    
    // This is critical - alert monitoring failed
    // Try to notify admin via email
    try {
      await notifyAdmin([{
        id: 'monitoring-failed',
        level: 'critical',
        category: 'system',
        title: '🚨 ALERT MONITORING FAILED',
        message: 'Alert check cron job encountered an error. System may be compromised.',
        timestamp: new Date(),
      }]);
    } catch (notifyError) {
      console.error('❌ Failed to send failure notification:', notifyError);
    }
    
    return NextResponse.json(
      { error: 'Failed to check alerts' },
      { status: 500 }
    );
  }
}
