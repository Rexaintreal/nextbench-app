/**
 * Signup Screen
 *
 * Step 1 (details) → school picker + full name + email + terms → sendOtp()
 * Step 2 (otp)     → 6-digit code → verifyOtpAndSignup()
 *                  → Cloud Function creates the user doc server-side
 *                  → AuthProvider detects sign-in → _layout.tsx navigates
 *
 * Google sign-in kept as an alternative path (creates Firestore doc client-side,
 * same as the original app).
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import {
  fetchCollection,
  fetchDocument,
  setDocument,
} from "@/services/firebase/firestore";
import { getAuthErrorMessage } from "@/utils/firebaseErrors";
import {
  Mail,
  User,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  RotateCcw,
  ChevronDown,
} from "lucide-react-native";

const FALLBACK_SCHOOLS = [
  "Loreto Convent",
  "La Martinière College",
  "CMS Gomtinagar - 1",
  "La Martinière Girls' College",
  "CMS Cambridge",
  "St. Francis Lucknow",
  "Seth M.R. Jaipuria School",
  "Delhi Public School Jankipuram",
];

// ─── OTP Input ────────────────────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (i: number, text: string) => {
    if (i === 0 && text.replace(/\D/g, "").length > 1) {
      // Handle paste
      const digits = text.replace(/\D/g, "").slice(0, 6);
      onChange(digits.padEnd(6, " ").slice(0, 6));
      inputs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    const digit = text.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(6, " ").split("");
    arr[i] = digit || " ";
    onChange(arr.join("").slice(0, 6));
    if (digit && i < 5) inputs.current[i + 1]?.focus();
    if (!digit && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleKeyPress = (i: number, key: string) => {
    if (key === "Backspace" && !value[i]?.trim() && i > 0) {
      const arr = value.padEnd(6, " ").split("");
      arr[i - 1] = " ";
      onChange(arr.join(""));
      inputs.current[i - 1]?.focus();
    }
  };

  return (
    <View className="flex-row gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <TextInput
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          value={value[i]?.trim() || ""}
          onChangeText={(t) => handleChange(i, t)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={i === 0 ? 6 : 1}
          textContentType="oneTimeCode"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          className="w-10 h-12 text-center text-xl font-bold border border-content-secondary/15 rounded-xl bg-surface-card text-content shadow-sm"
          style={{
            fontSize: 20,
            fontWeight: "700",
            borderColor: value[i]?.trim() ? "#00C4B5" : undefined,
            opacity: disabled ? 0.5 : 1,
          }}
          selectionColor="#00C4B5"
        />
      ))}
    </View>
  );
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function Countdown({ seconds, onEnd }: { seconds: number; onEnd: () => void }) {
  const [left, setLeft] = useState(seconds);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    setLeft(seconds);
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) { clearInterval(id); onEndRef.current(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  return (
    <Text variant="caption" className="text-brand-teal font-bold tabular-nums">
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
    </Text>
  );
}

// ─── Signup Screen ────────────────────────────────────────────────────────────

type SignupStep = "details" | "otp";

export default function SignupScreen() {
  const { sendOtp, verifyOtpAndSignup, signInWithGoogle, signOut } = useAuth();

  // Schools
  const [schools, setSchools] = useState<{ name: string; city: string }[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [isSchoolModalVisible, setSchoolModalVisible] = useState(false);

  // Form fields
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // OTP state
  const [signupStep, setSignupStep] = useState<SignupStep>("details");
  const [otp, setOtp] = useState("      ");
  const [canResend, setCanResend] = useState(false);
  const [resendKey, setResendKey] = useState(0);

  // Loading & error
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOtpFull = otp.replace(/\s/g, "").length === 6;

  // Load schools
  useEffect(() => {
    async function loadSchools() {
      try {
        const fetched = await fetchCollection<{ name: string; city: string }>("schools");
        const list =
          fetched.length > 0
            ? fetched
            : FALLBACK_SCHOOLS.map((s) => ({ name: s, city: "Lucknow" }));
        setSchools(list.sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        setSchools(
          FALLBACK_SCHOOLS.map((s) => ({ name: s, city: "Lucknow" })).sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
      }
    }
    loadSchools();
  }, []);

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!selectedSchool) { setError("Please select your school."); return; }
    if (!nameInput.trim()) { setError("Please enter your full name."); return; }
    if (!emailInput.trim()) { setError("Please enter your email address."); return; }
    if (!agreedToTerms) { setError("Please agree to the Terms of Service and Privacy Policy."); return; }

    Keyboard.dismiss();
    setError(null);
    setIsSendingOtp(true);

    try {
      await sendOtp(emailInput);
      setOtp("      ");
      setCanResend(false);
      setResendKey((k) => k + 1);
      setSignupStep("otp");
    } catch (err: any) {
      const msg = err?.details?.message || err?.message || "Failed to send OTP.";
      setError(msg.replace("Error: ", ""));
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ── Verify OTP & Create Account ────────────────────────────────────────────
  const handleVerifyOtp = useCallback(async () => {
    if (!isOtpFull || isSigningIn) return;
    Keyboard.dismiss();
    setError(null);
    setIsSigningIn(true);

    try {
      const schoolData = schools.find((s) => s.name === selectedSchool);
      await verifyOtpAndSignup(emailInput, otp.trim(), {
        name: nameInput.trim(),
        school: selectedSchool,
        city: schoolData?.city || "Lucknow",
      });
      // AuthProvider + _layout.tsx handles navigation
    } catch (err: any) {
      const raw = err?.details?.message || err?.message || "Verification failed.";
      setError(raw.replace("Error: ", ""));
      setIsSigningIn(false);
    }
  }, [emailInput, otp, isOtpFull, isSigningIn, nameInput, selectedSchool, schools]);

  const handleOtpChange = useCallback(
    (val: string) => {
      setOtp(val);
      if (val.replace(/\s/g, "").length === 6 && !isSigningIn) {
        setTimeout(() => handleVerifyOtp(), 120);
      }
    },
    [isSigningIn, handleVerifyOtp]
  );

  // ── Google Signup ──────────────────────────────────────────────────────────
  const handleGoogleSignup = async () => {
    if (!selectedSchool) { setError("Please select your school."); return; }
    if (!agreedToTerms) { setError("Please agree to the Terms of Service and Privacy Policy."); return; }

    setError(null);
    setIsGoogleLoading(true);

    try {
      const result = await signInWithGoogle();
      const user = result.user;
      const userDoc = await fetchDocument("users", user.uid);

      if (!userDoc) {
        const schoolData = schools.find((s) => s.name === selectedSchool);
        await setDocument("users", user.uid, {
          name: user.displayName || "Unknown Student",
          email: user.email || "",
          school: selectedSchool,
          city: schoolData?.city || "Lucknow",
          verified: false,
          verificationStatus: "pending",
          reputation: 5.0,
          isAdmin: false,
          profilePicture: user.photoURL || null,
          idCardUrl: null,
          selfieUrl: null,
          about: null,
        });
      }
      // AuthProvider + _layout.tsx handles navigation
    } catch (err: any) {
      if (err?.code !== "SIGN_IN_CANCELLED") {
        setError(getAuthErrorMessage(err));
      }
      setIsGoogleLoading(false);
    }
  };

  const isLoading = isSendingOtp || isSigningIn || isGoogleLoading;

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="mb-10 items-center">
          <View className="mb-8 rounded-full bg-brand-mint/25 border border-brand-teal/30 px-4 py-2">
            <Text variant="caption" className="text-brand-teal uppercase tracking-widest font-bold" style={{ color: "#2dd4bf" }}>
              Registration
            </Text>
          </View>
          <Text variant="h1" className="text-center text-4xl font-sans-medium mb-2">
            Join the{" "}
            <Text variant="h1" className="italic text-brand-pink-soft text-4xl">
              Network
            </Text>
            .
          </Text>
          <Text variant="caption" className="text-center text-brand-teal/50 uppercase tracking-widest font-bold">
            Mandatory verification for all members.
          </Text>
        </View>

        {/* Error */}
        {error ? (
          <View className="mb-6 w-full rounded-sm bg-error/10 p-4 border border-error/20">
            <Text variant="caption" className="text-center text-error uppercase tracking-widest font-bold">
              {error === "INTERNAL"
                ? "Server Error: Could not connect to verification service"
                : error}
            </Text>
          </View>
        ) : null}

        {/* ── Step 1: Details ── */}
        {signupStep === "details" && (
          <View className="space-y-5">
            {/* School picker */}
            <View>
              <Text variant="caption" className="uppercase tracking-widest text-brand-teal/40 font-bold mb-2 ml-1 text-[10px]">
                School / Institute
              </Text>
              <TouchableOpacity
                onPress={() => setSchoolModalVisible(true)}
                className="w-full bg-surface-card border border-brand-teal/10 rounded-2xl py-4 px-6 shadow-sm flex-row items-center justify-between"
              >
                <Text
                  variant="label"
                  className={selectedSchool ? "text-content" : "text-content-secondary"}
                  style={{ color: selectedSchool ? "#1A1A1C" : "#636366" }}
                >
                  {selectedSchool || "Select Campus"}
                </Text>
                <ChevronDown color="#00C4B5" size={16} opacity={0.4} />
              </TouchableOpacity>
            </View>

            {/* Full Name */}
            <View>
              <Text variant="caption" className="uppercase tracking-widest text-brand-teal/40 font-bold mb-2 ml-1 text-[10px]">
                Full Name
              </Text>
              <View className="relative">
                <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
                  <User color="#00C4B5" size={15} opacity={0.5} />
                </View>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Jane Doe"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  autoComplete="name"
                  textContentType="name"
                  editable={!isLoading}
                  className="w-full bg-surface-card border border-content-secondary/10 rounded-2xl py-4 pl-11 pr-4 text-sm font-medium text-content shadow-sm"
                />
              </View>
            </View>

            {/* Email */}
            <View>
              <Text variant="caption" className="uppercase tracking-widest text-brand-teal/40 font-bold mb-2 ml-1 text-[10px]">
                Email Address
              </Text>
              <View className="relative">
                <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
                  <Mail color="#00C4B5" size={15} opacity={0.5} />
                </View>
                <TextInput
                  value={emailInput}
                  onChangeText={setEmailInput}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleSendOtp}
                  editable={!isLoading}
                  className="w-full bg-surface-card border border-content-secondary/10 rounded-2xl py-4 pl-11 pr-4 text-sm font-medium text-content shadow-sm"
                />
              </View>
            </View>

            {/* Terms */}
            <TouchableOpacity
              className="flex-row items-start pr-4"
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.8}
            >
              <View
                className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 mt-1 ${
                  agreedToTerms
                    ? "bg-brand-teal border-brand-teal"
                    : "bg-surface-card border-content-secondary/20"
                }`}
              >
                {agreedToTerms && (
                  <View className="w-2.5 h-2.5 bg-white rounded-sm" />
                )}
              </View>
              <Text variant="caption" className="text-content-secondary leading-5 flex-1">
                I agree to Nextbench's{" "}
                <Text variant="caption" className="text-brand-teal font-bold">
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text variant="caption" className="text-brand-teal font-bold">
                  Privacy Policy
                </Text>
                . I confirm I am a currently enrolled student.
              </Text>
            </TouchableOpacity>

            {/* Send OTP button */}
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={!agreedToTerms || isLoading || !emailInput}
              activeOpacity={0.8}
              className={`flex-row items-center justify-center w-full rounded-full py-5 shadow-xl ${
                agreedToTerms && !isLoading && emailInput
                  ? "bg-brand-pink shadow-brand-pink/10"
                  : "bg-brand-pink/50"
              }`}
            >
              {isSendingOtp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <KeyRound color="white" size={15} />
                  <Text variant="caption" className="text-white uppercase tracking-[0.2em] font-bold" style={{ color: "#FFFFFF" }}>
                    Send Verification Code
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center py-2">
              <View className="flex-1 h-px bg-content-secondary/10" />
              <Text variant="caption" className="mx-4 text-content-secondary/30 uppercase tracking-widest font-bold text-[10px]">
                Or
              </Text>
              <View className="flex-1 h-px bg-content-secondary/10" />
            </View>

            {/* Google */}
            <TouchableOpacity
              onPress={handleGoogleSignup}
              disabled={!agreedToTerms || isLoading}
              activeOpacity={0.8}
              className={`flex-row items-center justify-center w-full rounded-full border border-white/25 bg-white/5 py-5 ${
                !agreedToTerms || isLoading ? "opacity-50" : ""
              }`}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#00C4B5" />
              ) : (
                <View className="flex-row items-center gap-3">
                  <ShieldCheck color="#2dd4bf" size={16} />
                  <Text variant="caption" className="uppercase tracking-[0.2em] font-bold" style={{ color: "#F5F5F7" }}>
                    Continue with Google
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: OTP ── */}
        {signupStep === "otp" && (
          <View className="space-y-6">
            <View className="items-center mb-2">
              <View className="w-14 h-14 bg-brand-teal/10 rounded-full items-center justify-center mb-4">
                <Mail color="#00C4B5" size={24} />
              </View>
              <Text variant="body" className="text-content-secondary text-center">
                We've sent a 6-digit code to
              </Text>
              <Text variant="label" className="text-content font-bold mt-1 text-center">
                {emailInput}
              </Text>
            </View>

            <OtpInput value={otp} onChange={handleOtpChange} disabled={isSigningIn} />

            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={isSigningIn || !isOtpFull}
              activeOpacity={0.8}
              className={`flex-row items-center justify-center w-full rounded-full py-5 shadow-lg mt-2 ${
                !isSigningIn && isOtpFull ? "bg-brand-teal shadow-brand-teal/15" : "bg-brand-teal/50"
              }`}
            >
              {isSigningIn ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <ShieldCheck color="white" size={14} />
                  <Text variant="caption" className="text-white uppercase tracking-[0.2em] font-bold" style={{ color: "#FFFFFF" }}>
                    Verify & Create Account
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View className="flex-row items-center justify-between mt-2">
              <TouchableOpacity
                onPress={() => { setSignupStep("details"); setOtp("      "); setError(null); }}
                className="flex-row items-center gap-1.5"
              >
                <ArrowLeft color="rgba(0,0,0,0.4)" size={12} />
                <Text variant="caption" className="text-content-secondary/40 uppercase tracking-widest font-bold text-[10px]">
                  Change email
                </Text>
              </TouchableOpacity>

              {canResend ? (
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={isSendingOtp}
                  className="flex-row items-center gap-1.5"
                >
                  <RotateCcw color="#00C4B5" size={12} />
                  <Text variant="caption" className="text-brand-teal uppercase tracking-widest font-bold text-[10px]">
                    Resend code
                  </Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center gap-1">
                  <Text variant="caption" className="text-content-secondary/30 uppercase tracking-widest font-bold text-[10px]">
                    Resend in{" "}
                  </Text>
                  <Countdown key={resendKey} seconds={60} onEnd={() => setCanResend(true)} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View className="mt-10 pt-10 border-t border-content-secondary/10 flex-row justify-center items-center">
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
              <Text variant="h3" style={{ color: "#1A1A1C" }}>Select Campus</Text>
              <TouchableOpacity onPress={() => setSchoolModalVisible(false)}>
                <Text variant="label" className="text-brand-teal" style={{ color: "#14b8a6" }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {schools.filter((s) => typeof s?.name === "string" && s.name.trim().length > 0).length === 0 ? (
                <Text variant="body" className="text-content-secondary text-center py-8" style={{ color: "#636366" }}>
                  No schools available right now.
                </Text>
              ) : (
                schools
                  .filter((s) => typeof s?.name === "string" && s.name.trim().length > 0)
                  .map((s, index) => (
                    <TouchableOpacity
                      key={`${s.name}-${index}`}
                      onPress={() => {
                        setSelectedSchool(s.name);
                        setSchoolModalVisible(false);
                      }}
                      className="py-4 border-b border-content-secondary/10"
                    >
                      <Text variant="body" className="font-sans-medium" style={{ color: "#1A1A1C" }}>
                        {s.name}
                      </Text>
                      <Text variant="caption" className="text-content-secondary mt-1" style={{ color: "#636366" }}>
                        {typeof s.city === "string" && s.city.trim().length > 0 ? s.city : "Lucknow"}
                      </Text>
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}