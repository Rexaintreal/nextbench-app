/**
 * Post types — models a NextBench post
 */

import type { UserPreview } from "./user";

export interface Post {
  id: string;
  author: UserPreview;
  title: string;
  content: string;
  images: string[];
  tags: string[];
  category: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Data needed to create a new post */
export interface CreatePostData {
  title: string;
  content: string;
  images: string[];
  tags: string[];
  category: string;
}

/** Comment on a post */
export interface Comment {
  id: string;
  postId: string;
  author: UserPreview;
  content: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: Date;
}
