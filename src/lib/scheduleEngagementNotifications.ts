import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const CHANNEL_ID = "engagement";
const STORAGE_KEY = "engagement_notif_ids";
const LAST_SCHEDULED_KEY = "engagement_last_scheduled_at";
const INTERVAL_SECONDS = 2 * 60 * 60;       // testing → 2 * 60 * 60 for prod
const COOLDOWN_MS = 2 * 60 * 1000;        // testing → 6 * 60 * 60 * 1000 for prod

let isScheduling = false;

const MESSAGES = [
  { title: "👀 {name}, someone mentioned you", body: "Or maybe not. Only one way to find out." },
  { title: "📩 {name}, you might have a new message", body: "A classmate, a senior, or someone unexpected." },
  { title: "🤫 This confession sounds familiar, {name}", body: "You sure it's not about someone you know?" },
  { title: "🎓 A senior just shared advice", body: "{name}, this could save you a lot of trial and error." },
  { title: "🔥 Everyone's talking about this post", body: "{name}, you're one scroll away from finding out why." },
  { title: "💬 The conversation didn't end where you left it", body: "Someone replied, {name}. Go check." },
  { title: "🎉 A new campus event is live", body: "{name}, your friends might already be signing up." },
  { title: "🛒 Fresh marketplace listing just dropped", body: "Grab it before someone else does, {name}." },
  { title: "👥 {name}, your batch is active right now", body: "Something interesting is happening on the feed." },
  { title: "🚀 An opportunity just showed up", body: "{name}, internship, project, event... worth a look." },
  { title: "📖 Someone uploaded notes", body: "Future you might thank you for checking, {name}." },
  { title: "😳 This confession has suspiciously specific details", body: "{name}, you know exactly why we're notifying you." },
  { title: "👤 Someone from your college reached out", body: "Don't leave them hanging, {name}." },
  { title: "🎯 {name}, looking for teammates?", body: "Someone might be looking for you too." },
  { title: "☕ Taking a study break, {name}?", body: "See what's happening around campus." },
  { title: "🏆 A senior shared a placement tip", body: "{name}, the kind people wish they knew earlier." },
  { title: "💡 {name}, your next project partner could be here", body: "Worth checking before someone else finds them." },
  { title: "👋 {name}, you've been away for a while", body: "Campus life didn't stop while you were gone." },
  { title: "📚 New books just dropped", body: "{name}, the one you've been looking for might be here." },
  { title: "📍 Something's happening near you", body: "{name}, students are already talking about it." },
];

function applyName(template: string, name: string): string {
  return template.replace(/\{name\}/g, name);
}

export async function scheduleEngagementNotifications(userName?: string) {
  if (isScheduling) return;
  isScheduling = true;

  try {
    // If any notifications are already queued, leave them alone
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    if (existing.length > 0) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const firstName = userName?.split(" ")[0]?.trim() || "you";
    const ids: string[] = [];
    let fireAt = Date.now() + INTERVAL_SECONDS * 1000;

    for (const msg of MESSAGES) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: applyName(msg.title, firstName),
          body: applyName(msg.body, firstName),
          data: { type: "engagement", link: "/(tabs)" },
          ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAt),
        },
      });

      ids.push(id);
      fireAt += INTERVAL_SECONDS * 1000;
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    return ids;
  } finally {
    isScheduling = false;
  }
}

export async function cancelEngagementNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(STORAGE_KEY);
  await AsyncStorage.removeItem(LAST_SCHEDULED_KEY);
}