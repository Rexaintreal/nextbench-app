/**
 * Auth Provider
 *
 * Provides authentication state to the entire app via React Context.
 * Subscribes to Firebase onAuthStateChanged for real-time auth state.
 *
 * Usage in components:
 *   const { user, isLoading, isAuthenticated } = useAuth();
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
  signInWithEmail,
  signUpWithEmail,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type FirebaseUser,
} from "@/services/firebase/auth";

// ─── Types ──────────────────────────────────────────────────────────
interface AuthContextValue {
  /** The current Firebase user, or null if not signed in */
  user: FirebaseUser | null;
  /** True while the initial auth state is being determined */
  isLoading: boolean;
  /** Convenience: true if user is non-null */
  isAuthenticated: boolean;
  /** Sign in with email/password */
  signIn: (email: string, password: string) => Promise<void>;
  /** Create a new account */
  signUp: (email: string, password: string) => Promise<void>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** Send password reset email */
  resetPassword: (email: string) => Promise<void>;
}

// ─── Context ────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to auth state changes on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Auth actions
  const signIn = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const signUp = async (email: string, password: string) => {
    await signUpWithEmail(email, password);
  };

  const signOut = async () => {
    await firebaseSignOut();
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(email);
  };

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ───────────────────────────────────────────────────────────
/**
 * Access auth state and actions.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
