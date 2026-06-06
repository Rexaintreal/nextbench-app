/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/features/**/*.{js,jsx,ts,tsx}",
    "./src/providers/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  // "media" = NativeWind reads the device color scheme automatically.
  // No <View className="dark"> wrapper needed — it just works.
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────────────────
        brand: {
          teal: "#14b8a6",
          pink: "#f43f5e",
          "pink-soft": "#fb7185",
          mint: "#34C759",
          500: "#14b8a6",
        },
        primary: "#14b8a6",

        // ── Surfaces ───────────────────────────────────────────────────
        surface: {
          DEFAULT:  "#FFFFFF",
          soft:     "#F5F5F7",
          card:     "#FFFFFF",
          elevated: "#FFFFFF",
          gap:      "#F0F0F2",
          secondary:"#F5F5F7",
          tertiary: "#FFFFFF",

          dark:            "#000000",
          "dark-soft":     "#1C1C1E",
          "dark-card":     "#1C1C1E",
          "dark-elevated": "#2C2C2E",
          "dark-gap":      "#0A0A0A",
          "dark-secondary":"#1C1C1E",
          "dark-tertiary": "#2C2C2E",
        },

        // ── Ink (text) ─────────────────────────────────────────────────
        ink: {
          DEFAULT: "#1A1A1C",
          muted:   "#636366",
          faint:   "#8E8E93",

          dark:        "#F5F5F7",
          "dark-muted":"#98989D",
          "dark-faint":"#636366",
        },

        // ── Content (alias kept for existing className usage) ──────────
        content: {
          DEFAULT:   "#1A1A1C",
          secondary: "#636366",
          tertiary:  "#8E8E93",
          inverse:   "#FFFFFF",

          dark:            "#F5F5F7",
          "dark-secondary":"#98989D",
          "dark-tertiary": "#636366",
        },

        // ── Borders ────────────────────────────────────────────────────
        border: {
          DEFAULT:      "rgba(0,0,0,0.06)",
          strong:       "rgba(0,0,0,0.12)",
          dark:         "rgba(255,255,255,0.08)",
          "dark-strong":"rgba(255,255,255,0.14)",
        },

        // ── Glass ──────────────────────────────────────────────────────
        glass: {
          bg:           "rgba(255,255,255,0.72)",
          border:       "rgba(255,255,255,0.28)",
          "dark-bg":    "rgba(28,28,30,0.88)",
          "dark-border":"rgba(255,255,255,0.08)",
        },

        // ── Skeleton ───────────────────────────────────────────────────
        skeleton: {
          from:       "#E8E8ED",
          via:        "#DCDCE2",
          "dark-from":"#1C1C1E",
          "dark-via": "#2C2C2E",
        },

        // ── Overlays ───────────────────────────────────────────────────
        overlay: {
          DEFAULT:      "rgba(0,0,0,0.18)",
          heavy:        "rgba(0,0,0,0.58)",
          "dark-DEFAULT":"rgba(0,0,0,0.45)",
          "dark-heavy": "rgba(0,0,0,0.80)",
        },

        // ── Confession posts ───────────────────────────────────────────
        confession: {
          bg:          "rgba(147,51,234,0.04)",
          hover:       "rgba(147,51,234,0.07)",
          "dark-bg":   "rgba(147,51,234,0.03)",
          "dark-hover":"rgba(147,51,234,0.05)",
        },

        // ── Status ─────────────────────────────────────────────────────
        error: {
          DEFAULT: "#FF3B30",
          dark:    "#FF453A",
        },
      },

      fontFamily: {
        sans:           ["Inter_400Regular"],
        "sans-medium":  ["Inter_500Medium"],
        "sans-semibold":["Inter_600SemiBold"],
        "sans-bold":    ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};