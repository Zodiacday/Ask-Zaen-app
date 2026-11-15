import React, { useState } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { triggerHaptic } from '@/constants/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HapticKind = 'light' | 'medium' | 'heavy' | 'selection' | 'success';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far the control shrinks while pressed. */
  scaleTo?: number;
  /** Optional haptic fired on press. */
  haptic?: HapticKind;
}

/**
 * One press feel for the whole app: a short shrink-in, spring back, Android
 * ripple, and an optional haptic. Use this instead of TouchableOpacity.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  style,
  scaleTo = 0.97,
  haptic,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}) => {
  const [scale] = useState(() => new Animated.Value(1));

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: Platform.OS !== 'web',
      friction: toValue < 1 ? 8 : 5,
      tension: toValue < 1 ? 120 : 140,
    }).start();
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[style, { transform: [{ scale }] }]}
      android_ripple={{ color: 'rgba(62, 99, 77, 0.12)' }}
      onPressIn={(event) => {
        animateTo(scaleTo);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(1);
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic) triggerHaptic(haptic);
        onPress?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
};
