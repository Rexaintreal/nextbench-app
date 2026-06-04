import React, { useState, useEffect } from "react";
import { View, FlatList, ActivityIndicator, TouchableOpacity, Image, TextInput, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { MessageSquare, Search, User } from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";

interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastSenderId?: string;
  updatedAt: any;
  productTitle: string;
  type?: string;
  otherUser?: any;
}

function formatTime(timestamp: any): string {
  if (!timestamp?.toMillis) return '';
  const date = new Date(timestamp.toMillis());
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) return;

    const userCache: Record<string, any> = {};

    const unsubscribe = firestore()
      .collection('chatRooms')
      .where('participants', 'array-contains', user.uid)
      .onSnapshot(async (snapshot) => {
        if (!snapshot) return;
        
        try {
          const uncachedUserIds = new Set<string>();
          snapshot.forEach(doc => {
            const data = doc.data() as ChatRoom;
            const otherUserId = data.participants.find(id => id !== user.uid);
            if (otherUserId && !userCache[otherUserId]) {
              uncachedUserIds.add(otherUserId);
            }
          });

          if (uncachedUserIds.size > 0) {
            const fetchPromises = Array.from(uncachedUserIds).map(async (userId) => {
              const uDoc = await firestore().collection('users').doc(userId).get();
              if (uDoc.data()) {
                userCache[userId] = { id: userId, ...uDoc.data() };
              } else {
                userCache[userId] = { id: userId, name: 'Deleted User' };
              }
            });
            await Promise.all(fetchPromises);
          }

          const rooms: ChatRoom[] = [];
          snapshot.forEach(doc => {
            const data = doc.data() as ChatRoom;
            const otherUserId = data.participants.find(id => id !== user.uid);
            if (otherUserId) {
              rooms.push({ ...data, id: doc.id, otherUser: userCache[otherUserId] });
            }
          });

          rooms.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis?.() || 0;
            const timeB = b.updatedAt?.toMillis?.() || 0;
            return timeB - timeA;
          });

          setChatRooms(rooms);
        } catch (error) {
          console.error("Error processing chats:", error);
        } finally {
          setLoading(false);
        }
      }, (error) => {
        console.error("Failed to fetch chatrooms", error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [user]);

  const filteredRooms = chatRooms.filter(room => 
    room.otherUser?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }: { item: ChatRoom }) => {
    const isUnread = item.unreadBy?.includes(user?.uid || "") && item.lastSenderId !== user?.uid;
    return (
      <TouchableOpacity 
        onPress={() => {
          router.push(`/chat/${item.id}` as any);
        }}
        className={`flex-row items-center py-3.5 px-5 active:bg-surface-soft dark:active:bg-surface-dark-secondary ${isUnread ? 'bg-brand-teal/[0.02]' : ''}`}
        activeOpacity={0.7}
      >
        <View className="w-12 h-12 rounded-full bg-surface-soft dark:bg-surface-dark-secondary items-center justify-center overflow-hidden mr-3.5">
          {item.otherUser?.profilePicture ? (
            <Image source={{ uri: item.otherUser.profilePicture }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <User size={20} color="#8E8E93" />
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text variant="label" className={`font-sans-semibold ${isUnread ? 'text-content font-bold' : ''}`} numberOfLines={1}>
              {item.otherUser?.name || 'Unknown User'}
            </Text>
            <View className="flex-row items-center gap-2">
              {isUnread && <View className="w-2 h-2 bg-brand-pink rounded-full" />}
              <Text variant="caption" className={`text-content-tertiary text-[12px] ${isUnread ? 'text-brand-pink font-bold' : ''}`}>
                {formatTime(item.updatedAt)}
              </Text>
            </View>
          </View>
          <Text variant="caption" className={`text-content-tertiary ${isUnread ? 'text-content font-medium' : ''}`} numberOfLines={1}>
            {item.productTitle ? `${item.productTitle} · ` : ''}
            {item.lastSenderId === user?.uid ? 'You: ' : ''}
            {item.lastMessage || 'Start the conversation...'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="px-5 pt-3 pb-3 border-b border-surface-soft dark:border-surface-dark-secondary">
        <Text variant="h2" className="text-[22px] mb-3">
          Messages
        </Text>
        
        <View className="relative">
          <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
            <Search size={16} color="#8E8E93" />
          </View>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search messages..."
            placeholderTextColor="#8E8E93"
            className="bg-surface-soft dark:bg-surface-dark-secondary rounded-xl py-2.5 pl-10 pr-4 text-content dark:text-content-dark text-[15px]"
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0071E3" />
        </View>
      ) : filteredRooms.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-14 h-14 bg-surface-soft dark:bg-surface-dark-secondary rounded-full items-center justify-center mb-4">
            <MessageSquare size={28} color="#8E8E93" />
          </View>
          <Text variant="h4" className="mb-2">No messages</Text>
          <Text variant="caption" className="text-content-tertiary text-center leading-[20px]">
            Start a conversation by contacting a seller from the marketplace.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          ItemSeparatorComponent={() => (
            <View className="h-[0.5px] ml-[76px] mr-5" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
          )}
        />
      )}
    </SafeAreaView>
  );
}
