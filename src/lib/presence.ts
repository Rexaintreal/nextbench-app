/**
 * Presence System (Mobile / React Native)
 *
 * Mirrors src/lib/presence.ts on the web app — writes the same
 * users/{uid}.online + lastSeen fields, so the web's TrendingSidebar
 * online-count and any "online" badges automatically include mobile users.
 *
 *  - On mount / app foreground: set online = true, lastSeen = now
 *  - Every 60s while foregrounded: refresh lastSeen (heartbeat)
 *  - On app background / unmount: set online = false
 */

import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import firestore from "@react-native-firebase/firestore";

const HEARTBEAT_INTERVAL_MS = 60_000; // 1 min

async function setOnline(uid: string) {
  try {
    await firestore().collection("users").doc(uid).update({
      online: true,
      lastSeen: firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // Non-critical — ignore permission errors during sign-out race
  }
}

async function setOffline(uid: string) {
  try {
    await firestore().collection("users").doc(uid).update({
      online: false,
      lastSeen: firestore.FieldValue.serverTimestamp(),
    });
  } catch {
    // Non-critical
  }
}

/**
 * Call once at the app root (e.g. inside AuthProvider or RootLayoutNav)
 * with the current user's uid.
 */
export function usePresence(uid: string | null | undefined) {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!uid) return;

    const startHeartbeat = () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      heartbeatRef.current = setInterval(() => setOnline(uid), HEARTBEAT_INTERVAL_MS);
    };

    const stopHeartbeat = () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };

    // Initial mark-online
    setOnline(uid);
    startHeartbeat();

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        setOnline(uid);
        startHeartbeat();
      } else {
        // 'background' or 'inactive'
        stopHeartbeat();
        setOffline(uid);
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      stopHeartbeat();
      subscription.remove();
      setOffline(uid);
    };
  }, [uid]);
}