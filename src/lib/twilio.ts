import twilio from 'twilio';
import { decrypt } from './encryption';

const ADMIN_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const ADMIN_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const ADMIN_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

if (!ADMIN_ACCOUNT_SID || !ADMIN_AUTH_TOKEN || !ADMIN_FROM_NUMBER) {
  console.warn('⚠️  Admin Twilio credentials not configured');
}

/**
 * Gets admin Twilio client (for sending notifications to business owners)
 */
export function getAdminTwilioClient() {
  if (!ADMIN_ACCOUNT_SID || !ADMIN_AUTH_TOKEN) {
    throw new Error('Admin Twilio credentials not configured');
  }
  return twilio(ADMIN_ACCOUNT_SID, ADMIN_AUTH_TOKEN);
}

/**
 * Creates a Twilio client using user's encrypted credentials
 */
export function getUserTwilioClient(encryptedSid: string, encryptedToken: string) {
  const accountSid = decrypt(encryptedSid);
  const authToken = decrypt(encryptedToken);
  return twilio(accountSid, authToken);
}

/**
 * Sends SMS using user's Twilio account
 */
export async function sendUserSms(
  encryptedSid: string,
  encryptedToken: string,
  fromNumber: string,
  toNumber: string,
  message: string
): Promise<{ sid: string; status: string }> {
  const client = getUserTwilioClient(encryptedSid, encryptedToken);

  const result = await client.messages.create({
    from: fromNumber,
    to: toNumber,
    body: message,
  });

  return {
    sid: result.sid,
    status: result.status,
  };
}

/**
 * Sends notification SMS to business owner using admin account
 */
export async function sendOwnerNotification(
  toNumber: string,
  message: string
): Promise<{ sid: string; status: string }> {
  const client = getAdminTwilioClient();

  if (!ADMIN_FROM_NUMBER) {
    throw new Error('Admin from number not configured');
  }

  const result = await client.messages.create({
    from: ADMIN_FROM_NUMBER,
    to: toNumber,
    body: message,
  });

  return {
    sid: result.sid,
    status: result.status,
  };
}

/**
 * Validates Twilio webhook signature
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!ADMIN_AUTH_TOKEN) {
    throw new Error('Twilio auth token not configured');
  }
  return twilio.validateRequest(ADMIN_AUTH_TOKEN, signature, url, params);
}

/**
 * Formats phone number for display
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX for US numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Format as +X (XXX) XXX-XXXX for international
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return as-is if doesn't match expected format
  return phoneNumber;
}

/**
 * Normalizes phone number to E.164 format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');

  // Add +1 for US numbers if not present
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }

  // Assume it's already in correct format
  return phoneNumber.startsWith('+') ? phoneNumber : `+${digits}`;
}

/**
 * Verifies Twilio credentials by making a test API call
 */
export async function verifyTwilioCredentials(
  accountSid: string,
  authToken: string
): Promise<boolean> {
  try {
    const client = twilio(accountSid, authToken);
    await client.api.accounts(accountSid).fetch();
    return true;
  } catch {
    return false;
  }
}
