/**
 * Follow System
 *
 * Ported from web app's lib/follows.ts.
 * Uses @react-native-firebase/firestore native SDK.
 *
 * Collection: `follows`
 * Doc shape: { followerId, followingId, createdAt }
 */

import { useAuth } from "@/providers/AuthProvider";
import firestore from "@react-native-firebase/firestore";
import { useEffect, useMemo, useState } from "react";


export async function followUser(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  if (currentUserId === targetUserId) return;

  // Check if already following
  const snap = await firestore()
    .collection("follows")
    .where("followerId", "==", currentUserId)
    .where("followingId", "==", targetUserId)
    .get();
  if (!snap.empty) return; // Already following

  await firestore().collection("follows").add({
    followerId: currentUserId,
    followingId: targetUserId,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // Send a follow notification
  try {
    const uDoc = await firestore()
      .collection("users")
      .doc(currentUserId)
      .get();
    const currentUserName = uDoc.data()?.name || "Someone";
    await firestore().collection("notifications").add({
      userId: targetUserId,
      type: "user_approved",
      title: "New Follower",
      message: `${currentUserName} started following you.`,
      read: false,
      link: `/profile/${currentUserId}`,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to send follow notification", e);
  }
}

export async function unfollowUser(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  const snap = await firestore()
    .collection("follows")
    .where("followerId", "==", currentUserId)
    .where("followingId", "==", targetUserId)
    .get();
  const batch = firestore().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

// ─── Hook: Follow Status ─────────────────────────────────

export function useFollowStatus(targetUserId: string | undefined) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedBy, setIsFollowedBy] = useState(false);

  useEffect(() => {
    if (!user || !targetUserId || user.uid === targetUserId) {
      setIsFollowing(false);
      setIsFollowedBy(false);
      return;
    }

    // Am I following them?
    const unsub1 = firestore()
      .collection("follows")
      .where("followerId", "==", user.uid)
      .where("followingId", "==", targetUserId)
      .onSnapshot(
        (snap) => setIsFollowing(!snap.empty),
        () => setIsFollowing(false)
      );

    // Are they following me?
    const unsub2 = firestore()
      .collection("follows")
      .where("followerId", "==", targetUserId)
      .where("followingId", "==", user.uid)
      .onSnapshot(
        (snap) => setIsFollowedBy(!snap.empty),
        () => setIsFollowedBy(false)
      );

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, targetUserId]);

  const isFriend = isFollowing && isFollowedBy;
  return { isFollowing, isFollowedBy, isFriend };
}

// ─── Hook: Follow Counts ─────────────────────────────────

export function useFollowCounts(userId: string | undefined) {
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // Followers = people who follow this user
    const unsub1 = firestore()
      .collection("follows")
      .where("followingId", "==", userId)
      .onSnapshot(
        (snap) => setFollowersCount(snap.size),
        () => setFollowersCount(0)
      );

    // Following = people this user follows
    const unsub2 = firestore()
      .collection("follows")
      .where("followerId", "==", userId)
      .onSnapshot(
        (snap) => setFollowingCount(snap.size),
        () => setFollowingCount(0)
      );

    return () => {
      unsub1();
      unsub2();
    };
  }, [userId]);

  return { followersCount, followingCount };
}

// ─── Hook: Following IDs Set (for search/feed) ──────────

export function useFollowingIds() {
  const { user } = useAuth();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followerIdsSet, setFollowerIdsSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setFollowingIds(new Set());
      setFollowerIdsSet(new Set());
      return;
    }

    // Who I follow
    const unsub1 = firestore()
      .collection("follows")
      .where("followerId", "==", user.uid)
      .onSnapshot(
        (snap) => {
          const ids = new Set<string>();
          snap.forEach((d) => ids.add(d.data().followingId));
          setFollowingIds(ids);
        },
        () => setFollowingIds(new Set())
      );

    // Who follows me
    const unsub2 = firestore()
      .collection("follows")
      .where("followingId", "==", user.uid)
      .onSnapshot(
        (snap) => {
          const ids = new Set<string>();
          snap.forEach((d) => ids.add(d.data().followerId));
          setFollowerIdsSet(ids);
        },
        () => setFollowerIdsSet(new Set())
      );

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  // Memoize friendIds for stable references
  const friendIds = useMemo(() => {
    const friends = new Set<string>();
    followingIds.forEach((id) => {
      if (followerIdsSet.has(id)) friends.add(id);
    });
    return friends;
  }, [followingIds, followerIdsSet]);

  return { followingIds, friendIds };
}
