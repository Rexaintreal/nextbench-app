import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Heart, MessageCircle, Share2, Bookmark, Flame } from 'lucide-react-native';

export interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string | null;
  isAnonymous?: boolean;
  school: string;
  type: string;
  imageUrl?: string;
  imageUrls?: string[];
  upvotesCount: number;
  repliesCount: number;
  feedScore?: number;
  city?: string;
  createdAt: any;
}

interface PostCardProps {
  post: Post;
  hasUpvoted: boolean;
  onPress: () => void;
  onUpvote?: () => void;
}

function timeAgo(date: any): string {
  if (!date?.toDate) return '';
  const now = Date.now();
  const then = date.toDate().getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function PostCard({ post, hasUpvoted, onPress, onUpvote }: PostCardProps) {
  const postImageUrls = post.imageUrls && post.imageUrls.length > 0
    ? post.imageUrls
    : (post.imageUrl ? [post.imageUrl] : []);
  const hasImage = postImageUrls.length > 0;

  const isAnonymous = post.type === 'confession' && post.isAnonymous;
  const displayName = isAnonymous ? 'Anonymous' : post.authorName;
  const avatarText = displayName?.[0]?.toUpperCase() || '?';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="bg-surface-card mx-4 my-2 p-5 rounded-3xl border border-brand-teal/5 shadow-sm"
    >
      {/* Title */}
      {post.title ? (
        <Text variant="h3" className="mb-3 leading-snug">
          {post.title}
        </Text>
      ) : null}

      {/* Metadata Row */}
      <View className="flex-row items-center mb-4">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
            isAnonymous ? 'bg-brand-pink-soft/10' : 'bg-brand-teal/10'
          }`}
        >
          {!isAnonymous && post.authorProfilePicture ? (
            <Image
              source={{ uri: post.authorProfilePicture }}
              className="w-full h-full rounded-full"
            />
          ) : (
            <Text
              variant="label"
              className={isAnonymous ? 'text-brand-pink-soft' : 'text-brand-teal'}
            >
              {avatarText}
            </Text>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text variant="label" className="font-bold mr-2" numberOfLines={1}>
              {displayName}
            </Text>
            <Text variant="caption" className="text-content-secondary">
              • {timeAgo(post.createdAt)}
            </Text>
          </View>
          <Text variant="caption" className="text-content-secondary mt-0.5" numberOfLines={1}>
            {post.school} {post.city ? ` • ${post.city}` : ''}
          </Text>
        </View>
        <View className="items-end">
          <View className="bg-brand-teal/10 px-2 py-1 rounded">
            <Text variant="caption" className="text-brand-teal text-[9px] uppercase font-bold tracking-wider">
              {post.type}
            </Text>
          </View>
          {post.feedScore && post.feedScore > 10 ? (
            <View className="bg-amber-500/10 px-2 py-1 rounded mt-1 flex-row items-center">
              <Flame size={10} color="#f59e0b" />
              <Text variant="caption" className="text-amber-500 text-[9px] uppercase font-bold tracking-wider ml-1">
                Hot
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Content */}
      <Text variant="body" className="text-content-secondary leading-relaxed mb-4" numberOfLines={4}>
        {post.content}
      </Text>

      {/* Image */}
      {hasImage && (
        <View className="w-full h-48 rounded-2xl overflow-hidden mb-5 bg-surface-base">
          <Image
            source={{ uri: postImageUrls[0] }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
      )}

      {/* Actions */}
      <View className="flex-row items-center justify-between pt-4 border-t border-content-secondary/10">
        <View className="flex-row items-center gap-6">
          <TouchableOpacity
            onPress={onUpvote}
            className="flex-row items-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Heart size={20} color={hasUpvoted ? '#F77CA2' : '#8E8E93'} fill={hasUpvoted ? '#F77CA2' : 'transparent'} />
            <Text variant="label" className={`ml-1.5 ${hasUpvoted ? 'text-brand-pink-soft' : 'text-content-secondary'}`}>
              {post.upvotesCount || 0}
            </Text>
          </TouchableOpacity>
          <View className="flex-row items-center">
            <MessageCircle size={20} color="#8E8E93" />
            <Text variant="label" className="ml-1.5 text-content-secondary">
              {post.repliesCount || 0}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-4">
          <Share2 size={20} color="#8E8E93" />
          <Bookmark size={20} color="#8E8E93" />
        </View>
      </View>
    </TouchableOpacity>
  );
}
