/**
 * Notifications Screen — Stub
 */

import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui";

export default function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="flex-1 items-center justify-center">
        <Text variant="h3">Notifications</Text>
        <Text variant="caption" className="mt-2">
          Coming in Phase 6
        </Text>
      </View>
    </SafeAreaView>
  );
}
