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
  /** Large title — 28px medium */
  h1: "text-[28px] font-sans-semibold text-content dark:text-content-dark leading-tight",
  /** Section title — 22px medium */
  h2: "text-[22px] font-sans-semibold text-content dark:text-content-dark leading-snug",
  /** Subsection title — 19px medium */
  h3: "text-[19px] font-sans-medium text-content dark:text-content-dark leading-snug",
  /** Card title — 17px medium */
  h4: "text-[17px] font-sans-medium text-content dark:text-content-dark leading-normal",
  /** Body text — 17px regular, generous line height */
  body: "text-[17px] font-sans text-content dark:text-content-dark leading-relaxed",
  /** Secondary body — 15px regular, muted */
  bodySmall:
    "text-[15px] font-sans text-content-secondary dark:text-content-dark-secondary leading-relaxed",
  /** Caption text — 13px regular, muted */
  caption:
    "text-[13px] font-sans text-content-tertiary dark:text-content-dark-tertiary leading-normal",
  /** Label text — 15px medium */
  label: "text-[15px] font-sans-medium text-content dark:text-content-dark leading-normal",
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
