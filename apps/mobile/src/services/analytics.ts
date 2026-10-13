import { PostHog } from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export type PostHogCaptureProps = Parameters<PostHog['capture']>[1];
export type PostHogScreenProps = Parameters<PostHog['screen']>[1];
export type PostHogIdentifyTraits = Parameters<PostHog['identify']>[1];

export const posthog: PostHog | null = apiKey
  ? new PostHog(apiKey, {
      host,
      captureAppLifecycleEvents: true,
    })
  : null;

export const trackEvent = (
  eventName: string,
  properties?: PostHogCaptureProps,
) => {
  posthog?.capture(eventName, properties);
};

export const trackScreen = (
  screenName: string,
  properties?: PostHogScreenProps,
) => {
  posthog?.screen(screenName, properties);
};

export const identifyUser = (
  userId: string,
  traits?: PostHogIdentifyTraits,
) => {
  posthog?.identify(userId, traits);
};

export const resetUser = () => {
  posthog?.reset();
};
