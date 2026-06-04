/**
 * Search Screen
 *
 * Full search with tabs: Top | Users | Clubs | Posts | Marketplace
 * Debounced query, username @ prefix search, suggestion mode.
 *
 * Ported from web: temp_web_repo/src/pages/Dashboard/Search.tsx
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import PostCard, { Post } from "@/components/ui/PostCard";
import ProductCard, { Product } from "@/components/ui/ProductCard";
import { useAuth } from "@/providers/AuthProvider";
import {
  Search as SearchIcon,
  Users,
  Grid3X3,
  Package,
  Globe,
  User,
  ShieldCheck,
} from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";
import { useFollowingIds, followUser, unfollowUser } from "@/lib/follows";
import { joinClub } from "@/lib/clubs";

type SearchTab = "all" | "users" | "clubs" | "posts" | "products";

export default function SearchScreen() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { followingIds } = useFollowingIds();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");

  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Suggestion cache
  const [suggestionsFetched, setSuggestionsFetched] = useState(false);
  const suggestedUsersRef = useRef<any[]>([]);
  const suggestedPostsRef = useRef<any[]>([]);
  const suggestedProductsRef = useRef<any[]>([]);
  const suggestedClubsRef = useRef<any[]>([]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show suggestions when search is empty
      if (!suggestionsFetched) {
        const fetchSuggestions = async () => {
          setLoading(true);
          try {
            const [usersSnap, postsSnap, productsSnap, clubsSnap] =
              await Promise.all([
                firestore().collection("users").limit(5).get(),
                firestore().collection("posts").limit(5).get(),
                firestore().collection("products").limit(5).get(),
                firestore()
                  .collection("clubs")
                  .where("type", "==", "public")
                  .limit(5)
                  .get(),
              ]);

            const fetchedUsers = usersSnap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            const fetchedPosts = postsSnap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            const fetchedProducts = productsSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((p: any) => p.status !== "sold");
            const fetchedClubs = clubsSnap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));

            suggestedUsersRef.current = fetchedUsers;
            suggestedPostsRef.current = fetchedPosts;
            suggestedProductsRef.current = fetchedProducts;
            suggestedClubsRef.current = fetchedClubs;

            setUsers(fetchedUsers);
            setPosts(fetchedPosts);
            setProducts(fetchedProducts);
            setClubs(fetchedClubs);
            setSuggestionsFetched(true);
          } catch (err) {
            console.error("Failed to load suggestions:", err);
          } finally {
            setLoading(false);
          }
        };
        fetchSuggestions();
      } else {
        setUsers(suggestedUsersRef.current);
        setPosts(suggestedPostsRef.current);
        setProducts(suggestedProductsRef.current);
        setClubs(suggestedClubsRef.current);
        setLoading(false);
      }
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        if (searchQuery.trim().startsWith("@")) {
          // Username search
          const usernamePrefix = searchQuery
            .trim()
            .substring(1)
            .toLowerCase();
          const usersSnap = await firestore()
            .collection("users")
            .where("username", ">=", usernamePrefix)
            .where("username", "<=", usernamePrefix + "\uf8ff")
            .limit(20)
            .get();
          setUsers(
            usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
          setPosts([]);
          setProducts([]);
          setClubs([]);
          setActiveTab("users");
          return;
        }

        const [usersSnap, postsSnap, productsSnap, clubsSnap] =
          await Promise.all([
            firestore().collection("users").limit(20).get(),
            firestore().collection("posts").limit(20).get(),
            firestore().collection("products").limit(20).get(),
            firestore()
              .collection("clubs")
              .where("type", "==", "public")
              .limit(20)
              .get(),
          ]);

        const lowerQ = searchQuery.toLowerCase();

        setUsers(
          usersSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as any))
            .filter(
              (u: any) =>
                u.name?.toLowerCase().includes(lowerQ) ||
                u.school?.toLowerCase().includes(lowerQ) ||
                u.username?.toLowerCase().includes(lowerQ)
            )
        );
        setPosts(
          postsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as any))
            .filter(
              (p: any) =>
                p.title?.toLowerCase().includes(lowerQ) ||
                p.content?.toLowerCase().includes(lowerQ) ||
                p.school?.toLowerCase().includes(lowerQ)
            )
        );
        setProducts(
          productsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as any))
            .filter((p: any) => p.status !== "sold")
            .filter(
              (p: any) =>
                p.title?.toLowerCase().includes(lowerQ) ||
                p.category?.toLowerCase().includes(lowerQ) ||
                p.sellerName?.toLowerCase().includes(lowerQ) ||
                (p.tags &&
                  p.tags.some((tag: string) =>
                    tag.toLowerCase().includes(lowerQ)
                  ))
            )
        );
        setClubs(
          clubsSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as any))
            .filter(
              (c: any) =>
                c.name?.toLowerCase().includes(lowerQ) ||
                c.description?.toLowerCase().includes(lowerQ) ||
                c.school?.toLowerCase().includes(lowerQ) ||
                c.city?.toLowerCase().includes(lowerQ)
            )
        );
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      performSearch();
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, suggestionsFetched]);

  const handleToggleFollow = async (targetId: string) => {
    if (!user) return;
    if (!userData?.verified) {
      Alert.alert("Verification Required", "You must be verified to follow users.");
      return;
    }
    try {
      if (followingIds.has(targetId)) {
        await unfollowUser(user.uid, targetId);
      } else {
        await followUser(user.uid, targetId);
      }
    } catch (err) {
      console.error("Follow toggle error:", err);
    }
  };

  const handleJoinClub = async (clubId: string) => {
    if (!user) return;
    if (!userData?.verified) {
      Alert.alert("Verification Required", "You must be verified to join clubs.");
      return;
    }
    try {
      await joinClub(user.uid, clubId);
      Alert.alert("Welcome!", "You've joined the club.");
      // Optimistic update
      setClubs((prev) =>
        prev.map((c) =>
          c.id === clubId
            ? {
                ...c,
                memberIds: [...(c.memberIds || []), user.uid],
                memberCount: (c.memberCount || 0) + 1,
              }
            : c
        )
      );
    } catch (err) {
      Alert.alert("Error", "Failed to join club.");
    }
  };

  const tabs: { key: SearchTab; label: string; color: string }[] = [
    { key: "all", label: "Top", color: "#1D1D1F" },
    { key: "users", label: "Users", color: "#0071E3" },
    { key: "clubs", label: "Clubs", color: "#34C759" },
    { key: "posts", label: "Posts", color: "#F77CA2" },
    { key: "products", label: "Market", color: "#F59E0B" },
  ];

  const hasResults =
    users.length > 0 ||
    posts.length > 0 ||
    products.length > 0 ||
    clubs.length > 0;

  return (
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["top"]}
    >
      {/* Header */}
      <View className="px-5 pt-4 pb-2 bg-surface/90 border-b border-brand-teal/5">
        {/* Search Input */}
        <View className="relative mb-3">
          <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
            <SearchIcon size={18} color="#8E8E93" />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search users, posts, products..."
            placeholderTextColor="#8E8E93"
            className="bg-surface-soft rounded-xl py-3 pl-10 pr-4 text-content font-medium"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 16 }}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`py-2 border-b-2 ${
                activeTab === tab.key
                  ? "border-b-2"
                  : "border-transparent"
              }`}
              style={
                activeTab === tab.key
                  ? { borderBottomColor: tab.color }
                  : undefined
              }
            >
              <Text
                variant="label"
                className={`text-[11px] uppercase tracking-widest font-bold ${
                  activeTab === tab.key
                    ? ""
                    : "text-content-tertiary"
                }`}
                style={
                  activeTab === tab.key ? { color: tab.color } : undefined
                }
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0071E3" />
        </View>
      ) : !hasResults ? (
        <View className="flex-1 items-center justify-center px-6">
          <SearchIcon size={48} color="#E5E5E7" />
          <Text
            variant="h3"
            className="text-content-secondary mt-4 text-center"
          >
            {searchQuery
              ? `No results for "${searchQuery}"`
              : "Start searching"}
          </Text>
          <Text variant="caption" className="text-content-tertiary mt-2 text-center">
            Try searching for a user, school, or item
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* USERS SECTION */}
          {(activeTab === "all" || activeTab === "users") &&
            users.length > 0 && (
              <View className="mx-4 mt-4 bg-surface-card rounded-2xl p-4 border border-brand-teal/5 shadow-sm">
                <View className="flex-row items-center justify-between mb-3">
                  <Text variant="h3" className="font-serif italic">
                    People
                  </Text>
                  {activeTab === "all" && users.length > 3 && (
                    <TouchableOpacity onPress={() => setActiveTab("users")}>
                      <Text
                        variant="caption"
                        className="text-brand-teal font-bold uppercase tracking-widest text-[10px]"
                      >
                        See all →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {(activeTab === "all" ? users.slice(0, 3) : users).map(
                  (u) => {
                    const isFollowingUser = followingIds.has(u.id);
                    return (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() =>
                          router.push(`/profile/${u.id}` as any)
                        }
                        className="flex-row items-center justify-between py-3"
                      >
                        <View className="flex-row items-center flex-1 mr-3">
                          <View className="w-11 h-11 rounded-full bg-brand-teal/10 items-center justify-center mr-3 overflow-hidden border border-brand-teal/5">
                            {u.profilePicture ? (
                              <Image
                                source={{ uri: u.profilePicture }}
                                className="w-full h-full"
                                resizeMode="cover"
                              />
                            ) : (
                              <Text
                                variant="label"
                                className="text-brand-teal font-bold"
                              >
                                {u.name?.[0]?.toUpperCase() || "?"}
                              </Text>
                            )}
                          </View>
                          <View className="flex-1">
                            <View className="flex-row items-center gap-1">
                              <Text
                                variant="label"
                                className="font-bold"
                                numberOfLines={1}
                              >
                                {u.name}
                              </Text>
                              {u.verified && (
                                <ShieldCheck
                                  size={12}
                                  color="#0071E3"
                                />
                              )}
                            </View>
                            {u.username && (
                              <Text
                                variant="caption"
                                className="text-content-tertiary text-[11px]"
                              >
                                @{u.username}
                              </Text>
                            )}
                            <Text
                              variant="caption"
                              className="text-content-tertiary text-[10px] uppercase tracking-widest font-bold"
                              numberOfLines={1}
                            >
                              {u.school}
                            </Text>
                          </View>
                        </View>
                        {user?.uid !== u.id && (
                          <TouchableOpacity
                            onPress={() => handleToggleFollow(u.id)}
                            className={`px-4 py-2 rounded-xl ${
                              isFollowingUser
                                ? "bg-surface-soft"
                                : "bg-content"
                            }`}
                          >
                            <Text
                              variant="caption"
                              className={`text-[10px] font-bold uppercase tracking-widest ${
                                isFollowingUser
                                  ? "text-content-tertiary"
                                  : "text-white"
                              }`}
                            >
                              {isFollowingUser ? "Following" : "Follow"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            )}

          {/* CLUBS SECTION */}
          {(activeTab === "all" || activeTab === "clubs") &&
            clubs.length > 0 && (
              <View className="mx-4 mt-4 bg-surface-card rounded-2xl p-4 border border-brand-teal/5 shadow-sm">
                <View className="flex-row items-center justify-between mb-3">
                  <Text variant="h3" className="font-serif italic">
                    Clubs
                  </Text>
                  {activeTab === "all" && clubs.length > 3 && (
                    <TouchableOpacity
                      onPress={() => setActiveTab("clubs")}
                    >
                      <Text
                        variant="caption"
                        className="text-green-500 font-bold uppercase tracking-widest text-[10px]"
                      >
                        See all →
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {(activeTab === "all" ? clubs.slice(0, 3) : clubs).map(
                  (c) => {
                    const isMember =
                      user && c.memberIds?.includes(user.uid);
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => {
                          // TODO: Navigate to club chat when implemented
                        }}
                        className="flex-row items-center justify-between py-3"
                      >
                        <View className="flex-row items-center flex-1 mr-3">
                          <View className="w-11 h-11 rounded-xl bg-green-500/10 items-center justify-center mr-3 overflow-hidden border border-green-500/5">
                            {c.avatar ? (
                              <Image
                                source={{ uri: c.avatar }}
                                className="w-full h-full"
                                resizeMode="cover"
                              />
                            ) : (
                              <Users size={18} color="#34C759" />
                            )}
                          </View>
                          <View className="flex-1">
                            <Text
                              variant="label"
                              className="font-bold"
                              numberOfLines={1}
                            >
                              {c.name}
                            </Text>
                            <Text
                              variant="caption"
                              className="text-content-tertiary text-[11px]"
                              numberOfLines={1}
                            >
                              {c.description || "No description"}
                            </Text>
                            <Text
                              variant="caption"
                              className="text-content-tertiary text-[10px] uppercase tracking-widest font-bold"
                            >
                              {c.memberCount || 0} member
                              {(c.memberCount || 0) !== 1 ? "s" : ""}
                              {c.school ? ` • ${c.school}` : ""}
                            </Text>
                          </View>
                        </View>
                        {isMember ? (
                          <View className="px-4 py-2 rounded-xl bg-green-500/10">
                            <Text
                              variant="caption"
                              className="text-green-500 text-[10px] font-bold uppercase tracking-widest"
                            >
                              Joined
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleJoinClub(c.id)}
                            className="px-4 py-2 rounded-xl bg-content"
                          >
                            <Text
                              variant="caption"
                              className="text-white text-[10px] font-bold uppercase tracking-widest"
                            >
                              Join
                            </Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            )}

          {/* POSTS SECTION */}
          {(activeTab === "all" || activeTab === "posts") &&
            posts.length > 0 && (
              <View className="mt-4">
                {activeTab === "all" && (
                  <View className="px-6 mb-2">
                    <Text variant="h3" className="font-serif italic">
                      Community Posts
                    </Text>
                  </View>
                )}
                {(activeTab === "all" ? posts.slice(0, 3) : posts).map(
                  (p) => (
                    <PostCard
                      key={`search-post-${p.id}`}
                      post={p as Post}
                      hasUpvoted={false}
                      onPress={() => {}}
                    />
                  )
                )}
              </View>
            )}

          {/* PRODUCTS SECTION */}
          {(activeTab === "all" || activeTab === "products") &&
            products.length > 0 && (
              <View className="mt-4">
                {activeTab === "all" && (
                  <View className="px-6 mb-2">
                    <Text variant="h3" className="font-serif italic">
                      Marketplace
                    </Text>
                  </View>
                )}
                {(activeTab === "all"
                  ? products.slice(0, 3)
                  : products
                ).map((p) => (
                  <ProductCard
                    key={`search-prod-${p.id}`}
                    product={p as Product}
                    isWishlisted={false}
                    onPress={() =>
                      router.push(`/product/${p.id}` as any)
                    }
                    onToggleWishlist={() => {}}
                  />
                ))}
              </View>
            )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
