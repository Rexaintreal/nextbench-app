/**
 * Firebase App Initialization
 *
 * With @react-native-firebase, the app initializes automatically from
 * GoogleService-Info.plist (iOS) / google-services.json (Android).
 * This file exports a reference and ensures the app is initialized.
 */

import firebase from "@react-native-firebase/app";

/**
 * Get the default Firebase app instance.
 * The native SDK auto-initializes from the platform config files,
 * so this is mainly for explicit access when needed.
 */
export function getFirebaseApp() {
  return firebase.app();
}

/**
 * Check if Firebase is initialized.
 * Useful for debugging during development.
 */
export function isFirebaseInitialized(): boolean {
  try {
    firebase.app();
    return true;
  } catch {
    return false;
  }
}
