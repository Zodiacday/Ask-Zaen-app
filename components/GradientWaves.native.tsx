import React, { useEffect, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { GLView } from 'expo-gl';
import { CalmColors } from '@/constants/Colors';
import type { GradientWavesProps } from './GradientWaves';
import { FRAGMENT, MAX_SWELLS, VERTEX } from './GradientWaves.web';

type RGB = [number, number, number];

type NativeSettings = {
  horizon: RGB;
  wave: RGB;
  crest: RGB;
  paper: RGB | null;
  lightMode: boolean;
  speed: number;
  amplitude: number;
  waveScale: number;
  waveRatio: number;
  swell: number;
  turbulence: number;
  tilt: number;
  zoom: number;
  height: number;
  fogDepth: number;
  relief: number;
  lightAngle: number;
  sheen: number;
  brightness: number;
  opacity: number;
  grain: number;
  steps: number;
  intro: boolean;
  paused: boolean;
};

const QUALITY: Record<string, number> = { low: 56, medium: 84, high: 120 };
const INTRO_SECONDS = 2.6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function parseColor(value: string | undefined, fallback: RGB | null): RGB | null {
  if (!value || value === 'transparent') return null;
  const hex = value.trim().replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const number = parseInt(hex, 16);
    return [((number >> 16) & 255) / 255, ((number >> 8) & 255) / 255, (number & 255) / 255];
  }
  const match = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s]+([\d.]+))?\s*\)$/i.exec(value);
  if (!match) return fallback;
  if (match[4] !== undefined && Number(match[4]) === 0) return null;
  return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
}

function buildSettings(props: GradientWavesProps): NativeSettings {
  return {
    horizon: parseColor(props.horizonColor, [0.21, 0.24, 0.14]) ?? [0.21, 0.24, 0.14],
    wave: parseColor(props.waveColor, [0.44, 0.46, 0.32]) ?? [0.44, 0.46, 0.32],
    crest: parseColor(props.crestColor, [0.98, 0.97, 0.96]) ?? [0.98, 0.97, 0.96],
    paper: parseColor(props.backgroundColor, null),
    lightMode: props.lightMode ?? true,
    speed: props.speed ?? 0.2,
    amplitude: Math.max(0, props.amplitude ?? 1.8),
    waveScale: Math.max(0.01, props.waveScale ?? 0.5),
    waveRatio: Math.max(0.01, props.waveRatio ?? 0.9),
    swell: props.swell ?? 28,
    turbulence: props.turbulence ?? 16,
    tilt: (clamp(props.tilt ?? 62, 10, 85) * Math.PI) / 180,
    zoom: Math.max(0.05, props.zoom ?? 1),
    height: props.height ?? 5.5,
    fogDepth: Math.max(0.5, props.fogDepth ?? 15),
    relief: clamp(props.relief ?? 0.7, 0, 1),
    lightAngle: ((props.lightAngle ?? 120) * Math.PI) / 180,
    sheen: Math.max(0, props.sheen ?? 0.15),
    brightness: Math.max(0, props.brightness ?? 1),
    opacity: clamp(props.opacity ?? 1, 0, 1),
    grain: typeof props.grain === 'number' ? Math.max(0, props.grain) : props.grain ? 0.05 : 0.04,
    steps: QUALITY[props.quality ?? 'medium'] ?? QUALITY.medium,
    intro: props.intro ?? true,
    paused: props.paused ?? false,
  };
}

