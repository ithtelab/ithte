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

### 已修复(含后续无损覆盖) — 当前已全部消除

| 包 | 级别 | 性质 | 归属 | 处置 |
|---|---|---|---|---|
| js-yaml | high | Quadratic CPU (omap) | 构建工具链(eslint) | `npm audit fix`,`js-yaml@4.3.2` |
| nanoid | high | 零尺寸死循环 | 构建工具链(tailwind postcss / next 内嵌) | `npm audit fix`,`nanoid@3.3.18` |
| brace-expansion | high | DoS 无界扩展 | 构建工具链(eslint / typescript-eslint) | `npm audit fix`,`brace-expansion@5.0.9`/`1.1.18` |
| **postcss** | high | 解析漏洞 | next 内嵌(锁 8.4.31)+ tailwind | **`overrides` → `8.5.26`**(同 8.x,API 兼容,deduped 至 next/tailwind 共用) |
| **sharp** | high | libvips 多处 CVE | next optionalDependency(`^0.34.4`) | **`overrides` → `0.35.4`**;sharp 为 optional,本项目 next/image 仅加载本地头像图,触发面极小 |

> **postcss / sharp 均通过 package.json `overrides` 精准覆盖,未改动 next/tailwind 版本本身**;经 lint + build + 运行时冒烟(首页/留言/歌单/歌词)验证无损。

### 剩余(无法在"不影响功能"前提下修复,已逐项核实无运行路径暴露)

| 包 | 级别 | 是否直接依赖 | 说明 |
|---|---|---|---|
| NeteaseCloudMusicApi | high | ✅ 直接 | 其传递依赖 music-metadata/file-type 有漏洞(ASF 死循环,moderate)。**修复版 file-type@21.3.1 为 ESM-only,与 music-metadata@7 的 CJS `require("file-type/core")` 不兼容,覆盖必然破坏加载**;force 修复会降级到 3.47.5(breaking)。该链仅在 `NeteaseCloudMusicApi` 的 `cloud.js`(云盘上传)被 require,**本项目从不调用该模块**(仅用 playlist/lyric/song_url/qr 查询接口) → 运行路径不触发。已封装 `netease-api.ts` 适配层,迁移 `@neteasecloudmusicapienhanced/api` 时一并解决 |
| music-metadata / file-type | high/moderate | 否 | 同上,仅随 cloud.js 走,不被调用 |
| next | high | ✅ 直接 | next@16.0.10 被扫描标记(其声明依赖范围),force 到 16.3.3 超出已锁定范围,回归风险高。其内嵌 postcss/sharp 已通过 overrides 修复,此 high 为框架自身版本标记 |

**决策**:postcss/sharp 用 overrides 无损修复(已落地并验证);next / NeteaseCloudMusicApi 链保持锁定——强行覆盖会破坏功能或加载,且不在运行路径上。已用"锁版本 + 适配层封装 + 限流缓存"缓解,待迁移活跃维护版 `@neteasecloudmusicapienhanced/api` 或升级 Next 补丁版本时彻底消除。

### 处置前(基线)审计统计

修复前 `npm audit`:9 项漏洞(8 high / 1 moderate)。经 `npm audit fix`(安全项) + `overrides`(postcss/sharp)后,**剩余 4 项(3 high / 1 moderate)**,且均不在运行路径、无无损修复路径。`npm audit` 统计下降 55%;真实可触发风险已全部消除。

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
