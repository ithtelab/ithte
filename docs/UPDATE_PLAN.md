# ithte 更新优化计划(2026-08-28)

> 评审方式:主会话通读核心源码 + 6 个独立重审 Agent(音乐前端 / 音乐后端与账号 / 图片链路 / 首页性能与 SEO / 留言板与数据层 / 工程化与部署)交叉评审,共产出 74 条意见,逐条评估后按「接受 / 调整后接受 / 不接受」归类,接受项融合进本计划。
> Git 工作流:trunk-based 直提 main,Conventional Commits,每个完成的更新点独立 commit 并立即 push GitHub,CI 自动验证。

---

## 一、现状结论

**已完善**:播放器基本功能(歌单 / 歌词 / 音质降级 / 试听跳过)、网易云扫码登录、AES-256-GCM 加密会话、留言板蜜罐+敏感词+限流、README 部署文档、standalone 构建脚本、依赖版本策略(next/react 固定 + lockfile)。

**未完善(按严重度)**:

| 级别 | 问题 |
|---|---|
| P0 | `<audio>` 无 onError:媒体加载失败(403/链接过期)永远「假播放」,不跳歌、无提示 |
| P0 | 首页构建期静态预渲染,新留言永不显示,直到重新 build(只有 API 是新的) |
| P0 | 网易云「内置账号」缺失:cookie 只存访客各自浏览器;`NETEASE_COOKIE` 兜底通道存在但完全没文档化 |
| P0 | 图片全是本地占位符,无云存储通道;Gallery 还硬编码 6 个路径绕过了 getLocalPhotos 机制 |
| P1 | `/api/music/url` 无限流,登录后站点即成公共网易云代理;probeUrl 无 host 校验(SSRF 面);伪造 XFF 可绕过留言限流;`.gitignore` 不防裸 `.env` |
| P1 | 零 CI;`.env.example` 只有 1 个变量;NeteaseCloudMusicApi 上游已死(npm 冻结在 4.32.0,接口一变全站音乐失效) |
| P1 | walls.json 非原子写(崩溃可清零全部留言);无管理删除入口;无自动备份落地 |
| P2 | 播放失败不自动跳歌、QR 轮询无退避、AudioContext 中断后假播、currentTime 20fps 全局重渲染、hls.js 首屏全量拉流、reduced-motion 覆盖不全、移动端导航热区仅 4px、3 个社交死链等 |

## 二、关键设计决策

### 1. 网易云内置账号(服务端共享账号)

- 新增 `data/netease-account.json`:内容为经现有 `seal()`(AES-256-GCM)加密的 cookie + 元数据,密钥复用 `MUSIC_SESSION_SECRET` / `data/.music-session-key`,零新增密码学代码;写入用 tmp+rename 原子替换。
- 写入途径:管理员扫码时携带 `ADMIN_TOKEN`(env)才同步写服务端账号文件;不带 token 维持现状(只写访客自己的浏览器会话),天然防止访客污染服务端账号。另一条零代码通道:直接配置 `NETEASE_COOKIE` 环境变量。
- 读取优先级:`getNeteaseCookie()` = 访客浏览器会话 > 服务端账号文件 > `NETEASE_COOKIE` env > 空。只改这一个函数,url / playlist / lyric 三个路由自动继承。
- 失效处理:auth/status 改为全链路判定并区分来源(browser/server);url 路由把「未登录」类上游响应映射为 `login_required`,并给服务端账号打失效标记避免反复撞失效 cookie。
- ⚠️ 风险提示:服务端共享 VIP 账号有小概率触发网易云风控(强制下线/封号),README 明示,建议使用小号;限流+缓存是防风控配套。

### 2. 图片云存储(通用清单模式,零厂商锁定)

