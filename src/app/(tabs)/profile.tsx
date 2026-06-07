import React, { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, Image, ActivityIndicator, useColorScheme, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { Settings, ShieldCheck, MapPin, Grid, MessageSquare, Bell, Heart, X, Bookmark } from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";
import ProductCard, { Product } from "@/components/ui/ProductCard";
import PostCard, { Post } from "@/components/ui/PostCard";
import { useFollowCounts } from "@/lib/follows";

export default function ProfileScreen() {
  const { user, userData } = useAuth();
  const [viewMode, setViewMode] = useState<'listings' | 'posts' | 'playlist'>('listings');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#F5F5F7' : '#1A1A1C';
  
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [myListings, setMyListings] = useState<Product[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(true);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const { followersCount, followingCount } = useFollowCounts(user?.uid);

  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);
  const [modalUsers, setModalUsers] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUsersList = async (type: 'followers' | 'following') => {
    if (!user) return;
    setModalLoading(true);
    setModalType(type);
    setModalUsers([]);
    try {
      const snap = await firestore()
        .collection('follows')
        .where(type === 'followers' ? 'followingId' : 'followerId', '==', user.uid)
        .get();
      const ids = snap.docs.map(d => type === 'followers' ? d.data().followerId : d.data().followingId);
      if (ids.length > 0) {
        const userSnaps = await Promise.all(
          ids.slice(0, 50).map(id => firestore().collection('users').doc(id).get())
        );
        setModalUsers(userSnaps.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
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
    const unsubPlaylist = firestore()
      .collection('saved_posts')
      .where('userId', '==', user.uid)
      // Removed orderBy('createdAt') — it requires a composite Firestore index
      // and silently hangs loading forever if that index doesn't exist or if
      // any doc is missing the 'createdAt' field (no error callback was wired up).
      .onSnapshot(async snap => {
        if (!snap) { setLoadingPlaylist(false); return; }
        if (snap.empty) { setSavedPosts([]); setLoadingPlaylist(false); return; }
        try {
          const postIds = snap.docs.map(doc => doc.data().postId).filter(Boolean) as string[];
          if (postIds.length === 0) { setSavedPosts([]); setLoadingPlaylist(false); return; }
          const chunks: string[][] = [];
          for (let i = 0; i < postIds.length; i += 30) chunks.push(postIds.slice(i, i + 30));
          let allPosts: Post[] = [];
          for (const chunk of chunks) {
            const postsSnap = await firestore()
              .collection('posts')
              .where(firestore.FieldPath.documentId(), 'in', chunk)
              .get();
            postsSnap.forEach(doc => allPosts.push({ id: doc.id, ...doc.data() } as Post));
          }
          // Sort client-side: most-recently saved first
          allPosts.sort((a, b) => postIds.indexOf(a.id) - postIds.indexOf(b.id));
          setSavedPosts(allPosts);
        } catch (e) {
          console.error("Failed to fetch saved posts", e);
          setSavedPosts([]);
        } finally {
          setLoadingPlaylist(false);
        }
      }, (e) => {
        // Without this error callback a failed query hangs loading indefinitely
        console.error("saved_posts snapshot error:", e);
        setSavedPosts([]);
        setLoadingPlaylist(false);
      });
    return () => { unsubListings(); unsubPosts(); unsubPlaylist(); };
  }, [user]);

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
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark justify-center items-center">
        <ActivityIndicator color="#0071E3" />
      </SafeAreaView>
    );
  }

  const nameInitial = userData.name?.[0]?.toUpperCase() || '?';

  const stats = [
    { label: 'Followers', value: followersCount, onPress: () => fetchUsersList('followers') },
    { label: 'Following', value: followingCount, onPress: () => fetchUsersList('following') },
    { label: 'Listings',  value: myListings.length },
    { label: 'Posts',     value: myPosts.length },
  ];

  const renderContent = () => {
    if (viewMode === 'listings') {
      if (loadingListings) return <ActivityIndicator color="#0071E3" className="mt-8" />;
      if (myListings.length === 0) return (
        <View className="items-center justify-center pt-16">
          <Grid size={32} color={isDark ? '#2C2C2E' : '#E5E5EA'} />
          <Text variant="bodySmall" className="text-content-tertiary mt-3">No listings yet</Text>
        </View>
      );
      return myListings.map(item => (
        <ProductCard key={item.id} product={item} isWishlisted={false}
          onPress={() => router.push(`/product/${item.id}` as any)} onToggleWishlist={() => {}} />
      ));
    }
    if (viewMode === 'posts') {
      if (loadingPosts) return <ActivityIndicator color="#FF375F" className="mt-8" />;
      if (myPosts.length === 0) return (
        <View className="items-center justify-center pt-16">
          <MessageSquare size={32} color={isDark ? '#2C2C2E' : '#E5E5EA'} />
          <Text variant="bodySmall" className="text-content-tertiary mt-3">No posts yet</Text>
        </View>
      );
      return myPosts.map(post => (
        <PostCard key={post.id} post={post} hasUpvoted={false}
          onPress={() => router.push(`/post/${post.id}` as any)} />
      ));
    }
    if (viewMode === 'playlist') {
      if (loadingPlaylist) return <ActivityIndicator color="#9333EA" className="mt-8" />;
      if (savedPosts.length === 0) return (
        <View className="items-center justify-center pt-16">
          <Bookmark size={32} color={isDark ? '#2C2C2E' : '#E5E5EA'} />
          <Text variant="bodySmall" className="text-content-tertiary mt-3">No saved posts in your playlist yet</Text>
        </View>
      );
      return savedPosts.map(post => (
        <PostCard key={post.id} post={post} hasUpvoted={false} isSaved={true}
          onPress={() => router.push(`/post/${post.id}` as any)} />
      ));
    }
    return null;
  };

  // ── FIX: derive pill colours from isDark at runtime instead of relying on
  //    NativeWind's dark: prefix, which can't toggle bg on the same element
  //    when both light and dark classes share the same CSS property. ──────────
  const pillTrackBg  = isDark ? '#1C1C1E' : '#F2F2F7';
  const activePillBg = isDark ? '#2C2C2E' : '#FFFFFF';

  const tabs = [
    { key: 'listings' as const, label: 'Listings', Icon: Grid,          activeColor: '#14B8A6' },
    { key: 'posts'    as const, label: 'Posts',    Icon: MessageSquare, activeColor: '#FF375F' },
    { key: 'playlist' as const, label: 'Playlist', Icon: Bookmark,      activeColor: '#9333EA' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      {/* Header */}
      <View className="px-5 py-3 border-b border-surface-soft dark:border-surface-dark-secondary flex-row justify-between items-center">
        <Text variant="h2" className="text-[22px]">Profile</Text>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity onPress={() => router.push('/wishlist' as any)} className="p-2.5 rounded-full">
            <Heart size={20} color="#FF375F" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/notifications' as any)} className="p-2.5 rounded-full relative">
            <Bell size={20} color={iconColor} />
            {unreadNotifCount > 0 && (
              <View className="absolute top-1 right-1 bg-brand-pink w-4 h-4 rounded-full items-center justify-center">
                <Text variant="caption" className="text-white text-[9px] font-sans-semibold">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity className="p-2.5 rounded-full" onPress={() => router.push('/settings' as any)}>
            <Settings size={20} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FIX: bg added so ScrollView never shows white behind content in dark mode */}
      <ScrollView className="flex-1 bg-surface dark:bg-surface-dark" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Info */}
        <View className="px-5 py-6 items-center border-b border-surface-soft dark:border-surface-dark-secondary">
          <View className="relative mb-4">
            <View className="w-[88px] h-[88px] rounded-full bg-surface-soft dark:bg-surface-dark-secondary items-center justify-center overflow-hidden">
              {userData.profilePicture ? (
                <Image source={{ uri: userData.profilePicture }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Text variant="h1" className="text-content-secondary">{nameInitial}</Text>
              )}
            </View>
            {userData.verified && (
              <View className="absolute bottom-0 right-0 bg-brand-teal rounded-full p-1 border-2 border-surface dark:border-surface-dark">
                <ShieldCheck size={14} color="#FFF" />
              </View>
            )}
          </View>
          <Text variant="h2" className="mb-1 text-[22px]">{userData.name}</Text>
          {userData.username && (
            <Text variant="caption" className="text-content-tertiary mb-1.5">@{userData.username}</Text>
          )}
          <View className="flex-row items-center mb-4">
            <MapPin size={13} color="#8E8E93" />
            <Text variant="caption" className="text-content-tertiary ml-1">
              {userData.school}{userData.city ? ` · ${userData.city}` : ''}
            </Text>
          </View>
          <View className="flex-row justify-center gap-6 w-full mt-4 mb-2">
            {stats.map((stat) => (
              <TouchableOpacity
                key={stat.label}
                onPress={stat.onPress}
                activeOpacity={stat.onPress ? 0.6 : 1}
                className="items-center min-w-[70px]"
              >
                <Text variant="h3" className="text-[20px] font-bold text-content dark:text-content-dark">{stat.value}</Text>
                <Text variant="caption" className="text-content-secondary text-[12px] mt-1">{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content Toggle — pill switcher */}
        <View
          className="flex-row mx-5 mt-3 rounded-xl p-1"
          style={{ backgroundColor: pillTrackBg }}
        >
          {tabs.map(({ key, label, Icon, activeColor }) => {
            const isActive = viewMode === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setViewMode(key)}
                className="flex-1 flex-row items-center justify-center py-2.5 rounded-lg gap-2"
                style={isActive ? { backgroundColor: activePillBg } : undefined}
              >
                <Icon size={16} color={isActive ? activeColor : '#8E8E93'} />
                <Text
                  variant="label"
                  className="text-[13px]"
                  style={isActive
                    ? { fontWeight: '600', color: activeColor }
                    : { color: '#8E8E93' }
                  }
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content Area */}
        <View className="pt-3">
          {renderContent()}
        </View>
      </ScrollView>

      {/* Followers/Following Modal */}
      <Modal
        visible={modalType !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalType(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface dark:bg-surface-dark h-[80%] rounded-t-3xl p-5">
            <View className="flex-row justify-between items-center mb-5">
              <Text variant="h2" className="text-[22px]">
                {modalType === 'followers' ? 'Followers' : 'Following'}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)} className="p-2 bg-surface-soft dark:bg-surface-dark-secondary rounded-full">
                <X size={20} color={iconColor} />
              </TouchableOpacity>
            </View>
            {modalLoading ? (
              <ActivityIndicator color="#0071E3" className="mt-8" />
            ) : modalUsers.length === 0 ? (
              <View className="items-center py-12">
                <Text variant="caption" className="text-content-tertiary">
                  {modalType === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {modalUsers.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    onPress={() => { setModalType(null); router.push(`/profile/${u.id}` as any); }}
                    className="flex-row items-center py-3 border-b border-surface-soft dark:border-surface-dark-secondary"
                  >
                    <View className="w-12 h-12 rounded-full bg-surface-soft dark:bg-surface-dark-secondary items-center justify-center mr-3 overflow-hidden">
                      {u.profilePicture ? (
                        <Image source={{ uri: u.profilePicture }} className="w-full h-full" resizeMode="cover" />
                      ) : (
                        <Text variant="h4" className="text-content-secondary">{u.name?.[0]?.toUpperCase() || '?'}</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1">
                        <Text variant="label" className="font-sans-semibold">{u.name}</Text>
                        {u.verified && <ShieldCheck size={14} color="#0A84FF" />}
                      </View>
                      {u.username && (
                        <Text variant="caption" className="text-content-tertiary">@{u.username}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}