/**
 * Tabs Layout
 *
 * Bottom tab navigator for the main app.
 * Redesigned with a floating Substack-style tab bar.
 */

import React from "react";
import { Tabs } from "expo-router";
import { useColorScheme, View, TouchableOpacity, StyleSheet } from "react-native";
import { Home, Search, Plus, MessageSquare, Bell, User } from "lucide-react-native";
import { BlurView } from "expo-blur";
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from "react-native-reanimated";
import { useEffect } from "react";

const AnimatedIcon = ({ focused, IconComponent, activeColor, iconColor, size = 28 }: any) => {
  const scale = useSharedValue(1);
  
  useEffect(() => {
    scale.value = withSpring(focused ? 1.15 : 1, { damping: 12, stiffness: 250 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <Animated.View style={animatedStyle}>
      <IconComponent 
        size={size} 
        color={focused ? activeColor : iconColor} 
        strokeWidth={focused ? 2.5 : 1.5} 
      />
    </Animated.View>
  );
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const iconColor = isDark ? "#FFFFFF" : "#1D1D1F";
  const activeColor = isDark ? "#0A84FF" : "#0071E3";
  
  // Floating glass effect colors
  const tabBg = isDark ? "rgba(20, 24, 32, 0.95)" : "rgba(255, 255, 255, 0.95)";
  const tabBorder = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        animation: 'shift',
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: isDark ? "#6B7280" : "#9CA3AF",
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 1,
          borderTopColor: tabBorder,
          height: 85,
          paddingTop: 12,
        },
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? "dark" : "light"}
            intensity={80}
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <AnimatedIcon focused={focused} IconComponent={Home} activeColor={activeColor} iconColor={iconColor} />
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ focused }) => <AnimatedIcon focused={focused} IconComponent={Search} activeColor={activeColor} iconColor={iconColor} />
        }}
      />
      
      {/* Floating Action Button (FAB) for Create/Sell */}
      <Tabs.Screen
        name="create"
        options={{
          title: "Sell",
          tabBarIcon: ({ focused }) => <AnimatedIcon focused={focused} IconComponent={Plus} activeColor={activeColor} iconColor={iconColor} size={32} />
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => <AnimatedIcon focused={focused} IconComponent={MessageSquare} activeColor={activeColor} iconColor={iconColor} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <AnimatedIcon focused={focused} IconComponent={User} activeColor={activeColor} iconColor={iconColor} />
        }}
      />
    </Tabs>
  );
}
