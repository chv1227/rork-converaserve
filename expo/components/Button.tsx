import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  Animated,
  Platform,
} from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Radius } from '@/constants/designTokens';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export default function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: Platform.OS !== 'web',
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scale]);

  // Size tokens
  const sizeStyles: Record<string, { py: number; px: number; fontSize: number }> = {
    sm: { py: 8, px: 16, fontSize: 13 },
    md: { py: 12, px: 20, fontSize: 15 },
    lg: { py: 16, px: 24, fontSize: 17 },
  };
  const s = sizeStyles[size];

  // Variant colors
  const variantStyles = {
    primary: {
      bg: colors.primary,
      text: colors.textInverse,
      border: 'transparent',
      spinner: colors.textInverse,
    },
    secondary: {
      bg: colors.surfaceSecondary,
      text: colors.text,
      border: 'transparent',
      spinner: colors.textSecondary,
    },
    outline: {
      bg: 'transparent',
      text: colors.primary,
      border: colors.border,
      spinner: colors.primary,
    },
    ghost: {
      bg: 'transparent',
      text: colors.primary,
      border: 'transparent',
      spinner: colors.primary,
    },
    danger: {
      bg: colors.error,
      text: colors.textInverse,
      border: 'transparent',
      spinner: colors.textInverse,
    },
  };
  const v = variantStyles[variant];

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={{ transform: [{ scale }], alignSelf: fullWidth ? 'stretch' : 'flex-start' }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        disabled={isDisabled}
        style={[
          styles.base,
          {
            backgroundColor: v.bg,
            paddingVertical: s.py,
            paddingHorizontal: s.px,
            borderRadius: Radius.md,
            borderWidth: variant === 'outline' ? 1.5 : 0,
            borderColor: v.border,
            opacity: isDisabled ? 0.5 : 1,
          },
          fullWidth && { alignSelf: 'stretch', justifyContent: 'center' },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={v.spinner} />
        ) : (
          <>
            {icon}
            {typeof children === 'string' ? (
              <Text
                style={[
                  styles.text,
                  { color: v.text, fontSize: s.fontSize },
                  icon ? { marginLeft: 8 } : null,
                ]}
              >
                {children}
              </Text>
            ) : (
              children
            )}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: {
    fontWeight: '600' as const,
  },
});
