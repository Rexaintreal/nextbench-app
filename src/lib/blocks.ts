/**
 * Block System
 *
 * Ported from web lib/blocks.ts.
 * Uses @react-native-firebase/firestore native SDK.
 *
 * Collection: `blocks`
 * Doc shape: { blockerId, blockedId, createdAt }
 * Doc ID: `${blockerId}_${blockedId}` for easy lookup
 */

import { useState, useEffect } from "react";
import firestore from "@react-native-firebase/firestore";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Block a user
 */
export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<void> {
  const docId = `${blockerId}_${blockedId}`;
  await firestore().collection("blocks").doc(docId).set({
    blockerId,
    blockedId,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Unblock a user
 */
export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<void> {
  const docId = `${blockerId}_${blockedId}`;
  await firestore().collection("blocks").doc(docId).delete();
}

/**
 * Hook: returns the set of user IDs blocked by the current user
 */
export function useBlockedIds(): Set<string> {
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setBlockedIds(new Set());
      return;
    }

    const unsub = firestore()
      .collection("blocks")
      .where("blockerId", "==", user.uid)
      .onSnapshot(
        (snap) => {
          const ids = new Set<string>();
          snap.forEach((d) => ids.add(d.data().blockedId));
          setBlockedIds(ids);
        },
        () => setBlockedIds(new Set())
      );

    return () => unsub();
  }, [user]);

  return blockedIds;
}

/**
 * Hook: block status between current user and a target user
 */
export function useBlockStatus(targetUserId?: string): {
  isBlocked: boolean; // current user blocked target
  isBlockedBy: boolean; // target blocked current user
} {
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockedBy, setIsBlockedBy] = useState(false);

  useEffect(() => {
    if (!user || !targetUserId || user.uid === targetUserId) {
      setIsBlocked(false);
      setIsBlockedBy(false);
      return;
    }

    // Check if current user blocked target
    const docId1 = `${user.uid}_${targetUserId}`;
    const unsub1 = firestore()
      .collection("blocks")
      .doc(docId1)
      .onSnapshot(
        (snap) => setIsBlocked(snap.exists),
        () => setIsBlocked(false)
      );

    // Check if target blocked current user
    const docId2 = `${targetUserId}_${user.uid}`;
    const unsub2 = firestore()
      .collection("blocks")
      .doc(docId2)
      .onSnapshot(
        (snap) => setIsBlockedBy(snap.exists),
        () => setIsBlockedBy(false)
      );

    return () => {
      unsub1();
      unsub2();
    };
  }, [user, targetUserId]);

  return { isBlocked, isBlockedBy };
}
