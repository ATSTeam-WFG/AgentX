#!/bin/sh
set -e

echo "[start] container boot"
echo "[start] node $(node --version)"
echo "[start] running prisma migrate deploy"

npx prisma migrate deploy

echo "[start] migrations done, starting node"

exec node dist/index.js
