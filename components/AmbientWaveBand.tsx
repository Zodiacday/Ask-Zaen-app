import React from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type AmbientWaveBandProps = {
  style?: StyleProp<ViewStyle>;
};

/**
 * A static, lightweight echo of the Home wave for utility screens. Keeping it
 * as SVG avoids another animated GL surface while retaining the Zaen cue.
 */
export function AmbientWaveBand({ style }: AmbientWaveBandProps) {
  const { width } = useWindowDimensions();
  const waveHeight = width >= 900 ? 320 : width >= 600 ? 280 : 220;

  return (
    <Svg
      pointerEvents="none"
      style={[styles.band, { height: waveHeight }, style]}
      viewBox="0 0 100 260"
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="ambientWavePrimary" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#707552" stopOpacity="0.11" />
          <Stop offset="0.68" stopColor="#707552" stopOpacity="0.07" />
          <Stop offset="1" stopColor="#707552" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="ambientWaveSecondary" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A7B392" stopOpacity="0.12" />
          <Stop offset="0.7" stopColor="#A7B392" stopOpacity="0.065" />
          <Stop offset="1" stopColor="#A7B392" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Path
        d="M0 88 C17 30 36 134 57 72 C75 20 86 46 100 88 L100 260 L0 260 Z"
        fill="url(#ambientWavePrimary)"
      />
      <Path
        d="M0 134 C18 74 39 168 61 116 C78 74 89 98 100 138 L100 260 L0 260 Z"
        fill="url(#ambientWaveSecondary)"
      />
      <Path
        d="M0 88 C17 30 36 134 57 72 C75 20 86 46 100 88"
        fill="none"
        stroke="#707552"
        strokeOpacity={0.2}
        strokeWidth={1.1}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
});

export default AmbientWaveBand;
