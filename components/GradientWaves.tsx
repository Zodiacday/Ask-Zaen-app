import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface GradientWavesProps {
  horizonColor?: string;
  waveColor?: string;
  crestColor?: string;
  backgroundColor?: string;
  lightMode?: boolean;
  speed?: number;
  amplitude?: number;
  waveScale?: number;
  waveRatio?: number;
  swell?: number;
  turbulence?: number;
  tilt?: number;
  zoom?: number;
  height?: number;
  fogDepth?: number;
  relief?: number;
  lightAngle?: number;
  sheen?: number;
  brightness?: number;
  opacity?: number;
  grain?: number;
  quality?: 'low' | 'medium' | 'high';
  intro?: boolean;
  mouseInteraction?: boolean;
  parallaxStrength?: number;
  mouseStrength?: number;
  swellOnClick?: boolean;
  paused?: boolean;
  dpr?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Native iOS/Android fallback for GradientWaves.
 * On Expo Web, Metro automatically resolves `GradientWaves.web.tsx` for the full WebGL2 shader.
 */
export function GradientWaves({
  horizonColor = '#353E23',
  waveColor = '#707552',
  crestColor = '#FAF8F5',
  backgroundColor = '#FAF8F5',
  style,
}: GradientWavesProps) {
  return (
    <View style={[styles.container, { backgroundColor }, style]} pointerEvents="none">
      <LinearGradient
        colors={[horizonColor, waveColor, crestColor]}
        locations={[0, 0.45, 1.0]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});

export default GradientWaves;
