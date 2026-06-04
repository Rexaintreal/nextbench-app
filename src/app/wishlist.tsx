/**
 * Wishlist Screen
 *
 * Shows all products the user has wishlisted.
 * Real-time listener, remove items, navigate to product detail.
 *
 * Ported from web: temp_web_repo/src/pages/Dashboard/Wishlist.tsx
 */

import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import {
  ChevronLeft,
  Heart,
  MapPin,
  Trash2,
  Package,
  Tag,
} from "lucide-react-native";
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
  const router = useRouter();
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

          // Fetch all product data
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
    } catch (err) {
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
        className="mx-4 my-2 rounded-2xl overflow-hidden bg-surface-card border border-brand-teal/5 shadow-sm"
      >
        <View className="flex-row">
          {/* Image */}
          <View className="w-28 h-28 bg-surface-base relative">
            <Image
              source={{ uri: product.image || "" }}
              className="w-full h-full"
              resizeMode="cover"
            />
            {isSold && (
              <View className="absolute inset-0 bg-black/40 items-center justify-center">
                <View className="flex-row items-center bg-content px-3 py-1 rounded-full">
                  <Tag size={10} color="#fff" />
                  <Text
                    variant="caption"
                    className="ml-1 text-[9px] font-bold text-white uppercase tracking-widest"
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
                  className="text-[8px] font-bold text-white uppercase tracking-widest"
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
                className="font-bold mb-1"
                numberOfLines={1}
              >
                {product.title}
              </Text>
              <Text variant="h3" className="text-brand-pink mb-1">
                ₹{product.price}
              </Text>
              <View className="flex-row items-center gap-1">
                <Text
                  variant="caption"
                  className="text-content-tertiary text-[10px] uppercase tracking-widest font-bold"
                >
                  {product.condition} • {product.category}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <View className="flex-row items-center">
                <MapPin size={12} color="#8E8E93" />
                <Text
                  variant="caption"
                  className="ml-1 text-content-tertiary text-[10px]"
                >
                  {product.city || "Lucknow"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => removeFromWishlist(item.wishlistDocId)}
                className="p-2 rounded-lg bg-red-500/5"
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
      <View className="px-5 py-4 border-b border-brand-teal/5 bg-surface/90 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2 -ml-2 mr-2"
        >
          <ChevronLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text variant="h2" className="text-2xl font-serif-medium">
            Wishlist
          </Text>
          <Text
            variant="caption"
            className="text-content-tertiary text-[10px] uppercase tracking-widest font-bold"
          >
            {items.length} saved item{items.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#F77CA2" />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-brand-pink/5 rounded-2xl items-center justify-center mb-4">
            <Heart size={32} color="#F77CA2" />
          </View>
          <Text variant="h3" className="mb-2 font-serif italic">
            Nothing Saved Yet
          </Text>
          <Text
            variant="caption"
            className="text-content-secondary text-center mb-6"
          >
            Browse the marketplace and tap the heart icon to save items
            you love.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 bg-brand-teal rounded-xl"
          >
            <Text
              variant="label"
              className="text-white font-bold uppercase tracking-widest text-[10px]"
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
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}
