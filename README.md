# Turborepo Monorepo Template

A production-ready full-stack Turborepo starter template built with modern TypeScript tools.

## Architecture

```
starter-monorepo/
├── apps/
│   ├── api/          # NestJS 12 backend API
│   ├── web/          # Next.js 16 App Router web frontend
│   └── mobile/       # Expo SDK 57 / React Native mobile app
├── packages/
│   ├── core/         # Pure domain calculations & business algorithms
│   ├── types/        # Shared DTOs, schemas, and TypeScript interfaces
│   ├── database/     # Drizzle ORM schema, client, and migrations
│   └── utils/        # Date, asset, locale, and API helpers
└── docker-compose-local.yml
```

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: NestJS 12, Better Auth, BullMQ, ioredis, Nodemailer, S3 Storage (AWS SDK v3), Sentry
- **Database**: PostgreSQL 18, Drizzle ORM, Drizzle Kit
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui, next-intl
- **Mobile**: Expo SDK 57, React Native 0.86, NativeWind 4, Zustand 5, react-i18next
- **Infrastructure**: Docker Compose (PostgreSQL 18, Redis 8.0, SeaweedFS S3, Mailpit)

## Getting Started

### 1. Prerequisites

- Node.js >= 22.12.0
- pnpm >= 11.6.0
- Docker & Docker Compose

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your configuration
pnpm env:sync
```

### 3. Start Local Infrastructure

```bash
pnpm docker:up
# Starts Postgres 18, Redis 8.0, SeaweedFS (S3), and Mailpit
```

#### Local Service & Port Map

| Service            | Port   | Endpoint / Credentials                                        |
| ------------------ | ------ | ------------------------------------------------------------- |
| PostgreSQL         | `5432` | `postgres://postgres:postgres@localhost:5432/app_db`          |
| Redis              | `6379` | `localhost:6379`                                              |
| SeaweedFS (S3 API) | `8333` | `http://localhost:8333` (Access: `minioadmin` / `minioadmin`) |
| SeaweedFS (Filer)  | `8888` | `http://localhost:8888`                                       |
| Mailpit SMTP       | `1025` | `localhost:1025`                                              |
| Mailpit Web UI     | `8025` | `http://localhost:8025` (Auth: `admin` / `admin@mailpit`)     |

### 4. Install Dependencies & Initialize Database

```bash
pnpm install
pnpm db:push
# Or run migrations:
# pnpm db:migrate
```

### 5. Seed Super Admin (Optional)

```bash
pnpm seed:admin --email admin@example.com --password YourPassword123 --name Admin
```

### 6. Start Development Servers

```bash
pnpm dev
# Runs API (http://localhost:4000), Web (http://localhost:3000), and Mobile concurrently
```

Or run individual apps:

```bash
pnpm dev:api      # NestJS API
pnpm dev:web      # Next.js Web
pnpm dev:mobile   # Expo Mobile
```

## Mobile Configuration

### Expo EAS Setup

1. Log in to your Expo account:
   ```bash
    pnpm dlx eas-cli login
   ```
2. Initialize EAS in `apps/mobile`:
   ```bash
    cd apps/mobile
    pnpm dlx eas-cli init
   ```
3. Update `apps/mobile/app.json` with your generated project ID and custom slug.

### Google & Apple OAuth Configuration

- **Web OAuth**: Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`.
- **Mobile Google OAuth**: Uses the Better Auth Expo plugin and backend Google credentials. Configure `AUTH_TRUSTED_ORIGINS` for your app schemes (`starter://`, `starter-dev://`, `starter-preview://`) and the provider callback `${BETTER_AUTH_URL}/auth/callback/google`. The Expo plugin handles browser callbacks and secure cookie storage; the app retrieves the resulting bearer session. Test using a development build, not Expo Go.
- **Apple Authentication**: Enabled natively on iOS devices via `expo-apple-authentication`.

## Renaming Package Scope `@repo/*`

To rename `@repo` to your custom project scope (e.g. `@mybrand`):

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.mjs" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  ! -path "*/dist/*" \
  ! -path "*/.git/*" \
  -exec sed -i 's/@repo\//@mybrand\//g' {} +

pnpm install
```

## Features Included

- [x] Full Auth System: Email/password, email OTP, OAuth ready (Google, Apple), session management
- [x] User Profile & Avatar Upload (Sharp WebP compression + S3 upload)
- [x] Background Job Queues: BullMQ with Redis + Bull Board dashboard (`/bull-board`)
- [x] Full Internationalization (i18n): English and Vietnamese across API, Web, and Mobile
- [x] Design Systems: shadcn/ui on web, NativeWind on mobile
- [x] Compliance & Quality: CI audits for hardcoded strings, i18n key parity, and clean architecture boundaries (no Git hooks installed by default)
- [x] Automated Dependency Updates: Renovate Bot configuration with monorepo grouping, Expo SDK guardrails, and Dockerfile toolchain synchronization (see [docs/renovate.md](docs/renovate.md))

## Template Behavior and Verification

- `pnpm build` builds API and web. Shared packages expose TypeScript source; mobile builds use the separate EAS commands.
- Automated dependency updates are managed via Renovate Bot. Review [docs/renovate.md](docs/renovate.md) for GitHub App installation, update schedules, and Expo SDK upgrade rules.
- Account deletion is a soft delete: sessions are revoked and account records retained. Administrators can restore access; a removed avatar is not restored automatically.
- Data-reset hooks remain as extension points. Their UI actions are hidden by default (`enableDataReset=false`); implement domain cleanup before enabling them.
- Production requires a non-placeholder `BETTER_AUTH_SECRET` of at least 32 characters and a custom `DOCS_PASSWORD`, even when Swagger is disabled, because Bull Board remains protected.
- For a physical device, replace `EXPO_PUBLIC_API_URL=http://localhost:4000` with your development machine's reachable LAN URL. Expo web normally runs on port 8081.

## Optional VPS Deployment

Deployment workflows are disabled unless repository variable `ENABLE_VPS_DEPLOY=true` is set. Configure `APP_NAME` (default `starter`), a self-hosted Docker runner, and secrets `ENV_API_PROD` / `ENV_WEB_PROD` first. CI does not gate the independent deploy workflows; require passing checks through branch protection before merging to `main`.

Production Compose services share external network `${APP_NAME}_network`. Configure a reverse proxy on that network; API/web Compose files do not publish host ports. Supply reachable SMTP and S3 services in production environment files. Local Mailpit and SeaweedFS are not included in production infrastructure.

`APP_NAME` namespaces Compose projects, containers, networks and volumes. Local host ports must also differ when running multiple projects on one machine. Dozzle and Netdata require explicit `--profile monitoring`; Netdata grants privileged host access and should only run on trusted hosts.

Changing `APP_NAME` or upgrading from the old fixed `repo-*` names creates different Docker resources. It does not migrate existing database volumes. Back up and explicitly migrate production data before changing names; never treat a new empty volume as a successful migration.

Backend auth trusted origins and HTTP CORS origins are separate settings. Add only owned app schemes to `AUTH_TRUSTED_ORIGINS`; update both environment examples when renaming mobile schemes.

## License

MIT
