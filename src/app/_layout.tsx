/**
 * Root Layout
 */

import "../global.css";

import React, { useEffect } from "react";
import { Platform, AppState } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as MediaLibrary from "expo-media-library";
import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { doc, updateDoc, serverTimestamp, getFirestore } from "@react-native-firebase/firestore";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { AlertProvider } from "@/components/ui/AppAlert";
import { usePresence } from "@/lib/presence";
import {
  scheduleEngagementNotifications,
  cancelEngagementNotifications,
} from "@/lib/scheduleEngagementNotifications";

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const isActive = AppState.currentState === "active";
    return {
      shouldShowBanner: !isActive,
      shouldShowList: true,
      shouldPlaySound: !isActive,
      shouldSetBadge: true,
    };
  },
});

SplashScreen.preventAutoHideAsync();

async function requestAllPermissions() {
  const { status: notifStatus } = await Notifications.getPermissionsAsync();
  if (notifStatus !== "granted") {
    await Notifications.requestPermissionsAsync();
  }

  const { status: mediaStatus } = await MediaLibrary.getPermissionsAsync();
  if (mediaStatus !== "granted") {
    await MediaLibrary.requestPermissionsAsync();
  }

  const { status: pickerStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (pickerStatus !== "granted") {
    await ImagePicker.requestMediaLibraryPermissionsAsync();
  }

  const { status: cameraStatus } = await ImagePicker.getCameraPermissionsAsync();
  if (cameraStatus !== "granted") {
    await ImagePicker.requestCameraPermissionsAsync();
  }
}

function RootLayoutNav() {
  const { isAuthenticated, userData, isLoading, user } = useAuth();
  const { isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  usePresence(user?.uid);

  // ─── Auth navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isVerificationScreen =
      segments[0] === "(auth)" && segments[1] === "verification";
    const hasProfile = isAuthenticated && userData !== null;
    const needsVerification =
      hasProfile &&
      userData?.verified === false &&
      userData?.verificationStatus !== "pending" &&
      userData?.verificationStatus !== "approved";

    if (!hasProfile && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (hasProfile) {
      if (needsVerification && !isVerificationScreen) {
        router.replace("/(auth)/verification");
      } else if (!needsVerification && inAuthGroup && !isVerificationScreen) {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, userData, isLoading, segments]);

  // ─── Notification channels + tap-to-navigate ──────────────────────────────
  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#14B8A6",
      });
      Notifications.setNotificationChannelAsync("engagement", {
        name: "Campus Updates",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150],
        lightColor: "#F59E0B",
      });
    }

    const tapSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const link = response.notification.request.content.data?.link as
          | string
          | undefined;
        if (link) router.push(link as any);
      }
    );

    return () => tapSub.remove();
  }, []);

  // ─── Setup on login ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !userData || !user) {
      cancelEngagementNotifications();
      return;
    }

    const userName: string = userData?.name || userData?.username || "";

    async function setup() {
      await requestAllPermissions();

      if (Device.isDevice) {
        try {
          const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ??
            Constants.easConfig?.projectId;
          if (projectId && user) {
            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            const db = getFirestore();
            await updateDoc(doc(db, "users", user.uid), {
              pushToken: tokenData.data,
              lastSeen: serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn("Push token registration failed:", err);
        }
      }

      await scheduleEngagementNotifications(userName);
    }

    setup();
  }, [isAuthenticated, userData, user]);


  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryProvider>
      <ThemeProvider>
        <AlertProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </AlertProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}