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
  | "admin_promoted"
  | "new_reply";

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
  postId?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  postId,
}: CreateNotificationParams): Promise<void> {
  try {
    await firestore().collection("notifications").add({
      userId,
      type,
      title,
      message,
      link: link || (postId ? `/post/${postId}` : null),
      read: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.warn("Failed to create notification:", err);
  }
}

interface NotifyOnReplyParams {
  /** uid of the person who will receive the notification (post or comment author) */
  recipientUserId: string;
  /** uid of the person who just posted the reply — used to avoid self-notifying */
  actorUserId: string;
  /** display name of the person who just posted the reply */
  actorName: string;
  postId: string;
  replyId: string;
  /** true if this is a reply to another comment, false if a top-level comment on the post */
  isReplyToComment: boolean;
  /** short preview of the reply content, shown in the notification body */
  contentPreview: string;
}

/**
 * Notifies a post author (top-level comment) or a comment author (nested reply)
 * that someone replied. No-ops if the actor is replying to themselves.
 *
 * Link format: /post/{postId}?replyId={replyId}
 * The post detail screen reads `replyId` from the query string to scroll to
 * and highlight the specific comment.
 */
interface NotifyOnNewPostParams {
  recipientUserId: string;
  actorName: string;
  postId: string;
  contentPreview: string;
}

export async function notifyOnNewPost({
  recipientUserId,
  actorName,
  postId,
  contentPreview,
}: NotifyOnNewPostParams): Promise<void> {
  const trimmedPreview =
    contentPreview.length > 80 ? `${contentPreview.slice(0, 80)}…` : contentPreview;

  await createNotification({
    userId: recipientUserId,
    type: "new_post",
    title: `${actorName} just posted`,
    message: trimmedPreview || "Tap to view",
    postId,
  });
}

export async function notifyOnReply({
  recipientUserId,
  actorUserId,
  actorName,
  postId,
  replyId,
  isReplyToComment,
  contentPreview,
}: NotifyOnReplyParams): Promise<void> {
  // Don't notify yourself when replying to your own comment/post
  if (recipientUserId === actorUserId) return;

  const trimmedPreview =
    contentPreview.length > 80 ? `${contentPreview.slice(0, 80)}…` : contentPreview;

  await createNotification({
    userId: recipientUserId,
    type: "new_reply",
    title: isReplyToComment
      ? `${actorName} replied to your comment`
      : `${actorName} commented on your post`,
    message: trimmedPreview || "Tap to view",
    link: `/post/${postId}?replyId=${replyId}`,
  });
}