// lib/scheduleEngagementNotifications.ts
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// {name} gets replaced with the user's first name at schedule time
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

const CHANNEL_ID = "engagement";
const STORAGE_KEY = "engagement_notification_ids";
const QUIET_BEFORE_HOUR = 9;   // no notifications before 9am
const QUIET_AFTER_HOUR = 22;   // no notifications after 10pm

// Production: 2 hours. For testing change to e.g. 30 * 1000 (30 seconds)
// const INTERVAL_MS = 2 * 60 * 60 * 1000;
const INTERVAL_MS = 20 * 1000; // 20 seconds
const SLOTS = 12;

function applyName(template: string, name: string): string {
  return template.replace(/\{name\}/g, name);
}

function nextAllowedTime(from: Date): Date {
  const d = new Date(from);
  const hour = d.getHours();
  if (hour < QUIET_BEFORE_HOUR) {
    d.setHours(QUIET_BEFORE_HOUR, 0, 0, 0);
  } else if (hour >= QUIET_AFTER_HOUR) {
    d.setDate(d.getDate() + 1);
    d.setHours(QUIET_BEFORE_HOUR, 0, 0, 0);
  }
  return d;
}

export async function scheduleEngagementNotifications(userName?: string) {
  await cancelEngagementNotifications();

  // Use first name only — "Rahul Kumar" → "Rahul"
  const firstName = userName?.split(" ")[0]?.trim() || "you";

  // Shuffle so order feels random every time
  const shuffled = [...MESSAGES].sort(() => Math.random() - 0.5);
  const ids: string[] = [];
  let cursor = new Date(Date.now() + INTERVAL_MS);

  for (let i = 0; i < SLOTS; i++) {
    // Space each notification INTERVAL_MS apart from the previous one
    // (not from now), so they truly fire one by one
    if (i > 0) cursor = new Date(cursor.getTime() + INTERVAL_MS);

    const fireAt = nextAllowedTime(cursor);
    const msg = shuffled[i % shuffled.length];

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: applyName(msg.title, firstName),
        body: applyName(msg.body, firstName),
        data: { type: "engagement", link: "/(tabs)" },
        ...(Platform.OS === "android" && { channelId: CHANNEL_ID }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });

    ids.push(id);
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  return ids;
}

export async function cancelEngagementNotifications() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const ids: string[] = JSON.parse(raw);
    await Promise.all(
      ids.map((id) =>
        Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
      )
    );
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing stored yet
  }
}