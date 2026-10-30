# Plan: Template Test Coverage Expansion

## Goal and Scope

Protect the template's supported behavior across API, web, mobile, shared packages, tooling, and deployment smoke checks. Passing unit tests or reaching a coverage percentage alone does not establish end-to-end correctness. Exhaustive coverage of every possible input is not a realistic acceptance criterion.

This document records the October 30, 2026 audit and proposes implementation work. Creating this plan does not authorize running migrations against existing databases, provisioning paid services, deploying applications, or changing production data.

## Audit Baseline

- [x] Inspect workspace scripts, test configurations, existing cases, application flows, and CI/deployment configuration.
- [x] Run API tests with text coverage reporting, without Jest cache.
- [x] Run web, mobile, database, core, and utils Vitest suites without cache.
- [x] Run root scanner/script tests.
- [x] Confirm the working tree remained clean after the audit.

| Scope       | Passing test files | Passing tests |
| ----------- | -----------------: | ------------: |
| API         |                 20 |           158 |
| Web unit    |                  8 |            30 |
| Mobile unit |                  6 |            28 |
| Database    |                  3 |            16 |
| Utils       |                  7 |            47 |
| Core        |                  1 |             1 |
| Scripts     |                 10 |            52 |
| Total       |                 55 |           332 |

API coverage: 73.18% statements, 58.60% branches, 74.12% functions, and 73.60% lines. Web, mobile, and shared packages do not yet have comparable configured coverage reports.

Web Playwright contains six spec files and 21 scenarios, configured for desktop Chromium and a Pixel 5 browser viewport. Browser E2E was inspected but not executed during this audit. These projects do not constitute native Android testing.

### Evidence and Gaps

| Priority | Evidence                                                                                                     | Missing protection                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| P0       | `apps/api/test/setup.ts` globally mocks Better Auth and plugins; API has no separate HTTP integration script | Real authentication, routing, DTO validation, middleware, and combined response/error behavior                    |
| P0       | `auth.service.ts` has 0% branch coverage; `auth.controller.ts` and `main.ts` have 0% line coverage           | Auth configuration, HTTP adapter, CORS, versioning, throttling, docs protection, and application startup          |
| P0       | Database repository tests use query doubles, explicitly not PostgreSQL transaction emulation                 | Migration correctness, constraints, locks, rollback, soft-delete visibility, and session revocation               |
| P0       | Account deletion tests cover missing password and an account without credentials                             | Successful password verification, incorrect password rejection, and atomic deletion failure paths                 |
| P0       | No tests for `useAuthSession.ts`; mobile client tests omit refresh concurrency                               | Cold start, hydration, foreground refresh, retry limits, queued requests, and logout/refresh races                |
| P0       | `refreshAuthSession()` falls back to the current token when the response has no session/token                | Establish and test the expected behavior for a `200/null` expired-session response                                |
| P1       | Mobile store logout sends only `Authorization`; its test accepts this shape                                  | Regression coverage and correction for required active-locale forwarding                                          |
| P1       | Web E2E fixtures mock authentication, profile, and sessions                                                  | Client/server contract compatibility and persisted backend results                                                |
| P1       | Web profile E2E opens the modal and changes tabs only                                                        | Profile saves, avatars, password changes, session revocation, and account deletion                                |
| P1       | Auth hook tests mock `useMutation` as direct `mutationFn` execution                                          | Actual React Query lifecycle, callbacks, cache invalidation, and account isolation                                |
| P1       | Mobile Vitest runs in Node with `react-native-web` aliasing                                                  | Native rendering, permissions, storage, navigation, deep links, and platform auth behavior                        |
| P2       | Storage, queue, mail, scripts, and deployment tests are partial or absent                                    | Pagination, provider failures, delivery/retry, environment generation, seed behavior, and packaged runtime assets |
| P2       | CI lacks coverage gates and integration/native jobs; Expo compatibility uses `                               |                                                                                                                   | true` | Enforced behavior matrix and visible compatibility failures |

