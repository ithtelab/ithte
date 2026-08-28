# ithte · 黑天鹅个人主页

<p align="center">
  <strong>一个融合个人档案、音乐律动、旅行影像与留言互动的沉浸式个人主页。</strong>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white">
</p>

![黑天鹅个人主页桌面端预览](docs/screenshots/home-desktop.png)

## 项目简介

`ithte` 是黑天鹅的个人主页源码，基于 **liuyuyang 项目进行二次开发**。项目保留了原项目简洁、有节奏的页面基础，并围绕个人资料、照片墙、旅行记录和音乐体验进行了重新设计。

整个页面采用深色视觉和高对比排版，配合流体光球、音乐律动头像、社交图标轨道、照片交互和滚动叙事，适合用作个人介绍页、作品展示页或个人导航页。

## 致谢与二次开发说明

本项目基于 **liuyuyang** 项目进行二次开发，感谢原作者提供的基础结构与初始设计思路。

当前版本由黑天鹅完成了以下方向的重构和扩展：

- 重做个人资料、角色、坐标和社交信息；
- 将站点主题统一为「黑天鹅」视觉；
- 增加音乐律动头像、流体光球和社交图标联动；
- 增加网易云音乐播放器、歌词显示、音量控制和进度拖动；
- 重做照片墙、旅行画廊和人生节点；
- 优化桌面端、移动端布局及卡片交互；
- 补充站点图标、SEO 信息、启动文档和预览截图。

如果你继续基于本项目开发，建议在发布页面和项目说明中保留这段来源致谢。

## 界面预览

| 桌面端 | 移动端 |
| --- | --- |
| ![桌面端](docs/screenshots/home-desktop.png) | <img src="docs/screenshots/home-mobile.png" alt="移动端" width="390"> |

## 主要功能

- **沉浸式首屏**：个人头像、简介、所在地、角色和社交入口集中展示。
- **音乐律动头像**：根据当前音乐的响度和频段变化驱动光环、粒子与图标运动。
- **网易云播放器**：支持播放列表、上一首/下一首、随机、循环、静音、音量调节和进度拖动。
- **双排歌词**：歌词固定显示在右下角，支持当前句、逐字高亮、翻译歌词和动态视觉效果。
- **照片墙**：支持横向拖动、滚轮切换、灯箱放大和自适应图片比例。
- **旅行画廊**：用卡片和风景图记录沿途遇见的地点与片段。
- **人生节点**：以时间线方式展示一路走来的几个重要瞬间。
- **留言墙**：提供简洁的留言展示和提交体验，适合部署在个人站点中。
- **响应式布局**：针对桌面端、平板和手机屏幕进行适配。
- **GPU 视觉效果**：光球、粒子和频谱效果尽量使用硬件加速，降低页面滚动时的负担。
- **SEO 基础配置**：包含站点图标、Open Graph 信息和语义化页面结构。

## 技术栈

