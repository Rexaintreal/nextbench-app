import React, { useState, useEffect } from "react";
import { View, FlatList, ActivityIndicator, TouchableOpacity, Image, TextInput } from "react-native";
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

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
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
              if (uDoc.exists) {
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
              rooms.push({ id: doc.id, ...data, otherUser: userCache[otherUserId] });
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
      });

    return () => unsubscribe();
  }, [user]);

  const filteredRooms = chatRooms.filter(room => 
    room.otherUser?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderItem = ({ item }: { item: ChatRoom }) => {
    return (
      <TouchableOpacity 
        onPress={() => {
          router.push(`/chat/${item.id}`);
        }}
        className="flex-row items-center py-3 px-5 border-b border-content-secondary/10 active:bg-surface-soft"
      >
        <View className="w-14 h-14 rounded-full bg-brand-teal/10 items-center justify-center overflow-hidden mr-4 border border-brand-teal/20">
          {item.otherUser?.profilePicture ? (
            <Image source={{ uri: item.otherUser.profilePicture }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <User size={24} color="#0071E3" />
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text variant="label" className="font-bold" numberOfLines={1}>
              {item.otherUser?.name || 'Unknown User'}
            </Text>
            <Text variant="caption" className="text-content-secondary text-[10px]">
              {item.updatedAt ? new Date(item.updatedAt.toMillis()).toLocaleDateString() : ''}
            </Text>
          </View>
          <Text variant="caption" className="text-content-secondary" numberOfLines={1}>
            {item.productTitle ? `[${item.productTitle}] ` : ''}
            {item.lastSenderId === user?.uid ? 'You: ' : ''}
            {item.lastMessage || 'Start the conversation...'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="px-5 py-4 border-b border-brand-teal/5 bg-surface/90">
        <Text variant="h2" className="text-2xl font-serif-medium mb-4">
          Messages
        </Text>
        
        <View className="relative">
          <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
            <Search size={18} color="#8E8E93" />
          </View>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search messages..."
            placeholderTextColor="#8E8E93"
            className="bg-surface-soft rounded-xl py-2 pl-10 pr-4 text-content font-medium h-10"
          />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0071E3" />
        </View>
      ) : filteredRooms.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-16 h-16 bg-brand-teal/10 rounded-full items-center justify-center mb-4">
            <MessageSquare size={32} color="#0071E3" />
          </View>
          <Text variant="h3" className="mb-2">No messages</Text>
          <Text variant="caption" className="text-content-secondary text-center">
            Start a conversation by contacting a seller from the marketplace.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}
