import React, { useState, useEffect, useMemo } from "react";
import { View, ScrollView, TouchableOpacity, Image, ActivityIndicator, FlatList, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { Settings, ShieldCheck, MapPin, Grid, MessageSquare, Bell, Heart } from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";
import ProductCard, { Product } from "@/components/ui/ProductCard";
import PostCard, { Post } from "@/components/ui/PostCard";
import { useFollowCounts } from "@/lib/follows";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [viewMode, setViewMode] = useState<'listings' | 'posts'>('listings');
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#FFFFFF' : '#1D1D1F';
  
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [myListings, setMyListings] = useState<Product[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const { followersCount, followingCount } = useFollowCounts(user?.uid);

  useEffect(() => {
    if (!user) return;
    
    // Fetch listings
    const unsubListings = firestore()
      .collection('products')
      .where('sellerId', '==', user.uid)
      .onSnapshot(snap => {
        if (!snap) return;
        const products: Product[] = [];
        snap.forEach(doc => products.push({ id: doc.id, ...doc.data() } as Product));
        setMyListings(products);
        setLoadingListings(false);
      });

    // Fetch posts
    const unsubPosts = firestore()
      .collection('posts')
      .where('authorId', '==', user.uid)
      .onSnapshot(snap => {
        if (!snap) return;
        const posts: Post[] = [];
        snap.forEach(doc => posts.push({ id: doc.id, ...doc.data() } as Post));
        setMyPosts(posts);
        setLoadingPosts(false);
      });
      
    return () => {
      unsubListings();
      unsubPosts();
    };
  }, [user]);

  // Listen to unread notification count
  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('notifications')
      .where('userId', '==', user.uid)
      .where('read', '==', false)
      .onSnapshot(
        (snap) => setUnreadNotifCount(snap.size),
        () => setUnreadNotifCount(0)
      );
    return () => unsub();
  }, [user]);

  if (!user || !userData) {
    return (
      <SafeAreaView className="flex-1 bg-surface justify-center items-center">
        <ActivityIndicator color="#0071E3" />
      </SafeAreaView>
    );
  }

  const nameInitial = userData.name?.[0]?.toUpperCase() || '?';

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      {/* Header */}
      <View className="px-5 py-4 border-b border-brand-teal/5 bg-surface/90 flex-row justify-between items-center">
        <Text variant="h2" className="text-2xl font-serif-medium">
          Profile
        </Text>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.push('/wishlist' as any)}
            className="p-2 rounded-full border border-content-secondary/20"
          >
            <Heart size={20} color="#F77CA2" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/notifications' as any)}
            className="p-2 rounded-full border border-content-secondary/20 relative"
          >
            <Bell size={20} color={iconColor} />
            {unreadNotifCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-brand-pink w-4 h-4 rounded-full items-center justify-center">
                <Text variant="caption" className="text-white text-[8px] font-bold">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity className="p-2 rounded-full border border-content-secondary/20" onPress={() => router.push('/settings' as any)}>
            <Settings size={20} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Info */}
        <View className="px-6 py-8 items-center border-b border-content-secondary/10">
          <View className="relative mb-4">
            <View className="w-24 h-24 rounded-full bg-brand-teal/10 items-center justify-center overflow-hidden border border-brand-teal/20">
              {userData.profilePicture ? (
                <Image source={{ uri: userData.profilePicture }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Text variant="h1" className="text-brand-teal">{nameInitial}</Text>
              )}
            </View>
            {userData.verified && (
              <View className="absolute bottom-0 right-0 bg-brand-teal rounded-full p-1 border-2 border-surface">
                <ShieldCheck size={14} color="#FFF" />
              </View>
            )}
          </View>
          
          <Text variant="h2" className="mb-1">{userData.name}</Text>
          <View className="flex-row items-center mb-3">
            <MapPin size={14} color="#8E8E93" />
            <Text variant="caption" className="text-content-secondary ml-1">
              {userData.school} {userData.city ? `• ${userData.city}` : ''}
            </Text>
          </View>
          
          <View className="flex-row gap-6 mt-2">
            <View className="items-center">
              <Text variant="h3">{followersCount}</Text>
              <Text variant="caption" className="text-content-secondary">Followers</Text>
            </View>
            <View className="items-center">
              <Text variant="h3">{followingCount}</Text>
              <Text variant="caption" className="text-content-secondary">Following</Text>
            </View>
            <View className="items-center">
              <Text variant="h3">{myListings.length}</Text>
              <Text variant="caption" className="text-content-secondary">Listings</Text>
            </View>
            <View className="items-center">
              <Text variant="h3">{myPosts.length}</Text>
              <Text variant="caption" className="text-content-secondary">Posts</Text>
            </View>
          </View>
        </View>

        {/* Content Toggle */}
        <View className="flex-row border-b border-content-secondary/10">
          <TouchableOpacity 
            onPress={() => setViewMode('listings')}
            className={`flex-1 items-center py-4 border-b-2 ${
              viewMode === 'listings' ? 'border-brand-teal' : 'border-transparent'
            }`}
          >
            <Grid size={20} color={viewMode === 'listings' ? '#0071E3' : '#8E8E93'} />
            <Text variant="label" className={`mt-1 font-bold ${viewMode === 'listings' ? 'text-brand-teal' : 'text-content-secondary'}`}>
              Listings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('posts')}
            className={`flex-1 items-center py-4 border-b-2 ${
              viewMode === 'posts' ? 'border-brand-pink' : 'border-transparent'
            }`}
          >
            <MessageSquare size={20} color={viewMode === 'posts' ? '#F77CA2' : '#8E8E93'} />
            <Text variant="label" className={`mt-1 font-bold ${viewMode === 'posts' ? 'text-brand-pink' : 'text-content-secondary'}`}>
              Posts
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View className="pt-4">
          {viewMode === 'listings' ? (
            loadingListings ? (
              <ActivityIndicator color="#0071E3" className="mt-8" />
            ) : myListings.length === 0 ? (
              <View className="items-center justify-center pt-12">
                <Text variant="body" className="text-content-secondary">No listings yet.</Text>
              </View>
            ) : (
              myListings.map(item => (
                <ProductCard 
                  key={item.id}
                  product={item}
                  isWishlisted={false}
                  onPress={() => router.push(`/product/${item.id}` as any)}
                  onToggleWishlist={() => {}}
                />
              ))
            )
          ) : (
            loadingPosts ? (
              <ActivityIndicator color="#F77CA2" className="mt-8" />
            ) : myPosts.length === 0 ? (
              <View className="items-center justify-center pt-12">
                <Text variant="body" className="text-content-secondary">No posts yet.</Text>
              </View>
            ) : (
              myPosts.map(post => (
                <PostCard 
                  key={post.id}
                  post={post}
                  hasUpvoted={false}
                  onPress={() => router.push(`/post/${post.id}` as any)}
                />
              ))
            )
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
