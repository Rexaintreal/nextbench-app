import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { uploadPostImageMobile } from "@/lib/storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Upload, X, Check, Plus, BarChart3, Trash2 } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  Switch,
} from "react-native";
import { getFirestore, collection, addDoc, serverTimestamp, Timestamp } from '@react-native-firebase/firestore';
import { SafeAreaView } from "react-native-safe-area-context";
import { AppAlert } from '@/components/ui/AppAlert';

const CATEGORIES = ['Books', 'Electronics', 'Stationery', 'Sports', 'Clothing', 'Other'];
const CONDITIONS = ['Like New', 'Good', 'Fair', 'Used'];

// How long a poll stays open (options in hours)
const POLL_DURATIONS = [
  { label: '1 day', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
];

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

  // ── Poll state ─────────────────────────────────────
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollChoices, setPollChoices] = useState<string[]>(['', '']);
  const [pollDurationIdx, setPollDurationIdx] = useState(0); // index into POLL_DURATIONS

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

    if (pollEnabled && !isPollValid()) {
      AppAlert.alert("Poll incomplete", "Please fill in at least 2 poll choices");
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrls = await Promise.all(
        images.map(uri => uploadPostImageMobile(uri))
      );

      // Build poll object if enabled
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

      const payload: Record<string, any> = {
        title: title.trim(),
        price: Number(price),
        condition,
        category,
        image: imageUrls[0],
        images: imageUrls,
        description,
        meetupAvailable: true,
        deliveryAvailable: false,
        tags: [],
        sellerId: user.uid,
        sellerName: userData.name || 'Unknown',
        sellerSchool: userData.school || 'Unknown',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (pollPayload) payload.poll = pollPayload;

      const db = getFirestore();
      await addDoc(collection(db, 'products'), payload);

      AppAlert.alert("Success", "Your listing has been submitted for review!");
      setTitle("");
      setPrice("");
      setDescription("");
      setImages([]);
      setPollEnabled(false);
      setPollChoices(['', '']);
      router.push("/(tabs)");
    } catch (error) {
      console.error("Error creating listing", error);
      AppAlert.alert("Error", "Failed to create listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Theme helpers ──────────────────────────────────
  const teal = isDark ? '#2DD4BF' : '#14B8A6';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const labelColor = isDark ? '#A1A1AA' : '#71717A';
  const textColor = isDark ? '#E4E4E7' : '#111827';

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="px-5 py-3 border-b border-surface-soft dark:border-surface-dark-secondary">
        <Text variant="h2" className="text-[22px]">
          List Your Item
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 120 }}>

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
            className="bg-surface-soft dark:bg-surface-dark-secondary rounded-xl px-4 py-3 text-[16px] text-content dark:text-content-dark"
            placeholderTextColor="#8E8E93"
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
            className="bg-surface-soft dark:bg-surface-dark-secondary rounded-xl px-4 py-3 text-[16px] text-content dark:text-content-dark"
            placeholderTextColor="#8E8E93"
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
                    <Check size={13} color="#000" />
                  </View>
                )}
                <Text variant="caption" className={`text-[13px] font-sans-medium ${
                  category === cat ? 'text-white' : 'text-content-secondary'
                }`}>
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
                <Text variant="caption" className={`text-[13px] font-sans-medium ${
                  condition === cond ? 'text-white' : 'text-content-secondary'
                }`}>
                  {cond}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
            className="bg-surface-soft dark:bg-surface-dark-secondary rounded-xl px-4 py-3 text-[16px] text-content dark:text-content-dark h-24"
            textAlignVertical="top"
            placeholderTextColor="#8E8E93"
          />
        </View>

        {/* ── Poll section ────────────────────────────── */}
        <View
          style={{
            marginBottom: 24,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: pollEnabled ? teal + '40' : borderColor,
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
                <Text
                  style={{ color: pollEnabled ? teal : textColor, fontWeight: '600', fontSize: 15 }}
                >
                  Add a Poll
                </Text>
                <Text style={{ color: labelColor, fontSize: 12, marginTop: 1 }}>
                  Let buyers vote on something
                </Text>
              </View>
            </View>
            <Switch
              value={pollEnabled}
              onValueChange={setPollEnabled}
              trackColor={{ false: borderColor, true: teal + '80' }}
              thumbColor={pollEnabled ? teal : (isDark ? '#52525B' : '#D4D4D8')}
            />
          </View>

          {/* Poll options (shown when enabled) */}
          {pollEnabled && (
            <View style={{ padding: 16, gap: 10 }}>
              {/* Question choices */}
              {pollChoices.map((choice, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1.5,
                      borderColor: borderColor,
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
                      color: textColor,
                      borderWidth: 1,
                      borderColor: choice.trim() ? teal + '60' : borderColor,
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

              {/* Add option button */}
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
                          borderColor: active ? teal : borderColor,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: active ? '#fff' : labelColor,
                          }}
                        >
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
            <Text variant="label" className="text-white font-sans-semibold">
              Submit Listing
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
