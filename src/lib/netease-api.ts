import NeteaseCloudMusicApi from 'NeteaseCloudMusicApi';
import type { SoundQualityType } from 'NeteaseCloudMusicApi/interface';

/**
 * NeteaseCloudMusicApi 适配层。
 *
 * 所有网易云接口调用都经由这里,目的是把「用什么库」这件事收敛到单一文件:
 * 原包 NeteaseCloudMusicApi 上游已停止维护(npm 冻结在 4.32.0),网易云接口一旦变动,
 * 只需改这里的 import 与调用形参即可迁移到活跃的 @neteasecloudmusicapienhanced/api,
 * 而不是散落在各路由里逐个替换。
 *
 * 同时约定:每个调用都返回类型化结构,供上层路由使用,无需关心库的具体返回形态。
 */

const { login_qr_key, login_qr_create, login_qr_check, login_status, song_url_v1, song_url, playlist_detail, playlist_track_all, lyric_new } = NeteaseCloudMusicApi;

export interface QrCreateResult {
  key: string;
  qrimg: string;
  qrurl: string;
}

export interface QrCheckResult {
  code: number;
  message: string;
  cookie: string;
}

export interface LoginStatusResult {
  loggedIn: boolean;
  userId?: number;
  nickname?: string;
  avatarUrl?: string;
}

export interface SongUrlResult {
  url: string;
  trial: boolean;
  code: number;
  fee: number;
}

export interface PlaylistTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
}

export const netease = {
  async createQr(): Promise<QrCreateResult | null> {
    const keyBody = (await login_qr_key({})).body as { data?: { unikey?: string } };
    const key = keyBody.data?.unikey;
    if (!key) return null;
    const qrBody = (await login_qr_create({ key, qrimg: true })).body as {
      data?: { qrimg?: string; qrurl?: string };
    };
    return { key, qrimg: qrBody.data?.qrimg || '', qrurl: qrBody.data?.qrurl || '' };
  },

  async checkQr(key: string): Promise<QrCheckResult> {
    const body = (await login_qr_check({ key })).body as { code?: number; message?: string; cookie?: string };
    return {
      code: Number(body.code ?? 0),
      message: body.message || '',
      cookie: body.cookie || '',
    };
  },

  async loginStatus(cookie?: string): Promise<LoginStatusResult> {
    const body = (await login_status({ cookie })).body as {
      data?: { account?: { id?: number }; profile?: { userId?: number; nickname?: string; avatarUrl?: string } };
    };
    const profile = body.data?.profile;
    const loggedIn = !!(body.data?.account?.id && profile?.userId);
    return {
      loggedIn,
      userId: profile?.userId,
      nickname: profile?.nickname,
      avatarUrl: profile?.avatarUrl,
    };
  },

  /** 尝试指定音质取歌;失败返回 null(由调用方回退旧接口) */
  async songUrlById(id: number, level: SoundQualityType, cookie?: string): Promise<SongUrlResult | null> {
    try {
      const body = (await song_url_v1({ id, level, cookie })).body as {
        code?: number;
        data?: Array<{ url?: string; freeTrialInfo?: unknown }>;
      };
      const d = Array.isArray(body?.data) ? body.data[0] : undefined;
      return {
        url: typeof d?.url === 'string' ? d.url : '',
        trial: !!d?.freeTrialInfo,
        code: Number(body?.code ?? 0),
        fee: 0,
      };
    } catch {
      return null;
    }
  },

  /** 回退旧接口(指定码率) */
  async songUrlLegacy(id: number, cookie?: string): Promise<SongUrlResult | null> {
    try {
      const body = (await song_url({ id, br: 320000, cookie })).body as {
        code?: number;
        data?: Array<{ url?: string; freeTrialInfo?: unknown; fee?: number }>;
      };
      const d = Array.isArray(body?.data) ? body.data[0] : undefined;
      return {
        url: typeof d?.url === 'string' ? d.url : '',
        trial: !!d?.freeTrialInfo,
        code: Number(body?.code ?? 0),
        fee: Number(d?.fee ?? 0),
      };
    } catch {
      return null;
    }
  },

  async playlistDetail(id: number, cookie?: string) {
    const body = (await playlist_detail({ id, cookie })).body as {
      code?: number;
      playlist?: {
        name?: string;
        coverImgUrl?: string;
        trackCount?: number;
        tracks?: PlaylistTrack[];
      };
    };
    return body;
  },

  async playlistTracksAll(id: number, cookie?: string) {
    const body = (await playlist_track_all({ id, limit: 1000, offset: 0, cookie })).body as {
      songs?: PlaylistTrack[];
    };
    return body?.songs ?? [];
  },

  async lyric(id: number, cookie?: string) {
    const body = (await lyric_new({ id, cookie })).body as {
      lrc?: { lyric?: string };
      yrc?: { lyric?: string };
      tlyric?: { lyric?: string };
    };
    return body;
  },
};
