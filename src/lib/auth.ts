import { prisma } from '@/lib/prisma';
import { sendMagicLinkEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a magic link for user authentication
 */
export async function createMagicLink(email: string): Promise<string | null> {
  try {
    // Validate environment variables
    if (!process.env.APP_URL) {
      console.error('❌ APP_URL environment variable is not set');
      return null;
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          timezone: 'America/New_York',
          isActive: true,
        },
      });
      console.log('✅ Created new user:', email);
    }

    // Create magic link token (expires in 15 minutes)
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.magicLink.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
        used: false,
      },
    });

    // Send email with magic link
    const magicLink = `${process.env.APP_URL}/api/auth/verify?token=${token}`;
    
    // In development, log the magic link
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Magic link (dev mode):', magicLink);
    }
    
    const result = await sendMagicLinkEmail(email, magicLink);

    if (!result) {
      console.error('❌ Failed to send magic link email to:', email);
      return null;
    }

    console.log('✅ Magic link sent to:', email);
    return token;
  } catch (error) {
    console.error('Error creating magic link:', error);
    return null;
  }
}

/**
 * Verifies a magic link token and returns user ID if valid
 */
export async function verifyMagicLink(token: string): Promise<string | null> {
  try {
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!magicLink) {
      return null;
    }

    // Check if token is expired
    if (magicLink.expiresAt < new Date()) {
      return null;
    }

    // Check if token was already used
    if (magicLink.used) {
      return null;
    }

    // Mark token as used
    await prisma.magicLink.update({
      where: { token },
      data: { used: true },
    });

    return magicLink.userId;
  } catch (error) {
    console.error('Error verifying magic link:', error);
    return null;
  }
}

/**
 * Gets user session data
 */
export async function getUserSession(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        twilioConfig: true,
        businessSettings: true,
        wallet: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      timezone: user.timezone,
      isActive: user.isActive,
      hasCompletedOnboarding: !!(user.twilioConfig && user.businessSettings),
      walletBalance: user.wallet ? user.wallet.balance : null,
    };
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
}
