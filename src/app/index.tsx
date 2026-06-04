/**
 * App Entry Point
 *
 * Redirects to the appropriate route group based on auth state.
 * The actual redirect logic is in _layout.tsx — this just renders
 * a loading state while the redirect happens.
 */

import { useAuth } from "@/providers/AuthProvider";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading while auth initializes
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#0c8eeb" />
      </View>
    );
  }

  // Redirect based on auth state
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
