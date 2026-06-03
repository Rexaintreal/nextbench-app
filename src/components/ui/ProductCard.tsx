import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Heart, MapPin, Tag } from 'lucide-react-native';

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
  city?: string;
  createdAt: any;
}

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onPress: () => void;
  onToggleWishlist: () => void;
}

export default function ProductCard({ product, isWishlisted, onPress, onToggleWishlist }: ProductCardProps) {
  const isSold = product.status === 'sold';
  
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={isSold}
      className={`mx-4 my-2 rounded-3xl overflow-hidden border border-brand-teal/5 bg-surface-card shadow-sm ${
        isSold ? 'opacity-70' : ''
      }`}
    >
      {/* Header */}
      <View className="flex-row items-center p-4">
        <View className="w-9 h-9 rounded-full bg-surface-base items-center justify-center mr-3">
          <Text variant="label" className="text-brand-teal font-bold">
            {product.sellerName?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="label" className="font-bold mb-0.5" numberOfLines={1}>
            {product.sellerName}
          </Text>
          <Text variant="caption" className="text-content-secondary" numberOfLines={1}>
            {product.sellerSchool}
          </Text>
        </View>
        <View className="items-end">
          <Text variant="h3" className="mb-1">₹{product.price}</Text>
          <View className="bg-brand-teal/10 px-2 py-0.5 rounded flex-row items-center">
            <Text variant="caption" className="text-brand-teal text-[9px] uppercase font-bold tracking-wider">
              Marketplace
            </Text>
          </View>
        </View>
      </View>

      <Text variant="body" className="px-4 mb-3 font-semibold" numberOfLines={1}>
        {product.title}
      </Text>

      {/* Image Container */}
      <View className="relative w-full aspect-[4/3] bg-surface-base">
        <Image
          source={{ uri: product.image }}
          className="w-full h-full"
          resizeMode="contain"
        />
        
        {/* Badges */}
        <View className="absolute top-3 left-3 bg-surface/90 px-2.5 py-1 rounded-lg">
          <Text variant="caption" className="text-[10px] font-bold text-content">{product.condition}</Text>
        </View>
        <View className="absolute bottom-3 left-3 bg-content/60 px-2.5 py-1 rounded-lg">
          <Text variant="caption" className="text-[10px] font-bold text-white">{product.category}</Text>
        </View>

        {isSold && (
          <View className="absolute inset-0 bg-content/20 items-center justify-center">
            <View className="flex-row items-center bg-content px-5 py-2 rounded-full">
              <Tag size={12} color="#fff" />
              <Text variant="caption" className="ml-1 text-[11px] font-bold text-white uppercase tracking-widest">
                Sold
              </Text>
            </View>
          </View>
        )}

        {!isSold && (
          <TouchableOpacity
            onPress={(e) => {
              // Ensure touch doesn't propagate to the main card if it was possible
              onToggleWishlist();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-surface/80 items-center justify-center shadow-sm"
          >
            <Heart size={18} color={isWishlisted ? '#F77CA2' : '#8E8E93'} fill={isWishlisted ? '#F77CA2' : 'transparent'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between p-4 border-t border-brand-teal/5">
        <View className="flex-row items-center">
          <MapPin size={14} color="#8E8E93" />
          <Text variant="caption" className="ml-1 text-content-secondary">
            {product.city || 'Lucknow'}
          </Text>
        </View>
        <View className={`px-5 py-2 rounded-xl ${isSold ? 'bg-content/10' : 'bg-brand-teal'}`}>
          <Text variant="caption" className={`font-bold ${isSold ? 'text-content-tertiary' : 'text-white'}`}>
            {isSold ? 'Sold' : 'View'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
