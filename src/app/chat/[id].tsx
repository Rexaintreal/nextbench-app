import React, { useState, useEffect, useRef } from "react";
import { View, FlatList, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Keyboard, Platform, Image, ImageBackground, useColorScheme, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { ArrowLeft, Send, Image as ImageIcon, User, X, Reply, MoreVertical, ZoomIn } from "lucide-react-native";
import { blockUser, unblockUser, useBlockStatus } from "@/lib/blocks";
import firestore from "@react-native-firebase/firestore";
import { uploadChatImageMobile } from '@/services/firebase/storage';
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from 'expo-clipboard';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNotification } from "@/lib/notifications";
import { AppAlert } from '@/components/ui/AppAlert';
import PostShareBubble from '@/components/ui/PostShareBubble';

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
  // shared post fields
  sharedPost?: {
    id: string;
    title?: string;
    content?: string;
    description?: string;
    authorName?: string;
    authorProfilePicture?: string | null;
    image?: string | null;
    isAnonymous?: boolean;
    type?: string;
    kind?: string;
  };
  postSnapshot?: any;
  postId?: string;
  type?: string;
}

const MessageItem = ({ item, user, isDark, handleMessageLongPress, setReplyingTo, onImagePress }: any) => {
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
          <View className="w-8 h-8 rounded-full bg-surface-soft dark:bg-surface-dark-elevated items-center justify-center">
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
            isMe
              ? 'bg-brand-teal rounded-tr-sm'
              : 'bg-surface dark:bg-surface-dark-elevated rounded-tl-sm'
          }`}
          style={!isMe ? { borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' } : undefined}
        >
        {isDeleted ? (
          <Text variant="caption" className={`italic ${isMe ? 'text-white/60' : 'text-content-secondary dark:text-ink-dark-muted'}`}>
            This message was deleted
          </Text>
        ) : (
          <>
            {item.replyTo && (
              <View className={`mb-2 px-3 py-2 rounded-lg border-l-4 ${
                isMe
                  ? 'bg-black/10 border-white/50'
                  : 'bg-surface-soft dark:bg-surface-dark-secondary border-brand-teal/50'
              }`}>
                <Text variant="caption" className={`font-sans-semibold ${isMe ? 'text-white/80' : 'text-brand-teal'}`}>
                  {item.replyTo.senderName}
                </Text>
                <Text variant="caption" className={`${isMe ? 'text-white/70' : 'text-content-secondary dark:text-ink-dark-muted'}`} numberOfLines={2}>
                  {item.replyTo.text}
                </Text>
              </View>
            )}

            {/* ↓ NEW: shared post/product bubble */}
            {(item.sharedPost || item.postSnapshot) && (
              <PostShareBubble
                message={{
                  id: item.id,
                  senderId: item.senderId,
                  type: 'post_share',
                  postId: item.postId || item.sharedPost?.id || item.postSnapshot?.id || '',
                  postSnapshot: {
                    title: item.sharedPost?.title || item.postSnapshot?.title,
                    content: item.sharedPost?.description || item.sharedPost?.content || item.postSnapshot?.content,
                    authorName: item.sharedPost?.authorName || item.postSnapshot?.authorName,
                    authorProfilePicture: item.sharedPost?.authorProfilePicture || item.postSnapshot?.authorProfilePicture || null,
                    imageUrl: item.sharedPost?.image || item.postSnapshot?.imageUrl || null,
                    isAnonymous: item.sharedPost?.isAnonymous || item.postSnapshot?.isAnonymous || false,
                    type: item.sharedPost?.kind || item.sharedPost?.type || item.postSnapshot?.type,
                  },
                  text: item.text,
                  createdAt: item.createdAt,
                }}
                isMine={isMe}
              />
            )}

            {item.image && (
              <TouchableOpacity onPress={() => onImagePress?.(item.image)} activeOpacity={0.9}>
                <Image source={{ uri: item.image }} className="w-48 h-48 rounded-lg mb-2" resizeMode="cover" />
                <View style={{ position: 'absolute', bottom: 10, right: 6, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 12, padding: 4 }}>
                  <ZoomIn size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            )}
            {item.text && !(item.sharedPost || item.postSnapshot) && (
              <Text variant="body" className={`${isMe ? 'text-white' : 'text-content dark:text-ink-dark'}`}>
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
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#F5F5F7' : '#1D1D1F';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const headerBg = isDark ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.95)';

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<any>(null);

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardChats, setForwardChats] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const { isBlocked } = useBlockStatus(otherUser?.id);
  const [roomStatus, setRoomStatus] = useState<'active' | 'pending'>('active');
  const [requestedBy, setRequestedBy] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  // Android keyboard listener
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height + 24);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (!user || !roomId) return;

    const fetchRoomInfo = async () => {
      try {
        const roomDoc = await firestore().collection('chatRooms').doc(roomId).get();
        if (roomDoc.data()) {
          const roomData = roomDoc.data();
          const participants: string[] = roomData?.participants || [];
          const otherUserId = participants.find(id => id !== user.uid);
          if (otherUserId) {
            const userDoc = await firestore().collection("users").doc(otherUserId).get();
            if (userDoc.data()) setOtherUser({ id: otherUserId, ...userDoc.data() });
          }
          setIsMuted(roomData?.mutedBy?.includes(user.uid) || false);
          setRoomStatus(roomData?.status === 'pending' ? 'pending' : 'active');
          setRequestedBy(roomData?.requestedBy || null);
        }
      } catch (err) { console.error("Failed to fetch room info", err); }
    };
    fetchRoomInfo();

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
          notifsSnap.docs.forEach(doc => batch.update(doc.ref, { read: true }));
          await batch.commit();
        }
      } catch (err) { console.error("Failed to clear notifications", err); }
    };
    clearNotifications();

    firestore().collection('chatRooms').doc(roomId).update({
      unreadBy: firestore.FieldValue.arrayRemove(user.uid)
    }).catch(() => {});

    const unsubscribe = firestore()
      .collection('chatRooms').doc(roomId).collection('messages')
      .orderBy('createdAt', 'desc').limit(100)
      .onSnapshot((snapshot) => {
        if (!snapshot) return;
        const msgs: Message[] = [];
        snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
        setLoading(false);
      }, (error) => { console.error("Failed to fetch messages", error); setLoading(false); });

    return () => unsubscribe();
  }, [roomId, user]);

  const handleSend = async (text?: string, image?: string) => {
    if (!user || !roomId || (!text?.trim() && !image)) return;

    if (roomStatus === 'pending' && requestedBy === user.uid) {
      const myMsgsSnap = await firestore()
        .collection('chatRooms').doc(roomId).collection('messages')
        .where('senderId', '==', user.uid).limit(1).get();
      if (!myMsgsSnap.empty) {
        AppAlert.alert('Request Pending', 'You\'ve already sent a message. Wait for them to accept your chat request.');
        return;
      }
    }

    const messageText = text?.trim();
    setNewMessage("");

    try {
      const msgData: any = { senderId: user.uid, createdAt: firestore.FieldValue.serverTimestamp() };
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

      await firestore().collection('chatRooms').doc(roomId).update({
        lastMessage: image ? 'Image' : messageText,
        lastSenderId: user.uid,
        updatedAt: firestore.FieldValue.serverTimestamp(),
        unreadBy: otherUser?.id ? [otherUser.id] : [],
        deletedBy: []
      });

      if (otherUser?.id && otherUser.id !== user.uid) {
        const roomSnap = await firestore().collection('chatRooms').doc(roomId).get();
        const roomMutedBy: string[] = roomSnap.data()?.mutedBy || [];
        if (!roomMutedBy.includes(otherUser.id)) {
          createNotification({
            userId: otherUser.id,
            type: "new_message",
            title: `New message from ${userData?.name || "someone"}`,
            message: image ? "Sent an image" : messageText || "Sent a message",
            link: `/chat/${roomId}`,
          }).catch(err => console.warn("Failed to notify user:", err));
        }
      }
    } catch (err) { console.error("Failed to send message", err); }
  };

  const handleDeleteForMe = async (msgId: string) => {
    if (!user || !roomId) return;
    try {
      await firestore().collection('chatRooms').doc(roomId).collection('messages').doc(msgId)
        .update({ deletedFor: firestore.FieldValue.arrayUnion(user.uid) });
    } catch (e) { console.error("Delete for me failed", e); }
  };

  const handleDeleteForEveryone = async (msgId: string) => {
    if (!user || !roomId) return;
    try {
      await firestore().collection('chatRooms').doc(roomId).collection('messages').doc(msgId)
        .update({ isDeletedForEveryone: true, text: null, image: null });
    } catch (e) { console.error("Delete for everyone failed", e); }
  };

  const handleCopy = async (text: string) => { await Clipboard.setStringAsync(text); };

  const fetchChatsForForwarding = async () => {
    if (!user) return;
    setLoadingChats(true);
    try {
      const snap = await firestore().collection('chatRooms')
        .where('participants', 'array-contains', user.uid)
        .orderBy('updatedAt', 'desc').limit(20).get();
      const chats: any[] = [];
      snap.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));
      setForwardChats(chats);
    } catch (e) { console.error("Fetch chats failed", e); }
    finally { setLoadingChats(false); }
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
      await firestore().collection('chatRooms').doc(targetRoomId).update({
        lastMessage: msgData.image ? '📷 Image' : msgData.text,
        lastSenderId: user.uid,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      AppAlert.alert("Success", "Message forwarded");
    } catch (e) { console.error("Forward failed", e); }
    finally { setShowForwardModal(false); setForwardingMessage(null); }
  };

  const handleMessageLongPress = (msg: Message) => {
    if (msg.isDeletedForEveryone) return;
    const isMe = msg.senderId === user?.uid;

    const actions: Array<{ text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }> = [
      { text: "Reply", onPress: () => setReplyingTo(msg) },
      { text: "Forward", onPress: () => openForwardModal(msg) },
    ];
    if (msg.text) actions.push({ text: "Copy", onPress: () => handleCopy(msg.text!) });
    actions.push({ text: "Delete for me", style: "destructive", onPress: () => handleDeleteForMe(msg.id) });
    if (isMe) {
      actions.push({
        text: "Delete for everyone", style: "destructive",
      onPress: () => setTimeout(() => AppAlert.alert("Delete for everyone", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDeleteForEveryone(msg.id) }
      ]), 300)
    });
  }
    actions.push({ text: "Cancel", style: "cancel" });

    AppAlert.alert("Message Options", undefined, actions);
  };

  const handleClearChat = () => {
    setTimeout(() => {
    AppAlert.alert("Clear Chat", "This will clear all messages for you only.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear", style: "destructive", onPress: async () => {
          if (!user || !roomId) return;
          try {
            const msgsSnap = await firestore().collection('chatRooms').doc(roomId).collection('messages').get();
            const batch = firestore().batch();
            msgsSnap.docs.forEach(doc => batch.update(doc.ref, { deletedFor: firestore.FieldValue.arrayUnion(user.uid) }));
            await batch.commit();
            AppAlert.alert("Done", "Chat cleared for you.");
          } catch (err) { AppAlert.alert("Error", "Failed to clear chat."); }
        },
      },
    ]);
    }, 300);
  };

  const handleToggleMute = async () => {
    if (!user || !roomId) return;
    try {
      if (isMuted) {
        await firestore().collection('chatRooms').doc(roomId).update({ mutedBy: firestore.FieldValue.arrayRemove(user.uid) });
        setIsMuted(false);
        AppAlert.alert("Unmuted", "You will now receive notifications from this chat.");
      } else {
        await firestore().collection('chatRooms').doc(roomId).update({ mutedBy: firestore.FieldValue.arrayUnion(user.uid) });
        setIsMuted(true);
        AppAlert.alert("Muted", "You won't receive notifications from this chat.");
      }
     } catch (err) {
     console.error("Mute toggle failed", err);
     AppAlert.alert("Error", "Failed to update notification settings.");
   }
  };

  const handleBlockUser = () => {
    if (!user || !otherUser?.id) return;
    AppAlert.alert("Block User", `Block ${otherUser.name || 'this user'}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block", style: "destructive", onPress: async () => {
          try {
            await blockUser(user.uid, otherUser.id);
            AppAlert.alert("Blocked", `${otherUser.name || 'User'} has been blocked.`);
            router.back();
          } catch (err) { AppAlert.alert("Error", "Failed to block user."); }
        },
      },
    ]);
  };  
  const handleUnblockUser = () => {
    if (!user || !otherUser?.id) return;
    setTimeout(() => {
        AppAlert.alert("Unblock User", `Unblock ${otherUser.name || 'this user'}?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unblock",
            onPress: async () => {
              try {
                await unblockUser(user.uid, otherUser.id);
                AppAlert.alert("Unblocked", `${otherUser.name || 'User'} has been unblocked.`);
              } catch (err) {
                AppAlert.alert("Error", "Failed to unblock user.");
              }
            },
          },
        ]);
      }, 300);
    };
    const showChatOptions = () => {
    AppAlert.alert("Chat Options", undefined, [
      { text: "Clear Chat", onPress: handleClearChat },
      { text: isMuted ? "Unmute Notifications" : "Mute Notifications", onPress: handleToggleMute },
      {
        text: isBlocked ? "Unblock User" : "Block User",
        style: "destructive",
        onPress: isBlocked ? handleUnblockUser : handleBlockUser,
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      setIsUploading(true);
      try {
        const url = await uploadChatImageMobile(result.assets[0].uri, roomId!);
        await handleSend(undefined, url);
      } catch (err) {
        console.error("Failed to upload image", err);
        AppAlert.alert("Upload Failed", "Could not upload image. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
        <ActivityIndicator color="#14B8A6" />
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top', 'bottom']}>

        {/* Header */}
        <View
          className="px-4 py-3 flex-row items-center"
          style={{ borderBottomWidth: 1, borderBottomColor: borderColor, backgroundColor: headerBg }}
        >
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
            <ArrowLeft size={24} color={iconColor} />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 flex-row items-center"
            activeOpacity={0.7}
            onPress={() => otherUser?.id && router.push(`/profile/${otherUser.id}` as any)}
            disabled={!otherUser?.id}
          >
            <View className="w-10 h-10 rounded-full bg-surface-soft dark:bg-surface-dark-secondary items-center justify-center overflow-hidden mr-3">
              {otherUser?.profilePicture ? (
                <Image source={{ uri: otherUser.profilePicture }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <User size={20} color="#8E8E93" />
              )}
            </View>
            <Text variant="h3" className="font-sans-semibold dark:text-ink-dark">
              {otherUser ? otherUser.name : 'Loading...'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={showChatOptions} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="p-2 -mr-1">
            <MoreVertical size={22} color={iconColor} />
          </TouchableOpacity>
        </View>

        {/* iOS: KeyboardAvoidingView | Android: manual paddingBottom */}
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <ChatBody
              isDark={isDark}
              roomId={roomId}
              messages={messages}
              user={user}
              otherUser={otherUser}
              flatListRef={flatListRef}
              roomStatus={roomStatus}
              requestedBy={requestedBy}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              isUploading={isUploading}
              handleSend={handleSend}
              pickImage={pickImage}
              handleMessageLongPress={handleMessageLongPress}
              borderColor={borderColor}
              setRoomStatus={setRoomStatus}
              setRequestedBy={setRequestedBy}
              onImagePress={setPreviewImage}
            />
          </KeyboardAvoidingView>
        ) : (
          <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
            <ChatBody
              isDark={isDark}
              roomId={roomId}
              messages={messages}
              user={user}
              otherUser={otherUser}
              flatListRef={flatListRef}
              roomStatus={roomStatus}
              requestedBy={requestedBy}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              isUploading={isUploading}
              handleSend={handleSend}
              pickImage={pickImage}
              handleMessageLongPress={handleMessageLongPress}
              borderColor={borderColor}
              setRoomStatus={setRoomStatus}
              setRequestedBy={setRequestedBy}
              onImagePress={setPreviewImage}
            />
          </View>
        )}

        {/* Image Preview Modal */}
        <Modal
          visible={!!previewImage}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
          statusBarTranslucent
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: 52, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: 8 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color="#fff" />
            </TouchableOpacity>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                style={{ width: '100%', height: '80%' }}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

        {/* Forward Modal */}
        <Modal visible={showForwardModal} transparent animationType="slide" onRequestClose={() => setShowForwardModal(false)}>
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-surface dark:bg-surface-dark h-[80%] rounded-t-3xl p-5">
              <View className="flex-row justify-between items-center mb-5">
                <Text variant="h2" className="text-[22px] dark:text-ink-dark">Forward to...</Text>
                <TouchableOpacity onPress={() => setShowForwardModal(false)} className="p-2 bg-surface-soft dark:bg-surface-dark-secondary rounded-full">
                  <X size={20} color={iconColor} />
                </TouchableOpacity>
              </View>
              {loadingChats ? (
                <ActivityIndicator color="#14B8A6" className="mt-8" />
              ) : forwardChats.length === 0 ? (
                <View className="items-center py-12">
                  <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint">No recent chats available.</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {forwardChats.map(chat => (
                    <TouchableOpacity
                      key={chat.id}
                      onPress={() => forwardMessage(chat.id)}
                      className="flex-row items-center justify-between py-3"
                      style={{ borderBottomWidth: 1, borderBottomColor: borderColor }}
                    >
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 rounded-full bg-surface-soft dark:bg-surface-dark-secondary items-center justify-center mr-3">
                          <User size={20} color="#8E8E93" />
                        </View>
                        <Text variant="label" className="font-sans-semibold dark:text-ink-dark">Forward to chat</Text>
                      </View>
                      <View className="bg-brand-teal px-4 py-2 rounded-full">
                        <Text variant="caption" className="text-white font-sans-semibold text-[12px]">Send</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// Extracted inner body to avoid JSX duplication between iOS/Android branches
function ChatBody({
  isDark, roomId, messages, user, otherUser, flatListRef,
  roomStatus, requestedBy, replyingTo, setReplyingTo,
  newMessage, setNewMessage, isUploading, handleSend, pickImage,
  handleMessageLongPress, borderColor, setRoomStatus, setRequestedBy,
  onImagePress,
}: any) {
  return (
    <>
      <ImageBackground
        source={isDark
          ? require('../../../assets/images/chatbackground.png')
          : require('../../../assets/images/chatbackgroundLight.png')}
        style={{ flex: 1, width: '100%', height: '100%' }}
        imageStyle={{ resizeMode: "repeat" }}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: any) => (
            <MessageItem
              item={item}
              user={user}
              isDark={isDark}
              handleMessageLongPress={handleMessageLongPress}
              setReplyingTo={setReplyingTo}
              onImagePress={onImagePress}
            />
          )}
          inverted={true}
          contentContainerStyle={{ paddingVertical: 16 }}
        />
      </ImageBackground>

      {/* Pending Chat Request Banner */}
      {roomStatus === 'pending' && requestedBy && (
        requestedBy === user?.uid ? (
          <View className="px-4 py-3 bg-amber-500/10 items-center justify-center">
            <Text variant="caption" className="text-amber-600 dark:text-amber-400 font-sans-semibold text-center">
              ⏳ Chat request pending. They need to accept before you can send more messages.
            </Text>
          </View>
        ) : (
          <View className="px-4 py-3 bg-brand-teal/10">
            <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted text-center mb-2">
              {otherUser?.name || 'Someone'} wants to start a conversation.
            </Text>
            <View className="flex-row justify-center gap-3">
              <TouchableOpacity
                onPress={() => {
                  AppAlert.alert('Decline', 'Decline this chat request?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Decline', style: 'destructive', onPress: async () => {
                        try {
                          const msgsSnap = await firestore().collection('chatRooms').doc(roomId).collection('messages').get();
                          const batch = firestore().batch();
                          msgsSnap.docs.forEach((d: any) => batch.delete(d.ref));
                          batch.delete(firestore().collection('chatRooms').doc(roomId));
                          await batch.commit();
                          router.back();
                        } catch (err) { console.error('Decline failed', err); }
                      }
                    }
                  ]);
                }}
                className="px-6 py-2 rounded-full"
                style={{ borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' }}
              >
                <Text variant="caption" className="text-red-500 font-sans-semibold">Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await firestore().collection('chatRooms').doc(roomId).update({ status: 'active', requestedBy: null });
                    setRoomStatus('active');
                    setRequestedBy(null);
                  } catch (err) { console.error('Accept failed', err); }
                }}
                className="px-6 py-2 rounded-full bg-brand-teal"
              >
                <Text variant="caption" className="text-white font-sans-semibold">Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      )}

      {/* Input area */}
      <View
        className="bg-surface dark:bg-surface-dark"
        style={{ borderTopWidth: 1, borderTopColor: borderColor }}
      >
        {replyingTo && (
          <View className="px-4 py-2 flex-row items-center justify-between bg-surface-soft dark:bg-surface-dark-secondary">
            <View className="flex-1 border-l-4 border-brand-teal pl-3">
              <Text variant="caption" className="font-sans-semibold text-brand-teal">
                Replying to {replyingTo.senderId === user?.uid ? 'yourself' : otherUser?.name || 'someone'}
              </Text>
              <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted" numberOfLines={1}>
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
            {isUploading
              ? <ActivityIndicator size="small" color="#14B8A6" />
              : <ImageIcon size={20} color="#14B8A6" />
            }
          </TouchableOpacity>
          <View
            className="flex-1 bg-surface-soft dark:bg-surface-dark-secondary rounded-full px-4 py-2 flex-row items-center"
            style={{ borderWidth: 1, borderColor }}
          >
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Message..."
              placeholderTextColor="#8E8E93"
              style={{ color: isDark ? '#F5F5F7' : '#1A1A1C' }}
              className="flex-1 font-sans py-1"
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            onPress={() => handleSend(newMessage)}
            disabled={!newMessage.trim() || isUploading}
            className={`p-3 rounded-full ${newMessage.trim() ? 'bg-brand-teal' : 'bg-brand-teal/40'}`}
          >
            <Send size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}