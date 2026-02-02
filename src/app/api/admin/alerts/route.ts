import { NextResponse } from 'next/server';
import { checkSystemAlerts } from '@/lib/alerts';

/**
 * Get current system alerts
 * GET /api/admin/alerts
 */
export async function GET() {
  try {
    const alerts = await checkSystemAlerts();
    
    return NextResponse.json({
      alerts,
      count: alerts.length,
      critical: alerts.filter(a => a.level === 'critical').length,
      warning: alerts.filter(a => a.level === 'warning').length,
      info: alerts.filter(a => a.level === 'info').length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
