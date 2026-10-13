import posthog from 'posthog-js';

export const isPostHogConfigured = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)
  );
};

export const captureEvent = (
  eventName: string,
  properties?: Record<string, unknown>,
) => {
  if (isPostHogConfigured()) {
    posthog.capture(eventName, properties);
  }
};

export const identifyUser = (
  userId: string,
  traits?: Record<string, unknown>,
) => {
  if (isPostHogConfigured()) {
    posthog.identify(userId, traits);
  }
};

export const resetUser = () => {
  if (isPostHogConfigured()) {
    posthog.reset();
  }
};
