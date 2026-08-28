import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { dataFilePath } from '@/lib/site-data';

const COOKIE_NAMES = new Set([
  'MUSIC_U',
  'MUSIC_A',
  '__csrf',
  'NMTID',
  'WEVNSM',
  'JSESSIONID-WYYY',
  'os',
  'appver',
]);

let cachedKey: Buffer | null = null;

function getSessionKey() {
  if (cachedKey) return cachedKey;

  const configured = process.env.MUSIC_SESSION_SECRET?.trim();
  if (configured) {
    cachedKey = createHash('sha256').update(configured).digest();
    return cachedKey;
  }

  const keyFile = dataFilePath('.music-session-key');
  mkdirSync(path.dirname(keyFile), { recursive: true });

  try {
    const existing = readFileSync(keyFile);
    if (existing.length === 32) {
      cachedKey = existing;
      return cachedKey;
    }
  } catch {
    /* create below */
  }

  const generated = randomBytes(32);
  try {
    writeFileSync(keyFile, generated, { flag: 'wx' });
    cachedKey = generated;
  } catch {
    cachedKey = readFileSync(keyFile);
  }
  return cachedKey;
}

/** 只保留网易云登录必需的 cookie 字段，丢弃其余噪音。 */
export function sanitizeNeteaseCookie(rawCookie: string) {
  const selected = new Map<string, string>();
  for (const segment of String(rawCookie || '').split(';')) {
    const index = segment.indexOf('=');
    if (index <= 0) continue;
    const name = segment.slice(0, index).trim();
    const value = segment.slice(index + 1).trim();
    if (COOKIE_NAMES.has(name) && value) selected.set(name, value);
  }
  return Array.from(selected, ([name, value]) => `${name}=${value}`).join('; ');
}

/** AES-256-GCM 加密，输出 iv.tag.payload（base64url 三段）。 */
export function sealCookie(rawCookie: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getSessionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(rawCookie, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

/** 解密 sealCookie 的输出，密钥不匹配或内容损坏时返回空串。 */
export function unsealCookie(token: string) {
  try {
    const [ivPart, tagPart, encryptedPart] = token.split('.');
    if (!ivPart || !tagPart || !encryptedPart) return '';
    const decipher = createDecipheriv('aes-256-gcm', getSessionKey(), Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}
