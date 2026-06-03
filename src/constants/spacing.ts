/**
 * NextBench Design System — Spacing Scale
 *
 * 4px base grid. Used when programmatic spacing is needed.
 * For layout, prefer NativeWind utility classes (p-4, m-2, gap-3, etc.)
 */

export const spacing = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

/** Standard content padding for screens */
export const SCREEN_PADDING = spacing[4]; // 16px

/** Standard card border radius */
export const CARD_RADIUS = 16;

/** Standard avatar sizes */
export const avatarSizes = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
} as const;
