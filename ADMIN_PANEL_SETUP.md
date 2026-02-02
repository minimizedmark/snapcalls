# 🛡️ ADMIN PANEL SETUP GUIDE

## What You Get

Your admin panel gives you complete visibility and control:

### ✅ Real-Time Monitoring
- Live metrics dashboard (auto-refreshes every 30 seconds)
- MRR, ARR, revenue tracking
- User counts (Basic vs Public Line)
- Auto-upgrade funnel visualization
- Profit margin calculations

### ✅ User Management
- List all users with advanced filtering
- Search by email or business name
- Quick actions: pause/resume service, add wallet funds, manual upgrades
- User details: subscription status, wallet balance, call counts
- Filter by: plan type, balance, upgrade status, activity

### ✅ Automated Alerts
- **Email alerts** for critical issues
- **SMS alerts** for urgent problems (optional)
- Alert monitoring every 15 minutes
- Triggers on:
  - 5+ failed payments
  - Revenue drops >50%
  - 10+ low balance users
  - 15+ inactive users
  - System errors

### ✅ Problem Detection
- Failed payment tracking
- Low balance warnings
- Stuck onboarding detection
- Auto-upgrade failures
- Revenue anomaly detection

---

## 📋 SETUP INSTRUCTIONS

### 1. Add Environment Variables (.env)

```bash
# Admin Panel Access
ADMIN_PASSWORD="YourSuperSecurePassword123!"

# Alert Notifications
ADMIN_EMAIL="your-email@example.com"     # Receives critical alerts via email
ADMIN_PHONE="+15875551234"                # (Optional) Receives SMS for urgent issues
```

**Security Notes:**
- Use a STRONG password (20+ characters recommended)
- Don't commit `.env` to version control
- Change password regularly
- Enable 2FA on your email account

---

### 2. Setup Alert Monitoring Cron Job

The admin panel needs a cron job to check for problems every 15 minutes.

#### Option A: Vercel Cron (Recommended)

Create/update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/reset-direct-calls",
      "schedule": "0 0 1 * *",
      "description": "Reset monthly direct call counts"
    },
    {
      "path": "/api/cron/check-alerts",
      "schedule": "*/15 * * * *",
      "description": "Monitor system health and send alerts"
    }
  ]
}
```

#### Option B: External Cron (cron-job.org)

1. Sign up at https://cron-job.org
2. Create new cron job:
   - **URL:** `https://yourdomain.com/api/cron/check-alerts`
   - **Schedule:** `*/15 * * * *` (every 15 minutes)
   - **HTTP Method:** GET
   - **Custom Headers:** 
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     ```

---

### 3. Test Alert System

**Manual test:**

```bash
# Trigger alert check manually
curl -X GET https://yourdomain.com/api/cron/check-alerts \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected response:**
```json
{
  "success": true,
  "alerts": 0,
  "critical": 0,
  "notificationSent": false,
  "timestamp": "2026-02-01T10:00:00.000Z"
}
```

**To test email alerts:**
1. Temporarily lower thresholds in `/src/lib/alerts.ts`
2. Wait 15 minutes for cron to run
3. Check your ADMIN_EMAIL inbox
4. Restore original thresholds

---

## 🎯 ACCESSING ADMIN PANEL

### First-Time Login

1. Navigate to: `https://yourdomain.com/admin`
2. You'll see the admin login page
3. Enter your `ADMIN_PASSWORD`
4. Click "Access Admin Panel"

**Cookie-based auth:**
- Stays logged in for 24 hours
- Secure, HTTP-only cookies
- Auto-expires after 24h

### Admin URLs

- **Dashboard:** `/admin`
- **User Management:** `/admin/users`
- **Login:** `/admin/login`

---

## 📊 USING THE DASHBOARD

### Key Metrics Section

**Today's Snapshot:**
- New signups today
- Current MRR (Monthly Recurring Revenue)
- Today's revenue
- Active user count

**Auto-Upgrade Funnel:**
- Users at 10+ calls (warning sent)
- Users at 15+ calls (hot leads)
- Users at 20+ calls (ready to upgrade)
- Today's auto-upgrades

**Money Printer Status:**
- Total calls this month
- Estimated SMS costs
- Revenue from calls
- Profit margin %

### Alerts Section

**Alert Levels:**
- 🚨 **CRITICAL** (red) - Immediate action required
- ⚠️ **WARNING** (yellow) - Watch closely
- 💡 **INFO** (blue) - Informational

**Critical Alerts Trigger:**
- Email sent immediately
- SMS sent (if ADMIN_PHONE configured)
- Shows prominently on dashboard

**Common Alerts:**

| Alert | Trigger | Action |
|-------|---------|--------|
| Failed Payments | 5+ users paused | Check Stripe, contact users |
| Revenue Drop | >50% decrease | Investigate system issues |
| Low Balance | 10+ users <$5 | Send reminder emails |
| Inactive Users | 15+ no calls 30d | Re-engagement campaign |
| Stuck Setup | 5+ incomplete | Check onboarding flow |

---

## 👥 USER MANAGEMENT

### Filtering Users

