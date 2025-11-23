import crypto from 'crypto';
import { logger } from './logger';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

// Get encryption key from environment
const ENCRYPTION_KEY_STRING = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_STRING || ENCRYPTION_KEY_STRING.length !== KEY_LENGTH) {
  logger.error('ENCRYPTION_KEY must be exactly 32 characters');
  throw new Error('Invalid ENCRYPTION_KEY configuration');
}

const KEY = Buffer.from(ENCRYPTION_KEY_STRING, 'utf-8');

export interface EncryptedData {
  encrypted: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt plaintext using AES-256-GCM
 */
export function encrypt(plaintext: string): EncryptedData {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    logger.error('Encryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt encrypted data using AES-256-GCM
 */
export function decrypt(encryptedData: EncryptedData): string {
  try {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Decryption failed');
  }
}

/**
 * Encrypt bank details object
 */
export function encryptBankDetails(details: any): EncryptedData {
  const plaintext = JSON.stringify(details);
  return encrypt(plaintext);
}

/**
 * Decrypt bank details object
 */
export function decryptBankDetails(encryptedData: EncryptedData): any {
  const plaintext = decrypt(encryptedData);
  return JSON.parse(plaintext);
}
