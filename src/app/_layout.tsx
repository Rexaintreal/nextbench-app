/**
 * Root Layout
 *
 * Provider composition order (outermost first):
 * 1. QueryProvider — server state available everywhere
 * 2. AuthProvider  — auth state
 * 3. Navigation    — renders the current route
 *
 * Dark mode is handled automatically by NativeWind via darkMode: "media"
 * in tailwind.config.js — no wrapper View or ThemeProvider needed.
 */

import "../global.css";

import React, { useEffect } from "react";
import { useColorScheme } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import firestore from "@react-native-firebase/firestore";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, userData, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme(); // used only for StatusBar style

  // Auth-based navigation
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

  // Push notification registration
  useEffect(() => {
    if (!isAuthenticated || !userData || !user) return;

    async function registerForPushNotifications() {
      if (!Device.isDevice) return;

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") return;

      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        if (!projectId || !user) return;
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        await firestore().collection("users").doc(user.uid).update({
          pushToken: tokenData.data,
        });
      } catch (err) {
        console.warn("Failed to get push token:", err);
      }
    }

    registerForPushNotifications();
  }, [isAuthenticated, userData, user]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {/*
        StatusBar style:
        - dark mode  → text/icons should be light → style="light"
        - light mode → text/icons should be dark  → style="dark"
      */}
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
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
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </QueryProvider>
  );
}