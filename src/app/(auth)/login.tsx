import React, { useState } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { fetchDocument } from "@/services/firebase/firestore";
import { getAuthErrorMessage } from "@/utils/firebaseErrors";

export default function LoginScreen() {
  const { signInWithGoogle, signOut } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      
      // Check if this Google account has a registered Nextbench profile
      const userDoc = await fetchDocument("users", user.uid);
      
      if (!userDoc) {
        // No account — sign them out and tell them to sign up
        await signOut();
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      
      // On success and doc exists, AuthProvider will automatically update userData
      // and _layout.tsx will redirect to /(tabs)
    } catch (e: any) {
      if (e.code === "SIGN_IN_CANCELLED") {
        console.log("User cancelled sign in");
      } else {
        setError(getAuthErrorMessage(e));
      }
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="flex-1 items-center justify-center px-6">
        <View className="mb-12 items-center justify-center rounded-full bg-brand-teal/10 px-4 py-2">
          <Text variant="caption" className="text-brand-teal uppercase tracking-widest font-bold">
            Secured Portal
          </Text>
        </View>

        <Text variant="h1" className="mb-2 text-center text-4xl font-sans-medium">
          Welcome <Text variant="h1" className="italic text-brand-teal text-4xl">Back</Text>.
        </Text>
        <Text variant="caption" className="mb-12 text-center text-brand-teal/50 uppercase tracking-widest font-bold">
          Access your verified campus dashboard.
        </Text>

        {error ? (
          <View className="mb-6 w-full rounded-sm bg-error/10 p-4 border border-error/20">
            <Text variant="caption" className="text-center text-error uppercase tracking-widest font-bold">
              {error}
            </Text>
          </View>
        ) : null}
        
        {notFound && (
          <View className="mb-8 w-full p-6 bg-brand-pink/5 border border-brand-pink/20 rounded-2xl items-center">
            <Text variant="label" className="mb-2 text-content font-bold">No account found</Text>
            <Text variant="caption" className="text-center mb-5 leading-5 text-content-secondary">
              This Google account isn't registered on Nextbench yet.
              Create your verified student account to get started.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup")}
              className="w-full bg-brand-pink items-center justify-center py-4 rounded-xl shadow-lg shadow-brand-pink/10"
            >
              <Text variant="caption" className="text-white uppercase tracking-widest font-bold">
                Create Account →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          onPress={handleGoogleSignIn}
          disabled={isLoading}
          activeOpacity={0.8}
          className="flex-row items-center justify-center w-full rounded-sm bg-content px-6 py-5 shadow-xl shadow-content/10"
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text variant="caption" className="text-white uppercase tracking-[0.2em] font-bold">
              Authenticate Identity with Google
            </Text>
          )}
        </TouchableOpacity>
        
        <View className="mt-16 pt-10 border-t border-brand-teal/5 w-full flex-row justify-center items-center">
          <Text variant="caption" className="uppercase tracking-widest text-brand-teal/40 font-bold mr-1">
            New to Nextbench?
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text variant="caption" className="uppercase tracking-widest text-brand-pink font-bold">
              Create Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
