import twilio from 'twilio';

const ADMIN_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const ADMIN_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

if (!ADMIN_ACCOUNT_SID || !ADMIN_AUTH_TOKEN) {
  throw new Error('Admin Twilio credentials required for number provisioning');
}

/**
 * Purchase a new Twilio phone number for a customer
 * Returns the purchased phone number in E.164 format
 */
export async function purchaseTwilioNumber(areaCode?: string): Promise<string> {
  const client = twilio(ADMIN_ACCOUNT_SID!, ADMIN_AUTH_TOKEN!);

  // Search for available numbers
  const availableNumbers = await client.availablePhoneNumbers('US').local.list({
    areaCode: areaCode || undefined,
    limit: 1,
  });

  if (availableNumbers.length === 0) {
    throw new Error('No available phone numbers found');
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
  const client = twilio(ADMIN_ACCOUNT_SID!, ADMIN_AUTH_TOKEN!);

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
