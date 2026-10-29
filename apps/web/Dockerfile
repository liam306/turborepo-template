# ============================================================================
# Stage 1: Base runtime image with PNPM & Turbo
# ============================================================================
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" \
    PNPM_STORE_DIR="/pnpm/store"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN apk add --no-cache libc6-compat curl \
    && corepack enable \
    # renovate: datasource=npm depName=pnpm
    && corepack prepare pnpm@12.15.0 --activate

# ============================================================================
# Stage 2: Pruner - Isolate @repo/web workspace graph
# ============================================================================
FROM base AS pruner
# renovate: datasource=npm depName=turbo
RUN pnpm add -g turbo@2.11.7
COPY . .
RUN turbo prune @repo/web --docker

# ============================================================================
# Stage 3: Dependencies installer
# ============================================================================
FROM base AS installer
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ============================================================================
# Stage 4: Builder - Build Next.js standalone application
# ============================================================================
FROM base AS builder
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
COPY turbo.json turbo.json

# Client-side build arguments for Next.js variable inlining
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_STORAGE_URL
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG SENTRY_AUTH_TOKEN

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_STORAGE_URL=$NEXT_PUBLIC_STORAGE_URL \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
    SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN --mount=type=cache,id=next-cache,target=/app/apps/web/.next/cache \
    --mount=type=cache,id=turbo-cache,target=/app/.turbo/cache \
    pnpm turbo run build --filter=@repo/web... --cache-dir=.turbo/cache

# ============================================================================
# Stage 5: Runner - Minimal Next.js standalone runner
# ============================================================================
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone server, static files and public assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
