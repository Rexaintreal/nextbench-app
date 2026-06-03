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
 * Sign in with email and password.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseAuthTypes.UserCredential> {
  return auth().signInWithEmailAndPassword(email, password);
}

/**
 * Create a new account with email and password.
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<FirebaseAuthTypes.UserCredential> {
  return auth().createUserWithEmailAndPassword(email, password);
}

/**
 * Send a password reset email.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  return auth().sendPasswordResetEmail(email);
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
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

// ------------------------------------------------------------------
// Future: Google Sign In
// ------------------------------------------------------------------
// export async function signInWithGoogle(): Promise<FirebaseAuthTypes.UserCredential> {
//   // 1. Get Google ID token via @react-native-google-signin
//   // 2. Create a Firebase credential with it
//   // 3. Sign in with credential
//   // const { idToken } = await GoogleSignin.signIn();
//   // const googleCredential = auth.GoogleAuthProvider.credential(idToken);
//   // return auth().signInWithCredential(googleCredential);
// }