Assertion weaknesses also need correction: login E2E only checks a dashboard URL while the logged-out session fixture can remain active; password reset conditionally skips filling a required OTP input; pagination unit tests only search rendered markup for any disabled attribute. Translation assertions accepting either language do not prove both locales work.

## Implementation Principles

- Keep fast unit tests; add integration tests instead of replacing repository-boundary mocks with query-chain mocks in API services.
- Use real React Query providers when testing query lifecycle. Mock network/service boundaries, not the behavior under test.
- Use dedicated, disposable test infrastructure and generated credentials. Never reuse development or production databases, buckets, queues, or accounts.
- Give parallel workers isolated data namespaces and deterministic cleanup. Refuse destructive cleanup unless the target is explicitly identified as test infrastructure.
- Keep implementation changes limited to defects exposed by tests and small testability seams. Document any behavior decision before changing it.
- Preserve English/Vietnamese dictionaries and verify active-locale forwarding, including auth and logout requests.
- Test existing template behavior only. Data reset remains a disabled extension point until application-specific cleanup exists.
- Read installed Turborepo documentation before changing task configuration; check installed Next.js and Expo documentation before introducing framework-specific seams or runners.

## Phase 1: Test Harness, Commands, and Measurement

**Priority:** P0. **Files:** root `package.json`, `turbo.json`, workspace `package.json` files, existing Jest/Vitest configurations, `apps/api/test/setup.ts`, `.github/workflows/ci.yml`, and `README.md`.

**Rationale:** Establish trustworthy measurements and prevent suites from being silently omitted or accidentally mocked.

- [x] Define explicit unit, integration, browser E2E, native component, and native smoke commands. Document which commands require infrastructure.
- [x] Keep `pnpm test` scope explicit; add an aggregate verification command that includes root script tests and identifies separately required suites.
- [x] Configure version-compatible coverage providers, include executable files not imported by tests, and document exclusions for generated/type-only code.
- [x] Capture per-workspace baseline coverage and publish machine-readable test/coverage artifacts.
- [x] Introduce non-regression gates before enforcing higher target thresholds.
- [x] Separate API unit mock setup from real Better Auth integration setup.
- [x] Add reusable fixtures, fixed clocks, network stubs, disposable infrastructure setup, readiness checks, and teardown.
- [x] Ensure missing required infrastructure fails integration jobs rather than reporting a misleading pass through skipped tests.

**Acceptance:** CI reports which suites ran; integration tests cannot inherit global auth mocks; uncovered executable files remain visible.

## Phase 2: API, Database, and Authentication Integration

**Priority:** P0. **Files:** new `apps/api/test/integration/*`, API test configuration, existing auth/users specs, new database `*.integration.test.ts` files, dedicated test infrastructure configuration, and a small shared application-setup module extracted from `apps/api/src/main.ts` if needed.

**Rationale:** Protect shared authentication and data integrity before expanding frontend coverage.

- [x] Apply checked-in migrations to an empty disposable PostgreSQL database and verify a second migration run is safe. Generate any necessary schema changes through Drizzle Kit, never handwritten migrations.
- [x] Verify constraints, timestamps, normalized email lookup, active-session expiry, ordering, and actual lock behavior.
- [x] Verify default reads exclude deleted users and explicit `includeDeleted` reads include them.
- [x] Verify deletion revokes sessions and soft-deletes the user atomically; inject a failure to prove rollback.
- [x] Verify restore retains credentials, allows a new login, and does not resurrect revoked sessions or removed avatars.
- [x] Boot HTTP tests with production-equivalent pipes, filters, interceptors, CORS, versioning, and guards. Do not maintain a divergent test-only bootstrap.
- [x] Exercise signup, email verification, cookie/bearer login, logout, and password reset with Better Auth enabled.
- [x] Cover wrong, expired, reused, and over-attempt OTPs, plus resend behavior and session expiry.
- [x] Verify missing authentication, cross-user session revocation, non-admin restore, deleted users, active bans, expired bans, and fresh role resolution.
- [x] Cover credential and OAuth account password setup, incorrect current passwords, password-change revocation, and password-protected account deletion.
- [x] Cover bootstrap tokens, existing users, mixed provider accounts, soft-deleted users, concurrent requests, and partial-write failures. Define expected outcomes before altering bootstrap behavior.
- [x] Exercise DTO unknown fields, invalid inputs, and multipart avatar missing file, invalid contents/type, and the 5 MB boundary.
- [x] Assert response envelopes, public error metadata, secret sanitization, and `vi`/`en` locale resolution through HTTP.
- [x] Test CORS allow/deny/preflight, trusted origins, throttling boundaries, docs/Bull Board authentication, and health dependency failures.

