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
    <View className="py-5 px-5 border-b border-surface-soft dark:border-surface-dark-secondary">
      {/* Author row skeleton */}
      <View className="flex-row items-center mb-3">
        <SkeletonBlock className="w-10 h-10 rounded-full mr-3" />
        <View className="flex-1">
          <SkeletonBlock className="h-3.5 w-1/3 mb-2" />
          <SkeletonBlock className="h-3 w-1/2" />
        </View>
        <SkeletonBlock className="h-6 w-16 rounded-md" />
      </View>

      {/* Title skeleton */}
      <SkeletonBlock className="h-4.5 w-3/4 mb-2" />

      {/* Content lines skeleton */}
      <SkeletonBlock className="h-3.5 w-full mb-2" />
      <SkeletonBlock className="h-3.5 w-full mb-2" />
      <SkeletonBlock className="h-3.5 w-5/6 mb-2" />
      <SkeletonBlock className="h-3.5 w-2/3 mb-3" />

      {/* Action bar skeleton */}
      <View className="flex-row items-center gap-5 pt-2">
        <SkeletonBlock className="h-5 w-12" />
        <SkeletonBlock className="h-5 w-12" />
        <SkeletonBlock className="h-5 w-8" />
      </View>
    </View>
  );
}

export function SkeletonProductCard() {
  return (
    <View className="py-5 px-5 border-b border-surface-soft dark:border-surface-dark-secondary">
      {/* Header row */}
      <View className="flex-row items-center mb-3">
        <SkeletonBlock className="w-10 h-10 rounded-full mr-3" />
        <View className="flex-1">
          <SkeletonBlock className="h-3.5 w-1/4 mb-2" />
          <SkeletonBlock className="h-3 w-1/3" />
        </View>
        <SkeletonBlock className="h-6 w-14" />
      </View>

      {/* Title */}
      <SkeletonBlock className="h-4 w-2/3 mb-3" />

      {/* Image */}
      <SkeletonBlock className="w-full aspect-[4/3] rounded-xl mb-3" />

      {/* Footer */}
      <View className="flex-row items-center justify-between">
        <SkeletonBlock className="h-3.5 w-20" />
        <SkeletonBlock className="h-9 w-16 rounded-xl" />
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
