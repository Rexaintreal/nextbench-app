/**
 * Skeleton Loading Cards
 *
 * Animated shimmer placeholder cards for the feed.
 * Uses react-native-reanimated for smooth pulsing animation.
 */

import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

function SkeletonBlock({ className = "" }: { className?: string }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={animStyle}
      className={`bg-skeleton-from rounded-lg ${className}`}
    />
  );
}

export function SkeletonPostCard() {
  return (
    <View className="py-6 px-5 border-b border-content-secondary/10">
      {/* Title skeleton */}
      <SkeletonBlock className="h-5 w-3/4 mb-4" />

      {/* Author row skeleton */}
      <View className="flex-row items-center mb-4">
        <SkeletonBlock className="w-10 h-10 rounded-full mr-3" />
        <View className="flex-1">
          <SkeletonBlock className="h-3.5 w-1/3 mb-2" />
          <SkeletonBlock className="h-3 w-1/2" />
        </View>
        <SkeletonBlock className="h-6 w-16 rounded" />
      </View>

      {/* Content lines skeleton */}
      <SkeletonBlock className="h-3.5 w-full mb-2.5" />
      <SkeletonBlock className="h-3.5 w-full mb-2.5" />
      <SkeletonBlock className="h-3.5 w-5/6 mb-2.5" />
      <SkeletonBlock className="h-3.5 w-2/3 mb-5" />

      {/* Action bar skeleton */}
      <View className="flex-row items-center gap-6 pt-2">
        <SkeletonBlock className="h-5 w-12" />
        <SkeletonBlock className="h-5 w-12" />
        <SkeletonBlock className="h-5 w-8" />
      </View>
    </View>
  );
}

export function SkeletonProductCard() {
  return (
    <View className="py-6 px-5 border-b border-content-secondary/10">
      {/* Header row */}
      <View className="flex-row items-center mb-4">
        <SkeletonBlock className="w-9 h-9 rounded-full mr-3" />
        <View className="flex-1">
          <SkeletonBlock className="h-3.5 w-1/4 mb-2" />
          <SkeletonBlock className="h-3 w-1/3" />
        </View>
        <SkeletonBlock className="h-6 w-14" />
      </View>

      {/* Title */}
      <SkeletonBlock className="h-4 w-2/3 mb-4" />

      {/* Image */}
      <SkeletonBlock className="w-full aspect-[4/3] rounded-2xl mb-4" />

      {/* Footer */}
      <View className="flex-row items-center justify-between">
        <SkeletonBlock className="h-3.5 w-20" />
        <SkeletonBlock className="h-8 w-16 rounded-xl" />
      </View>
    </View>
  );
}

export function FeedSkeleton() {
  return (
    <View>
      <SkeletonPostCard />
      <SkeletonProductCard />
      <SkeletonPostCard />
      <SkeletonPostCard />
      <SkeletonProductCard />
    </View>
  );
}
