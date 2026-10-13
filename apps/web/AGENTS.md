# Web Application Guidelines (`apps/web`)

Next.js 16 Web Application (App Router, React 19, Tailwind CSS) in the Turborepo monorepo template.

## Package Manager & Commands

Always use **pnpm**. Never use npm/yarn.

```bash
# From monorepo root
pnpm dev:web         # Start Next.js dev server (default port 3000)
pnpm build:web       # Production build
pnpm start:web       # Start production server
pnpm lint:web        # Lint code
pnpm typecheck:web   # Typecheck (tsc --noEmit)

# Inside apps/web
pnpm dev
pnpm build
pnpm typecheck
```

## Architecture & Conventions

- **Routing**: Next.js App Router inside `src/app/` (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`).
- **Component Pattern**: Default to React Server Components (RSC). Only add `'use client'` when state (`useState`), effects (`useEffect`), or browser APIs are required.
- **Component Decomposition**:
  - Keep components modular, granular, and under 200-300 lines.
  - Break complex pages into self-contained sub-components in `src/components/`.
  - Isolate API calling logic into typed modules (`src/lib/api.ts`).
- **UI Components (shadcn/ui First)**:
  - ALWAYS use standard shadcn/ui components from `@/components/ui/*`.
  - NEVER hand-code raw, unstyled HTML elements when corresponding shadcn components exist.
- **Styling**: Tailwind CSS with utility-first classes and `cn()` (`clsx` + `tailwind-merge`).
- **Internationalization (i18n)**:
  - Every UI component rendering text must use `useTranslations()` from `next-intl`.
  - When adding keys, update both `messages/en.json` and `messages/vi.json`.
- **API Requests & Locale Forwarding**:
  - All API calls in `src/lib/api.ts` must forward user active locale via header (`x-lang` / `Accept-Language`).
- **Auth Client**: Better Auth client initialized in `src/lib/auth-client.ts`.
- **Shared Packages**:
  - `@repo/core`: Pure domain business logic.
  - `@repo/types`: Shared interfaces and domain models.
  - `@repo/utils`: Date, asset, locale, and API helpers.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
