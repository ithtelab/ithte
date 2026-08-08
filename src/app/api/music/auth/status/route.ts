import { NextRequest, NextResponse } from 'next/server';
import { login_status } from 'NeteaseCloudMusicApi';

import {
  clearNeteaseSession,
  getNeteaseCookie,
  hasBrowserNeteaseSession,
} from '@/lib/music-session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const browserSession = hasBrowserNeteaseSession(request);
  if (!browserSession) {
    return NextResponse.json({ ok: true, loggedIn: false });
  }

  try {
    const cookie = getNeteaseCookie(request);
    const result = await login_status({ cookie });
    const body = result.body as unknown as {
      data?: { account?: { id?: number }; profile?: { userId?: number; nickname?: string; avatarUrl?: string } };
    };
    const profile = body.data?.profile;
    const loggedIn = !!(body.data?.account?.id && profile?.userId);
    return NextResponse.json({
      ok: true,
      loggedIn,
      profile: loggedIn
        ? { userId: profile?.userId, nickname: profile?.nickname, avatarUrl: profile?.avatarUrl }
        : null,
    });
  } catch {
    return NextResponse.json({ ok: true, loggedIn: false });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, loggedIn: false });
  clearNeteaseSession(response);
  return response;
}
