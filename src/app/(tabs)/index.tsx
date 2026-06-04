import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, FlatList, RefreshControl, TouchableOpacity, Image, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import PostCard, { Post } from "@/components/ui/PostCard";
import ProductCard, { Product } from "@/components/ui/ProductCard";
import { useAuth } from "@/providers/AuthProvider";
import firestore from "@react-native-firebase/firestore";
import { toggleUpvote, toggleWishlist } from "@/lib/social";
import { FeedSkeleton } from "@/components/ui/SkeletonCard";
import { Bell, Moon, Sun, Feather } from "lucide-react-native";
import { useColorScheme } from "nativewind";

type FeedItem = 
  | { type: 'post'; data: Post & { feedScore?: number }; timestamp: number }
  | { type: 'product'; data: Product; timestamp: number };

export default function FeedScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();
  
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [rawPosts, setRawPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [upvotedPostIds, setUpvotedPostIds] = useState<Set<string>>(new Set());
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  const [contentType, setContentType] = useState<'all' | 'posts' | 'marketplace'>('all');
  const { colorScheme, setColorScheme } = useColorScheme();
  
  const toggleTheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  };

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

  // Feed scoring and mixing
  const feedItems = useMemo(() => {
    const now = Date.now();
    const scoredPosts: FeedItem[] = rawPosts.map(post => {
      const postTime = post.createdAt?.toMillis?.() || now;
      const hoursPassed = Math.max(0, (now - postTime) / (1000 * 60 * 60));
      const baseHype = ((post.upvotesCount || 0) * 2) + ((post.repliesCount || 0) * 3);
      const timePenalty = hoursPassed * 0.5;
      const cityBoost = (userData?.city && post.city === userData.city) ? 10 : 0;
      const schoolBoost = (userData?.school && post.school === userData.school) ? 15 : 0;
      
      const feedScore = baseHype - timePenalty + cityBoost + schoolBoost;
      return { type: 'post' as const, data: { ...post, feedScore }, timestamp: postTime };
    });

    const mappedProducts: FeedItem[] = products.map(product => {
      const productTime = product.createdAt?.toMillis?.() || now;
      return { type: 'product' as const, data: product, timestamp: productTime };
    });

    let mixed: FeedItem[] = [];

    if (contentType === 'all') {
      mixed = [...scoredPosts, ...mappedProducts];
      mixed.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    } else if (contentType === 'posts') {
      mixed = scoredPosts;
      mixed.sort((a, b) => {
        const scoreA = (a.data as Post & { feedScore?: number }).feedScore || 0;
        const scoreB = (b.data as Post & { feedScore?: number }).feedScore || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
    } else if (contentType === 'marketplace') {
      mixed = mappedProducts;
      mixed.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    return mixed;
  }, [rawPosts, products, userData, contentType]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleUpvote = async (post: Post) => {
    if (!user) {
      Alert.alert('Sign In Required', 'You need to sign in to upvote posts.');
      return;
    }
    try {
      await toggleUpvote(post.id, user.uid);
    } catch (err) {
      console.error('Upvote error:', err);
    }
  };

  const handleToggleWishlist = async (product: Product) => {
    if (!user) {
      Alert.alert('Sign In Required', 'You need to sign in to save items.');
      return;
    }
    try {
      await toggleWishlist(product.id, user.uid);
    } catch (err) {
      console.error('Wishlist error:', err);
    }
  };

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'post') {
      return (
        <PostCard 
          post={item.data} 
          hasUpvoted={upvotedPostIds.has(item.data.id)}
          onPress={() => router.push(`/post/${item.data.id}` as any)}
          onUpvote={() => handleUpvote(item.data)}
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
  const isDark = colorScheme === 'dark';
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

        {/* Segment Control Tabs */}
        <View className="flex-row bg-surface-soft dark:bg-surface-dark-secondary rounded-xl p-1 mb-3">
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setContentType(tab.key)}
              className={`flex-1 py-2 rounded-lg items-center ${
                contentType === tab.key 
                  ? 'bg-surface dark:bg-surface-elevated shadow-sm' 
                  : ''
              }`}
            >
              <Text 
                variant="label" 
                className={`text-[13px] ${
                  contentType === tab.key 
                    ? 'font-sans-semibold text-content dark:text-content-dark' 
                    : 'font-sans-medium text-content-tertiary'
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
                  <Text variant="bodySmall" className="text-content-tertiary">
                    What's on your mind?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0071E3" />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20 px-6">
              <Text variant="h3" className="text-content-secondary mb-2">Nothing here yet</Text>
              <Text variant="caption" className="text-center text-content-tertiary">
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
