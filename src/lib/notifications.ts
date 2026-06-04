/**
 * Notifications Service
 *
 * Ported from web lib/notifications.ts.
 * Uses @react-native-firebase/firestore native SDK.
 */

import firestore from "@react-native-firebase/firestore";

export type NotificationType =
  | "user_approved"
  | "listing_approved"
  | "listing_rejected"
  | "new_message"
  | "new_post"
  | "item_reserved"
  | "item_sold"
  | "new_review"
  | "admin_promoted";

export function isChatMessageNotification(data: {
  type?: unknown;
  link?: unknown;
}) {
  return (
    data.type === "new_message" &&
    typeof data.link === "string" &&
    data.link.startsWith("/chat/")
  );
}

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Creates a notification document in Firestore.
 * Called after key actions like approvals, messages, etc.
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
}: CreateNotificationParams): Promise<void> {
  try {
    await firestore().collection("notifications").add({
      userId,
      type,
      title,
      message,
      link: link || null,
      read: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Silently fail — notifications are non-critical
    console.warn("Failed to create notification:", err);
  }
}
