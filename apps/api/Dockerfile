# ============================================================================
# Stage 1: Base runtime image with PNPM & Turbo
# ============================================================================
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm" \
    PNPM_STORE_DIR="/pnpm/store" \
    CI=true
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@11.6.0 --activate

# ============================================================================
# Stage 2: Pruner - Isolate @repo/api workspace graph
# ============================================================================
FROM base AS pruner
RUN pnpm add -g turbo@2.11.7
COPY . .
RUN turbo prune @repo/api --docker

# ============================================================================
# Stage 3: Dependencies installer
# ============================================================================
FROM base AS installer
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================================================
# Stage 4: Builder - Build packages, API & prepare standalone deploy
# ============================================================================
FROM base AS builder
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json
RUN --mount=type=cache,id=turbo-cache,target=/app/.turbo/cache \
    pnpm turbo run build --filter=@repo/api... --cache-dir=.turbo/cache

# Create standalone production workspace deployment
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm --filter @repo/api --prod --legacy deploy /app/pruned-api

# ============================================================================
# Stage 5: Runner - Minimal production image
# ============================================================================
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nestjs

# Production dependencies and bundle
COPY --from=builder --chown=nestjs:nodejs /app/pruned-api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/pruned-api/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/src/i18n ./dist/i18n
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/src/mail/templates ./dist/mail/templates
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/drizzle ./drizzle
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/scripts/migrate.mjs ./scripts/migrate.mjs

USER nestjs
EXPOSE 4000

CMD ["node", "dist/main"]
