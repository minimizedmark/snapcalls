/**
 * Environment variables validation and typing
 * Includes fallbacks for build time
 */

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://placeholder',
  
  // Encryption
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'placeholder-32-byte-key-here-xxx',
  
  // NextAuth
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'placeholder-secret',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  
  // Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER || '',
  
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_PUBLIC_LINE_PRICE_ID: process.env.STRIPE_PUBLIC_LINE_PRICE_ID || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // Email
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@example.com',
  
  // Admin
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'changeme',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
  ADMIN_PHONE: process.env.ADMIN_PHONE || '',
  
  // Cron
  CRON_SECRET: process.env.CRON_SECRET || 'placeholder-secret',
  
  // Node env
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

export type Env = typeof env;