- 新增 `src/utils/photo-manifest.ts`:`getPhotos(folder)` —— 配置 `PHOTO_MANIFEST_URL` 时 `fetch(url, { next: { revalidate: 3600 } })` 拉取远程 JSON 清单,失败或为空回退本地 `getLocalPhotos(folder)`。
- 清单 schema(可直接放 OSS/COS/R2/七牛/GitHub 任意可直链存储,换图只改 JSON):
  ```json
  {
    "travel":     [{ "url": "https://cdn.example.com/t1.jpg", "alt": "...", "caption": "..." }],
    "photo-wall": ["https://cdn.example.com/w1.png"],
    "milestones": ["https://cdn.example.com/m1.jpg"]
  }
  ```
- 改造点:Milestone / OpenSource 改 async Server Component 调 `await getPhotos(...)`;Gallery 的 `travelCards` 硬编码数组改为数据源+兜底默认值;页面导出 `revalidate = 60`(ISR),云端换图 ≤60s 生效,无需重新 build。
- 服务器侧拉取清单 URL 前校验协议为 http/https 且拒绝 localhost / 环回 / 私有 / 保留地址。

### 3. 留言冻结修复

`page.tsx` 加 `export const revalidate = 60`:ISR 让首页每 60 秒重新执行 `readWalls()`,留言与图片清单一并解决,不改组件结构。

### 4. Git 工作流

单人项目 trunk-based:小改动直提 main;Conventional Commits(feat/fix/chore/docs/refactor);部署打 `v*` tag 便于回滚;不引入 changeset。

---

## 三、分阶段实施(每项完成后 commit + push)

### Phase 0 基线与安全网
- [x] 写入本计划文件 `docs/UPDATE_PLAN.md`
- [x] `.gitignore` 补 `.env` / `.env.*`(显式保留 `.env.example`)及本地工具目录
- [x] `.env.example` 补齐全部变量(NEXT_PUBLIC_SITE_URL / SITE_DATA_DIR / WALL_BLOCKED_WORDS / NETEASE_COOKIE / MUSIC_SESSION_SECRET / ADMIN_TOKEN / PHOTO_MANIFEST_URL / TRUST_PROXY_DEPTH)
- [x] GitHub Actions CI:push/PR 触发,Node 20/22 矩阵,`npm ci → lint → build`
- [x] package.json 声明 `engines.node >= 20.9.0`;`start` 改为启动 standalone 产物、`lint` 改为 `eslint .`
- [x] `scripts/copy-standalone-assets.mjs` 健壮化:全部路径存在性检查,缺失时报错并返回非零退出码

### Phase 1 两大核心痛点
- [ ] A. 网易云内置账号(见决策 1,动 5 个文件:music-session / auth-qr / auth-status / url / env+README)
- [ ] B. 图片云清单(见决策 2,Gallery 硬编码一并修)+ 页面 ISR
- [ ] 删除孤儿图片:`public/photos/` 整目录(无任何消费方)、`public/travel/` 下 6 张无消费 jpg
- [ ] README:内置账号配置步骤 + 云清单格式示例 `docs/photo-manifest.example.json`

### Phase 2 音乐播放器稳定性
- [ ] `<audio>` 加 onError:失败自动跳歌 + 连续失败计数(≥3 首熔断并提示检查登录)
- [ ] VIP/版权取址失败自动跳歌;错误角标/提示在收起状态也可见,文案区分「未登录 / VIP 版权 / 网络」
- [ ] togglePlay 以 onPlay/onPause 事件为 isPlaying 唯一真源,删除乐观置位
- [ ] loadTrack 竞态守卫(requestId,过期响应丢弃)
- [ ] 切歌立即重置 currentTime/duration;歌词请求受歌词开关短路;shuffle 排除当前首
- [ ] AudioContext onstatechange + visibilitychange 自动 resume,失败同步 UI
- [ ] QR 登录轮询指数退避 + 连续失败上限;code 800 自动重建 key
- [ ] MediaSession 元数据与控制柄;iOS 检测隐藏音量控件(或提示用系统音量)
- [ ] 唱片拖拽 dragEnd 才写 localStorage

