FROM golang:1.24-alpine AS packwiz
RUN apk add --no-cache git && go install github.com/packwiz/packwiz@latest

FROM oven/bun:1-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
  DB_FILE=file:/data/local.db \
  REPOS_PATH=/data/packwiz-repos \
  WORKTREE_PATH=/tmp/packwiz-worktrees

COPY --from=packwiz /go/bin/packwiz /usr/local/bin/packwiz
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src ./src
COPY assets ./assets

RUN mkdir -p /data /tmp/packwiz-worktrees && chown -R bun:bun /app /data /tmp/packwiz-worktrees
USER bun

VOLUME ["/data"]
CMD ["sh", "-c", "bunx drizzle-kit migrate && bun run bot"]
