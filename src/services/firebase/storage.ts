/**
 * Firebase Storage Service
 *
 * Handles file uploads and URL retrieval.
 * Used primarily for user avatars and post images.
 */

import storage from "@react-native-firebase/storage";

/**
 * Upload a file to Firebase Storage.
 *
 * @param localUri - Local file URI (from image picker, camera, etc.)
 * @param storagePath - Path in Firebase Storage (e.g., "posts/abc123/image.jpg")
 * @returns The download URL of the uploaded file
 */
export async function uploadFile(
  localUri: string,
  storagePath: string
): Promise<string> {
  const reference = storage().ref(storagePath);
  await reference.putFile(localUri);
  return reference.getDownloadURL();
}

/**
 * Upload multiple files in parallel.
 *
 * @param files - Array of { localUri, storagePath }
 * @returns Array of download URLs in the same order
 */
export async function uploadFiles(
  files: Array<{ localUri: string; storagePath: string }>
): Promise<string[]> {
  const promises = files.map(({ localUri, storagePath }) =>
    uploadFile(localUri, storagePath)
  );
  return Promise.all(promises);
}

/**
 * Delete a file from Firebase Storage.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  await storage().ref(storagePath).delete();
}

/**
 * Get the download URL for an existing file.
 */
export async function getDownloadURL(storagePath: string): Promise<string> {
  return storage().ref(storagePath).getDownloadURL();
}

/**
 * Generate a unique storage path for a post image.
 */
export function generatePostImagePath(
  userId: string,
  postId: string,
  index: number
): string {
  const timestamp = Date.now();
  return `posts/${userId}/${postId}/${timestamp}_${index}.jpg`;
}

/**
 * Generate a storage path for a user's avatar.
 */
export function generateAvatarPath(userId: string): string {
  const timestamp = Date.now();
  return `avatars/${userId}/${timestamp}.jpg`;
}
