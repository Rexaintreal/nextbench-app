/**
 * Settings Screen
 *
 * App settings with theme toggle, notifications, account management, and logout.
 */

import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import {
  ArrowLeft,
  Moon,
  Bell,
  Lock,
  LogOut,
  ChevronRight,
  User,
  Shield,
  HelpCircle,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import auth from "@react-native-firebase/auth";

function SettingsRow({
  icon,
  label,
  onPress,
  trailing,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
}) {
  const content = (
    <>
      <View className="mr-4">{icon}</View>
      <Text
        variant="body"
        className={`flex-1 ${danger ? "text-red-500" : ""}`}
      >
        {label}
      </Text>
      {trailing || (onPress && <ChevronRight size={18} color="#9CA3AF" />)}
    </>
  );

  // If there's a trailing interactive element (like Switch), use a plain View
  // so the trailing element can receive touches directly
  if (trailing && !onPress) {
    return (
      <View className="flex-row items-center px-5 py-4 border-b border-content-secondary/8">
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center px-5 py-4 border-b border-content-secondary/8"
      activeOpacity={0.6}
    >
      {content}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const iconColor = isDark ? "#FFFFFF" : "#1D1D1F";

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await auth().signOut();
            router.replace("/(auth)/login");
          } catch (err) {
            console.error("Logout error:", err);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["top"]}
    >
      {/* Header */}
      <View className="flex-row items-center px-5 py-3 border-b border-content-secondary/10">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="mr-4"
        >
          <ArrowLeft size={24} color={iconColor} />
        </TouchableOpacity>
        <Text variant="h4">Settings</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Account Section */}
        <View className="mt-6 mb-2 px-5">
          <Text
            variant="caption"
            className="uppercase tracking-widest text-content-secondary"
          >
            Account
          </Text>
        </View>
        <View className="bg-surface-soft dark:bg-surface-dark-secondary rounded-xl mx-4 overflow-hidden">
          <SettingsRow
            icon={<User size={20} color={iconColor} />}
            label="Edit Profile"
            onPress={() => router.push('/edit-profile' as any)}
          />
          <SettingsRow
            icon={<Shield size={20} color={iconColor} />}
            label="Verification Status"
            trailing={
              <View
                className={`px-3 py-1 rounded-full ${
                  userData?.verified
                    ? "bg-brand-mint/10"
                    : "bg-amber-500/10"
                }`}
              >
                <Text
                  variant="caption"
                  className={`text-[11px] font-sans-medium ${
                    userData?.verified
                      ? "text-brand-mint"
                      : "text-amber-500"
                  }`}
                >
                  {userData?.verified ? "Verified" : "Pending"}
                </Text>
              </View>
            }
          />
        </View>

        {/* Preferences Section */}
        <View className="mt-8 mb-2 px-5">
          <Text
            variant="caption"
            className="uppercase tracking-widest text-content-secondary"
          >
            Preferences
          </Text>
        </View>
        <View className="bg-surface-soft dark:bg-surface-dark-secondary rounded-xl mx-4 overflow-hidden">
          <SettingsRow
            icon={<Moon size={20} color={iconColor} />}
            label="Dark Mode"
            trailing={
              <Switch
                value={isDark}
                onValueChange={(val) =>
                  setColorScheme(val ? "dark" : "light")
                }
                trackColor={{ false: "#D1D5DB", true: "#0071E3" }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingsRow
            icon={<Bell size={20} color={iconColor} />}
            label="Notifications"
            onPress={() => Alert.alert('Notifications', 'Notification preferences coming soon!')}
          />
          <SettingsRow
            icon={<Lock size={20} color={iconColor} />}
            label="Privacy"
            onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon!')}
          />
        </View>

        {/* Support Section */}
        <View className="mt-8 mb-2 px-5">
          <Text
            variant="caption"
            className="uppercase tracking-widest text-content-secondary"
          >
            Support
          </Text>
        </View>
        <View className="bg-surface-soft dark:bg-surface-dark-secondary rounded-xl mx-4 overflow-hidden">
          <SettingsRow
            icon={<HelpCircle size={20} color={iconColor} />}
            label="Help & Support"
            onPress={() => Alert.alert('Support', 'Reach us at support@nextbench.in')}
          />
        </View>

        {/* Logout */}
        <View className="mt-8">
          <View className="bg-surface-soft dark:bg-surface-dark-secondary rounded-xl mx-4 overflow-hidden">
            <SettingsRow
              icon={<LogOut size={20} color="#EF4444" />}
              label="Log Out"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        {/* App Version */}
        <View className="items-center mt-8">
          <Text variant="caption" className="text-content-tertiary">
            NextBench v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
