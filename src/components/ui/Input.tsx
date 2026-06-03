/**
 * Design System — Input Component
 *
 * Wraps React Native TextInput with labels, error states, and NativeWind styling.
 */

import React, { forwardRef, useState } from "react";
import {
  TextInput,
  View,
  type TextInputProps,
  Pressable,
} from "react-native";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  /** Optional label displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Additional styling for the container */
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    { label, error, secureTextEntry, containerClassName = "", className = "", ...props },
    ref
  ) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isSecure = secureTextEntry && !isPasswordVisible;

    return (
      <View className={`w-full ${containerClassName}`}>
        {label ? (
          <Text variant="label" className="mb-1.5 ml-1 text-content-secondary dark:text-content-dark-secondary">
            {label}
          </Text>
        ) : null}

        <View className="relative">
          <TextInput
            ref={ref}
            secureTextEntry={isSecure}
            placeholderTextColor="#9ca3af" // Tailwind gray-400
            className={`
              h-12 rounded-xl border px-4 font-sans text-base
              text-content dark:text-content-dark
              bg-surface dark:bg-surface-dark-secondary
              ${
                error
                  ? "border-error focus:border-error"
                  : "border-surface-border dark:border-surface-dark-border focus:border-brand-500"
              }
              ${secureTextEntry ? "pr-12" : ""}
              ${className}
            `}
            {...props}
          />
          
          {secureTextEntry ? (
            <Pressable
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              className="absolute right-0 h-full justify-center px-4"
            >
              <Text variant="caption" className="font-sans-medium text-brand-500">
                {isPasswordVisible ? "HIDE" : "SHOW"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {error ? (
          <Text variant="caption" className="mt-1.5 ml-1 text-error">
            {error}
          </Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = "Input";
