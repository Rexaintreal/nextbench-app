/**
 * Edit Profile Screen
 *
 * Allows users to update their name, username, about, city,
 * and profile picture.
 */

import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { ArrowLeft, Camera } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import firestore from "@react-native-firebase/firestore";
import { uploadToCloudinary } from "@/lib/storage";

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  maxLength,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  editable?: boolean;
}) {
  return (
    <View className="mb-6">
      <Text
        variant="caption"
        className="uppercase tracking-widest text-content-secondary mb-2"
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        editable={editable}
        multiline={multiline}
        maxLength={maxLength}
        className={`px-4 py-3 rounded-xl border border-content-secondary/15 text-[16px] text-content bg-surface-soft dark:bg-surface-dark-secondary ${
          multiline ? "min-h-[100px]" : ""
        } ${!editable ? "opacity-50" : ""}`}
        style={multiline ? { textAlignVertical: "top" } : undefined}
      />
      {maxLength && (
        <Text variant="caption" className="text-content-tertiary mt-1 text-right">
          {value.length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

export default function EditProfileScreen() {
  const { user, userData } = useAuth();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#FFFFFF" : "#1D1D1F";

  const [name, setName] = useState(userData?.name || "");
  const [username, setUsername] = useState(userData?.username || "");
  const [about, setAbout] = useState(userData?.about || "");
  const [city, setCity] = useState(userData?.city || "");
  const [profileImage, setProfileImage] = useState<string | null>(
    userData?.profilePicture || null
  );
  const [newImageUri, setNewImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewImageUri(result.assets[0].uri);
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      let profilePictureUrl = userData?.profilePicture || null;

      // Upload new profile picture if changed
      if (newImageUri) {
        profilePictureUrl = await uploadToCloudinary(
          newImageUri,
          "nextbench/profiles"
        );
      }

      await firestore()
        .collection("users")
        .doc(user.uid)
        .update({
          name: name.trim(),
          username: username.trim() || null,
          about: about.trim() || null,
          city: city.trim() || null,
          profilePicture: profilePictureUrl,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert("Saved", "Your profile has been updated.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error("Save profile error:", err);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const avatarText = name?.[0]?.toUpperCase() || "?";

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
            <ArrowLeft size={24} color={iconColor} />
          </TouchableOpacity>
          <Text variant="h4">Edit Profile</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`px-5 py-2 rounded-full ${
              saving ? "bg-content-secondary/20" : "bg-brand-teal"
            }`}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text variant="label" className="text-white text-[13px]">
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Picture */}
          <View className="items-center mb-8">
            <TouchableOpacity
              onPress={pickProfileImage}
              activeOpacity={0.8}
              className="relative"
            >
              <View className="w-24 h-24 rounded-full bg-brand-teal/10 items-center justify-center overflow-hidden">
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    className="w-full h-full"
                  />
                ) : (
                  <Text variant="h2" className="text-brand-teal">
                    {avatarText}
                  </Text>
                )}
              </View>
              <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-teal items-center justify-center border-2 border-surface dark:border-surface-dark">
                <Camera size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text
              variant="caption"
              className="text-content-secondary mt-3"
            >
              Tap to change photo
            </Text>
          </View>

          {/* Fields */}
          <Field
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            maxLength={50}
          />

          <Field
            label="Username"
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
            placeholder="your_username"
            maxLength={30}
          />

          <Field
            label="About"
            value={about}
            onChangeText={setAbout}
            placeholder="Tell us about yourself..."
            multiline
            maxLength={300}
          />

          <Field
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="Your city"
            maxLength={50}
          />

          {/* Read-only fields */}
          <Field
            label="Email"
            value={userData?.email || ""}
            onChangeText={() => {}}
            editable={false}
          />

          <Field
            label="School"
            value={userData?.school || ""}
            onChangeText={() => {}}
            editable={false}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
