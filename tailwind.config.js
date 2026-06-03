/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/features/**/*.{js,jsx,ts,tsx}",
    "./src/providers/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // NextBench brand palette
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#b9dffe",
          300: "#7cc5fd",
          400: "#36a9fa",
          500: "#0c8eeb", // Primary
          600: "#006fc9",
          700: "#0159a3",
          800: "#064b86",
          900: "#0b3f6f",
          950: "#07284a",
        },
        // Semantic surface colors
        surface: {
          DEFAULT: "#ffffff",
          secondary: "#f8fafc",
          tertiary: "#f1f5f9",
          border: "#e2e8f0",
        },
        "surface-dark": {
          DEFAULT: "#0f172a",
          secondary: "#1e293b",
          tertiary: "#334155",
          border: "#475569",
        },
        // Semantic text colors
        content: {
          DEFAULT: "#0f172a",
          secondary: "#475569",
          tertiary: "#94a3b8",
          inverse: "#ffffff",
        },
        "content-dark": {
          DEFAULT: "#f8fafc",
          secondary: "#cbd5e1",
          tertiary: "#64748b",
          inverse: "#0f172a",
        },
        // Status colors
        success: {
          DEFAULT: "#10b981",
          light: "#d1fae5",
        },
        warning: {
          DEFAULT: "#f59e0b",
          light: "#fef3c7",
        },
        error: {
          DEFAULT: "#ef4444",
          light: "#fee2e2",
        },
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      spacing: {
        "safe-top": "var(--safe-area-top)",
        "safe-bottom": "var(--safe-area-bottom)",
      },
    },
  },
  plugins: [],
};
