import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "NextBench",
  slug: "nextbench",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "nextbench",
  userInterfaceStyle: "automatic",

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
      backgroundColor: "#1C1C1E",
    },
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    package: "in.nextbench.app",
    versionCode: 1,
    softwareKeyboardLayoutMode: "resize",
  },

  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "@react-native-google-signin/google-signin",
    [
      "expo-notifications",
      {
        icon: "./assets/images/notification-icon.png",
        color: "#14B8A6",
        androidMode: "default",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 35,
          minSdkVersion: 24,
        },
      },
    ],
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#1C1C1E",
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    eas: {
      projectId: "3c26faa6-d133-48db-bda6-91772cb3f9c6",
    },
  },
});
