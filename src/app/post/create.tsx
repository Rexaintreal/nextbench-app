/**
 * Post Composer Screen
 */

import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { X, ImagePlus, ChevronDown } from "lucide-react-native";
import { getFirestore, collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { uploadPostImageMobile } from "@/lib/storage";
import { AppAlert } from '@/components/ui/AppAlert';


const POST_TYPES = [
  { value: "info",       label: "School Info" },
  { value: "notes",      label: "Notes" },
  { value: "event",      label: "Interschool Event" },
  { value: "confession", label: "Anonymous Post" },
  { value: "others",     label: "Others" },
] as const;

export default function PostCreateScreen() {
  const { user, userData } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<string>("others");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  // Theme-aware colours used in JS style props (can't use className on TextInput bg)
  const inputBg        = isDark ? "#2C2C2E" : "#F5F5F7";
  const inputText      = isDark ? "#F5F5F7" : "#1A1A1C";
  const placeholderClr = isDark ? "#636366" : "#9CA3AF";
  const borderClr      = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!content.trim()) { AppAlert.alert("Please write something before posting."); return; }
    if (!user || !userData) { AppAlert.alert("You must be logged in to post."); return; }

    setIsSubmitting(true);
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await Promise.all(
        images.map((uri) => uploadPostImageMobile(uri))
        );
      }

      const payload: any = {
        title: title.trim() || "Untitled",
        content: content.trim(),
        type,
        isAnonymous: type === "confession" ? isAnonymous : false,
        authorId: user.uid,
        authorName: userData.name || "Unknown",
        authorProfilePicture: userData.profilePicture || null,
        school: userData.school || "Unknown",
        city: userData.city || null,
        imageUrl: imageUrls[0] || null,
        imageUrls,
        upvotesCount: 0,
        repliesCount: 0,
        status: "approved",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(getFirestore(), "posts"), payload);
      router.back();
    } catch (error) {
      console.error("Error creating post:", error);
      AppAlert.alert("Failed to create post. Please try again.");
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
            <X size={24} color={isDark ? "#8E8E93" : "#8E8E93"} />
          </TouchableOpacity>

          <Text variant="h4" className="dark:text-ink-dark">New Post</Text>

          {/* Post button — explicit colours so it's visible in both modes */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: canSubmit
                ? "#14B8A6"
                : isDark ? "#2C2C2E" : "#E5E5EA",
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text
                variant="label"
                style={{
                  fontSize: 13,
                  color: canSubmit
                    ? "#FFFFFF"
                    : isDark ? "#636366" : "#9CA3AF",
                }}
              >
                Post
              </Text>
            )}
          </TouchableOpacity>
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
        </ScrollView>

        {/* ── Bottom toolbar ── */}
        <View
          className="flex-row items-center px-5 py-3"
          style={{ borderTopWidth: 1, borderTopColor: borderClr }}
        >
          <TouchableOpacity onPress={pickImage} disabled={images.length >= 4} className="mr-4">
            <ImagePlus size={24} color={images.length >= 4 ? (isDark ? "#3A3A3C" : "#D1D5DB") : "#14B8A6"} />
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