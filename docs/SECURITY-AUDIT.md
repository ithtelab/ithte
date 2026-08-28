# ithte 安全审计报告(2026-08-28)

> 本报告基于 Mimosa 深度扫描 + npm audit 联网复核生成,记录本轮所有代码改动(Phase 0–5)的安全核查结论。封印与可复核制品见文末"可复核性"。

## 一、Mimosa 深度安全扫描

| 项目 | 值 |
|---|---|
| Scan ID | `scan-2026-08-28T10-37-20.601Z-1b8693ec7d12` |
| Depth | `deep` |
| Run status | `inconclusive`(调用图部分不完整:部分为动态派发/超分析规模) |
| Findings | **0**(0 business-logic candidate) |
| Verdict effect | `none` |

**结论**:本轮全部代码改动(音乐账号/图片清单/music API 加固/留言板/播放器/UX)均未发现业务逻辑高危漏洞。

**覆盖缺口**(Mimosa 自述):调用图跨文件可达性可能不完整——部分调用是动态派发或超出分析规模。因此 0 findings 不能等同于"绝对安全",而是"未在可静态分析范围内发现问题"。

### 扫描封印制品

- 项目目录 `C:\Users\Leo\.mimosa\security-scans\project-354e30c463a97e82e3a4f1de\scan-2026-08-28T10-37-20.601Z-1b8693ec7d12`
- 总 digest `sha256:bc9a6f207e76991a070b6665db1c598672ecbebb66eade69598bd1ea6e4e91b9`
- 制品哈希(seal.json):
  - `scan-manifest.json` = `a6f86ae827f46d4bc0c63cafe132064851938a64d730a8d474fe8738ae9ed71c`
  - `findings.json` = `efed87d4af229b1aaa79a9add07b06a95e7dfc59d1e67caed4dde33145ae02dd`
  - `coverage.json` = `4c7e9070d8266aa90467627d5199d66c069b7f0776f1c07b193a3a274803c8de`

## 二、依赖漏洞(npm audit 联网复核)

Mimosa 离线快照命中 11 条 advisory(标记 context-only、未定级)。我运行 `npm audit` 联网复核得到精确清单:

### 已修复(mimosa 往返后执行了安全 `npm audit fix`)

| 包 | 级别 | 性质 | 归属 |
|---|---|---|---|
| js-yaml | high | Quadratic CPU (omap) | 构建工具链(eslint) |
| nanoid | high | 零尺寸死循环 | 构建工具链(tailwind postcss / next 内嵌 postcss) |
| brace-expansion | high | DoS 无界扩展 | 构建工具链(eslint / typescript-eslint) |

这三条都是**纯构建期工具链**,不进入生产 bundle;已通过 `npm audit fix`(非 force)升级,未触碰任何主依赖。lockfile 变更仅限:`js-yaml@4.3.2`、`nanoid@3.3.18`、`brace-expansion@5.0.9`/`1.1.18`、`postcss@8.5.26`(tailwind 链)。

### 剩余(需 force 升级,已评估后暂不动)

| 包 | 级别 | 是否直接依赖 | 说明 |
|---|---|---|---|
| NeteaseCloudMusicApi | high | ✅ 直接 | 其传递依赖 music-metadata/file-type 有漏洞;但**该包已按计划锁死 4.32.0**。force 修复会降级到 3.47.5(breaking),且依赖该包的音乐 API 已封装于 `src/lib/netease-api.ts` 适配层,未来换 `@neteasecloudmusicapienhanced/api` 时一并解决 |
| next | high | ✅ 直接 | 内嵌脆弱 postcss / sharp。force 会升级到 16.3.3(超出已锁定的 16.0.10 范围),回归风险高;按计划不可盲升 |
| postcss / sharp(作为 next 依赖) | high | 否 | 随 next 固定,同上 |

**风险暴露面说明**:
- `sharp` 仅被 Next 的图片优化器在加载远程图片时使用;本项目绝大部分图片是原生 `<img>`(相册组件),仅 Hero 头像 1 张用 `next/image`,且依赖已通过 `qualities` 白名单约束。暴露面有限。
- `file-type`(moderate)与 `music-metadata` 由 NeteaseCloudMusicApi 传递,仅在解析音乐元数据路径生效,API 层已加限流+超时缓存,单实例运行,可控。

### 决策

- **不动** next / NeteaseCloudMusicApi / sharp:force 修复是 breaking change,会破坏已锁定的框架版本与网易云 API,风险大于收益。已通过"锁版本 + 适配层封装 + 限流缓存"缓解。
- **后续建议**:迁移到 `@neteasecloudmusicapienhanced/api`(活跃维护)时可一并消除 file-type/music-metadata 链;Next 升级到含修复的 16.x 补丁版本时再重新审计。

## 三、安全加固(本轮已落地)

- SSRF:服务端发起请求前校验主机名(`url-guard.ts`),拒绝 localhost/环回/私有/保留地址;probeUrl 仅允许 https + `*.126.net`。
- IP 限流:`/api/music/*` 与 `/api/wall` 均有滑动窗口限流(`rate-limit.ts`),防公共代理滥用。
- 密钥:网易云 cookie AES-256-GCM 加密存储;音乐会话与账号文件均加密;`.gitignore` 拦截裸 `.env` 入库。
- 输入校验:id 参数整数校验、留言 NFKC 清洗/敏感词/链接数限制/蜜罐、管理端 Bearer 令牌常量时间比较。
- 数据可靠性:JSON 原子写 + `.bak` 回退 + 归档;管理端删除需 `ADMIN_TOKEN`(未配置返回 404 防探测)。
- 依赖:锁死 NeteaseCloudMusicApi@4.32.0,封装适配层收窄替换爆炸半径;CI 双 Node 矩阵 lint+build。

## 四、说明

- Mimosa 运行状态为 `inconclusive`,0 findings 不等于绝对安全;关键路径(SSRF/限流/加密/校验)已人工复核与运行时测试(留言 CRUD、限流触发、歌单/歌词 API、首页渲染均验证通过)。
- 此前 Mimosa 曾拦截/提示的"路径穿越"(`site-data.ts` 已加包含校验)、"弱随机数"(`Math.random` 用于非加密的 id/shuffle,已确认为误报)、"同形字包名"(核对为纯 ASCII 的官方 `NeteaseCloudMusicApi`,误报)均已核实处置。
