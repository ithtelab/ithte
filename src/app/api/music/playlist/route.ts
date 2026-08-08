import { NextRequest, NextResponse } from 'next/server';
import { playlist_detail, playlist_track_all } from 'NeteaseCloudMusicApi';

import { getNeteaseCookie } from '@/lib/music-session';

export const runtime = 'nodejs';

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
  if (!id) {
    return NextResponse.json({ error: '缺少歌单 id' }, { status: 400 });
  }

  try {
    const cookie = getNeteaseCookie(req);
    // 先取歌单信息（名称 / 封面 / 总数），tracks 字段是分页快照
    const detail = await playlist_detail({ id: Number(id), cookie: cookie || undefined });
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
      return NextResponse.json(
        { error: '歌单不存在或为私密歌单', code: body.code },
        { status: 404 },
      );
    }

    // 全量拉取曲目（weapi，支持超过 1000 首大歌单；失败时退回 detail 快照）
    let tracks: RawTrack[] = [];
    try {
      const all = await playlist_track_all({ id: Number(id), limit: 1000, offset: 0, cookie: cookie || undefined });
      const songs = (all.body as unknown as { songs?: RawTrack[] }).songs;
      if (Array.isArray(songs)) tracks = songs;
    } catch {
      /* 落到 detail 快照 */
    }
    if (!tracks.length && Array.isArray(playlist.tracks)) {
      tracks = playlist.tracks;
    }

    return NextResponse.json({
      name: playlist.name ?? '我的歌单',
      cover: (playlist.coverImgUrl ?? '').replace(/^http:\/\//, 'https://'),
      trackCount: playlist.trackCount ?? tracks.length,
      tracks: tracks.map(mapTrack),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
