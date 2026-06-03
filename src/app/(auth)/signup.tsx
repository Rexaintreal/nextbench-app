import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { fetchCollection, fetchDocument, setDocument } from "@/services/firebase/firestore";
import { getAuthErrorMessage } from "@/utils/firebaseErrors";

const FALLBACK_SCHOOLS = [
  "Loreto Convent",
  "La Martinière College",
  "CMS Gomtinagar - 1",
  "La Martinière Girls' College",
  "CMS Cambridge",
  "St. Francis Lucknow",
  "Seth M.R. Jaipuria School",
  "Delhi Public School Jankipuram"
];

export default function SignupScreen() {
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  
  const [schools, setSchools] = useState<{name: string; city: string}[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSchoolModalVisible, setSchoolModalVisible] = useState(false);

  useEffect(() => {
    async function loadSchools() {
      try {
        const fetched = await fetchCollection<{name: string, city: string}>("schools");
        if (fetched.length > 0) {
          setSchools(fetched.sort((a, b) => a.name.localeCompare(b.name)));
        } else {
          setSchools(FALLBACK_SCHOOLS.map(s => ({ name: s, city: "Lucknow" })).sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (e) {
        setSchools(FALLBACK_SCHOOLS.map(s => ({ name: s, city: "Lucknow" })).sort((a, b) => a.name.localeCompare(b.name)));
      }
    }
    loadSchools();
  }, []);

  const handleSignup = async () => {
    if (!selectedSchool) {
      setError("Please select your school.");
      return;
    }
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      
      const userDoc = await fetchDocument("users", user.uid);
      
      if (!userDoc) {
        const schoolData = schools.find(s => s.name === selectedSchool);
        
        await setDocument("users", user.uid, {
          name: user.displayName || 'Unknown Student',
          email: user.email || '',
          school: selectedSchool,
          city: schoolData?.city || 'Lucknow',
          verified: false,
          verificationStatus: 'pending',
          reputation: 5.0,
          isAdmin: false,
          profilePicture: user.photoURL || null,
          idCardUrl: null,
          selfieUrl: null,
          about: null
        });
      }
      
      // onAuthStateChanged in AuthProvider will detect the new doc and trigger redirect
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <View className="mb-12 items-center justify-center rounded-full bg-brand-mint/20 px-4 py-2 self-center">
          <Text variant="caption" className="text-brand-teal uppercase tracking-widest font-bold">
            Registration
          </Text>
        </View>

        <Text variant="h1" className="mb-2 text-center text-4xl font-sans-medium">
          Join the <Text variant="h1" className="italic text-brand-pink-soft text-4xl">Network</Text>.
        </Text>
        <Text variant="caption" className="mb-12 text-center text-brand-teal/50 uppercase tracking-widest font-bold">
          Mandatory verification for all members.
        </Text>

        {error ? (
          <View className="mb-6 w-full rounded-sm bg-error/10 p-4 border border-error/20">
            <Text variant="caption" className="text-center text-error uppercase tracking-widest font-bold">
              {error}
            </Text>
          </View>
        ) : null}

        {/* School Selection */}
        <View className="mb-6">
          <Text variant="caption" className="uppercase tracking-widest text-brand-teal/40 font-bold mb-2 ml-1">
            School / Institute
          </Text>
          <TouchableOpacity 
            onPress={() => setSchoolModalVisible(true)}
            className="w-full bg-surface-card border border-brand-teal/10 rounded-sm py-4 px-6 shadow-sm"
          >
            <Text variant="label" className={selectedSchool ? "text-content" : "text-content-secondary"}>
              {selectedSchool ? selectedSchool : "Select Campus"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms Agreement */}
        <TouchableOpacity 
          className="flex-row items-start mb-8 pr-4"
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          activeOpacity={0.8}
        >
          <View className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 mt-1 ${
            agreedToTerms ? 'bg-brand-teal border-brand-teal' : 'bg-surface-card border-content-secondary/20'
          }`}>
            {agreedToTerms && <View className="w-2.5 h-2.5 bg-white rounded-sm" />}
          </View>
          <Text variant="caption" className="text-content-secondary leading-5">
            I agree to Nextbench's Terms of Service and Privacy Policy. I confirm I am a currently enrolled student.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSignup}
          disabled={!agreedToTerms || isLoading}
          activeOpacity={0.8}
          className={`flex-row items-center justify-center w-full rounded-sm py-5 shadow-xl ${
            agreedToTerms && !isLoading ? "bg-brand-pink shadow-brand-pink/10" : "bg-brand-pink/50 shadow-none"
          }`}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text variant="caption" className="text-white uppercase tracking-[0.2em] font-bold">
              Initialize Verification with Google
            </Text>
          )}
        </TouchableOpacity>

        <View className="mt-16 pt-10 border-t border-content-secondary/10 w-full flex-row justify-center items-center">
          <Text variant="caption" className="uppercase tracking-widest text-brand-teal/40 font-bold mr-1">
            Already a member?
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text variant="caption" className="uppercase tracking-widest text-brand-teal font-bold">
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* School Picker Modal */}
      <Modal visible={isSchoolModalVisible} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-surface h-[60%] rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text variant="h3">Select Campus</Text>
              <TouchableOpacity onPress={() => setSchoolModalVisible(false)}>
                <Text variant="label" className="text-brand-teal">Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {schools.map(s => (
                <TouchableOpacity 
                  key={s.name}
                  onPress={() => {
                    setSelectedSchool(s.name);
                    setSchoolModalVisible(false);
                  }}
                  className="py-4 border-b border-content-secondary/10"
                >
                  <Text variant="body" className="font-sans-medium">{s.name}</Text>
                  <Text variant="caption" className="text-content-secondary mt-1">{s.city}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
