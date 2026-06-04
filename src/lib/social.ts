/**
 * Social Service Functions
 *
 * Shared utilities for upvote/downvote, wishlist toggle, and DM room creation.
 * These mirror the web app's lib/reactions.ts, lib/saves.ts, and lib/dm.ts.
 */

import firestore from "@react-native-firebase/firestore";

// ─── Upvote Toggle ───────────────────────────────────────

/**
 * Toggle an upvote on a post.
 * If the user already upvoted → remove the upvote and decrement count.
 * If the user hasn't upvoted → add an upvote and increment count.
 *
 * Uses a transaction for atomicity.
 */
export async function toggleUpvote(
  postId: string,
  userId: string
): Promise<void> {
  // Find existing upvote doc
  const upvoteQuery = await firestore()
    .collection("post_upvotes")
    .where("postId", "==", postId)
    .where("userId", "==", userId)
    .get();

  const postRef = firestore().collection("posts").doc(postId);

  if (!upvoteQuery.empty) {
    // Already upvoted → remove
    const upvoteDoc = upvoteQuery.docs[0];
    await upvoteDoc.ref.delete();
    await postRef.update({
      upvotesCount: firestore.FieldValue.increment(-1),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } else {
    // Not upvoted → add
    await firestore().collection("post_upvotes").add({
      postId,
      userId,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    await postRef.update({
      upvotesCount: firestore.FieldValue.increment(1),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }
}

// ─── Wishlist Toggle ─────────────────────────────────────

/**
 * Toggle a product in/out of the user's wishlist.
 * Returns true if the product was added, false if removed.
 */
export async function toggleWishlist(
  productId: string,
  userId: string
): Promise<boolean> {
  const q = await firestore()
    .collection("wishlists")
    .where("userId", "==", userId)
    .where("productId", "==", productId)
    .get();

  if (!q.empty) {
    // Already wishlisted → remove
    const batch = firestore().batch();
    q.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return false;
  } else {
    // Not wishlisted → add
    await firestore().collection("wishlists").add({
      userId,
      productId,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return true;
  }
}

// ─── Save/Bookmark Post Toggle ─────────────────────────────

/**
 * Toggle saving (bookmarking) a post.
 * Returns true if the post was saved, false if removed.
 */
export async function toggleSavePost(
  postId: string,
  userId: string
): Promise<boolean> {
  const q = await firestore()
    .collection("saved_posts")
    .where("userId", "==", userId)
    .where("postId", "==", postId)
    .get();

  if (!q.empty) {
    // Already saved → remove
    const batch = firestore().batch();
    q.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return false;
  } else {
    // Not saved → add
    await firestore().collection("saved_posts").add({
      userId,
      postId,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return true;
  }
}

// ─── DM Room ─────────────────────────────────────────────

/**
 * Find an existing DM room between two users, or create a new one.
 * Returns the room ID and whether it's a pending request.
 *
 * If the target user has `chatPrivacy.followersOnly` enabled and the current
 * user is NOT following them, the room is created with `status: 'pending'`.
 * The sender can send exactly 1 message; the recipient must accept to continue.
 */
export async function getOrCreateDMRoom(
  currentUserId: string,
  otherUserId: string,
  targetUserData?: { chatPrivacy?: { followersOnly?: boolean } } | null
): Promise<{ roomId: string; isPending: boolean }> {
  // Query for DM rooms where the current user is a participant
  const q = await firestore()
    .collection("chatRooms")
    .where("participants", "array-contains", currentUserId)
    .where("type", "==", "dm")
    .get();

  // Check if any of these rooms also contain the other user
  for (const doc of q.docs) {
    const data = doc.data();
    if (data.participants?.includes(otherUserId)) {
      return { roomId: doc.id, isPending: data.status === 'pending' };
    }
  }

  // Check if we need to create a pending room
  let isPending = false;
  if (targetUserData?.chatPrivacy?.followersOnly) {
    // Check if currentUser follows the target
    const followSnap = await firestore()
      .collection("follows")
      .where("followerId", "==", currentUserId)
      .where("followingId", "==", otherUserId)
      .limit(1)
      .get();
    if (followSnap.empty) {
      isPending = true;
    }
  }

  // No existing DM room — create one
  const newRoom = await firestore().collection("chatRooms").add({
    participants: [currentUserId, otherUserId],
    type: "dm",
    productId: "",
    productTitle: "",
    lastMessage: "",
    lastSenderId: "",
    status: isPending ? "pending" : "active",
    requestedBy: isPending ? currentUserId : null,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  return { roomId: newRoom.id, isPending };
}
