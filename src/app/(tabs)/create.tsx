import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Upload, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, ScrollView, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateScreen() {
  const router = useRouter();
  const { user, userData } = useAuth();

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

  const uploadImage = async (uri: string, uid: string) => {
    const filename = uri.substring(uri.lastIndexOf('/') + 1);
    const extension = filename.split('.').pop();
    const name = filename.split('.').slice(0, -1).join('.');
    const timestamp = Date.now();
    const newFilename = `${name}-${timestamp}.${extension}`;
    const storagePath = `products/${uid}/${newFilename}`;

    const reference = storage().ref(storagePath);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const handleSubmit = async () => {
    if (!user || !userData) {
      alert("You must be logged in to create a listing");
      return;
    }

    if (!title.trim() || !price || images.length === 0) {
      alert("Please fill in title, price, and add at least one image");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images
      const imageUrls = await Promise.all(
        images.map(uri => uploadImage(uri, user.uid))
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
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('products').add(payload);

      alert("Listing submitted successfully!");
      setTitle("");
      setPrice("");
      setDescription("");
      setImages([]);
      router.push("/(tabs)"); // Go back to Home
    } catch (error) {
      console.error("Error creating listing", error);
      alert("Failed to create listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark" edges={['top']}>
      <View className="px-5 py-4 border-b border-brand-teal/5 bg-surface/90">
        <Text variant="h2" className="text-2xl font-serif-medium text-brand-teal">
          List Your Asset
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Images */}
        <View className="mb-6">
          <Text variant="label" className="font-bold text-content-secondary uppercase tracking-widest text-[10px] mb-2">
            Images ({images.length}/5)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {images.map((uri, idx) => (
              <View key={idx} className="w-24 h-24 mr-3 rounded-xl overflow-hidden relative">
                <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/50 p-1 rounded-full"
                >
                  <X size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity
                onPress={pickImages}
                className="w-24 h-24 rounded-xl border border-dashed border-content-secondary/30 items-center justify-center bg-surface-base"
              >
                <Upload size={24} color="#8E8E93" />
                <Text variant="caption" className="mt-1 text-content-secondary text-[10px]">Add</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Title */}
        <View className="mb-4">
          <Text variant="label" className="font-bold text-content-secondary uppercase tracking-widest text-[10px] mb-1">
            Item Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., HC Verma Vol 1"
            className="bg-surface-base border border-brand-teal/5 rounded-xl px-4 py-3 font-medium text-content"
            placeholderTextColor="#8E8E93"
          />
        </View>

        {/* Price */}
        <View className="mb-4">
          <Text variant="label" className="font-bold text-content-secondary uppercase tracking-widest text-[10px] mb-1">
            Price (₹)
          </Text>
          <TextInput
            value={price}
            onChangeText={setPrice}
            placeholder="500"
            keyboardType="numeric"
            className="bg-surface-base border border-brand-teal/5 rounded-xl px-4 py-3 font-medium text-content"
            placeholderTextColor="#8E8E93"
          />
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text variant="label" className="font-bold text-content-secondary uppercase tracking-widest text-[10px] mb-1">
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the condition, history..."
            multiline
            numberOfLines={4}
            className="bg-surface-base border border-brand-teal/5 rounded-xl px-4 py-3 font-medium text-content h-24"
            textAlignVertical="top"
            placeholderTextColor="#8E8E93"
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="bg-brand-teal w-full py-4 rounded-xl items-center flex-row justify-center shadow-lg shadow-brand-teal/20"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text variant="label" className="text-white font-bold uppercase tracking-[0.2em]">
              Submit Listing
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
