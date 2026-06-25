/**
 * Post Composer Screen
 */

import React, { useState, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Switch,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { X, ImagePlus, ChevronDown, BarChart3, Plus, Trash2, Film } from "lucide-react-native";
import firestore, { Timestamp } from "@react-native-firebase/firestore";
import { uploadPostImageMobile, uploadPostVideoMobile } from "@/lib/storage";
import { AppAlert } from '@/components/ui/AppAlert';
import Video from "react-native-video";


const POST_TYPES = [
  { value: "info",       label: "School Info" },
  { value: "notes",      label: "Notes" },
  { value: "event",      label: "Interschool Event" },
  { value: "confession", label: "Anonymous Post" },
  { value: "others",     label: "Others" },
] as const;

const POLL_DURATIONS = [
  { label: '1 day',  hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
];

export default function PostCreateScreen() {
  const { user, userData } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<string>("others");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  // ── Upload progress (MB done / MB left) ─────────────
  const [uploadProgress, setUploadProgress] = useState<{ loaded: number; total: number } | null>(null);
  const uploadProgressMap = useRef<Map<string, { loaded: number; total: number }>>(new Map());

  const reportUploadProgress = (key: string, loaded: number, total: number) => {
    uploadProgressMap.current.set(key, { loaded, total });
    let sumLoaded = 0;
    let sumTotal = 0;
    uploadProgressMap.current.forEach((v) => {
      sumLoaded += v.loaded;
      sumTotal += v.total;
    });
    setUploadProgress({ loaded: sumLoaded, total: sumTotal });
  };

  // ── Poll state ──────────────────────────────────────
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollChoices, setPollChoices] = useState<string[]>(['', '']);
  const [pollDurationIdx, setPollDurationIdx] = useState(0);

  const addPollChoice = () => {
    if (pollChoices.length >= 5) return;
    setPollChoices(prev => [...prev, '']);
  };

  const removePollChoice = (idx: number) => {
    if (pollChoices.length <= 2) return;
    setPollChoices(prev => prev.filter((_, i) => i !== idx));
  };

  const updatePollChoice = (idx: number, value: string) => {
    setPollChoices(prev => prev.map((c, i) => (i === idx ? value : c)));
  };

  const isPollValid = () =>
    pollChoices.filter(c => c.trim().length > 0).length >= 2;

  // ── Theme-aware colours ─────────────────────────────
  const inputBg        = isDark ? "#2C2C2E" : "#F5F5F7";
  const inputText      = isDark ? "#F5F5F7" : "#1A1A1C";
  const placeholderClr = isDark ? "#636366" : "#9CA3AF";
  const borderClr      = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const teal           = isDark ? '#2DD4BF' : '#14B8A6';
  const labelColor     = isDark ? '#A1A1AA' : '#71717A';

  // ── Image picking ───────────────────────────────────
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setVideo(null); // images and video are mutually exclusive
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Video picking ───────────────────────────────────
  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
      videoMaxDuration: 120,
    });
    if (!result.canceled) {
      setImages([]); // images and video are mutually exclusive
      setVideo(result.assets[0].uri);
    }
  };

  const removeVideo = () => setVideo(null);

  // ── Submit ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!content.trim()) { AppAlert.alert("Please write something before posting."); return; }
    if (!user || !userData) { AppAlert.alert("You must be logged in to post."); return; }
    if (pollEnabled && !isPollValid()) {
      AppAlert.alert("Poll incomplete", "Please fill in at least 2 poll choices.");
      return;
    }

    setIsSubmitting(true);
    uploadProgressMap.current = new Map();
    try {
      // Upload images
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await Promise.all(
          images.map((uri, i) =>
            uploadPostImageMobile(uri, (loaded, total) =>
              reportUploadProgress(`img-${i}`, loaded, total)
            )
          )
        );
      }

      // Upload video
      let videoUrl: string | null = null;
      if (video) {
        videoUrl = await uploadPostVideoMobile(video, (loaded, total) =>
          reportUploadProgress('video', loaded, total)
        );
      }

      let pollPayload: object | null = null;
      if (pollEnabled) {
        const filledChoices = pollChoices.filter(c => c.trim().length > 0);
        const durationMs = POLL_DURATIONS[pollDurationIdx].hours * 60 * 60 * 1000;
        pollPayload = {
          choices: filledChoices,
          votes: {},
          expiresAt: Timestamp.fromMillis(Date.now() + durationMs),
        };
      }

      const payload: any = {
        title: title.trim() || "Untitled",
        content: content.trim(),
        type,
        isAnonymous: type === "confession" ? isAnonymous : false,
        authorId: user.uid,
        authorName: userData.name || "Unknown",
        school: userData.school || "Unknown",
        upvotesCount: 0,
        repliesCount: 0,
        status: "approved",
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // Only attach optional fields when they actually have a value.
      // Sending them as `null` trips the `data.imageUrl is string` check in
      // firestore.rules (isValidPost) since that field doesn't allow null,
      // which is what was causing the permission-denied error.
      if (userData.profilePicture) payload.authorProfilePicture = userData.profilePicture;
      if (userData.city) payload.city = userData.city;
      if (imageUrls.length > 0) {
        payload.imageUrl = imageUrls[0];
        payload.imageUrls = imageUrls;
      }
      if (videoUrl) payload.videoUrl = videoUrl;
      if (pollPayload) payload.poll = pollPayload;

      await firestore().collection("posts").add(payload);
      router.back();
    } catch (error: any) {
      console.error("Error creating post:", error);
      AppAlert.alert("Failed to create post", error?.message ?? "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = content.trim().length > 0 && !isSubmitting;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* ── Header ── */}
        <View
          className="flex-row items-center justify-between px-5 py-3 border-b"
          style={{ borderBottomColor: borderClr }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#8E8E93" />
          </TouchableOpacity>

          <Text variant="h4" className="dark:text-ink-dark">New Post</Text>

        {isSubmitting ? (
          <View style={{ alignItems: 'flex-end', minWidth: 72 }}>
            <Text style={{ color: teal, fontSize: 12, marginBottom: 3 }}>
              {uploadProgress
                ? `${Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%`
                : 'Uploading...'}
            </Text>
            <View style={{
              width: 72, height: 4, borderRadius: 2,
              backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA',
            }}>
              <View style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: teal,
                width: uploadProgress
                  ? `${Math.round((uploadProgress.loaded / uploadProgress.total) * 100)}%`
                  : '2%', // ← non-zero so the bar is visible immediately
              }} />
            </View>
          </View>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: canSubmit ? "#14B8A6" : isDark ? "#2C2C2E" : "#E5E5EA",
              }}
            >
              <Text variant="label" style={{
                fontSize: 13,
                color: canSubmit ? "#FFFFFF" : isDark ? "#636366" : "#9CA3AF",
              }}>
                Post
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Author Row ── */}
          <View className="flex-row items-center mb-5">
            <View className="w-10 h-10 rounded-full bg-brand-teal/10 items-center justify-center mr-3 overflow-hidden">
              {userData?.profilePicture ? (
                <Image source={{ uri: userData.profilePicture }} className="w-full h-full" />
              ) : (
                <Text variant="label" className="text-brand-teal">
                  {userData?.name?.[0]?.toUpperCase() || "?"}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text variant="label" className="dark:text-ink-dark">{userData?.name || "You"}</Text>
              <Text variant="caption" className="text-content-secondary dark:text-ink-dark-faint">
                {userData?.school || ""}
              </Text>
            </View>
          </View>

          {/* ── Type Selector ── */}
          <TouchableOpacity
            onPress={() => setShowTypeMenu(!showTypeMenu)}
            className="flex-row items-center mb-5 self-start px-3 py-1.5 rounded-full"
            style={{ borderWidth: 1, borderColor: borderClr }}
          >
            <Text variant="caption" className="text-content-secondary dark:text-ink-dark-muted mr-1">
              {POST_TYPES.find(t => t.value === type)?.label || type}
            </Text>
            <ChevronDown size={14} color={isDark ? "#98989D" : "#8E8E93"} />
          </TouchableOpacity>

          {showTypeMenu && (
            <View
              className="mb-5 rounded-xl overflow-hidden"
              style={{ borderWidth: 1, borderColor: borderClr, backgroundColor: inputBg }}
            >
              {POST_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => {
                    setType(t.value);
                    setShowTypeMenu(false);
                    setIsAnonymous(t.value === "confession");
                  }}
                  className={`px-4 py-3 ${type === t.value ? "bg-brand-teal/5" : ""}`}
                  style={{ borderBottomWidth: 1, borderBottomColor: borderClr }}
                >
                  <Text
                    variant="label"
                    className={`${type === t.value ? "text-brand-teal" : "text-content-secondary dark:text-ink-dark-muted"}`}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Anonymous toggle ── */}
          {type === "confession" && (
            <TouchableOpacity
              onPress={() => setIsAnonymous(!isAnonymous)}
              className="flex-row items-center mb-5"
            >
              <View
                className={`w-5 h-5 rounded border mr-2 items-center justify-center ${
                  isAnonymous ? "bg-brand-teal border-brand-teal" : "border-content-secondary/30"
                }`}
              >
                {isAnonymous && (
                  <Text variant="caption" className="text-white text-[10px]">✓</Text>
                )}
              </View>
              <Text variant="label" className="text-content-secondary dark:text-ink-dark-muted">
                Post anonymously
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Title ── */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (optional)"
            placeholderTextColor={placeholderClr}
            style={{
              fontSize: 20,
              fontFamily: "Inter_500Medium",
              color: inputText,
              lineHeight: 28,
              marginBottom: 12,
              backgroundColor: "transparent",
            }}
          />

          {/* ── Content ── */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor={placeholderClr}
            multiline
            style={{
              fontSize: 17,
              fontFamily: "Inter_400Regular",
              color: inputText,
              lineHeight: 26,
              textAlignVertical: "top",
              minHeight: 200,
              backgroundColor: "transparent",
            }}
            autoFocus
          />

          {/* ── Image previews ── */}
          {images.length > 0 && (
            <View className="flex-row flex-wrap gap-3 mt-5">
              {images.map((uri, idx) => (
                <View key={idx} className="w-24 h-24 rounded-xl overflow-hidden relative">
                  <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/50 p-1 rounded-full"
                  >
                    <X size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* ── Video preview ── */}
          {video && (
            <View style={{ marginTop: 20, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', aspectRatio: 16/9 }}>
              <Video
                source={{ uri: video }}
                style={{ width: '100%', height: '100%' }}
                controls
                resizeMode="contain"
                paused
              />
              <TouchableOpacity onPress={removeVideo} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, padding: 4 }}>
                <X size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Poll section ── */}
          <View
            style={{
              marginTop: 24,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: pollEnabled ? teal + '40' : borderClr,
              overflow: 'hidden',
            }}
          >
            {/* Toggle row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor: pollEnabled
                  ? (isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.04)')
                  : inputBg,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <BarChart3 size={18} color={pollEnabled ? teal : labelColor} strokeWidth={2} />
                <View>
                  <Text style={{ color: pollEnabled ? teal : inputText, fontWeight: '600', fontSize: 15 }}>
                    Add a Poll
                  </Text>
                  <Text style={{ color: labelColor, fontSize: 12, marginTop: 1 }}>
                    Let readers vote on something
                  </Text>
                </View>
              </View>
              <Switch
                value={pollEnabled}
                onValueChange={v => {
                  setPollEnabled(v);
                  if (!v) setPollChoices(['', '']);
                }}
                trackColor={{ false: borderClr, true: teal + '80' }}
                thumbColor={pollEnabled ? teal : (isDark ? '#52525B' : '#D4D4D8')}
              />
            </View>

            {/* Poll options */}
            {pollEnabled && (
              <View style={{ padding: 16, gap: 10 }}>
                {pollChoices.map((choice, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 1.5,
                        borderColor: borderClr,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: labelColor }}>
                        {idx + 1}
                      </Text>
                    </View>
                    <TextInput
                      value={choice}
                      onChangeText={v => updatePollChoice(idx, v)}
                      placeholder={`Option ${idx + 1}`}
                      placeholderTextColor="#8E8E93"
                      style={{
                        flex: 1,
                        backgroundColor: inputBg,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        fontSize: 14,
                        color: inputText,
                        borderWidth: 1,
                        borderColor: choice.trim() ? teal + '60' : borderClr,
                      }}
                    />
                    {pollChoices.length > 2 && (
                      <TouchableOpacity
                        onPress={() => removePollChoice(idx)}
                        style={{
                          padding: 6,
                          borderRadius: 8,
                          backgroundColor: isDark ? 'rgba(244,63,94,0.12)' : 'rgba(244,63,94,0.08)',
                        }}
                      >
                        <Trash2 size={14} color="#F43F5E" strokeWidth={2} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {pollChoices.length < 5 && (
                  <TouchableOpacity
                    onPress={addPollChoice}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: teal + '60',
                      marginTop: 2,
                    }}
                  >
                    <Plus size={14} color={teal} strokeWidth={2.5} />
                    <Text style={{ color: teal, fontSize: 13, fontWeight: '600' }}>
                      Add option ({pollChoices.length}/5)
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Duration picker */}
                <View style={{ marginTop: 4 }}>
                  <Text
                    style={{
                      color: labelColor,
                      fontSize: 11,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      marginBottom: 8,
                    }}
                  >
                    Poll Duration
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {POLL_DURATIONS.map((dur, idx) => {
                      const active = pollDurationIdx === idx;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setPollDurationIdx(idx)}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 10,
                            alignItems: 'center',
                            backgroundColor: active ? teal : inputBg,
                            borderWidth: 1,
                            borderColor: active ? teal : borderClr,
                          }}
                        >
                          <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : labelColor }}>
                            {dur.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* ── Bottom toolbar ── */}
        <View
          className="flex-row items-center px-5 py-3"
          style={{
            borderTopWidth: 1,
            borderTopColor: borderClr,
            paddingBottom: Math.max(insets.bottom + 32, 32),
          }}
        >
          {/* Image picker — disabled when a video is selected */}
          <TouchableOpacity
            onPress={pickImage}
            disabled={images.length >= 4 || !!video}
            style={{ padding: 10, margin: -10 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ImagePlus
              size={24}
              color={
                images.length >= 4 || !!video
                  ? isDark ? "#3A3A3C" : "#D1D5DB"
                  : "#14B8A6"
              }
            />
          </TouchableOpacity>

          {/* Video picker — disabled when images are selected */}
          <TouchableOpacity
            onPress={pickVideo}
            disabled={images.length > 0 || !!video}
            style={{ padding: 10, margin: -10, marginLeft: 8 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
          <Film
            size={24}
            color={
              images.length > 0 || !!video
                ? isDark ? "#3A3A3C" : "#D1D5DB"
                : "#14B8A6"
            }
          />
          </TouchableOpacity>

          <View className="flex-1" />
          <Text variant="caption" className="text-content-tertiary dark:text-ink-dark-faint">
            {content.length} / 5000
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}