/**
 * Tabs Layout
 *
 * Bottom tab navigator for the main app.
 * 5 tabs: Feed, Search, Create, Notifications, Profile
 */

import React from "react";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { colors } from "@/constants/colors";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand[500],
        tabBarInactiveTintColor: isDark
          ? colors.content.dark.tertiary
          : colors.content.light.tertiary,
        tabBarStyle: {
          backgroundColor: isDark
            ? colors.surface.dark.primary
            : colors.surface.light.primary,
          borderTopColor: isDark
            ? colors.surface.dark.border
            : colors.surface.light.border,
          borderTopWidth: 0.5,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarLabel: "Feed",
          // tabBarIcon will be added with proper icons in Phase 3
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarLabel: "Search",
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarLabel: "Create",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarLabel: "Alerts",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
        }}
      />
    </Tabs>
  );
}
