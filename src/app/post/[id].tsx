/**
 * Post Detail Screen
 *
 * Shows a full post with all content (not truncated),
 * author info, images, and a nested comments section.
 * Comments are loaded from post_replies in real-time.
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import firestore from "@react-native-firebase/firestore";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Send,
  X,
} from "lucide-react-native";
import { toggleUpvote } from "@/lib/social";

interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string | null;
  content: string;
  parentId?: string | null;
  repliesCount?: number;
  upvotesCount?: number;
  createdAt: any;
}

function timeAgo(date: any): string {
  if (!date?.toDate) return "";
  const now = Date.now();
  const then = date.toDate().getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date
    .toDate()
    .toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, userData } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);

  // Load post
  useEffect(() => {
    if (!id) return;
    const unsub = firestore()
      .collection("posts")
      .doc(id)
      .onSnapshot((doc) => {
        if (doc.data()) {
          setPost({ id: doc.id, ...doc.data() });
        }
        setLoading(false);
      });
    return () => unsub();
  }, [id]);

  // Load replies from top-level 'post_replies' collection
  useEffect(() => {
    if (!id) return;
    const unsub = firestore()
      .collection("post_replies")
      .where("postId", "==", id)
      .onSnapshot(
        async (snap) => {
          if (!snap) return;
          const items: Reply[] = [];
          
          snap.forEach((doc) => {
            const data = doc.data();
            items.push({
              id: doc.id,
              authorId: data.authorId || '',
              authorName: data.authorName || 'Unknown',
              authorProfilePicture: data.authorProfilePicture || null,
              content: data.content || '',
              parentId: data.parentId || null,
              repliesCount: data.repliesCount || 0,
              upvotesCount: data.upvotesCount || 0,
              createdAt: data.createdAt,
            });
          });

          // Sort client-side by createdAt ascending
          items.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
            const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
            return aTime - bTime;
          });

          // Instantly show text-only comments while we fetch avatars
          setReplies([...items]);

          // Fetch profile pictures in the background and update state
          try {
            const authorIds = [...new Set(items.map(item => item.authorId).filter(Boolean))];
            if (authorIds.length > 0) {
              const userDocs = await Promise.all(
                authorIds.map(uid => firestore().collection("users").doc(uid).get())
              );
              
              const profilePicMap: Record<string, string> = {};
              userDocs.forEach(uDoc => {
                if (uDoc.data()) {
                  const data = uDoc.data();
                  if (data?.profilePicture) {
                    profilePicMap[uDoc.id] = data.profilePicture;
                  }
                }
              });

              // Apply the fetched pictures
              let hasUpdates = false;
              const updatedItems = items.map(item => {
                if (profilePicMap[item.authorId] && profilePicMap[item.authorId] !== item.authorProfilePicture) {
                  hasUpdates = true;
                  return { ...item, authorProfilePicture: profilePicMap[item.authorId] };
                }
                return item;
              });

              if (hasUpdates) {
                setReplies(updatedItems);
              }
            }
          } catch (err) {
            console.error("Failed to fetch author profiles:", err);
          }
        },
        (err) => console.warn("Replies listener error:", err)
      );
    return () => unsub();
  }, [id]);

  // Check upvote status
  useEffect(() => {
    if (!id || !user) return;
    const unsub = firestore()
      .collection("post_upvotes")
      .where("postId", "==", id)
      .where("userId", "==", user.uid)
      .onSnapshot((snap) => {
        setHasUpvoted(snap && snap.size > 0);
      });
    return () => unsub();
  }, [id, user]);

  const handleUpvote = async () => {
    if (!user || !id) return;
    try {
      await toggleUpvote(id, user.uid);
    } catch (err) {
      console.error("Upvote error:", err);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !user || !userData || !id) return;
    setSending(true);
    try {
      const replyData = {
        postId: id,
        authorId: user.uid,
        authorName: userData.name || "Unknown",
        authorSchool: userData.school || "",
        authorProfilePicture: userData.profilePicture || null,
        content: newComment.trim(),
        upvotesCount: 0,
        repliesCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      if (replyingTo) {
        (replyData as any).parentId = replyingTo.id;
      }

      await firestore().collection("post_replies").add(replyData);

      // Increment replies count on post
      await firestore().collection("posts").doc(id).update({
        repliesCount: firestore.FieldValue.increment(1),
      });

      // Increment replies count on parent comment if replying
      if (replyingTo) {
        await firestore().collection("post_replies").doc(replyingTo.id).update({
          repliesCount: firestore.FieldValue.increment(1),
        });
      }

      setNewComment("");
      setReplyingTo(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = (replyId: string) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await firestore().collection("post_replies").doc(replyId).delete();
              
              if (post) {
                await firestore().collection("posts").doc(post.id).update({
                  repliesCount: firestore.FieldValue.increment(-1),
                });
              }
            } catch (err) {
              console.error("Delete comment error:", err);
            }
          },
        },
      ]
    );
  };

  // Build Replies Tree
  const repliesMap = useMemo(() => {
    const map: Record<string, Reply[]> = {};
    replies.forEach((r) => {
      const parentId = r.parentId || "root";
      if (!map[parentId]) map[parentId] = [];
      map[parentId].push(r);
    });
    return map;
  }, [replies]);

  const renderCommentNode = (reply: Reply, level = 0) => {
    const children = repliesMap[reply.id] || [];
    const isIndented = level > 0;

    return (
      <View key={reply.id} className={`mb-4 ${isIndented ? "ml-10 mt-1" : ""}`}>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => router.push(`/profile/${reply.authorId}` as any)}
          >
            <View
              className={`${
                isIndented ? "w-7 h-7" : "w-9 h-9"
              } rounded-full bg-surface-soft dark:bg-surface-dark-secondary items-center justify-center mr-3 overflow-hidden`}
            >
              {reply.authorProfilePicture ? (
                <Image
                  source={{ uri: reply.authorProfilePicture }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text
                  variant="caption"
                  className="text-content-secondary font-sans-semibold"
                  style={{ fontSize: isIndented ? 12 : 14 }}
                >
                  {reply.authorName?.[0]?.toUpperCase() || "?"}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text
                variant="label"
                className={`font-sans-semibold mr-2 ${
                  isIndented ? "text-[13px]" : "text-[14px]"
                }`}
              >
                {reply.authorName}
              </Text>
              <Text variant="caption" className="text-content-tertiary">
                {timeAgo(reply.createdAt)}
              </Text>
            </View>
            <Text
              variant="body"
              className={`text-content-secondary dark:text-content-dark-secondary leading-[22px] ${
                isIndented ? "text-[14px]" : "text-[15px]"
              }`}
            >
              {reply.content}
            </Text>

            {/* Comment Actions */}
            <View className="flex-row items-center gap-4 mt-1.5">
              <TouchableOpacity className="flex-row items-center">
                <Text variant="caption" className="text-content-tertiary font-sans-semibold">
                  {reply.upvotesCount || 0} Likes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setReplyingTo({ id: reply.id, name: reply.authorName })}
              >
                <Text variant="caption" className="text-content-tertiary font-sans-semibold">
                  Reply
                </Text>
              </TouchableOpacity>
              {(reply.authorId === user?.uid || (userData as any)?.role === "admin") && (
                <TouchableOpacity
                  onPress={() => handleDeleteComment(reply.id)}
                >
                  <Text variant="caption" className="text-[#FF3B30] font-sans-semibold">
                    Delete
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Recursive Children */}
        {children.length > 0 && (
          <View className="mt-3">
            {children.map((child) => renderCommentNode(child, level + 1))}
          </View>
        )}
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

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
        <Text variant="body" className="text-content-secondary">
          Post not found
        </Text>
      </SafeAreaView>
    );
  }

  const isAnonymous = post.type === "confession" && post.isAnonymous;
  const displayName = isAnonymous ? "Anonymous" : post.authorName;
  const avatarText = displayName?.[0]?.toUpperCase() || "?";
  const postImages =
    post.imageUrls?.length > 0
      ? post.imageUrls
      : post.imageUrl
      ? [post.imageUrl]
      : [];

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center px-5 py-3 border-b border-surface-soft dark:border-surface-dark-secondary">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="mr-4 p-1"
          >
            <ArrowLeft size={22} color={isDark ? '#F5F5F7' : '#1A1A1C'} />
          </TouchableOpacity>
          <Text variant="h4">Post</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Post Content */}
          <View className="px-5 py-5 border-b border-surface-soft dark:border-surface-dark-secondary">
            {/* Author Row */}
            <TouchableOpacity
              className="flex-row items-center mb-4"
              activeOpacity={isAnonymous ? 1 : 0.7}
              disabled={isAnonymous}
              onPress={() =>
                !isAnonymous && router.push(`/profile/${post.authorId}` as any)
              }
            >
              <View
                className={`w-11 h-11 rounded-full items-center justify-center mr-3 overflow-hidden ${
                  isAnonymous ? "bg-purple-100 dark:bg-purple-900/30" : "bg-surface-soft dark:bg-surface-dark-secondary"
                }`}
              >
                {!isAnonymous && post.authorProfilePicture ? (
                  <Image
                    source={{ uri: post.authorProfilePicture }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    variant="h4"
                    className={
                      isAnonymous ? "text-purple-500" : "text-content-secondary"
                    }
                  >
                    {avatarText}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text variant="label" className="font-sans-semibold" numberOfLines={1}>
                  {displayName}
                </Text>
                <Text
                  variant="caption"
                  className="text-content-tertiary mt-0.5"
                >
                  {post.school}
                  {post.city ? ` · ${post.city}` : ""} ·{" "}
                  {timeAgo(post.createdAt)}
                </Text>
              </View>
              <View className={`px-2.5 py-1 rounded-md ${
                post.type === 'confession' 
                  ? 'bg-purple-50 dark:bg-purple-900/20' 
                  : 'bg-surface-soft dark:bg-surface-dark-secondary'
              }`}>
                <Text
                  variant="caption"
                  className={`text-[11px] font-sans-semibold capitalize ${
                    post.type === 'confession' ? 'text-purple-500' : 'text-content-secondary'
                  }`}
                >
                  {post.type}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Title */}
            {post.title ? (
              <Text variant="h3" className="mb-3">
                {post.title}
              </Text>
            ) : null}

            {/* Full Content */}
            <Text
              variant="body"
              className="text-content-secondary dark:text-content-dark-secondary leading-[26px] mb-4"
            >
              {post.content}
            </Text>

            {/* Images */}
            {postImages.map((url: string, idx: number) => (
              <View
                key={idx}
                className="w-full aspect-video rounded-xl overflow-hidden mb-3 bg-surface-soft dark:bg-surface-dark-secondary"
              >
                <Image
                  source={{ uri: url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            ))}

            {/* Action Bar */}
            <View className="flex-row items-center gap-5 pt-3">
              <TouchableOpacity
                onPress={handleUpvote}
                className="flex-row items-center"
              >
                <Heart
                  size={22}
                  color={hasUpvoted ? "#FF375F" : "#8E8E93"}
                  fill={hasUpvoted ? "#FF375F" : "transparent"}
                />
                <Text
                  variant="label"
                  className={`ml-1.5 ${
                    hasUpvoted
                      ? "text-brand-pink"
                      : "text-content-tertiary"
                  }`}
                >
                  {post.upvotesCount || 0}
                </Text>
              </TouchableOpacity>
              <View className="flex-row items-center">
                <MessageCircle size={22} color="#8E8E93" />
                <Text variant="label" className="ml-1.5 text-content-tertiary">
                  {replies.length}
                </Text>
              </View>
              <TouchableOpacity>
                <Share2 size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments Section */}
          <View className="px-5 pt-4">
            <Text variant="h4" className="mb-4">
              Comments ({replies.length})
            </Text>

            {replies.length === 0 ? (
              <View className="items-center py-8">
                <MessageCircle size={32} color={isDark ? '#2C2C2E' : '#E5E5EA'} />
                <Text
                  variant="bodySmall"
                  className="text-content-tertiary text-center mt-3"
                >
                  No comments yet. Be the first!
                </Text>
              </View>
            ) : (
              (repliesMap["root"] || []).map((reply) => renderCommentNode(reply, 0))
            )}
          </View>
        </ScrollView>

        {/* Input Area Wrapper */}
        <View className="border-t border-surface-soft dark:border-surface-dark-secondary bg-surface dark:bg-surface-dark pb-2">
          {/* Replying To Indicator */}
          {replyingTo && (
            <View className="flex-row items-center justify-between px-5 py-2 bg-surface-soft dark:bg-surface-dark-secondary">
              <Text variant="caption" className="text-content-secondary font-sans-medium">
                Replying to <Text variant="caption" className="font-sans-bold text-brand-teal">@{replyingTo.name}</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                className="p-1"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={14} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          )}

          {/* Comment Input */}
          <View className="flex-row items-center px-5 py-3">
            <View className="w-8 h-8 rounded-full bg-surface-soft dark:bg-surface-dark-secondary items-center justify-center mr-3 overflow-hidden">
              {userData?.profilePicture ? (
                <Image
                  source={{ uri: userData.profilePicture }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <Text variant="caption" className="text-content-secondary font-sans-semibold">
                  {userData?.name?.[0]?.toUpperCase() || "?"}
                </Text>
              )}
            </View>
            <TextInput
              value={newComment}
              onChangeText={setNewComment}
              placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
              placeholderTextColor="#8E8E93"
              className="flex-1 h-10 px-4 rounded-full bg-surface-soft dark:bg-surface-dark-secondary text-content dark:text-content-dark text-[15px]"
              returnKeyType="send"
              onSubmitEditing={handleSendComment}
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={!newComment.trim() || sending}
              className="ml-3"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Send
                size={22}
                color={newComment.trim() ? "#14B8A6" : "#8E8E93"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
