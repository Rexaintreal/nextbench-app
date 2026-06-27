/**
 * Firebase Authentication Service
 *
 * All auth operations are centralized here. Screens never call
 * Firebase Auth directly — they go through AuthProvider which
 * uses these functions.
 *
 * Adding a new auth provider (e.g., Apple Sign In) means adding
 * one function here. Nothing else changes.
 */

import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";

export type FirebaseUser = FirebaseAuthTypes.User;

// Modular Functions instance, created once and reused by every callable below.
const functionsInstance = getFunctions(getApp());

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChanged(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return auth().onAuthStateChanged(callback);
}

/**
 * Sign in with Google.
 * Uses @react-native-google-signin/google-signin to get an idToken,
 * then authenticates with Firebase.
 */
export async function signInWithGoogle(): Promise<FirebaseAuthTypes.UserCredential> {
  console.log("Step 1: Checking Play Services...");
  const hasServices = await GoogleSignin.hasPlayServices({
    showPlayServicesUpdateDialog: true,
  });
  console.log("Step 1 OK - Has Play Services:", hasServices);

  console.log("Step 2: Calling GoogleSignin.signIn()...");
  const signInResult = await GoogleSignin.signIn();
  console.log("Step 2 OK - signInResult:", JSON.stringify(signInResult));

  const idToken = signInResult.data?.idToken;
  console.log("Step 3: idToken exists:", !!idToken);

  if (!idToken) {
    throw new Error("No ID token found");
  }

  console.log("Step 4: Creating Firebase credential...");
  const googleCredential = auth.GoogleAuthProvider.credential(idToken);

  console.log("Step 5: Signing in with Firebase...");
  return auth().signInWithCredential(googleCredential);
}

/**
 * Sign out the current user.
 * Signs out from both Google and Firebase to clear cache.
 */
export async function signOut(): Promise<void> {
  await GoogleSignin.signOut();
  return auth().signOut();
}

/**
 * Get the currently signed-in user (synchronous snapshot).
 * Returns null if no user is signed in.
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth().currentUser;
}

/**
 * Update the user's display name and photo URL.
 */
export async function updateProfile(updates: {
  displayName?: string;
  photoURL?: string;
}): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error("No authenticated user");
  return user.updateProfile(updates);
}

// ─── Email OTP ────────────────────────────────────────────────────────────────
// These mirror the website's sendAuthOtpEmail / verifyAuthOtpEmail Cloud
// Functions. The verify functions return { email, loginPassword } which is
// then used with signInWithEmailAndPassword — Firebase Auth's underlying
// mechanism behind the OTP flow.

/**
 * Step 1 — Send a 6-digit OTP to the given email.
 * Calls the `sendAuthOtpEmail` Cloud Function.
 */
export async function sendOtp(email: string): Promise<void> {
  const sendFn = httpsCallable(functionsInstance, "sendAuthOtpEmail");
  await sendFn({ email: email.trim().toLowerCase() });
}

/**
 * Step 2 (Login) — Verify OTP and sign in to an existing account.
 * Calls `verifyAuthOtpEmail`, gets back { email, loginPassword },
 * then signs in with Firebase email+password.
 */
export async function verifyOtpAndLogin(
  email: string,
  otp: string
): Promise<FirebaseAuthTypes.UserCredential> {
  const verifyFn = httpsCallable(functionsInstance, "verifyAuthOtpEmail");
  const result: any = await verifyFn({
    email: email.trim().toLowerCase(),
    otp,
  });

  const { loginPassword, email: returnedEmail } = result.data ?? {};
  if (!loginPassword || !returnedEmail) {
    throw new Error("Authentication failed. Please try again.");
  }

  return auth().signInWithEmailAndPassword(returnedEmail, loginPassword);
}

/**
 * Step 2 (Signup) — Verify OTP and create a new account.
 * Same Cloud Function but passes `isSignup: true` + signupData so the
 * function creates the Firestore user doc server-side.
 */
export async function verifyOtpAndSignup(
  email: string,
  otp: string,
  signupData: {
    name: string;
    school: string;
    city: string;
    referralCode?: string;
  }
): Promise<FirebaseAuthTypes.UserCredential> {
  const verifyFn = httpsCallable(functionsInstance, "verifyAuthOtpEmail");
  const result: any = await verifyFn({
    email: email.trim().toLowerCase(),
    otp,
    isSignup: true,
    signupData,
  });

  const { loginPassword, email: returnedEmail } = result.data ?? {};
  if (!loginPassword || !returnedEmail) {
    throw new Error("Authentication failed. Please try again.");
  }

  return auth().signInWithEmailAndPassword(returnedEmail, loginPassword);
}