### Phase 3 音乐 API 加固
- [ ] `/api/music/*` 通用 IP 限流(约 30 次/分,内存实现,复用/泛化 wall 限流)
- [ ] probeUrl host 白名单:仅 https 且 `*.126.net`,并拒绝 localhost/环回/私有/保留地址(SSRF 防护验收项)
- [ ] 三层缓存:lyric 长 TTL、playlist 10 分钟、url 短 TTL
- [ ] NeteaseCloudMusicApi 调用统一 8–10s 超时(Promise.race)
- [ ] 500 响应不回显内部 err.message;id 参数统一整数校验
- [ ] 封装 `src/lib/netease-api.ts` 适配层 + 锁死 4.32.0;试点迁移 `@neteasecloudmusicapienhanced/api`(独立 commit,失败即回退)

### Phase 4 留言板与数据可靠性
- [ ] walls.json 原子写(tmp+rename)+ `.bak` 容错回退
- [ ] 超 500 条写 `walls-archive.json` 归档,不再直接丢弃
- [ ] 管理端:`DELETE /api/wall?id=` + `Authorization: Bearer ADMIN_TOKEN`(未配置 ADMIN_TOKEN 返回 404 防探测),GET 支持 `?page=&pageSize=`
- [ ] 客户端 IP:getClientKey 优先 x-real-ip,支持 TRUST_PROXY_DEPTH 取 XFF 倒数第 N 段;README 补 Nginx `X-Forwarded-For $remote_addr` 覆写说明
- [ ] GET /api/wall 加 `Cache-Control: s-maxage=30, stale-while-revalidate=60`;留言墙空态条件 `items.length > 0 &&`
- [ ] `scripts/backup-walls.sh`(时间戳备份+保留 N 份+cron 示例);README 注明仅支持单实例

### Phase 5 体验与收尾
- [ ] hls.js 动态 import(`next/dynamic` ssr:false)+ `hls.light` 构建 + poster + `navigator.connection.saveData` 弱网不自动播
- [ ] prefers-reduced-motion 全覆盖:Earth 视频(降级为海报帧 + aria-hidden)、头像律动/轨道动画(共享 usePrefersReducedMotion)
- [ ] 移动端 SectionNav 点击热区 ≥24px;Motion 首帧闪烁(useLayoutEffect 初始隐藏)
- [ ] SectionNav 滚动测量改 IntersectionObserver(复用 Motion 的 observer)
- [ ] twitter 卡片 summary_large_image;JSON-LD 补 url/sameAs/jobTitle;NEXT_PUBLIC_SITE_URL 提供 fallback
- [ ] 3 个社交死链(href="#")改真实 URL(无则改非交互展示)
- [ ] currentTime 时间源收敛(仅进度组件订阅)+ 播放列表统一复用虚拟化组件
- [ ] 播放器拆分:QrLoginDialog / useDraggablePosition / SeekBar 等(控制范围,不改行为)
- [ ] remotePatterns 收敛为实际域名白名单(网易云 CDN + 自有云存储)
- [ ] 多阶段 Dockerfile(node:22-alpine);README 同步;(可选)Vitest 覆盖 seal/unseal、原子写等纯逻辑

---

## 四、验收标准

- 每个 push:CI 绿(lint + build 通过,Node 20/22)。
- Phase 1:管理员扫码后,**无痕窗口访客**可直接播放 VIP 歌曲完整版;修改远程清单 JSON ≤60s 首页图片更新;清单不可达时回退本地占位图;新留言 ≤60s 出现在首页。
- Phase 3:同 IP 高频请求 `/api/music/url` 被限流;伪造内网地址的播放 URL 被拒绝探测。
- 全程不引入新的重依赖(网易云适配层迁移除外);每个 commit 可独立 `git revert`。

---

## 五、6 Agent 重审意见处理记录(74 条)

判定说明:✅ 接受 | 🔁 调整后接受 | ❌ 不接受

### Agent A:音乐播放器前端(12 条)

