import React, { useState, useEffect, useRef } from "react";
import { View, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image, ImageBackground, useColorScheme, ActionSheetIOS, Alert, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { ArrowLeft, Send, Image as ImageIcon, User, X, Reply, Forward, Trash } from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import storage from "@react-native-firebase/storage";
import * as Clipboard from 'expo-clipboard';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { createNotification } from "@/lib/notifications";

interface Message {
  id: string;
  senderId: string;
  text?: string;
  image?: string;
  createdAt: any;
  deletedFor?: string[];
  isDeletedForEveryone?: boolean;
  replyTo?: {
    id: string;
    text?: string;
    image?: string;
    senderName?: string;
  };
}

const MessageItem = ({ item, user, handleMessageLongPress, setReplyingTo }: any) => {
  const swipeableRef = useRef<any>(null);
  const isMe = item.senderId === user?.uid;
  const isDeleted = item.isDeletedForEveryone;

  if (item.deletedFor?.includes(user?.uid || '')) return null;

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={40}
      renderLeftActions={() => (
        <View className="justify-center items-center w-16 pl-2">
          <View className="w-8 h-8 rounded-full bg-surface-soft items-center justify-center">
            <Reply size={16} color="#8E8E93" />
          </View>
        </View>
      )}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') {
          setReplyingTo(item);
          swipeableRef.current?.close();
        }
      }}
    >
      <View className={`flex-row mb-3 px-4 ${isMe ? 'justify-end' : 'justify-start'}`}>
        <TouchableOpacity 
          onLongPress={() => handleMessageLongPress(item)}
          delayLongPress={200}
          activeOpacity={0.8}
          className={`max-w-[80%] px-4 py-3 rounded-2xl ${
            isMe ? 'bg-brand-teal rounded-tr-sm' : 'bg-surface-soft border border-content-secondary/10 rounded-tl-sm'
          }`}
        >
          {isDeleted ? (
            <Text variant="caption" className={`italic ${isMe ? 'text-white/60' : 'text-content-secondary'}`}>
              This message was deleted
            </Text>
          ) : (
            <>
              {item.replyTo && (
                <View className={`mb-2 px-3 py-2 rounded-lg border-l-4 ${isMe ? 'bg-black/10 border-white/50' : 'bg-surface dark:bg-surface-elevated border-brand-teal/50'}`}>
                  <Text variant="caption" className={`font-sans-semibold ${isMe ? 'text-white/80' : 'text-brand-teal'}`}>
                    {item.replyTo.senderName}
                  </Text>
                  <Text variant="caption" className={`${isMe ? 'text-white/70' : 'text-content-secondary'}`} numberOfLines={2}>
                    {item.replyTo.text}
                  </Text>
                </View>
              )}
              {item.image && (
                <Image 
                  source={{ uri: item.image }} 
                  className="w-48 h-48 rounded-lg mb-2" 
                  resizeMode="cover"
                />
              )}
              {item.text && (
                <Text variant="body" className={`${isMe ? 'text-white' : 'text-content dark:text-content-dark'}`}>
                  {item.text}
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </Swipeable>
  );
};

export default function ChatRoomScreen() {
  const { id: roomId } = useLocalSearchParams<{ id: string }>();
  const { user, userData } = useAuth();
  const colorScheme = useColorScheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<any>(null);
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardChats, setForwardChats] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user || !roomId) return;

    // Fetch other user's info from chat room data
    const fetchRoomInfo = async () => {
      try {
        const roomDoc = await firestore().collection('chatRooms').doc(roomId).get();
        if (roomDoc.data()) {
          const roomData = roomDoc.data();
          const participants: string[] = roomData?.participants || [];
          const otherUserId = participants.find(id => id !== user.uid);
          
          if (otherUserId) {
            const userDoc = await firestore().collection("users").doc(otherUserId).get();
            if (userDoc.data()) {
              setOtherUser({ id: otherUserId, ...userDoc.data() });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch room info", err);
      }
    };
    fetchRoomInfo();

    // Clear any unread notifications for this chat room
    const clearNotifications = async () => {
      try {
        const notifsSnap = await firestore()
          .collection("notifications")
          .where("userId", "==", user.uid)
          .where("link", "==", `/chat/${roomId}`)
          .where("read", "==", false)
          .get();
          
        if (!notifsSnap.empty) {
          const batch = firestore().batch();
          notifsSnap.docs.forEach(doc => {
            batch.update(doc.ref, { read: true });
          });
          await batch.commit();
        }
      } catch (err) {
        console.error("Failed to clear notifications", err);
      }
    };
    clearNotifications();

    // Clear unread badge in chatRoom
    const clearUnreadBadge = async () => {
      try {
        await firestore().collection('chatRooms').doc(roomId).update({
          unreadBy: firestore.FieldValue.arrayRemove(user.uid)
        });
      } catch(err) {}
    };
    clearUnreadBadge();

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
      }, (error) => {
        console.error("Failed to fetch messages", error);
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
      
      if (replyingTo) {
        msgData.replyTo = {
          id: replyingTo.id,
          text: replyingTo.text || (replyingTo.image ? '📷 Image' : ''),
          senderName: replyingTo.senderId === user.uid ? 'You' : (otherUser?.name || 'Someone')
        };
      }

      await firestore().collection('chatRooms').doc(roomId).collection('messages').add(msgData);
      setReplyingTo(null);

      const updateData: any = {
        lastMessage: image ? '📷 Image' : messageText,
        lastSenderId: user.uid,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        unreadBy: otherUser?.id ? [otherUser.id] : []
      };
      
      // Update unread status (simplified)
      await firestore().collection('chatRooms').doc(roomId).update(updateData);

      // Create notification for the other user
      if (otherUser?.id && otherUser.id !== user.uid) {
        // Run asynchronously so it doesn't block the UI
        createNotification({
          userId: otherUser.id,
          type: "new_message",
          title: `New message from ${userData?.name || "someone"}`,
          message: image ? "Sent an image" : messageText || "Sent a message",
          link: `/chat/${roomId}`,
        }).catch(err => console.warn("Failed to notify user:", err));
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleDeleteForMe = async (msgId: string) => {
    if (!user || !roomId) return;
    try {
      await firestore().collection('chatRooms').doc(roomId).collection('messages').doc(msgId).update({
        deletedFor: firestore.FieldValue.arrayUnion(user.uid)
      });
    } catch (e) {
      console.error("Delete for me failed", e);
    }
  };

  const handleDeleteForEveryone = async (msgId: string) => {
    if (!user || !roomId) return;
    try {
      await firestore().collection('chatRooms').doc(roomId).collection('messages').doc(msgId).update({
        isDeletedForEveryone: true,
        text: null,
        image: null
      });
    } catch (e) {
      console.error("Delete for everyone failed", e);
    }
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
  };

  const fetchChatsForForwarding = async () => {
    if (!user) return;
    setLoadingChats(true);
    try {
      const snap = await firestore().collection('chatRooms')
        .where('participants', 'array-contains', user.uid)
        .orderBy('updatedAt', 'desc')
        .limit(20)
        .get();
        
      const chats: any[] = [];
      snap.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));
      setForwardChats(chats);
    } catch (e) {
      console.error("Fetch chats failed", e);
    } finally {
      setLoadingChats(false);
    }
  };

  const openForwardModal = (msg: Message) => {
    setForwardingMessage(msg);
    setShowForwardModal(true);
    fetchChatsForForwarding();
  };

  const forwardMessage = async (targetRoomId: string) => {
    if (!user || !forwardingMessage) return;
    try {
      const msgData: any = {
        senderId: user.uid,
        createdAt: firestore.FieldValue.serverTimestamp(),
        text: forwardingMessage.text,
        image: forwardingMessage.image,
      };
      await firestore().collection('chatRooms').doc(targetRoomId).collection('messages').add(msgData);
      
      const updateData: any = {
        lastMessage: msgData.image ? '📷 Image' : msgData.text,
        lastSenderId: user.uid,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      await firestore().collection('chatRooms').doc(targetRoomId).update(updateData);
      Alert.alert("Success", "Message forwarded");
    } catch (e) {
      console.error("Forward failed", e);
    } finally {
      setShowForwardModal(false);
      setForwardingMessage(null);
    }
  };

  const handleMessageLongPress = (msg: Message) => {
    if (msg.isDeletedForEveryone) return;

    const isMe = msg.senderId === user?.uid;
    const options = ["Cancel", "Reply", "Forward"];
    if (msg.text) options.push("Copy");
    options.push("Delete for me");
    if (isMe) options.push("Delete for everyone");

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: 0,
        destructiveButtonIndex: options.length - 1, // Will be "Delete for everyone" if isMe, else "Delete for me"
      },
      (buttonIndex) => {
        const option = options[buttonIndex];
        if (option === "Reply") {
          setReplyingTo(msg);
        } else if (option === "Forward") {
          openForwardModal(msg);
        } else if (option === "Copy" && msg.text) {
          handleCopy(msg.text);
        } else if (option === "Delete for me") {
          handleDeleteForMe(msg.id);
        } else if (option === "Delete for everyone") {
          Alert.alert("Delete for everyone", "Are you sure you want to delete this message for everyone?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => handleDeleteForEveryone(msg.id) }
          ]);
        }
      }
    );
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
    return (
      <MessageItem 
        item={item} 
        user={user} 
        handleMessageLongPress={handleMessageLongPress} 
        setReplyingTo={setReplyingTo} 
      />
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'bottom']}>
        {/* Header */}
      <View className="px-4 py-3 border-b border-brand-teal/5 bg-surface flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
          <ArrowLeft size={24} color={colorScheme === 'dark' ? '#FFF' : '#1D1D1F'} />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-surface-soft items-center justify-center overflow-hidden mr-3">
            {otherUser?.profilePicture ? (
              <Image source={{ uri: otherUser.profilePicture }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <User size={20} color="#8E8E93" />
            )}
          </View>
          <Text variant="h3" className="font-bold">
            {otherUser ? otherUser.name : 'Loading...'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ImageBackground 
          source={colorScheme === 'dark' ? require('../../../assets/images/chatbackground.png') : require('../../../assets/images/chatbackgroundLight.png')}
          style={{ flex: 1, width: '100%', height: '100%' }}
          imageStyle={{ resizeMode: "repeat" }}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            inverted={true}
            contentContainerStyle={{ paddingVertical: 16 }}
          />
        </ImageBackground>

        {/* Input area */}
        <View className="bg-surface dark:bg-surface-dark border-t border-content-secondary/10">
          {replyingTo && (
            <View className="px-4 py-2 flex-row items-center justify-between bg-surface-soft dark:bg-surface-dark-secondary">
              <View className="flex-1 border-l-4 border-brand-teal pl-3">
                <Text variant="caption" className="font-sans-semibold text-brand-teal">
                  Replying to {replyingTo.senderId === user?.uid ? 'yourself' : otherUser?.name || 'someone'}
                </Text>
                <Text variant="caption" className="text-content-secondary" numberOfLines={1}>
                  {replyingTo.text || (replyingTo.image ? '📷 Image' : '')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} className="p-2">
                <X size={16} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          )}
          <View className="px-4 py-3 flex-row items-center gap-2">
            <TouchableOpacity 
              onPress={pickImage}
              disabled={isUploading}
              className="p-2 rounded-full bg-surface-soft dark:bg-surface-dark-secondary"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#0071E3" />
              ) : (
                <ImageIcon size={20} color="#0071E3" />
              )}
            </TouchableOpacity>
            
            <View className="flex-1 bg-surface-soft dark:bg-surface-dark-secondary rounded-full px-4 py-2 flex-row items-center border border-content-secondary/10">
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Message..."
                placeholderTextColor="#8E8E93"
                className="flex-1 text-content dark:text-content-dark font-medium py-1"
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
        </View>
      </KeyboardAvoidingView>

      {/* Forward Modal */}
      <Modal
        visible={showForwardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowForwardModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-surface dark:bg-surface-dark h-[80%] rounded-t-3xl p-5">
            <View className="flex-row justify-between items-center mb-5">
              <Text variant="h2" className="text-[22px]">Forward to...</Text>
              <TouchableOpacity onPress={() => setShowForwardModal(false)} className="p-2 bg-surface-soft dark:bg-surface-dark-secondary rounded-full">
                <X size={20} color={colorScheme === 'dark' ? '#F5F5F7' : '#1A1A1C'} />
              </TouchableOpacity>
            </View>

            {loadingChats ? (
              <ActivityIndicator color="#0071E3" className="mt-8" />
            ) : forwardChats.length === 0 ? (
              <View className="items-center py-12">
                <Text variant="caption" className="text-content-tertiary">No recent chats available.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {forwardChats.map(chat => {
                  const pOtherId = chat.participants.find((p: string) => p !== user?.uid);
                  // We don't have the user's name readily available if it's not cached,
                  // But usually chats will have names. We can just show "Chat with..." if needed, 
                  // but we should just render basic info.
                  return (
                    <TouchableOpacity
                      key={chat.id}
                      onPress={() => forwardMessage(chat.id)}
                      className="flex-row items-center justify-between py-3 border-b border-surface-soft dark:border-surface-dark-secondary"
                    >
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 rounded-full bg-surface-soft dark:bg-surface-dark-secondary items-center justify-center mr-3">
                          <User size={20} color="#8E8E93" />
                        </View>
                        <Text variant="label" className="font-sans-semibold">
                          Forward to chat
                        </Text>
                      </View>
                      <View className="bg-brand-teal px-4 py-2 rounded-full">
                        <Text variant="caption" className="text-white font-bold text-[12px]">Send</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
