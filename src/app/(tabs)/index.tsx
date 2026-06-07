import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, FlatList, RefreshControl, TouchableOpacity, Image, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import PostCard, { Post } from "@/components/ui/PostCard";
import ProductCard, { Product } from "@/components/ui/ProductCard";
import { useAuth } from "@/providers/AuthProvider";
import firestore from "@react-native-firebase/firestore";
import { toggleUpvote, toggleWishlist, toggleSavePost } from "@/lib/social";
import { FeedSkeleton } from "@/components/ui/SkeletonCard";
import { Bell, Moon, Sun, Feather } from "lucide-react-native";
import { useTheme } from "@/providers/ThemeProvider";
import { useFollowingIds } from "@/lib/follows";

type FeedItem = 
  | { type: 'post'; data: Post & { feedScore?: number }; timestamp: number }
  | { type: 'product'; data: Product; timestamp: number };

export default function FeedScreen() {
  const { user, userData } = useAuth();
  const { followingIds } = useFollowingIds();
  
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [rawPosts, setRawPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [upvotedPostIds, setUpvotedPostIds] = useState<Set<string>>(new Set());
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());

  const [contentType, setContentType] = useState<'all' | 'posts' | 'marketplace' | 'for-you'>('all');
  const { colorScheme, isDark, toggleTheme } = useTheme();
  

  // Listen to approved posts
  useEffect(() => {
    const userCache: Record<string, any> = {};

    const unsubscribe = firestore()
      .collection('posts')
      .where('status', '==', 'approved')
      .onSnapshot(async (snapshot) => {
        if (!snapshot) return;
        try {
          const uncachedIds = new Set<string>();
          snapshot.forEach(docSnap => {
            const authorId = docSnap.data().authorId;
            if (authorId && !userCache[authorId]) uncachedIds.add(authorId);
          });

          if (uncachedIds.size > 0) {
            const promises = Array.from(uncachedIds).map(async (uid) => {
              const uDoc = await firestore().collection('users').doc(uid).get();
              if (uDoc.data()) userCache[uid] = uDoc.data();
              else userCache[uid] = {};
            });
            await Promise.all(promises);
          }

          const fetchedPosts: Post[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const authorData = userCache[data.authorId] || {};
            
            fetchedPosts.push({
              id: docSnap.id,
              ...data,
              authorName: authorData.name || data.authorName || 'Unknown User',
              authorProfilePicture: authorData.profilePicture || data.authorProfilePicture || null,
              school: authorData.school || data.school || 'Unknown School',
            } as Post);
          });
          setRawPosts(fetchedPosts);
        } catch (err) {
          console.error("Error fetching posts:", err);
        } finally {
          setLoadingPosts(false);
        }
      });

    return () => unsubscribe();
  }, []);

  // Listen to products
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('products')
      .where('status', 'in', ['available', 'sold'])
      .onSnapshot((snapshot) => {
        if (!snapshot) return;
        try {
          const fetchedProducts: Product[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            fetchedProducts.push({
              id: docSnap.id,
              ...data,
              sellerName: data.sellerName || 'Unknown User',
              sellerSchool: data.sellerSchool || 'Unknown School',
            } as Product);
          });
          setProducts(fetchedProducts);
        } catch (err) {
          console.error("Error fetching products:", err);
        } finally {
          setLoadingProducts(false);
        }
      });

    return () => unsubscribe();
  }, []);

  // Listen to user's upvotes
  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('post_upvotes')
      .where('userId', '==', user.uid)
      .onSnapshot(snap => {
        if (!snap) return;
        const ids = new Set<string>();
        snap.forEach(d => ids.add(d.data().postId));
        setUpvotedPostIds(ids);
      });
    return () => unsub();
  }, [user]);

  // Listen to user's wishlists
  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('wishlists')
      .where('userId', '==', user.uid)
      .onSnapshot(snap => {
        if (!snap) return;
        const ids = new Set<string>();
        snap.forEach(d => ids.add(d.data().productId));
        setWishlistedIds(ids);
      });
    return () => unsub();
  }, [user]);

  // Listen to user's saved posts
  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('saved_posts')
      .where('userId', '==', user.uid)
      .onSnapshot(snap => {
        if (!snap) return;
        const ids = new Set<string>();
        snap.forEach(d => ids.add(d.data().postId));
        setSavedPostIds(ids);
      });
    return () => unsub();
  }, [user]);

  // Feed scoring and mixing
  const feedItems = useMemo(() => {
    const allItems = [
      ...rawPosts.map(p => ({ ...p, _type: 'post' as const })),
      ...products.map(p => ({ ...p, _type: 'product' as const }))
    ];

    if (contentType === 'for-you' || contentType === 'all') {
      const now = Date.now();
      
      const scoredItems = allItems.map(item => {
        let score = 0;
        
        if (item._type === 'post') {
          score = (item.upvotesCount || 0) * 2 + (item.repliesCount || 0) * 3;
          if (followingIds.has(item.authorId)) score += 20;
          if (userData?.school && item.school === userData.school) score += 15;
          if (userData?.city && item.city === userData.city) score += 10;
          const hour = new Date().getHours();
          if (item.type === 'confession' && (hour >= 18 || hour < 4)) score += 10;
        } else {
          score = 15;
          if (userData?.school && item.sellerSchool === userData.school) score += 15;
          if (userData?.city && item.city === userData.city) score += 10;
          if (item.status === 'sold') score -= 50;
        }

        const itemTime = item.createdAt?.toMillis?.() || Date.now();
        const hoursAgo = Math.max(0.5, (now - itemTime) / (1000 * 60 * 60));
        const velocity = item._type === 'post' 
          ? ((item.upvotesCount || 0) + (item.repliesCount || 0) * 1.5) / hoursAgo
          : 0;
        score += Math.min(velocity * 2, 25);
        const timeMultiplier = 1 / Math.pow(1 + hoursAgo * 0.05, 1.2);
        const finalScore = score * timeMultiplier;

        return { item, finalScore, hoursAgo };
      });

      scoredItems.sort((a, b) => b.finalScore - a.finalScore);

      const finalFeed: any[] = [];
      const authorCounts = new Map<string, number>();
      const unusedProducts: any[] = [];

      for (const { item, hoursAgo } of scoredItems) {
        if (item._type === 'product') {
          if (item.status !== 'sold' || finalFeed.length > 10) unusedProducts.push(item);
          continue;
        }
        const authorId = item.authorId;
        const count = authorCounts.get(authorId) || 0;
        if (count >= 2 && finalFeed.length < 20 && hoursAgo > 2) continue;
        authorCounts.set(authorId, count + 1);
        finalFeed.push(item);
        if (finalFeed.length % 4 === 0 && unusedProducts.length > 0) {
          finalFeed.push(unusedProducts.shift());
        }
      }
      finalFeed.push(...unusedProducts);
      
      return finalFeed.map(item => ({
        type: item._type,
        data: item,
        timestamp: item.createdAt?.toMillis?.() || 0
      })) as FeedItem[];
    } 
    else if (contentType === 'posts') {
      return [...rawPosts].sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      }).map(p => ({
        type: 'post',
        data: p,
        timestamp: p.createdAt?.toMillis?.() || 0
      })) as FeedItem[];
    } 
    else {
      return [...products].sort((a, b) => {
        if (a.status === 'sold' && b.status !== 'sold') return 1;
        if (a.status !== 'sold' && b.status === 'sold') return -1;
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      }).map(p => ({
        type: 'product',
        data: p,
        timestamp: p.createdAt?.toMillis?.() || 0
      })) as FeedItem[];
    }
  }, [rawPosts, products, contentType, followingIds, userData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleUpvote = async (post: Post) => {
    if (!user) { Alert.alert('Sign In Required', 'You need to sign in to upvote posts.'); return; }
    try { await toggleUpvote(post.id, user.uid); } catch (err) { console.error('Upvote error:', err); }
  };

  const handleToggleWishlist = async (product: Product) => {
    if (!user) { Alert.alert('Sign In Required', 'You need to sign in to save items.'); return; }
    try { await toggleWishlist(product.id, user.uid); } catch (err) { console.error('Wishlist error:', err); }
  };

  const handleToggleSavePost = async (post: Post) => {
    if (!user) { Alert.alert('Sign In Required', 'You need to sign in to save posts.'); return; }
    try { await toggleSavePost(post.id, user.uid); } catch (err) { console.error('Save post error:', err); }
  };

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'post') {
      return (
        <PostCard 
          post={item.data} 
          hasUpvoted={upvotedPostIds.has(item.data.id)}
          isSaved={savedPostIds.has(item.data.id)}
          onPress={() => router.push(`/post/${item.data.id}` as any)}
          onUpvote={() => handleUpvote(item.data)}
          onToggleSave={() => handleToggleSavePost(item.data)}
          onAuthorPress={() => router.push(`/profile/${item.data.authorId}` as any)}
        />
      );
    } else {
      return (
        <ProductCard 
          product={item.data} 
          isWishlisted={wishlistedIds.has(item.data.id)}
          onPress={() => router.push(`/product/${item.data.id}` as any)}
          onToggleWishlist={() => handleToggleWishlist(item.data)}
          onSellerPress={() => router.push(`/profile/${item.data.sellerId}` as any)}
        />
      );
    }
  };

  const isLoading = loadingPosts || loadingProducts;
  const iconColor = isDark ? '#F5F5F7' : '#1A1A1C';

  const tabs: { key: typeof contentType; label: string }[] = [
    { key: 'all', label: 'For you' },
    { key: 'posts', label: 'Posts' },
    { key: 'marketplace', label: 'Market' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="bg-surface dark:bg-surface-dark px-5 pt-3 pb-0">
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Image 
              source={require('../../../assets/images/logo.png')} 
              className="h-7 w-7 mr-2"
              resizeMode="contain"
            />
            <Text variant="h2" className="text-[22px] tracking-tight">
              nextbench
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity 
              onPress={toggleTheme} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="p-1"
            >
              {isDark ? <Sun size={20} color={iconColor} /> : <Moon size={20} color={iconColor} />}
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push('/notifications')} 
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="p-1"
            >
              <Bell size={20} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Segment Control Tabs — FIXED for dark mode */}
        <View className="flex-row bg-surface-soft dark:bg-surface-dark-secondary rounded-xl p-1 mb-3">
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setContentType(tab.key)}
              className={`flex-1 py-2 rounded-lg items-center ${
                contentType === tab.key 
                  ? 'bg-white dark:bg-surface-dark-elevated' 
                  : 'bg-transparent'
              }`}
              style={
                contentType === tab.key 
                  ? {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDark ? 0.4 : 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }
                  : undefined
              }
            >
              <Text 
                variant="label" 
                className={`text-[13px] ${
                  contentType === tab.key 
                    ? 'font-sans-semibold text-ink dark:text-ink-dark' 
                    : 'font-sans-medium text-content-tertiary dark:text-ink-dark-faint'
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <FeedSkeleton />
        </ScrollView>
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={item => `${item.type}-${item.data.id}`}
          renderItem={renderItem}
          ListHeaderComponent={
            <View className="px-5 py-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-surface-soft dark:bg-surface-dark-secondary overflow-hidden mr-3">
                  {userData?.profilePicture ? (
                    <Image source={{ uri: userData.profilePicture }} className="w-full h-full" />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <Text variant="label" className="text-content-secondary font-sans-semibold">
                        {userData?.name?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity 
                  onPress={() => router.push('/post/create' as any)}
                  className="flex-1 h-10 px-4 rounded-full bg-surface-soft dark:bg-surface-dark-secondary justify-center"
                  activeOpacity={0.7}
                >
                  <Text variant="bodySmall" className="text-content-tertiary dark:text-ink-dark-faint">
                    What's on your mind?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20 px-6">
              <Text variant="h3" className="text-content-secondary dark:text-ink-dark-muted mb-2">Nothing here yet</Text>
              <Text variant="caption" className="text-center text-content-tertiary dark:text-ink-dark-faint">
                Check back later or create a new post.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Compose FAB */}
      <TouchableOpacity
        onPress={() => router.push('/post/create' as any)}
        activeOpacity={0.85}
        style={{
          position: 'absolute',
          bottom: 100,
          right: 20,
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: '#14B8A6',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Feather size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}