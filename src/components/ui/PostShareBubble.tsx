import React from 'react';
import { View, TouchableOpacity, Image, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { FileText, ShoppingBag } from 'lucide-react-native';

interface PostShareBubbleProps {
  message: {
    id: string;
    senderId: string;
    type?: string;
    postId?: string;
    postSnapshot?: any;
    sharedPost?: any;
    text?: string;
    createdAt: any;
  };
  isMine: boolean;
}

export default function PostShareBubble({ message, isMine }: PostShareBubbleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Handle both field shapes (postSnapshot from new mobile, sharedPost from web/old mobile)
  const raw = message.postSnapshot || message.sharedPost || {};
  const postId = message.postId || raw.id || '';
  const isProduct = raw.kind === 'product' || raw.type === 'product';

  const title = raw.title || '';
  const body = raw.content || raw.description || '';
  const imageUrl = raw.imageUrl || raw.image || null;
  const authorName = raw.isAnonymous ? 'Anonymous' : (raw.authorName || 'Unknown');
  const avatarLetter = authorName[0]?.toUpperCase() || '?';

  const handlePress = () => {
    if (!postId) return;
    router.push(`/${isProduct ? 'product' : 'post'}/${postId}` as any);
  };

  const bubbleBg = isMine ? '#0071E3' : isDark ? '#2C2C2E' : '#F0F0F5';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#F5F5F7' : '#1A1A1C';
  const mutedColor = isDark ? '#98989D' : '#8E8E93';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const avatarBg = isDark ? '#2C2C2E' : '#E5E5EA';

  return (
    <View style={{ maxWidth: 280 }}>
      {/* Optional caption */}
      {message.text ? (
        <View style={{
          backgroundColor: bubbleBg,
          borderRadius: 18,
          borderBottomLeftRadius: isMine ? 18 : 4,
          borderBottomRightRadius: isMine ? 4 : 18,
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginBottom: 4,
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 15, lineHeight: 21 }}>
            {message.text}
          </Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={{
          backgroundColor: cardBg,
          borderRadius: 14,
          borderWidth: 1,
          borderColor,
          overflow: 'hidden',
        }}
      >
        {/* Cover image */}
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', height: 150 }}
            resizeMode="cover"
          />
        ) : null}

        <View style={{ padding: 12 }}>
          {/* Author + type badge row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: avatarBg,
              alignItems: 'center', justifyContent: 'center',
              marginRight: 6, overflow: 'hidden',
            }}>
              {!raw.isAnonymous && raw.authorProfilePicture ? (
                <Image source={{ uri: raw.authorProfilePicture }}
                  style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 10, fontWeight: '600', color: mutedColor }}>
                  {avatarLetter}
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 12, color: mutedColor, fontWeight: '500', flex: 1 }} numberOfLines={1}>
              {authorName}
            </Text>
            {/* Type badge */}
            <View style={{
              paddingHorizontal: 8, paddingVertical: 3,
              borderRadius: 6,
              backgroundColor: isProduct
                ? 'rgba(20,184,166,0.1)'
                : isDark ? '#2C2C2E' : '#F0F0F5',
            }}>
              <Text style={{
                fontSize: 10, fontWeight: '600',
                color: isProduct ? '#14B8A6' : mutedColor,
                textTransform: 'capitalize',
              }}>
                {isProduct ? 'Product' : (raw.type || raw.kind || 'Post')}
              </Text>
            </View>
          </View>

          {/* Title */}
          {title ? (
            <Text style={{ fontSize: 14, fontWeight: '700', color: textColor, marginBottom: 4 }}
              numberOfLines={2}>
              {title}
            </Text>
          ) : null}

          {/* Price line for products, content for posts */}
          {!isProduct && body ? (
            <Text style={{ fontSize: 13, color: mutedColor, lineHeight: 18 }}
              numberOfLines={title ? 2 : 3}>
              {body}
            </Text>
          ) : isProduct && body ? (
            <Text style={{ fontSize: 15, fontWeight: '700', color: textColor, marginBottom: 2 }}>
              {body}
            </Text>
          ) : null}

          {/* Tap hint */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            marginTop: 10, paddingTop: 10,
            borderTopWidth: 1, borderTopColor: borderColor,
          }}>
            {isProduct
              ? <ShoppingBag size={12} color={mutedColor} />
              : <FileText size={12} color={mutedColor} />
            }
            <Text style={{ fontSize: 12, color: mutedColor, marginLeft: 4 }}>
              {isProduct ? 'View product' : 'View post'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}