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

  return {
    ...config,
    name,
    scheme,
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
