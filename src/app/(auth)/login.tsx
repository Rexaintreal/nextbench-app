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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Text } from "@/components/ui/Text";
import { useAuth } from "@/providers/AuthProvider";
import { fetchDocument } from "@/services/firebase/firestore";
import { Mail, KeyRound, ShieldCheck, ArrowLeft, RotateCcw } from "lucide-react-native";

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
          className="w-11 h-14 text-center text-xl font-bold border border-content-secondary/15 rounded-xl bg-surface-card text-content shadow-sm"
          style={{
            fontSize: 22,
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

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="flex-1 justify-center px-6">

        {/* Header */}
        <View className="mb-12 items-center">
          <View className="mb-8 rounded-full bg-brand-mint/25 border border-brand-teal/30 px-4 py-2">
            <Text variant="caption" className="text-brand-teal uppercase tracking-widest font-bold" style={{ color: "#2dd4bf" }}>
              Secured Portal
            </Text>
          </View>
          <Text variant="h1" className="text-center text-4xl font-sans-medium mb-2">
            Welcome{" "}
            <Text variant="h1" className="italic text-brand-teal text-4xl">
              Back
            </Text>
            .
          </Text>
          <Text variant="caption" className="text-center text-brand-teal/50 uppercase tracking-widest font-bold">
            Access your verified campus dashboard.
          </Text>
        </View>

        {/* Error Banner */}
        {error ? (
          <View className="mb-6 w-full rounded-sm bg-error/10 p-4 border border-error/20">
            <Text variant="caption" className="text-center text-error uppercase tracking-widest font-bold">
              {error === "INTERNAL"
                ? "Server Error: Could not connect to verification service"
                : error}
            </Text>
          </View>
        ) : null}

        {/* No Account Found Card */}
        {notFound && (
          <View className="mb-8 w-full p-6 bg-brand-pink/5 border border-brand-pink/20 rounded-2xl items-center">
            <Text variant="label" className="mb-2 text-content font-bold">
              No account found
            </Text>
            <Text
              variant="caption"
              className="text-center mb-5 leading-5 text-content-secondary"
            >
              This account isn't registered on Nextbench yet. Create your
              verified student account to get started.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup" as any)}
              className="w-full bg-brand-pink items-center justify-center py-4 rounded-xl"
            >
              <Text variant="caption" className="text-white uppercase tracking-widest font-bold">
                Create Account →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 1: Email Entry ── */}
        {step === "email" && (
          <View className="space-y-4">
            {/* Email input */}
            <View className="relative mb-4">
              <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
                <Mail color="#00C4B5" size={16} opacity={0.5} />
              </View>
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(t); setNotFound(false); }}
                placeholder="Enter your email"
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

            {/* Send OTP button */}
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={isLoading || !email.trim()}
              activeOpacity={0.8}
              className={`flex-row items-center justify-center w-full rounded-full py-5 shadow-xl ${
                !isLoading && email.trim()
                  ? "bg-brand-pink shadow-brand-pink/10"
                  : "bg-brand-pink/50"
              }`}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <KeyRound color="white" size={14} />
                  <Text variant="caption" className="text-white uppercase tracking-[0.2em] font-bold" style={{ color: "#FFFFFF" }}>
                    Send One-Time Code
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center py-4">
              <View className="flex-1 h-px bg-content-secondary/10" />
              <Text variant="caption" className="mx-4 text-content-secondary/30 uppercase tracking-widest font-bold text-[10px]">
                Or
              </Text>
              <View className="flex-1 h-px bg-content-secondary/10" />
            </View>

            {/* Google */}
            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
              className="flex-row items-center justify-center w-full rounded-full border border-white/25 bg-white/5 py-5"
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

        {/* ── Step 2: OTP Entry ── */}
        {step === "otp" && (
          <View className="space-y-6">
            {/* Icon + instruction */}
            <View className="items-center mb-2">
              <View className="w-14 h-14 bg-brand-teal/10 rounded-full items-center justify-center mb-4">
                <Mail color="#00C4B5" size={24} />
              </View>
              <Text variant="body" className="text-content-secondary text-center">
                We've sent a 6-digit code to
              </Text>
              <Text variant="label" className="text-content font-bold mt-1 text-center">
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
              activeOpacity={0.8}
              className={`flex-row items-center justify-center w-full rounded-full py-5 shadow-lg mt-2 ${
                !isVerifying && isOtpFull
                  ? "bg-brand-teal shadow-brand-teal/15"
                  : "bg-brand-teal/50"
              }`}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center gap-2">
                  <ShieldCheck color="white" size={14} />
                  <Text variant="caption" className="text-white uppercase tracking-[0.2em] font-bold" style={{ color: "#FFFFFF" }}>
                    Verify Code
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Resend + back */}
            <View className="flex-row items-center justify-between mt-2">
              <TouchableOpacity
                onPress={() => { setStep("email"); setOtp("      "); setError(null); }}
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
                  disabled={isSending}
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
        <View className="mt-16 pt-10 border-t border-brand-teal/5 flex-row justify-center items-center">
          <Text variant="caption" className="uppercase tracking-widest text-brand-teal/40 font-bold mr-1">
            New to Nextbench?
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup" as any)}>
            <Text variant="caption" className="uppercase tracking-widest text-brand-pink font-bold">
              Create Account
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}