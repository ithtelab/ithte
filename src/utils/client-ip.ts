import { NextRequest } from 'next/server';

/**
 * 从请求解析客户端真实 IP,用于限流与留言去重。
 * 部署在单层反代后,Nginx 建议 proxy_set_header X-Forwarded-For $remote_addr(覆写而非追加)。
 * TRUST_PROXY_DEPTH 表示可信代理层数(默认 1):从 XFF 右侧取倒数第 N 段,
 * 因为 XFF 越往右越接近真实来源,避免攻击者在头部左侧伪造任意值绕过限流。
 */
export function getClientIp(request: NextRequest): string {
  // 优先 x-real-ip(通常由最近的受信反代用 $remote_addr 写入)
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp && isValidIpCandidate(realIp)) return realIp;

  // 回退 X-Forwarded-For:取右侧受信段
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const depth = clampDepth(process.env.TRUST_PROXY_DEPTH, 1, 5);
    const parts = xff.split(',').map((p) => p.trim()).filter(Boolean);
    const chosen = parts[parts.length - depth];
    if (chosen && isValidIpCandidate(chosen)) return chosen;
  }

  // 再退化到 Vercel/CDN 注入的真实来源地址(单实例部署时不被请求头欺骗)
  const vercelFor = request.headers.get('x-vercel-forwarded-for');
  const candidate = vercelFor?.split(',')[0]?.trim();
  if (candidate && isValidIpCandidate(candidate)) return candidate;

  return 'unknown';
}

function clampDepth(raw: string | undefined, min: number, max: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

/** 粗筛:只接受看起来像 IP 的字符串,否则统一归为 unknown(不影响功能,仅让限流/去重失效为同 key) */
function isValidIpCandidate(value: string): boolean {
  return /^[0-9a-fA-F:.]+$/.test(value);
}
