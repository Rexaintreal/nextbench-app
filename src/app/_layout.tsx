/**
 * Root Layout
 *
 * This is the entry point for the entire app.
 * It wraps everything in providers and handles auth-based routing.
 *
 * Provider composition order (outermost first):
 * 1. QueryProvider — server state must be available everywhere
 * 2. AuthProvider — auth state depends on Firebase (which uses Query patterns)
 * 3. ThemeProvider — theming wraps navigation
 * 4. Navigation (Slot/Stack) — renders the current route
 */

import "../global.css";

import React, { useEffect } from "react";
import { useColorScheme } from "react-native";
import { Slot, useRouter, useSegments, ThemeProvider, DarkTheme, DefaultTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";

// Keep splash screen visible until fonts are loaded
SplashScreen.preventAutoHideAsync();

/**
 * Inner layout that handles auth-based routing.
 * Must be inside AuthProvider to access useAuth().
 */
function RootLayoutNav() {
  const { isAuthenticated, userData, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  // Handle auth-based navigation
  useEffect(() => {
    if (isLoading) return; // Wait for auth to initialize

    const inAuthGroup = segments[0] === "(auth)";
    const hasProfile = isAuthenticated && userData !== null;

    if (!hasProfile && !inAuthGroup) {
      // User is not signed in or missing profile → redirect to login
      router.replace("/(auth)/login");
    } else if (hasProfile && inAuthGroup) {
      // User is signed in and has profile but on auth screen → redirect to home
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, userData, isLoading, segments]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Slot />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

/**
 * Root Layout — entry point.
 * Loads fonts, sets up providers, renders navigation.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Hide splash screen when fonts are ready
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render until fonts are loaded
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
