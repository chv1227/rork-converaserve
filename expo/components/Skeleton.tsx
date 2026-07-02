import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Radius } from '@/constants/designTokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

/** A single shimmering skeleton placeholder. */
export function Skeleton({ width = '100%', height = 16, borderRadius = Radius.sm, style }: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** A skeleton card with image, title, and text lines. */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <View style={styles.card}>
      <Skeleton height={160} borderRadius={Radius.md} />
      <View style={styles.cardBody}>
        <Skeleton width="70%" height={20} />
        <Skeleton width="100%" height={14} />
        {lines > 1 && <Skeleton width="85%" height={14} />}
        {lines > 2 && <Skeleton width="50%" height={14} />}
      </View>
    </View>
  );
}

/** A skeleton row for lists (e.g., conversations, members). */
export function SkeletonRow({ withAvatar = true }: { withAvatar?: boolean }) {
  return (
    <View style={styles.row}>
      {withAvatar && <Skeleton width={48} height={48} borderRadius={24} />}
      <View style={styles.rowContent}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="85%" height={13} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  cardBody: {
    paddingTop: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowContent: {
    flex: 1,
    gap: 6,
  },
});
