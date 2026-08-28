import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

function copy(src, dest) {
  if (statSync(src).isDirectory()) {
    mkdirSync(dest, { recursive: true });
    for (const name of readdirSync(src)) copy(join(src, name), join(dest, name));
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}

const standalone = '.next/standalone';
const staticDir = '.next/static';

// 产物不完整时必须让构建失败(CI 依赖非零退出码发现问题),不能静默成功
if (!existsSync(standalone)) {
  console.error('[copy-standalone-assets] .next/standalone 不存在,请先运行 npm run build');
  process.exit(1);
}
if (!existsSync(staticDir)) {
  console.error('[copy-standalone-assets] .next/static 不存在,构建产物不完整');
  process.exit(1);
}

copy(staticDir, join(standalone, '.next/static'));
if (existsSync('public')) copy('public', join(standalone, 'public'));
if (existsSync('data')) copy('data', join(standalone, 'data'));

console.log('[copy-standalone-assets] static/public/data 已同步到 .next/standalone');
