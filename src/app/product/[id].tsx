import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, Image, TouchableOpacity, useColorScheme } from "react-native";
import { AppAlert } from '@/components/ui/AppAlert';
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { ChevronLeft, Heart, Share2, ShieldCheck } from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { Product } from "@/components/ui/ProductCard";
import firestore from "@react-native-firebase/firestore";
import { toggleWishlist, getOrCreateDMRoom } from "@/lib/social";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor   = isDark ? "#F5F5F7" : "#1D1D1F";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const headerBg    = isDark ? "rgba(0,0,0,0.88)" : "rgba(255,255,255,0.95)";

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = firestore()
      .collection("products")
      .doc(id)
      .onSnapshot(
        (docSnap) => {
          if (docSnap.data()) setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
          setLoading(false);
        },
        (error) => { console.error("Error fetching product:", error); setLoading(false); }
      );
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const unsubscribe = firestore()
      .collection("wishlists")
      .where("userId", "==", user.uid)
      .where("productId", "==", id)
      .onSnapshot((snap) => setIsWishlisted(!snap.empty));
    return () => unsubscribe();
  }, [user, id]);

  const handleToggleWishlist = async () => {
    if (!user || !id) { AppAlert.alert("Sign In Required", "You need to sign in to save items."); return; }
    try { await toggleWishlist(id, user.uid); }
    catch (err) { console.error("Wishlist toggle error:", err); }
  };

  const handleContactSeller = async () => {
    if (!user || !product) return;
    if (user.uid === product.sellerId) { AppAlert.alert("Your Listing", "You cannot message yourself."); return; }
    try {
      const { roomId } = await getOrCreateDMRoom(user.uid, product.sellerId);
      router.push(`/chat/${roomId}` as any);
    } catch (err) {
      console.error("Contact seller error:", err);
      AppAlert.alert("Error", "Failed to start conversation. Please try again.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark justify-center items-center">
        <ActivityIndicator color="#14B8A6" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark justify-center items-center">
        <Text variant="h3" className="text-error">Product Not Found</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-3 bg-surface-soft dark:bg-surface-dark-elevated rounded-lg"
        >
          <Text variant="label" className="dark:text-ink-dark">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isSold     = product.status === "sold";
  const isReserved = product.status === "reserved";
  const isOwner    = user?.uid === product.sellerId;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
      {/* Header */}
      <View
        className="px-5 py-3 flex-row items-center z-10"
        style={{ borderBottomWidth: 1, borderBottomColor: borderColor, backgroundColor: headerBg }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={24} color={iconColor} />
        </TouchableOpacity>
        <Text
          variant="label"
          className="ml-2 font-sans-semibold flex-1 text-center pr-8 dark:text-ink-dark"
          numberOfLines={1}
        >
          {product.title}
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-surface dark:bg-surface-dark"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Image */}
        <View className="w-full aspect-square bg-surface-soft dark:bg-surface-dark-secondary relative">
          <Image source={{ uri: product.image }} className="w-full h-full" resizeMode="contain" />
          {isSold && (
            <View className="absolute inset-0 bg-black/40 items-center justify-center">
              <View className="bg-black/70 px-8 py-3 rounded-full">
                <Text variant="label" className="text-white font-sans-bold uppercase tracking-widest">
                  Sold
                </Text>
              </View>
            </View>
          )}
          {isReserved && !isSold && (
            <View className="absolute top-4 right-4 bg-amber-500 px-4 py-2 rounded-full">
              <Text variant="caption" className="text-white font-sans-semibold uppercase tracking-widest">
                Reserved
              </Text>
            </View>
          )}
        </View>

        <View className="px-6 pt-6">
          {/* Condition / Category tags */}
          <View className="flex-row items-center gap-2 mb-4">
            <View className="bg-brand-teal/10 px-3 py-1 rounded-full">
              <Text variant="caption" className="text-brand-teal font-sans-semibold uppercase tracking-widest text-[10px]">
                {product.condition}
              </Text>
            </View>
            <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted uppercase tracking-widest text-[10px] font-sans-semibold">
              {product.category}
            </Text>
          </View>

          {/* Title & Price */}
          <Text variant="h1" className="text-3xl font-sans-bold mb-2 leading-tight dark:text-ink-dark">
            {product.title}
          </Text>
          <Text variant="h2" className="text-2xl text-brand-pink mb-6">
            ₹{product.price}
          </Text>

          {/* Actions */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity
              onPress={handleToggleWishlist}
              className={`p-3 rounded-xl items-center justify-center flex-1 flex-row gap-2 ${
                isWishlisted
                  ? "bg-brand-pink/10"
                  : "bg-surface-soft dark:bg-surface-dark-elevated"
              }`}
              style={{ borderWidth: 1, borderColor: isWishlisted ? "rgba(244,63,94,0.3)" : borderColor }}
            >
              <Heart
                size={20}
                color={isWishlisted ? "#F43F5E" : "#8E8E93"}
                fill={isWishlisted ? "#F43F5E" : "transparent"}
              />
              <Text
                variant="label"
                className={`font-sans-semibold ${isWishlisted ? "text-brand-pink" : "text-content-secondary dark:text-ink-dark-muted"}`}
              >
                {isWishlisted ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="p-3 rounded-xl items-center justify-center flex-1 flex-row gap-2 bg-surface-soft dark:bg-surface-dark-elevated"
              style={{ borderWidth: 1, borderColor }}
            >
              <Share2 size={20} color="#8E8E93" />
              <Text variant="label" className="text-content-secondary dark:text-ink-dark-muted font-sans-semibold">
                Share
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text variant="body" className="text-content-secondary dark:text-ink-dark-muted leading-relaxed mb-8">
            {product.description || "No description provided."}
          </Text>

          {/* Meetup */}
          <View className="flex-row gap-3 mb-8">
            <View
              className="flex-1 bg-surface-soft dark:bg-surface-dark-elevated p-4 rounded-xl"
              style={{ borderWidth: 1, borderColor }}
            >
              <Text variant="caption" className="text-[9px] uppercase tracking-widest font-sans-semibold text-brand-teal mb-1">
                Meetup
              </Text>
              <Text variant="label" className="font-sans-semibold text-xs dark:text-ink-dark">
                {product.meetupAvailable ? "Campus Specified" : "Unavailable"}
              </Text>
            </View>
          </View>

          {/* Seller Card */}
          <View className="pt-6" style={{ borderTopWidth: 1, borderTopColor: borderColor }}>
            <Text variant="caption" className="text-[10px] font-sans-semibold uppercase tracking-widest text-content-tertiary dark:text-ink-dark-faint mb-4">
              Listed by Verified Student
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/profile/${product.sellerId}` as any)}
              className="flex-row items-center gap-4 bg-surface-soft dark:bg-surface-dark-elevated p-4 rounded-2xl"
            >
              <View className="w-12 h-12 rounded-full bg-brand-teal/10 items-center justify-center">
                <Text variant="h3" className="text-brand-teal font-sans-bold">
                  {product.sellerName?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1 mb-1">
                  <Text variant="label" className="font-sans-semibold dark:text-ink-dark">
                    {product.sellerName}
                  </Text>
                  <ShieldCheck size={14} color="#14B8A6" />
                </View>
                <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted">
                  {product.sellerSchool}{product.city ? ` • ${product.city}` : ""}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        className="absolute bottom-0 left-0 right-0 p-5 pb-8 bg-surface dark:bg-surface-dark"
        style={{ borderTopWidth: 1, borderTopColor: borderColor }}
      >
        <TouchableOpacity
          onPress={isSold || isOwner ? undefined : handleContactSeller}
          disabled={isSold || isOwner}
          className={`w-full py-4 rounded-xl items-center justify-center ${
            isSold ? "bg-surface-soft dark:bg-surface-dark-elevated" : "bg-brand-teal"
          }`}
        >
          <Text
            variant="caption"
            className={`font-sans-bold uppercase tracking-[0.2em] ${
              isSold ? "text-content-tertiary dark:text-ink-dark-faint" : "text-white"
            }`}
          >
            {isSold ? "Sold Out" : isOwner ? "Edit Listing" : "Contact Seller"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}