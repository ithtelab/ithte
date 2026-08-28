import { NextRequest, NextResponse } from 'next/server';
import { login_status } from 'NeteaseCloudMusicApi';

import { clearNeteaseSession, resolveNeteaseCookie } from '@/lib/music-session';
import { markServerAccountInvalid } from '@/lib/netease-account';
import { allowRequestByIp } from '@/utils/rate-limit';

export const runtime = 'nodejs';

// 限流:同 IP 每分钟最多 60 次查询登录态(访客每小时只在进入页面时查一次,足够宽裕)
const RATE_LIMIT = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

// login_status 有真实网络开销,60 秒内存缓存内的重复查询直接复用
let statusCache: { at: number; loggedIn: boolean; profile: StatusProfile | null } | null = null;
const STATUS_CACHE_TTL = 60_000;

interface StatusProfile {
  userId?: number;
  nickname?: string;
  avatarUrl?: string;
}

async function queryLoginStatus(cookie: string) {
  const result = await login_status({ cookie });
  const body = result.body as unknown as {
    data?: { account?: { id?: number }; profile?: StatusProfile };
  };
  const profile = body.data?.profile;
  const loggedIn = !!(body.data?.account?.id && profile?.userId);
  return {
    loggedIn,
    profile: loggedIn
      ? { userId: profile?.userId, nickname: profile?.nickname, avatarUrl: profile?.avatarUrl }
      : null,
  };
}

export async function GET(request: NextRequest) {
  if (!allowRequestByIp(request, 'music:status', RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json({ ok: true, loggedIn: false, source: 'anonymous', profile: null }, { status: 429 });
  }
  // 全链路判定:访客会话 / 服务端内置账号 / 环境变量都算登录态,
  // 与实际取歌能力(getNeteaseCookie)保持一致,而不是只看浏览器有没有会话
  const { cookie, source } = resolveNeteaseCookie(request);
  if (source === 'anonymous' || !cookie) {
    return NextResponse.json({ ok: true, loggedIn: false, source: 'anonymous', profile: null });
  }

  // 匿名访客查询时,env/服务端账号的登录态对所有访客相同,复用缓存
  if (statusCache && Date.now() - statusCache.at < STATUS_CACHE_TTL) {
    return NextResponse.json({
      ok: true,
      loggedIn: statusCache.loggedIn,
      source,
      profile: statusCache.loggedIn ? statusCache.profile : null,
    });
  }

  try {
    const status = await queryLoginStatus(cookie);
    statusCache = { at: Date.now(), loggedIn: status.loggedIn, profile: status.profile };

    // 服务端内置账号失效时打标记降级,避免全站反复撞失效 cookie;
    // 访客自己的浏览器会话过期是正常现象,不做服务端处理
    if (!status.loggedIn && source === 'server') {
      markServerAccountInvalid();
    }

    return NextResponse.json({ ok: true, loggedIn: status.loggedIn, source, profile: status.profile });
  } catch {
    return NextResponse.json({ ok: true, loggedIn: false, source, profile: null });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, loggedIn: false });
  clearNeteaseSession(response);
  return response;
}
