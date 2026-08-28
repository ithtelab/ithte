import { timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { login_qr_check, login_qr_create, login_qr_key, login_status } from 'NeteaseCloudMusicApi';

import { sanitizeNeteaseCookie, setNeteaseSession } from '@/lib/music-session';
import { saveServerAccount } from '@/lib/netease-account';

export const runtime = 'nodejs';

type QrAction = { action?: 'create' | 'check'; key?: string; adminToken?: string };

/** 管理员令牌校验:未配置 ADMIN_TOKEN 时一律拒绝,比较用常量时间防时序侧信道。 */
function isAuthorizedAdmin(token: unknown) {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected || typeof token !== 'string' || !token) return false;
  const given = Buffer.from(token);
  const target = Buffer.from(expected);
  return given.length === target.length && timingSafeEqual(given, target);
}

function profileFrom(body: unknown) {
  const data = body as { data?: { profile?: Record<string, unknown>; account?: Record<string, unknown> } };
  const profile = data.data?.profile;
  if (!profile) return null;
  return {
    userId: typeof profile.userId === 'number' ? profile.userId : Number(profile.userId) || undefined,
    nickname: typeof profile.nickname === 'string' ? profile.nickname : undefined,
    avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : undefined,
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

      const admin = isAuthorizedAdmin(payload.adminToken);
      const result = await login_qr_check({ key });
      const body = result.body as unknown as { code?: number; message?: string; cookie?: string };
      const code = Number(body.code || 0);
      if (code !== 803) {
        return NextResponse.json({ ok: true, code, message: body.message || '' });
      }

      const rawCookie = body.cookie || '';
      const cookie = sanitizeNeteaseCookie(rawCookie);
      if (!cookie) {
        return NextResponse.json({ ok: false, code, error: '登录成功但未收到有效 Cookie' }, { status: 502 });
      }

      const status = await login_status({ cookie });
      const profile = profileFrom(status.body);

      // 管理员扫码:把账号写入服务端,全站访客共享这个「内置账号」;
      // 普通访客扫码只写入自己的浏览器会话,无法污染服务端账号
      let serverAccountSaved = false;
      if (admin) {
        serverAccountSaved = saveServerAccount(rawCookie, profile ?? undefined);
      }

      const response = NextResponse.json({
        ok: true,
        code,
        message: '登录成功',
        profile,
        serverAccountSaved,
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