function compile(gl: any, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Ask Zaen native wave shader failed to compile:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function GradientWaves({
  backgroundColor = CalmColors.canvasPrimary,
  style,
  ...props
}: GradientWavesProps) {
  const settingsRef = useRef<NativeSettings>(buildSettings({ backgroundColor, ...props }));
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    settingsRef.current = buildSettings({ backgroundColor, ...props });
  }, [backgroundColor, props]);

  useEffect(() => () => cleanupRef.current?.(), []);

  const onContextCreate = (gl: any) => {
    cleanupRef.current?.();

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();

    if (!vertex || !fragment || !program) {
      gl.clearColor(0.98, 0.97, 0.96, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.endFrameEXP();
      return;
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Ask Zaen native wave program failed to link:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    const uniformNames = [
      'uResolution', 'uTime', 'uClock', 'uAmplitude', 'uWaveScale', 'uWaveRatio',
      'uSwell', 'uTurbulence', 'uHeight', 'uTilt', 'uZoom', 'uLook', 'uFogDepth',
      'uBrightness', 'uOpacity', 'uGrain', 'uHorizon', 'uWave', 'uCrest', 'uBackground',
      'uOpaque', 'uLight', 'uSun', 'uRelief', 'uSheen', 'uSteps', 'uStride', 'uIntro',
      'uSwells', 'uSwellWidth',
    ];
    const uniforms: Record<string, any> = {};
    uniformNames.forEach((name) => {
      uniforms[name] = gl.getUniformLocation(program, name);
    });

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const state = { raf: 0, last: 0, clock: 0, time: 0, introAt: -1 };
    const swellData = new Float32Array(MAX_SWELLS * 3);

    const render = (now: number) => {
      const settings = settingsRef.current;
      const dt = state.last ? Math.min((now - state.last) / 1000, 0.1) : 0;
      state.last = now;
      state.clock += dt;
      if (state.introAt < 0) state.introAt = state.clock;
      if (!settings.paused) state.time += dt * settings.speed;

      const width = Math.max(1, gl.drawingBufferWidth || 1);
      const height = Math.max(1, gl.drawingBufferHeight || 1);
      gl.viewport(0, 0, width, height);
      gl.useProgram(program);
      gl.uniform2f(uniforms.uResolution, width, height);
      gl.uniform1f(uniforms.uTime, state.time);
      gl.uniform1f(uniforms.uClock, state.clock);
      gl.uniform1f(uniforms.uAmplitude, settings.amplitude);
      gl.uniform1f(uniforms.uWaveScale, settings.waveScale);
      gl.uniform1f(uniforms.uWaveRatio, settings.waveRatio);
      gl.uniform1f(uniforms.uSwell, settings.swell);
      gl.uniform1f(uniforms.uTurbulence, settings.turbulence);
      gl.uniform1f(uniforms.uHeight, settings.height);
      gl.uniform1f(uniforms.uTilt, settings.tilt);
      gl.uniform1f(uniforms.uZoom, settings.zoom);
      gl.uniform2f(uniforms.uLook, 0, 0);
      gl.uniform1f(uniforms.uFogDepth, settings.fogDepth);
      gl.uniform1f(uniforms.uBrightness, settings.brightness);
      gl.uniform1f(uniforms.uOpacity, settings.opacity);
      gl.uniform1f(uniforms.uGrain, settings.grain);
      gl.uniform3fv(uniforms.uHorizon, settings.horizon);
      gl.uniform3fv(uniforms.uWave, settings.wave);
      gl.uniform3fv(uniforms.uCrest, settings.crest);

      const paper = settings.paper ?? [0.98, 0.97, 0.96];
      gl.uniform3f(uniforms.uBackground, paper[0], paper[1], paper[2]);
      gl.uniform1f(uniforms.uOpaque, settings.paper ? 1 : 0);
      gl.uniform1f(uniforms.uLight, settings.lightMode ? 1 : 0);
      const elevation = 0.52;
      const altitude = elevation;
      const angle = settings.lightAngle;
      gl.uniform3f(uniforms.uSun, Math.cos(altitude) * Math.cos(angle), Math.cos(altitude) * Math.sin(angle), Math.sin(altitude));
      gl.uniform1f(uniforms.uRelief, settings.relief);
      gl.uniform1f(uniforms.uSheen, settings.sheen);
      gl.uniform1f(uniforms.uSteps, settings.steps);

      const slope = settings.amplitude * (
        (settings.waveScale / 7) * (1 + Math.abs(settings.swell) / 20) +
        ((settings.waveScale * settings.waveRatio) / 3) * (1 + Math.abs(settings.turbulence) / 23)
      );
      const progress = settings.intro ? clamp((state.clock - state.introAt) / INTRO_SECONDS, 0, 1) : 1;
      const shown = Math.min(1, progress / 0.22);
      const shownSmooth = shown * shown * (3 - 2 * shown);
      const crest = 160 * Math.pow(3 / 160, easeInOut(Math.max(0, (progress - 0.1) / 0.9)));
      const settle = clamp((progress - 0.75) / 0.25, 0, 1);
      const settleSmooth = settle * settle * (3 - 2 * settle);
      gl.uniform3f(uniforms.uIntro, shownSmooth, crest, 1 - settleSmooth);
      swellData.fill(0);
      gl.uniform3fv(uniforms.uSwells, swellData);
      gl.uniform1f(uniforms.uSwellWidth, 8);
      gl.uniform1f(uniforms.uStride, 0.9 / Math.max(1, slope / 1.5));

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.endFrameEXP();
      state.raf = requestAnimationFrame(render);
    };

    state.raf = requestAnimationFrame(render);
    cleanupRef.current = () => {
      cancelAnimationFrame(state.raf);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  };

  return (
    <GLView
      style={[styles.container, { backgroundColor }, style as StyleProp<ViewStyle>]}
      pointerEvents="none"
      msaaSamples={0}
      onContextCreate={onContextCreate}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});

export default GradientWaves;
