/**
 * Other User Profile Screen
 * — Cover photo: displayed for all users, editable on own profile
 */

import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { AppAlert } from "@/components/ui/AppAlert";
import {
  ChevronLeft, ShieldCheck, MapPin, Grid,
  MessageSquare, MoreHorizontal, UserPlus,
  UserMinus, Ban, Camera,
} from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import ProductCard, { Product } from "@/components/ui/ProductCard";
import PostCard, { Post } from "@/components/ui/PostCard";
import { useFollowStatus, useFollowCounts, followUser, unfollowUser } from "@/lib/follows";
import { useBlockStatus, blockUser, unblockUser } from "@/lib/blocks";
import { getOrCreateDMRoom } from "@/lib/social";
import ReportModal from "@/components/ui/ReportModal";
import { uploadCoverPhotoMobile } from "@/services/firebase/storage";

const COVER_HEIGHT = 160;

export default function OtherProfileScreen() {
  const { id: profileId } = useLocalSearchParams<{ id: string }>();
  const { user, userData: myData } = useAuth();
  const { isDark } = useTheme();

  const iconColor   = isDark ? "#F5F5F7" : "#1D1D1F";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const headerBg    = isDark ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.9)";
  const surfaceBg   = isDark ? "#1C1C1E" : "#FFFFFF";

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [viewMode, setViewMode]       = useState<"listings" | "posts">("listings");
  const [listings, setListings]       = useState<Product[]>([]);
  const [posts, setPosts]             = useState<Post[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingPosts, setLoadingPosts]       = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  // Cover photo state
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const { isFollowing, isFollowedBy, isFriend } = useFollowStatus(profileId);
  const { followersCount, followingCount }       = useFollowCounts(profileId);
  const { isBlocked, isBlockedBy }               = useBlockStatus(profileId);

  const isOwnProfile = user?.uid === profileId;

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

  // ── Cover photo upload ───────────────────────────────────────────────────────
  const handleEditCover = async () => {
    if (!isOwnProfile || !user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to change your cover photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [3, 1],
    });

    if (result.canceled || !result.assets[0]) return;

    setIsUploadingCover(true);
    try {
      const url = await uploadCoverPhotoMobile(result.assets[0].uri, user.uid);
      await firestore().collection("users").doc(user.uid).update({
        coverPhoto: url,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("Cover upload error:", err);
      Alert.alert("Upload failed", "Could not update cover photo. Please try again.");
    } finally {
      setIsUploadingCover(false);
    }
  };

  // ── Follow / Message / Block ──────────────────────────────────────────────
  const handleToggleFollow = async () => {
    if (!user || !profileId) return;
    if (!myData?.verified) {
      AppAlert.alert("Verification Required", "You must be verified to follow users.");
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
    } catch { AppAlert.alert("Error", "Failed to start conversation."); }
  };

  const handleBlock = async () => {
    if (!user || !profileId) return;
    AppAlert.alert(
      isBlocked ? "Unblock User" : "Block User",
      isBlocked
        ? `Unblock ${profileData?.name}?`
        : `Block ${profileData?.name}? They won't be able to see your content.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isBlocked ? "Unblock" : "Block",
          style: isBlocked ? "default" : "destructive",
          onPress: async () => {
            try {
              if (isBlocked) await unblockUser(user.uid, profileId);
              else {
                await blockUser(user.uid, profileId);
                if (isFollowing) await unfollowUser(user.uid, profileId);
              }
            } catch { AppAlert.alert("Error", "Failed to update block status."); }
          },
        },
      ]
    );
  };

  const showActions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", isBlocked ? "Unblock User" : "Block User", "Report User"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (i) => { if (i === 1) handleBlock(); if (i === 2) setShowReportModal(true); }
      );
    } else {
      AppAlert.alert("Actions", undefined, [
        { text: "Cancel", style: "cancel" },
        { text: isBlocked ? "Unblock User" : "Block User", style: "destructive", onPress: handleBlock },
        { text: "Report User", onPress: () => setShowReportModal(true) },
      ]);
    }
  };

  // ── Guard states ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
        <ActivityIndicator color="#14B8A6" />
      </SafeAreaView>
    );
  }

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

  if (isBlockedBy) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
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

  const nameInitial = profileData.name?.[0]?.toUpperCase() || "?";

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
      {/* ── Floating header (back + name + more) ── */}
      <View
        className="px-5 py-3 flex-row items-center justify-between"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          backgroundColor: headerBg,
          zIndex: 10,
        }}
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

      <ScrollView
        className="flex-1 bg-surface dark:bg-surface-dark"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Cover Photo ── */}
        <TouchableOpacity
          activeOpacity={isOwnProfile ? 0.85 : 1}
          onPress={isOwnProfile ? handleEditCover : undefined}
          style={{ height: COVER_HEIGHT, width: "100%", position: "relative" }}
        >
          {profileData.coverPhoto ? (
            <Image
              source={{ uri: profileData.coverPhoto }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: isDark ? "#0D3D38" : "#CCFBF1",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  width: "55%",
                  height: "100%",
                  backgroundColor: isDark
                    ? "rgba(244,63,94,0.18)"
                    : "rgba(244,63,94,0.12)",
                }}
              />
            </View>
          )}

          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
              backgroundColor: "transparent",
            }}
            pointerEvents="none"
          />

          {/* Edit cover button — own profile only */}
          {isOwnProfile && (
            <View
              style={{
                position: "absolute",
                bottom: 10,
                right: 12,
                backgroundColor: "rgba(0,0,0,0.52)",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              {isUploadingCover ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Camera size={14} color="#fff" />
              )}
              <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 }}>
                {isUploadingCover ? "Uploading…" : "Edit Cover"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Profile Info (avatar overlaps cover) ── */}
        <View style={{ backgroundColor: surfaceBg }}>
          {/* Avatar row — pulled up to overlap the cover */}
          <View
            style={{
              paddingHorizontal: 20,
              marginTop: -38,
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            {/* Avatar */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 3,
                borderColor: surfaceBg,
                overflow: "hidden",
                backgroundColor: isDark ? "#2C2C2E" : "#F5F5F7",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {profileData.profilePicture ? (
                <Image
                  source={{ uri: profileData.profilePicture }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text variant="h2" className="text-brand-teal">{nameInitial}</Text>
              )}
              {profileData.verified && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    backgroundColor: "#14B8A6",
                    borderRadius: 999,
                    padding: 3,
                    borderWidth: 2,
                    borderColor: surfaceBg,
                  }}
                >
                  <ShieldCheck size={10} color="#FFF" />
                </View>
              )}
            </View>

            {/* Action buttons — shown next to avatar for non-own profiles */}
            {!isOwnProfile && !isBlocked && (
              <View className="flex-row gap-2" style={{ paddingBottom: 4 }}>
                <TouchableOpacity
                  onPress={handleToggleFollow}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: isFollowing ? "transparent" : "#14B8A6",
                    borderWidth: isFollowing ? 1 : 0,
                    borderColor: borderColor,
                  }}
                >
                  {isFollowing
                    ? <UserMinus size={14} color="#8E8E93" />
                    : <UserPlus size={14} color="#FFF" />
                  }
                  <Text
                    variant="caption"
                    style={{
                      fontFamily: "Inter_600SemiBold",
                      fontSize: 12,
                      color: isFollowing ? (isDark ? "#8E8E93" : "#636366") : "#FFF",
                    }}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleMessage}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: borderColor,
                    backgroundColor: isDark ? "#2C2C2E" : "#F5F5F7",
                  }}
                >
                  <MessageSquare size={14} color="#14B8A6" />
                  <Text
                    variant="caption"
                    style={{ fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#14B8A6" }}
                  >
                    Message
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Name, username, school */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <View className="flex-row items-center gap-2 mb-0.5">
              <Text variant="h2" className="dark:text-ink-dark">{profileData.name}</Text>
              {profileData.verified && (
                <ShieldCheck size={16} color="#14B8A6" />
              )}
            </View>

            {profileData.username && (
              <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint mb-1">
                @{profileData.username}
              </Text>
            )}

            <View className="flex-row items-center mb-3">
              <MapPin size={13} color={isDark ? "#636366" : "#8E8E93"} />
              <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted ml-1">
                {profileData.school}{profileData.city ? ` • ${profileData.city}` : ""}
              </Text>
            </View>

            {/* Relationship badge */}
            {!isOwnProfile && (isFriend || isFollowedBy) && (
              <View className="flex-row items-center gap-2 mb-3">
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
            <View className="flex-row gap-6">
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
          </View>
        </View>

        {/* Blocked state banner */}
        {isBlocked && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 16, backgroundColor: surfaceBg }}>
            <View className="bg-red-500/5 p-4 rounded-xl items-center">
              <Text variant="body" className="text-red-500 font-sans-semibold mb-2">
                You blocked this user
              </Text>
              <TouchableOpacity onPress={handleBlock} className="px-4 py-2 bg-red-500/10 rounded-xl">
                <Text variant="caption" className="text-red-500 font-sans-semibold uppercase tracking-widest text-[10px]">
                  Unblock
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Content Toggle + Listings/Posts ── */}
        {!isBlocked && (
          <>
            <View
              className="flex-row bg-surface dark:bg-surface-dark"
              style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: borderColor }}
            >
              {[
                { key: "listings" as const, label: "Listings",    Icon: Grid,          activeColor: "#14B8A6" },
                { key: "posts"    as const, label: "Posts",       Icon: MessageSquare, activeColor: "#F43F5E" },
              ].map(({ key, label, Icon, activeColor }) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setViewMode(key)}
                  className="flex-1 items-center py-4"
                  style={{
                    borderBottomWidth: 2,
                    borderBottomColor: viewMode === key ? activeColor : "transparent",
                  }}
                >
                  <Icon
                    size={20}
                    color={viewMode === key ? activeColor : isDark ? "#636366" : "#8E8E93"}
                  />
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

            <View className="pt-4 bg-surface dark:bg-surface-dark">
              {viewMode === "listings" ? (
                loadingListings ? (
                  <ActivityIndicator color="#14B8A6" style={{ marginTop: 32 }} />
                ) : listings.length === 0 ? (
                  <View className="items-center justify-center pt-12">
                    <Text variant="body" className="text-content-secondary dark:text-ink-dark-muted">
                      No listings yet.
                    </Text>
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
                <ActivityIndicator color="#F43F5E" style={{ marginTop: 32 }} />
              ) : posts.length === 0 ? (
                <View className="items-center justify-center pt-12">
                  <Text variant="body" className="text-content-secondary dark:text-ink-dark-muted">
                    No posts yet.
                  </Text>
                </View>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    hasUpvoted={false}
                    onPress={() => router.push(`/post/${post.id}` as any)}
                  />
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