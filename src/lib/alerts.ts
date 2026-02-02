import { prisma } from '@/lib/prisma';
import { fromDecimal } from '@/lib/pricing';
import { sendEmail } from '@/lib/email';
import { sendOwnerNotification } from '@/lib/twilio';

/**
 * Alert thresholds
 */
const THRESHOLDS = {
  CRITICAL_FAILED_PAYMENTS: 5,
  WARNING_LOW_BALANCE_USERS: 10,
  CRITICAL_REVENUE_DROP: 0.5, // 50% drop
  WARNING_INACTIVE_USERS: 15,
  CRITICAL_ERROR_RATE: 0.1, // 10% error rate
};

export interface Alert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  category: 'revenue' | 'users' | 'system' | 'payments';
  title: string;
  message: string;
  count?: number;
  timestamp: Date;
}

/**
 * Check for system issues and return alerts
 */
export async function checkSystemAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  try {
    // 1. Failed Payments (CRITICAL)
    const failedPayments = await prisma.user.count({
      where: { subscriptionStatus: 'paused' },
    });

    if (failedPayments >= THRESHOLDS.CRITICAL_FAILED_PAYMENTS) {
      alerts.push({
        id: 'failed-payments',
        level: 'critical',
        category: 'payments',
        title: '🚨 CRITICAL: Multiple Payment Failures',
        message: `${failedPayments} users have failed payments and paused service`,
        count: failedPayments,
        timestamp: now,
      });
    }

    // 2. Low Balance Users (WARNING)
    const lowBalanceUsers = await prisma.wallet.count({
      where: { balance: { lt: 500 } }, // Less than $5
    });

    if (lowBalanceUsers >= THRESHOLDS.WARNING_LOW_BALANCE_USERS) {
      alerts.push({
        id: 'low-balance',
        level: 'warning',
        category: 'users',
        title: '⚠️ Many Users Low on Balance',
        message: `${lowBalanceUsers} users have less than $5 in their wallet`,
        count: lowBalanceUsers,
        timestamp: now,
      });
    }

    // 3. Revenue Drop (CRITICAL)
    const todayRevenue = await prisma.callLog.aggregate({
      where: { timestamp: { gte: todayStart } },
      _sum: { totalCost: true },
    });

    const yesterdayRevenue = await prisma.callLog.aggregate({
      where: {
        timestamp: {
          gte: yesterdayStart,
          lt: todayStart,
        },
      },
      _sum: { totalCost: true },
    });

    const todayTotal = todayRevenue._sum.totalCost ? fromDecimal(todayRevenue._sum.totalCost) : 0;
    const yesterdayTotal = yesterdayRevenue._sum.totalCost ? fromDecimal(yesterdayRevenue._sum.totalCost) : 0;

    if (yesterdayTotal > 0 && todayTotal < yesterdayTotal * THRESHOLDS.CRITICAL_REVENUE_DROP) {
      const dropPercent = ((yesterdayTotal - todayTotal) / yesterdayTotal * 100).toFixed(0);
      alerts.push({
        id: 'revenue-drop',
        level: 'critical',
        category: 'revenue',
        title: '🚨 CRITICAL: Revenue Drop Detected',
        message: `Revenue down ${dropPercent}% from yesterday ($${yesterdayTotal.toFixed(2)} → $${todayTotal.toFixed(2)})`,
        timestamp: now,
      });
    }

    // 4. Inactive Users (WARNING)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const inactiveUsers = await prisma.user.count({
      where: {
        callLogs: {
          none: {
            timestamp: { gte: last30Days },
          },
        },
        createdAt: { lt: last30Days },
      },
    });

    if (inactiveUsers >= THRESHOLDS.WARNING_INACTIVE_USERS) {
      alerts.push({
        id: 'inactive-users',
        level: 'warning',
        category: 'users',
        title: '⚠️ High Inactive User Count',
        message: `${inactiveUsers} users haven't made a call in 30+ days`,
        count: inactiveUsers,
        timestamp: now,
      });
    }

    // 5. Users Stuck at Setup (WARNING)
    const stuckUsers = await prisma.user.count({
      where: {
        setupFeePaid: false,
        createdAt: { lt: yesterdayStart },
      },
    });

    if (stuckUsers > 5) {
      alerts.push({
        id: 'stuck-setup',
        level: 'warning',
        category: 'users',
        title: '⚠️ Users Stuck in Onboarding',
        message: `${stuckUsers} users created accounts but didn't complete setup`,
        count: stuckUsers,
        timestamp: now,
      });
    }

    // 6. Auto-Upgrade Failures (INFO)
    const usersAbove20Calls = await prisma.user.count({
      where: {
        subscriptionType: 'BASIC',
        directCallsThisMonth: { gte: 20 },
      },
    });

    if (usersAbove20Calls > 0) {
      alerts.push({
        id: 'upgrade-pending',
        level: 'info',
        category: 'users',
        title: `💡 ${usersAbove20Calls} Users Ready for Auto-Upgrade`,
        message: `These users hit 20+ calls but haven't upgraded yet - check for payment issues`,
        count: usersAbove20Calls,
        timestamp: now,
      });
    }

    return alerts;
  } catch (error) {
    console.error('❌ Error checking system alerts:', error);
    
    // Critical: Alert system itself is broken
    alerts.push({
      id: 'system-error',
      level: 'critical',
      category: 'system',
      title: '🚨 ALERT SYSTEM ERROR',
      message: 'Failed to check system status - investigate immediately',
      timestamp: now,
    });

    return alerts;
  }
}

