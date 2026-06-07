/**
 * Wishlist Screen
 */

import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { ChevronLeft, Heart, MapPin, Trash2, Tag } from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";

interface WishlistItem {
  wishlistDocId: string;
  productId: string;
  product: {
    id: string;
    title: string;
    price: number;
    category: string;
    condition: string;
    image: string;
    status: string;
    sellerId: string;
    sellerName: string;
    sellerSchool: string;
    city?: string;
  } | null;
}

export default function WishlistScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const iconColor = isDark ? "#F5F5F7" : "#1D1D1F";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = firestore()
      .collection("wishlists")
      .where("userId", "==", user.uid)
      .onSnapshot(
        async (snapshot) => {
          const wishlistDocs = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as any[];

          const productPromises = wishlistDocs.map(async (wd) => {
            try {
              const productDoc = await firestore()
                .collection("products")
                .doc(wd.productId)
                .get();
              return {
                wishlistDocId: wd.id,
                productId: wd.productId,
                product: productDoc.data()
                  ? { id: productDoc.id, ...productDoc.data() }
                  : null,
              } as WishlistItem;
            } catch {
              return {
                wishlistDocId: wd.id,
                productId: wd.productId,
                product: null,
              } as WishlistItem;
            }
          });

          const resolved = await Promise.all(productPromises);
          setItems(resolved.filter((i) => i.product !== null));
          setLoading(false);
        },
        (error) => {
          console.error("Wishlist listener error:", error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

  const removeFromWishlist = async (wishlistDocId: string) => {
    try {
      await firestore().collection("wishlists").doc(wishlistDocId).delete();
    } catch {
      Alert.alert("Error", "Failed to remove item from wishlist.");
    }
  };

  const renderItem = ({ item }: { item: WishlistItem }) => {
    const product = item.product!;
    const isSold = product.status === "sold";
    const isReserved = product.status === "reserved";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/product/${product.id}` as any)}
        className="mx-4 my-2 rounded-2xl overflow-hidden bg-surface dark:bg-surface-dark-card"
        style={{ borderWidth: 1, borderColor }}
      >
        <View className="flex-row">
          {/* Image */}
          <View className="w-28 h-28 bg-surface-soft dark:bg-surface-dark-secondary relative">
            <Image
              source={{ uri: product.image || "" }}
              className="w-full h-full"
              resizeMode="cover"
            />
            {isSold && (
              <View className="absolute inset-0 bg-black/40 items-center justify-center">
                <View className="flex-row items-center bg-black/70 px-3 py-1 rounded-full">
                  <Tag size={10} color="#fff" />
                  <Text
                    variant="caption"
                    className="ml-1 text-[9px] font-sans-bold text-white uppercase tracking-widest"
                  >
                    Sold
                  </Text>
                </View>
              </View>
            )}
            {isReserved && !isSold && (
              <View className="absolute top-2 left-2 bg-amber-500 px-2 py-0.5 rounded-full">
                <Text
                  variant="caption"
                  className="text-[8px] font-sans-bold text-white uppercase tracking-widest"
                >
                  Reserved
                </Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View className="flex-1 p-3 justify-between">
            <View>
              <Text
                variant="label"
                className="font-sans-semibold mb-1 dark:text-ink-dark"
                numberOfLines={1}
              >
                {product.title}
              </Text>
              <Text variant="h3" className="text-brand-pink mb-1">
                ₹{product.price}
              </Text>
              <Text
                variant="caption"
                className="text-content-tertiary dark:text-ink-dark-faint text-[10px] uppercase tracking-widest font-sans-semibold"
              >
                {product.condition} • {product.category}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center">
                <MapPin size={12} color={isDark ? "#636366" : "#8E8E93"} />
                <Text
                  variant="caption"
                  className="ml-1 text-content-tertiary dark:text-ink-dark-faint text-[10px]"
                >
                  {product.city || "Lucknow"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeFromWishlist(item.wishlistDocId)}
                className="p-2 rounded-lg bg-red-500/10"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["top"]}
    >
      {/* Header */}
      <View
        className="px-5 py-4 flex-row items-center bg-surface dark:bg-surface-dark"
        style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 mr-2"
        >
          <ChevronLeft size={24} color={iconColor} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text variant="h2" className="text-2xl dark:text-ink-dark">
            Wishlist
          </Text>
          <Text
            variant="caption"
            className="text-content-tertiary dark:text-ink-dark-faint text-[10px] uppercase tracking-widest font-sans-semibold"
          >
            {items.length} saved item{items.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center bg-surface dark:bg-surface-dark">
          <ActivityIndicator color="#F43F5E" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 bg-surface dark:bg-surface-dark">
          <View className="w-16 h-16 bg-brand-pink/10 rounded-2xl items-center justify-center mb-4">
            <Heart size={32} color="#F43F5E" />
          </View>
          <Text variant="h3" className="mb-2 dark:text-ink-dark">
            Nothing Saved Yet
          </Text>
          <Text
            variant="caption"
            className="text-content-secondary dark:text-ink-dark-muted text-center mb-6"
          >
            Browse the marketplace and tap the heart icon to save items you love.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 bg-brand-teal rounded-xl"
          >
            <Text
              variant="label"
              className="text-white font-sans-semibold uppercase tracking-widest text-[10px]"
            >
              Explore Marketplace
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.wishlistDocId}
          renderItem={renderItem}
          className="bg-surface dark:bg-surface-dark"
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}