import React, { useState } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import ShareToChatModal from '@/components/ui/ShareToChatModal';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Heart, MessageCircle, Share2, Bookmark, Flame, Trash2 } from 'lucide-react-native';
import PollDisplay from '@/components/ui/PollDisplay';
import { ImageSlider } from '@/components/ui/ImageSlider';
import { useTheme } from '@/providers/ThemeProvider';

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
  poll?: {
    choices: string[];
    expiresAt: any;
    votes: Record<string, number>;
  };
}

export interface PostCardProps {
  post: Post;
  hasUpvoted?: boolean;
  isSaved?: boolean;
  onPress?: () => void;
  onUpvote?: () => void;
  onToggleSave?: () => void;
  onAuthorPress?: () => void;
  onDelete?: () => void;
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

export default function PostCard({ post, hasUpvoted, isSaved, onPress, onUpvote, onToggleSave, onAuthorPress, onDelete }: PostCardProps) {
  const { isDark } = useTheme();
  const inputBg = isDark ? '#2C2C2E' : '#F5F5F7';
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const postImageUrls = post.imageUrls && post.imageUrls.length > 0
    ? post.imageUrls
    : (post.imageUrl ? [post.imageUrl] : []);

  const isAnonymous = post.type === 'confession' && post.isAnonymous;
  const displayName = isAnonymous ? 'Anonymous' : post.authorName;
  const avatarText = displayName?.[0]?.toUpperCase() || '?';

  return (
    <View className="bg-surface dark:bg-surface-dark">
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        className="px-5 py-5">

        {/* Author Row */}
        <TouchableOpacity
          className="flex-row items-center mb-3"
          activeOpacity={isAnonymous ? 1 : 0.7}
          disabled={isAnonymous || !onAuthorPress}
          onPress={onAuthorPress}
        >
          <View
            className={`w-10 h-10 rounded-full items-center justify-center mr-3 overflow-hidden ${
              isAnonymous ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-surface-soft dark:bg-surface-dark-secondary'
            }`}
          >
            {!isAnonymous && post.authorProfilePicture ? (
              <Image
                source={{ uri: post.authorProfilePicture || '' }}
                className="w-full h-full rounded-full"
              />
            ) : (
              <Text
                variant="label"
                className={`font-sans-semibold ${isAnonymous ? 'text-purple-500' : 'text-content-secondary'}`}
              >
                {avatarText}
              </Text>
            )}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text variant="label" className="font-sans-semibold mr-1.5" numberOfLines={1}>
                {displayName}
              </Text>
              <Text variant="caption" className="text-content-tertiary">
                · {timeAgo(post.createdAt)}
              </Text>
            </View>
            <Text variant="caption" className="text-content-tertiary mt-0.5" numberOfLines={1}>
              {post.school}{post.city ? ` · ${post.city}` : ''}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className={`px-2 py-1 rounded-md ${
              post.type === 'confession'
                ? 'bg-purple-50 dark:bg-purple-900/20'
                : 'bg-surface-soft dark:bg-surface-dark-secondary'
            }`}>
              <Text variant="caption" className={`text-[11px] font-sans-semibold capitalize ${
                post.type === 'confession' ? 'text-purple-500' : 'text-content-secondary'
              }`}>
                {post.type}
              </Text>
            </View>
            {post.feedScore && post.feedScore > 10 ? (
              <View className="bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md flex-row items-center">
                <Flame size={11} color="#f59e0b" />
                <Text variant="caption" className="text-amber-500 text-[11px] font-sans-semibold ml-0.5">
                  Hot
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Title */}
        {post.title ? (
          <Text variant="h4" className="mb-2">
            {post.title}
          </Text>
        ) : null}

        {/* Content */}
        <Text variant="body" className="text-content-secondary dark:text-content-dark-secondary leading-[24px] mb-3" numberOfLines={5}>
          {post.content}
        </Text>

        {/* Image slider */}
        <ImageSlider urls={postImageUrls} inputBg={inputBg} isDark={isDark} />

        {/* Poll */}
        {post.poll && (
          <PollDisplay postId={post.id} poll={post.poll} compact />
        )}

        {/* Actions */}
        <View className="flex-row items-center justify-between pt-2">
          <View className="flex-row items-center gap-5">
            <TouchableOpacity
              onPress={onUpvote}
              className="flex-row items-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Heart size={20} color={hasUpvoted ? '#FF375F' : '#8E8E93'} fill={hasUpvoted ? '#FF375F' : 'transparent'} />
              <Text variant="caption" className={`ml-1.5 font-sans-medium ${hasUpvoted ? 'text-brand-pink' : 'text-content-tertiary'}`}>
                {post.upvotesCount || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} onPress={onPress}>
              <MessageCircle size={20} color="#8E8E93" />
              <Text variant="caption" className="ml-1.5 text-content-tertiary font-sans-medium">
                {post.repliesCount || 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShareModalOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Share2 size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={onToggleSave}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Bookmark size={20} color={isSaved ? '#0071E3' : '#8E8E93'} fill={isSaved ? '#0071E3' : 'transparent'} />
            </TouchableOpacity>
            {onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
      <View className="h-[0.5px] bg-border dark:bg-border mx-5" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }} />
      <ShareToChatModal
        visible={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        post={post}
      />
    </View>
  );
}
