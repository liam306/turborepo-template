# Backend API Guidelines (`apps/api`)

NestJS 12 backend service in the Turborepo monorepo template.

## Package Manager & Commands

Always use **pnpm**. Never use npm/yarn.

```bash
# From monorepo root
pnpm dev:api         # Start NestJS in watch mode
pnpm build:api       # Build production output to dist/
pnpm lint:api        # Lint code
pnpm typecheck:api   # Typecheck (tsc --noEmit)
pnpm test:api        # Run Jest test suites

# Inside apps/api
pnpm dev
pnpm build
pnpm typecheck
pnpm test
```

## Architecture & Conventions

- **Database**: Drizzle ORM PostgreSQL. Injected via `DatabaseService` (adapter in `src/database/database.service.ts` wrapping `@repo/database` schema, client, and repositories). Never write raw SQL directly when Drizzle query builder or repository methods suffice.
  - **Repository Pattern Mandate**: For entities managed by domain repositories in `@repo/database` (such as `usersRepository`), services, guards, and controllers MUST invoke repository methods passing `this.dbService.db` or transaction `tx`. Do NOT write direct ad-hoc Drizzle queries (`this.dbService.db.query.*`, `this.dbService.db.select()`, `this.dbService.db.update()`) across application layers.
  - **Transaction Support**: Pass transaction client `tx` directly into repository functions (e.g. `usersRepository.softDelete(tx, userId)`).
  - **Unit Testing Boundary**: Always mock at the repository boundary using `jest.spyOn(xxxRepository, 'method')`. Never mock chained Drizzle query builder calls (`mockDb.query.*`, `mockDb.update.set.where`).
- **Authentication**: Better Auth (`better-auth`). Protected routes use `@UseGuards(AuthGuard)` and read user session from request.
- **Queue / Background Jobs**: BullMQ with Redis for background tasks (`MailProcessor`).
- **Shared Packages**:
  - `@repo/core`: Pure domain calculation algorithms.
  - `@repo/types`: Shared DTOs, request/response models, and enums.
  - `@repo/utils`: Shared formatting and calculation helpers.
- **Validation**: Strict TypeScript types and DTOs using `@repo/types`.
- **Internationalization (i18n)**:
  - Every service, guard, filter, and interceptor that produces user-facing text must inject `I18nService` from `nestjs-i18n`.
  - Use `this.i18n.t('key', { lang, args: { ... } })` — never throw exceptions with hardcoded string literals.
  - Read incoming locale from request context (`I18nContext.current()?.lang` or request header `x-lang` / query `?lang`).
  - When introducing new translation keys, always update both `src/i18n/en/*.json` and `src/i18n/vi/*.json`.
- **Modular Service & Controller Design**:
  - Keep controllers thin: only handle request mapping, guards, decorators, and response serialization.
  - Complex logic belongs in dedicated service classes, helpers, or `@repo/core`.
  - Isolate DTO definitions into `dto/` directories per module.
