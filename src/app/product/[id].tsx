import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, Image, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { ChevronLeft, MapPin, Heart, Share2, ShieldCheck, Tag } from "lucide-react-native";
import { useAuth } from "@/providers/AuthProvider";
import { fetchDocument } from "@/services/firebase/firestore";
import { Product } from "@/components/ui/ProductCard";
import firestore from "@react-native-firebase/firestore";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  
  useEffect(() => {
    if (!id) return;
    
    // Using onSnapshot for realtime updates (like 'sold' status)
    const unsubscribe = firestore()
      .collection('products')
      .doc(id)
      .onSnapshot((docSnap) => {
        if (docSnap.exists) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching product:", error);
        setLoading(false);
      });
      
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    const unsubscribe = firestore()
      .collection('wishlists')
      .where('userId', '==', user.uid)
      .where('productId', '==', id)
      .onSnapshot((snap) => {
        setIsWishlisted(!snap.empty);
      });
    return () => unsubscribe();
  }, [user, id]);

  const handleToggleWishlist = () => {
    // Stub
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark justify-center items-center">
        <ActivityIndicator color="#0071E3" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark justify-center items-center">
        <Text variant="h3" className="text-error">Product Not Found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-6 py-3 bg-surface-card rounded-lg">
          <Text variant="label">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isSold = product.status === 'sold';
  const isReserved = product.status === 'reserved';

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark bg-white" edges={['top']}>
      <View className="px-5 py-3 flex-row items-center border-b border-brand-teal/5 bg-surface/90 z-10">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <Text variant="label" className="ml-2 font-bold flex-1 text-center pr-8" numberOfLines={1}>
          {product.title}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Image Section */}
        <View className="w-full aspect-square bg-surface-base relative">
          <Image
            source={{ uri: product.image }}
            className="w-full h-full"
            resizeMode="contain"
          />
          {isSold && (
            <View className="absolute inset-0 bg-black/40 items-center justify-center">
              <View className="bg-surface-card px-8 py-3 rounded-full">
                <Text variant="label" className="text-content font-bold uppercase tracking-widest">
                  Sold
                </Text>
              </View>
            </View>
          )}
          {isReserved && !isSold && (
            <View className="absolute top-4 right-4 bg-amber-500 px-4 py-2 rounded-full shadow-lg">
              <Text variant="caption" className="text-white font-bold uppercase tracking-widest">
                Reserved
              </Text>
            </View>
          )}
        </View>

        <View className="px-6 pt-6">
          {/* Tags */}
          <View className="flex-row items-center gap-2 mb-4">
            <View className="bg-brand-teal/10 px-3 py-1 rounded-full">
              <Text variant="caption" className="text-brand-teal font-bold uppercase tracking-widest text-[10px]">
                {product.condition}
              </Text>
            </View>
            <Text variant="caption" className="text-content-secondary uppercase tracking-widest text-[10px] font-bold">
              {product.category}
            </Text>
          </View>

          {/* Title & Price */}
          <Text variant="h1" className="text-3xl font-serif-medium mb-2 leading-tight">
            {product.title}
          </Text>
          <Text variant="h2" className="text-2xl font-serif text-brand-pink mb-6 italic">
            ₹{product.price}
          </Text>

          {/* Actions */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity 
              onPress={handleToggleWishlist}
              className={`p-3 rounded-xl border items-center justify-center flex-1 flex-row gap-2 ${
                isWishlisted ? 'bg-brand-pink/10 border-brand-pink/20' : 'border-content-secondary/20'
              }`}
            >
              <Heart size={20} color={isWishlisted ? '#F77CA2' : '#8E8E93'} fill={isWishlisted ? '#F77CA2' : 'transparent'} />
              <Text variant="label" className={isWishlisted ? 'text-brand-pink font-bold' : 'text-content-secondary font-bold'}>
                {isWishlisted ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="p-3 rounded-xl border border-content-secondary/20 items-center justify-center flex-1 flex-row gap-2">
              <Share2 size={20} color="#8E8E93" />
              <Text variant="label" className="text-content-secondary font-bold">Share</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text variant="body" className="text-content-secondary leading-relaxed mb-8">
            {product.description || "No description provided."}
          </Text>

          {/* Service options */}
          <View className="flex-row gap-3 mb-8">
            <View className="flex-1 bg-surface-card p-4 rounded-xl border border-brand-teal/5 shadow-sm">
              <Text variant="caption" className="text-[9px] uppercase tracking-widest font-bold text-brand-teal/60 mb-1">
                Meetup
              </Text>
              <Text variant="label" className="font-bold text-xs">
                {product.meetupAvailable ? 'Campus Specified' : 'Unavailable'}
              </Text>
            </View>
          </View>

          {/* Seller Card */}
          <View className="pt-8 border-t border-content-secondary/10">
            <Text variant="caption" className="text-[10px] font-bold uppercase tracking-widest text-content-secondary/60 mb-4">
              Listed by Verified Student
            </Text>
            <TouchableOpacity className="flex-row items-center gap-4 bg-surface-soft p-4 rounded-2xl">
              <View className="w-12 h-12 rounded-full bg-brand-teal/10 items-center justify-center">
                <Text variant="h3" className="text-brand-teal font-serif">
                  {product.sellerName?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1 mb-1">
                  <Text variant="label" className="font-bold">{product.sellerName}</Text>
                  <ShieldCheck size={14} color="#0071E3" />
                </View>
                <Text variant="caption" className="text-content-secondary flex-row items-center">
                  {product.sellerSchool} {product.city ? `• ${product.city}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-surface/95 border-t border-content-secondary/10 pb-8">
        <TouchableOpacity 
          disabled={isSold || (user?.uid === product.sellerId)}
          className={`w-full py-4 rounded-xl items-center justify-center shadow-lg ${
            isSold 
              ? 'bg-content-tertiary'
              : user?.uid === product.sellerId
              ? 'bg-brand-teal' 
              : 'bg-brand-teal shadow-brand-teal/20'
          }`}
        >
          <Text variant="caption" className="text-white font-bold uppercase tracking-[0.2em]">
            {isSold 
              ? 'Sold Out'
              : user?.uid === product.sellerId
              ? 'Edit Listing'
              : 'Contact Seller'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
