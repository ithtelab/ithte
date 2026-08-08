import fs from 'node:fs';
import path from 'node:path';

/** 读取 public 下指定目录的本地照片（服务端调用）。 */
export function getLocalPhotos(folder = 'photos'): string[] {
  const safeFolder = /^[a-z0-9_-]+$/i.test(folder) ? folder : 'photos';
  const dir = path.join(process.cwd(), 'public', safeFolder);
  try {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp|gif)$/i.test(f))
      .sort()
      .map((f) => `/${safeFolder}/${f}`);
  } catch {
    return [];
  }
}