- [Next.js 16](https://nextjs.org/) / App Router / Standalone Output
- [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) + Sass
- [GSAP](https://gsap.com/) + ScrollTrigger
- [Motion](https://motion.dev/)
- [OGL](https://github.com/oframe/ogl) / WebGL
- Web Audio API
- Lucide React / React Icons

## 快速启动

### 环境要求

- Node.js `20.9+`
- npm `10+`

### 1. 克隆项目

```bash
git clone https://github.com/ithtelab/ithte.git
cd ithte
```

### 2. 安装依赖

```bash
npm ci
```

如果本地没有锁定的依赖环境，也可以使用：

```bash
npm install
```

### 3. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可预览。

> 本地启动不需要额外填写配置。需要自定义生产域名时，再复制 `.env.example` 为 `.env.local` 并填写站点地址即可。

## 个性化修改

### 修改个人资料

编辑：

```text
src/app/(home)/components/Hero/index.tsx
src/app/layout.tsx
```

可以在这里修改昵称、简介、坐标、角色、常玩游戏、社交平台地址以及页面标题。

### 修改音乐

编辑：

```text
src/components/music-player/netease.ts
```

修改歌单编号和默认歌曲配置即可。歌曲是否可播放仍取决于音乐平台的版权和账号权限。

### 替换图片

```text
public/avatar-douyin.jpg   头像
public/photo-wall/         照片墙
public/travel/             旅行画廊
public/milestones/         人生节点
public/social/             社交平台图标
```

替换图片时建议保持原文件名，或者同步修改对应组件中的资源路径。

### 接入云存储图片（可选）

照片墙、旅行画廊和人生节点支持从云存储读取图片，不再受本地占位图限制：

1. 把图片上传到任意能直链访问的存储（阿里云 OSS / 腾讯云 COS / Cloudflare R2 / 七牛 / GitHub 等均可）；
2. 参照 [`docs/photo-manifest.example.json`](docs/photo-manifest.example.json) 编写一份清单 JSON，分组名为 `travel` / `photo-wall` / `milestones`，元素支持纯 URL 或 `{url, alt, caption}`（`caption` 会覆盖人生节点默认文案）；
3. 把清单 JSON 的直链地址配置到环境变量 `PHOTO_MANIFEST_URL`，重新部署。

首页每 60 秒刷新一次清单，云端换图无需重新构建；清单不可达或为空时自动回退 `public/` 本地占位图。

## 网易云内置账号（可选）

配置后未扫码的访客也能播放完整歌曲（含 VIP 歌曲），两种方式任选：

**方式一 · 管理员扫码（推荐）**

1. 在环境变量中设置 `ADMIN_TOKEN` 并部署；
2. 访问 `/admin` 页面，粘贴 ADMIN_TOKEN，用**小号**扫码登录；
3. 登录成功且令牌校验通过后，账号 Cookie（AES-256-GCM 加密）会写入服务端 `data/netease-account.json`，全站访客共享该账号播放。

**方式二 · 环境变量**

把已登录账号 Cookie 中的 `MUSIC_U` 等字段整段贴到 `NETEASE_COOKIE` 环境变量（获取方式见 `.env.example` 注释）。

读取优先级：访客自己扫码的会话 > 服务端内置账号 > `NETEASE_COOKIE` 环境变量。内置账号被网易云判定失效时会自动停用并在播放时提示联系站长，重新扫码即可恢复。

> ⚠️ 服务端共享账号存在触发网易云风控（强制下线/封号）的小概率风险，请使用小号，站点已内置接口限流与三层缓存降低请求频率。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run lint` | 运行 ESLint 检查 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产构建 |

## 生产部署

### Node.js / VPS

```bash
npm ci
npm run build
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

Windows PowerShell：

```powershell
npm ci
npm run build
$env:PORT = '3000'
$env:HOSTNAME = '0.0.0.0'
node .next/standalone/server.js
```

也可以使用 PM2、Docker 或 1Panel 保持进程运行，再通过 Nginx/Caddy 配置 HTTPS。

### 部署建议

- 生产环境建议使用 Node.js 20 或更高版本；
- 将 `PORT` 设置为实际开放的端口；
- 通过反向代理绑定自己的域名；
- 定期备份 `data` 目录中的站点数据（建议先跑一次 `./scripts/backup-walls.sh`，再放进 cron：`0 3 * * * /path/to/ithte/scripts/backup-walls.sh >> /var/log/ithte-backup.log 2>&1`）；
- 发布前替换个人头像、联系方式、歌单和照片资源。

### 留言管理

配置 `ADMIN_TOKEN` 后可用它调用管理接口（**不会**在前端展示，建议用 curl 等脚本）：

```bash
# 删除一条留言(需先在环境变量配置 ADMIN_TOKEN)
curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" "https://your-site.com/api/wall?id=123"

# 分页查看全量留言
curl -H "Authorization: Bearer $ADMIN_TOKEN" "https://your-site.com/api/wall?page=1&pageSize=50"
```

> 说明：`ADMIN_TOKEN` 同时用于 `/admin` 页面的网易云扫码登录，便于站长把账号写入服务端实现全站共享。数据仅支持单实例运行（JSON 文件 + 进程内缓存），扩容需先迁移到数据库。

> 留言墙数据默认保留最近 500 条，超出部分自动归档到 `data/walls-archive.json`（保留最近 5000 条），不会直接丢弃。

## 项目结构

```text
ithte/
├─ docs/screenshots/       README 预览截图
├─ public/                 图片、图标等静态资源
├─ scripts/                构建辅助脚本
├─ src/app/                页面、样式和页面功能
├─ src/components/         音乐播放器与通用组件
├─ src/lib/                本地数据和工具方法
├─ src/utils/              本地资源工具
├─ .env.example            环境变量模板
├─ next.config.ts          Next.js 配置
└─ package.json
```

## 发布前检查

```bash
npm run lint
npm run build
```

检查完成后再提交自己的图片、文字和配置，避免把私人素材误传到公开仓库。

## 版权与说明

- 本项目基于 **liuyuyang** 项目二次开发，发布时请保留来源致谢；
- 页面中的音乐、平台图标和第三方依赖归各自权利人所有；
- 本仓库主要用于个人主页展示和学习交流；
- 使用、部署和再发布时请遵守相关平台条款及适用法律法规。

---

Made with curiosity by **黑天鹅**.

