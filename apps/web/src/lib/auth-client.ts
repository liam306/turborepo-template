import { createAuthClient } from 'better-auth/react';
import { inferAdditionalFields } from 'better-auth/client/plugins';

function getClientLocale(): string {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
    if (match?.[1]) return match[1];
  }
  return 'en';
}

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  basePath: '/auth',
  fetchOptions: {
    onRequest(context) {
      const locale = getClientLocale();
      if (
        context.headers &&
        typeof (context.headers as any).set === 'function'
      ) {
        (context.headers as Headers).set('x-lang', locale);
        (context.headers as Headers).set('Accept-Language', locale);
      }
    },
  },
  plugins: [
    inferAdditionalFields<{
      user: {
        role: {
          type: 'string';
        };
        theme: {
          type: 'string';
        };
        locale: {
          type: 'string';
        };
      };
    }>(),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
