import React, { useState, useEffect } from "react";
import {
  View, ScrollView, TouchableOpacity, Image,
  ActivityIndicator, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import {
  Settings, ShieldCheck, MapPin, Grid, MessageSquare,
  Bell, Heart, X, Bookmark, Camera, SlidersHorizontal,
} from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import ProductCard, { Product } from "@/components/ui/ProductCard";
import PostCard, { Post } from "@/components/ui/PostCard";
import { useFollowCounts } from "@/lib/follows";
import { uploadCoverPhotoMobile } from "@/services/firebase/storage";
import { AppAlert } from "@/components/ui/AppAlert";

const COVER_HEIGHT = 120;
const AVATAR_SIZE  = 76;

type ListingSort = "newest" | "oldest" | "price_asc" | "price_desc";
type PostSort    = "newest" | "oldest" | "top";

export default function ProfileScreen() {
  const { user, userData } = useAuth();
  const { isDark } = useTheme();
  const iconColor   = isDark ? "#F5F5F7" : "#1A1A1C";
  const cardBg      = isDark ? "#1C1C1E" : "#FFFFFF";
  const softBg      = isDark ? "#2C2C2E" : "#F5F5F7";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  const [viewMode, setViewMode] = useState<"listings" | "posts" | "playlist">("listings");

  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingPosts, setLoadingPosts]       = useState(true);
  const [loadingPlaylist, setLoadingPlaylist] = useState(true);
  const [myListings, setMyListings]           = useState<Product[]>([]);
  const [myPosts, setMyPosts]                 = useState<Post[]>([]);
  const [savedPosts, setSavedPosts]           = useState<Post[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Sort state
  const [sortListings, setSortListings] = useState<ListingSort>("newest");
  const [sortPosts, setSortPosts]       = useState<PostSort>("newest");
  const [sortSaved, setSortSaved]       = useState<PostSort>("newest");

  const { followersCount, followingCount } = useFollowCounts(user?.uid);

  const [modalType, setModalType]   = useState<"followers" | "following" | null>(null);
  const [modalUsers, setModalUsers] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // ── Sorted derived arrays ─────────────────────────────────────────────────
  const sortedListings = [...myListings].sort((a, b) => {
    if (sortListings === "newest")     return ((b as any).createdAt?.seconds ?? 0) - ((a as any).createdAt?.seconds ?? 0);
    if (sortListings === "oldest")     return ((a as any).createdAt?.seconds ?? 0) - ((b as any).createdAt?.seconds ?? 0);
    if (sortListings === "price_asc")  return ((a as any).price ?? 0) - ((b as any).price ?? 0);
    if (sortListings === "price_desc") return ((b as any).price ?? 0) - ((a as any).price ?? 0);
    return 0;
  });

  const sortedPosts = [...myPosts].sort((a, b) => {
    if (sortPosts === "newest") return ((b as any).createdAt?.seconds ?? 0) - ((a as any).createdAt?.seconds ?? 0);
    if (sortPosts === "oldest") return ((a as any).createdAt?.seconds ?? 0) - ((b as any).createdAt?.seconds ?? 0);
    if (sortPosts === "top")    return ((b as any).upvotes ?? 0) - ((a as any).upvotes ?? 0);
    return 0;
  });

  const sortedSaved = [...savedPosts].sort((a, b) => {
    if (sortSaved === "newest") return ((b as any).createdAt?.seconds ?? 0) - ((a as any).createdAt?.seconds ?? 0);
    if (sortSaved === "oldest") return ((a as any).createdAt?.seconds ?? 0) - ((b as any).createdAt?.seconds ?? 0);
    if (sortSaved === "top")    return ((b as any).upvotes ?? 0) - ((a as any).upvotes ?? 0);
    return 0;
  });

  const fetchUsersList = async (type: "followers" | "following") => {
    if (!user) return;
    setModalLoading(true); setModalType(type); setModalUsers([]);
    try {
      const snap = await firestore().collection("follows")
        .where(type === "followers" ? "followingId" : "followerId", "==", user.uid).get();
      const ids = snap.docs.map(d => type === "followers" ? d.data().followerId : d.data().followingId);
      if (ids.length > 0) {
        const userSnaps = await Promise.all(ids.slice(0, 50).map(id => firestore().collection("users").doc(id).get()));
        setModalUsers(userSnaps.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) { console.error(e); }
    finally { setModalLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    const unsubListings = firestore().collection("products").where("sellerId", "==", user.uid)
      .onSnapshot(snap => {
        const p: Product[] = []; snap.forEach(d => p.push({ id: d.id, ...d.data() } as Product));
        setMyListings(p); setLoadingListings(false);
      });
    const unsubPosts = firestore().collection("posts").where("authorId", "==", user.uid)
      .onSnapshot(snap => {
        const p: Post[] = []; snap.forEach(d => p.push({ id: d.id, ...d.data() } as Post));
        setMyPosts(p); setLoadingPosts(false);
      });
    const unsubPlaylist = firestore().collection("saved_posts").where("userId", "==", user.uid)
      .onSnapshot(async snap => {
        if (!snap || snap.empty) { setSavedPosts([]); setLoadingPlaylist(false); return; }
        try {
          const postIds = snap.docs.map(d => d.data().postId).filter(Boolean) as string[];
          if (!postIds.length) { setSavedPosts([]); setLoadingPlaylist(false); return; }
          let all: Post[] = [];
          const postDocs = await Promise.all(
            postIds.map(pid => firestore().collection("posts").doc(pid).get())
          );
          postDocs
            .filter(d => d.exists)
            .forEach(d => all.push({ id: d.id, ...d.data() } as Post));
          all.sort((a, b) => postIds.indexOf(a.id) - postIds.indexOf(b.id));
          setSavedPosts(all);
        } catch { setSavedPosts([]); }
        finally { setLoadingPlaylist(false); }
      }, () => { setSavedPosts([]); setLoadingPlaylist(false); });
    return () => { unsubListings(); unsubPosts(); unsubPlaylist(); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = firestore().collection("notifications")
      .where("userId", "==", user.uid).where("read", "==", false)
      .onSnapshot(snap => setUnreadNotifCount(snap.size), () => setUnreadNotifCount(0));
    return () => unsub();
  }, [user]);

  const handleEditCover = async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access to change your cover."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85, allowsEditing: true, aspect: [3, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    setIsUploadingCover(true);
    try {
      const url = await uploadCoverPhotoMobile(result.assets[0].uri, user.uid);
      await firestore().collection("users").doc(user.uid).update({
        coverPhoto: url, updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch { AppAlert.alert("Upload failed", "Could not update cover photo."); }
    finally { setIsUploadingCover(false); }
  };

  const handleDeletePost = (postId: string) => {
    AppAlert.alert(
      "Delete post?",
      "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore().collection("posts").doc(postId).delete();
            } catch {
              AppAlert.alert("Error", "Could not delete post. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteListing = (productId: string) => {
    AppAlert.alert(
      "Delete listing?",
      "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore().collection("products").doc(productId).delete();
            } catch {
              AppAlert.alert("Error", "Could not delete listing. Please try again.");
            }
          },
        },
      ]
    );
  };

  if (!user || !userData) return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark justify-center items-center">
      <ActivityIndicator color="#14B8A6" />
    </SafeAreaView>
  );

  const nameInitial  = userData.name?.[0]?.toUpperCase() || "?";
  const pillTrackBg  = isDark ? "#1C1C1E" : "#F2F2F7";
  const activePillBg = isDark ? "#2C2C2E" : "#FFFFFF";

  const tabs = [
    { key: "listings" as const, label: "Listings", Icon: Grid,          activeColor: "#14B8A6" },
    { key: "posts"    as const, label: "Posts",    Icon: MessageSquare, activeColor: "#FF375F" },
    { key: "playlist" as const, label: "Saved",    Icon: Bookmark,      activeColor: "#9333EA" },
  ];

  // ── Sort pill configs ─────────────────────────────────────────────────────
  const listingSortOptions: { key: ListingSort; label: string }[] = [
    { key: "newest",     label: "Newest" },
    { key: "oldest",     label: "Oldest" },
    { key: "price_asc",  label: "Price: Low → High" },
    { key: "price_desc", label: "Price: High → Low" },
  ];

  const postSortOptions: { key: PostSort; label: string }[] = [
    { key: "newest", label: "Newest" },
    { key: "oldest", label: "Oldest" },
    { key: "top",    label: "Top" },
  ];

  // Active sort config per tab
  const activeSortOptions = viewMode === "listings" ? listingSortOptions : postSortOptions;
  const activeSort        = viewMode === "listings" ? sortListings : viewMode === "posts" ? sortPosts : sortSaved;
  const activeColor       = viewMode === "listings" ? "#14B8A6" : viewMode === "posts" ? "#FF375F" : "#9333EA";

  const handleSortChange = (key: string) => {
    if (viewMode === "listings") setSortListings(key as ListingSort);
    else if (viewMode === "posts") setSortPosts(key as PostSort);
    else setSortSaved(key as PostSort);
  };

  const renderContent = () => {
    if (viewMode === "listings") {
      if (loadingListings) return <ActivityIndicator color="#14B8A6" style={{ marginTop: 32 }} />;
      if (!sortedListings.length) return (
        <View style={{ alignItems: "center", paddingTop: 48 }}>
          <Grid size={32} color={isDark ? "#2C2C2E" : "#E5E5EA"} />
          <Text variant="bodySmall" className="text-content-tertiary mt-3">No listings yet</Text>
        </View>
      );
      return sortedListings.map(item => (
        <ProductCard key={item.id} product={item} isWishlisted={false}
          onPress={() => router.push(`/product/${item.id}` as any)} onToggleWishlist={() => {}}
          onDelete={() => handleDeleteListing(item.id)} />
      ));
    }
    if (viewMode === "posts") {
      if (loadingPosts) return <ActivityIndicator color="#FF375F" style={{ marginTop: 32 }} />;
      if (!sortedPosts.length) return (
        <View style={{ alignItems: "center", paddingTop: 48 }}>
          <MessageSquare size={32} color={isDark ? "#2C2C2E" : "#E5E5EA"} />
          <Text variant="bodySmall" className="text-content-tertiary mt-3">No posts yet</Text>
        </View>
      );
      return sortedPosts.map(post => (
        <PostCard key={post.id} post={post} hasUpvoted={false}
          onPress={() => router.push(`/post/${post.id}` as any)}
          onDelete={() => handleDeletePost(post.id)} />
      ));
    }
    if (viewMode === "playlist") {
      if (loadingPlaylist) return <ActivityIndicator color="#9333EA" style={{ marginTop: 32 }} />;
      if (!sortedSaved.length) return (
        <View style={{ alignItems: "center", paddingTop: 48 }}>
          <Bookmark size={32} color={isDark ? "#2C2C2E" : "#E5E5EA"} />
          <Text variant="bodySmall" className="text-content-tertiary mt-3">No saved posts yet</Text>
        </View>
      );
      return sortedSaved.map(post => (
        <PostCard key={post.id} post={post} hasUpvoted={false} isSaved={true}
          onPress={() => router.push(`/post/${post.id}` as any)} />
      ));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
      {/* Header */}
      <View className="px-5 py-3 flex-row justify-between items-center" style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}>
        <Text variant="h2" className="text-[22px]">Profile</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <TouchableOpacity onPress={() => router.push("/wishlist" as any)} className="p-2.5 rounded-full">
            <Heart size={20} color="#FF375F" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/notifications" as any)} className="p-2.5 rounded-full" style={{ position: "relative" }}>
            <Bell size={20} color={iconColor} />
            {unreadNotifCount > 0 && (
              <View style={{
                position: "absolute", top: 2, right: 2,
                backgroundColor: "#F43F5E", borderRadius: 999,
                minWidth: 14, height: 14, paddingHorizontal: 3,
                alignItems: "center", justifyContent: "center",
                borderWidth: 1.5, borderColor: cardBg,
              }}>
                <Text style={{ color: "#fff", fontSize: 8, fontFamily: "Inter_600SemiBold", lineHeight: 11 }}>
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/settings" as any)} className="p-2.5 rounded-full">
            <Settings size={20} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 bg-surface dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── Cover ── */}
        <View style={{ height: COVER_HEIGHT, position: "relative" }}>
          {userData.coverPhoto ? (
            <Image source={{ uri: userData.coverPhoto }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={isDark ? ["#0D3D38", "#3D1A28"] : ["#CCFBF1", "#FBD9E2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          )}
          {/* Edit pill */}
          <TouchableOpacity
            onPress={handleEditCover}
            activeOpacity={0.8}
            style={{
              position: "absolute", bottom: 10, right: 12,
              backgroundColor: "rgba(0,0,0,0.50)",
              borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5,
              flexDirection: "row", alignItems: "center", gap: 5,
            }}
          >
            {isUploadingCover
              ? <ActivityIndicator size="small" color="#fff" />
              : <Camera size={13} color="#fff" />
            }
            <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
              {isUploadingCover ? "Uploading…" : "Edit cover"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Profile card ── */}
        <View style={{ backgroundColor: cardBg, paddingBottom: 4 }}>
          {/* Avatar — half overlaps cover */}
          <View style={{ paddingHorizontal: 20, marginTop: -(AVATAR_SIZE / 2 + 2), marginBottom: 12 }}>
            <View style={{
              width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
              borderWidth: 3, borderColor: cardBg,
              overflow: "hidden", backgroundColor: softBg,
              alignItems: "center", justifyContent: "center",
            }}>
              {userData.profilePicture ? (
                <Image source={{ uri: userData.profilePicture }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : (
                <Text variant="h1" className="text-content-secondary">{nameInitial}</Text>
              )}
              {userData.verified && (
                <View style={{
                  position: "absolute", bottom: 2, right: 2,
                  backgroundColor: "#14B8A6", borderRadius: 999, padding: 3,
                  borderWidth: 2, borderColor: cardBg,
                }}>
                  <ShieldCheck size={10} color="#FFF" />
                </View>
              )}
            </View>
          </View>

          {/* Name + meta */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <Text variant="h2" className="dark:text-ink-dark text-[22px]">{userData.name}</Text>
              {userData.verified && <ShieldCheck size={15} color="#14B8A6" />}
            </View>
            {userData.username && (
              <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint mb-1">
                @{userData.username}
              </Text>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <MapPin size={13} color="#8E8E93" />
              <Text variant="caption" className="text-content-tertiary ml-1">
                {userData.school}{userData.city ? ` · ${userData.city}` : ""}
              </Text>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 28 }}>
              {[
                { label: "Followers", value: followersCount, onPress: () => fetchUsersList("followers") },
                { label: "Following", value: followingCount, onPress: () => fetchUsersList("following") },
                { label: "Listings",  value: myListings.length },
                { label: "Posts",     value: myPosts.length },
              ].map(({ label, value, onPress }) => (
                <TouchableOpacity key={label} onPress={onPress} activeOpacity={onPress ? 0.6 : 1} style={{ alignItems: "center" }}>
                  <Text variant="h3" className="dark:text-ink-dark font-bold" style={{ fontSize: 18 }}>{value}</Text>
                  <Text variant="caption" className="text-content-secondary" style={{ fontSize: 11, marginTop: 2 }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Pill tabs ── */}
        <View style={{ flexDirection: "row", marginHorizontal: 20, marginTop: 12, marginBottom: 4, borderRadius: 12, padding: 4, backgroundColor: pillTrackBg }}>
          {tabs.map(({ key, label, Icon, activeColor: tabColor }) => {
            const isActive = viewMode === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setViewMode(key)}
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                  paddingVertical: 9, borderRadius: 9, gap: 6,
                  backgroundColor: isActive ? activePillBg : "transparent",
                }}
              >
                <Icon size={15} color={isActive ? tabColor : "#8E8E93"} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: isActive ? tabColor : "#8E8E93" }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Sort pills ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            gap: 8,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <SlidersHorizontal size={15} color={isDark ? "#636366" : "#8E8E93"} style={{ marginRight: 2 }} />
          {activeSortOptions.map(({ key, label }) => {
            const isActive = activeSort === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => handleSortChange(key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: isActive ? activeColor : borderColor,
                  backgroundColor: isActive
                    ? `${activeColor}18`
                    : softBg,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color: isActive ? activeColor : isDark ? "#8E8E93" : "#636366",
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Content */}
        <View style={{ paddingTop: 8 }}>
          {renderContent()}
        </View>
      </ScrollView>

      {/* Followers / Following modal */}
      <Modal visible={modalType !== null} transparent animationType="slide" onRequestClose={() => setModalType(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.50)" }}>
          <View style={{ backgroundColor: cardBg, height: "80%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text variant="h2" style={{ fontSize: 20 }}>{modalType === "followers" ? "Followers" : "Following"}</Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={{ padding: 8, backgroundColor: softBg, borderRadius: 999 }}>
                <X size={18} color={iconColor} />
              </TouchableOpacity>
            </View>
            {modalLoading
              ? <ActivityIndicator color="#14B8A6" style={{ marginTop: 32 }} />
              : modalUsers.length === 0
                ? <View style={{ alignItems: "center", paddingTop: 48 }}>
                    <Text variant="caption" className="text-content-tertiary">
                      {modalType === "followers" ? "No followers yet." : "Not following anyone yet."}
                    </Text>
                  </View>
                : <ScrollView showsVerticalScrollIndicator={false}>
                    {modalUsers.map(u => (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => { setModalType(null); router.push(`/profile/${u.id}` as any); }}
                        style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor }}
                      >
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: softBg, alignItems: "center", justifyContent: "center", marginRight: 12, overflow: "hidden" }}>
                          {u.profilePicture
                            ? <Image source={{ uri: u.profilePicture }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                            : <Text variant="h4" className="text-content-secondary">{u.name?.[0]?.toUpperCase() || "?"}</Text>
                          }
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Text variant="label" style={{ fontFamily: "Inter_600SemiBold" }}>{u.name}</Text>
                            {u.verified && <ShieldCheck size={13} color="#14B8A6" />}
                          </View>
                          {u.username && <Text variant="caption" className="text-content-tertiary">@{u.username}</Text>}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
            }
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}