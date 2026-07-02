import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Radius, Shadow } from '@/constants/designTokens';

interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: number;
  radius?: number;
  style?: ViewStyle;
}

export default function Card({
  children,
  variant = 'elevated',
  padding = 16,
  radius = Radius.lg,
  style,
}: CardProps) {
  const { colors } = useTheme();

  const bgColor =
    variant === 'filled' ? colors.surfaceSecondary : colors.surface;

  const borderProps =
    variant === 'outlined'
      ? { borderWidth: 1, borderColor: colors.border }
      : {};

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: bgColor,
          borderRadius: radius,
          padding,
        },
        variant === 'elevated' && Shadow.md,
        borderProps,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
