/**
 * Post Composer Screen
 *
 * Clean, full-screen modal for creating a new post.
 * Matches the web's post creation flow.
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { X, ImagePlus, ChevronDown } from "lucide-react-native";
import firestore from "@react-native-firebase/firestore";
import { uploadToCloudinary } from "@/lib/storage";

const POST_TYPES = ["general", "confession", "question", "review", "event"] as const;

export default function PostCreateScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<string>("general");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

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
    if (!content.trim()) {
      alert("Please write something before posting.");
      return;
    }
    if (!user || !userData) {
      alert("You must be logged in to post.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await Promise.all(
          images.map((uri) => uploadToCloudinary(uri, "nextbench/posts"))
        );
      }

      const payload: any = {
        title: title.trim() || null,
        content: content.trim(),
        type,
        isAnonymous: type === "confession" ? isAnonymous : false,
        authorId: user.uid,
        authorName: userData.name || "Unknown",
        authorProfilePicture: userData.profilePicture || null,
        school: userData.school || "Unknown",
        city: userData.city || null,
        imageUrl: imageUrls[0] || null,
        imageUrls: imageUrls,
        upvotesCount: 0,
        repliesCount: 0,
        status: "approved",
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection("posts").add(payload);

      router.back();
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = content.trim().length > 0 && !isSubmitting;

  return (
    <SafeAreaView
      className="flex-1 bg-surface dark:bg-surface-dark"
      edges={["top"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-content-secondary/10">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#8E8E93" />
          </TouchableOpacity>
          <Text variant="h4">New Post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            className={`px-5 py-2 rounded-full ${
              canSubmit ? "bg-brand-teal" : "bg-content-secondary/20"
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text
                variant="label"
                className={`text-[13px] ${
                  canSubmit ? "text-white" : "text-content-tertiary"
                }`}
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
          {/* Author Row */}
          <View className="flex-row items-center mb-5">
            <View className="w-10 h-10 rounded-full bg-brand-teal/10 items-center justify-center mr-3 overflow-hidden">
              {userData?.profilePicture ? (
                <Image
                  source={{ uri: userData.profilePicture }}
                  className="w-full h-full"
                />
              ) : (
                <Text variant="label" className="text-brand-teal">
                  {userData?.name?.[0]?.toUpperCase() || "?"}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text variant="label">{userData?.name || "You"}</Text>
              <Text variant="caption" className="text-content-secondary">
                {userData?.school || ""}
              </Text>
            </View>
          </View>

          {/* Type Selector */}
          <TouchableOpacity
            onPress={() => setShowTypeMenu(!showTypeMenu)}
            className="flex-row items-center mb-5 self-start px-3 py-1.5 rounded-full border border-content-secondary/20"
          >
            <Text variant="caption" className="capitalize text-content-secondary mr-1">
              {type}
            </Text>
            <ChevronDown size={14} color="#8E8E93" />
          </TouchableOpacity>

          {showTypeMenu && (
            <View className="mb-5 bg-surface-soft rounded-xl overflow-hidden border border-content-secondary/10">
              {POST_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => {
                    setType(t);
                    setShowTypeMenu(false);
                    if (t === "confession") setIsAnonymous(true);
                    else setIsAnonymous(false);
                  }}
                  className={`px-4 py-3 border-b border-content-secondary/5 ${
                    type === t ? "bg-brand-teal/5" : ""
                  }`}
                >
                  <Text
                    variant="label"
                    className={`capitalize ${
                      type === t ? "text-brand-teal" : "text-content-secondary"
                    }`}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Anonymous toggle for confessions */}
          {type === "confession" && (
            <TouchableOpacity
              onPress={() => setIsAnonymous(!isAnonymous)}
              className="flex-row items-center mb-5"
            >
              <View
                className={`w-5 h-5 rounded border mr-2 items-center justify-center ${
                  isAnonymous
                    ? "bg-brand-teal border-brand-teal"
                    : "border-content-secondary/30"
                }`}
              >
                {isAnonymous && (
                  <Text variant="caption" className="text-white text-[10px]">
                    ✓
                  </Text>
                )}
              </View>
              <Text variant="label" className="text-content-secondary">
                Post anonymously
              </Text>
            </TouchableOpacity>
          )}

          {/* Title (Optional) */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title (optional)"
            placeholderTextColor="#9CA3AF"
            className="text-[20px] font-sans-medium text-content mb-3"
            style={{ lineHeight: 28 }}
          />

          {/* Content */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind?"
            placeholderTextColor="#9CA3AF"
            multiline
            className="text-[17px] font-sans text-content min-h-[200px]"
            style={{ lineHeight: 26, textAlignVertical: "top" }}
            autoFocus
          />

          {/* Image previews */}
          {images.length > 0 && (
            <View className="flex-row flex-wrap gap-3 mt-5">
              {images.map((uri, idx) => (
                <View
                  key={idx}
                  className="w-24 h-24 rounded-xl overflow-hidden relative"
                >
                  <Image
                    source={{ uri }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
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

        {/* Bottom toolbar */}
        <View className="flex-row items-center px-5 py-3 border-t border-content-secondary/10">
          <TouchableOpacity
            onPress={pickImage}
            disabled={images.length >= 4}
            className="mr-4"
          >
            <ImagePlus
              size={24}
              color={images.length >= 4 ? "#D1D5DB" : "#14B8A6"}
            />
          </TouchableOpacity>
          <View className="flex-1" />
          <Text variant="caption" className="text-content-tertiary">
            {content.length} / 5000
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
