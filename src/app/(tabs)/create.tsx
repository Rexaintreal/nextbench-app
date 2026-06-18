import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { uploadPostImageMobile } from "@/lib/storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Upload, X, Check, Tag, MapPin, Truck } from "lucide-react-native";
import { useState, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { getFirestore, collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { SafeAreaView } from "react-native-safe-area-context";
import { AppAlert } from '@/components/ui/AppAlert';

const CATEGORIES = ['Books', 'Electronics', 'Stationery', 'Sports', 'Clothing', 'Other'];
const CONDITIONS = ['Like New', 'Good', 'Fair', 'Used'];

export default function CreateScreen() {
  const { user, userData } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Books");
  const [condition, setCondition] = useState("Like New");
  const [images, setImages] = useState<string[]>([]);
  const [meetupAvailable, setMeetupAvailable] = useState(true);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  // ── Tags state ─────────────────────────────────────
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<TextInput>(null);

  const addTag = (raw: string) => {
    const newTag = raw.trim().toLowerCase();
    if (!newTag) return;
    setTags(prev => {
      if (prev.includes(newTag)) return prev;
      if (prev.length >= 10) {
        AppAlert.alert("Tag limit", "You can add a maximum of 10 tags.");
        return prev;
      }
      return [...prev, newTag];
    });
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  // ── Image picking ──────────────────────────────────
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // ── Submit ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user || !userData) {
      AppAlert.alert("Error", "You must be logged in to create a listing");
      return;
    }
    if (!title.trim() || !price || images.length === 0) {
      AppAlert.alert("Missing Info", "Please fill in title, price, and add at least one image");
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls = await Promise.all(
        images.map(uri => uploadPostImageMobile(uri))
      );

      const payload: Record<string, any> = {
        title: title.trim(),
        price: Number(price),
        condition,
        category,
        image: imageUrls[0],
        images: imageUrls,
        description,
        meetupAvailable,
        deliveryAvailable,
        tags,                         // ← real tags array, no longer hardcoded []
        sellerId: user.uid,
        sellerName: userData.name || 'Unknown',
        sellerSchool: userData.school || 'Unknown',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const db = getFirestore();
      await addDoc(collection(db, 'products'), payload);

      AppAlert.alert("Success", "Your listing has been submitted for review!");
      setTitle("");
      setPrice("");
      setDescription("");
      setImages([]);
      setTags([]);
      setMeetupAvailable(true);
      setDeliveryAvailable(false);
      router.push("/(tabs)");
    } catch (error) {
      console.error("Error creating listing", error);
      AppAlert.alert("Error", "Failed to create listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Theme helpers ──────────────────────────────────
  const teal         = isDark ? '#2DD4BF' : '#14B8A6';
  const inputBg      = isDark ? '#2C2C2E' : '#F5F5F7';
  const inputText    = isDark ? '#F5F5F7' : '#1A1A1C';
  const placeholderClr = isDark ? '#636366' : '#9CA3AF';
  const borderClr    = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const chipUnselectedClr = isDark ? '#D1D5DB' : '#374151';

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="px-5 py-3 border-b border-surface-soft dark:border-surface-dark-secondary">
        <Text variant="h2" className="text-[22px]">
          List Your Item
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Images ─────────────────────────────────── */}
        <View className="mb-5">
          <Text variant="caption" className="text-content-tertiary font-sans-semibold uppercase tracking-widest text-[11px] mb-2">
            Photos ({images.length}/5)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {images.map((uri, idx) => (
              <View key={idx} className="w-[80px] h-[80px] mr-2.5 rounded-xl overflow-hidden relative">
                <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => removeImage(idx)}
                  className="absolute top-1.5 right-1.5 bg-black/60 p-1 rounded-full"
                >
                  <X size={11} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                onPress={pickImages}
                className="w-[80px] h-[80px] rounded-xl border border-dashed items-center justify-center bg-surface-soft dark:bg-surface-dark-secondary"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}
              >
                <Upload size={20} color="#8E8E93" />
                <Text variant="caption" className="mt-1 text-content-tertiary text-[10px]">Add</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* ── Title ──────────────────────────────────── */}
        <View className="mb-4">
          <Text variant="caption" className="text-content-tertiary font-sans-semibold uppercase tracking-widest text-[11px] mb-1.5">
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., HC Verma Vol 1"
            style={{ backgroundColor: inputBg, color: inputText }}
            className="rounded-xl px-4 py-3 text-[16px]"
            placeholderTextColor={placeholderClr}
          />
        </View>

        {/* ── Price ──────────────────────────────────── */}
        <View className="mb-4">
          <Text variant="caption" className="text-content-tertiary font-sans-semibold uppercase tracking-widest text-[11px] mb-1.5">
            Price (₹)
          </Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="500"
            keyboardType="numeric"
            style={{ backgroundColor: inputBg, color: inputText }}
            className="rounded-xl px-4 py-3 text-[16px]"
            placeholderTextColor={placeholderClr}
          />
        </View>

        {/* ── Category ───────────────────────────────── */}
        <View className="mb-4">
          <Text variant="caption" className="text-content-tertiary font-sans-semibold uppercase tracking-widest text-[11px] mb-2">
            Category
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                className={`px-3.5 py-2 rounded-lg flex-row items-center ${
                  category === cat
                    ? 'bg-brand-teal'
                    : 'bg-surface-soft dark:bg-surface-dark-secondary'
                }`}
              >
                {category === cat && (
                  <View style={{ marginRight: 4 }}>
                    <Check size={13} color="#FFF" />
                  </View>
                )}
                <Text
                  variant="caption"
                  className="text-[13px] font-sans-medium"
                  style={{ color: category === cat ? '#FFFFFF' : chipUnselectedClr }}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Condition ──────────────────────────────── */}
        <View className="mb-4">
          <Text variant="caption" className="text-content-tertiary font-sans-semibold uppercase tracking-widest text-[11px] mb-2">
            Condition
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CONDITIONS.map(cond => (
              <TouchableOpacity
                key={cond}
                onPress={() => setCondition(cond)}
                className={`px-3.5 py-2 rounded-lg ${
                  condition === cond
                    ? 'bg-brand-teal'
                    : 'bg-surface-soft dark:bg-surface-dark-secondary'
                }`}
              >
                <Text
                  variant="caption"
                  className="text-[13px] font-sans-medium"
                  style={{ color: condition === cond ? '#FFFFFF' : chipUnselectedClr }}
                >
                  {cond}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Tags ───────────────────────────────────── */}
        <View className="mb-4">
          <Text variant="caption" className="text-content-tertiary font-sans-semibold uppercase tracking-widest text-[11px] mb-1.5">
            Tags — Optional ({tags.length}/10)
          </Text>

          {/* Tag chips + input in one box, same as web */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => tagInputRef.current?.focus()}
            style={{
              backgroundColor: inputBg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: borderClr,
              padding: 10,
              minHeight: 52,
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {/* Existing tag chips */}
            {tags.map(tag => (
              <View
                key={tag}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? 'rgba(45,212,191,0.15)' : 'rgba(20,184,166,0.1)',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  gap: 4,
                }}
              >
                <Tag size={10} color={teal} />
                <Text
                  variant="caption"
                  style={{
                    color: teal,
                    fontSize: 11,
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  {tag}
                </Text>
                <TouchableOpacity
                  onPress={() => removeTag(tag)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginLeft: 2 }}
                >
                  <X size={11} color={teal} />
                </TouchableOpacity>
              </View>
            ))}

            {tags.length < 10 && (
              <TextInput
                ref={tagInputRef}
                value={tagInput}
                placeholder={tags.length === 0 ? "Type a tag, press comma" : "Add another…"}
                placeholderTextColor={placeholderClr}
                style={{
                  flex: 1,
                  minWidth: 140,
                  fontSize: 14,
                  color: inputText,
                  paddingVertical: 4,
                  paddingHorizontal: 4,
                  backgroundColor: 'transparent',
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => addTag(tagInput)}
                blurOnSubmit={false}
                // Single handler — comma only triggers a tag, everything else just updates the field
                onChange={(e) => {
                  const val = e.nativeEvent.text;
                  if (/,$/.test(val)) {
                    val.split(/,+/).filter(Boolean).forEach(addTag);
                    setTagInput("");
                  } else {
                    setTagInput(val);
                  }
                }}
              />
            )}
          </TouchableOpacity>
          <Text
            variant="caption"
            style={{ color: placeholderClr, fontSize: 11, marginTop: 5, marginLeft: 2 }}
          >
            e.g. "physics", "jeemains", "cycle" — press comma or Enter to add
          </Text>
        </View>

        {/* ── Description ────────────────────────────── */}
        <View className="mb-6">
          <Text variant="caption" className="text-content-tertiary font-sans-semibold uppercase tracking-widest text-[11px] mb-1.5">
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the condition, history..."
            multiline
            numberOfLines={4}
            style={{ backgroundColor: inputBg, color: inputText, height: 96 }}
            className="rounded-xl px-4 py-3 text-[16px]"
            textAlignVertical="top"
            placeholderTextColor={placeholderClr}
          />
        </View>
        {/* ── Delivery Options ───────────────────────── */}
        <View className="mb-6">
          <Text variant="caption" className="text-content-tertiary font-sans-semibold uppercase tracking-widest text-[11px] mb-2">
            Delivery Options
          </Text>
          <View className="flex-row gap-3">
            {/* School Meetup */}
            <TouchableOpacity
              onPress={() => setMeetupAvailable(prev => !prev)}
              className={`flex-1 flex-row items-center gap-3 p-3.5 rounded-xl border ${
                meetupAvailable
                  ? 'border-brand-teal bg-brand-teal/5'
                  : 'border-surface-soft dark:border-surface-dark-secondary bg-surface-soft dark:bg-surface-dark-secondary'
              }`}
            >
              <View
                className={`w-9 h-9 rounded-lg items-center justify-center ${
                  meetupAvailable ? 'bg-brand-teal' : 'bg-surface dark:bg-surface-dark'
                }`}
              >
                <MapPin size={16} color={meetupAvailable ? '#FFF' : '#8E8E93'} />
              </View>
              <View className="flex-1">
                <Text
                  variant="caption"
                  className="text-[13px] font-sans-semibold"
                  style={{ color: inputText }}
                >
                  School Meetup
                </Text>
                <Text
                  variant="caption"
                  className="text-[9px] uppercase font-sans-semibold tracking-widest"
                  style={{ color: placeholderClr }}
                >
                  Official points
                </Text>
              </View>
            </TouchableOpacity>

            {/* Local Delivery */}
            <TouchableOpacity
              onPress={() => setDeliveryAvailable(prev => !prev)}
              className={`flex-1 flex-row items-center gap-3 p-3.5 rounded-xl border ${
                deliveryAvailable
                  ? 'border-brand-pink bg-brand-pink/5'
                  : 'border-surface-soft dark:border-surface-dark-secondary bg-surface-soft dark:bg-surface-dark-secondary'
              }`}
            >
              <View
                className={`w-9 h-9 rounded-lg items-center justify-center ${
                  deliveryAvailable ? 'bg-brand-pink' : 'bg-surface dark:bg-surface-dark'
                }`}
              >
                <Truck size={16} color={deliveryAvailable ? '#FFF' : '#8E8E93'} />
              </View>
              <View className="flex-1">
                <Text
                  variant="caption"
                  className="text-[13px] font-sans-semibold"
                  style={{ color: inputText }}
                >
                  Local Delivery
                </Text>
                <Text
                  variant="caption"
                  className="text-[9px] uppercase font-sans-semibold tracking-widest"
                  style={{ color: placeholderClr }}
                >
                  Porter / Instamart
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        {/* ── Submit ─────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="bg-brand-teal w-full py-4 rounded-xl items-center flex-row justify-center"
          style={{
            shadowColor: '#14B8A6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
          }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text variant="label" className="font-sans-semibold" style={{ color: '#FFFFFF' }}>
              Submit Listing
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
