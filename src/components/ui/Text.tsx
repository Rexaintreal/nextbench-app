/**
 * Design System — Text Component
 *
 * Wraps React Native Text with typography presets and NativeWind support.
 * All text in the app should use this component instead of RN Text directly.
 *
 * Usage:
 *   <Text variant="h1">Title</Text>
 *   <Text variant="body" className="text-content-secondary">Subtitle</Text>
 */

import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

// ─── Variant Styles ─────────────────────────────────────────────────
const variantClasses = {
  /** Large title — 30px bold */
  h1: "text-3xl font-sans-bold text-content dark:text-content-dark",
  /** Section title — 24px bold */
  h2: "text-2xl font-sans-bold text-content dark:text-content-dark",
  /** Subsection title — 20px semibold */
  h3: "text-xl font-sans-semibold text-content dark:text-content-dark",
  /** Card title — 18px semibold */
  h4: "text-lg font-sans-semibold text-content dark:text-content-dark",
  /** Body text — 16px regular */
  body: "text-base font-sans text-content dark:text-content-dark",
  /** Secondary body — 14px regular, muted */
  bodySmall:
    "text-sm font-sans text-content-secondary dark:text-content-dark-secondary",
  /** Caption text — 12px regular, muted */
  caption:
    "text-xs font-sans text-content-tertiary dark:text-content-dark-tertiary",
  /** Label text — 14px medium */
  label: "text-sm font-sans-medium text-content dark:text-content-dark",
  /** Button text — 16px semibold */
  button: "text-base font-sans-semibold",
} as const;

type TextVariant = keyof typeof variantClasses;

// ─── Props ──────────────────────────────────────────────────────────
interface TextProps extends RNTextProps {
  /** Typography preset */
  variant?: TextVariant;
  /** Additional NativeWind classes */
  className?: string;
  children: React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────
export function Text({
  variant = "body",
  className = "",
  children,
  ...props
}: TextProps) {
  return (
    <RNText className={`${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </RNText>
  );
}
