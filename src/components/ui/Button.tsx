/**
 * Design System — Button Component
 *
 * Supports primary, secondary, outline, and ghost variants.
 * Handles loading state, disabled state, and haptic feedback.
 *
 * Usage:
 *   <Button onPress={handleSubmit}>Submit</Button>
 *   <Button variant="outline" size="sm">Cancel</Button>
 *   <Button variant="primary" isLoading>Saving...</Button>
 */

import React from "react";
import {
  Pressable,
  ActivityIndicator,
  type PressableProps,
} from "react-native";
import { Text } from "./Text";

// ─── Variant Styles ─────────────────────────────────────────────────
const variantClasses = {
  primary: "bg-brand-500 active:bg-brand-600",
  secondary:
    "bg-surface-tertiary dark:bg-surface-dark-tertiary active:bg-surface-secondary",
  outline:
    "border-2 border-brand-500 bg-transparent active:bg-brand-50 dark:active:bg-brand-950",
  ghost: "bg-transparent active:bg-surface-tertiary dark:active:bg-surface-dark-tertiary",
  danger: "bg-error active:bg-red-600",
} as const;

const variantTextClasses = {
  primary: "text-white",
  secondary: "text-content dark:text-content-dark",
  outline: "text-brand-500",
  ghost: "text-brand-500",
  danger: "text-white",
} as const;

const sizeClasses = {
  sm: "px-3 py-2 rounded-lg",
  md: "px-5 py-3 rounded-xl",
  lg: "px-6 py-4 rounded-2xl",
} as const;

const sizeTextClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
} as const;

type ButtonVariant = keyof typeof variantClasses;
type ButtonSize = keyof typeof sizeClasses;

// ─── Props ──────────────────────────────────────────────────────────
interface ButtonProps extends Omit<PressableProps, "children"> {
  /** Visual variant */
  variant?: ButtonVariant;
  /** Size preset */
  size?: ButtonSize;
  /** Show loading spinner and disable press */
  isLoading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Additional NativeWind classes */
  className?: string;
  /** Button label */
  children: string;
}

// ─── Component ──────────────────────────────────────────────────────
export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  fullWidth = false,
  disabled = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      className={`
        flex-row items-center justify-center
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${isDisabled ? "opacity-50" : ""}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#fff" : "#0c8eeb"}
          className="mr-2"
        />
      ) : null}
      <Text
        variant="button"
        className={`${variantTextClasses[variant]} ${sizeTextClasses[size]}`}
      >
        {children}
      </Text>
    </Pressable>
  );
}
