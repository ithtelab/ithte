#!/usr/bin/env bash
# 留言墙 / 限流数据备份脚本
# 用法:
#   ./scripts/backup-walls.sh [数据目录] [备份保留份数]
#   默认数据目录为 ./data,保留最近 5 份。
# 可选:接入 rclone 上传到云存储(取消下方注释并配置)。
set -euo pipefail

DATA_DIR="${1:-${SITE_DATA_DIR:-./data}}"
KEEP="${2:-5}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
DEST_DIR="${BACKUP_ROOT}/walls-${STAMP}"
DEST_FILE="${DEST_DIR}.tar.gz"

if [[ ! -d "$DATA_DIR" ]]; then
  echo "[backup-walls] 数据目录不存在: $DATA_DIR(跳过)"
  exit 0
fi

mkdir -p "$BACKUP_ROOT"

echo "[backup-walls] 备份 $DATA_DIR -> $DEST_FILE"
tar -czf "$DEST_FILE" -C "$DATA_DIR" .

# 保留最近 N 份
ls -1t "${BACKUP_ROOT}"/walls-*.tar.gz 2>/dev/null | sed -n "$((KEEP + 1))"$'$' | xargs -r rm -f

# 可选:上传到云存储(需安装 rclone 并配置远程名)
# rclone copy "$DEST_FILE" remote:ithte-backups/

echo "[backup-walls] 完成,当前已有备份份数: $(ls -1 "$BACKUP_ROOT"/walls-*.tar.gz 2>/dev/null | wc -l | tr -d ' ')/$KEEP"

# cron 示例(每天凌晨 3 点):  0 3 * * * /path/to/ithte/scripts/backup-walls.sh >> /var/log/ithte-backup.log 2>&1
