# ── Stage 1: Install deps ────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

# Build tools needed for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@9

# Copy workspace manifests + lockfile (deterministic install)
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json   ./packages/shared/
COPY packages/ui/package.json       ./packages/ui/
COPY apps/api/package.json          ./apps/api/

RUN pnpm install

# Download Playwright Chromium + all OS dependencies
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

# Copy all source
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./

# Call binaries directly — avoids pnpm 9 script-runner hoisting issues
RUN node_modules/.bin/prisma generate --schema=packages/database/prisma/schema.prisma
RUN cd packages/database && node /app/node_modules/typescript/bin/tsc --build
RUN cd packages/shared && node /app/node_modules/typescript/bin/tsc --build 2>/dev/null || true

# Compile NestJS — call @nestjs/cli bin directly (pnpm script runner has PATH issues)
RUN cd apps/api && node /app/node_modules/@nestjs/cli/bin/nest.js build

# ── Stage 3: Run ─────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# Chromium runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 \
    libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 libnspr4 libnss3 \
    libpango-1.0-0 libpangocairo-1.0-0 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 \
    libxkbcommon0 libxrandr2 libxrender1 libxss1 libxtst6 \
    fonts-liberation fonts-noto-color-emoji libvulkan1 \
    openssl curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Copy compiled app + deps
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist        ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules         ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages             ./packages
COPY --from=builder --chown=nestjs:nodejs /app/package.json         ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/pnpm-workspace.yaml  ./pnpm-workspace.yaml
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/entrypoint.sh ./entrypoint.sh

# Copy the downloaded Playwright browser binaries
COPY --from=deps /ms-playwright /ms-playwright
RUN chown -R nestjs:nodejs /ms-playwright

USER root
RUN chmod +x /app/entrypoint.sh
USER nestjs
EXPOSE 4000
CMD ["/app/entrypoint.sh"]