**Pre-built filters:**
- **All Users** - Complete list
- **Basic** - Basic plan only
- **Public Line** - Subscription users
- **10+ Calls** - Approaching upgrade
- **20+ Calls** - Ready for auto-upgrade
- **Paused** - Service paused
- **Low Balance** - Less than $5
- **Incomplete Setup** - Didn't fund wallet

### Search

- Search by email
- Search by business name
- Press Enter to search

### Quick Actions

**Pause/Resume Service:**
- Click pause icon to suspend service
- Click play icon to reactivate
- User retains wallet balance

**Manual Upgrade:**
- Shows for Basic users at 20+ calls
- Instantly upgrades to Public Line
- Sends confirmation email

**Add Wallet Funds:**
- Click $ icon
- Enter amount
- Funds added immediately
- Transaction logged

---

## 🚨 ALERT NOTIFICATIONS

### Email Alerts

**What triggers email:**
- 5+ failed payments
- Revenue drop >50%
- System errors

**Email includes:**
- Alert summary
- Specific details
- Direct link to admin dashboard
- Timestamp

**Email from:**
`Snap Calls <noreply@yourdomain.com>`

### SMS Alerts (Optional)

**Setup:**
Set `ADMIN_PHONE` in `.env`:
```bash
ADMIN_PHONE="+15875551234"
```

**What triggers SMS:**
- CRITICAL alerts only (no spam)
- System failures
- Major revenue issues

**SMS message:**
```
🚨 SNAP CALLS ALERT: 3 critical issues detected. 
Check admin dashboard immediately.
```

**Cost:**
- ~$0.0075 per SMS
- 1-2 per day max (only critical)
- ~$1/month total

---

## 🔧 TROUBLESHOOTING

### "Failed to load metrics"

**Cause:** Database connection issue

**Fix:**
1. Check `DATABASE_URL` in `.env`
2. Verify database is running
3. Check Prisma migrations: `npx prisma migrate status`

### No alerts showing

**Causes:**
- No critical issues (good!)
- Cron job not running
- Alert thresholds not met

**Check:**
```bash
# Test alert endpoint
curl https://yourdomain.com/api/admin/alerts
```

### Not receiving email alerts

**Checklist:**
1. ✅ `ADMIN_EMAIL` set in `.env`
2. ✅ `RESEND_API_KEY` configured
3. ✅ Cron job running every 15 min
4. ✅ Check spam folder
5. ✅ Verify email in Resend dashboard

### Cookie/login issues

**Solutions:**
- Clear browser cookies
- Use incognito mode
- Check `ADMIN_PASSWORD` matches
- Verify cookies enabled

---

## 🎯 BEST PRACTICES

### Daily Routine
1. Check dashboard (2 min)
2. Review any new alerts
3. Monitor auto-upgrade funnel
4. Check MRR growth

### Weekly Tasks
1. Review inactive users
2. Check low balance trends
3. Analyze conversion rates
4. Test alert system

### Monthly Review
1. Revenue analysis
2. User growth metrics
3. Auto-upgrade performance
4. Cost optimization

### Security
- Change admin password quarterly
- Enable 2FA on admin email
- Monitor login attempts
- Review access logs

---

## 📈 KEY METRICS TO WATCH

### Revenue Health
- **MRR Growth:** Should increase month-over-month
- **ARPU:** Average Revenue Per User
- **Churn Rate:** Keep below 5%

### User Health
- **Activation Rate:** % who fund wallet
- **Conversion Rate:** Basic → Public Line
- **Active Users:** Made call last 30 days

### System Health
- **Profit Margin:** Should stay >95%
- **Failed Payments:** Keep below 2%
- **Low Balance:** Normal if <10%

---

## 🚀 ADVANCED FEATURES

### Manual Interventions

**When to use:**
- Customer support requests
- Payment issues
- System errors
- Loyalty rewards

**Actions available:**
- Add wallet funds (refunds, credits)
- Pause service (payment issues)
- Manual upgrade (skip auto-upgrade)
- Resume service (after pause)

### Analytics Insights

**Auto-Upgrade Funnel:**
- Conversion rate: aim for 20%+
- Time to upgrade: track days
- Warning effectiveness: % who upgrade after warning

**Revenue Optimization:**
- Which tier converts best?
- What balance do users maintain?
- When do users churn?

---

## 📞 SUPPORT

**Having issues?**

1. Check this guide first
2. Review error logs in dashboard
3. Test with curl commands
4. Verify environment variables
5. Check cron job status

**Still stuck?**
- Review `/src/lib/alerts.ts` thresholds
- Check Prisma schema migrations
- Verify Stripe webhooks working
- Test email delivery manually

---

## ✅ DEPLOYMENT VERIFICATION

After deployment, verify:

- [ ] Can access `/admin` and login
- [ ] Dashboard loads with metrics
- [ ] User list displays correctly
- [ ] Alerts section shows (even if empty)
- [ ] Cron jobs configured and running
- [ ] Received test email alert
- [ ] (Optional) Received test SMS alert

**Your admin panel is ready when:**
✅ Dashboard shows real-time data
✅ User management loads
✅ Alerts monitoring active
✅ Email notifications working

---

**NOW YOU HAVE EYES ON EVERYTHING.** 👁️

No more flying blind. You'll know about problems before they become disasters.
