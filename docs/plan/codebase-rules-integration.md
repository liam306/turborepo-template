# Plan: Codebase Rules & i18n AST Audit Integration

Plan to port modular AST architecture checking and inter-file translation analysis from `mymate` to `turborepo-template`, adapting scope to `@repo/*` and keeping strictly template-relevant rules.

---

## Phase 1: Codebase Rules Modular Architecture & TDD Slices

- [x] **Phase 1.1**: Core helpers (`project.mjs`, `files.mjs`, `policy.mjs`)
- [x] **Phase 1.2**: Import boundaries (`imports.mjs`, `import-boundaries.mjs`) + TDD test `codebase-import-boundaries.test.mjs`
- [x] **Phase 1.3**: DTO ownership (`dto-ownership.mjs`) + TDD test `codebase-dto-ownership.test.mjs`
- [x] **Phase 1.4**: Conditional styling (`conditional-styling.mjs`) + TDD test `codebase-conditional-styling.test.mjs`
- [x] **Phase 1.5**: Prohibited hard deletes (`hard-deletes.mjs`) + TDD test `codebase-hard-deletes.test.mjs`
- [x] **Phase 1.6**: File size guidelines (`file-size.mjs`) + TDD test `codebase-file-size.test.mjs`
- [x] **Phase 1.7**: Runner index & CLI (`index.mjs`, `check-codebase-rules.mjs`) + TDD test `codebase-rules-cli.test.mjs`
- [x] **Phase 1.8**: Phase 1 verification and git commit

---

## Phase 2: Inter-File Translation Analysis

- [x] **Phase 2.1**: Write failing test `scripts/tests/translation-project.test.mjs` (Red)
- [x] **Phase 2.2**: Implement `scripts/lib/translation-project.mjs` (Green)
- [x] **Phase 2.3**: Integrate `analyzeProjectTranslations` into `scripts/check-i18n.mjs`
- [x] **Phase 2.4**: Phase 2 verification and git commit

---

## Phase 3: Tooling & Script Verification Configuration

- [ ] **Phase 3.1**: Update `typecheck:scripts` in `package.json`
- [ ] **Phase 3.2**: Run script typecheck & lint verification
- [ ] **Phase 3.3**: Phase 3 verification and git commit

---

## Phase 4: Full System Verification

- [ ] **Phase 4.1**: Run `pnpm test:scripts`
- [ ] **Phase 4.2**: Run `pnpm check:rules` and `pnpm check:i18n`
- [ ] **Phase 4.3**: Run root `pnpm lint`, `pnpm typecheck`, `pnpm format:check`
- [ ] **Phase 4.4**: Final documentation update & completion
