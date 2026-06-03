import React, { useState, useEffect, useRef } from "react";
import { View, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { ArrowLeft, Send, Image as ImageIcon } from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import storage from "@react-native-firebase/storage";

interface Message {
  id: string;
  senderId: string;
  text?: string;
  image?: string;
  createdAt: any;
  deletedFor?: string[];
  isDeletedForEveryone?: boolean;
}

export default function ChatRoomScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<any>(null);
  
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user || !roomId) return;

    // Fetch other user's info from chat room data
    const fetchRoomInfo = async () => {
      try {
        const roomDoc = await firestore().collection('chatRooms').doc(roomId).get();
        if (roomDoc.exists()) {
          const data = roomDoc.data();
          const otherUserId = data?.participants?.find((p: string) => p !== user.uid);
          if (otherUserId) {
            const userDoc = await firestore().collection('users').doc(otherUserId).get();
            if (userDoc.exists()) {
              setOtherUser({ id: otherUserId, ...userDoc.data() });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch room info", err);
      }
    };
    fetchRoomInfo();

    const unsubscribe = firestore()
      .collection('chatRooms')
      .doc(roomId)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .onSnapshot((snapshot) => {
        if (!snapshot) return;
        const msgs: Message[] = [];
        snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [roomId, user]);

  const handleSend = async (text?: string, image?: string) => {
    if (!user || !roomId || (!text?.trim() && !image)) return;
    
    const messageText = text?.trim();
    setNewMessage("");

    try {
      const msgData: any = {
        senderId: user.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
      };
      if (messageText) msgData.text = messageText;
      if (image) msgData.image = image;

      await firestore().collection('chatRooms').doc(roomId).collection('messages').add(msgData);

      const updateData: any = {
        lastMessage: image ? '📷 Image' : messageText,
        lastSenderId: user.uid,
        updatedAt: firestore.FieldValue.serverTimestamp()
      };
      
      // Update unread status (simplified)
      await firestore().collection('chatRooms').doc(roomId).update(updateData);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setIsUploading(true);
      try {
        const uri = result.assets[0].uri;
        const filename = uri.substring(uri.lastIndexOf('/') + 1);
        const ref = storage().ref(`chats/${roomId}/${filename}`);
        await ref.putFile(uri);
        const url = await ref.getDownloadURL();
        await handleSend(undefined, url);
      } catch (err) {
        console.error("Failed to upload image", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.uid;
    const isDeleted = item.isDeletedForEveryone;

    if (item.deletedFor?.includes(user?.uid || '')) return null;

    return (
      <View className={`flex-row mb-3 px-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
        <View className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isMe ? 'bg-brand-teal rounded-tr-sm' : 'bg-surface-soft border border-content-secondary/10 rounded-tl-sm'
        }`}>
          {isDeleted ? (
            <Text variant="caption" className={`italic ${isMe ? 'text-white/60' : 'text-content-secondary'}`}>
              This message was deleted
            </Text>
          ) : (
            <>
              {item.image && (
                <Image 
                  source={{ uri: item.image }} 
                  className="w-48 h-48 rounded-lg mb-2" 
                  resizeMode="cover"
                />
              )}
              {item.text && (
                <Text variant="body" className={`${isMe ? 'text-white' : 'text-content'}`}>
                  {item.text}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
        <ActivityIndicator color="#0071E3" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="px-4 py-3 border-b border-brand-teal/5 bg-surface flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
          <ArrowLeft size={24} color="#1D1D1F" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text variant="h3" className="font-bold">
            {otherUser ? otherUser.name : 'Loading...'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          inverted={true}
          contentContainerStyle={{ paddingVertical: 16 }}
        />

        {/* Input area */}
        <View className="px-4 py-3 border-t border-content-secondary/10 bg-surface flex-row items-center gap-2">
          <TouchableOpacity 
            onPress={pickImage}
            disabled={isUploading}
            className="p-2 rounded-full bg-surface-soft"
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#0071E3" />
            ) : (
              <ImageIcon size={20} color="#0071E3" />
            )}
          </TouchableOpacity>
          
          <View className="flex-1 bg-surface-soft rounded-full px-4 py-2 flex-row items-center border border-content-secondary/10">
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Message..."
              placeholderTextColor="#8E8E93"
              className="flex-1 text-content font-medium py-1"
              multiline
              maxLength={1000}
            />
          </View>
          
          <TouchableOpacity 
            onPress={() => handleSend(newMessage)}
            disabled={!newMessage.trim() || isUploading}
            className={`p-3 rounded-full ${newMessage.trim() ? 'bg-brand-teal' : 'bg-brand-teal/50'}`}
          >
            <Send size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
