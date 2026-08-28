import { mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

import type { Wall } from '@/types/wall';
import { atomicWriteFile, readFileWithBackup } from '@/lib/atomic-file';
import { dataFilePath } from '@/lib/site-data';

const wallFile = dataFilePath('walls.json');
const archiveFile = dataFilePath('walls-archive.json');
const wallDir = path.dirname(wallFile);

// 保留最新 500 条;超出部分归档,不直接丢弃
const MAX_WALLS = 500;
const ARCHIVE_MAX_WALLS = 5000;

// 进程内串行化写队列,避免并发写互相覆盖
let writeQueue: Promise<void> = Promise.resolve();
// 留言限流改为内存滑动窗口实现(单一实例),不再落盘,消除写放大源
const RATE_LIMIT_WINDOW_MS = 30_000;
const rateLimitMap = new Map<string, number>();

function isWall(value: unknown): value is Wall {
  if (!value || typeof value !== 'object') return false;
  const wall = value as Partial<Wall>;
  return (
    typeof wall.id === 'number' &&
    typeof wall.createTime === 'number' &&
    typeof wall.name === 'string' &&
    typeof wall.content === 'string' &&
    typeof wall.color === 'string'
  );
}

function normalizeWalls(raw: string): Wall[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWall).sort((a, b) => b.createTime - a.createTime);
  } catch {
    return [];
  }
}

export async function readWalls() {
  // 主文件损坏时回退 .bak
  const raw = readFileWithBackup(wallFile);
  if (!raw) return [];
  return normalizeWalls(raw);
}

/** 把超出的留言追加到归档文件(保留最近 N 条),失败不阻塞主流程 */
async function appendArchive(overflow: Wall[]) {
  if (!overflow.length) return;
  try {
    const existing = readFileWithBackup(archiveFile);
    let archived: Wall[] = existing ? normalizeWalls(existing) : [];
    archived = [...overflow, ...archived].slice(0, ARCHIVE_MAX_WALLS);
    await mkdir(wallDir, { recursive: true });
    atomicWriteFile(archiveFile, `${JSON.stringify(archived, null, 2)}\n`, { backup: true });
  } catch {
    /* archive 失败不影响留言保存 */
  }
}

export async function createWall(input: Pick<Wall, 'name' | 'content' | 'color'>) {
  const wall: Wall = {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
    createTime: Date.now(),
    name: input.name,
    content: input.content,
    color: input.color,
    cateId: 1,
    cate: { id: 1, name: '留言墙', mark: 'wall', order: 1 },
    email: null,
    status: 1,
    isChoice: 0,
  };

  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const walls = await readWalls();
    const next = [wall, ...walls];
    const overflow = next.length > MAX_WALLS ? next.slice(MAX_WALLS) : [];
    const keep = next.slice(0, MAX_WALLS);
    await mkdir(wallDir, { recursive: true });
    // 原子写 + 保留 .bak,崩溃不会清零
    atomicWriteFile(wallFile, `${JSON.stringify(keep, null, 2)}\n`, { backup: true });
    await appendArchive(overflow);
  });

  await writeQueue;
  return wall;
}

export async function deleteWall(id: number) {
  let removed: Wall | null = null;
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const walls = await readWalls();
    const next = walls.filter((wall) => wall.id !== id);
    if (next.length === walls.length) return;
    removed = walls.find((wall) => wall.id === id) ?? null;
    await mkdir(wallDir, { recursive: true });
    atomicWriteFile(wallFile, `${JSON.stringify(next, null, 2)}\n`, { backup: true });
  });
  await writeQueue;
  return removed;
}

/** 进程内滑动窗口限流(单一实例实现) */
export async function consumeWallRateLimit(clientKey: string, windowMs: number) {
  await writeQueue.catch(() => undefined);
  const now = Date.now();
  const key = createHash('sha256').update(clientKey).digest('hex');
  // 定期清理过期 key,防止内存膨胀
  if (rateLimitMap.size > 5000) {
    for (const [k, t] of rateLimitMap) {
      if (now - t > windowMs * 4) rateLimitMap.delete(k);
    }
  }
  const previous = rateLimitMap.get(key) ?? 0;
  const allowed = now - previous >= windowMs;
  if (allowed) rateLimitMap.set(key, now);
  return allowed;
}
