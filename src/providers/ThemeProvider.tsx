/**
 * ThemeProvider
 *
 * Persists the user's chosen color scheme to AsyncStorage so it
 * survives app restarts. Reads the saved value on mount and applies
 * it via NativeWind's setColorScheme before rendering children.
 *
 * Usage: wrap around <RootLayoutNav /> inside RootLayout.
 * Access anywhere with: useTheme()
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "nativewind";

type Scheme = "light" | "dark";
const STORAGE_KEY = "@nextbench/color-scheme";

interface ThemeContextValue {
  colorScheme: Scheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (scheme: Scheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [ready, setReady] = useState(false);

  // On mount: load saved preference and apply it
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === "dark" || saved === "light") {
          setColorScheme(saved);
        }
      })
      .catch(() => {
        // Ignore read errors — fall back to OS default
      })
      .finally(() => setReady(true));
  }, []);

  const setTheme = (scheme: Scheme) => {
    setColorScheme(scheme);
    AsyncStorage.setItem(STORAGE_KEY, scheme).catch(() => {});
  };

  const toggleTheme = () => {
    const next: Scheme = colorScheme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  // Don't render until we've loaded the saved preference to avoid
  // a flash of the wrong theme on startup
  if (!ready) return null;

  return (
    <ThemeContext.Provider
      value={{
        colorScheme: (colorScheme ?? "light") as Scheme,
        isDark: colorScheme === "dark",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}