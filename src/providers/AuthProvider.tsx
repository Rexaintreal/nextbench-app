/**
 * Auth Provider
 *
 * Provides authentication state to the entire app via React Context.
 * Subscribes to Firebase onAuthStateChanged and Firestore user document.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithGoogle as firebaseSignInWithGoogle,
  signOut as firebaseSignOut,
  type FirebaseUser,
} from "@/services/firebase/auth";
import { getDocument, subscribeToDocument } from "@/services/firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

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
}

interface AuthContextValue {
  /** The current Firebase user, or null if not signed in */
  user: FirebaseUser | null;
  /** The Firestore user document */
  userData: UserData | null;
  /** True while the initial auth state and doc is being determined */
  isLoading: boolean;
  /** Convenience: true if user is non-null */
  isAuthenticated: boolean;
  /** Sign in with Google */
  signInWithGoogle: () => Promise<any>;
  /** Sign out */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Configure GoogleSignin on mount
  useEffect(() => {
    GoogleSignin.configure({
      // We will need the actual Web Client ID, but leaving this for now.
      webClientId: "159828236173-j7r70e6s9r6n6f7k7q6s2i8g3v6h7t5a.apps.googleusercontent.com",
    });
  }, []);

  // Subscribe to auth state changes and Firestore document
  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Subscribe to Firestore user doc
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

  const signInWithGoogle = async () => {
    return firebaseSignInWithGoogle();
  };

  const signOut = async () => {
    await firebaseSignOut();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userData,
      isLoading,
      isAuthenticated: user !== null,
      signInWithGoogle,
      signOut,
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
