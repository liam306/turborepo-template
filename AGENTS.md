# Monorepo Starter Agent Instructions

Turborepo Full-Stack Monorepo:

- `apps/mobile`: Expo SDK 57 / React Native (see `apps/mobile/AGENTS.md`)
- `apps/web`: Next.js 16 App Router (see `apps/web/AGENTS.md`)
- `apps/api`: NestJS 12 Backend API (see `apps/api/AGENTS.md`)
- `packages/core`: Pure domain calculation engines
- `packages/types`: Shared domain interfaces, DTOs, and schemas
- `packages/database`: Drizzle ORM PostgreSQL schema, DB client, and migrations
- `packages/utils`: Date, asset, locale, and API helpers

## Package Manager & Commands

Always use **pnpm**. Never use `npm`, `yarn`, or `bun`.

- `pnpm dev`: Run dev servers concurrently via Turbo
- `pnpm build`: Build all workspaces
- `pnpm lint`: Lint all workspaces
- `pnpm typecheck`: Typecheck all workspaces
- `pnpm format`: Format files using Prettier
- `pnpm format:check`: Check formatting using Prettier
- App-specific commands:
  - `pnpm --filter @repo/api <cmd>`
  - `pnpm --filter @repo/web <cmd>`
  - `pnpm --filter @repo/mobile <cmd>`

## Core Rules & Architecture

1. **Separation of Concerns & Code Modularization**:
   - Pure business/domain calculations stay in `packages/core`.
   - Database schema, queries, client, and domain repositories stay in `packages/database`.
   - Shared types and DTOs stay in `packages/types`.
   - Shared utility functions stay in `packages/utils`.
   - **No giant monolithic files**: Keep files small, focused, and single-responsibility (< 200-300 lines). Break down screens into modular sub-components, extract custom hooks, and isolate API/service logic outside of UI components.
2. **Documentation Mandate**:
   - All files in `docs/` and all `AGENTS.md` instruction files must always be written in **English**.
3. **App-Specific Context**:
   - When modifying code within `apps/api/`, read `apps/api/AGENTS.md`.
   - When modifying code within `apps/web/`, read `apps/web/AGENTS.md`.
   - When modifying code within `apps/mobile/`, read `apps/mobile/AGENTS.md`.
4. **Verification**:
   - Before finishing a task, always format, run tests, typecheck (`tsc --noEmit`), and lint on affected packages.
5. **Internationalization (i18n) Mandate**:
   - Absolutely NO hardcoded user-facing text in application code.
   - All text and response messages must be defined in i18n dictionaries for both `vi` and `en`:
     - Backend API: `apps/api/src/i18n/{en,vi}/*.json`
     - Web: `apps/web/messages/{en,vi}.json`
     - Mobile: `apps/mobile/src/locales/{en,vi}.json`
6. **API Client Locale Forwarding**:
   - All API requests from frontend clients (web and mobile) MUST send active user locale via header `x-lang: <locale>` or query `?lang=<locale>`.
7. **Conditional Styling with `cn()` Utility**:
   - Always use `cn()` from `@/lib/utils` for conditional classes, never template strings.
8. **UI Component Library Mandate (shadcn/ui First)**:
   - On web frontend, always reuse and prioritize shadcn/ui components from `@/components/ui/*`.
9. **Git Commit Guidelines & Automatic Commit**:
   - Use Conventional Commits (`feat(...)`, `fix(...)`, `refactor(...)`, `test(...)`, `chore(...)`).
   - **Detailed Message Body**: Commit messages must include a clear subject line and a detailed body with bullet points summarizing the specific modifications, touched areas, and rationale.
   - Automatically commit changes upon completing a task once all verification steps (formatting, tests, typecheck, lint) pass without errors.
10. **System-Wide Soft Delete Standards & Repository Pattern**:
    - Never execute hard SQL `.delete(...)` on primary domain entities (`user`).
    - Soft delete sets `deletedAt: new Date()`.
    - All regular listing and retrieval queries MUST include `isNull(table.deletedAt)` to prevent leaking trashed records. Enforce via `createSoftDeleteRepository` and `repositoryReadFilter` in `packages/database`.
    - Services, guards, and controllers in `apps/api` MUST call domain repositories from `@repo/database` rather than building direct ad-hoc queries for repository-managed entities.
    - Every soft-deletable entity must provide a corresponding restore endpoint (`POST .../restore`) resetting `deletedAt: null`.
11. **Database Schema & Migrations Mandate**:
    - **Never** write manual `.sql` migration files in `packages/database/drizzle/` or manually edit `packages/database/drizzle/meta/_journal.json`. Drizzle Kit requires snapshot files in `meta/` to track schema diffs.
    - Always define changes in TypeScript schema files under `packages/database/src/schema/*.ts` and re-export them from `packages/database/src/schema/index.ts`.
    - Always generate migrations using:
      ```bash
      pnpm --filter @repo/database db:generate --name <migration_name>
      ```
    - Always run migrations using:
      ```bash
      pnpm --filter @repo/database db:migrate
      ```
    - In dev when rapid schema push without migration tracking is desired, use `pnpm --filter @repo/database db:push`.
12. **DTO Ownership & Boundary Mandate**:
    - Shared domain contracts, request/response models, and enums stay in `packages/types`.
    - Server runtime validation DTOs (`class-validator`/`class-transformer`) stay in `apps/api/src/*/dto/` implementing or mapping to contracts from `@repo/types`.
    - Never import server-specific runtime DTO classes into shared packages, web, or mobile.
13. **Error Envelope & Public Metadata Policy**:
    - API error responses preserve an explicit, typed allowlist of metadata (`code`, `limit`, `remaining`, `resetAt`, `errors`).
    - All exceptions pass through `AllExceptionsFilter`, stripping database connection secrets and raw driver errors.
14. **File Size Guidelines & Documented Exceptions**:
    - Keep functional source files under 200-300 lines by decomposing into sub-components, custom hooks, and modular services.
    - Permitted documented exceptions include static seed fixtures and generated migration snapshots.
15. **Planning & Task Checklists**:
    - When a task requires planning (multi-file changes, cross-package work, architecture decisions), produce a detailed plan as a checklist organized by phases.
    - Plans must be written to `docs/plan/<descriptive-slug>.md` inside the repository — **never** to `~/.opencode/plan/` or any location outside the repo.
    - Ask the user for write permission before creating or updating plan files.
    - Each phase should list: files to modify, specific changes, and rationale.
    - Mark checklist items with `- [ ]` (pending) or `- [x]` (done) and update them as work progresses.
16. **Frontend State Management & Storage Mandate**:
    - **Server & Async State**: Always use React Query (`useQuery`, `useMutation`). Do not manage server/network states (`loading`, `error`, `success`, `isPending`) via manual React `useState`. Derive UI states directly from query/mutation status.
    - **Persistent Client State**: Use Zustand stores with `persist` middleware for persistent client state (e.g., sidebar collapse, theme settings). Never call `localStorage` or `AsyncStorage` directly inside UI components.
    - **Temporary Local UI State**: Reserve React `useState` solely for isolated, non-persistent, non-async UI interactions (such as current input value in an unsubmitted field or modal visibility).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
