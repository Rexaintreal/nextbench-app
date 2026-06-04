/**
 * Club System (minimal)
 *
 * Minimal club functions needed for search. Full club chat/settings
 * will be implemented in a future phase.
 *
 * Collection: `clubs`
 */

import firestore from "@react-native-firebase/firestore";

/**
 * Join a public club.
 * Adds userId to memberIds array and increments memberCount.
 */
export async function joinClub(
  userId: string,
  clubId: string
): Promise<void> {
  const clubRef = firestore().collection("clubs").doc(clubId);
  await clubRef.update({
    memberIds: firestore.FieldValue.arrayUnion(userId),
    memberCount: firestore.FieldValue.increment(1),
  });
}

/**
 * Leave a club.
 * Removes userId from memberIds array and decrements memberCount.
 */
export async function leaveClub(
  userId: string,
  clubId: string
): Promise<void> {
  const clubRef = firestore().collection("clubs").doc(clubId);
  await clubRef.update({
    memberIds: firestore.FieldValue.arrayRemove(userId),
    memberCount: firestore.FieldValue.increment(-1),
  });
}
