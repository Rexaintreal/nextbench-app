/**
 * NextBench Design System — Color Tokens
 */

import { useColorScheme } from "nativewind";

export const lightColors = {
  surfaceBase:      "#FFFFFF",
  surfaceSoft:      "#F5F5F7",
  surfaceCard:      "#FFFFFF",
  surfaceElevated:  "#FFFFFF",
  surfaceGap:       "#F0F0F2",
  surfaceSecondary: "#F5F5F7",
  surfaceTertiary:  "#FFFFFF",
  ink:              "#1A1A1C",
  inkMuted:         "#636366",
  inkFaint:         "#8E8E93",
  contentPrimary:   "#1A1A1C",
  contentSecondary: "#636366",
  contentTertiary:  "#8E8E93",
  contentInverse:   "#FFFFFF",
  brandTeal:        "#14b8a6",
  brandPink:        "#f43f5e",
  brandPinkSoft:    "#fb7185",
  brandMint:        "#34C759",
  primary:          "#14b8a6",
  border:           "rgba(0,0,0,0.06)",
  borderStrong:     "rgba(0,0,0,0.12)",
  glassBg:          "rgba(255,255,255,0.72)",
  glassBorder:      "rgba(255,255,255,0.28)",
  skeletonFrom:     "#E8E8ED",
  skeletonVia:      "#DCDCE2",
  overlay:          "rgba(0,0,0,0.18)",
  overlayHeavy:     "rgba(0,0,0,0.58)",
  navBg:            "rgba(245,245,247,0.92)",
  confessionBg:     "rgba(147,51,234,0.04)",
  confessionHover:  "rgba(147,51,234,0.07)",
  error:            "#FF3B30",
};

// Dark palette must match the shape of lightColors exactly.
// TypeScript infers ThemeColors from lightColors, so both objects
// must have identical keys with string values (no "as const" on darkColors).
export const darkColors: typeof lightColors = {
  surfaceBase:      "#000000",
  surfaceSoft:      "#1C1C1E",
  surfaceCard:      "#1C1C1E",
  surfaceElevated:  "#2C2C2E",
  surfaceGap:       "#0A0A0A",
  surfaceSecondary: "#1C1C1E",
  surfaceTertiary:  "#2C2C2E",
  ink:              "#F5F5F7",
  inkMuted:         "#98989D",
  inkFaint:         "#636366",
  contentPrimary:   "#F5F5F7",
  contentSecondary: "#98989D",
  contentTertiary:  "#636366",
  contentInverse:   "#000000",
  brandTeal:        "#2dd4bf",
  brandPink:        "#fb7185",
  brandPinkSoft:    "#fda4af",
  brandMint:        "#30D158",
  primary:          "#2dd4bf",
  border:           "rgba(255,255,255,0.08)",
  borderStrong:     "rgba(255,255,255,0.14)",
  glassBg:          "rgba(28,28,30,0.88)",
  glassBorder:      "rgba(255,255,255,0.08)",
  skeletonFrom:     "#1C1C1E",
  skeletonVia:      "#2C2C2E",
  overlay:          "rgba(0,0,0,0.45)",
  overlayHeavy:     "rgba(0,0,0,0.80)",
  navBg:            "rgba(0,0,0,0.92)",
  confessionBg:     "rgba(147,51,234,0.03)",
  confessionHover:  "rgba(147,51,234,0.05)",
  error:            "#FF453A",
};

export type ThemeColors = typeof lightColors;

export function useThemeColors(): ThemeColors {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? darkColors : lightColors;
}