**Acceptance:** Tests fail if authorization, default soft-delete filtering, transaction atomicity, or auth route wiring is broken. No test touches non-test data.

## Phase 3: Mobile Sessions and Frontend Async Behavior

**Priority:** P0 for session lifecycle; P1 for remaining hooks. **Files:** mobile API client/store tests, new tests for `useAuthSession`, `useAuthFlow`, `useProfileForm`, `useProfileDangerZone`, and both apps' query hooks. Change production modules only when regression cases demonstrate a defect.

**Rationale:** Prevent stale sessions, refresh loops, accidental logout, and cross-account cache leaks.

- [ ] Test simultaneous 401 responses, one in-flight refresh, token rotation, queued request settlement, and retry limits.
- [ ] Define and test null-session, missing-token, refresh failure, repeated 401, auth-route exclusion, and offline behavior.
- [ ] Test logout during refresh and ensure late responses cannot restore the previous user's session.
- [ ] Test hydration success/failure, remembered sessions, `rememberMe=false`, cold start, foreground transitions, and listener cleanup.
- [ ] Assert active locale and authorization on all request paths, including store logout and social auth.
- [ ] Test hooks with a real `QueryClientProvider`, isolated query clients, controlled retries, and observable pending/success/error transitions.
- [ ] Verify profile/avatar cache updates, session invalidation, disabled queries, logout/deletion cache clearing, and switching accounts.
- [ ] Cover auth/profile validation, duplicate submission prevention, cancellation, alerts, and mutation failure behavior.

**Acceptance:** Assertions prove final state, lifecycle transitions, cache contents, and request ownership, not merely function delegation.

## Phase 4: Complete Web Journeys and Real-Backend E2E

**Priority:** P1. **Files:** `apps/web/e2e/*`, fixtures, `playwright.config.ts`, new tests for `proxy.ts`, profile/auth components, and query hooks.

**Rationale:** Retain fast mocked UI tests while exposing real client/server contract regressions.

- [ ] Make mocked sign-in/verification transition session state consistently; require authenticated dashboard content after navigation and reload.
- [ ] Replace conditional required-field interactions and broad success assertions with explicit preconditions and outcomes.
- [ ] Cover profile save, avatar crop/upload, password setup/change, single/other-session revocation, logout, and account deactivation.
- [ ] Cover OTP/reset failures, expiration, resend cooldown, loading, empty/error states, and repeat submissions.
- [ ] Exercise search debounce, page navigation, page-size changes, and empty/out-of-range results after revocation.
- [ ] Run critical scenarios with explicit `vi` and `en` settings and assert locale-specific messages and request headers.
- [ ] Verify expired/invalid cookies, protected-route redirects, redirect destination handling, keyboard navigation, and dialog focus behavior.
- [ ] Add isolated real-backend journeys using API, PostgreSQL, and Mailpit: signup/OTP/login, profile persistence, password reset, revocation, and logout.
- [ ] Confirm successful operations persist after reload and invalidated credentials/sessions stop working.

**Acceptance:** Real-backend scenarios do not intercept business endpoints; mocked scenarios remain identified as UI tests rather than full-stack proof.

## Phase 5: Native Component Coverage and Device Smoke Tests

**Priority:** P1. **Files:** mobile test/package configuration, new screen/component tests, native smoke flows, `apps/mobile/app.config.ts` tests, and dedicated CI workflows.

