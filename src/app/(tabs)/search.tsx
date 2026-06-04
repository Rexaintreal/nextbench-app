/**
 * Search Screen
 *
 * Full search with tabs: Top | Users | Clubs | Posts | Marketplace
 * Shows trending posts when search is empty.
 * Debounced query, username @ prefix search, suggestion mode.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  useColorScheme,
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
  ShieldCheck,
  TrendingUp,
  Flame,
  Zap,
  Eye,
  Activity,
  Heart,
  MessageCircle,
  ShoppingBag,
} from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";
import { useFollowingIds, followUser, unfollowUser } from "@/lib/follows";
import { joinClub } from "@/lib/clubs";
import { useTrending } from "@/lib/useTrending";
import { ScoredPost, formatRelativeTime } from "@/lib/trending";

type SearchTab = "all" | "users" | "clubs" | "posts" | "products";

// ─── Trending Post Item ─────────────────────────────────────
function TrendingPostItem({ post, index, onPress }: { post: ScoredPost; index: number; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const labelConfig: Record<string, { color: string; bg: string }> = {
    '⚡ Exploding': { color: '#F59E0B', bg: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)' },
    '🔥 Heating Up': { color: '#EF4444', bg: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' },
    '👀 Everyone\'s Watching': { color: '#8B5CF6', bg: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)' },
    '📈 Trending in Your School': { color: '#0071E3', bg: isDark ? 'rgba(0,113,227,0.12)' : 'rgba(0,113,227,0.08)' },
    '🌆 Trending in Your City': { color: '#10B981', bg: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)' },
  };

  const label = post.trendLabel ? labelConfig[post.trendLabel] : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-start py-3"
    >
      {/* Rank Number */}
      <View className="w-7 items-center pt-0.5">
        <Text variant="h4" className={`text-[16px] ${index < 3 ? 'text-brand-teal' : 'text-content-tertiary'}`}>
          {index + 1}
        </Text>
      </View>

      {/* Content */}
      <View className="flex-1 ml-2">
        <Text variant="label" className="font-sans-semibold mb-1" numberOfLines={2}>
          {post.title || post.content.substring(0, 80)}
        </Text>

        <View className="flex-row items-center gap-3 mb-1">
          <Text variant="caption" className="text-content-tertiary text-[12px]">
            {post.authorName}
          </Text>
          <Text variant="caption" className="text-content-tertiary text-[12px]">
            {formatRelativeTime(post.createdAt)}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <Heart size={12} color="#8E8E93" />
            <Text variant="caption" className="text-content-tertiary text-[12px]">{post.upvotesCount}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <MessageCircle size={12} color="#8E8E93" />
            <Text variant="caption" className="text-content-tertiary text-[12px]">{post.repliesCount}</Text>
          </View>
          {post.trendLabel && label && (
            <View className="px-2 py-0.5 rounded-md" style={{ backgroundColor: label.bg }}>
              <Text variant="caption" className="text-[10px] font-sans-semibold" style={{ color: label.color }}>
                {post.trendLabel}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Search Screen ─────────────────────────────────────

export default function SearchScreen() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { followingIds } = useFollowingIds();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("all");

  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Trending data
  const { schoolTrending, cityTrending, trendingProduct, activeToday, loading: trendingLoading } = useTrending();
  const [trendingTab, setTrendingTab] = useState<'school' | 'city'>('school');
  const currentTrending = trendingTab === 'school' ? schoolTrending : cityTrending;

  // Suggestion cache
  const [suggestionsFetched, setSuggestionsFetched] = useState(false);
  const suggestedUsersRef = useRef<any[]>([]);
  const suggestedPostsRef = useRef<any[]>([]);
  const suggestedProductsRef = useRef<any[]>([]);
  const suggestedClubsRef = useRef<any[]>([]);

  const isSearching = searchQuery.trim().length > 0;

  // Debounced search
  useEffect(() => {
    if (!isSearching) {
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

  const tabs: { key: SearchTab; label: string }[] = [
    { key: "all", label: "Top" },
    { key: "users", label: "Users" },
    { key: "clubs", label: "Clubs" },
    { key: "posts", label: "Posts" },
    { key: "products", label: "Market" },
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
      <View className="px-5 pt-3 pb-2 border-b border-surface-soft dark:border-surface-dark-secondary">
        {/* Search Input */}
        <View className="relative mb-2.5">
          <View className="absolute left-3.5 top-0 bottom-0 justify-center z-10">
            <SearchIcon size={16} color="#8E8E93" />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search users, posts, products..."
            placeholderTextColor="#8E8E93"
            className="bg-surface-soft dark:bg-surface-dark-secondary rounded-xl py-2.5 pl-10 pr-4 text-content dark:text-content-dark text-[15px]"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4 }}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`px-3 py-2 rounded-lg ${
                activeTab === tab.key
                  ? "bg-content dark:bg-content-dark"
                  : ""
              }`}
            >
              <Text
                variant="caption"
                className={`text-[12px] font-sans-semibold ${
                  activeTab === tab.key
                    ? "text-white dark:text-black"
                    : "text-content-tertiary"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      {loading && !isSearching && trendingLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0071E3" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ TRENDING SECTION (shown when not searching) ═══ */}
          {!isSearching && (activeTab === 'all' || activeTab === 'posts') && (
            <View className="mx-5 mt-4 mb-2">
              {/* Trending Header */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <TrendingUp size={18} color={isDark ? '#0A84FF' : '#0071E3'} />
                  <Text variant="h4">Trending Now</Text>
                </View>
                {activeToday > 0 && (
                  <View className="flex-row items-center gap-1 bg-brand-mint/10 px-2 py-1 rounded-md">
                    <Activity size={11} color="#34C759" />
                    <Text variant="caption" className="text-brand-mint text-[11px] font-sans-semibold">
                      {activeToday} active today
                    </Text>
                  </View>
                )}
              </View>

              {/* School / City Toggle */}
              <View className="flex-row bg-surface-soft dark:bg-surface-dark-secondary rounded-lg p-0.5 mb-3">
                <TouchableOpacity
                  onPress={() => setTrendingTab('school')}
                  className={`flex-1 py-2 rounded-md items-center ${
                    trendingTab === 'school' ? 'bg-surface dark:bg-surface-elevated shadow-sm' : ''
                  }`}
                >
                  <Text variant="caption" className={`text-[12px] ${
                    trendingTab === 'school' ? 'font-sans-semibold text-content dark:text-content-dark' : 'text-content-tertiary'
                  }`}>
                    {userData?.school || 'School'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTrendingTab('city')}
                  className={`flex-1 py-2 rounded-md items-center ${
                    trendingTab === 'city' ? 'bg-surface dark:bg-surface-elevated shadow-sm' : ''
                  }`}
                >
                  <Text variant="caption" className={`text-[12px] ${
                    trendingTab === 'city' ? 'font-sans-semibold text-content dark:text-content-dark' : 'text-content-tertiary'
                  }`}>
                    {userData?.city || 'City'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Trending Posts List */}
              {trendingLoading ? (
                <ActivityIndicator color="#0071E3" className="my-4" />
              ) : currentTrending.length === 0 ? (
                <View className="items-center py-6">
                  <TrendingUp size={28} color={isDark ? '#2C2C2E' : '#E5E5EA'} />
                  <Text variant="caption" className="text-content-tertiary mt-2 text-center">
                    {trendingTab === 'school'
                      ? 'No trending posts in your school yet'
                      : 'No trending posts in your city yet'}
                  </Text>
                </View>
              ) : (
                <View>
                  {currentTrending.map((post, index) => (
                    <TrendingPostItem
                      key={post.id}
                      post={post}
                      index={index}
                      onPress={() => router.push(`/post/${post.id}` as any)}
                    />
                  ))}
                </View>
              )}

              {/* Trending Product */}
              {trendingProduct && (
                <TouchableOpacity
                  onPress={() => router.push(`/product/${trendingProduct.id}` as any)}
                  activeOpacity={0.7}
                  className="mt-2 bg-surface-soft dark:bg-surface-dark-secondary rounded-xl p-3 flex-row items-center"
                >
                  <View className="w-12 h-12 rounded-lg bg-surface dark:bg-surface-elevated overflow-hidden mr-3">
                    {trendingProduct.image ? (
                      <Image source={{ uri: trendingProduct.image }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <ShoppingBag size={18} color="#8E8E93" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text variant="caption" className="text-brand-teal font-sans-semibold text-[11px] mb-0.5">
                      🛍️ Hot Product
                    </Text>
                    <Text variant="label" className="font-sans-semibold" numberOfLines={1}>
                      {trendingProduct.title}
                    </Text>
                    <Text variant="caption" className="text-content-tertiary text-[12px]">
                      ₹{trendingProduct.price} · {trendingProduct.sellerName}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Divider */}
              <View className="h-[0.5px] mt-4" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
            </View>
          )}

          {/* ═══ SEARCH RESULTS / SUGGESTIONS ═══ */}

          {loading ? (
            <View className="items-center justify-center py-12">
              <ActivityIndicator color="#0071E3" />
            </View>
          ) : !hasResults && isSearching ? (
            <View className="items-center justify-center pt-16 px-6">
              <SearchIcon size={40} color={isDark ? '#2C2C2E' : '#E5E5EA'} />
              <Text
                variant="h4"
                className="text-content-secondary mt-4 text-center"
              >
                No results for "{searchQuery}"
              </Text>
              <Text variant="caption" className="text-content-tertiary mt-2 text-center">
                Try a different keyword
              </Text>
            </View>
          ) : (
            <>
              {/* USERS SECTION */}
              {(activeTab === "all" || activeTab === "users") &&
                users.length > 0 && (
                  <View className="mx-5 mt-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text variant="h4">
                        People
                      </Text>
                      {activeTab === "all" && users.length > 3 && (
                        <TouchableOpacity onPress={() => setActiveTab("users")}>
                          <Text
                            variant="caption"
                            className="text-brand-teal font-sans-semibold text-[12px]"
                          >
                            See all
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
                            className="flex-row items-center justify-between py-2.5"
                          >
                            <View className="flex-row items-center flex-1 mr-3">
                              <View className="w-11 h-11 rounded-full bg-surface-soft dark:bg-surface-dark-secondary items-center justify-center mr-3 overflow-hidden">
                                {u.profilePicture ? (
                                  <Image
                                    source={{ uri: u.profilePicture }}
                                    className="w-full h-full"
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <Text
                                    variant="label"
                                    className="text-content-secondary font-sans-semibold"
                                  >
                                    {u.name?.[0]?.toUpperCase() || "?"}
                                  </Text>
                                )}
                              </View>
                              <View className="flex-1">
                                <View className="flex-row items-center gap-1">
                                  <Text
                                    variant="label"
                                    className="font-sans-semibold"
                                    numberOfLines={1}
                                  >
                                    {u.name}
                                  </Text>
                                  {u.verified && (
                                    <ShieldCheck
                                      size={13}
                                      color="#0071E3"
                                    />
                                  )}
                                </View>
                                {u.username && (
                                  <Text
                                    variant="caption"
                                    className="text-content-tertiary text-[12px]"
                                  >
                                    @{u.username}
                                  </Text>
                                )}
                                <Text
                                  variant="caption"
                                  className="text-content-tertiary text-[11px]"
                                  numberOfLines={1}
                                >
                                  {u.school}
                                </Text>
                              </View>
                            </View>
                            {user?.uid !== u.id && (
                              <TouchableOpacity
                                onPress={() => handleToggleFollow(u.id)}
                                className={`px-4 py-2 rounded-lg ${
                                  isFollowingUser
                                    ? "bg-surface-soft dark:bg-surface-dark-secondary"
                                    : "bg-content dark:bg-content-dark"
                                }`}
                              >
                                <Text
                                  variant="caption"
                                  className={`text-[12px] font-sans-semibold ${
                                    isFollowingUser
                                      ? "text-content-tertiary"
                                      : "text-white dark:text-black"
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
                  <View className="mx-5 mt-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text variant="h4">
                        Clubs
                      </Text>
                      {activeTab === "all" && clubs.length > 3 && (
                        <TouchableOpacity
                          onPress={() => setActiveTab("clubs")}
                        >
                          <Text
                            variant="caption"
                            className="text-brand-teal font-sans-semibold text-[12px]"
                          >
                            See all
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
                            className="flex-row items-center justify-between py-2.5"
                          >
                            <View className="flex-row items-center flex-1 mr-3">
                              <View className="w-11 h-11 rounded-xl bg-brand-mint/10 items-center justify-center mr-3 overflow-hidden">
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
                                  className="font-sans-semibold"
                                  numberOfLines={1}
                                >
                                  {c.name}
                                </Text>
                                <Text
                                  variant="caption"
                                  className="text-content-tertiary text-[12px]"
                                  numberOfLines={1}
                                >
                                  {c.description || "No description"}
                                </Text>
                                <Text
                                  variant="caption"
                                  className="text-content-tertiary text-[11px]"
                                >
                                  {c.memberCount || 0} member
                                  {(c.memberCount || 0) !== 1 ? "s" : ""}
                                  {c.school ? ` · ${c.school}` : ""}
                                </Text>
                              </View>
                            </View>
                            {isMember ? (
                              <View className="px-4 py-2 rounded-lg bg-brand-mint/10">
                                <Text
                                  variant="caption"
                                  className="text-brand-mint text-[12px] font-sans-semibold"
                                >
                                  Joined
                                </Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                onPress={() => handleJoinClub(c.id)}
                                className="px-4 py-2 rounded-lg bg-content dark:bg-content-dark"
                              >
                                <Text
                                  variant="caption"
                                  className="text-white dark:text-black text-[12px] font-sans-semibold"
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
                      <View className="px-5 mb-2">
                        <Text variant="h4">
                          Posts
                        </Text>
                      </View>
                    )}
                    {(activeTab === "all" ? posts.slice(0, 3) : posts).map(
                      (p) => (
                        <PostCard
                          key={`search-post-${p.id}`}
                          post={p as Post}
                          hasUpvoted={false}
                          onPress={() => router.push(`/post/${p.id}` as any)}
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
                      <View className="px-5 mb-2">
                        <Text variant="h4">
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
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
