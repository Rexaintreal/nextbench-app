/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/features/**/*.{js,jsx,ts,tsx}",
    "./src/providers/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // NextBench brand palette (Web)
        brand: {
          teal: "var(--color-brand-teal)",
          pink: "var(--color-brand-pink)",
          mint: "var(--color-brand-mint)",
          500: "var(--color-brand-teal)", // fallback for existing stub
        },
        primary: "var(--color-primary)",
        // Semantic surface colors
        surface: {
          DEFAULT: "var(--color-surface-base)",
          soft: "var(--color-surface-soft)",
          card: "var(--color-surface-card)",
          elevated: "var(--color-surface-elevated)",
          border: "var(--color-border)",
          secondary: "var(--color-surface-soft)",
          tertiary: "var(--color-surface-elevated)",
        },
        "surface-dark": {
          DEFAULT: "var(--color-surface-base)",
          secondary: "var(--color-surface-soft)",
          tertiary: "var(--color-surface-elevated)",
          border: "var(--color-border)",
        },
        // Semantic text colors
        content: {
          DEFAULT: "var(--color-luxury-ink)",
          secondary: "var(--color-luxury-ink-muted)",
          tertiary: "var(--color-luxury-ink-faint)",
          inverse: "var(--color-surface-base)",
        },
        "content-dark": {
          DEFAULT: "var(--color-luxury-ink)",
          secondary: "var(--color-luxury-ink-muted)",
          tertiary: "var(--color-luxury-ink-faint)",
          inverse: "var(--color-surface-base)",
        },
        // Legacy stubs
        text: {
          secondary: "var(--color-luxury-ink-muted)",
        },
        "text-secondary": {
          dark: "var(--color-luxury-ink-muted)",
        },
        error: {
          DEFAULT: "var(--color-error)",
        },
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        "sans-bold": ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
