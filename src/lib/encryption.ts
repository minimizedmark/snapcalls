import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

let KEY: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (!KEY) {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 characters)');
    }
    KEY = Buffer.from(ENCRYPTION_KEY, 'hex');
  }
  return KEY;
}

/**
 * Encrypts data using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export function encrypt(text: string): string {
  const KEY = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return as iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts data encrypted with encrypt()
 * @param encryptedData - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  const KEY = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generates a random 32-byte encryption key (for setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
