# syntax=docker/dockerfile:1
# web — SUBB SURFERS Next.js game + UI (Bun build, standalone Node runtime).
#
# Stage 1 installs dependencies and runs `next build` with Bun (fast, and the
# repo already pins bun.lock). Stage 2 copies the standalone server output
# (.next/standalone + .next/static + public) into a slim node:22-alpine image.

# ---------- Stage 1: build ----------
FROM oven/bun:1 AS build
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Install first for maximal layer caching (bun.lock is authoritative).
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Then copy sources and build. `output: "standalone"` in next.config.ts makes
# `next build` emit .next/standalone with a self-contained server.js.
COPY . .
RUN bunx --bun next build

# ---------- Stage 2: run ----------
FROM node:25-alpine AS run
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system subb && adduser --system --ingroup subb subb

# Standalone server (includes pruned node_modules and server.js).
COPY --from=build --chown=subb:subb /app/.next/standalone ./
# Static client assets must sit at .next/static relative to the server root.
COPY --from=build --chown=subb:subb /app/.next/static ./.next/static
# Public files (logo.svg, robots.txt, …).
COPY --from=build --chown=subb:subb /app/public ./public

USER subb
EXPOSE 3000

# wget ships with busybox in alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
