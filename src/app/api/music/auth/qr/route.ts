import { NextRequest, NextResponse } from 'next/server';
import { login_qr_check, login_qr_create, login_qr_key, login_status } from 'NeteaseCloudMusicApi';

import { sanitizeNeteaseCookie, setNeteaseSession } from '@/lib/music-session';

export const runtime = 'nodejs';

type QrAction = { action?: 'create' | 'check'; key?: string };

function profileFrom(body: unknown) {
  const data = body as { data?: { profile?: Record<string, unknown>; account?: Record<string, unknown> } };
  const profile = data.data?.profile;
  if (!profile) return null;
  return {
    userId: profile.userId,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as QrAction;

    if (payload.action === 'create') {
      const keyResult = await login_qr_key({});
      const keyBody = keyResult.body as unknown as { data?: { unikey?: string } };
      const key = keyBody.data?.unikey;
      if (!key) {
        return NextResponse.json({ ok: false, error: '二维码密钥生成失败' }, { status: 502 });
      }

      const qrResult = await login_qr_create({ key, qrimg: true });
      const qrBody = qrResult.body as unknown as { data?: { qrimg?: string; qrurl?: string } };
      return NextResponse.json({
        ok: true,
        key,
        qrimg: qrBody.data?.qrimg || '',
        qrurl: qrBody.data?.qrurl || '',
      });
    }

    if (payload.action === 'check') {
      const key = String(payload.key || '').trim();
      if (!key) return NextResponse.json({ ok: false, error: '缺少二维码密钥' }, { status: 400 });

      const result = await login_qr_check({ key });
      const body = result.body as unknown as { code?: number; message?: string; cookie?: string };
      const code = Number(body.code || 0);
      if (code !== 803) {
        return NextResponse.json({ ok: true, code, message: body.message || '' });
      }

      const cookie = sanitizeNeteaseCookie(body.cookie || '');
      if (!cookie) {
        return NextResponse.json({ ok: false, code, error: '登录成功但未收到有效 Cookie' }, { status: 502 });
      }

      const status = await login_status({ cookie });
      const response = NextResponse.json({
        ok: true,
        code,
        message: '登录成功',
        profile: profileFrom(status.body),
      });
      if (!setNeteaseSession(response, cookie)) {
        return NextResponse.json({ ok: false, code, error: '登录会话保存失败' }, { status: 502 });
      }
      return response;
    }

    return NextResponse.json({ ok: false, error: '不支持的操作' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
