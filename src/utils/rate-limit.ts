import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';

import { getClientIp } from '@/utils/client-ip';

/**
 * 进程内滑动窗口限流(内存实现)。
 * 单实例部署有效(README 已声明仅支持单实例);
 * 用于保护 /api/music/* 等公开接口,避免登录后站点被当作网易云公共代理。
 * 需要独立密钥的多个接口(如 wall 的 30 秒限流)也可以复用。
 */

type Bucket = number[]; // 命中时间戳数组,升序

const STORE = new Map<string, { timestamps: number[]; lastHit: number }>();
// 定期清理,防止无限膨胀
const MAX_BUCKET_SIZE = 1024;
let lastSweep = Date.now();

function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of STORE) {
    // 超过 10 分钟未命中且桶已空的键删掉
    if (bucket.timestamps.length === 0 && now - bucket.lastHit > 600_000) {
      STORE.delete(key);
    }
  }
}

/**
 * 判断 key 是否允许在该时间窗口内第 count 次请求。
 * @param windowMs 滑动窗口(秒换算成毫秒)
 * @param limit    窗口内允许的最大次数
 */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  if (limit <= 0) return true;
  sweep();
  const now = Date.now();
  const cutoff = now - windowMs;
  let bucket = STORE.get(key);
  if (!bucket) {
    bucket = { timestamps: [], lastHit: now };
    STORE.set(key, bucket);
  }
  // 清掉窗口外的旧记录
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
  bucket.lastHit = now;

  if (bucket.timestamps.length >= limit) return false;
  bucket.timestamps.push(now);
  // 防止恶意超长 key 撑爆内存
  if (bucket.timestamps.length > MAX_BUCKET_SIZE) bucket.timestamps.splice(0, bucket.timestamps.length - MAX_BUCKET_SIZE);
  return true;
}

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** 按客户端 IP 限流的便捷封装。 */
export function allowRequestByIp(request: NextRequest, scope: string, limit: number, windowMs: number): boolean {
  return allowRequest(hashKey(`${scope}:${getClientIp(request)}`), limit, windowMs);
}
