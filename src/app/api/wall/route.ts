import { NextRequest, NextResponse } from 'next/server';

import { consumeWallRateLimit, createWall, readWalls } from '@/lib/wall-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLORS = ['#9fe8d0', '#d7a35b', '#8ec5ff', '#f2a7b8', '#c4b5fd', '#f4f0e8'] as const;
const RATE_LIMIT_MS = 30_000;
const DUPLICATE_WINDOW_MS = 10 * 60_000;

function cleanText(value: unknown) {
  return typeof value === 'string'
    ? value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
}

function getClientKey(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'local';
}

export async function GET() {
  const walls = await readWalls();
  return NextResponse.json({ code: 200, message: 'ok', data: walls.slice(0, 100) });
}

export async function POST(req: NextRequest) {
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

  const clientKey = getClientKey(req);
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
