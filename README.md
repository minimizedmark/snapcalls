# Snap Calls

**Never miss another customer. It's a snap.**

Snap Calls is a production-ready SaaS application that automatically responds to missed calls for small businesses. Built with Next.js 15, Prisma, and Stripe.

## 🚀 Features

- **Automatic SMS Responses** - Send custom messages when customers call and you can't answer
- **Business Hours Awareness** - Different messages for business hours, after hours, and voicemails
- **VIP Contact Management** - Track and prioritize your most important customers
- **Wallet System** - Pay-as-you-go pricing with wallet credits and bonuses
- **Follow-up Sequences** - Automated follow-up messages to keep customers engaged
- **Two-Way Conversations** - Customers can reply and you'll be notified
- **Call Analytics** - Track all missed calls and responses in one dashboard
- **PWA Support** - Install as a mobile app

## 💰 Pricing

- **Base cost:** $1.00 per call
- **Optional features:**
  - Response sequences: +$0.50
  - Caller recognition: +$0.25
  - Two-way conversation: +$0.50
  - VIP priority: +$0.25-$0.50
  - Voicemail transcription: +$0.25

**Wallet Deposits with Bonuses:**
- $20 → receive $23 (15% bonus)
- $50 → receive $60 (20% bonus)
- $100 → receive $150 (50% bonus!)

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with magic links
- **Payments:** Stripe
- **Communications:** Twilio (SMS)
- **Email:** Resend
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/minimizedmark/snap.git
cd snap
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:
- `DATABASE_URL` - PostgreSQL connection string
- `ENCRYPTION_KEY` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- Twilio credentials (for owner notifications)
- Stripe API keys
- Resend API key

4. Set up the database:
```bash
npm run db:push
npm run db:seed
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🔧 Configuration

### Twilio Webhook Setup

Configure your Twilio phone number to send webhooks to:
- **Call webhook:** `https://yourdomain.com/api/webhooks/twilio/call`
- **SMS webhook:** `https://yourdomain.com/api/webhooks/twilio/sms`

### Stripe Webhook Setup

Add webhook endpoint in Stripe Dashboard:
- **URL:** `https://yourdomain.com/api/webhooks/stripe`
- **Events to listen to:**
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`

## 📱 PWA Installation

The app can be installed as a Progressive Web App on mobile devices:
1. Open the app in your mobile browser
2. Tap "Add to Home Screen"
3. The app will work like a native app

## 🔒 Security Features

- AES-256-GCM encryption for Twilio credentials
- Magic link authentication (no passwords)
- Webhook signature validation
- Rate limiting on API endpoints
- Secure session management

## 📊 Database Schema

The application uses a comprehensive Prisma schema with tables for:
- Users and authentication
- Business settings and message templates
- Twilio configuration (encrypted)
- Wallet and transactions
- Call logs and response sequences
- VIP contacts
- Feature flags and notifications

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

Build command: `prisma generate && next build`

## 📝 License

MIT

## 🤝 Support

For support, email support@snapcalls.app or visit our documentation.

---

**It's a snap to never miss another customer!** 🎉
