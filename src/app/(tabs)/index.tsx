import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import PostCard, { Post } from "@/components/ui/PostCard";
import ProductCard, { Product } from "@/components/ui/ProductCard";
import { useAuth } from "@/providers/AuthProvider";
import { collection, query, where, onSnapshot, getDoc, doc } from "@react-native-firebase/firestore";
import firestore from "@react-native-firebase/firestore";

type FeedItem = 
  | { type: 'post'; data: Post; timestamp: number }
  | { type: 'product'; data: Product; timestamp: number };

export default function FeedScreen() {
  const { user, userData } = useAuth();
  const router = useRouter();
  
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [rawPosts, setRawPosts] = useState<Post[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [upvotedPostIds, setUpvotedPostIds] = useState<Set<string>>(new Set());
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  const [contentType, setContentType] = useState<'all' | 'posts' | 'marketplace'>('all');

  // Listen to approved posts
  useEffect(() => {
    const q = query(
      collection(firestore(), 'posts'),
      where('status', '==', 'approved')
    );

    const userCache: Record<string, any> = {};

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot) return;
      try {
        const uncachedIds = new Set<string>();
        snapshot.forEach(docSnap => {
          const authorId = docSnap.data().authorId;
          if (authorId && !userCache[authorId]) uncachedIds.add(authorId);
        });

        if (uncachedIds.size > 0) {
          const promises = Array.from(uncachedIds).map(async (uid) => {
            const uDoc = await getDoc(doc(firestore(), 'users', uid));
            if (uDoc.exists) userCache[uid] = uDoc.data();
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
    const q = query(
      collection(firestore(), 'products'),
      where('status', 'in', ['available', 'sold'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
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
    const q = query(collection(firestore(), 'post_upvotes'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
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
    const q = query(collection(firestore(), 'wishlists'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
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
    const scoredPosts = rawPosts.map(post => {
      const postTime = post.createdAt?.toMillis() || now;
      const hoursPassed = Math.max(0, (now - postTime) / (1000 * 60 * 60));
      const baseHype = ((post.upvotesCount || 0) * 2) + ((post.repliesCount || 0) * 3);
      const timePenalty = hoursPassed * 0.5;
      const cityBoost = (userData?.city && post.city === userData.city) ? 10 : 0;
      const schoolBoost = (userData?.school && post.school === userData.school) ? 15 : 0;
      
      const feedScore = baseHype - timePenalty + cityBoost + schoolBoost;
      return { type: 'post' as const, data: { ...post, feedScore }, timestamp: postTime };
    });

    const mappedProducts = products.map(product => {
      const productTime = product.createdAt?.toMillis() || now;
      return { type: 'product' as const, data: product, timestamp: productTime };
    });

    let mixed: FeedItem[] = [];

    if (contentType === 'all') {
      mixed = [...scoredPosts, ...mappedProducts];
      mixed.sort((a, b) => b.timestamp - a.timestamp);
    } else if (contentType === 'posts') {
      mixed = scoredPosts;
      mixed.sort((a, b) => {
        const scoreA = a.data.feedScore || 0;
        const scoreB = b.data.feedScore || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.timestamp - a.timestamp;
      });
    } else if (contentType === 'marketplace') {
      mixed = mappedProducts;
      mixed.sort((a, b) => b.timestamp - a.timestamp);
    }

    return mixed;
  }, [rawPosts, products, userData, contentType]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleUpvote = (post: Post) => {
    // Stub
  };

  const handleToggleWishlist = (product: Product) => {
    // Stub
  };

  const renderItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'post') {
      return (
        <PostCard 
          post={item.data} 
          hasUpvoted={upvotedPostIds.has(item.data.id)}
          onPress={() => {}}
          onUpvote={() => handleUpvote(item.data)}
        />
      );
    } else {
      return (
        <ProductCard 
          product={item.data} 
          isWishlisted={wishlistedIds.has(item.data.id)}
          onPress={() => {}}
          onToggleWishlist={() => handleToggleWishlist(item.data)}
        />
      );
    }
  };

  const isLoading = loadingPosts || loadingProducts;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="px-5 py-4 bg-surface/90">
        <Text variant="h2" className="text-2xl font-serif-medium italic tracking-tight text-brand-teal mb-3">
          Nextbench
        </Text>
        
        {/* Toggle Switch */}
        <View className="flex-row bg-surface-soft p-1 rounded-xl">
          {(['all', 'posts', 'marketplace'] as const).map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => setContentType(type)}
              className={`flex-1 items-center justify-center py-2 rounded-lg ${
                contentType === type ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text 
                variant="label" 
                className={`text-[12px] capitalize font-bold ${
                  contentType === type ? 'text-brand-teal' : 'text-content-tertiary'
                }`}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0071E3" />
        </View>
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={item => `${item.type}-${item.data.id}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0071E3" />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20 px-6">
              <Text variant="h3" className="text-content-secondary mb-2">Nothing here</Text>
              <Text variant="caption" className="text-center text-content-tertiary">
                Check back later or create a new post.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
