// components/ui/ImageSlider.tsx
import React, { useState, useRef } from "react";
import { View, ScrollView, Image, TouchableOpacity, useWindowDimensions } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";

interface Props {
  urls: string[];
  inputBg: string;
  isDark: boolean;
}

export function ImageSlider({ urls, inputBg, isDark }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  if (urls.length === 0) return null;

  const slideWidth = containerWidth > 0 ? containerWidth : windowWidth - 40;

  const goTo = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, urls.length - 1));
    scrollRef.current?.scrollTo({ x: clamped * slideWidth, animated: true });
    setIndex(clamped);
  };

  return (
    <View
      style={{ marginBottom: 12 }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && w !== containerWidth) setContainerWidth(w);
      }}
    >
      <View style={{ width: slideWidth, borderRadius: 12, overflow: "hidden" }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          scrollEnabled={false}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
            setIndex(newIndex);
          }}
        >
          {urls.map((url, idx) => (
            <View
              key={idx}
              style={{ width: slideWidth, aspectRatio: 4 / 3, backgroundColor: inputBg }}
            >
              <Image
                source={{ uri: url }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Prev button */}
        {urls.length > 1 && index > 0 && (
          <TouchableOpacity
            onPress={() => goTo(index - 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: [{ translateY: -16 }],
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={18} color={isDark ? "#fff" : "#1D1D1F"} strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* Next button */}
        {urls.length > 1 && index < urls.length - 1 && (
          <TouchableOpacity
            onPress={() => goTo(index + 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: [{ translateY: -16 }],
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.85)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={18} color={isDark ? "#fff" : "#1D1D1F"} strokeWidth={2.5} />
          </TouchableOpacity>
        )}

        {/* Dot indicators */}
        {urls.length > 1 && (
          <View
            style={{
              position: "absolute",
              bottom: 8,
              left: 0,
              right: 0,
              flexDirection: "row",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {urls.map((_, idx) => (
              <View
                key={idx}
                style={{
                  width: idx === index ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: idx === index ? "#14B8A6" : "rgba(255,255,255,0.5)",
                }}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}