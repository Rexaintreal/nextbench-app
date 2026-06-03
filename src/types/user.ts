/**
 * User types — models a NextBench user profile
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
  schoolName: string;
  grade: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

/** Minimal user info for display in lists, post cards, etc. */
export interface UserPreview {
  id: string;
  displayName: string;
  photoURL: string | null;
  isVerified: boolean;
}

/** Data needed to create/update a user profile */
export interface UserFormData {
  displayName: string;
  bio: string;
  schoolName: string;
  grade: string;
}
