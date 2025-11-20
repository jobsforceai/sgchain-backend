// src/core/utils/crypto.ts
import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY = Buffer.from(env.SGC_WALLET_ENCRYPTION_KEY, 'hex');

export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('hex');
};

export const decrypt = (encryptedText: string): string => {
  const buffer = Buffer.from(encryptedText, 'hex');
  const iv = buffer.slice(0, IV_LENGTH);
  const authTag = buffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = buffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};
