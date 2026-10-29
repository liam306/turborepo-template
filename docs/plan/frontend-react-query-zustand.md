# Plan: Frontend React Query & Zustand Standardization

## Overview

Chuẩn hóa toàn bộ frontend (`apps/web` và `apps/mobile`) sang React Query cho server/async state và Zustand (`persist`) cho client persistent state. Loại bỏ hoàn toàn việc dùng `useState` lưu async state (loading, error, success) và `localStorage` thủ công.

---

## Seams Under Test (TDD)

1. **Seam 1: `apps/web/src/stores/useSidebarStore`**
   - Interface: `toggleCollapsed()`, `setCollapsed(val)`.
   - Bắt được: State update, logic persist vào storage.
   - Bỏ qua: DOM layout và CSS animation.
2. **Seam 2: `apps/web/src/hooks/queries/useAuthQuery`**
   - Interface: `useSignInEmail`, `useSignUpEmail`, `useSignOut`.
   - Bắt được: Mutation lifecycle (isPending, isError, onSuccess) và payload truyền tới auth client.
   - Bỏ qua: Network transport thật và cookie browser.
3. **Seam 3: `apps/mobile/src/hooks/queries/useAuthQuery`**
   - Interface: `useSignInGoogle`.
   - Bắt được: Mutation lifecycle và gọi service `signInGoogle`.
   - Bỏ qua: Hộp thoại OAuth thật của hệ điều hành di động.

---

## Implementation Checklist

### Phase 1: Zustand & Client Storage Setup (`apps/web`)

- [x] Cài đặt `zustand` trong `apps/web/package.json`
- [x] Viết failing test cho `useSidebarStore` (Red)
- [x] Tạo `apps/web/src/stores/useSidebarStore.ts` (Green)
- [x] Tạo `apps/web/src/stores/useThemeStore.ts` (persist theme, sync cookie `THEME_COOKIE_NAME`)
- [x] Cập nhật `apps/web/src/components/dashboard/Sidebar.tsx` dùng `useSidebarStore`
- [x] Cập nhật `apps/web/src/context/ThemeContext.tsx` dùng `useThemeStore`

### Phase 2: Web Auth Query Hooks (TDD)

- [x] Viết failing test cho các mutation mới trong `useAuthQuery` (Red)
- [x] Bổ sung `useSignInEmail`, `useSignUpEmail`, `useSignInSocial`, `useSignOut` vào `apps/web/src/hooks/queries/useAuthQuery.ts` (Green)

### Phase 3: Web Component Refactoring (React Query)

- [x] Refactor `apps/web/src/app/login/page.tsx`: Xóa `useState` loading/error/success, dùng auth mutations
- [x] Refactor `apps/web/src/app/forgot-password/page.tsx`: Xóa `useState` error/success, dùng mutation states
- [x] Refactor `apps/web/src/app/verify-email/page.tsx`: Xóa `useState(status)`, dùng mutation states
- [x] Refactor `apps/web/src/components/auth/VerifyOtpDialog.tsx`: Xóa `useState(errorMsg)`, dùng mutation state
- [x] Refactor `apps/web/src/components/ProfileModal.tsx`: Xóa `useState` error/success, dùng `useSignOut`
- [x] Refactor `apps/web/src/components/dashboard/SidebarUserMenu.tsx`: Dùng `useSignOut`
- [x] Refactor `apps/web/src/hooks/useChangeLanguage.ts`: Dùng `useUpdateProfile` mutation

### Phase 4: Mobile Standardizations (TDD & React Query)

- [x] Viết failing test cho `useSignInGoogle` trong `apps/mobile` (Red)
- [x] Cập nhật `apps/mobile/src/hooks/queries/useAuthQuery.ts` thêm `useSignInGoogle` (Green)
- [x] Refactor `apps/mobile/src/components/auth/SocialAuthButtons.tsx`: Dùng `useSignInGoogle`, xóa `useState(loadingGoogle)`
- [x] Refactor `apps/mobile/src/components/profile/ProfilePreferencesCard.tsx`: Dùng `useUpdateProfile` mutation
- [x] Refactor `apps/mobile/src/hooks/useProfileDangerZone.ts`: Dùng `useSignOut`
- [x] Refactor `apps/mobile/src/app/(tabs)/index.tsx`: Đồng bộ `useUserProfile`

### Phase 5: Verification & Quality Checks

- [x] `pnpm --filter @repo/web test`
- [x] `pnpm --filter @repo/mobile test`
- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm format`
