import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { cn } from '@/lib/utils';

export interface IOtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  isDark?: boolean;
  disabled?: boolean;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  isDark = false,
  disabled = false,
}: IOtpInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, length);
    onChange(cleaned);
  };

  return (
    <View className="relative w-full py-1">
      <View
        pointerEvents="none"
        className="flex-row items-center justify-between"
      >
        {Array.from({ length }).map((_, index) => {
          const char = value[index] || '';
          const isCurrent = isFocused && index === value.length;
          const isLastFilled =
            isFocused && value.length === length && index === length - 1;
          const isActive = isCurrent || isLastFilled;

          return (
            <View
              key={index}
              className={cn(
                'h-13 w-12 items-center justify-center rounded-xl border',
                isDark
                  ? 'border-slate-700 bg-slate-800/80'
                  : 'border-slate-200 bg-slate-50',
                isActive &&
                  (isDark
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-blue-600 bg-blue-50/50'),
                char &&
                  !isActive &&
                  (isDark ? 'border-slate-600' : 'border-slate-300'),
              )}
            >
              <Text
                className={cn(
                  'text-xl font-bold',
                  isDark ? 'text-white' : 'text-slate-900',
                )}
              >
                {char}
              </Text>
            </View>
          );
        })}
      </View>

      <TextInput
        value={value}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        maxLength={length}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        caretHidden
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        editable={!disabled}
        style={styles.hiddenInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.01,
    color: 'transparent',
  },
});
