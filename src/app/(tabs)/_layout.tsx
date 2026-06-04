/**
 * Tabs Layout
 *
 * Bottom tab navigator for the main app.
 * 5 tabs: Home, Search, Create, Messages, Profile
 */

import React from "react";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { colors } from "@/constants/colors";
import { Home, Search, PlusCircle, MessageSquare, User } from "lucide-react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const iconColor = isDark ? "#FFFFFF" : "#1D1D1F";
  const activeColor = isDark ? "#0A84FF" : "#0071E3"; // dynamic brand-teal

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: isDark
          ? colors.content.dark.tertiary
          : colors.content.light.tertiary,
        tabBarStyle: {
          backgroundColor: isDark ? "#08090A" : "#FFFFFF", // surface-base
          borderTopColor: isDark ? "#121418" : "#F2F2F4",  // surface-soft
          borderTopWidth: 0.5,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <Home size={22} color={focused ? activeColor : iconColor} strokeWidth={focused ? 2.5 : 1.5} />
          )
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarLabel: "Search",
          tabBarIcon: ({ focused }) => (
            <Search size={22} color={focused ? activeColor : iconColor} strokeWidth={focused ? 2.5 : 1.5} />
          )
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Sell",
          tabBarLabel: "Sell",
          tabBarIcon: ({ focused }) => (
            <PlusCircle size={22} color={focused ? activeColor : iconColor} strokeWidth={focused ? 2.5 : 1.5} />
          )
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarLabel: "Messages",
          tabBarIcon: ({ focused }) => (
            <MessageSquare size={22} color={focused ? activeColor : iconColor} strokeWidth={focused ? 2.5 : 1.5} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ focused }) => (
            <User size={22} color={focused ? activeColor : iconColor} strokeWidth={focused ? 2.5 : 1.5} />
          )
        }}
      />
    </Tabs>
  );
}
