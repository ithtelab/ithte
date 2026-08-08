import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

import type { Wall } from '@/types/wall';

const dataDirectory = process.env.SITE_DATA_DIR
  ? path.resolve(process.env.SITE_DATA_DIR)
  : path.join(process.cwd(), 'data');
const wallFile = path.join(dataDirectory, 'walls.json');
const rateLimitFile = path.join(dataDirectory, 'wall-rate-limits.json');

let writeQueue: Promise<void> = Promise.resolve();
let rateLimitQueue: Promise<void> = Promise.resolve();

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

export async function readWalls() {
  try {
    const raw = await readFile(wallFile, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isWall).sort((a, b) => b.createTime - a.createTime);
  } catch {
    return [];
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
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(wallFile, `${JSON.stringify([wall, ...walls].slice(0, 500), null, 2)}\n`, 'utf8');
  });

  await writeQueue;
  return wall;
}

export async function consumeWallRateLimit(clientKey: string, windowMs: number) {
  let allowed = false;
  rateLimitQueue = rateLimitQueue.catch(() => undefined).then(async () => {
    const now = Date.now();
    const key = createHash('sha256').update(clientKey).digest('hex');
    let entries: Record<string, number> = {};

    try {
      const raw = await readFile(rateLimitFile, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        entries = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>)
            .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && now - entry[1] < windowMs * 4),
        );
      }
    } catch {
      entries = {};
    }

    const previous = entries[key] ?? 0;
    allowed = now - previous >= windowMs;
    if (allowed) entries[key] = now;

    await mkdir(dataDirectory, { recursive: true });
    await writeFile(rateLimitFile, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  });

  await rateLimitQueue;
  return allowed;
}
