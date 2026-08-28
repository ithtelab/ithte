# ===== 构建阶段 =====
FROM node:22-alpine AS builder
WORKDIR /app

# 依赖先行缓存
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# 源码
COPY . .
# 数据目录在构建期不打包(运行时由挂载卷提供);构建脚本会拷 public/data 进 standalone
RUN npm run build

# ===== 运行阶段 =====
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# HOSTNAME 由 Next standalone 读取;PORT 由部署方注入
ENV HOSTNAME=0.0.0.0

# 非 root 运行
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# standalone 输出 + 静态资源 + public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 数据目录留给挂载卷;若未挂载则创建以防启动报错
RUN mkdir -p data && chown -R nextjs:nodejs data

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
