/**
 * NextBench Design System — Typography Tokens
 *
 * Used when programmatic access is needed (e.g., Animated.Text).
 * For standard text, use the <Text> component with NativeWind classes.
 */

export const typography = {
  /** Font families — must match expo-font loaded fonts */
  fonts: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },

  /** Font sizes in a modular scale */
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },

  /** Line heights (multipliers) */
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;
