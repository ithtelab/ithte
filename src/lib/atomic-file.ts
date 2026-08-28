import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';

/**
 * 原子写文件：先写临时文件再 rename 替换，避免进程崩溃留下截断的 JSON。
 * backup 为 true 时把旧内容保留到 <file>.bak，供读取端损坏时回退。
 */
export function atomicWriteFile(filePath: string, content: string, options: { backup?: boolean } = {}) {
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, content, 'utf8');

  if (options.backup && existsSync(filePath)) {
    try {
      const bak = `${filePath}.bak`;
      rmSync(bak, { force: true });
      renameSync(filePath, bak);
    } catch {
      /* 备份失败不阻塞主流程 */
    }
  }

  renameSync(tmp, filePath);
}

/** 读文件，主文件不存在或损坏时回退 <file>.bak，都没有返回 null。 */
export function readFileWithBackup(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    /* fallthrough */
  }
  try {
    return readFileSync(`${filePath}.bak`, 'utf8');
  } catch {
    return null;
  }
}
