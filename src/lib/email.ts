import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@send.snappcalls.app';

let resendInstance: Resend | null = null;

function getResendClient() {
  if (!RESEND_API_KEY) {
    console.warn('⚠️  Resend API key not configured - emails will not be sent');
    return null;
  }
  
  if (!resendInstance) {
    resendInstance = new Resend(RESEND_API_KEY);
  }
  return resendInstance;
}

/**
 * Sends a magic link email
 */
export async function sendMagicLinkEmail(
  to: string,
  magicLink: string
): Promise<{ id: string } | null> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error('❌ Resend client not configured - check RESEND_API_KEY');
      return null;
    }

    console.log('📧 Attempting to send magic link email to:', to);

    const { data, error } = await resend.emails.send({
      from: `Snap Calls <${FROM_EMAIL}>`,
      to,
      subject: 'Sign in to Snap Calls',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color: #000000; padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">Snap Calls</h1>
                  <p style="color: #0EA5E9; margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">It's a snap</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 20px;">
                  <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Sign in to your account</h2>
                  <p style="color: #6b7280; margin: 0 0 30px 0; font-size: 16px; line-height: 1.5;">
                    Click the button below to sign in to your Snap Calls account. This link will expire in 15 minutes.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${magicLink}" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Sign In
                    </a>
                  </div>
                  <p style="color: #9ca3af; margin: 30px 0 0 0; font-size: 14px; line-height: 1.5;">
                    If you didn't request this email, you can safely ignore it.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">
                    © ${new Date().getFullYear()} Snap Calls. Never miss another customer.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('❌ Failed to send magic link email:', error);
      return null;
    }

    console.log('✅ Magic link email sent successfully. ID:', data?.id);
    return data;
  } catch (error) {
    console.error('❌ Error sending magic link email:', error);
    return null;
  }
}

/**
 * Sends a low balance alert email
 */
export async function sendLowBalanceAlertEmail(
  to: string,
  businessName: string,
  balance: number,
  _alertLevel: number
): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error('Resend client not configured');
      return;
    }

    await resend.emails.send({
      from: `Snap Calls Alerts <${FROM_EMAIL}>`,
      to,
      subject: `⚠️ Wallet Balance Alert - $${balance.toFixed(2)} Remaining`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color: #DC2626; padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">⚠️ Low Balance Alert</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 20px;">
                  <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Your wallet balance is low</h2>
                  <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                    Hi ${businessName},
                  </p>
                  <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                    Your Snap Calls wallet balance has dropped to <strong style="color: #DC2626;">$${balance.toFixed(2)}</strong>.
                  </p>
                  ${balance === 0 ? `
                    <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                      <p style="color: #991B1B; margin: 0; font-weight: 600;">Service Paused</p>
                      <p style="color: #991B1B; margin: 8px 0 0 0; font-size: 14px;">Your service has been automatically paused. Add funds to resume responding to missed calls.</p>
                    </div>
                  ` : `
                    <p style="color: #6b7280; margin: 0 0 30px 0; font-size: 16px; line-height: 1.5;">
                      To continue responding to missed calls, please add funds to your wallet.
                    </p>
                  `}
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL}/wallet" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Add Funds Now
                    </a>
                  </div>
                  <p style="color: #9ca3af; margin: 30px 0 0 0; font-size: 14px; line-height: 1.5;">
                    Consider enabling auto-reload to never miss a call!
                  </p>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">
                    © ${new Date().getFullYear()} Snap Calls. Never miss another customer.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send low balance alert email:', error);
  }
}

/**
 * Sends a missed call notification email
 */
