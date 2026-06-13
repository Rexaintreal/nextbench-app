/**
 * PostShareBubble
 *
 * Renders a shared post inside a chat message bubble.
 * Tapping it navigates to the post detail screen.
 *
 * Usage (inside your chat [id].tsx message renderer):
 *   if (msg.type === 'post_share') {
 *     return <PostShareBubble message={msg} isMine={isMine} />;
 *   }
 */

import React from 'react';
import { View, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { FileText } from 'lucide-react-native';

interface PostShareBubbleProps {
  message: {
    id: string;
    senderId: string;
    type: 'post_share';
    postId: string;
    postSnapshot: {
      title?: string;
      content?: string;
      authorName?: string;
      authorProfilePicture?: string | null;
      imageUrl?: string | null;
      isAnonymous?: boolean;
      type?: string;
    };
    /** Optional plain-text message the sender added */
    text?: string;
    createdAt: any;
  };
  isMine: boolean;
}

export default function PostShareBubble({ message, isMine }: PostShareBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const snap = message.postSnapshot || {};

  const displayName = snap.isAnonymous ? 'Anonymous' : snap.authorName || 'Unknown';
  const avatarLetter = displayName[0]?.toUpperCase() || '?';

  const handlePress = () => {
    if (message.postId) {
      router.push(`/post/${message.postId}` as any);
    }
  };

  const bubbleBg = isMine
    ? '#0071E3'
    : isDark
    ? '#2C2C2E'
    : '#F0F0F5';

  const cardBg = isMine
    ? 'rgba(255,255,255,0.15)'
    : isDark
    ? '#3A3A3C'
    : '#FFFFFF';

  const textColor = isMine ? '#FFFFFF' : isDark ? '#F5F5F7' : '#1A1A1C';
  const mutedColor = isMine ? 'rgba(255,255,255,0.7)' : '#8E8E93';
  const borderColor = isMine ? 'rgba(255,255,255,0.2)' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <View style={{ maxWidth: 280 }}>
      {/* Optional caption message */}
      {message.text ? (
        <View
          style={{
            backgroundColor: bubbleBg,
            borderRadius: 18,
            borderBottomLeftRadius: isMine ? 18 : 4,
            borderBottomRightRadius: isMine ? 4 : 18,
            paddingHorizontal: 14,
            paddingVertical: 10,
            marginBottom: 4,
          }}
        >
          <Text style={{ color: textColor, fontSize: 15, lineHeight: 21 }}>
            {message.text}
          </Text>
        </View>
      ) : null}

      {/* Post card */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={{
          backgroundColor: cardBg,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: borderColor,
          overflow: 'hidden',
        }}
      >
        {/* Cover image */}
        {snap.imageUrl ? (
          <Image
            source={{ uri: snap.imageUrl }}
            style={{ width: '100%', height: 130 }}
            resizeMode="cover"
          />
        ) : null}

        <View style={{ padding: 12 }}>
          {/* Author row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isMine
                  ? 'rgba(255,255,255,0.2)'
                  : isDark
                  ? '#48484A'
                  : '#E5E5EA',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 6,
                overflow: 'hidden',
              }}
            >
              {!snap.isAnonymous && snap.authorProfilePicture ? (
                <Image
                  source={{ uri: snap.authorProfilePicture }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ fontSize: 10, fontWeight: '600', color: mutedColor }}>
                  {avatarLetter}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 12, color: mutedColor, fontWeight: '500' }}>
              {displayName}
            </Text>
            {snap.type ? (
              <View
                style={{
                  marginLeft: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 6,
                  backgroundColor: isMine
                    ? 'rgba(255,255,255,0.15)'
                    : isDark
                    ? '#48484A'
                    : '#F0F0F5',
                }}
              >
                <Text style={{ fontSize: 10, color: mutedColor, fontWeight: '600', textTransform: 'capitalize' }}>
                  {snap.type}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Title */}
          {snap.title ? (
            <Text
              style={{ fontSize: 14, fontWeight: '700', color: textColor, marginBottom: 4 }}
              numberOfLines={2}
            >
              {snap.title}
            </Text>
          ) : null}

          {/* Content */}
          <Text
            style={{ fontSize: 13, color: mutedColor, lineHeight: 18 }}
            numberOfLines={snap.title ? 2 : 3}
          >
            {snap.content || ''}
          </Text>

          {/* Tap hint */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: borderColor,
            }}
          >
            <FileText size={12} color={mutedColor} />
            <Text style={{ fontSize: 12, color: mutedColor, marginLeft: 4 }}>
              View post
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}