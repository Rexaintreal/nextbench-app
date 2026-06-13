import React, { useState } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import ShareToChatModal from '@/components/ui/ShareToChatModal';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Heart, MapPin, Tag, Share2 } from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';

export interface Product {
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
  description?: string;
  meetupAvailable?: boolean;
  city?: string;
  createdAt: any;
}

export interface ProductCardProps {
  product: Product;
  isWishlisted?: boolean;
  onPress?: () => void;
  onToggleWishlist?: () => void;
  onSellerPress?: () => void;
}

export default function ProductCard({ product, isWishlisted, onPress, onToggleWishlist, onSellerPress }: ProductCardProps) {
  const isSold = product.status === 'sold';
  const { isDark } = useTheme();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Build a Post-compatible shape for ShareToChatModal
  const productAsShareable = {
    id: product.id,
    title: product.title,
    content: `₹${product.price}`,
    authorId: product.sellerId,
    authorName: product.sellerName,
    authorProfilePicture: null,
    isAnonymous: false,
    school: product.sellerSchool,
    type: 'product',
    imageUrl: product.image,
    imageUrls: [product.image],
    upvotesCount: 0,
    repliesCount: 0,
    city: product.city,
    createdAt: product.createdAt,
  };

  return (
    <View className="bg-surface dark:bg-surface-dark">
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        disabled={isSold}
        className="px-5 py-5"
        style={isSold ? { opacity: 0.6 } : undefined}
      >
        {/* Header */}
        <TouchableOpacity
          className="flex-row items-center mb-3"
          activeOpacity={0.7}
          onPress={onSellerPress}
        >
          <View className="w-10 h-10 rounded-full bg-surface-soft dark:bg-surface-dark-secondary items-center justify-center mr-3 overflow-hidden">
            <Text variant="label" className="text-content-secondary font-sans-semibold">
              {product.sellerName?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View className="flex-1">
            <Text variant="label" className="font-sans-semibold mb-0.5" numberOfLines={1}>
              {product.sellerName}
            </Text>
            <Text variant="caption" className="text-content-tertiary" numberOfLines={1}>
              {product.sellerSchool}
            </Text>
          </View>
          <View className="items-end">
            <Text variant="h3" className="text-[20px] mb-0.5">₹{product.price}</Text>
            <View className="bg-surface-soft dark:bg-surface-dark-secondary px-2 py-0.5 rounded-md">
              <Text variant="caption" className="text-content-secondary text-[11px] font-sans-semibold">
                Marketplace
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <Text variant="h4" className="mb-3" numberOfLines={1}>
          {product.title}
        </Text>

        {/* Image Container */}
        <View className="relative w-full aspect-[4/3] bg-surface-soft dark:bg-surface-dark-secondary rounded-xl overflow-hidden mb-3">
          <Image
            source={{ uri: product.image || '' }}
            className="w-full h-full"
            resizeMode="contain"
          />
          <View className="absolute top-3 left-3 bg-white/90 dark:bg-black/70 px-2.5 py-1 rounded-lg">
            <Text variant="caption" className="text-[11px] font-sans-semibold text-content dark:text-content-dark">{product.condition}</Text>
          </View>
          <View className="absolute bottom-3 left-3 bg-black/50 px-2.5 py-1 rounded-lg">
            <Text variant="caption" className="text-[11px] font-sans-semibold text-white">{product.category}</Text>
          </View>
          {isSold && (
            <View className="absolute inset-0 bg-black/30 items-center justify-center">
              <View className="flex-row items-center bg-black/80 px-5 py-2.5 rounded-full">
                <Tag size={13} color="#fff" />
                <Text variant="caption" className="ml-1.5 text-[12px] font-sans-semibold text-white uppercase tracking-widest">
                  Sold
                </Text>
              </View>
            </View>
          )}
          {!isSold && (
            <TouchableOpacity
              onPress={() => onToggleWishlist?.()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 dark:bg-black/70 items-center justify-center"
            >
              <Heart size={18} color={isWishlisted ? '#FF375F' : '#8E8E93'} fill={isWishlisted ? '#FF375F' : 'transparent'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <MapPin size={14} color="#8E8E93" />
            <Text variant="caption" className="ml-1 text-content-tertiary">
              {product.city || 'Lucknow'}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => setShareModalOpen(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Share2 size={18} color="#8E8E93" />
            </TouchableOpacity>
            <View className={`px-5 py-2.5 rounded-xl ${isSold ? 'bg-surface-soft dark:bg-surface-dark-secondary' : 'bg-brand-teal'}`}>
              <Text variant="caption" className={`font-sans-semibold text-[12px] ${isSold ? 'text-content-tertiary' : 'text-white'}`}>
                {isSold ? 'Sold' : 'View'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <View className="h-[0.5px] mx-5" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />

      <ShareToChatModal
        visible={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        post={productAsShareable as any}
      />
    </View>
  );
}
