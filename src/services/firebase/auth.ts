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

export type FirebaseUser = FirebaseAuthTypes.User;

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
    showPlayServicesUpdateDialog: true 
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
