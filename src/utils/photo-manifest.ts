import { getLocalPhotos } from '@/utils/local-photos';
import { parseSafePublicHttpUrl } from '@/utils/url-guard';

export interface PhotoItem {
  url: string;
  alt?: string;
  caption?: string;
}

type PhotoManifest = Record<string, PhotoItem[] | string[]>;

const MANIFEST_URL = process.env.PHOTO_MANIFEST_URL?.trim() || '';
const FETCH_TIMEOUT_MS = 8_000;
const FETCH_REVALIDATE_SECONDS = 60;

// 进程内短缓存:同一轮渲染 3 个相册共用一次拉取;失败也缓存,避免每次请求都撞超时
let memoryCache: { manifest: PhotoManifest | null; fetchedAt: number } | null = null;
const MEMORY_TTL_MS = 30_000;

function normalizeItem(entry: unknown): PhotoItem | null {
  if (typeof entry === 'string') {
    return entry ? { url: entry } : null;
  }
  if (entry && typeof entry === 'object') {
    const record = entry as { url?: unknown; alt?: unknown; caption?: unknown };
    const url = typeof record.url === 'string' ? record.url : '';
    if (!url) return null;
    return {
      url,
      alt: typeof record.alt === 'string' ? record.alt : undefined,
      caption: typeof record.caption === 'string' ? record.caption : undefined,
    };
  }
  return null;
}

async function fetchManifest(): Promise<PhotoManifest | null> {
  // 校验并解析为 URL 对象:仅公网 http(s),拒绝内网/环回/保留地址;
  // fetch 的目标始终是这个校验器的返回值
  const target = parseSafePublicHttpUrl(MANIFEST_URL);
  if (!target) {
    console.error('[photo-manifest] PHOTO_MANIFEST_URL 不是合法的公网 http(s) 地址,已忽略');
    return null;
  }
  try {
    const res = await fetch(target, {
      headers: { accept: 'application/json' },
      // 与页面 ISR(revalidate=60)对齐:云端改清单后 ≤60s 生效
      next: { revalidate: FETCH_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[photo-manifest] 清单拉取失败 HTTP ${res.status},回退本地图片`);
      return null;
    }
    const data: unknown = await res.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return data as PhotoManifest;
  } catch {
    console.error('[photo-manifest] 清单拉取异常,回退本地图片');
    return null;
  }
}

/**
 * 相册照片统一入口:配置 PHOTO_MANIFEST_URL 时读远程云存储清单
 * (支持 {url, alt?, caption?} 对象或纯字符串 URL),清单缺失该分组、
 * 为空或拉取失败时回退 public/ 本地目录。
 */
export async function getPhotos(folder: string): Promise<PhotoItem[]> {
  if (MANIFEST_URL) {
    const now = Date.now();
    if (!memoryCache || now - memoryCache.fetchedAt > MEMORY_TTL_MS) {
      memoryCache = { manifest: await fetchManifest(), fetchedAt: now };
    }

    const items = memoryCache.manifest?.[folder];
    if (Array.isArray(items) && items.length > 0) {
      const normalized = items.map(normalizeItem).filter((item): item is PhotoItem => !!item);
      if (normalized.length > 0) return normalized;
    }
  }

  return getLocalPhotos(folder).map((url) => ({ url }));
}
