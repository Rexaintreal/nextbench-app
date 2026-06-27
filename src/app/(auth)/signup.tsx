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
  Animated,
  StyleSheet,
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

// ─── Google Icon ─────────────────────────────────────────────────────────────

import Svg, { Path } from "react-native-svg";

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

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
          className="w-10 h-12 text-center text-xl font-bold rounded-xl"
          style={{
            fontSize: 20,
            fontWeight: "700",
            backgroundColor: "#FFFFFF0D",
            borderWidth: 1,
            borderColor: value[i]?.trim() ? "#00C4B5" : "#FFFFFF15",
            color: "#FFFFFF",
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

  // Per-field inline errors
  const [fieldErrors, setFieldErrors] = useState<{
    school?: string;
    name?: string;
    email?: string;
    terms?: string;
  }>({});

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
    const errs: typeof fieldErrors = {};
    if (!selectedSchool) errs.school = "Please select your school or institute.";
    if (!nameInput.trim()) errs.name = "Please enter your full name.";
    if (!emailInput.trim()) errs.email = "Please enter your email address.";
    if (!agreedToTerms) errs.terms = "Please agree to the Terms of Service and Privacy Policy to continue.";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    Keyboard.dismiss();
    setError(null);
    setFieldErrors({});
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
    const errs: typeof fieldErrors = {};
    if (!selectedSchool) errs.school = "Please select your school or institute.";
    if (!agreedToTerms) errs.terms = "Please agree to the Terms of Service and Privacy Policy to continue with Google.";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setError(null);
    setFieldErrors({});
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      {/* Ambient glow blobs */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{
          position: "absolute", top: -40, right: -60,
          width: 260, height: 260, borderRadius: 130,
          backgroundColor: "#E8174A0C",
        }} />
        <View style={{
          position: "absolute", top: 160, left: -80,
          width: 200, height: 200, borderRadius: 100,
          backgroundColor: "#00C4B50A",
        }} />
        <View style={{
          position: "absolute", bottom: 80, right: "10%",
          width: 160, height: 160, borderRadius: 80,
          backgroundColor: "#E8174A08",
        }} />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Header */}
        <View style={{ marginBottom: 36, alignItems: "center" }}>
          <View style={{
            marginBottom: 24,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#E8174A40",
            backgroundColor: "#E8174A12",
            paddingHorizontal: 16,
            paddingVertical: 7,
            shadowColor: "#E8174A",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
          }}>
            <Text variant="caption" style={{ color: "#FF6B8A", fontWeight: "700", letterSpacing: 3, fontSize: 11, textTransform: "uppercase" }}>
              Registration
            </Text>
          </View>
          <Text variant="h1" style={{ textAlign: "center", fontSize: 38, fontWeight: "600", color: "#FFFFFF", marginBottom: 8 }}>
            Join the{" "}
            <Text variant="h1" style={{ fontStyle: "italic", color: "#E8174A", fontSize: 38 }}>
              Network
            </Text>
            .
          </Text>
          <Text variant="caption" style={{ textAlign: "center", color: "#E8174A50", textTransform: "uppercase", letterSpacing: 2.5, fontWeight: "700", fontSize: 10 }}>
            Mandatory verification for all members.
          </Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={{ marginBottom: 20, width: "100%", borderRadius: 12, backgroundColor: "#FF000015", padding: 14, borderWidth: 1, borderColor: "#FF000030" }}>
            <Text variant="caption" style={{ textAlign: "center", color: "#FF6B6B", textTransform: "uppercase", letterSpacing: 2, fontWeight: "700", fontSize: 11 }}>
              {error === "INTERNAL"
                ? "Server Error: Could not connect to verification service"
                : error}
            </Text>
          </View>
        ) : null}

        {/* ── Step 1: Details ── */}
        {signupStep === "details" && (
          <View style={{ gap: 16 }}>
            {/* School picker */}
            <View>
              <Text variant="caption" style={{ textTransform: "uppercase", letterSpacing: 2.5, color: "#FFFFFF30", fontWeight: "700", marginBottom: 8, marginLeft: 4, fontSize: 10 }}>
                School / Institute
              </Text>
              <TouchableOpacity
                onPress={() => { setSchoolModalVisible(true); setFieldErrors(e => ({ ...e, school: undefined })); }}
                style={{
                  width: "100%",
                  backgroundColor: "#FFFFFF0D",
                  borderWidth: 1,
                  borderColor: fieldErrors.school ? "#FF6B6B60" : selectedSchool ? "#00C4B540" : "#FFFFFF15",
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text variant="label" style={{ color: selectedSchool ? "#FFFFFF" : "rgba(255,255,255,0.3)" }}>
                  {selectedSchool || "Select Campus"}
                </Text>
                <ChevronDown color="#00C4B5" size={16} opacity={0.6} />
              </TouchableOpacity>
              {fieldErrors.school ? (
                <Text variant="caption" style={{ color: "#FF6B6B", fontSize: 11, marginTop: 6, marginLeft: 4 }}>
                  ⚠ {fieldErrors.school}
                </Text>
              ) : null}
            </View>

            {/* Full Name */}
            <View>
              <Text variant="caption" style={{ textTransform: "uppercase", letterSpacing: 2.5, color: "#FFFFFF30", fontWeight: "700", marginBottom: 8, marginLeft: 4, fontSize: 10 }}>
                Full Name
              </Text>
              <View style={{ position: "relative" }}>
                <View style={{ position: "absolute", left: 16, top: 0, bottom: 0, justifyContent: "center", zIndex: 10 }}>
                  <User color="#00C4B5" size={15} opacity={0.6} />
                </View>
                <TextInput
                  value={nameInput}
                  onChangeText={(v) => { setNameInput(v); setFieldErrors(e => ({ ...e, name: undefined })); }}
                  placeholder="Jane Doe"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  autoComplete="name"
                  textContentType="name"
                  editable={!isLoading}
                  style={{
                    width: "100%",
                    backgroundColor: "#FFFFFF0D",
                    borderWidth: 1,
                    borderColor: nameInput ? "#00C4B540" : "#FFFFFF15",
                    borderRadius: 16,
                    paddingVertical: 16,
                    paddingLeft: 46,
                    paddingRight: 16,
                    fontSize: 15,
                    color: "#FFFFFF",
                  }}
                />
              </View>
              {fieldErrors.name ? (
                <Text variant="caption" style={{ color: "#FF6B6B", fontSize: 11, marginTop: 6, marginLeft: 4 }}>
                  ⚠ {fieldErrors.name}
                </Text>
              ) : null}
            </View>

            {/* Email */}
            <View>
              <Text variant="caption" style={{ textTransform: "uppercase", letterSpacing: 2.5, color: "#FFFFFF30", fontWeight: "700", marginBottom: 8, marginLeft: 4, fontSize: 10 }}>
                Email Address
              </Text>
              <View style={{ position: "relative" }}>
                <View style={{ position: "absolute", left: 16, top: 0, bottom: 0, justifyContent: "center", zIndex: 10 }}>
                  <Mail color="#00C4B5" size={15} opacity={0.6} />
                </View>
                <TextInput
                  value={emailInput}
                  onChangeText={(v) => { setEmailInput(v); setFieldErrors(e => ({ ...e, email: undefined })); }}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={handleSendOtp}
                  editable={!isLoading}
                  style={{
                    width: "100%",
                    backgroundColor: "#FFFFFF0D",
                    borderWidth: 1,
                    borderColor: emailInput ? "#00C4B540" : "#FFFFFF15",
                    borderRadius: 16,
                    paddingVertical: 16,
                    paddingLeft: 46,
                    paddingRight: 16,
                    fontSize: 15,
                    color: "#FFFFFF",
                  }}
                />
              </View>
              {fieldErrors.email ? (
                <Text variant="caption" style={{ color: "#FF6B6B", fontSize: 11, marginTop: 6, marginLeft: 4 }}>
                  ⚠ {fieldErrors.email}
                </Text>
              ) : null}
            </View>

            {/* Terms */}
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", paddingRight: 4, marginTop: 4 }}
              onPress={() => { setAgreedToTerms(!agreedToTerms); setFieldErrors(e => ({ ...e, terms: undefined })); }}
              activeOpacity={0.8}
            >
              <View
                style={{
                  width: 20, height: 20,
                  borderRadius: 6,
                  borderWidth: 2,
                  alignItems: "center", justifyContent: "center",
                  marginRight: 12,
                  flexShrink: 0,
                  backgroundColor: agreedToTerms ? "#00C4B5" : "transparent",
                  borderColor: agreedToTerms ? "#00C4B5" : "rgba(255,255,255,0.2)",
                }}
              >
                {agreedToTerms && (
                  <View style={{ width: 10, height: 10, backgroundColor: "white", borderRadius: 3 }} />
                )}
              </View>
              <Text variant="caption" style={{ lineHeight: 20, flex: 1, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                {"I agree to Nextbench's "}
                <Text variant="caption" style={{ color: "#00C4B5", fontWeight: "700", fontSize: 12 }}>Terms of Service</Text>
                {" and "}
                <Text variant="caption" style={{ color: "#00C4B5", fontWeight: "700", fontSize: 12 }}>Privacy Policy</Text>
                {". I confirm I am a currently enrolled student."}
              </Text>
            </TouchableOpacity>
            {fieldErrors.terms ? (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, paddingHorizontal: 4 }}>
                <Text variant="caption" style={{ color: "#FF6B6B", fontSize: 11, lineHeight: 17 }}>
                  ⚠ {fieldErrors.terms}
                </Text>
              </View>
            ) : null}

            {/* Send OTP button */}
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={isLoading}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                borderRadius: 999,
                paddingVertical: 18,
                backgroundColor: !isLoading ? "#E8174A" : "#E8174A60",
                shadowColor: "#E8174A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: !isLoading ? 0.45 : 0,
                shadowRadius: 16,
                elevation: 8,
                marginTop: 4,
              }}
            >
              {isSendingOtp ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <KeyRound color="white" size={15} />
                  <Text variant="caption" style={{ color: "#FFFFFF", fontWeight: "700", letterSpacing: 3, fontSize: 11, textTransform: "uppercase" }}>
                    Send Verification Code
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#FFFFFF12" }} />
              <Text variant="caption" style={{ marginHorizontal: 16, color: "#FFFFFF25", textTransform: "uppercase", letterSpacing: 3, fontWeight: "700", fontSize: 10 }}>
                Or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#FFFFFF12" }} />
            </View>

            {/* Google — white card, always tappable; validation fires on press */}
            <TouchableOpacity
              onPress={handleGoogleSignup}
              disabled={isLoading}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                backgroundColor: "#FFFFFF",
                paddingVertical: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
                opacity: isLoading ? 0.45 : 1,
              }}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <GoogleIcon size={18} />
                  <Text variant="caption" style={{ color: "#1A1A1A", fontWeight: "600", fontSize: 14, letterSpacing: 0.2 }}>
                    Continue with Google
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 2: OTP ── */}
        {signupStep === "otp" && (
          <View style={{ gap: 20 }}>
            <View style={{ alignItems: "center", marginBottom: 4 }}>
              <View style={{
                width: 60, height: 60,
                backgroundColor: "#00C4B515",
                borderRadius: 30,
                alignItems: "center", justifyContent: "center",
                marginBottom: 16,
                borderWidth: 1, borderColor: "#00C4B530",
                shadowColor: "#00C4B5",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}>
                <Mail color="#00C4B5" size={24} />
              </View>
              <Text variant="body" style={{ color: "#FFFFFF60", textAlign: "center" }}>
                We've sent a 6-digit code to
              </Text>
              <Text variant="label" style={{ color: "#FFFFFF", fontWeight: "700", marginTop: 4, textAlign: "center" }}>
                {emailInput}
              </Text>
            </View>

            <OtpInput value={otp} onChange={handleOtpChange} disabled={isSigningIn} />

            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={isSigningIn || !isOtpFull}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                borderRadius: 999,
                paddingVertical: 18,
                backgroundColor: !isSigningIn && isOtpFull ? "#00C4B5" : "#00C4B550",
                shadowColor: "#00C4B5",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: !isSigningIn && isOtpFull ? 0.5 : 0,
                shadowRadius: 16,
                elevation: 8,
                marginTop: 4,
              }}
            >
              {isSigningIn ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ShieldCheck color="white" size={14} />
                  <Text variant="caption" style={{ color: "#FFFFFF", fontWeight: "700", letterSpacing: 3, fontSize: 11, textTransform: "uppercase" }}>
                    Verify & Create Account
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => { setSignupStep("details"); setOtp("      "); setError(null); }}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <ArrowLeft color="rgba(255,255,255,0.3)" size={12} />
                <Text variant="caption" style={{ color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 2.5, fontWeight: "700", fontSize: 10 }}>
                  Change email
                </Text>
              </TouchableOpacity>

              {canResend ? (
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={isSendingOtp}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <RotateCcw color="#00C4B5" size={12} />
                  <Text variant="caption" style={{ color: "#00C4B5", textTransform: "uppercase", letterSpacing: 2.5, fontWeight: "700", fontSize: 10 }}>
                    Resend code
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text variant="caption" style={{ color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: 2, fontWeight: "700", fontSize: 10 }}>
                    Resend in{" "}
                  </Text>
                  <Countdown key={resendKey} seconds={60} onEnd={() => setCanResend(true)} />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={{ marginTop: 36, paddingTop: 20, borderTopWidth: 1, borderTopColor: "#FFFFFF0A", flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
          <Text variant="caption" style={{ textTransform: "uppercase", letterSpacing: 2.5, color: "#FFFFFF30", fontWeight: "700", fontSize: 10, marginRight: 6 }}>
            Already a member?
          </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text variant="caption" style={{ textTransform: "uppercase", letterSpacing: 2.5, color: "#00C4B5", fontWeight: "700", fontSize: 10 }}>
              Sign In
            </Text>
          </TouchableOpacity>
        </View>
        </Animated.View>
      </ScrollView>

      {/* School Picker Modal */}
      <Modal visible={isSchoolModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" }}>
          <View style={{ backgroundColor: "#141414", height: "62%", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#FFFFFF12" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text variant="h3" style={{ color: "#FFFFFF", fontWeight: "700" }}>Select Campus</Text>
              <TouchableOpacity onPress={() => setSchoolModalVisible(false)} style={{ backgroundColor: "#FFFFFF12", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 }}>
                <Text variant="label" style={{ color: "#00C4B5", fontWeight: "600" }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {schools.filter((s) => typeof s?.name === "string" && s.name.trim().length > 0).length === 0 ? (
                <Text variant="body" style={{ color: "#FFFFFF40", textAlign: "center", paddingVertical: 32 }}>
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
                      style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#FFFFFF0A" }}
                    >
                      <Text variant="body" style={{ color: "#FFFFFF", fontWeight: "500" }}>
                        {s.name}
                      </Text>
                      <Text variant="caption" style={{ color: "#FFFFFF40", marginTop: 2 }}>
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