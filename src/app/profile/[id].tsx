/**
 * Other User Profile Screen
 *
 * View another user's profile with follow/block/report actions,
 * message button, and their listings/posts tabs.
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
import {
  ChevronLeft,
  ShieldCheck,
  MapPin,
  Grid,
  MessageSquare,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  Flag,
  Ban,
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

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"listings" | "posts">("listings");

  const [listings, setListings] = useState<Product[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [showReportModal, setShowReportModal] = useState(false);

  const { isFollowing, isFollowedBy, isFriend } = useFollowStatus(profileId);
  const { followersCount, followingCount } = useFollowCounts(profileId);
  const { isBlocked, isBlockedBy } = useBlockStatus(profileId);

  // Fetch profile data
  useEffect(() => {
    if (!profileId) return;

    const unsub = firestore()
      .collection("users")
      .doc(profileId)
      .onSnapshot(
        (doc) => {
          if (doc.data()) {
            setProfileData({ id: doc.id, ...doc.data() });
          }
          setLoading(false);
        },
        () => setLoading(false)
      );

    return () => unsub();
  }, [profileId]);

  // Fetch user's listings
  useEffect(() => {
    if (!profileId) return;
    const unsub = firestore()
      .collection("products")
      .where("sellerId", "==", profileId)
      .onSnapshot((snap) => {
        const items: Product[] = [];
        snap.forEach((doc) =>
          items.push({ id: doc.id, ...doc.data() } as Product)
        );
        setListings(items);
        setLoadingListings(false);
      }, (error) => {
        console.error("Failed to fetch listings:", error);
        setLoadingListings(false);
      });
    return () => unsub();
  }, [profileId]);

  // Fetch user's posts
  useEffect(() => {
    if (!profileId) return;
    const unsub = firestore()
      .collection("posts")
      .where("authorId", "==", profileId)
      .onSnapshot((snap) => {
        const items: Post[] = [];
        snap.forEach((doc) =>
          items.push({ id: doc.id, ...doc.data() } as Post)
        );
        setPosts(items);
        setLoadingPosts(false);
      }, (error) => {
        console.error("Failed to fetch posts:", error);
        setLoadingPosts(false);
      });
    return () => unsub();
  }, [profileId]);

  const handleToggleFollow = async () => {
    if (!user || !profileId) return;
    if (!myData?.verified) {
      Alert.alert(
        "Verification Required",
        "You must be verified to follow users."
      );
      return;
    }
    try {
      if (isFollowing) {
        await unfollowUser(user.uid, profileId);
      } else {
        await followUser(user.uid, profileId);
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  const handleMessage = async () => {
    if (!user || !profileId) return;
    try {
      const roomId = await getOrCreateDMRoom(user.uid, profileId);
      router.push(`/chat/${roomId}` as any);
    } catch (err) {
      Alert.alert("Error", "Failed to start conversation.");
    }
  };

  const handleBlock = async () => {
    if (!user || !profileId) return;
    Alert.alert(
      isBlocked ? "Unblock User" : "Block User",
      isBlocked
        ? `Are you sure you want to unblock ${profileData?.name}?`
        : `Are you sure you want to block ${profileData?.name}? They won't be able to see your content.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isBlocked ? "Unblock" : "Block",
          style: isBlocked ? "default" : "destructive",
          onPress: async () => {
            try {
              if (isBlocked) {
                await unblockUser(user.uid, profileId);
              } else {
                await blockUser(user.uid, profileId);
                // Also unfollow if following
                if (isFollowing) {
                  await unfollowUser(user.uid, profileId);
                }
              }
            } catch (err) {
              Alert.alert("Error", "Failed to update block status.");
            }
          },
        },
      ]
    );
  };

  const showActions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "Cancel",
            isBlocked ? "Unblock User" : "Block User",
            "Report User",
          ],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) handleBlock();
          if (buttonIndex === 2) setShowReportModal(true);
        }
      );
    } else {
      // Android fallback
      Alert.alert("Actions", undefined, [
        { text: "Cancel", style: "cancel" },
        {
          text: isBlocked ? "Unblock User" : "Block User",
          style: "destructive",
          onPress: handleBlock,
        },
        {
          text: "Report User",
          onPress: () => setShowReportModal(true),
        },
      ]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#0071E3" />
      </SafeAreaView>
    );
  }

  if (!profileData) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center">
        <Text variant="h3" className="text-content-secondary mb-4">
          User Not Found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-6 py-3 bg-brand-teal rounded-xl"
        >
          <Text variant="label" className="text-white font-bold">
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // If blocked by this user
  if (isBlockedBy) {
    return (
      <SafeAreaView
        className="flex-1 bg-surface dark:bg-surface-dark"
        edges={["top"]}
      >
        <View className="px-5 py-3 border-b border-brand-teal/5 bg-surface flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 mr-2"
          >
            <ChevronLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text variant="h3" className="font-bold">
            Profile
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Ban size={48} color="#C7C7CC" />
          <Text variant="h3" className="mt-4 mb-2">
            Content Unavailable
          </Text>
          <Text
            variant="caption"
            className="text-content-secondary text-center"
          >
            This user's profile is not available to you.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnProfile = user?.uid === profileId;
  const nameInitial = profileData.name?.[0]?.toUpperCase() || "?";

  return (
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["top"]}
    >
      {/* Header */}
      <View className="px-5 py-3 border-b border-brand-teal/5 bg-surface/90 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 mr-2"
          >
            <ChevronLeft size={24} color="#1D1D1F" />
          </TouchableOpacity>
          <Text variant="h3" className="font-bold" numberOfLines={1}>
            {profileData.name}
          </Text>
        </View>
        {!isOwnProfile && (
          <TouchableOpacity onPress={showActions} className="p-2 -mr-2">
            <MoreHorizontal size={22} color="#1D1D1F" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Info */}
        <View className="px-6 py-8 items-center border-b border-content-secondary/10">
          <View className="relative mb-4">
            <View className="w-24 h-24 rounded-full bg-brand-teal/10 items-center justify-center overflow-hidden border border-brand-teal/20">
              {profileData.profilePicture ? (
                <Image
                  source={{ uri: profileData.profilePicture }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text variant="h1" className="text-brand-teal">
                  {nameInitial}
                </Text>
              )}
            </View>
            {profileData.verified && (
              <View className="absolute bottom-0 right-0 bg-brand-teal rounded-full p-1 border-2 border-surface">
                <ShieldCheck size={14} color="#FFF" />
              </View>
            )}
          </View>

          <Text variant="h2" className="mb-0.5">
            {profileData.name}
          </Text>
          {profileData.username && (
            <Text
              variant="caption"
              className="text-content-tertiary mb-1"
            >
              @{profileData.username}
            </Text>
          )}
          <View className="flex-row items-center mb-3">
            <MapPin size={14} color="#8E8E93" />
            <Text variant="caption" className="text-content-secondary ml-1">
              {profileData.school}
              {profileData.city ? ` • ${profileData.city}` : ""}
            </Text>
          </View>

          {/* Relationship badge */}
          {!isOwnProfile && (
            <View className="flex-row items-center gap-1 mb-3">
              {isFriend && (
                <View className="bg-green-500/10 px-3 py-1 rounded-full">
                  <Text
                    variant="caption"
                    className="text-green-500 text-[10px] font-bold uppercase tracking-widest"
                  >
                    🤝 Friends
                  </Text>
                </View>
              )}
              {isFollowedBy && !isFriend && (
                <View className="bg-brand-teal/10 px-3 py-1 rounded-full">
                  <Text
                    variant="caption"
                    className="text-brand-teal text-[10px] font-bold uppercase tracking-widest"
                  >
                    Follows you
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Stats */}
          <View className="flex-row gap-6 mb-4">
            <View className="items-center">
              <Text variant="h3">{followersCount}</Text>
              <Text variant="caption" className="text-content-secondary">
                Followers
              </Text>
            </View>
            <View className="items-center">
              <Text variant="h3">{followingCount}</Text>
              <Text variant="caption" className="text-content-secondary">
                Following
              </Text>
            </View>
            <View className="items-center">
              <Text variant="h3">{listings.length}</Text>
              <Text variant="caption" className="text-content-secondary">
                Listings
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && !isBlocked && (
            <View className="flex-row gap-3 w-full px-4">
              <TouchableOpacity
                onPress={handleToggleFollow}
                className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${
                  isFollowing
                    ? "bg-surface-soft border border-content-secondary/20"
                    : "bg-brand-teal"
                }`}
              >
                {isFollowing ? (
                  <UserMinus size={16} color="#8E8E93" />
                ) : (
                  <UserPlus size={16} color="#FFF" />
                )}
                <Text
                  variant="label"
                  className={`font-bold text-[11px] uppercase tracking-widest ${
                    isFollowing ? "text-content-secondary" : "text-white"
                  }`}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleMessage}
                className="flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 border border-content-secondary/20"
              >
                <MessageSquare size={16} color="#0071E3" />
                <Text
                  variant="label"
                  className="font-bold text-brand-teal text-[11px] uppercase tracking-widest"
                >
                  Message
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Blocked state */}
          {isBlocked && (
            <View className="w-full px-4">
              <View className="bg-red-500/5 p-4 rounded-xl items-center">
                <Text variant="body" className="text-red-500 font-bold mb-2">
                  You blocked this user
                </Text>
                <TouchableOpacity
                  onPress={handleBlock}
                  className="px-4 py-2 bg-red-500/10 rounded-xl"
                >
                  <Text variant="caption" className="text-red-500 font-bold uppercase tracking-widest text-[10px]">
                    Unblock
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Content Toggle */}
        {!isBlocked && (
          <>
            <View className="flex-row border-b border-content-secondary/10">
              <TouchableOpacity
                onPress={() => setViewMode("listings")}
                className={`flex-1 items-center py-4 border-b-2 ${
                  viewMode === "listings"
                    ? "border-brand-teal"
                    : "border-transparent"
                }`}
              >
                <Grid
                  size={20}
                  color={viewMode === "listings" ? "#0071E3" : "#8E8E93"}
                />
                <Text
                  variant="label"
                  className={`mt-1 font-bold ${
                    viewMode === "listings"
                      ? "text-brand-teal"
                      : "text-content-secondary"
                  }`}
                >
                  Listings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewMode("posts")}
                className={`flex-1 items-center py-4 border-b-2 ${
                  viewMode === "posts"
                    ? "border-brand-pink"
                    : "border-transparent"
                }`}
              >
                <MessageSquare
                  size={20}
                  color={viewMode === "posts" ? "#F77CA2" : "#8E8E93"}
                />
                <Text
                  variant="label"
                  className={`mt-1 font-bold ${
                    viewMode === "posts"
                      ? "text-brand-pink"
                      : "text-content-secondary"
                  }`}
                >
                  Posts
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View className="pt-4">
              {viewMode === "listings" ? (
                loadingListings ? (
                  <ActivityIndicator color="#0071E3" className="mt-8" />
                ) : listings.length === 0 ? (
                  <View className="items-center justify-center pt-12">
                    <Text
                      variant="body"
                      className="text-content-secondary"
                    >
                      No listings yet.
                    </Text>
                  </View>
                ) : (
                  listings.map((item) => (
                    <ProductCard
                      key={item.id}
                      product={item}
                      isWishlisted={false}
                      onPress={() =>
                        router.push(`/product/${item.id}` as any)
                      }
                      onToggleWishlist={() => {}}
                    />
                  ))
                )
              ) : loadingPosts ? (
                <ActivityIndicator color="#F77CA2" className="mt-8" />
              ) : posts.length === 0 ? (
                <View className="items-center justify-center pt-12">
                  <Text variant="body" className="text-content-secondary">
                    No posts yet.
                  </Text>
                </View>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    hasUpvoted={false}
                    onPress={() => {}}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Report Modal */}
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
