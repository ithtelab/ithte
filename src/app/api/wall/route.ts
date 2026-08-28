import { timingSafeEqual } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';

import { consumeWallRateLimit, createWall, deleteWall, readWalls } from '@/lib/wall-store';
import { getClientIp } from '@/utils/client-ip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLORS = ['#9fe8d0', '#d7a35b', '#8ec5ff', '#f2a7b8', '#c4b5fd', '#f4f0e8'] as const;
const RATE_LIMIT_MS = 30_000;
const RATE_LIMIT_WINDOW_MS = 30_000;
const DUPLICATE_WINDOW_MS = 10 * 60_000;
const GET_CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=60';

function cleanText(value: unknown) {
  return typeof value === 'string'
    ? value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
}

/** 管理端鉴权:ADMIN_TOKEN 未配置时一律拒绝(返回 404,不暴露接口存在性),常量时间比较防时序侧信道 */
function isAuthorizedAdmin(token: unknown) {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected || typeof token !== 'string' || !token) return false;
  const given = Buffer.from(token);
  const target = Buffer.from(expected);
  return given.length === target.length && timingSafeEqual(given, target);
}

function extractBearer(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

export async function GET(req: NextRequest) {
  const walls = await readWalls();

  // 可选分页:?page=1&pageSize=20(默认仍返回前 100,兼容现有前端)
  const pageRaw = req.nextUrl.searchParams.get('page');
  const sizeRaw = req.nextUrl.searchParams.get('pageSize');
  const page = pageRaw ? Math.max(1, Number(pageRaw) || 1) : 1;
  const pageSize = sizeRaw ? Math.min(100, Math.max(1, Number(sizeRaw) || 20)) : 100;
  const start = (page - 1) * pageSize;
  const data = pageRaw ? walls.slice(start, start + pageSize) : walls.slice(0, 100);

  return NextResponse.json(
    { code: 200, message: 'ok', data, total: walls.length, page, pageSize },
    { headers: { 'Cache-Control': GET_CACHE_CONTROL } },
  );
}

export async function POST(req: NextRequest) {
  const clientKey = getClientIp(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ code: 400, message: '请求内容不是有效 JSON' }, { status: 400 });
  }

  if (cleanText(body.website)) {
    return NextResponse.json({ code: 201, message: '留言成功', data: null }, { status: 201 });
  }

  const name = cleanText(body.name);
  const content = cleanText(body.content);
  const color = COLORS.includes(body.color as (typeof COLORS)[number])
    ? body.color as (typeof COLORS)[number]
    : COLORS[0];

  if (!name || name.length > 20) {
    return NextResponse.json({ code: 400, message: '昵称需要填写，最多 20 个字' }, { status: 400 });
  }
  if (!content || content.length > 180) {
    return NextResponse.json({ code: 400, message: '留言需要填写，最多 180 个字' }, { status: 400 });
  }

  const linkCount = content.match(/https?:\/\/|www\./gi)?.length ?? 0;
  if (linkCount > 1) {
    return NextResponse.json({ code: 400, message: '留言中最多保留一个链接' }, { status: 400 });
  }

  const blockedWords = (process.env.WALL_BLOCKED_WORDS || '')
    .split(',')
    .map((word) => cleanText(word).toLowerCase())
    .filter(Boolean);
  const normalizedContent = `${name} ${content}`.toLowerCase();
  if (blockedWords.some((word) => normalizedContent.includes(word))) {
    return NextResponse.json({ code: 400, message: '留言包含不适合公开展示的内容' }, { status: 400 });
  }

  try {
    if (!(await consumeWallRateLimit(clientKey, RATE_LIMIT_MS))) {
      return NextResponse.json({ code: 429, message: '提交得太快了，请稍后再试' }, { status: 429 });
    }
  } catch {
    return NextResponse.json({ code: 500, message: '留言服务暂时不可用，请稍后再试' }, { status: 500 });
  }

  try {
    const recentWalls = await readWalls();
    const duplicate = recentWalls.some((wall) => (
      wall.name === name
      && wall.content === content
      && Date.now() - wall.createTime < DUPLICATE_WINDOW_MS
    ));
    if (duplicate) {
      return NextResponse.json({ code: 409, message: '这条留言刚刚已经发布过了' }, { status: 409 });
    }

    const wall = await createWall({ name, content, color });
    return NextResponse.json({ code: 201, message: '留言成功', data: wall }, { status: 201 });
  } catch {
    return NextResponse.json({ code: 500, message: '留言保存失败，请稍后再试' }, { status: 500 });
  }
}

/** 管理员删除:DELETE /api/wall?id=123,需 Authorization: Bearer <ADMIN_TOKEN> */
export async function DELETE(req: NextRequest) {
  if (!isAuthorizedAdmin(extractBearer(req))) {
    return NextResponse.json({ code: 404, message: 'not found' }, { status: 404 });
  }

  const idRaw = req.nextUrl.searchParams.get('id');
  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ code: 400, message: '缺少有效的留言 id' }, { status: 400 });
  }

  try {
    const removed = await deleteWall(id);
    if (!removed) {
      return NextResponse.json({ code: 404, message: '留言不存在' }, { status: 404 });
    }
    return NextResponse.json({ code: 200, message: '已删除', data: { id } });
  } catch {
    return NextResponse.json({ code: 500, message: '删除失败，请稍后重试' }, { status: 500 });
  }
}
