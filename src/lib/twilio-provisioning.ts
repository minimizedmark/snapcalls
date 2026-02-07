import twilio from 'twilio';
import { assignAvailableNumber } from './number-inventory';

const ADMIN_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const ADMIN_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

if (!ADMIN_ACCOUNT_SID || !ADMIN_AUTH_TOKEN) {
  console.warn('⚠️  Admin Twilio credentials not configured');
}

function getTwilioClient() {
  if (!ADMIN_ACCOUNT_SID || !ADMIN_AUTH_TOKEN) {
    throw new Error('Admin Twilio credentials required for number provisioning');
  }
  return twilio(ADMIN_ACCOUNT_SID, ADMIN_AUTH_TOKEN);
}

/**
 * Retry helper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`⏳ Retry attempt ${attempt + 1}/${retries} after ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

export interface AcquireNumberResult {
  phoneNumber: string;
  source: 'pool' | 'twilio';
  isRequestedAreaCode: boolean;
  isNonRegional: boolean;
  isTemp: boolean; // true if SnapLine user got a non-regional fallback
}

/**
 * Acquire a phone number using the fallback chain:
 * 1. Try pool inventory with requested area code
 * 2. Try Twilio with requested area code
 * 3. Try Twilio with any regional number (no area code filter)
 * 4. Try Twilio non-regional numbers (toll-free for US, non-geo for CA)
 * 
 * Throws if all acquisition methods fail after retries.
 */
export async function acquireNumber(params: {
  userId: string;
  requestedAreaCode?: string;
  country: 'US' | 'CA';
  isSnapLine: boolean;
}): Promise<AcquireNumberResult> {
  const { userId, requestedAreaCode, country, isSnapLine } = params;

  console.log('🔍 Acquiring number:', { userId, requestedAreaCode, country, isSnapLine });

  // Step 1: Try pool inventory with requested area code
  if (requestedAreaCode) {
    try {
      const poolNumber = await assignAvailableNumber(userId, requestedAreaCode);
      if (poolNumber) {
        console.log('✅ Assigned from pool:', poolNumber);
        return {
          phoneNumber: poolNumber,
          source: 'pool',
          isRequestedAreaCode: true,
          isNonRegional: false,
          isTemp: false,
        };
      }
    } catch (error) {
      console.log('⚠️  Pool assignment failed:', error);
    }
  }

  // Step 2: Try Twilio with requested area code
  if (requestedAreaCode) {
    try {
      const twilioNumber = await withRetry(() =>
        purchaseTwilioNumber(requestedAreaCode, country)
      );
      console.log('✅ Purchased from Twilio (requested area code):', twilioNumber);
      return {
        phoneNumber: twilioNumber,
        source: 'twilio',
        isRequestedAreaCode: true,
        isNonRegional: false,
        isTemp: false,
      };
    } catch (error) {
      console.log('⚠️  Twilio purchase with requested area code failed:', error);
    }
  }

  // Step 3: Try Twilio with any regional number (no area code filter)
  try {
    const twilioNumber = await withRetry(() =>
      purchaseTwilioNumber(undefined, country)
    );
    console.log('✅ Purchased from Twilio (any regional):', twilioNumber);
    return {
      phoneNumber: twilioNumber,
      source: 'twilio',
      isRequestedAreaCode: false,
      isNonRegional: false,
      isTemp: false,
    };
  } catch (error) {
    console.log('⚠️  Twilio purchase with any regional number failed:', error);
  }

  // Step 4: Try Twilio non-regional numbers (toll-free/national)
  try {
    const nonRegionalNumber = await withRetry(() =>
      purchaseNonRegionalNumber(country)
    );
    console.log('✅ Purchased non-regional number:', nonRegionalNumber);
    return {
      phoneNumber: nonRegionalNumber,
      source: 'twilio',
      isRequestedAreaCode: false,
      isNonRegional: true,
      isTemp: isSnapLine, // Mark as temp only for SnapLine subscribers
    };
  } catch (error) {
    console.log('⚠️  Non-regional number purchase failed:', error);
  }

  // All acquisition methods failed
  throw new Error('Unable to acquire phone number: all methods exhausted');
}

/**
 * Purchase a new Twilio phone number for a customer
 * Returns the purchased phone number in E.164 format
 */
export async function purchaseTwilioNumber(areaCode?: string, country: 'US' | 'CA' = 'US'): Promise<string> {
  const client = getTwilioClient();

  // Search for available numbers
  const availableNumbers = await client.availablePhoneNumbers(country).local.list({
    areaCode: areaCode ? parseInt(areaCode, 10) : undefined,
    limit: 1,
  });

  if (availableNumbers.length === 0) {
    throw new Error(`No available phone numbers found for ${country}${areaCode ? ` with area code ${areaCode}` : ''}`);
  }

  const numberToPurchase = availableNumbers[0].phoneNumber;

  // Purchase the number with webhooks pre-configured
  const purchasedNumber = await client.incomingPhoneNumbers.create({
    phoneNumber: numberToPurchase,
    voiceUrl: 'https://snapcalls.app/api/webhooks/twilio/call',
    voiceMethod: 'POST',
    statusCallback: 'https://snapcalls.app/api/webhooks/twilio/status',
    statusCallbackMethod: 'POST',
    smsUrl: 'https://snapcalls.app/api/webhooks/twilio/sms',
    smsMethod: 'POST',
  });

  return purchasedNumber.phoneNumber;
}

/**
 * Purchase a non-regional number (toll-free for US, non-geographic for CA)
 */
async function purchaseNonRegionalNumber(country: 'US' | 'CA' = 'US'): Promise<string> {
  const client = getTwilioClient();

  // For US, use toll-free. For CA, use mobile/national
  const availableNumbers = country === 'US'
    ? await client.availablePhoneNumbers(country).tollFree.list({ limit: 1 })
    : await client.availablePhoneNumbers(country).mobile.list({ limit: 1 });

  if (availableNumbers.length === 0) {
    throw new Error(`No non-regional numbers available for ${country}`);
  }

  const numberToPurchase = availableNumbers[0].phoneNumber;

  // Purchase the number with webhooks pre-configured
  const purchasedNumber = await client.incomingPhoneNumbers.create({
    phoneNumber: numberToPurchase,
    voiceUrl: 'https://snapcalls.app/api/webhooks/twilio/call',
    voiceMethod: 'POST',
    statusCallback: 'https://snapcalls.app/api/webhooks/twilio/status',
    statusCallbackMethod: 'POST',
    smsUrl: 'https://snapcalls.app/api/webhooks/twilio/sms',
    smsMethod: 'POST',
  });

  return purchasedNumber.phoneNumber;
}

/**
 * Release a Twilio phone number (when customer cancels)
 */
export async function releaseTwilioNumber(phoneNumber: string): Promise<void> {
  const client = getTwilioClient();

  // Find the number SID
  const numbers = await client.incomingPhoneNumbers.list({
    phoneNumber: phoneNumber,
  });

  if (numbers.length === 0) {
    throw new Error(`Phone number ${phoneNumber} not found`);
  }

  // Release it
  await client.incomingPhoneNumbers(numbers[0].sid).remove();
}

/**
 * Send SMS using admin Twilio account (for customer's purchased number)
 */
export async function sendSmsFromNumber(
  fromNumber: string,
  toNumber: string,
  message: string
): Promise<{ sid: string; status: string }> {
  const client = twilio(ADMIN_ACCOUNT_SID!, ADMIN_AUTH_TOKEN!);

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
