import path from 'node:path';

let cachedDataDir: string | null = null;

/**
 * 站点数据目录（留言、限流、音乐账号）。
 * SITE_DATA_DIR 由部署方配置，支持绝对路径（容器挂载）或相对 cwd 的路径；
 * 统一 resolve 规范化，消除 .. 后做包含校验，确保派生的文件路径不会逃逸出该目录。
 */
export function getDataDir(): string {
  if (cachedDataDir) return cachedDataDir;

  const configured = process.env.SITE_DATA_DIR?.trim();
  const resolved = path.resolve(process.cwd(), configured ? configured : 'data');
  if (resolved === path.parse(resolved).root) {
    throw new Error('SITE_DATA_DIR 不能指向文件系统根目录');
  }

  cachedDataDir = resolved;
  return resolved;
}

/** 拼接数据目录内的文件路径，并校验结果没有逃逸出数据目录。 */
export function dataFilePath(name: string): string {
  const dir = getDataDir();
  const resolved = path.resolve(dir, name);
  if (resolved !== dir && !resolved.startsWith(dir + path.sep)) {
    throw new Error('非法的数据文件路径');
  }
  return resolved;
}
