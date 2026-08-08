import { NextRequest, NextResponse } from 'next/server';
import { song_url, song_url_v1 } from 'NeteaseCloudMusicApi';
import type { SoundQualityType } from 'NeteaseCloudMusicApi/interface';

import { getNeteaseCookie } from '@/lib/music-session';

export const runtime = 'nodejs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// 音质从高到低尝试，前两个需会员/VIP 才有完整音源，standard 保底
const LEVELS = ['exhigh', 'standard'] as const;
type Level = (typeof LEVELS)[number];

/** HEAD 探测播放地址是否真的能播（网易云偶尔返回 404 占位） */
async function probeUrl(url: string) {
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

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少歌曲 id' }, { status: 400 });
  }

  try {
    const cookie = getNeteaseCookie(req);
    let lastData: Record<string, unknown> | null = null;
    let lastTrial = false;
    let lastLevel = '';

    for (const level of LEVELS) {
      let url = '';
      try {
        const r = await song_url_v1({ id: Number(id), level: level as SoundQualityType, cookie: cookie || undefined });
        const d = Array.isArray(r.body?.data) ? r.body.data[0] : undefined;
        lastData = d ?? lastData;
        lastTrial = !!(d?.freeTrialInfo);
        url = typeof d?.url === 'string' ? d.url : '';
        lastLevel = level;
      } catch {
        // v1 失败退回旧接口
        try {
          const r = await song_url({ id: Number(id), br: 320000, cookie: cookie || undefined });
          const d = Array.isArray(r.body?.data) ? r.body.data[0] : undefined;
          lastData = d ?? lastData;
          lastTrial = !!(d?.freeTrialInfo);
          url = typeof d?.url === 'string' ? d.url : '';
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
          });
        }
      }
    }

    // 全部失败：按 lastData 分类错误原因
    const fee = Number(lastData?.fee ?? 0);
    const code = Number(lastData?.code ?? 0);
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
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
