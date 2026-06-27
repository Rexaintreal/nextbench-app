/**
 * Auth Provider
 *
 * Provides authentication state to the entire app via React Context.
 * Subscribes to Firebase onAuthStateChanged and Firestore user document.
 *
 * UPDATED: added sendOtp / verifyOtpAndLogin / verifyOtpAndSignup
 *          for the email-OTP auth flow (mirrors the website implementation).
 */

import {
  signInWithGoogle as firebaseSignInWithGoogle,
  signOut as firebaseSignOut,
  sendOtp as firebaseSendOtp,
  verifyOtpAndLogin as firebaseVerifyOtpAndLogin,
  verifyOtpAndSignup as firebaseVerifyOtpAndSignup,
  onAuthStateChanged,
  type FirebaseUser,
} from "@/services/firebase/auth";
import { subscribeToDocument } from "@/services/firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface UserData {
  id: string;
  name: string;
  email: string;
  school: string;
  verified: boolean;
  verificationStatus: "pending" | "approved" | "rejected";
  reputation: number;
  isAdmin: boolean;
  profilePicture?: string | null;
  idCardUrl?: string | null;
  selfieUrl?: string | null;
  about?: string | null;
  username?: string | null;
  city?: string;
  createdAt: any;
  updatedAt: any;
  coverPhoto?: string;
  chatPrivacy?: {
    followersOnly?: boolean;
  };
}

interface AuthContextValue {
  user: FirebaseUser | null;
  userData: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Google OAuth (existing) */
  signInWithGoogle: () => Promise<any>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Email OTP — Step 1: send code */
  sendOtp: (email: string) => Promise<void>;
  /** Email OTP — Step 2: verify + sign in (login flow) */
  verifyOtpAndLogin: (email: string, otp: string) => Promise<any>;
  /** Email OTP — Step 2: verify + create account (signup flow) */
  verifyOtpAndSignup: (
    email: string,
    otp: string,
    signupData: { name: string; school: string; city: string; referralCode?: string }
  ) => Promise<any>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configure GoogleSignin on mount
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "14134258818-untrtrmtl4u95f0jga661nookhdls37f.apps.googleusercontent.com",
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });
  }, []);

  // Subscribe to auth state + Firestore user doc
  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        unsubscribeDoc = subscribeToDocument<UserData>(
          "users",
          firebaseUser.uid,
          (doc) => {
            setUserData(doc);
            setIsLoading(false);
          }
        );
      } else {
        setUserData(null);
        setIsLoading(false);
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userData,
      isLoading,
      isAuthenticated: user !== null,
      signInWithGoogle: firebaseSignInWithGoogle,
      signOut: firebaseSignOut,
      sendOtp: firebaseSendOtp,
      verifyOtpAndLogin: firebaseVerifyOtpAndLogin,
      verifyOtpAndSignup: firebaseVerifyOtpAndSignup,
    }),
    [user, userData, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
