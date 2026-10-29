# Mobile Application Guidelines (`apps/mobile`)

Expo SDK 57 / React Native mobile application within the Turborepo monorepo template.

## Package Manager & Commands

Always use **pnpm**. Never use npm/yarn.

```bash
# From monorepo root
pnpm dev:mobile                   # Start Expo dev client
pnpm dev:mobile:android           # Run on Android emulator / device
pnpm dev:mobile:ios               # Run on iOS simulator
pnpm dev:mobile:web               # Run mobile on web

# Quality checks
pnpm lint:mobile                  # Run expo lint
pnpm typecheck:mobile             # Run tsc --noEmit
```

## Architecture & Conventions

- **Navigation**: Expo Router inside `src/app/`.
- **Component Decomposition**:
  - Modular sub-components under `src/components/`.
  - Screens in `src/app/` stay thin.
  - Network logic in `src/services/`.
- **State Management & Storage**:
  - Server state and API mutations must go through React Query hooks (`src/hooks/queries/`). Never manage API loading, error, or success states with `useState`.
  - Client state and persistence stay in Zustand stores (`src/stores/`). Never call `AsyncStorage` directly inside UI components.
- **Internationalization (i18n)**:
  - `useTranslation()` from `react-i18next`. Update `src/locales/en.json` and `src/locales/vi.json`.
  - API requests must include `x-lang: <locale>` header.
- **Styling**: NativeWind 4 + `cn()` utility.
- **Shared Packages**:
  - `@repo/core`: Business logic algorithms.
  - `@repo/types`: Shared domain interfaces and DTOs.
  - `@repo/utils`: Shared formatting helpers.
