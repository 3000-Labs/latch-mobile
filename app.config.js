import env from './env';
import packageJson from './package.json';

const epochTimeInSeconds = Math.round(Date.now() / 1000);
const versionCode = epochTimeInSeconds;
const buildNumber = String(epochTimeInSeconds);
const buildVersion = packageJson.version;
const appName = env.APP_NAME;

export default {
  expo: {
    owner: 'frankiepower',
    name: 'latch-mobile',
    slug: 'latch-mobile',
    version: buildVersion,
    orientation: 'portrait',
    icon: appName === 'Latch' ? './assets/images/icon.png' : './assets/images/iconStaging.png',
    scheme: 'latch',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: appName === 'Latch' ? 'co.getlatch.latchapp' : 'qa.getlatch.app',
      buildNumber,
      infoPlist: {
        NSFaceIDUsageDescription: 'Allow $(PRODUCT_NAME) to use FaceID for secure access.',
      },
    },
    android: {
      versionCode,
      package: appName === 'Latch' ? 'app.getlatch.app' : 'qa.getlatch.app',
      adaptiveIcon: {
        backgroundColor: '#000',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
        'android.permission.CAMERA',
      ],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon-light.png',
          imageWidth: 159.5,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            image: './assets/images/splash-icon-dark.png',
            backgroundColor: '#000000',
          },
        },
      ],
      [
        'expo-font',
        {
          fonts: [
            './assets/fonts/SFPRO-Thin.ttf',
            './assets/fonts/SFPRO-Regular.ttf',
            './assets/fonts/SFPRO-Medium.ttf',
            './assets/fonts/SFPRO-bold.ttf',
            './assets/fonts/SFPRO-Semibolditalic.otf',
          ],
        },
      ],
      [
        '@hot-updater/react-native',
        {
          channel: env.EXPO_PUBLIC_APP_ENV,
        },
      ],
      // ['react-native-quick-crypto', { sodiumEnabled: true }], // Optional configuration
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: '8b122713-0d94-4940-a71c-58da86f923ad',
      },
    },
  },
};
