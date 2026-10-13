import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useUserStore } from '@/stores/useUserStore';
import { refreshAuthSession } from '@/services/apiClient';
import { identifyUser, resetUser } from '@/services/analytics';

/**
 * Manages mobile auth session lifecycle, sliding window token refresh,
 * and session clearance when "rememberMe" is disabled.
 */
export function useAuthSession() {
  const isHydrated = useUserStore((state) => state.isHydrated);
  const token = useUserStore((state) => state.token);
  const rememberMe = useUserStore((state) => state.rememberMe);
  const logout = useUserStore((state) => state.logout);
  const profile = useUserStore((state) => state.profile);
  const appState = useRef(AppState.currentState);
  const previousUserIdRef = useRef<string | null>(null);

  // Sync user state with PostHog analytics
  useEffect(() => {
    if (!isHydrated) return;

    if (profile?.id) {
      if (previousUserIdRef.current !== profile.id) {
        previousUserIdRef.current = profile.id;
        identifyUser(profile.id, {
          email: profile.email,
          name: profile.name,
          role: profile.role,
        });
      }
    } else if (previousUserIdRef.current) {
      previousUserIdRef.current = null;
      resetUser();
    }
  }, [isHydrated, profile?.id, profile?.email, profile?.name, profile?.role]);

  // Proactive refresh on startup when hydrated
  useEffect(() => {
    if (!isHydrated) return;

    if (token) {
      if (rememberMe) {
        refreshAuthSession().catch(() => {
          // Handled inside refreshAuthSession (calls logout on failure)
        });
      } else {
        // Cold start without rememberMe -> clear auth
        logout();
      }
    }
  }, [isHydrated, token, rememberMe, logout]);

  // Refresh or invalidate on app state change (background -> foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        const wasBackground =
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active';

        if (wasBackground) {
          const currentToken = useUserStore.getState().token;
          const currentRememberMe = useUserStore.getState().rememberMe;

          if (currentToken) {
            if (currentRememberMe) {
              refreshAuthSession().catch(() => {});
            } else {
              useUserStore.getState().logout();
            }
          }
        }

        appState.current = nextAppState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
}
