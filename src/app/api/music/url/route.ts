import { NextRequest, NextResponse } from 'next/server';
import { song_url, song_url_v1 } from 'NeteaseCloudMusicApi';
import type { SoundQualityType } from 'NeteaseCloudMusicApi/interface';

import { withTimeout } from '@/lib/with-timeout';
import { resolveNeteaseCookie } from '@/lib/music-session';
import { markServerAccountInvalid } from '@/lib/netease-account';
import { allowRequestByIp } from '@/utils/rate-limit';
import { parseSafePublicHttpUrl } from '@/utils/url-guard';

export const runtime = 'nodejs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// 音质从高到低尝试，前两个需会员/VIP 才有完整音源，standard 保底
const LEVELS = ['exhigh', 'standard'] as const;
type Level = (typeof LEVELS)[number];

// 限流:同 IP 每分钟最多 30 次取地址,防公共代理滥用(与共享账号的封号风险配套)
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 10_000;

/** 网易云 CDN 域名白名单;只允许 https,且 host 必须是 .126.net / .music.126.net 体系 */
function isNeteaseCdn(url: string): boolean {
  const parsed = parseSafePublicHttpUrl(url);
  if (!parsed) return false;
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname.toLowerCase();
  return host === '126.net' || host === 'music.126.net' || host.endsWith('.126.net');
}

/** HEAD 探测播放地址是否真的能播(网易云偶尔返回 404 占位) */
async function probeUrl(url: string) {
  if (!isNeteaseCdn(url)) return { ok: false, status: 0, type: '' };
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'User-Agent': UA, Referer: 'https://music.163.com/' },
      signal: AbortSignal.timeout(4000),
    });
    const type = res.headers.get('content-type') ?? '';
    return { ok: res.ok, status: res.status, type };
  } catch {
    return { ok: false, status: 0, type: '' };
  }
}

interface UrlBody {
  code?: number;
  data?: Array<{ url?: string; freeTrialInfo?: unknown; fee?: number }>;
}

function extractUrl(body: unknown): { url: string; trial: boolean; code: number } {
  const b = body as UrlBody;
  const d = Array.isArray(b?.data) ? b.data[0] : undefined;
  return {
    url: typeof d?.url === 'string' ? d.url : '',
    trial: !!(d?.freeTrialInfo),
    code: Number(b?.code ?? 0),
  };
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
    return NextResponse.json({ error: '缺少有效的歌曲 id' }, { status: 400 });
  }

  if (!allowRequestByIp(req, 'music:url', RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      { ok: false, error: '请求过于频繁，请稍后再试', reason: 'rate_limited' },
      { status: 429 },
    );
  }

  try {
    const { cookie, source } = resolveNeteaseCookie(req);
    let lastData: Record<string, unknown> | null = null;
    let lastTrial = false;
    let lastLevel = '';
    let loginExpired = false;

    for (const level of LEVELS) {
      let url = '';
      let code = 0;
      try {
        const r = await withTimeout(
          song_url_v1({ id: Number(id), level: level as SoundQualityType, cookie: cookie || undefined }),
          UPSTREAM_TIMEOUT_MS,
          'song_url_v1',
        );
        const d = extractUrl(r.body);
        code = d.code;
        if (code === 301) {
          loginExpired = true;
          break;
        }
        lastData = { ...(r.body as UrlBody).data?.[0] as Record<string, unknown> ?? {} } as Record<string, unknown>;
        lastTrial = d.trial;
        url = d.url;
        lastLevel = level;
      } catch {
        // v1 失败或超时,退回旧接口
        try {
          const r = await withTimeout(
            song_url({ id: Number(id), br: 320000, cookie: cookie || undefined }),
            UPSTREAM_TIMEOUT_MS,
            'song_url',
          );
          const d = extractUrl(r.body);
          code = d.code;
          if (code === 301) {
            loginExpired = true;
            break;
          }
          const fee = Number((r.body as UrlBody).data?.[0]?.fee ?? 0);
          lastData = { ...(r.body as UrlBody).data?.[0] as Record<string, unknown> ?? {}, fee } as Record<string, unknown>;
          lastTrial = d.trial;
          url = d.url;
          lastLevel = level;
        } catch {
          /* continue */
        }
      }

      // 试听片段直接放弃这档（无完整权限），继续更低音质也一样，提前跳出
      if (url && !lastTrial) {
        const probe = await probeUrl(url);
        if (probe.ok && url && !/404/.test(url)) {
          const httpsUrl = url.replace(/^http:\/\//, 'https://');
          return NextResponse.json({
            ok: true,
            url: httpsUrl,
            level,
            trial: false,
            loggedIn: !!cookie,
            source,
          });
        }
      }
    }

    // cookie 失效:给前端明确的 login_required 信号;服务端内置账号失效要打标记降级
    if (loginExpired) {
      if (source === 'server') {
        markServerAccountInvalid();
        return NextResponse.json(
          { ok: false, error: '站点内置网易云账号登录已失效，请联系站长重新扫码', reason: 'login_required', source },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { ok: false, error: '网易云登录已过期，请重新扫码登录', reason: 'login_required', source },
        { status: 403 },
      );
    }

    // 全部失败：按 lastData 分类错误原因
    const fee = Number((lastData as { fee?: number })?.fee ?? 0);
    const code = Number((lastData as { code?: number })?.code ?? 0);
    const loggedIn = !!cookie;

    if (lastTrial && !loggedIn) {
      return NextResponse.json(
        { ok: false, error: '这是 VIP 歌曲，需要配置网易云会员 Cookie 才能播放完整版', reason: 'login_required' },
        { status: 403 },
      );
    }
    if (lastTrial) {
      return NextResponse.json(
        { ok: false, error: '当前会员状态仍只能试听，可能为付费单曲或会员等级不足', reason: 'trial_only' },
        { status: 403 },
      );
    }
    if (fee === 4) {
      return NextResponse.json(
        { ok: false, error: '该歌曲需要单曲/专辑购买', reason: 'paid_required' },
        { status: 403 },
      );
    }
    if (code === 404 || code === 403 || fee === 8) {
      return NextResponse.json(
        { ok: false, error: '该歌曲受版权限制，暂时无法播放', reason: 'copyright' },
        { status: 404 },
      );
    }
    if (fee === 1 && !loggedIn) {
      return NextResponse.json(
        { ok: false, error: 'VIP 歌曲需要配置网易云会员 Cookie 才能播放', reason: 'vip_required' },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { ok: false, error: '播放地址获取失败，可能是版权、会员或地区限制', reason: 'url_unavailable' },
      { status: 404 },
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: '播放地址获取失败，请稍后重试', reason: 'internal_error' },
      { status: 500 },
    );
  }
}
