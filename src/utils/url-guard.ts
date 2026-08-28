import { isIP } from 'node:net';

const BLOCKED_HOSTS = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
]);

/** IPv4 私有/环回/保留网段(RFC 1918/4193/5735 等) */
function isPrivateIPv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true; // 本网络 / 私有 / 环回
  if (a === 169 && b === 254) return true; // 链路本地
  if (a === 172 && b >= 16 && b <= 31) return true; // 私有
  if (a === 192 && b === 168) return true; // 私有
  if (a === 192 && b === 0) return true; // 192.0.0/24 与 192.0.2/24(文档)
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true; // 基准测试 / 文档
  if (a === 203 && b === 0) return true; // 203.0.113/24(文档)
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // 组播 + 保留(240/4)+ 广播
  return false;
}

/** IPv6 环回/唯一本地/链路本地/未指定等保留地址 */
function isReservedIPv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === '::' || h === '::1') return true;
  if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true; // fe80::/10
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // fc00::/7 唯一本地
  if (h.startsWith('::ffff:')) {
    // IPv4 映射地址按 IPv4 规则再判一次
    const v4 = h.slice(7);
    return isIP(v4) === 4 ? isPrivateIPv4(v4) : true;
  }
  return false;
}

/**
 * 服务端发起请求前的 URL 校验:仅允许 http/https,
 * 拒绝 localhost、环回、私有和保留地址(防 SSRF)。
 * 校验通过时返回解析后的 URL 对象(可直接交给 fetch),不通过返回 null。
 */
export function parseSafePublicHttpUrl(rawUrl: string): URL | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || BLOCKED_HOSTS.has(host)) return null;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return null;

  const ipVersion = isIP(host);
  if (ipVersion === 4 && isPrivateIPv4(host)) return null;
  if (ipVersion === 6 && isReservedIPv6(host)) return null;

  return url;
}

/** 布尔版便捷判断,见 parseSafePublicHttpUrl。 */
export function isSafePublicHttpUrl(rawUrl: string): boolean {
  return parseSafePublicHttpUrl(rawUrl) !== null;
}