| # | 意见 | 判定 | 备注 |
|---|---|---|---|
| 1 | `<audio>` 无 onError,加载失败永久假播放;建议 onError 自动跳歌+熔断计数 | ✅ | P0,Phase 2 |
| 2 | VIP/版权取址失败不自动跳歌,错误提示收起后不可见 | ✅ | Phase 2 |
| 3 | togglePlay 空 catch + 乐观 setIsPlaying(true) 造成假播放;应以播放事件为真源 | ✅ | Phase 2 |
| 4 | loadTrack 并发竞态(快速连点播 A 显 B);建议 requestId/AbortController | ✅ | Phase 2 |
| 5 | currentTime 20fps 全局 context 拖动全量列表重渲染;时间源应单独订阅,列表复用虚拟化 | ✅ | Phase 5 |
| 6 | AudioContext suspended 后无恢复路径,iOS 中断后假播 | ✅ | Phase 2 |
| 7 | 拖动唱片时每个 pointermove 同步写 localStorage | ✅ | Phase 2 |
| 8 | 随机播放可能连续重复同一首(未排除当前 index) | ✅ | Phase 2 |
| 9 | QR 轮询无退避无上限;800 过期应自动重建 key | ✅ | Phase 2 |
| 10 | music-player.tsx 36KB 职责过载,存在两套列表与重复工具函数;建议拆分 | ✅ | Phase 5,控制范围 |
| 11 | iOS 上 audio.volume 只读,音量滑块无效 | 🔁 | 采纳「移动端隐藏音量控件/提示」,不引入 iOS 专用音量模拟 |
| 12 | 交互细节包:seek 取消分支应回弹、切歌应清零进度、歌词开关短路、glass-scroll 用 ResizeObserver、接入 MediaSession | ✅ | Phase 2/5 |

### Agent B:音乐后端与账号体系(12 条)

| # | 意见 | 判定 | 备注 |
|---|---|---|---|
| 1 | 「内置账号」唯一现成通道 NETEASE_COOKIE 完全未文档化 | ✅ | P0,Phase 0/1 |
| 2 | `/api/music/url` 无鉴权无限流,登录后成公共代理;按 IP 限流+缓存+Origin 校验 | ✅ | Phase 3 |
| 3 | probeUrl 对上游任意地址直接 HEAD,无 host 白名单(SSRF 面) | ✅ | Phase 3,验收项 |
| 4 | auth/status 只认浏览器会话,env/服务端账号模式下前端永远显示未登录 | ✅ | Phase 1 |
| 5 | 登录失效不归类 login_required,失效是黑盒;30 天 cookie 与 MUSIC_U 真实有效期互不感知 | ✅ | Phase 1/3 |
| 6 | 音乐三路由零缓存,每次点击实时请求网易;建议三层缓存 | ✅ | Phase 3 |
| 7 | 除 probeUrl 外所有上游调用无超时 | ✅ | Phase 3 |
| 8 | 500 响应直接回显 err.message 泄露内部细节 | ✅ | Phase 3 |
| 9 | auth/qr 完全公开可被脚本滥用;服务端账号写入必须 ADMIN_TOKEN | ✅ | Phase 1/3 |
| 10 | id 参数校验弱(lyric 不判数字,NaN 直传上游) | ✅ | Phase 3 |
| 11 | 服务端账号文件写入应 tmp+rename 原子替换,损坏容错降级 | ✅ | Phase 1 |
| 12 | 多 VIP 账号 cookie 池按权重轮换 | ❌ | 个人站过度设计;单账号+限流+缓存已足够,先观察风控;记入 backlog |

### Agent C:图片与相册数据流(12 条 + 云清单方案)

