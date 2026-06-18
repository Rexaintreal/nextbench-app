/**
 * Blocked Users Screen
 *
 * Lists everyone the current user has blocked, with an option to unblock.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { ArrowLeft, User as UserIcon } from "lucide-react-native";
import { getFirestore, doc, getDoc } from "@react-native-firebase/firestore";
import { useBlockedIds, unblockUser } from "@/lib/blocks";
import { AppAlert } from "@/components/ui/AppAlert";

interface BlockedUser {
  id: string;
  name?: string;
  profilePicture?: string;
}

export default function BlockedUsersScreen() {
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#FFFFFF" : "#1D1D1F";

  const blockedIds = useBlockedIds();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const ids = Array.from(blockedIds);
        const snaps = await Promise.all(
          ids.map((id) => getDoc(doc(getFirestore(), "users", id)))
        );
        const users: BlockedUser[] = snaps
          .filter((snap) => snap.exists)
          .map((snap) => ({ id: snap.id, ...(snap.data() as any) }));
        if (isCurrent) setBlockedUsers(users);
      } catch (err) {
        console.error("Failed to load blocked users", err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchProfiles();
    return () => { isCurrent = false; };
  }, [blockedIds]);

  const handleUnblock = (target: BlockedUser) => {
    if (!user) return;
    AppAlert.alert("Unblock User", `Unblock ${target.name || "this user"}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: async () => {
          setUnblockingId(target.id);
          try {
            await unblockUser(user.uid, target.id);
            // The blockedIds hook will update via its onSnapshot listener,
            // which re-triggers fetchProfiles and drops this user from the list.
          } catch (err) {
            console.error("Failed to unblock user", err);
            AppAlert.alert("Error", "Failed to unblock user.");
          } finally {
            setUnblockingId(null);
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
        <Text variant="h4">Blocked Users</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#14B8A6" />
        </View>
      ) : blockedUsers.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text variant="body" className="text-content-tertiary text-center">
            You haven't blocked anyone.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        >
          <View className="bg-surface-soft dark:bg-surface-dark-secondary rounded-xl mx-4 overflow-hidden">
            {blockedUsers.map((blockedUser, idx) => (
              <View
                key={blockedUser.id}
                className={`flex-row items-center px-5 py-4 ${
                  idx !== blockedUsers.length - 1
                    ? "border-b border-content-secondary/8"
                    : ""
                }`}
              >
                <View className="w-10 h-10 rounded-full bg-surface dark:bg-surface-dark items-center justify-center overflow-hidden mr-3">
                  {blockedUser.profilePicture ? (
                    <Image
                      source={{ uri: blockedUser.profilePicture }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <UserIcon size={18} color="#8E8E93" />
                  )}
                </View>
                <Text variant="body" className="flex-1">
                  {blockedUser.name || "Unknown"}
                </Text>
                <TouchableOpacity
                  onPress={() => handleUnblock(blockedUser)}
                  disabled={unblockingId === blockedUser.id}
                  className="px-4 py-2 rounded-full"
                  style={{ borderWidth: 1, borderColor: "rgba(239,68,68,0.4)" }}
                >
                  {unblockingId === blockedUser.id ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Text variant="caption" className="text-red-500 font-sans-semibold">
                      Unblock
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