export async function sendMissedCallNotificationEmail(
  to: string,
  businessName: string,
  callerNumber: string,
  callerName: string | null,
  messageType: string,
  timestamp: Date
): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error('Resend client not configured');
      return;
    }

    await resend.emails.send({
      from: `Snap Calls Notifications <${FROM_EMAIL}>`,
      to,
      subject: `📞 Missed Call from ${callerName || callerNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background-color: #000000; padding: 40px 20px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">📞 Missed Call</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 20px;">
                  <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">${callerName || 'New Caller'}</h2>
                  <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 16px;">
                    <strong>Phone:</strong> ${callerNumber}
                  </p>
                  <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 16px;">
                    <strong>Time:</strong> ${timestamp.toLocaleString()}
                  </p>
                  <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px;">
                    <strong>Response Type:</strong> ${messageType}
                  </p>
                  <div style="background-color: #F0F9FF; border-left: 4px solid #0EA5E9; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <p style="color: #0C4A6E; margin: 0; font-weight: 600;">Auto-response sent!</p>
                    <p style="color: #0C4A6E; margin: 8px 0 0 0; font-size: 14px;">We automatically sent your ${messageType} message to this caller.</p>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.APP_URL}/calls" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View Call Details
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                  <p style="color: #6b7280; margin: 0; font-size: 14px;">
                    © ${new Date().getFullYear()} Snap Calls. Never miss another customer.
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Failed to send missed call notification email:', error);
  }
}

/**
 * Generic email sender for subscription events
 */
export async function sendEmail(
  to: string,
  options: {
    subject: string;
    template: string;
    data: Record<string, any>;
  }
): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error('Resend client not configured');
      return;
    }

    const html = getEmailTemplate(options.template, options.data);

    await resend.emails.send({
      from: `Snap Calls <${FROM_EMAIL}>`,
      to,
      subject: options.subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

/**
 * Gets email template HTML based on template name
 */
function getEmailTemplate(template: string, data: Record<string, any>): string {
  const templates: Record<string, (data: any) => string> = {
    'upgrade-warning': (d) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color: #F59E0B; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">⚠️ Heads Up!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">You're approaching the Public Line upgrade</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  You've received <strong>${d.callCount} direct calls</strong> this month on your Snap Calls number.
                </p>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  If you're using this number as your main business line (on your website, Google Business, etc.), you'll need the <strong>Public Line plan</strong>.
                </p>
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #92400E; margin: 0; font-weight: 600;">Auto-upgrade at ${d.upgradeThreshold} calls</p>
                  <p style="color: #92400E; margin: 8px 0 0 0; font-size: 14px;">At ${d.upgradeThreshold} direct calls, you'll automatically upgrade to Public Line ($20/month). Usage fees ($1/call) stay the same.</p>
                </div>
                <p style="color: #6b7280; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                  <strong>Want to upgrade now?</strong> Beat the rush and get started with Public Line today.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Upgrade to Public Line
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss another customer.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'auto-upgraded-wallet': (d) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color: #0EA5E9; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🎉 Upgraded to Public Line</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Welcome to Public Line!</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  You hit ${d.directCalls} direct calls this month, so we've automatically upgraded you to our Public Line plan.
                </p>
                <div style="background-color: #F0F9FF; border-left: 4px solid #0EA5E9; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #0C4A6E; margin: 0; font-weight: 600;">First month paid from wallet</p>
                  <p style="color: #0C4A6E; margin: 8px 0 0 0; font-size: 14px;">We've deducted $20 from your wallet for the first month. Future months will be charged to your card automatically.</p>
                </div>
                <p style="color: #6b7280; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                  <strong>What you get:</strong>
                </p>
                <ul style="color: #6b7280; font-size: 16px; line-height: 1.8;">
                  <li>Use your number as your main business line</li>
                  <li>Unlimited direct calls</li>
                  <li>All existing features (missed call responses, etc.)</li>
                  <li>$20/month subscription + $1 per missed call response</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    View Dashboard
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss another customer.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'auto-upgraded-card': (d) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color: #0EA5E9; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🎉 Upgraded to Public Line</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Welcome to Public Line!</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  You hit ${d.directCalls} direct calls this month, so we've automatically upgraded you to our Public Line plan.
                </p>
                <div style="background-color: #F0F9FF; border-left: 4px solid #0EA5E9; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #0C4A6E; margin: 0; font-weight: 600;">First month charged to card</p>
                  <p style="color: #0C4A6E; margin: 8px 0 0 0; font-size: 14px;">We've charged $20 to your card on file. Future months will be billed automatically on the 1st.</p>
                </div>
                <p style="color: #6b7280; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                  <strong>What you get:</strong>
                </p>
                <ul style="color: #6b7280; font-size: 16px; line-height: 1.8;">
                  <li>Use your number as your main business line</li>
                  <li>Unlimited direct calls</li>
                  <li>All existing features (missed call responses, etc.)</li>
                  <li>$20/month subscription + $1 per missed call response</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    View Dashboard
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss another customer.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'payment-method-required': () => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color: #DC2626; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">⚠️ Action Required</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Payment Method Needed</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  You've reached the Public Line upgrade threshold, but we don't have a payment method on file.
                </p>
                <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #991B1B; margin: 0; font-weight: 600;">Add a payment method to continue</p>
                  <p style="color: #991B1B; margin: 8px 0 0 0; font-size: 14px;">Please add a payment method to upgrade to Public Line and continue using your number.</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Add Payment Method
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss another customer.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'payment-failed': () => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color: #DC2626; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">⚠️ Payment Failed</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">Service Paused</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  Your Public Line subscription payment failed. Your service has been paused until payment is successful.
                </p>
                <div style="background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #991B1B; margin: 0; font-weight: 600;">Update your payment method</p>
                  <p style="color: #991B1B; margin: 8px 0 0 0; font-size: 14px;">Please update your payment method in your dashboard to restore service.</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Update Payment Method
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss another customer.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'manual-upgrade': () => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color: #0EA5E9; padding: 40px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🎉 Welcome to Public Line!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px 20px;">
                <h2 style="color: #000000; margin: 0 0 20px 0; font-size: 24px;">You're all set!</h2>
                <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
                  You've successfully upgraded to the Public Line plan.
                </p>
                <p style="color: #6b7280; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                  <strong>What you get:</strong>
                </p>
                <ul style="color: #6b7280; font-size: 16px; line-height: 1.8;">
                  <li>Use your number as your main business line</li>
                  <li>Unlimited direct calls</li>
                  <li>All existing features (missed call responses, etc.)</li>
                  <li>$20/month subscription + $1 per missed call response</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.APP_URL}/dashboard" style="display: inline-block; background-color: #0EA5E9; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    Go to Dashboard
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  © ${new Date().getFullYear()} Snap Calls. Never miss another customer.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    
    'admin-alert': (d) => `
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
                <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">${d.alertCount} Critical Issues Detected</h2>
                
                <div style="background-color: #1f2937; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #FCA5A5; margin: 0; font-weight: 600; white-space: pre-line;">${d.alertList}</p>
                </div>
                
                <p style="color: #9ca3af; margin: 20px 0; font-size: 16px; line-height: 1.5;">
                  Immediate action required. Check the admin dashboard for full details and remediation options.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${d.dashboardUrl}" style="display: inline-block; background-color: #DC2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
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
    `,
  };

  const templateFn = templates[template];
  if (!templateFn) {
    console.error('Unknown email template:', template);
    return '';
  }

  return templateFn(data);
}

