/**
 * Other User Profile Screen
 */

import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import {
  ChevronLeft, ShieldCheck, MapPin, Grid,
  MessageSquare, MoreHorizontal, UserPlus,
  UserMinus, Ban,
} from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";
import ProductCard, { Product } from "@/components/ui/ProductCard";
import PostCard, { Post } from "@/components/ui/PostCard";
import { useFollowStatus, useFollowCounts, followUser, unfollowUser } from "@/lib/follows";
import { useBlockStatus, blockUser, unblockUser } from "@/lib/blocks";
import { getOrCreateDMRoom } from "@/lib/social";
import ReportModal from "@/components/ui/ReportModal";

export default function OtherProfileScreen() {
  const { id: profileId } = useLocalSearchParams<{ id: string }>();
  const { user, userData: myData } = useAuth();
  const { isDark } = useTheme();

  // Theme-aware icon colour — replaces every hardcoded "#1D1D1F"
  const iconColor   = isDark ? "#F5F5F7" : "#1D1D1F";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const headerBg    = isDark ? "rgba(0,0,0,0.88)"       : "rgba(255,255,255,0.9)";

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [viewMode, setViewMode]       = useState<"listings" | "posts">("listings");
  const [listings, setListings]       = useState<Product[]>([]);
  const [posts, setPosts]             = useState<Post[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingPosts, setLoadingPosts]       = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  const { isFollowing, isFollowedBy, isFriend } = useFollowStatus(profileId);
  const { followersCount, followingCount }       = useFollowCounts(profileId);
  const { isBlocked, isBlockedBy }               = useBlockStatus(profileId);

  useEffect(() => {
    if (!profileId) return;
    const unsub = firestore().collection("users").doc(profileId).onSnapshot(
      (doc) => { if (doc.data()) setProfileData({ id: doc.id, ...doc.data() }); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    const unsub = firestore().collection("products").where("sellerId", "==", profileId)
      .onSnapshot((snap) => {
        const items: Product[] = [];
        snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Product));
        setListings(items); setLoadingListings(false);
      }, (err) => { console.error(err); setLoadingListings(false); });
    return () => unsub();
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    const unsub = firestore().collection("posts").where("authorId", "==", profileId)
      .onSnapshot((snap) => {
        const items: Post[] = [];
        snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as Post));
        setPosts(items); setLoadingPosts(false);
      }, (err) => { console.error(err); setLoadingPosts(false); });
    return () => unsub();
  }, [profileId]);

  const handleToggleFollow = async () => {
    if (!user || !profileId) return;
    if (!myData?.verified) {
      Alert.alert("Verification Required", "You must be verified to follow users.");
      return;
    }
    try {
      if (isFollowing) await unfollowUser(user.uid, profileId);
      else await followUser(user.uid, profileId);
    } catch (err) { console.error("Follow error:", err); }
  };

  const handleMessage = async () => {
    if (!user || !profileId) return;
    try {
      const { roomId } = await getOrCreateDMRoom(user.uid, profileId, profileData);
      router.push(`/chat/${roomId}` as any);
    } catch { Alert.alert("Error", "Failed to start conversation."); }
  };

  const handleBlock = async () => {
    if (!user || !profileId) return;
    Alert.alert(
      isBlocked ? "Unblock User" : "Block User",
      isBlocked
        ? `Unblock ${profileData?.name}?`
        : `Block ${profileData?.name}? They won't be able to see your content.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: isBlocked ? "Unblock" : "Block", style: isBlocked ? "default" : "destructive",
          onPress: async () => {
            try {
              if (isBlocked) await unblockUser(user.uid, profileId);
              else {
                await blockUser(user.uid, profileId);
                if (isFollowing) await unfollowUser(user.uid, profileId);
              }
            } catch { Alert.alert("Error", "Failed to update block status."); }
          },
        },
      ]
    );
  };

  const showActions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", isBlocked ? "Unblock User" : "Block User", "Report User"], destructiveButtonIndex: 1, cancelButtonIndex: 0 },
        (i) => { if (i === 1) handleBlock(); if (i === 2) setShowReportModal(true); }
      );
    } else {
      Alert.alert("Actions", undefined, [
        { text: "Cancel", style: "cancel" },
        { text: isBlocked ? "Unblock User" : "Block User", style: "destructive", onPress: handleBlock },
        { text: "Report User", onPress: () => setShowReportModal(true) },
      ]);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
        <ActivityIndicator color="#14B8A6" />
      </SafeAreaView>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (!profileData) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
        <Text variant="h3" className="text-content-secondary dark:text-ink-dark-muted mb-4">
          User Not Found
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="px-6 py-3 bg-brand-teal rounded-xl">
          <Text variant="label" className="text-white font-sans-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Blocked by this user ─────────────────────────────────────────────────
  if (isBlockedBy) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
        {/* Header */}
        <View
          className="px-5 py-3 flex-row items-center"
          style={{ borderBottomWidth: 1, borderBottomColor: borderColor, backgroundColor: headerBg }}
        >
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
            <ChevronLeft size={24} color={iconColor} />
          </TouchableOpacity>
          <Text variant="h3" className="font-sans-semibold dark:text-ink-dark">Profile</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Ban size={48} color={isDark ? "#3A3A3C" : "#C7C7CC"} />
          <Text variant="h3" className="mt-4 mb-2 dark:text-ink-dark">Content Unavailable</Text>
          <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted text-center">
            This user's profile is not available to you.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = user?.uid === profileId;
  const nameInitial  = profileData.name?.[0]?.toUpperCase() || "?";

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
      {/* ── Header ── */}
      <View
        className="px-5 py-3 flex-row items-center justify-between"
        style={{ borderBottomWidth: 1, borderBottomColor: borderColor, backgroundColor: headerBg }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
            <ChevronLeft size={24} color={iconColor} />
          </TouchableOpacity>
          <Text variant="h3" className="font-sans-semibold dark:text-ink-dark" numberOfLines={1}>
            {profileData.name}
          </Text>
        </View>
        {!isOwnProfile && (
          <TouchableOpacity onPress={showActions} className="p-2 -mr-2">
            <MoreHorizontal size={22} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 bg-surface dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Profile Info ── */}
        <View className="px-6 py-8 items-center bg-surface dark:bg-surface-dark" style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}>
          {/* Avatar */}
          <View className="relative mb-4">
            <View className="w-24 h-24 rounded-full bg-brand-teal/10 items-center justify-center overflow-hidden border border-brand-teal/20">
              {profileData.profilePicture ? (
                <Image source={{ uri: profileData.profilePicture }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Text variant="h1" className="text-brand-teal">{nameInitial}</Text>
              )}
            </View>
            {profileData.verified && (
              <View className="absolute bottom-0 right-0 bg-brand-teal rounded-full p-1 border-2 border-surface dark:border-surface-dark">
                <ShieldCheck size={14} color="#FFF" />
              </View>
            )}
          </View>

          <Text variant="h2" className="mb-0.5 dark:text-ink-dark">{profileData.name}</Text>
          {profileData.username && (
            <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint mb-1">
              @{profileData.username}
            </Text>
          )}
          <View className="flex-row items-center mb-3">
            <MapPin size={14} color={isDark ? "#636366" : "#8E8E93"} />
            <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted ml-1">
              {profileData.school}{profileData.city ? ` • ${profileData.city}` : ""}
            </Text>
          </View>

          {/* Relationship badge */}
          {!isOwnProfile && (
            <View className="flex-row items-center gap-1 mb-3">
              {isFriend && (
                <View className="bg-green-500/10 px-3 py-1 rounded-full">
                  <Text variant="caption" className="text-green-500 text-[10px] font-sans-semibold uppercase tracking-widest">
                    🤝 Friends
                  </Text>
                </View>
              )}
              {isFollowedBy && !isFriend && (
                <View className="bg-brand-teal/10 px-3 py-1 rounded-full">
                  <Text variant="caption" className="text-brand-teal text-[10px] font-sans-semibold uppercase tracking-widest">
                    Follows you
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Stats */}
          <View className="flex-row gap-6 mb-4">
            {[
              { label: "Followers", value: followersCount },
              { label: "Following", value: followingCount },
              { label: "Listings",  value: listings.length },
            ].map(({ label, value }) => (
              <View key={label} className="items-center">
                <Text variant="h3" className="dark:text-ink-dark">{value}</Text>
                <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted">{label}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && !isBlocked && (
            <View className="flex-row gap-3 w-full px-4">
              <TouchableOpacity
                onPress={handleToggleFollow}
                className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${
                  isFollowing ? "bg-surface-soft dark:bg-surface-dark-elevated" : "bg-brand-teal"
                }`}
                style={isFollowing ? { borderWidth: 1, borderColor: borderColor } : undefined}
              >
                {isFollowing
                  ? <UserMinus size={16} color={isDark ? "#8E8E93" : "#8E8E93"} />
                  : <UserPlus size={16} color="#FFF" />
                }
                <Text
                  variant="label"
                  className={`font-sans-semibold text-[11px] uppercase tracking-widest ${
                    isFollowing ? "text-content-secondary dark:text-ink-dark-muted" : "text-white"
                  }`}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleMessage}
                className="flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 bg-surface-soft dark:bg-surface-dark-elevated"
                style={{ borderWidth: 1, borderColor: borderColor }}
              >
                <MessageSquare size={16} color="#14B8A6" />
                <Text variant="label" className="font-sans-semibold text-brand-teal text-[11px] uppercase tracking-widest">
                  Message
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Blocked state */}
          {isBlocked && (
            <View className="w-full px-4">
              <View className="bg-red-500/5 p-4 rounded-xl items-center">
                <Text variant="body" className="text-red-500 font-sans-semibold mb-2">You blocked this user</Text>
                <TouchableOpacity onPress={handleBlock} className="px-4 py-2 bg-red-500/10 rounded-xl">
                  <Text variant="caption" className="text-red-500 font-sans-semibold uppercase tracking-widest text-[10px]">
                    Unblock
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Content Toggle ── */}
        {!isBlocked && (
          <>
            <View className="flex-row bg-surface dark:bg-surface-dark" style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}>
              {[
                { key: "listings" as const, label: "Listings", Icon: Grid,         activeColor: "#14B8A6" },
                { key: "posts"    as const, label: "Posts",    Icon: MessageSquare, activeColor: "#F43F5E" },
              ].map(({ key, label, Icon, activeColor }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setViewMode(key)}
                  className="flex-1 items-center py-4"
                  style={{ borderBottomWidth: 2, borderBottomColor: viewMode === key ? activeColor : "transparent" }}
                >
                  <Icon size={20} color={viewMode === key ? activeColor : isDark ? "#636366" : "#8E8E93"} />
                  <Text
                    variant="label"
                    className={`mt-1 font-sans-semibold ${
                      viewMode === key
                        ? key === "listings" ? "text-brand-teal" : "text-brand-pink"
                        : "text-content-secondary dark:text-ink-dark-faint"
                    }`}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content */}
            <View className="pt-4 bg-surface dark:bg-surface-dark">
              {viewMode === "listings" ? (
                loadingListings ? (
                  <ActivityIndicator color="#14B8A6" className="mt-8" />
                ) : listings.length === 0 ? (
                  <View className="items-center justify-center pt-12">
                    <Text variant="body" className="text-content-secondary dark:text-ink-dark-muted">No listings yet.</Text>
                  </View>
                ) : (
                  listings.map((item) => (
                    <ProductCard
                      key={item.id}
                      product={item}
                      isWishlisted={false}
                      onPress={() => router.push(`/product/${item.id}` as any)}
                      onToggleWishlist={() => {}}
                    />
                  ))
                )
              ) : loadingPosts ? (
                <ActivityIndicator color="#F43F5E" className="mt-8" />
              ) : posts.length === 0 ? (
                <View className="items-center justify-center pt-12">
                  <Text variant="body" className="text-content-secondary dark:text-ink-dark-muted">No posts yet.</Text>
                </View>
              ) : (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} hasUpvoted={false} onPress={() => {}} />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {profileId && (
        <ReportModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          contentType="user"
          contentId={profileId}
        />
      )}
    </SafeAreaView>
  );
}