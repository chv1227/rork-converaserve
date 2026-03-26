import React, { useRef, useCallback } from 'react';
import { Animated, Pressable, ViewStyle, PressableProps, Platform } from 'react-native';

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  scaleValue?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AnimatedPressableComponent({ 
  children, 
  style, 
  scaleValue = 0.97,
  onPressIn,
  onPressOut,
  ...props 
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback((e: any) => {
    Animated.spring(scale, {
      toValue: scaleValue,
      useNativeDriver: Platform.OS !== 'web',
      speed: 50,
      bounciness: 4,
    }).start();
    onPressIn?.(e);
  }, [scale, scaleValue, onPressIn]);

  const handlePressOut = useCallback((e: any) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
      speed: 50,
      bounciness: 4,
    }).start();
    onPressOut?.(e);
  }, [scale, onPressOut]);

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
