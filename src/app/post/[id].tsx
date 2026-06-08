/**
 * Post Detail Screen
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { AppAlert } from '@/components/ui/AppAlert';
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import firestore from "@react-native-firebase/firestore";
import {
  Heart, MessageCircle, Share2, ArrowLeft,
  Send, X, Bookmark,
} from "lucide-react-native";
import { toggleUpvote, toggleSavePost } from "@/lib/social";

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
  return date.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, userData } = useAuth();
  const { isDark } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const inputBg        = isDark ? "#2C2C2E" : "#F5F5F7";
  const inputText      = isDark ? "#F5F5F7" : "#1A1A1C";
  const placeholderClr = isDark ? "#636366" : "#8E8E93";
  const borderClr      = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const iconColor      = isDark ? "#F5F5F7" : "#1A1A1C";

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = firestore().collection("posts").doc(id).onSnapshot((doc) => {
      if (doc.data()) setPost({ id: doc.id, ...doc.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const unsub = firestore()
      .collection("post_replies")
      .where("postId", "==", id)
      .onSnapshot(async (snap) => {
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
        items.sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0));
        setReplies([...items]);

        try {
          const authorIds = [...new Set(items.map(i => i.authorId).filter(Boolean))];
          if (authorIds.length > 0) {
            const userDocs = await Promise.all(authorIds.map(uid => firestore().collection("users").doc(uid).get()));
            const picMap: Record<string, string> = {};
            userDocs.forEach(u => { if (u.data()?.profilePicture) picMap[u.id] = u.data()!.profilePicture; });
            let changed = false;
            const updated = items.map(item => {
              if (picMap[item.authorId] && picMap[item.authorId] !== item.authorProfilePicture) {
                changed = true;
                return { ...item, authorProfilePicture: picMap[item.authorId] };
              }
              return item;
            });
            if (changed) setReplies(updated);
          }
        } catch {}
      }, (err) => console.warn("Replies listener error:", err));
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    const unsub = firestore().collection("post_upvotes")
      .where("postId", "==", id).where("userId", "==", user.uid)
      .onSnapshot((snap) => setHasUpvoted(snap?.size > 0));
    return () => unsub();
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) return;
    const unsub = firestore().collection("saved_posts")
      .where("postId", "==", id).where("userId", "==", user.uid)
      .onSnapshot((snap) => setHasSaved(snap?.size > 0));
    return () => unsub();
  }, [id, user]);

  const handleUpvote = async () => {
    if (!user || !id) return;
    try { await toggleUpvote(id, user.uid); } catch (err) { console.error(err); }
  };

  const handleToggleSave = async () => {
    if (!user || !id) return;
    try { await toggleSavePost(id, user.uid); } catch (err) { console.error(err); }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !user || !userData || !id) return;
    setSending(true);
    try {
      const replyData: any = {
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
      if (replyingTo) replyData.parentId = replyingTo.id;
      await firestore().collection("post_replies").add(replyData);
      await firestore().collection("posts").doc(id).update({ repliesCount: firestore.FieldValue.increment(1) });
      if (replyingTo) {
        await firestore().collection("post_replies").doc(replyingTo.id).update({ repliesCount: firestore.FieldValue.increment(1) });
      }
      setNewComment("");
      setReplyingTo(null);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (err) { console.error("Comment error:", err); }
    finally { setSending(false); }
  };

  const handleDeleteComment = (replyId: string) => {
    AppAlert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await firestore().collection("post_replies").doc(replyId).delete();
          if (post) await firestore().collection("posts").doc(post.id).update({ repliesCount: firestore.FieldValue.increment(-1) });
        } catch (err) { console.error(err); }
      }},
    ]);
  };

  const repliesMap = useMemo(() => {
    const map: Record<string, Reply[]> = {};
    replies.forEach((r) => {
      const key = r.parentId || "root";
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return map;
  }, [replies]);

  const renderCommentNode = (reply: Reply, level = 0) => {
    const children = repliesMap[reply.id] || [];
    const isIndented = level > 0;
    return (
      <View key={reply.id} className={`mb-4 ${isIndented ? "ml-10 mt-1" : ""}`}>
        <View className="flex-row">
          <TouchableOpacity onPress={() => router.push(`/profile/${reply.authorId}` as any)}>
            <View
              style={{ width: isIndented ? 28 : 36, height: isIndented ? 28 : 36, borderRadius: 99, backgroundColor: inputBg, alignItems: "center", justifyContent: "center", marginRight: 12, overflow: "hidden" }}
            >
              {reply.authorProfilePicture ? (
                <Image source={{ uri: reply.authorProfilePicture }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
              ) : (
                <Text variant="caption" className="text-content-secondary font-sans-semibold" style={{ fontSize: isIndented ? 12 : 14 }}>
                  {reply.authorName?.[0]?.toUpperCase() || "?"}
                </Text>
              )}
            </View>
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Text variant="label" className="font-sans-semibold dark:text-ink-dark mr-2" style={{ fontSize: isIndented ? 13 : 14 }}>
                {reply.authorName}
              </Text>
              <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint">
                {timeAgo(reply.createdAt)}
              </Text>
            </View>
            <Text variant="body" className="text-content-secondary dark:text-ink-dark-muted leading-[22px]" style={{ fontSize: isIndented ? 14 : 15 }}>
              {reply.content}
            </Text>
            <View className="flex-row items-center gap-4 mt-1.5">
              <TouchableOpacity>
                <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint font-sans-semibold">
                  {reply.upvotesCount || 0} Likes
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setReplyingTo({ id: reply.id, name: reply.authorName })}>
                <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint font-sans-semibold">Reply</Text>
              </TouchableOpacity>
              {(reply.authorId === user?.uid || (userData as any)?.role === "admin") && (
                <TouchableOpacity onPress={() => handleDeleteComment(reply.id)}>
                  <Text variant="caption" className="text-error font-sans-semibold">Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        {children.length > 0 && (
          <View className="mt-3">{children.map((c) => renderCommentNode(c, level + 1))}</View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
        <ActivityIndicator color="#14B8A6" />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark items-center justify-center">
        <Text variant="body" className="text-content-secondary">Post not found</Text>
      </SafeAreaView>
    );
  }

  const isAnonymous = post.type === "confession" && post.isAnonymous;
  const displayName = isAnonymous ? "Anonymous" : post.authorName;
  const postImages = post.imageUrls?.length > 0 ? post.imageUrls : post.imageUrl ? [post.imageUrl] : [];

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-5 py-3" style={{ borderBottomWidth: 1, borderBottomColor: borderClr }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} className="mr-4 p-1">
            <ArrowLeft size={22} color={iconColor} />
          </TouchableOpacity>
          <Text variant="h4" className="dark:text-ink-dark">Post</Text>
        </View>

        <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          {/* Post Content */}
          <View className="px-5 py-5" style={{ borderBottomWidth: 1, borderBottomColor: borderClr }}>
            {/* Author Row */}
            <TouchableOpacity
              className="flex-row items-center mb-4"
              activeOpacity={isAnonymous ? 1 : 0.7}
              disabled={isAnonymous}
              onPress={() => !isAnonymous && router.push(`/profile/${post.authorId}` as any)}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isAnonymous ? "rgba(147,51,234,0.1)" : inputBg, alignItems: "center", justifyContent: "center", marginRight: 12, overflow: "hidden" }}>
                {!isAnonymous && post.authorProfilePicture ? (
                  <Image source={{ uri: post.authorProfilePicture }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <Text variant="h4" style={{ color: isAnonymous ? "#A855F7" : isDark ? "#98989D" : "#636366" }}>
                    {displayName?.[0]?.toUpperCase() || "?"}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text variant="label" className="font-sans-semibold dark:text-ink-dark" numberOfLines={1}>{displayName}</Text>
                <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint mt-0.5">
                  {post.school}{post.city ? ` · ${post.city}` : ""} · {timeAgo(post.createdAt)}
                </Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: post.type === "confession" ? "rgba(147,51,234,0.08)" : inputBg }}>
                <Text variant="caption" style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "capitalize", color: post.type === "confession" ? "#A855F7" : isDark ? "#98989D" : "#636366" }}>
                  {post.type}
                </Text>
              </View>
            </TouchableOpacity>

            {post.title ? <Text variant="h3" className="mb-3 dark:text-ink-dark">{post.title}</Text> : null}

            <Text variant="body" className="text-content-secondary dark:text-ink-dark-muted leading-[26px] mb-4">
              {post.content}
            </Text>

            {postImages.map((url: string, idx: number) => (
              <View key={idx} style={{ width: "100%", aspectRatio: 4/3, borderRadius: 12, overflow: "hidden", marginBottom: 12, backgroundColor: inputBg }}>
                <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
              </View>
            ))}

            {/* Action Bar */}
            <View className="flex-row items-center justify-between pt-3">
              <View className="flex-row items-center gap-5">
                <TouchableOpacity onPress={handleUpvote} className="flex-row items-center">
                  <Heart size={22} color={hasUpvoted ? "#FF375F" : "#8E8E93"} fill={hasUpvoted ? "#FF375F" : "transparent"} />
                  <Text variant="label" className={`ml-1.5 ${hasUpvoted ? "text-brand-pink" : "text-content-tertiary dark:text-ink-dark-faint"}`}>
                    {post.upvotesCount || 0}
                  </Text>
                </TouchableOpacity>
                <View className="flex-row items-center">
                  <MessageCircle size={22} color="#8E8E93" />
                  <Text variant="label" className="ml-1.5 text-content-tertiary dark:text-ink-dark-faint">{replies.length}</Text>
                </View>
                <TouchableOpacity>
                  <Share2 size={22} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={handleToggleSave}>
                <Bookmark size={22} color={hasSaved ? "#14B8A6" : "#8E8E93"} fill={hasSaved ? "#14B8A6" : "transparent"} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments */}
          <View className="px-5 pt-4">
            <Text variant="h4" className="mb-4 dark:text-ink-dark">Comments ({replies.length})</Text>
            {replies.length === 0 ? (
              <View className="items-center py-8">
                <MessageCircle size={32} color={isDark ? "#3A3A3C" : "#E5E5EA"} />
                <Text variant="bodySmall" className="text-content-tertiary dark:text-ink-dark-faint text-center mt-3">
                  No comments yet. Be the first!
                </Text>
              </View>
            ) : (
              (repliesMap["root"] || []).map((reply) => renderCommentNode(reply, 0))
            )}
          </View>
        </ScrollView>

        {/* Input Area */}
        <View style={{ borderTopWidth: 1, borderTopColor: borderClr }} className="bg-surface dark:bg-surface-dark pb-2">
          {replyingTo && (
            <View className="flex-row items-center justify-between px-5 py-2" style={{ backgroundColor: inputBg }}>
              <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted font-sans-medium">
                Replying to <Text variant="caption" className="font-sans-semibold text-brand-teal">@{replyingTo.name}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={14} color="#8E8E93" />
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-row items-center px-5 py-3">
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: inputBg, alignItems: "center", justifyContent: "center", marginRight: 12, overflow: "hidden" }}>
              {userData?.profilePicture ? (
                <Image source={{ uri: userData.profilePicture }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
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
              placeholderTextColor={placeholderClr}
              style={{ flex: 1, height: 40, paddingHorizontal: 16, borderRadius: 999, backgroundColor: inputBg, color: inputText, fontSize: 15 }}
              returnKeyType="send"
              onSubmitEditing={handleSendComment}
            />
            <TouchableOpacity onPress={handleSendComment} disabled={!newComment.trim() || sending} className="ml-3" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Send size={22} color={newComment.trim() ? "#14B8A6" : "#8E8E93"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}