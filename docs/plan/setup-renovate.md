# Plan: Setup Renovate Bot for Turborepo Monorepo Template

Plan to configure automated dependency updates via Renovate Bot tailored for the full-stack Turborepo monorepo (`apps/api`, `apps/web`, `apps/mobile`, and `packages/*`), enforcing strict Expo SDK compatibility boundaries, Dockerfile toolchain synchronization, and CI configuration validation.

---

## Phase 1: Core Renovate Configuration

- **Files to modify**:
  - `renovate.json` (create)
  - `docs/plan/setup-renovate.md` (track progress)
- **Specific changes**:
  - Extend `config:recommended`.
  - Configure schedule (weekly: Monday mornings before 07:00 Asia/Ho_Chi_Minh).
  - Enable Dependency Dashboard with manual approval for major updates.
  - Set `minimumReleaseAge: "3 days"` stability cooldown for npm dependencies.
  - Configure package groups: Next.js + eslint-config-next, React web, NestJS core, NestJS CLI, Better Auth, Drizzle ORM, Radix UI, AWS SDK, Bull Board, ESLint/Prettier/TypeScript toolchains.
  - Configure mobile/Expo isolation: require approval for `expo`, disable independent automated upgrades for Expo SDK-bound libraries (`@expo/*`, `react-native`, `react-native-reanimated`, `react-native-screens`, `react-native-safe-area-context`, etc.).
  - Set Conventional Commit messages (`chore(deps): ...`).
- **Rationale**: Provides baseline automation rules preventing PR spam, respecting monorepo coupling, and preventing Expo native dependency version drift.

- [x] **Phase 1.1**: Create baseline `renovate.json` with recommended presets, schedule, limits, and approval policies.
- [x] **Phase 1.2**: Define monorepo package grouping rules across web, API, and shared packages.
- [x] **Phase 1.3**: Define Expo SDK containment rules for `apps/mobile/package.json`.
- [x] **Phase 1.4**: Validate `renovate.json` using `renovate-config-validator`.
- [x] **Phase 1.5**: Phase 1 verification, format check, and git commit.

---

## Phase 2: Toolchain & Dockerfile Synchronization

- **Files to modify**:
  - `apps/api/Dockerfile`
  - `apps/web/Dockerfile`
  - `.github/workflows/ci.yml`
  - `renovate.json`
- **Specific changes**:
  - In `.github/workflows/ci.yml`: remove hardcoded `version: 11.6.0` from `pnpm/action-setup@v4` step so it dynamically honors `package.json#packageManager`.
  - In `apps/api/Dockerfile` and `apps/web/Dockerfile`: annotate `pnpm` and `turbo` installation commands with Renovate datasource comments.
  - In `renovate.json`: add `customManagers` regex configurations matching annotated Dockerfile version pins and grouping them with root `pnpm` and `turbo`.
- **Rationale**: Keeps runtime container builds and CI actions synchronized whenever pnpm or Turbo versions are updated.

- [x] **Phase 2.1**: Update `.github/workflows/ci.yml` `pnpm/action-setup` step to omit hardcoded version.
- [x] **Phase 2.2**: Annotate `apps/api/Dockerfile` and `apps/web/Dockerfile` toolchain commands for custom regex matching.
- [x] **Phase 2.3**: Configure `customManagers` in `renovate.json` for Dockerfile `pnpm` and `turbo` pins.
- [x] **Phase 2.4**: Phase 2 verification, format check, and git commit.

---

## Phase 3: CI Renovate Validation & Expo Guardrails

- **Files to modify**:
  - `.github/workflows/ci.yml`
- **Specific changes**:
  - Add `Renovate Config Validation` step to CI workflow running `renovate-config-validator --strict`.
  - Add Expo SDK compatibility verification step (`pnpm --filter @repo/mobile exec expo install --check`).
- **Rationale**: Fails CI early if Renovate configuration syntax is invalid or if any PR introduces dependencies violating Expo SDK compatibility.

- [x] **Phase 3.1**: Add Renovate config validation step to `.github/workflows/ci.yml`.
- [x] **Phase 3.2**: Add Expo compatibility check step (`expo install --check`) to `.github/workflows/ci.yml`.
- [x] **Phase 3.3**: Test workflow steps locally to ensure zero false positives.
- [x] **Phase 3.4**: Phase 3 verification, format check, and git commit.

---

## Phase 4: Lockfile Maintenance & Security Alert Policies

- **Files to modify**:
  - `renovate.json`
- **Specific changes**:
  - Enable `lockFileMaintenance` running monthly on the 1st of each month.
  - Enable `vulnerabilityAlerts` configuration to bypass schedule cooldowns for security vulnerabilities.
- **Rationale**: Prunes stale transitive resolutions periodically and ensures critical security patches are presented promptly.

- [ ] **Phase 4.1**: Add `lockFileMaintenance` section to `renovate.json`.
- [ ] **Phase 4.2**: Configure `vulnerabilityAlerts` overrides in `renovate.json`.
- [ ] **Phase 4.3**: Validate updated configuration via `renovate-config-validator --strict`.
- [ ] **Phase 4.4**: Phase 4 verification, format check, and git commit.

---

## Phase 5: Documentation

- **Files to modify**:
  - `docs/renovate.md` (create)
  - `README.md`
- **Specific changes**:
  - Create `docs/renovate.md` detailing: GitHub App installation, update schedule, review checklists, Expo SDK upgrade workflow, Dockerfile synchronization, and troubleshooting.
  - Update `README.md` referencing Renovate documentation under dependencies and maintenance section.
- **Rationale**: Informs engineers cloning the template on how Renovate operates and how to maintain packages safely.

- [ ] **Phase 5.1**: Author `docs/renovate.md` in English with operational guidelines.
- [ ] **Phase 5.2**: Update `README.md` to reference Renovate workflow.
- [ ] **Phase 5.3**: Phase 5 verification, format check, and git commit.

---

## Phase 6: Full System Verification

- **Files to modify**: none (verification only)
- **Specific changes**:
  - Execute formatting check: `pnpm format:check`.
  - Execute scripts checks: `pnpm lint:scripts`, `pnpm typecheck:scripts`, `pnpm test:scripts`.
  - Execute rule and i18n audits: `pnpm check:i18n`, `pnpm check:rules`, `pnpm check:hardcoded`.
  - Execute workspace lint, typecheck, tests, and builds: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- **Rationale**: Verifies total monorepo integrity before concluding the task.

- [ ] **Phase 6.1**: Run complete verification suite.
- [ ] **Phase 6.2**: Final plan checklist mark-off and git commit.
