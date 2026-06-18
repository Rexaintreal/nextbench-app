/**
 * Network Provider
 *
 * Tracks device connectivity via NetInfo and exposes it through React Context.
 * Also renders a persistent banner at the top of the screen whenever the
 * device has no internet connection, so every screen gets this for free
 * without needing to add checks manually.
 */

import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, StyleSheet, Text, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NetworkContextValue {
  /** True if the device has an active network connection (wifi/cellular) */
  isConnected: boolean;
  /** True if that connection can actually reach the internet. Null while undetermined. */
  isInternetReachable: boolean | null;
  /** Convenience: true when we are confident there's no usable internet */
  isOffline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(!!state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    // Get an initial reading immediately, rather than waiting for the first change event
    NetInfo.fetch().then((state) => {
      setIsConnected(!!state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  // Treat "unreachable" only when we're confident (false), not while undetermined (null)
  const isOffline = !isConnected || isInternetReachable === false;

  const value = useMemo<NetworkContextValue>(
    () => ({ isConnected, isInternetReachable, isOffline }),
    [isConnected, isInternetReachable, isOffline]
  );

  return (
    <NetworkContext.Provider value={value}>
      {children}
      <OfflineBanner visible={isOffline} />
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
}

// ─── Offline banner ───────────────────────────────────────────────────────

function OfflineBanner({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const translateY = useRef(new Animated.Value(-100)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 280,
        friction: 22,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          paddingTop: insets.top + 8,
          backgroundColor: isDark ? "#3A1414" : "#FEE2E2",
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: isDark ? "#FCA5A5" : "#B91C1C" }]}>
        No internet connection
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 10,
    alignItems: "center",
    zIndex: 999,
    elevation: 999,
  },
  text: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
});
