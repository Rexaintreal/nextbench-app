/**
 * Login Screen
 *
 * Step 1 → user enters email → sendOtp()
 * Step 2 → user enters 6-digit code → verifyOtpAndLogin()
 *         → AuthProvider detects sign-in → _layout.tsx navigates to /(tabs)
 *
 * Google sign-in kept as an alternative path.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Keyboard,
  Platform,
  Animated,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { fetchDocument } from "@/services/firebase/firestore";
import { Mail, KeyRound, ShieldCheck, ArrowLeft, RotateCcw } from "lucide-react-native";

// ─── Google Icon ─────────────────────────────────────────────────────────────

import Svg, { Path, G } from "react-native-svg";

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
    // Accept only digits
    const digit = text.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(6, " ").split("");
    arr[i] = digit || " ";
    const next = arr.join("").trimEnd().padEnd(6, " ").slice(0, 6);
    onChange(next);
    // Advance focus
    if (digit && i < 5) inputs.current[i + 1]?.focus();
    // On delete, go back
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

  // Handle paste by catching it in the first input
  const handlePaste = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 6);
    if (digits) {
      onChange(digits.padEnd(6, " ").slice(0, 6));
      inputs.current[Math.min(digits.length, 5)]?.focus();
    }
  };

  return (
    <View className="flex-row gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <TextInput
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          value={value[i]?.trim() || ""}
          onChangeText={(t) => {
            // Handle paste of full OTP into first box
            if (i === 0 && t.replace(/\D/g, "").length > 1) {
              handlePaste(t);
            } else {
              handleChange(i, t);
            }
          }}
          onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
          editable={!disabled}
          keyboardType="number-pad"
          maxLength={i === 0 ? 6 : 1} // Allow paste into first box
          textContentType="oneTimeCode" // iOS autofill from SMS
          autoComplete={i === 0 ? "one-time-code" : "off"} // Android autofill
          className="w-11 h-14 text-center text-xl font-bold rounded-xl"
          style={{
            fontSize: 22,
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

// ─── Countdown Timer ──────────────────────────────────────────────────────────

function Countdown({ seconds, onEnd }: { seconds: number; onEnd: () => void }) {
  const [left, setLeft] = useState(seconds);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    setLeft(seconds);
    const id = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          onEndRef.current();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const mins = Math.floor(left / 60);
  const secs = String(left % 60).padStart(2, "0");
  return (
    <Text variant="caption" className="text-brand-teal font-bold tabular-nums">
      {mins}:{secs}
    </Text>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

type LoginStep = "email" | "otp";

export default function LoginScreen() {
  const { sendOtp, verifyOtpAndLogin, signInWithGoogle, signOut } = useAuth();

  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("      "); // 6 spaces as placeholder
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendKey, setResendKey] = useState(0);

  const isOtpFull = otp.replace(/\s/g, "").length === 6;

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!email.trim()) return;
    Keyboard.dismiss();
    setError(null);
    setNotFound(false);
    setIsSending(true);

    try {
      await sendOtp(email);
      setOtp("      ");
      setCanResend(false);
      setResendKey((k) => k + 1);
      setStep("otp");
    } catch (err: any) {
      const msg =
        err?.details?.message ||
        err?.message ||
        "Failed to send code. Please try again.";
      setError(msg.replace("Error: ", "").replace("[sendAuthOtpEmail] ", ""));
    } finally {
      setIsSending(false);
    }
  };

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerifyOtp = useCallback(async () => {
    if (!isOtpFull || isVerifying) return;
    Keyboard.dismiss();
    setError(null);
    setIsVerifying(true);

    try {
      const credential = await verifyOtpAndLogin(email, otp.trim());

      // Check Firestore profile exists (same guard as website)
      const uid = credential.user?.uid;
      if (uid) {
        const userDoc = await fetchDocument("users", uid);
        if (!userDoc) {
          await signOut();
          setNotFound(true);
          setIsVerifying(false);
          setStep("email");
          return;
        }
      }
      // AuthProvider detects the signed-in user; _layout.tsx redirects to /(tabs)
    } catch (err: any) {
      const raw =
        err?.details?.message ||
        err?.message ||
        "Verification failed. Please try again.";
      const msg = raw.replace("Error: ", "").replace("[verifyEmailOTP] ", "");
      setError(msg);

      if (raw.includes("No account found")) {
        setTimeout(() => {
          setNotFound(true);
          setStep("email");
        }, 1200);
      }
      setIsVerifying(false);
    }
  }, [email, otp, isOtpFull, isVerifying]);

  // Auto-submit when all 6 digits are entered
  const handleOtpChange = useCallback(
    (val: string) => {
      setOtp(val);
      if (val.replace(/\s/g, "").length === 6 && !isVerifying) {
        setTimeout(() => handleVerifyOtp(), 120);
      }
    },
    [isVerifying, handleVerifyOtp]
  );

  // ── Google Login ───────────────────────────────────────────────────────────
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setNotFound(false);
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      const userDoc = await fetchDocument("users", result.user.uid);
      if (!userDoc) {
        await signOut();
        setNotFound(true);
        return;
      }
      // _layout.tsx handles redirect
    } catch (err: any) {
      if (err?.code !== "SIGN_IN_CANCELLED") {
        setError(err?.message || "Google sign-in failed.");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const isLoading = isSending || isVerifying || isGoogleLoading;

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
          position: "absolute", top: -60, left: -60,
          width: 280, height: 280, borderRadius: 140,
          backgroundColor: "#00C4B510", transform: [{ scale: 1 }],
        }} />
        <View style={{
          position: "absolute", top: 80, right: -80,
          width: 220, height: 220, borderRadius: 110,
          backgroundColor: "#FF2D7810",
        }} />
        <View style={{
          position: "absolute", bottom: 100, left: "20%",
          width: 180, height: 180, borderRadius: 90,
          backgroundColor: "#00C4B508",
        }} />
      </View>

      <Animated.View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Header */}
        <View style={{ marginBottom: 40, alignItems: "center" }}>
          {/* Glassy badge */}
          <View style={{
            marginBottom: 28,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#00C4B540",
            backgroundColor: "#00C4B515",
            paddingHorizontal: 16,
            paddingVertical: 7,
            shadowColor: "#00C4B5",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
          }}>
            <Text variant="caption" style={{ color: "#2dd4bf", fontWeight: "700", letterSpacing: 3, fontSize: 11, textTransform: "uppercase" }}>
              Secured Portal
            </Text>
          </View>
          <Text variant="h1" style={{ textAlign: "center", fontSize: 38, fontWeight: "600", color: "#FFFFFF", marginBottom: 8 }}>
            Welcome{" "}
            <Text variant="h1" style={{ fontStyle: "italic", color: "#00C4B5", fontSize: 38 }}>
              Back
            </Text>
            .
          </Text>
          <Text variant="caption" style={{ textAlign: "center", color: "#00C4B560", textTransform: "uppercase", letterSpacing: 2.5, fontWeight: "700", fontSize: 10 }}>
            Access your verified campus dashboard.
          </Text>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={{ marginBottom: 20, width: "100%", borderRadius: 12, backgroundColor: "#FF000015", padding: 14, borderWidth: 1, borderColor: "#FF000030" }}>
            <Text variant="caption" style={{ textAlign: "center", color: "#FF6B6B", textTransform: "uppercase", letterSpacing: 2, fontWeight: "700", fontSize: 11 }}>
              {error === "INTERNAL"
                ? "Server Error: Could not connect to verification service"
                : error}
            </Text>
          </View>
        ) : null}

        {/* No Account Found Card */}
        {notFound && (
          <View style={{ marginBottom: 24, width: "100%", padding: 20, backgroundColor: "#E8174A08", borderWidth: 1, borderColor: "#E8174A25", borderRadius: 20, alignItems: "center" }}>
            <Text variant="label" style={{ marginBottom: 6, color: "#FFFFFF", fontWeight: "700" }}>
              No account found
            </Text>
            <Text variant="caption" style={{ textAlign: "center", marginBottom: 16, lineHeight: 20, color: "#FFFFFF60" }}>
              This account isn't registered on Nextbench yet. Create your verified student account to get started.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup" as any)}
              style={{ width: "100%", backgroundColor: "#E8174A", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12 }}
            >
              <Text variant="caption" style={{ color: "#FFFFFF", textTransform: "uppercase", letterSpacing: 2.5, fontWeight: "700", fontSize: 11 }}>
                Create Account →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 1: Email Entry ── */}
        {step === "email" && (
          <View style={{ gap: 12 }}>
            {/* Email input */}
            <View style={{ position: "relative", marginBottom: 4 }}>
              <View style={{ position: "absolute", left: 16, top: 0, bottom: 0, justifyContent: "center", zIndex: 10 }}>
                <Mail color="#00C4B5" size={16} opacity={0.6} />
              </View>
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(t); setNotFound(false); }}
                placeholder="Enter your email"
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
                  borderColor: "#FFFFFF15",
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingLeft: 46,
                  paddingRight: 16,
                  fontSize: 15,
                  color: "#FFFFFF",
                }}
              />
            </View>

            {/* Send OTP button */}
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={isLoading || !email.trim()}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                borderRadius: 999,
                paddingVertical: 18,
                backgroundColor: !isLoading && email.trim() ? "#E8174A" : "#E8174A80",
                shadowColor: "#E8174A",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: !isLoading && email.trim() ? 0.45 : 0,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <KeyRound color="white" size={14} />
                  <Text variant="caption" style={{ color: "#FFFFFF", fontWeight: "700", letterSpacing: 3, fontSize: 11, textTransform: "uppercase" }}>
                    Send One-Time Code
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#FFFFFF12" }} />
              <Text variant="caption" style={{ marginHorizontal: 16, color: "#FFFFFF25", textTransform: "uppercase", letterSpacing: 3, fontWeight: "700", fontSize: 10 }}>
                Or
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#FFFFFF12" }} />
            </View>

            {/* Google */}
            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                backgroundColor: "#FFFFFF",
                paddingVertical: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
                opacity: isLoading ? 0.5 : 1,
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

        {/* ── Step 2: OTP Entry ── */}
        {step === "otp" && (
          <View style={{ gap: 20 }}>
            {/* Icon + instruction */}
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
                {email}
              </Text>
            </View>

            {/* OTP boxes */}
            <OtpInput
              value={otp}
              onChange={handleOtpChange}
              disabled={isVerifying}
            />

            {/* Verify button */}
            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={isVerifying || !isOtpFull}
              activeOpacity={0.85}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                borderRadius: 999,
                paddingVertical: 18,
                backgroundColor: !isVerifying && isOtpFull ? "#00C4B5" : "#00C4B550",
                shadowColor: "#00C4B5",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: !isVerifying && isOtpFull ? 0.5 : 0,
                shadowRadius: 16,
                elevation: 8,
                marginTop: 4,
              }}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <ShieldCheck color="white" size={14} />
                  <Text variant="caption" style={{ color: "#FFFFFF", fontWeight: "700", letterSpacing: 3, fontSize: 11, textTransform: "uppercase" }}>
                    Verify Code
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Resend + back */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <TouchableOpacity
                onPress={() => { setStep("email"); setOtp("      "); setError(null); }}
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
                  disabled={isSending}
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
                  <Countdown
                    key={resendKey}
                    seconds={60}
                    onEnd={() => setCanResend(true)}
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={{ marginTop: 48, paddingTop: 24, borderTopWidth: 1, borderTopColor: "#00C4B510", flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
          <Text variant="caption" style={{ textTransform: "uppercase", letterSpacing: 2.5, color: "#FFFFFF30", fontWeight: "700", fontSize: 10, marginRight: 6 }}>
            New to Nextbench?
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup" as any)}>
            <Text variant="caption" style={{ textTransform: "uppercase", letterSpacing: 2.5, color: "#E8174A", fontWeight: "700", fontSize: 10 }}>
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

      </Animated.View>
    </SafeAreaView>
  );
}