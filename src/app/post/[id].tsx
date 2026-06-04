/**
 * Post Detail Screen
 *
 * Shows a full post with all content (not truncated),
 * author info, images, and a comments section.
 * Comments are loaded from posts/{id}/replies in real-time.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import firestore from "@react-native-firebase/firestore";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Flame,
} from "lucide-react-native";
import { toggleUpvote } from "@/lib/social";

interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string | null;
  content: string;
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
  const router = useRouter();
  const { user, userData } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  // Load post
  useEffect(() => {
    if (!id) return;
    const unsub = firestore()
      .collection("posts")
      .doc(id)
      .onSnapshot((doc) => {
        if (doc.exists()) {
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
        (snap) => {
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
              createdAt: data.createdAt,
            });
          });
          // Sort client-side by createdAt ascending
          items.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
            const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
            return aTime - bTime;
          });
          setReplies(items);
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
      await firestore()
        .collection("post_replies")
        .add({
          postId: id,
          authorId: user.uid,
          authorName: userData.name || "Unknown",
          authorSchool: userData.school || "",
          authorProfilePicture: userData.profilePicture || null,
          content: newComment.trim(),
          upvotesCount: 0,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      // Increment replies count
      await firestore()
        .collection("posts")
        .doc(id)
        .update({
          repliesCount: firestore.FieldValue.increment(1),
        });

      setNewComment("");
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setSending(false);
    }
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
        <View className="flex-row items-center px-5 py-3 border-b border-content-secondary/10">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="mr-4"
          >
            <ArrowLeft size={24} color="#1D1D1F" />
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
          <View className="px-5 py-6 border-b border-content-secondary/10">
            {/* Author Row */}
            <TouchableOpacity
              className="flex-row items-center mb-5"
              activeOpacity={isAnonymous ? 1 : 0.7}
              disabled={isAnonymous}
              onPress={() =>
                !isAnonymous && router.push(`/profile/${post.authorId}` as any)
              }
            >
              <View
                className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                  isAnonymous ? "bg-brand-pink-soft/10" : "bg-brand-teal/10"
                }`}
              >
                {!isAnonymous && post.authorProfilePicture ? (
                  <Image
                    source={{ uri: post.authorProfilePicture }}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <Text
                    variant="h4"
                    className={
                      isAnonymous ? "text-brand-pink-soft" : "text-brand-teal"
                    }
                  >
                    {avatarText}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text variant="label" numberOfLines={1}>
                  {displayName}
                </Text>
                <Text
                  variant="caption"
                  className="text-content-secondary mt-0.5"
                >
                  {post.school}
                  {post.city ? ` · ${post.city}` : ""} ·{" "}
                  {timeAgo(post.createdAt)}
                </Text>
              </View>
              <View className="bg-brand-teal/10 px-2.5 py-1 rounded">
                <Text
                  variant="caption"
                  className="text-brand-teal text-[10px] uppercase font-sans-medium tracking-wider"
                >
                  {post.type}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Title */}
            {post.title ? (
              <Text variant="h3" className="mb-4 leading-snug">
                {post.title}
              </Text>
            ) : null}

            {/* Full Content */}
            <Text
              variant="body"
              className="text-content-secondary leading-[28px] mb-5"
            >
              {post.content}
            </Text>

            {/* Images */}
            {postImages.map((url: string, idx: number) => (
              <View
                key={idx}
                className="w-full aspect-video rounded-2xl overflow-hidden mb-4 bg-surface-base"
              >
                <Image
                  source={{ uri: url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            ))}

            {/* Action Bar */}
            <View className="flex-row items-center gap-6 pt-3">
              <TouchableOpacity
                onPress={handleUpvote}
                className="flex-row items-center"
              >
                <Heart
                  size={22}
                  color={hasUpvoted ? "#F77CA2" : "#8E8E93"}
                  fill={hasUpvoted ? "#F77CA2" : "transparent"}
                />
                <Text
                  variant="label"
                  className={`ml-1.5 ${
                    hasUpvoted
                      ? "text-brand-pink-soft"
                      : "text-content-secondary"
                  }`}
                >
                  {post.upvotesCount || 0}
                </Text>
              </TouchableOpacity>
              <View className="flex-row items-center">
                <MessageCircle size={22} color="#8E8E93" />
                <Text variant="label" className="ml-1.5 text-content-secondary">
                  {replies.length}
                </Text>
              </View>
              <TouchableOpacity>
                <Share2 size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments Section */}
          <View className="px-5 pt-5">
            <Text variant="h4" className="mb-5">
              Comments ({replies.length})
            </Text>

            {replies.length === 0 ? (
              <View className="items-center py-8">
                <Text
                  variant="body"
                  className="text-content-tertiary text-center"
                >
                  No comments yet. Be the first!
                </Text>
              </View>
            ) : (
              replies.map((reply) => (
                <View
                  key={reply.id}
                  className="flex-row mb-5"
                >
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/profile/${reply.authorId}` as any)
                    }
                  >
                    <View className="w-9 h-9 rounded-full bg-brand-teal/10 items-center justify-center mr-3">
                      {reply.authorProfilePicture ? (
                        <Image
                          source={{ uri: reply.authorProfilePicture }}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <Text variant="caption" className="text-brand-teal">
                          {reply.authorName?.[0]?.toUpperCase() || "?"}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Text variant="label" className="mr-2">
                        {reply.authorName}
                      </Text>
                      <Text
                        variant="caption"
                        className="text-content-tertiary"
                      >
                        {timeAgo(reply.createdAt)}
                      </Text>
                    </View>
                    <Text
                      variant="body"
                      className="text-content-secondary leading-[24px]"
                    >
                      {reply.content}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Comment Input */}
        <View className="flex-row items-center px-5 py-3 border-t border-content-secondary/10 bg-surface dark:bg-surface-dark">
          <View className="w-8 h-8 rounded-full bg-brand-teal/10 items-center justify-center mr-3">
            {userData?.profilePicture ? (
              <Image
                source={{ uri: userData.profilePicture }}
                className="w-full h-full rounded-full"
              />
            ) : (
              <Text variant="caption" className="text-brand-teal">
                {userData?.name?.[0]?.toUpperCase() || "?"}
              </Text>
            )}
          </View>
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Write a comment..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 h-10 px-4 rounded-full border border-content-secondary/20 text-content bg-transparent text-[15px]"
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
              color={newComment.trim() ? "#0071E3" : "#9CA3AF"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
