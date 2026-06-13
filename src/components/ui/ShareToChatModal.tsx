/**
 * ShareToChatModal
 *
 * Instagram-style "Send to..." bottom sheet.
 * Opens when the user taps Share2 on any PostCard.
 * Lets them pick one or more DM conversations and sends a post_share message.
 *
 * Usage:
 *   <ShareToChatModal
 *     visible={shareModalVisible}
 *     onClose={() => setShareModalVisible(false)}
 *     post={post}
 *   />
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/providers/AuthProvider';
import { sendPostToChat, getOrCreateDMRoom } from '@/lib/social';
import { User, Search, Check, Send, X } from 'lucide-react-native';
import firestore from '@react-native-firebase/firestore';
import { Post } from '@/components/ui/PostCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.72;

interface ChatContact {
  roomId: string;
  otherUserId: string;
  name: string;
  profilePicture?: string | null;
  username?: string;
}

interface ShareToChatModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post;
}

export default function ShareToChatModal({ visible, onClose, post }: ShareToChatModalProps) {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [filtered, setFiltered] = useState<ChatContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  // Animation
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelected(new Set());
      setSentTo(new Set());
      setMessage('');
      setSearchTerm('');
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SHEET_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Load existing DM contacts from chatRooms
  useEffect(() => {
    if (!user || !visible) return;
    setLoading(true);

    firestore()
      .collection('chatRooms')
      .where('participants', 'array-contains', user.uid)
      .get()
      .then(async (snap) => {
        const userIds = new Set<string>();
        const roomMap: Record<string, string> = {}; // otherUserId → roomId

        snap.forEach((doc) => {
          const data = doc.data();
          if (data.deletedBy?.includes(user.uid)) return;
          const otherId = data.participants?.find((id: string) => id !== user.uid);
          if (otherId) {
            userIds.add(otherId);
            roomMap[otherId] = doc.id;
          }
        });

        if (userIds.size === 0) {
          setContacts([]);
          setFiltered([]);
          setLoading(false);
          return;
        }

        const userDocs = await Promise.all(
          Array.from(userIds).map((uid) =>
            firestore().collection('users').doc(uid).get()
          )
        );

        const list: ChatContact[] = userDocs
          .filter((d) => d.exists)
          .map((d) => {
            const data = d.data()!;
            return {
              roomId: roomMap[d.id],
              otherUserId: d.id,
              name: data.name || 'Unknown',
              profilePicture: data.profilePicture || null,
              username: data.username || null,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        setContacts(list);
        setFiltered(list);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, visible]);

  // Filter by search
  useEffect(() => {
    const q = searchTerm.toLowerCase();
    setFiltered(
      q
        ? contacts.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              (c.username || '').toLowerCase().includes(q)
          )
        : contacts
    );
  }, [searchTerm, contacts]);

  const toggleSelect = useCallback(
    (contact: ChatContact) => {
      if (sentTo.has(contact.otherUserId)) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(contact.otherUserId)) {
          next.delete(contact.otherUserId);
        } else {
          next.add(contact.otherUserId);
        }
        return next;
      });
    },
    [sentTo]
  );

  const handleSend = async () => {
    if (!user || selected.size === 0) return;
    setSending(true);

    try {
      const targets = contacts.filter((c) => selected.has(c.otherUserId));
      await Promise.all(
        targets.map(async (contact) => {
          // Ensure a room exists (creates one if the contact was found from users search, not existing chat)
          let roomId = contact.roomId;
          if (!roomId) {
            const result = await getOrCreateDMRoom(user.uid, contact.otherUserId);
            roomId = result.roomId;
          }
          await sendPostToChat(roomId, user.uid, post, message.trim());
        })
      );

      setSentTo((prev) => {
        const next = new Set(prev);
        targets.forEach((c) => next.add(c.otherUserId));
        return next;
      });
      setSelected(new Set());
      setMessage('');

      // Auto-close after a brief moment
      setTimeout(() => onClose(), 800);
    } catch (e) {
      console.error('Failed to share post:', e);
    } finally {
      setSending(false);
    }
  };

  const inputBg = isDark ? '#2C2C2E' : '#F0F0F5';
  const sheetBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderClr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const renderContact = ({ item }: { item: ChatContact }) => {
    const isSelected = selected.has(item.otherUserId);
    const isSent = sentTo.has(item.otherUserId);

    return (
      <TouchableOpacity
        onPress={() => toggleSelect(item)}
        disabled={isSent}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: isDark ? '#2C2C2E' : '#F5F5F7',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            marginRight: 12,
          }}
        >
          {item.profilePicture ? (
            <Image
              source={{ uri: item.profilePicture }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <User size={22} color="#8E8E93" />
          )}
        </View>

        {/* Name */}
        <View style={{ flex: 1 }}>
          <Text variant="label" style={{ fontWeight: '600' }} numberOfLines={1}>
            {item.name}
          </Text>
          {item.username ? (
            <Text variant="caption" style={{ color: '#8E8E93', marginTop: 1 }} numberOfLines={1}>
              @{item.username}
            </Text>
          ) : null}
        </View>

        {/* Selection indicator */}
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            borderWidth: isSent || isSelected ? 0 : 1.5,
            borderColor: '#C7C7CC',
            backgroundColor: isSent
              ? '#34C759'
              : isSelected
              ? '#0071E3'
              : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {(isSelected || isSent) && <Check size={14} color="#fff" strokeWidth={2.5} />}
        </View>
      </TouchableOpacity>
    );
  };

  // Post preview card (compact)
  const PostPreview = () => (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: borderClr,
        overflow: 'hidden',
        backgroundColor: isDark ? '#2C2C2E' : '#F9F9FB',
      }}
    >
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: isDark ? '#3A3A3C' : '#E5E5EA',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
              overflow: 'hidden',
            }}
          >
            {post.authorProfilePicture ? (
              <Image
                source={{ uri: post.authorProfilePicture }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Text variant="caption" style={{ fontSize: 11, fontWeight: '600', color: '#8E8E93' }}>
                {(post.isAnonymous ? 'A' : post.authorName?.[0])?.toUpperCase() || '?'}
              </Text>
            )}
          </View>
          <Text variant="caption" style={{ color: '#8E8E93', fontWeight: '500' }}>
            {post.isAnonymous ? 'Anonymous' : post.authorName}
          </Text>
        </View>
        {post.title ? (
          <Text variant="label" style={{ fontWeight: '600', marginBottom: 2 }} numberOfLines={1}>
            {post.title}
          </Text>
        ) : null}
        <Text variant="caption" style={{ color: '#8E8E93', lineHeight: 18 }} numberOfLines={2}>
          {post.content}
        </Text>
      </View>
      {(post.imageUrl || (post.imageUrls && post.imageUrls.length > 0)) ? (
        <Image
          source={{ uri: post.imageUrls?.[0] || post.imageUrl! }}
          style={{ width: '100%', height: 120 }}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFill,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: backdropAnim,
        }}
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      >
        <Animated.View
          style={{
            height: SHEET_HEIGHT,
            backgroundColor: sheetBg,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Handle + Header */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: isDark ? '#48484A' : '#D1D1D6',
              }}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 20,
              paddingBottom: 12,
              position: 'relative',
            }}
          >
            <Text variant="h4" style={{ fontWeight: '700' }}>
              Send to...
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ position: 'absolute', right: 20 }}
            >
              <X size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: inputBg,
                borderRadius: 12,
                paddingHorizontal: 12,
              }}
            >
              <Search size={16} color="#8E8E93" style={{ marginRight: 8 }} />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search..."
                placeholderTextColor="#8E8E93"
                style={{
                  flex: 1,
                  height: 40,
                  fontSize: 15,
                  color: isDark ? '#F5F5F7' : '#1A1A1C',
                }}
              />
            </View>
          </View>

          {/* Contact list */}
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#0071E3" />
            </View>
          ) : filtered.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
              <Text variant="caption" style={{ color: '#8E8E93', textAlign: 'center' }}>
                {searchTerm
                  ? 'No contacts match your search.'
                  : 'No conversations yet. Start a chat with someone first.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.otherUserId}
              renderItem={renderContact}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Post preview + message input + Send */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: borderClr,
              paddingTop: 12,
              paddingBottom: Platform.OS === 'ios' ? 28 : 16,
            }}
          >
            <PostPreview />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                gap: 10,
              }}
            >
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Add a message..."
                placeholderTextColor="#8E8E93"
                style={{
                  flex: 1,
                  height: 42,
                  backgroundColor: inputBg,
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  fontSize: 15,
                  color: isDark ? '#F5F5F7' : '#1A1A1C',
                }}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={selected.size === 0 || sending}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: selected.size > 0 ? '#0071E3' : (isDark ? '#2C2C2E' : '#E5E5EA'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={18} color={selected.size > 0 ? '#fff' : '#8E8E93'} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Need to import StyleSheet for absoluteFillObject
import { StyleSheet } from 'react-native';