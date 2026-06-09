import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { uploadPostImageMobile } from "@/lib/storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Upload, X, Check } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, ScrollView, TextInput, TouchableOpacity, View, useColorScheme } from "react-native";
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
  //easter egg - so u actually see code rather than just vibecoding huhu
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
      // Upload images
      const imageUrls = await Promise.all(
        images.map(uri => uploadPostImageMobile(uri))
      );

      const payload = {
        title: title.trim(),
        price: Number(price),
        condition,
        category,
        image: imageUrls[0], // primary
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

      const db = getFirestore();
      await addDoc(collection(db, 'products'), payload);

      AppAlert.alert("Success", "Your listing has been submitted for review!");
      setTitle("");
      setPrice("");
      setDescription("");
      setImages([]);
      router.push("/(tabs)"); // Go back to Home
    } catch (error) {
      console.error("Error creating listing", error);
      AppAlert.alert("Error", "Failed to create listing. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="px-5 py-3 border-b border-surface-soft dark:border-surface-dark-secondary">
        <Text variant="h2" className="text-[22px]">
          List Your Item
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Images */}
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

        {/* Title */}
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

        {/* Price */}
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

        {/* Category Pills */}
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

        {/* Condition Pills */}
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

        {/* Description */}
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
