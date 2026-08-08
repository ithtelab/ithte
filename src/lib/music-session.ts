import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'yuniao_netease_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
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

  const dataDir = process.env.SITE_DATA_DIR || path.join(process.cwd(), 'data');
  const keyFile = path.join(dataDir, '.music-session-key');
  mkdirSync(dataDir, { recursive: true });

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

function seal(rawCookie: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getSessionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(rawCookie, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function unseal(token: string) {
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

export function getNeteaseCookie(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const decrypted = sessionCookie ? unseal(sessionCookie) : '';
  return decrypted || process.env.NETEASE_COOKIE || '';
}

export function hasBrowserNeteaseSession(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  return !!(sessionCookie && unseal(sessionCookie));
}

export function setNeteaseSession(response: NextResponse, rawCookie: string) {
  const cookie = sanitizeNeteaseCookie(rawCookie);
  if (!/(?:^|;\s*)MUSIC_U=/.test(cookie)) return false;
  response.cookies.set(SESSION_COOKIE, seal(cookie), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return true;
}

export function clearNeteaseSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
