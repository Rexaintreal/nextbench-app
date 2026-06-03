/**
 * NextBench Design System — Color Tokens
 *
 * These are used programmatically when NativeWind className isn't available
 * (e.g., passing colors to third-party libraries, StatusBar, etc.)
 *
 * The canonical source of truth for colors is tailwind.config.js.
 * Keep these in sync.
 */

export const colors = {
  brand: {
    50: "#f0f7ff",
    100: "#e0effe",
    200: "#b9dffe",
    300: "#7cc5fd",
    400: "#36a9fa",
    500: "#0c8eeb",
    600: "#006fc9",
    700: "#0159a3",
    800: "#064b86",
    900: "#0b3f6f",
    950: "#07284a",
  },
  surface: {
    light: {
      primary: "#ffffff",
      secondary: "#f8fafc",
      tertiary: "#f1f5f9",
      border: "#e2e8f0",
    },
    dark: {
      primary: "#0f172a",
      secondary: "#1e293b",
      tertiary: "#334155",
      border: "#475569",
    },
  },
  content: {
    light: {
      primary: "#0f172a",
      secondary: "#475569",
      tertiary: "#94a3b8",
      inverse: "#ffffff",
    },
    dark: {
      primary: "#f8fafc",
      secondary: "#cbd5e1",
      tertiary: "#64748b",
      inverse: "#0f172a",
    },
  },
  status: {
    success: "#10b981",
    successLight: "#d1fae5",
    warning: "#f59e0b",
    warningLight: "#fef3c7",
    error: "#ef4444",
    errorLight: "#fee2e2",
  },
} as const;
