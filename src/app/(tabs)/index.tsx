/**
 * Feed Screen — Stub
 *
 * Phase 3 will implement the full feed.
 * This stub verifies tabs routing and NativeWind styling work.
 */

import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui";

export default function FeedScreen() {
  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="px-4 pt-4">
        <Text variant="h2">Feed</Text>
        <Text variant="bodySmall" className="mt-1">
          Your personalized feed will appear here.
        </Text>
      </View>

      {/* Content area — will be replaced with FlatList in Phase 3 */}
      <View className="flex-1 items-center justify-center">
        <Text variant="caption">Feed implementation — Phase 3</Text>
      </View>
    </SafeAreaView>
  );
}
