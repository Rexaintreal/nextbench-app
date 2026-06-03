/**
 * Login Screen — Stub
 *
 * Phase 2 will implement the full login UI.
 * This stub ensures routing works during Phase 1 setup.
 */

import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

export default function LoginScreen() {
  const { signIn } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="flex-1 items-center justify-center px-6">
        {/* Logo area */}
        <View className="mb-8 items-center">
          <Text variant="h1" className="text-brand-500">
            NextBench
          </Text>
          <Text variant="bodySmall" className="mt-2 text-center">
            Your trusted student community
          </Text>
        </View>

        {/* Placeholder — will be replaced in Phase 2 */}
        <View className="w-full gap-4">
          <Text variant="caption" className="text-center">
            Authentication UI will be implemented in Phase 2.
          </Text>
          <Text variant="caption" className="text-center">
            For now, the app routes and providers are working correctly.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
