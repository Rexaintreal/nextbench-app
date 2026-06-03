/**
 * Firebase Services — Barrel Export
 *
 * Single import point for all Firebase operations:
 *   import { signInWithEmail, fetchCollection } from "@services/firebase";
 */

// Auth
export {
  onAuthStateChanged,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  updateProfile,
  type FirebaseUser,
} from "./auth";

// Firestore
export {
  getCollection,
  getDocument,
  fetchDocument,
  fetchCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  subscribeToDocument,
  serverTimestamp,
  increment,
} from "./firestore";

// Storage
export {
  uploadFile,
  uploadFiles,
  deleteFile,
  getDownloadURL,
  generatePostImagePath,
  generateAvatarPath,
} from "./storage";
