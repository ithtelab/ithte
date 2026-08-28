import type { NextRequest, NextResponse } from 'next/server';

import {
  sanitizeNeteaseCookie,
  sealCookie,
  unsealCookie,
} from '@/lib/netease-crypto';
import { getServerAccountCookie } from '@/lib/netease-account';

const SESSION_COOKIE = 'yuniao_netease_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export { sanitizeNeteaseCookie };

export type NeteaseCookieSource = 'browser' | 'server' | 'env' | 'anonymous';

/**
 * 解析本次请求可用的网易云 cookie:
 * 访客自己的浏览器会话 > 服务端内置账号 > NETEASE_COOKIE 环境变量 > 匿名。
 */
export function resolveNeteaseCookie(request: NextRequest): { cookie: string; source: NeteaseCookieSource } {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const decrypted = sessionCookie ? unsealCookie(sessionCookie) : '';
  if (decrypted) return { cookie: decrypted, source: 'browser' };

  const serverCookie = getServerAccountCookie();
  if (serverCookie) return { cookie: serverCookie, source: 'server' };

  const envCookie = process.env.NETEASE_COOKIE?.trim() || '';
  if (envCookie) return { cookie: envCookie, source: 'env' };

  return { cookie: '', source: 'anonymous' };
}

export function getNeteaseCookie(request: NextRequest) {
  return resolveNeteaseCookie(request).cookie;
}

export function hasBrowserNeteaseSession(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  return !!(sessionCookie && unsealCookie(sessionCookie));
}

export function setNeteaseSession(response: NextResponse, rawCookie: string) {
  const cookie = sanitizeNeteaseCookie(rawCookie);
  if (!/(?:^|;\s*)MUSIC_U=/.test(cookie)) return false;
  response.cookies.set(SESSION_COOKIE, sealCookie(cookie), {
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
