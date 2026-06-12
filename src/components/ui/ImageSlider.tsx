// components/ui/ImageSlider.tsx
import React, { useState } from "react";
import { View, FlatList, Image } from "react-native";

interface Props {
  urls: string[];
  inputBg: string;
  isDark: boolean;
}

export function ImageSlider({ urls, inputBg, isDark }: Props) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  if (urls.length === 0) return null;

  return (
    <View
      style={{ marginBottom: 12 }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setWidth(w);
      }}
    >
      {width > 0 && (
        <>
          <FlatList
            data={urls}
            keyExtractor={(_, idx) => String(idx)}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={(e) => {
              setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
            }}
            style={{ borderRadius: 12, overflow: "hidden" }}
            getItemLayout={(_, idx) => ({
              length: width,
              offset: width * idx,
              index: idx,
            })}
            renderItem={({ item: url }) => (
              <View
                style={{
                  width,
                  aspectRatio: 4 / 3,
                  backgroundColor: inputBg,
                }}
              >
                <Image
                  source={{ uri: url }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          {urls.length > 1 && (
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8, gap: 6 }}>
              {urls.map((_, idx) => (
                <View
                  key={idx}
                  style={{
                    width: idx === index ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor:
                      idx === index ? "#14B8A6" : isDark ? "#3A3A3C" : "#D1D1D6",
                  }}
                />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}