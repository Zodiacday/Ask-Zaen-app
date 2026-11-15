import React, { useEffect, useState } from 'react';
import { Animated, Platform, StyleProp, ViewStyle } from 'react-native';

interface RevealProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Starting vertical offset in pixels. Negative values drop in from above. */
  offset?: number;
  duration?: number;
}

/**
 * Mount-only fade + rise. Wrap conditionally rendered content with it — the
 * dropdown, disclosures, expanded episode rows, empty states.
 */
export const Reveal: React.FC<RevealProps> = ({
  children,
  style,
  offset = 6,
  duration = 150,
}) => {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [duration, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [offset, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
