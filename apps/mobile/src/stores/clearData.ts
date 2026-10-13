import { useUserStore } from './useUserStore';
import { clearSocialAuthSession } from '@/services/social-auth.service';

export async function clearAllLocalUserData(): Promise<void> {
  // TODO(template): Clear any custom offline SQLite/WatermelonDB/AsyncStorage storage or caches here.
  await Promise.resolve();
}

export async function clearEntireLocalApp(): Promise<void> {
  await clearAllLocalUserData();
  await clearSocialAuthSession().catch(() => {
    // Offline logout must still clear the local bearer session.
  });
  useUserStore.getState().logout();
}
