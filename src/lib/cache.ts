/** 简单的进程内 TTL 缓存(单实例)。用于缓存网易云上游的稳定查询结果。 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/**
 * 读取缓存,未命中或过期时执行 loader,结果写回并返回。
 * @param ttlMs 存活时长;<=0 表示不缓存
 */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  if (ttlMs > 0) {
    const hit = store.get(key) as Entry<T> | undefined;
    if (hit && hit.expiresAt > Date.now()) return hit.value;
  }
  const value = await loader();
  if (ttlMs > 0) store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

/** 清理超过 1 小时未访问的项,防止膨胀 */
export function sweepCache() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now - 3_600_000) store.delete(key);
  }
}
