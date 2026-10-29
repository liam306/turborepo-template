# Database Guidelines (`packages/database`)

PostgreSQL database schemas, migrations, and Drizzle ORM client for the monorepo starter.

## Package Manager & Commands

Always use **pnpm**.

```bash
# From root
pnpm db:generate             # Generate new migration and snapshot (or --name <name>)
pnpm db:migrate              # Apply pending migrations to database
pnpm db:push                 # Push schema directly to database (dev prototyping)
pnpm db:studio               # Launch Drizzle Studio UI

# Package-specific
pnpm --filter @repo/database db:generate --name <name>
pnpm --filter @repo/database db:migrate
pnpm --filter @repo/database db:push
pnpm --filter @repo/database typecheck
```

## Schema & Migration Rules

1. **Never write manual SQL migration files or edit `meta/_journal.json`**:
   - Drizzle Kit manages internal state and diff tracking via `meta/*_snapshot.json` and `meta/_journal.json`.
   - Writing `.sql` files manually or hacking `_journal.json` breaks subsequent `db:generate` diff calculations and results in duplicate DDL generation.
2. **Standard Workflow for Schema Changes**:
   - Step 1: Modify or add TypeScript table definitions in `src/schema/*.ts`.
   - Step 2: Ensure any new schema file or entity is exported in `src/schema/index.ts`.
   - Step 3: Run `pnpm --filter @repo/database db:generate --name <descriptive_change_name>`.
   - Step 4: Verify generated `.sql` file and corresponding `meta/<index>_snapshot.json`.
   - Step 5: Run `pnpm --filter @repo/database db:migrate` to apply to local PostgreSQL.
3. **Database Client**:
   - Export schemas and DB client via `src/index.ts`.
   - Keep schema relations defined using Drizzle's `relations(...)` syntax where appropriate.
4. **Soft Delete**:
   - Primary domain tables must include `deletedAt: timestamp('deleted_at', { withTimezone: true })`.

## Repository Pattern & Data Access Standards

1. **Repository Factory & Architecture**:
   - Soft-delete domain entities MUST be wrapped using `createSoftDeleteRepository(table, config)` in `src/repositories/`.
   - All repository functions MUST accept `db: DbOrTx` (`DbClient | TxClient`) as their first parameter. Never capture a global database client or connection instance inside repository closures.
   - All read queries (`findById`, `findMany`, `count`) MUST apply `repositoryReadFilter` by default to exclude records where `deletedAt IS NOT NULL`. To include soft-deleted records, callers pass `{ includeDeleted: true }`.
   - Mutations (`update`, `softDelete`, `restore`) MUST maintain timestamp invariants:
     - `update`: sets `updatedAt = new Date()`.
     - `softDelete`: sets `deletedAt = now` and `updatedAt = now`.
     - `restore`: sets `deletedAt = null` and `updatedAt = new Date()`.
2. **Repository Testing Standards**:
   - Unit tests for repository logic live in `src/repositories/__tests__/`.
   - Use lightweight query double chains (`queryDouble`) to verify query construction, filters, pagination, and SQL clauses without requiring a running database server.
