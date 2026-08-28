import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { atomicWriteFile, readFileWithBackup } from '@/lib/atomic-file';
import { sanitizeNeteaseCookie, sealCookie, unsealCookie } from '@/lib/netease-crypto';
import { dataFilePath } from '@/lib/site-data';

interface StoredAccount {
  /** sealCookie 加密后的网易云 cookie */
  sealed: string;
  nickname?: string;
  userId?: number;
  savedAt: number;
  /** 上游反馈登录失效时置 true,暂停使用直至重新扫码 */
  invalid?: boolean;
}

const accountFile = dataFilePath('netease-account.json');

// 短 TTL 内存缓存,避免每个音乐请求都读盘解密
let cache: { cookie: string; loadedAt: number } | null = null;
const CACHE_TTL = 30_000;

function loadStoredAccount(): StoredAccount | null {
  const raw = readFileWithBackup(accountFile);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAccount;
    return parsed && typeof parsed.sealed === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function getCachedCookie(): string {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL) return cache.cookie;

  const stored = loadStoredAccount();
  const cookie = stored && !stored.invalid ? unsealCookie(stored.sealed) : '';
  cache = { cookie, loadedAt: now };
  return cookie;
}

/** 服务端内置账号的 cookie;未配置、已失效或解密失败时返回空串。 */
export function getServerAccountCookie(): string {
  return getCachedCookie();
}

export function hasServerAccount(): boolean {
  return !!loadStoredAccount();
}

export function getServerAccountInfo() {
  const stored = loadStoredAccount();
  if (!stored) return null;
  return {
    nickname: stored.nickname || '',
    userId: stored.userId || 0,
    savedAt: stored.savedAt,
    invalid: !!stored.invalid,
  };
}

/** 管理员扫码成功后写入服务端共享账号(整份覆盖旧账号)。 */
export function saveServerAccount(rawCookie: string, profile?: { nickname?: string; userId?: number }) {
  const cookie = sanitizeNeteaseCookie(rawCookie);
  if (!/(?:^|;\s*)MUSIC_U=/.test(cookie)) return false;

  const stored: StoredAccount = {
    sealed: sealCookie(cookie),
    nickname: profile?.nickname || undefined,
    userId: profile?.userId || undefined,
    savedAt: Date.now(),
    invalid: false,
  };
  mkdirSync(path.dirname(accountFile), { recursive: true });
  atomicWriteFile(accountFile, `${JSON.stringify(stored, null, 2)}\n`, { backup: true });

  cache = { cookie, loadedAt: Date.now() };
  return true;
}

/** 上游反馈登录失效时打标记:暂停服务端账号,避免全站反复撞失效 cookie。 */
export function markServerAccountInvalid() {
  const stored = loadStoredAccount();
  if (!stored) return;
  cache = { cookie: '', loadedAt: Date.now() };
  if (stored.invalid) return;

  stored.invalid = true;
  try {
    atomicWriteFile(accountFile, `${JSON.stringify(stored, null, 2)}\n`);
  } catch {
    /* 标记失败仅影响缓存,下次读取会重试 */
  }
}
