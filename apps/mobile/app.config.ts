import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const profile =
    process.env.APP_ENV || process.env.EAS_BUILD_PROFILE || 'development';

  const isProd = profile === 'production';
  const isPreview = profile === 'preview';

  let name = 'Starter';
  let bundleIdentifier = 'com.starter.app';
  let packageName = 'com.starter.app';
  let scheme = 'starter';

  if (isPreview) {
    name = 'Starter (Preview)';
    bundleIdentifier = 'com.starter.app.preview';
    packageName = 'com.starter.app.preview';
    scheme = 'starter-preview';
  } else if (!isProd) {
    name = 'Starter (Dev)';
    bundleIdentifier = 'com.starter.app.dev';
    packageName = 'com.starter.app.dev';
    scheme = 'starter-dev';
  }

  const sentryOrg = process.env.SENTRY_ORG;
  const sentryProject =
    process.env.SENTRY_PROJECT || process.env.SENTRY_PROJECT_MOBILE;
  const sentryUrl = process.env.SENTRY_URL || 'https://sentry.io/';

  let plugins = config.plugins ? [...config.plugins] : [];

  if (sentryOrg && sentryProject) {
    const sentryPluginConfig: [string, Record<string, string>] = [
      '@sentry/react-native/expo',
      {
        organization: sentryOrg,
        project: sentryProject,
        url: sentryUrl,
      },
    ];
    const hasSentryPlugin = plugins.some(
      (p) =>
        p === '@sentry/react-native/expo' ||
        (Array.isArray(p) && p[0] === '@sentry/react-native/expo'),
    );
    if (hasSentryPlugin) {
      plugins = plugins.map((p) =>
        p === '@sentry/react-native/expo' ||
        (Array.isArray(p) && p[0] === '@sentry/react-native/expo')
          ? sentryPluginConfig
          : p,
      );
    } else {
      plugins.push(sentryPluginConfig);
    }
  } else {
    plugins = plugins.filter(
      (p) =>
        !(
          p === '@sentry/react-native/expo' ||
          (Array.isArray(p) && p[0] === '@sentry/react-native/expo')
        ),
    );
  }

  return {
    ...config,
    name,
    scheme,
    plugins,
    ios: {
      ...config.ios,
      bundleIdentifier,
    },
    android: {
      ...config.android,
      package: packageName,
    },
  } as ExpoConfig;
};