**Rationale:** Node and responsive browser tests cannot validate native modules, platform permissions, or device lifecycle.

- [ ] Select and validate component-test tooling against installed Expo/React Native/React versions; preserve useful pure Vitest suites.
- [ ] Test auth/OTP/profile screens, navigation boundaries, keyboard interactions, and modal behavior.
- [ ] Cover image permission denial, picker cancellation, missing assets, multipart uploads, and upload failure.
- [ ] Cover Apple cancellation/missing identity token/provider errors and Google callback failure behavior.
- [ ] Test development/preview/production app identifiers and schemes, including environment precedence.
- [ ] Add Android/iOS bundle checks and native smoke flows for launch, login, restart, profile, and logout.
- [ ] Verify OAuth callbacks in development builds. Keep external-provider credential-dependent verification in a separately documented release suite.
- [ ] Run component tests on PRs; schedule native smoke tests and require release verification. Choose local or remote runners explicitly; paid cloud execution requires approval.

**Acceptance:** Native verification produces device/runtime evidence and failure logs/screenshots. Unsupported provider automation has a documented manual release check, not a silent skip.

## Phase 6: Infrastructure, Tooling, and Final CI Gates

**Priority:** P2. **Files:** Storage/Mail/Redis/Health tests, `scripts/tests/*`, seed and migration-runner tests, shared-package tests, Docker smoke configuration, CI workflows, and verification documentation.

**Rationale:** Verify the fresh-clone-to-runtime experience and supporting services, not only application units.

- [ ] Cover storage download streams, empty bodies, prefix pagination, missing keys, sanitization, provider errors, and partial deletion failures.
- [ ] Exercise BullMQ enqueue/worker/retry/fallback against disposable Redis and verify delivered SMTP templates in both locales.
- [ ] Test `scripts/sync-env.mjs` precedence, quoted values, missing inputs, environment selection, public-variable mapping, and secret isolation using temporary fixture directories.
- [ ] Test admin seed reruns, existing provider accounts, input errors, failures, and successful credential login after seeding.
- [ ] Smoke-test Docker runtime migration access, i18n files, mail templates, and API/web health without deployment.
- [ ] Add shared utility boundaries for dates/timezones, pagination, empty/malformed responses, and error envelopes; retain focused Core tests appropriate to its current small scope.
- [ ] Add compile-time contract assertions for `packages/types` and integration checks for actual JSON contracts; do not manufacture runtime tests for erased interfaces.
- [ ] Replace best-effort Expo compatibility checks with an enforced policy and documented, scoped exceptions.
- [ ] Split fast PR gates from slower integration/native jobs; ensure all required jobs gate merging and retain failure artifacts.

**Acceptance:** A fresh isolated environment can migrate, boot, and complete critical flows; required failures fail CI and publish useful diagnostics.

## Completion Criteria and Rollout

- [ ] Maintain a behavior matrix mapping each critical feature to happy path, validation failure, authorization failure, dependency failure, and its owning suite where applicable.
- [ ] Reach at least 80% branch coverage for executable business logic and 90% for auth/session/soft-delete logic after validating baseline instrumentation and exclusions. These are targets, not current results.
- [ ] Require real integration proof for auth, session ownership/revocation, soft delete, restore, and rollback, regardless of coverage percentage.
- [ ] Require both locale variants and account-isolation checks for critical client flows.
- [ ] Keep generated/type-only exclusions explicit; never exclude important executable code to satisfy thresholds.
- [ ] Verify affected code with formatting checks, tests, typecheck (`tsc --noEmit` where applicable), lint, and relevant runtime suites before committing each implementation phase.
- [ ] Update this checklist with actual commands, results, remaining limitations, and accepted exceptions as work progresses.

Recommended delivery order: Phase 1, Phase 2, the session portion of Phase 3, remaining Phase 3, Phase 4, Phase 5, then Phase 6. Keep phases in reviewable changes; reassess coverage targets after trustworthy instrumentation rather than claiming exhaustive coverage.
