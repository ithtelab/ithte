import { NextRequest, NextResponse } from 'next/server';
import { playlist_detail, playlist_track_all } from 'NeteaseCloudMusicApi';

import { withTimeout } from '@/lib/with-timeout';
import { cached } from '@/lib/cache';
import { getNeteaseCookie } from '@/lib/music-session';
import { allowRequestByIp } from '@/utils/rate-limit';

export const runtime = 'nodejs';

// 歌单信息与曲目基本不变,缓存 10 分钟;限流防代理批量拉取
const PLAYLIST_CACHE_TTL_MS = 10 * 60_000;
const RATE_LIMIT = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const UPSTREAM_TIMEOUT_MS = 10_000;

export interface NeteaseTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
}

interface RawTrack {
  id: number;
  name?: string;
  ar?: { name?: string }[];
  al?: { name?: string; picUrl?: string };
  dt?: number;
  fee?: number;
}

const mapTrack = (t: RawTrack): NeteaseTrack => ({
  id: t.id,
  title: t.name ?? '',
  artist: (t.ar ?? []).map((a) => a.name ?? '').filter(Boolean).join(' / ') || '未知歌手',
  album: t.al?.name ?? '',
  cover: (t.al?.picUrl ?? '').replace(/^http:\/\//, 'https://'),
  duration: t.dt ?? 0,
});

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id || !Number.isInteger(Number(id)) || Number(id) <= 0) {
    return NextResponse.json({ error: '缺少有效的歌单 id' }, { status: 400 });
  }

  if (!allowRequestByIp(req, 'music:playlist', RATE_LIMIT, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
  }

  try {
    const cookie = getNeteaseCookie(req);
    const result = await cached(`playlist:${id}`, PLAYLIST_CACHE_TTL_MS, async () => {
      // 先取歌单信息（名称 / 封面 / 总数），tracks 字段是分页快照
      const detail = await withTimeout(
        playlist_detail({ id: Number(id), cookie: cookie || undefined }),
        UPSTREAM_TIMEOUT_MS,
        'playlist_detail',
      );
      const body = detail.body as unknown as {
        code?: number;
        playlist?: {
          name?: string;
          coverImgUrl?: string;
          trackCount?: number;
          tracks?: RawTrack[];
        };
      };
      const playlist = body.playlist;
      if (!playlist) {
        throw { notFound: true, code: body.code };
      }

      // 全量拉取曲目（weapi，支持超过 1000 首大歌单；失败时退回 detail 快照）
      let tracks: RawTrack[] = [];
      try {
        const all = await withTimeout(
          playlist_track_all({ id: Number(id), limit: 1000, offset: 0, cookie: cookie || undefined }),
          UPSTREAM_TIMEOUT_MS,
          'playlist_track_all',
        );
        const songs = (all.body as unknown as { songs?: RawTrack[] }).songs;
        if (Array.isArray(songs)) tracks = songs;
      } catch {
        /* 落到 detail 快照 */
      }
      if (!tracks.length && Array.isArray(playlist.tracks)) {
        tracks = playlist.tracks;
      }

      return {
        name: playlist.name ?? '我的歌单',
        cover: (playlist.coverImgUrl ?? '').replace(/^http:\/\//, 'https://'),
        trackCount: playlist.trackCount ?? tracks.length,
        tracks: tracks.map(mapTrack),
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    if ((err as { notFound?: boolean }).notFound) {
      return NextResponse.json(
        { error: '歌单不存在或为私密歌单', code: (err as { code?: number }).code },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: '歌单加载失败，请稍后重试' }, { status: 500 });
  }
}