/**
 * Send alert notifications to admin
 */
export async function notifyAdmin(alerts: Alert[]): Promise<void> {
  const criticalAlerts = alerts.filter(a => a.level === 'critical');
  
  if (criticalAlerts.length === 0) {
    return; // No critical alerts, don't spam
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPhone = process.env.ADMIN_PHONE;

  // Send email summary
  if (adminEmail) {
    const alertList = criticalAlerts
      .map(a => `- ${a.title}\n  ${a.message}`)
      .join('\n\n');

    await sendEmail(adminEmail, {
      subject: `🚨 SNAP CALLS ALERT: ${criticalAlerts.length} Critical Issues`,
      template: 'admin-alert',
      data: {
        alertCount: criticalAlerts.length,
        alerts: criticalAlerts,
        alertList,
        dashboardUrl: `${process.env.APP_URL}/admin`,
      },
    });
  }

  // Send SMS for CRITICAL only (don't spam)
  if (adminPhone && criticalAlerts.length > 0) {
    const message = `🚨 SNAP CALLS ALERT: ${criticalAlerts.length} critical issues detected. Check admin dashboard immediately.`;
    
    try {
      await sendOwnerNotification(adminPhone, message);
    } catch (error) {
      console.error('Failed to send SMS alert:', error);
    }
  }
}

/**
 * Email template for admin alerts
 */
export function getAdminAlertTemplate(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #1f2937; padding: 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #111827; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
          <tr>
            <td style="background-color: #DC2626; padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🚨 SYSTEM ALERT</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 20px;">
              <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">${data.alertCount} Critical Issues Detected</h2>
              
              <div style="background-color: #1f2937; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="color: #FCA5A5; margin: 0; font-weight: 600; white-space: pre-line;">${data.alertList}</p>
              </div>
              
              <p style="color: #9ca3af; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                Immediate action required. Check the admin dashboard for full details and remediation options.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.dashboardUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Open Admin Dashboard
                </a>
              </div>
              
              <p style="color: #6b7280; margin: 30px 0 0 0; font-size: 14px; line-height: 1.5;">
                This is an automated alert from Snap Calls monitoring system.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1f2937; padding: 20px; text-align: center;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Snap Calls Admin Monitoring
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
