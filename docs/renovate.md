# Automated Dependency Updates via Renovate

This repository uses [Renovate](https://docs.renovatebot.com/) to automate dependency updates across all workspaces (`apps/api`, `apps/web`, `apps/mobile`, and `packages/*`) and Docker container manifests.

---

## 1. Initial Setup for New Repositories

When instantiating a new repository from this template:

1. **Install Renovate GitHub App**:
   - Install the official [Renovate GitHub App](https://github.com/apps/renovate) on your GitHub account or organization.
   - Grant repository read & write permissions to the repository.
2. **Enable Issues**:
   - Ensure repository **Issues** are enabled in repository settings (`Settings` -> `General` -> `Features` -> `Issues`). Renovate uses an issue named **Renovate Dependency Dashboard** to track pending updates, major version approvals, and schedule overviews.
3. **Branch Protection & CI**:
   - Protect your default branch (`main`) by requiring pull request reviews and requiring the `Validate Codebase` status check to pass before merging.

---

## 2. Schedule and Rate Limits

To balance dependency hygiene with developer focus:

- **Weekly Routine Schedule**: Dependency pull requests are scheduled on **Monday mornings before 07:00 (Asia/Ho_Chi_Minh)**.
- **Stability Cooldown (`minimumReleaseAge`)**: Standard npm packages require a **3-day cooldown** period before a PR is opened, preventing day-zero regression bugs.
- **Rate Limits**: At most **2 PRs created per hour** and up to **5 open PRs concurrently**.
- **Lockfile Maintenance**: Runs monthly on the **1st day of each month** to deduplicate and prune transitive dependencies in `pnpm-lock.yaml`.
- **Security Vulnerability Alerts**: Security vulnerability patches bypass the weekly schedule cooldown and create pull requests immediately.

---

## 3. Monorepo Package Grouping Rules

Renovate groups coupled dependencies together to avoid version skew across workspaces:

| Group Name         | Managed Dependencies                                                                      | Behavior                                                           |
| :----------------- | :---------------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| **Next.js**        | `next`, `eslint-config-next` in `apps/web`                                                | Updated together                                                   |
| **React (Web)**    | `react`, `react-dom`, `@types/react`, `@types/react-dom` in `apps/web`                    | Isolated from mobile                                               |
| **NestJS core**    | `@nestjs/common`, `core`, `platform-express`, `testing`, `config`, `throttler`, `swagger` | Updated together                                                   |
| **NestJS tooling** | `@nestjs/cli`, `@nestjs/schematics`                                                       | Updated together                                                   |
| **Better Auth**    | `better-auth`, `@better-auth/expo`                                                        | Synchronized across API, Web, and Mobile                           |
| **Drizzle ORM**    | `drizzle-orm`, `drizzle-kit`                                                              | Requires Dependency Dashboard approval due to 0.x breaking changes |
| **AWS SDK**        | `@aws-sdk/**`                                                                             | Grouped to minimize changelog fragmentation                        |
| **Bull Board**     | `@bull-board/**`                                                                          | Grouped express/nestjs/api dashboard packages                      |
| **Radix UI**       | `@radix-ui/**`                                                                            | Grouped primitive updates                                          |
| **Toolchain**      | Root `eslint`, `typescript`, `prettier`, and plugins                                      | Grouped dev tooling                                                |
| **pnpm**           | Root `packageManager` and Dockerfiles                                                     | Synchronized across root and container runners                     |
| **Turbo**          | Root devDependency and Dockerfiles                                                        | Synchronized across root and container runners                     |

---

## 4. Expo SDK & Mobile Dependency Guardrails

### Why Mobile Packages are Isolated

React Native and Expo runtime modules must strictly match the installed Expo SDK version. Upgrading packages like `react-native`, `react-native-reanimated`, or `expo-router` arbitrarily to uncoordinated `@latest` versions published on npm will break native prebuilds, hermes execution, and development clients.

### Configuration Policies

- **`expo` version bump**: Listed on the Dependency Dashboard and **requires manual approval**.
- **SDK-bound native packages**: Automated uncoordinated updates are **disabled** for:
  - `expo-*` and `@expo/*`
  - `react-native`, `react-native-web`, `react-native-svg`
  - `react-native-reanimated`, `react-native-worklets`
  - `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler`
  - `@react-native-async-storage/async-storage`, `@sentry/react-native`, `eslint-config-expo`
  - React and `@types/react` inside `apps/mobile`

### Upgrading Expo SDK Safely

When ready to upgrade Expo SDK:

```bash
cd apps/mobile

# 1. Update Expo SDK and run auto-fix for all SDK-matched packages
pnpm exec expo install expo@latest
pnpm exec expo install --fix

# 2. Run diagnostics to verify peer dependencies and native sanity
pnpm dlx expo-doctor

# 3. Verify lint and typecheck
pnpm --filter @repo/mobile lint
pnpm --filter @repo/mobile typecheck
```

---

## 5. Dockerfile Toolchain Synchronization

Both `apps/api/Dockerfile` and `apps/web/Dockerfile` pin the `pnpm` version for Corepack and the global `turbo` CLI for standalone pruning:

```dockerfile
# renovate: datasource=npm depName=pnpm
&& corepack prepare pnpm@12.15.0 --activate

# renovate: datasource=npm depName=turbo
RUN pnpm add -g turbo@2.11.7
```

Renovate uses a custom regex manager (`customManagers` in `renovate.json`) to detect these declarations and upgrade them in tandem with `package.json` (`packageManager` and root `turbo`).

---

## 6. Reviewing and Merging Renovate PRs

1. **Verify CI**: Ensure all checks in the GitHub Actions `Validate Codebase` workflow pass.
2. **Review `pnpm-lock.yaml`**: Ensure the diff only affects targeted packages and transitive resolutions.
3. **VPS Auto-Deploy Awareness**: If repository variable `ENABLE_VPS_DEPLOY=true` is enabled, merging dependency changes to `main` will trigger deployment builds if API or web workspaces are affected. Always verify production readiness before merging.
4. **Handling Conflicts**: If a Renovate PR has conflicts or goes stale after other merges, visit the **Dependency Dashboard** issue and check the rebase checkbox for the pull request. Renovate will automatically rebase the branch with a freshly resolved lockfile.

---

## 7. Local Configuration Validation

To validate the `renovate.json` schema and regex managers locally:

```bash
pnpm check:renovate
```

This command runs `renovate-config-validator --strict --no-global` and is executed automatically in CI on every pull request.