| # | 意见 | 判定 | 备注 |
|---|---|---|---|
| 0 | 「远程 JSON 清单」方案:新增 photo-manifest.ts + 改 4 文件,RSC 内拉取+revalidate | ✅ | 核心方案,Phase 1 |
| 1 | Gallery 硬编码 6 个 /travel/*.png 路径,接云最易漏改点 | ✅ | Phase 1 |
| 2 | 相册组件全原生 `<img>` 零优化 | 🔁 | 本期用存储端缩放参数;组件迁移 next/image 列入 Phase 5 后续 |
| 3 | 首页静态预渲染会把清单冻结在构建期;需 revalidate | ✅ | 决策 3,ISR 60s |
| 4 | public/photos/ 6 张孤儿 + travel/ 6 张无消费 jpg,共 12 张冗余应删 | ✅ | Phase 1 |
| 5 | photo-wall/*.png 与 travel/*.png 字节重复但两边都有消费方 | ✅ | 接云清单后统一一份 URL,两目录一并清理(Phase 1) |
| 6 | getLocalPhotos 依赖 standalone 拷贝脚本,漏跑相册静默消失;文档应标注必跑 | ✅ | Phase 0 脚本健壮化+README |
| 7 | remotePatterns 放行所有 http/https,优化器成开放代理;应收敛白名单 | ✅ | Phase 5(接云完成后) |
| 8 | Milestone 文案与照片数量强耦合,换真图后取模复用语义错位;清单应带 caption | ✅ | 清单 schema 支持 alt/caption,Phase 1 |
| 9 | images.qualities [75,90] 白名单是迁移隐形约束 | ✅ | 实施注意项,迁移时对齐 |
| 10 | alt 是自动生成占位文本,换真图后 SEO/无障碍失真;清单应带 alt | ✅ | 清单 schema,Phase 1 |
| 11 | carousel-07 弹窗大图无宽高与加载属性,远程直出有 CLS/流量问题 | 🔁 | 随 Phase 5 的 next/image 迁移一并处理 |
| 12 | Freedom/Quote 远程视频 URL 纳入云清单(第二批) | ❌(暂缓) | 涉及两组组件与待清理目录的依赖关系,记入 backlog 不入本期 |

### Agent D:首页性能与 SEO(12 条)

| # | 意见 | 判定 | 备注 |
|---|---|---|---|
| 1 | hls.js 全量库静态打包且视频首屏即拉流;应动态 import+light 构建+poster+saveData | ✅ | Phase 5 |
| 2 | 移动端顶部章节导航点击热区仅约 4px | ✅ | Phase 5 |
| 3 | 3 个社交入口 href="#" 死链 | ✅ | Phase 5(向站主要链接,无则改非交互) |
| 4 | Earth 视频不尊重 prefers-reduced-motion,装饰性视频未 aria-hidden | ✅ | Phase 5 |
| 5 | 头像律动/轨道动画无 reduced-motion 降级 | ✅ | Phase 5 |
| 6 | Twitter 卡片用 summary 浪费 1200×630 大图 | ✅ | Phase 5 |
| 7 | canonical/og:url 依赖 NEXT_PUBLIC_SITE_URL,缺失静默丢失 | 🔁 | 采纳 fallback+文档必填;**不接受**构建期 fail-the-build(妨碍本地开发) |
| 8 | Motion 首帧闪烁:隐藏初始态在 useEffect 设置,应 useLayoutEffect/SSR 初始态 | ✅ | Phase 5 |
| 9 | SectionNav 滚动时逐帧 10 次 getBoundingClientRect 强制布局,应 IO 化 | ✅ | Phase 5 |
| 10 | JSON-LD Person 缺 url/image/sameAs | ✅ | Phase 5 |
| 11 | 社交小图标用原生 img 应换 next/image/SVG sprite | ❌ | 6 个 <2KB 小图,收益可忽略 |
| 12 | InfoSections 硬编码 slice(0,42);留言数据无缓存语义 | 🔁 | 42 提为常量;缓存由页面 ISR(决策 3)解决 |

### Agent E:留言板与数据层(12 条)

| # | 意见 | 判定 | 备注 |
|---|---|---|---|
| 1 | 首页静态预渲染冻结留言数据,新留言永不显示(P0);建议挂载 fetch 或 ISR | ✅ | 采纳 ISR 60s(更省,无客户端瀑布) |
| 2 | 无任何删除/审核能力;建议 ADMIN_TOKEN + DELETE /api/wall?id,不做管理 UI | ✅ | Phase 4 |
| 3 | 伪造 XFF 头可绕过限流;应取最后一段/受信代理配置/Nginx 覆写 | ✅ | Phase 4(x-real-ip 优先+TRUST_PROXY_DEPTH+README) |
| 4 | createWall 全量覆盖非原子,崩溃可致 walls.json 清零;应 tmp+rename+.bak | ✅ | Phase 4 |
| 5 | 限流记录文件只增不减且同样非原子写 | 🔁 | 采纳其「内存 Map」选项:限流不落盘,删除写放大源 |
| 6 | GET /api/wall 无缓存头 | ✅ | Phase 4 |
| 7 | 多实例部署下写队列与限流全部失效 | 🔁 | 采纳「README 注明单实例边界」,不换存储 |
| 8 | 500 条裁剪直接丢最旧留言;应写归档 | ✅ | Phase 4 |
| 9 | 备份只有 README「建议」,无落地脚本 | ✅ | Phase 4 |
| 10 | Wall 类型含 5 个只写不读死字段,应瘦身+迁移存量 | ❌ | 字段兼容原版 liuyuyang 数据格式,迁移有数据风险且无运行收益 |
| 11 | POST 未校验 color 白名单 | ❌ | **事实误报**:route.ts 已有 `COLORS.includes(body.color)` 校验(亲读源码核实) |
| 12 | `items.length && useMarquee` 条件表达式隐患(0 字面量) | ✅ | Phase 4,一行修复 |

### Agent F:工程化与部署(12 条)

| # | 意见 | 判定 | 备注 |
|---|---|---|---|
| 1 | NeteaseCloudMusicApi 上游已死(2024 作者清仓,npm 冻结);应锁版本+评估迁移 enhanced 包+封装适配层 | ✅ | Phase 3,迁移独立 commit 可回退 |
| 2 | .gitignore 只忽略 .env*.local,裸 .env 会被提交 | ✅ | Phase 0 |
| 3 | 零 CI,standalone 构建失败只能在服务器发现;加 lint+build 矩阵 | ✅ | Phase 0 |
| 4 | .env.example 只 1 个变量,4 个运行时变量未文档化 | ✅ | Phase 0 |
| 5 | Node 版本未声明 engines/volta | ✅ | Phase 0(engines + .npmrc engine-strict) |
| 6 | copy 脚本 standalone 缺失时静默 exit 0,.next/static 无检查 | ✅ | Phase 0 |
| 7 | npm start 用 next start 与 standalone 输出不匹配 | 🔁 | start 改为 standalone 启动,保留 next start 形态为 start:next 供调试 |
| 8 | next/image 任意域名+http 全放行 | ✅ | 同 Agent C #7,Phase 5 收敛 |
| 9 | 零测试,建议 Vitest 覆盖纯逻辑 | 🔁 | 降级为 Phase 5 可选任务 |
| 10 | README 建议 Docker 却无 Dockerfile | ✅ | Phase 5 |
| 11 | git 工作流未定;建议 trunk-based+Conventional Commits+tag,不要 changeset | ✅ | 决策 4 |
| 12 | eslint 配置单薄;「README 写 OGL 但 package.json 无 ogl 依赖」 | 🔁 | 采纳 eslint 补 ignores/lint 脚本规范化;**不接受** OGL 说法——事实误报,package.json 明确含 `ogl: ^1.0.11` |

---

## 六、backlog(本期不做)

- 多 VIP 账号 cookie 池轮换(Agent B #12)
- Freedom/Quote 视频/海报纳入云清单第二批(Agent C #12)
- 相册组件全面迁移 next/image 之外的深度优化(Agent C #11 遗留部分)
- Wall 类型死字段迁移(Agent E #10)

## 七、需要站主提供

1. 网易云**小号**二维码(配置服务端内置账号时;大号有风控风险)
2. 真实社交主页链接(修 B站/网易云/微博 3 个死链;暂无则改非交互展示)
3. 云存储图片清单 JSON 的托管地址(没有则先保留占位图,交付示例清单自行上传)
