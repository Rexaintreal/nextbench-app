/**
 * Profile Screen — Stub
 */

import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Button } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="flex-1 items-center justify-center px-6">
        <Text variant="h3">Profile</Text>
        <Text variant="bodySmall" className="mt-2">
          {user?.email ?? "Not signed in"}
        </Text>
        <View className="mt-6 w-full">
          <Button variant="outline" onPress={signOut} fullWidth>
            Sign Out
          </Button>
        </View>
        <Text variant="caption" className="mt-4">
          Full profile — Phase 5
        </Text>
      </View>
    </SafeAreaView>
  );
}
