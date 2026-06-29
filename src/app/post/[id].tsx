/**
 * Post Detail Screen
 * — replies now support image attachments (pick from gallery, preview, display inline)
 * — comments/replies now support likes (togglable, optimistic UI)
 * — comments/replies now support editing (author-only, text-only)
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { AppAlert } from "@/components/ui/AppAlert";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { ImageSlider } from "@/components/ui/ImageSlider";
import {
  Heart, MessageCircle, Share2, ArrowLeft,
  Send, X, Bookmark, ImagePlus, Check,
} from "lucide-react-native";
import { toggleUpvote, toggleSavePost } from "@/lib/social";
import { notifyOnReply } from "@/lib/notifications";
import PollDisplay from "@/components/ui/PollDisplay";
import ShareToChatModal from '@/components/ui/ShareToChatModal';


interface Reply {
  id: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string | null;
  content: string;
  imageUrl?: string | null;
  parentId?: string | null;
  repliesCount?: number;
  upvotesCount?: number;
  edited?: boolean;
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

// Toggle a reply upvote in the reply_upvotes collection
// and increment/decrement the reply's upvotesCount field
async function toggleReplyUpvote(replyId: string, userId: string) {
  const col = firestore().collection("reply_upvotes");
  const snap = await col
    .where("replyId", "==", replyId)
    .where("userId", "==", userId)
    .get();

  const replyRef = firestore().collection("post_replies").doc(replyId);

  if (snap.size > 0) {
    // Already upvoted → remove
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
    await replyRef.update({
      upvotesCount: firestore.FieldValue.increment(-1),
    });
  } else {
    // Not yet upvoted → add
    await col.add({ replyId, userId, createdAt: firestore.FieldValue.serverTimestamp() });
    await replyRef.update({
      upvotesCount: firestore.FieldValue.increment(1),
    });
  }
}

// Edit a reply's content. Mirrors the Firestore rule exactly:
// only content/edited/updatedAt may change, and edited must become true.
async function editReply(replyId: string, content: string) {
  await firestore().collection("post_replies").doc(replyId).update({
    content,
    edited: true,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
}

export default function PostDetailScreen() {
  const { id, replyId: targetReplyId } = useLocalSearchParams<{ id: string; replyId?: string }>();
  const { user, userData } = useAuth();
  const { isDark } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const inputBg        = isDark ? "#2C2C2E" : "#F5F5F7";
  const inputText      = isDark ? "#F5F5F7" : "#1A1A1C";
  const placeholderClr = isDark ? "#636366" : "#8E8E93";
  const borderClr      = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const iconColor      = isDark ? "#F5F5F7" : "#1A1A1C";
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'top'>('newest');
  const isSendingRef = useRef(false);

  // Deep-link to a specific comment (from a "new_reply" notification)
  const commentRefs = useRef<Record<string, View | null>>({});
  const [highlightedReplyId, setHighlightedReplyId] = useState<string | null>(null);
  const hasScrolledToTarget = useRef(false);

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Comment editing state
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Post-level upvote state
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [optimisticUpvote, setOptimisticUpvote] = useState<boolean | null>(null);
  const [optimisticCount, setOptimisticCount] = useState<number | null>(null);
  const upvoteSyncRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; baseline: boolean }>({
    timer: null,
    baseline: false,
  });
  const getLikeCount = (reply: Reply) => {
    const opt = optimisticReplyUpvotes[reply.id];
    return opt ? opt.count : (reply.upvotesCount || 0);
  };
  // Reply-level upvote state
  // upvotedReplyIds: set of replyIds the current user has upvoted (from Firestore)
  const [upvotedReplyIds, setUpvotedReplyIds] = useState<Set<string>>(new Set());
  // optimisticReplyUpvotes: { [replyId]: { liked: boolean; count: number } }
  const [optimisticReplyUpvotes, setOptimisticReplyUpvotes] = useState<
    Record<string, { liked: boolean; count: number }>
  >({});
  const replyUpvoteSyncRefs = useRef<
    Record<string, { timer: ReturnType<typeof setTimeout> | null; baseline: boolean }>
  >({});

  const [hasSaved, setHasSaved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string; authorId: string } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height + 12);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleReply = (replyId: string, name: string, authorId: string) => {
    setReplyingTo({ id: replyId, name, authorId });
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  // Listen to post doc
  useEffect(() => {
    if (!id) return;
    const unsub = firestore().collection("posts").doc(id).onSnapshot((doc) => {
      if (doc.data()) setPost({ id: doc.id, ...doc.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  // Listen to replies
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
            authorId: data.authorId || "",
            authorName: data.authorName || "Unknown",
            authorProfilePicture: data.authorProfilePicture || null,
            content: data.content || "",
            imageUrl: data.imageUrl || null,
            parentId: data.parentId || null,
            repliesCount: data.repliesCount || 0,
            upvotesCount: data.upvotesCount || 0,
            edited: data.edited || false,
            createdAt: data.createdAt,
          });
        });
        items.sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0));
        setReplies([...items]);

        try {
          const authorIds = [...new Set(items.map((i) => i.authorId).filter(Boolean))];
          if (authorIds.length > 0) {
            const userDocs = await Promise.all(
              authorIds.map((uid) => firestore().collection("users").doc(uid).get())
            );
            const picMap: Record<string, string> = {};
            userDocs.forEach((u) => {
              if (u.data()?.profilePicture) picMap[u.id] = u.data()!.profilePicture;
            });
            let changed = false;
            const updated = items.map((item) => {
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

  // Listen to post upvotes for current user
  useEffect(() => {
    if (!id || !user) return;
    const unsub = firestore()
      .collection("post_upvotes")
      .where("postId", "==", id)
      .where("userId", "==", user.uid)
      .onSnapshot((snap) => setHasUpvoted(snap?.size > 0));
    return () => unsub();
  }, [id, user]);

  useEffect(() => {
    upvoteSyncRef.current.baseline = hasUpvoted;
    if (optimisticUpvote !== null && hasUpvoted === optimisticUpvote) {
      setOptimisticUpvote(null);
      setOptimisticCount(null);
    }
  }, [hasUpvoted]);

  // Listen to reply upvotes for current user
  useEffect(() => {
    if (!id || !user) return;
    const unsub = firestore()
      .collection("reply_upvotes")
      .where("userId", "==", user.uid)
      .onSnapshot((snap) => {
        if (!snap) return;
        const ids = new Set<string>();
        snap.forEach((d) => ids.add(d.data().replyId));
        setUpvotedReplyIds(ids);
      });
    return () => unsub();
  }, [id, user]);

  // Sync optimistic reply upvotes when Firestore confirms
  useEffect(() => {
    setOptimisticReplyUpvotes((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const replyId of Object.keys(prev)) {
        if (replyUpvoteSyncRefs.current[replyId]) {
          replyUpvoteSyncRefs.current[replyId].baseline = upvotedReplyIds.has(replyId);
        }
        if (prev[replyId].liked === upvotedReplyIds.has(replyId)) {
          delete next[replyId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [upvotedReplyIds]);

  // Listen to saved posts
  useEffect(() => {
    if (!id || !user) return;
    const unsub = firestore()
      .collection("saved_posts")
      .where("postId", "==", id)
      .where("userId", "==", user.uid)
      .onSnapshot((snap) => setHasSaved(snap?.size > 0));
    return () => unsub();
  }, [id, user]);

  // Post upvote handler (unchanged)
  const handleUpvote = () => {
    if (!user || !id) return;
    const current = optimisticUpvote ?? hasUpvoted;
    const next = !current;
    const baseCount = optimisticCount ?? (post.upvotesCount || 0);
    setOptimisticUpvote(next);
    setOptimisticCount(baseCount + (next ? 1 : -1));
    if (upvoteSyncRef.current.timer) clearTimeout(upvoteSyncRef.current.timer);
    upvoteSyncRef.current.timer = setTimeout(async () => {
      const baseline = upvoteSyncRef.current.baseline;
      if (next === baseline) {
        setOptimisticUpvote(null);
        setOptimisticCount(null);
        return;
      }
      try {
        await toggleUpvote(id, user.uid);
      } catch (err) {
        console.error(err);
        setOptimisticUpvote(null);
        setOptimisticCount(null);
      }
    }, 400);
  };

  // Reply upvote handler (new)
  const handleReplyUpvote = (reply: Reply) => {
    if (!user) return;
    const replyId = reply.id;
    const existing = optimisticReplyUpvotes[replyId];
    const baseline = upvotedReplyIds.has(replyId);
    const current = existing ? existing.liked : baseline;
    const next = !current;
    const baseCount = existing ? existing.count : (reply.upvotesCount || 0);

    setOptimisticReplyUpvotes((prev) => ({
      ...prev,
      [replyId]: { liked: next, count: baseCount + (next ? 1 : -1) },
    }));

    if (!replyUpvoteSyncRefs.current[replyId]) {
      replyUpvoteSyncRefs.current[replyId] = { timer: null, baseline };
    }
    replyUpvoteSyncRefs.current[replyId].baseline = baseline;

    const ref = replyUpvoteSyncRefs.current[replyId];
    if (ref.timer) clearTimeout(ref.timer);

    ref.timer = setTimeout(async () => {
      if (next === ref.baseline) {
        setOptimisticReplyUpvotes((prev) => {
          const copy = { ...prev };
          delete copy[replyId];
          return copy;
        });
        return;
      }
      try {
        await toggleReplyUpvote(replyId, user.uid);
      } catch (err) {
        console.error("Reply upvote error:", err);
        setOptimisticReplyUpvotes((prev) => {
          const copy = { ...prev };
          delete copy[replyId];
          return copy;
        });
      }
    }, 400);
  };

  const handleToggleSave = async () => {
    if (!user || !id) return;
    try { await toggleSavePost(id, user.uid); } catch (err) { console.error(err); }
  };

  // Image picker
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (localUri: string): Promise<string> => {
    const filename = `reply_images/${user!.uid}_${Date.now()}.jpg`;
    const ref = storage().ref(filename);
    await ref.putFile(localUri);
    return ref.getDownloadURL();
  };

  const handleSendComment = async () => {
    const hasText = newComment.trim().length > 0;
    const hasImage = !!selectedImage;
    if ((!hasText && !hasImage) || !user || !userData || !id) return;
    if (isSendingRef.current) return;

    isSendingRef.current = true;
    setSending(true);
    const commentText = newComment.trim();
    const commentImage = selectedImage;
    const commentReplyingTo = replyingTo;

    setNewComment("");
    setSelectedImage(null);
    setReplyingTo(null);
    Keyboard.dismiss();

    try {
      let imageUrl: string | null = null;
      if (commentImage) {
        imageUrl = await uploadImage(commentImage);
      }

      const replyData: any = {
        postId: id,
        authorId: user.uid,
        authorName: userData.name || "Unknown",
        authorSchool: userData.school || "",
        authorProfilePicture: userData.profilePicture || null,
        content: commentText,
        imageUrl: imageUrl,
        upvotesCount: 0,
        repliesCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };
      if (commentReplyingTo) replyData.parentId = commentReplyingTo.id;

      const newReplyRef = await firestore().collection("post_replies").add(replyData);
      await firestore().collection("posts").doc(id).update({
        repliesCount: firestore.FieldValue.increment(1),
      });
      if (commentReplyingTo) {
        await firestore().collection("post_replies").doc(commentReplyingTo.id).update({
          repliesCount: firestore.FieldValue.increment(1),
        });
      }

      const recipientUserId = commentReplyingTo ? commentReplyingTo.authorId : post?.authorId;
      if (recipientUserId) {
        notifyOnReply({
          recipientUserId,
          actorUserId: user.uid,
          actorName: userData.name || "Unknown",
          postId: id,
          replyId: newReplyRef.id,
          isReplyToComment: !!commentReplyingTo,
          contentPreview: replyData.content,
        }).catch((err) => console.warn("notifyOnReply failed:", err));
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (err) {
      console.error("Comment error:", err);
      setNewComment(commentText);
      setSelectedImage(commentImage);
      setReplyingTo(commentReplyingTo);
    } finally {
      setSending(false);
      isSendingRef.current = false;
    }
  };

  const handleDeleteComment = (replyId: string) => {
    AppAlert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await firestore().collection("post_replies").doc(replyId).delete();
            if (post)
              await firestore().collection("posts").doc(post.id).update({
                repliesCount: firestore.FieldValue.increment(-1),
              });
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
  };

  // Begin editing a comment — preload its current text
  const handleStartEdit = (reply: Reply) => {
    setReplyingTo(null);
    setEditingReplyId(reply.id);
    setEditedContent(reply.content);
  };

  const handleCancelEdit = () => {
    setEditingReplyId(null);
    setEditedContent("");
  };

  const handleSaveEdit = async () => {
    const trimmed = editedContent.trim();
    if (!editingReplyId || trimmed.length === 0 || savingEdit) return;

    setSavingEdit(true);
    try {
      await editReply(editingReplyId, trimmed);
      setEditingReplyId(null);
      setEditedContent("");
    } catch (err) {
      console.error("Edit comment error:", err);
      AppAlert.alert("Couldn't save", "Something went wrong editing your comment. Please try again.");
    } finally {
      setSavingEdit(false);
    }
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
  const sortedRootReplies = useMemo(() => {
    const root = [...(repliesMap["root"] || [])];
    if (sortBy === 'top') {
      return root.sort((a, b) => getLikeCount(b) - getLikeCount(a));
    }
    if (sortBy === 'oldest') {
      return root.sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0));
    }
    return root.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0));
  }, [repliesMap, sortBy, optimisticReplyUpvotes]);

  // Deep-link: once the target reply exists in the loaded list, scroll to it
  // and briefly highlight it. Runs once per screen visit.
  useEffect(() => {
    if (!targetReplyId || hasScrolledToTarget.current) return;
    const exists = replies.some((r) => r.id === targetReplyId);
    if (!exists) return;

    const tryScroll = () => {
      const node = commentRefs.current[targetReplyId];
      if (!node || !scrollRef.current) return false;
      node.measureLayout(
        // @ts-ignore — measureLayout's 2nd arg expects a host component handle
        scrollRef.current,
        (_x: number, y: number) => {
          scrollRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: true });
        },
        () => {}
      );
      return true;
    };

    // Give the list a moment to lay out before measuring.
    const t = setTimeout(() => {
      hasScrolledToTarget.current = true;
      setHighlightedReplyId(targetReplyId);
      tryScroll();
      setTimeout(() => setHighlightedReplyId(null), 2500);
    }, 350);

    return () => clearTimeout(t);
  }, [targetReplyId, replies]);

  const renderCommentNode = (reply: Reply, level = 0) => {
    const children = repliesMap[reply.id] || [];
    const isIndented = level > 0;

    // Resolve optimistic like state for this reply
    const opt = optimisticReplyUpvotes[reply.id];
    const isLiked = opt ? opt.liked : upvotedReplyIds.has(reply.id);
    const likeCount = opt ? opt.count : (reply.upvotesCount || 0);

    const isOwn = reply.authorId === user?.uid;
    const isEditing = editingReplyId === reply.id;
    const isHighlighted = highlightedReplyId === reply.id;

    return (
      <View
        key={reply.id}
        ref={(node) => { commentRefs.current[reply.id] = node; }}
        collapsable={false}
        style={isHighlighted ? {
          backgroundColor: isDark ? "rgba(20,184,166,0.12)" : "rgba(20,184,166,0.08)",
          borderRadius: 12,
        } : undefined}
        className={`mb-4 ${isIndented ? "ml-10 mt-1" : ""}`}
      >
        <View className="flex-row" style={{ padding: isHighlighted ? 8 : 0 }}>
          <TouchableOpacity onPress={() => router.push(`/profile/${reply.authorId}` as any)}>
            <View
              style={{
                width: isIndented ? 28 : 36,
                height: isIndented ? 28 : 36,
                borderRadius: 99,
                backgroundColor: inputBg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                overflow: "hidden",
              }}
            >
              {reply.authorProfilePicture ? (
                <Image
                  source={{ uri: reply.authorProfilePicture }}
                  style={{ width: "100%", height: "100%" }}
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
                className="font-sans-semibold dark:text-ink-dark mr-2"
                style={{ fontSize: isIndented ? 13 : 14 }}
              >
                {reply.authorName}
              </Text>
              <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint">
                {timeAgo(reply.createdAt)}
                {reply.edited ? " · edited" : ""}
              </Text>
            </View>

            {/* Comment text — editable inline when isEditing */}
            {isEditing ? (
              <View>
                <TextInput
                  value={editedContent}
                  onChangeText={setEditedContent}
                  autoFocus
                  multiline
                  maxLength={1000}
                  style={{
                    fontSize: isIndented ? 14 : 15,
                    lineHeight: 22,
                    color: inputText,
                    backgroundColor: inputBg,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    minHeight: 40,
                  }}
                />
                <View className="flex-row items-center gap-4 mt-2">
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={savingEdit || editedContent.trim().length === 0}
                    className="flex-row items-center gap-1"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {savingEdit ? (
                      <ActivityIndicator size="small" color="#14B8A6" />
                    ) : (
                      <>
                        <Check size={14} color="#14B8A6" />
                        <Text variant="caption" style={{ fontFamily: "Inter_600SemiBold", color: "#14B8A6" }}>
                          Save
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    disabled={savingEdit}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint font-sans-semibold">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {reply.content ? (
                  <Text
                    variant="body"
                    className="text-content-secondary dark:text-ink-dark-muted leading-[22px]"
                    style={{ fontSize: isIndented ? 14 : 15 }}
                  >
                    {reply.content}
                  </Text>
                ) : null}

                {/* Comment image */}
                {reply.imageUrl ? (
                  <View
                    style={{
                      marginTop: 8,
                      borderRadius: 12,
                      overflow: "hidden",
                      width: "100%",
                      aspectRatio: 4 / 3,
                      backgroundColor: inputBg,
                    }}
                  >
                    <Image
                      source={{ uri: reply.imageUrl }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                {/* Action row */}
                <View className="flex-row items-center gap-4 mt-1.5">
                  {/* Like button */}
                  <TouchableOpacity
                    onPress={() => handleReplyUpvote(reply)}
                    className="flex-row items-center gap-1"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Heart
                      size={14}
                      color={isLiked ? "#FF375F" : isDark ? "#636366" : "#8E8E93"}
                      fill={isLiked ? "#FF375F" : "transparent"}
                    />
                    <Text
                      variant="caption"
                      style={{
                        fontFamily: "Inter_600SemiBold",
                        color: isLiked
                          ? "#FF375F"
                          : isDark ? "#636366" : "#8E8E93",
                      }}
                    >
                      {likeCount > 0 ? likeCount : "Like"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleReply(reply.id, reply.authorName, reply.authorId)}>
                    <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint font-sans-semibold">
                      Reply
                    </Text>
                  </TouchableOpacity>

                  {isOwn && (
                    <TouchableOpacity onPress={() => handleStartEdit(reply)}>
                      <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint font-sans-semibold">
                        Edit
                      </Text>
                    </TouchableOpacity>
                  )}

                  {(isOwn || (userData as any)?.role === "admin") && (
                    <TouchableOpacity onPress={() => handleDeleteComment(reply.id)}>
                      <Text variant="caption" className="text-error font-sans-semibold">
                        Delete
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
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
        <Text variant="body" className="text-content-secondary">
          Post not found
        </Text>
      </SafeAreaView>
    );
  }

  const isAnonymous = post.type === "confession" && post.isAnonymous;
  const displayName = isAnonymous ? "Anonymous" : post.authorName;
  const postImages =
    post.imageUrls?.length > 0 ? post.imageUrls : post.imageUrl ? [post.imageUrl] : [];
  const displayLiked = optimisticUpvote ?? hasUpvoted;
  const displayCount = optimisticCount ?? (post.upvotesCount || 0);
  const canSend = (newComment.trim().length > 0 || !!selectedImage) && !sending;

  const inner = (
    <>
      {/* Header */}
      <View
        className="flex-row items-center px-5 py-3"
        style={{ borderBottomWidth: 1, borderBottomColor: borderClr }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="mr-4 p-1"
        >
          <ArrowLeft size={22} color={iconColor} />
        </TouchableOpacity>
        <Text variant="h4" className="dark:text-ink-dark">
          Post
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post Content */}
        <View className="px-5 py-5" style={{ borderBottomWidth: 1, borderBottomColor: borderClr }}>
          {/* Author Row */}
          <TouchableOpacity
            className="flex-row items-center mb-4"
            activeOpacity={isAnonymous ? 1 : 0.7}
            disabled={isAnonymous}
            onPress={() => !isAnonymous && router.push(`/profile/${post.authorId}` as any)}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isAnonymous ? "rgba(147,51,234,0.1)" : inputBg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                overflow: "hidden",
              }}
            >
              {!isAnonymous && post.authorProfilePicture ? (
                <Image
                  source={{ uri: post.authorProfilePicture }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <Text
                  variant="h4"
                  style={{ color: isAnonymous ? "#A855F7" : isDark ? "#98989D" : "#636366" }}
                >
                  {displayName?.[0]?.toUpperCase() || "?"}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text
                variant="label"
                className="font-sans-semibold dark:text-ink-dark"
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                variant="caption"
                className="text-content-tertiary dark:text-ink-dark-faint mt-0.5"
              >
                {post.school}
                {post.city ? ` · ${post.city}` : ""} · {timeAgo(post.createdAt)}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 6,
                backgroundColor:
                  post.type === "confession" ? "rgba(147,51,234,0.08)" : inputBg,
              }}
            >
              <Text
                variant="caption"
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_600SemiBold",
                  textTransform: "capitalize",
                  color:
                    post.type === "confession"
                      ? "#A855F7"
                      : isDark
                      ? "#98989D"
                      : "#636366",
                }}
              >
                {post.type}
              </Text>
            </View>
          </TouchableOpacity>

          {post.title ? (
            <Text variant="h3" className="mb-3 dark:text-ink-dark">
              {post.title}
            </Text>
          ) : null}

          <Text
            variant="body"
            className="text-content-secondary dark:text-ink-dark-muted leading-[26px] mb-4"
          >
            {post.content}
          </Text>
          <ImageSlider urls={postImages} inputBg={inputBg} isDark={isDark} />

          {post.poll && <PollDisplay postId={post.id} poll={post.poll} />}

          {/* Action Bar */}
          <View className="flex-row items-center justify-between pt-3">
            <View className="flex-row items-center gap-5">
              <TouchableOpacity onPress={handleUpvote} className="flex-row items-center">
                <Heart
                  size={22}
                  color={displayLiked ? "#FF375F" : "#8E8E93"}
                  fill={displayLiked ? "#FF375F" : "transparent"}
                />
                <Text
                  variant="label"
                  className={`ml-1.5 ${
                    displayLiked
                      ? "text-brand-pink"
                      : "text-content-tertiary dark:text-ink-dark-faint"
                  }`}
                >
                  {displayCount}
                </Text>
              </TouchableOpacity>
              <View className="flex-row items-center">
                <MessageCircle size={22} color="#8E8E93" />
                <Text
                  variant="label"
                  className="ml-1.5 text-content-tertiary dark:text-ink-dark-faint"
                >
                  {replies.length}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShareModalOpen(true)}>
                <Share2 size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleToggleSave}>
              <Bookmark
                size={22}
                color={hasSaved ? "#14B8A6" : "#8E8E93"}
                fill={hasSaved ? "#14B8A6" : "transparent"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments */}
        <View className="px-5 pt-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text variant="h4" className="dark:text-ink-dark">
            Comments ({replies.length})
          </Text>
          <View className="flex-row rounded-full overflow-hidden" style={{ backgroundColor: inputBg }}>
            {(['newest', 'top', 'oldest'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => setSortBy(opt)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: sortBy === opt ? '#14B8A6' : 'transparent',
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    color: sortBy === opt ? '#fff' : (isDark ? '#98989D' : '#636366'),
                    textTransform: 'capitalize',
                  }}
                >
                  {opt === 'top' ? 'Top' : opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
          {replies.length === 0 ? (
            <View className="items-center py-8">
              <MessageCircle size={32} color={isDark ? "#3A3A3C" : "#E5E5EA"} />
              <Text
                variant="bodySmall"
                className="text-content-tertiary dark:text-ink-dark-faint text-center mt-3"
              >
                No comments yet. Be the first!
              </Text>
            </View>
          ) : (
            sortedRootReplies.map((reply) => renderCommentNode(reply, 0))
          )}
        </View>
      </ScrollView>

      {/* Input Area */}
      <View
        style={{ borderTopWidth: 1, borderTopColor: borderClr }}
        className="bg-surface dark:bg-surface-dark pb-2"
      >
        {/* Replying-to banner */}
        {replyingTo && (
          <View
            className="flex-row items-center justify-between px-5 py-2"
            style={{ backgroundColor: inputBg }}
          >
            <Text
              variant="caption"
              className="text-content-secondary dark:text-ink-dark-muted font-sans-medium"
            >
              Replying to{" "}
              <Text variant="caption" className="font-sans-semibold text-brand-teal">
                @{replyingTo.name}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={() => setReplyingTo(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={14} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        )}

        {/* Selected image preview */}
        {selectedImage && (
          <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 10,
                overflow: "hidden",
                backgroundColor: inputBg,
              }}
            >
              <Image
                source={{ uri: selectedImage }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  borderRadius: 999,
                  padding: 3,
                }}
              >
                <X size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Text row */}
        <View className="flex-row items-center px-5 py-3">
          {/* User avatar */}
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: inputBg,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
              overflow: "hidden",
            }}
          >
            {userData?.profilePicture ? (
              <Image
                source={{ uri: userData.profilePicture }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Text variant="caption" className="text-content-secondary font-sans-semibold">
                {userData?.name?.[0]?.toUpperCase() || "?"}
              </Text>
            )}
          </View>

          {/* Image attach button */}
          <TouchableOpacity
            onPress={handlePickImage}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ marginRight: 10 }}
          >
            <ImagePlus size={22} color={selectedImage ? "#14B8A6" : "#8E8E93"} />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            ref={inputRef}
            value={newComment}
            onChangeText={setNewComment}
            placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
            placeholderTextColor={placeholderClr}
            style={{
              flex: 1,
              height: 40,
              paddingHorizontal: 16,
              borderRadius: 999,
              backgroundColor: inputBg,
              color: inputText,
              fontSize: 15,
            }}
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
          />

          {/* Send button */}
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={!canSend}
            className="ml-3"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#14B8A6" />
            ) : (
              <Send size={22} color={canSend ? "#14B8A6" : "#8E8E93"} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <ShareToChatModal
        visible={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        post={post}
      />
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top", "bottom"]}>
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          {inner}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1, paddingBottom: keyboardHeight }}>{inner}</View>
      )}
    </SafeAreaView>
  );
}