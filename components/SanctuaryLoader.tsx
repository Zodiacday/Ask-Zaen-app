import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { CalmColors } from '@/constants/Colors';
import { triggerHaptic } from '@/constants/haptics';

const LOADER_ACORN = require('@/assets/icons/loader_acorn.png');
const LOADER_PAW = require('@/assets/icons/loader_paw.png');

export interface SanctuaryLoaderProps {
  onFinish: () => void;
  fontsLoaded?: boolean;
  realProgress?: number;
  bootReady?: boolean;
  jumperType?: 'acorn' | 'paw';
}

const SVG_W = 296;
const SVG_H = 76;
const BASE_Y = 36;
const X0 = 22;
const X2 = 274;
const LINE_STROKE = 8;

const easeInOutCubic = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

// C1-continuous cubic Hermite bridge matching both position and velocity at p=0 and p=1
function hermite(p: number, y0: number, v0: number, y1: number, v1: number): number {
  const p2 = p * p;
  const p3 = p2 * p;
  return (
    (2 * p3 - 3 * p2 + 1) * y0 +
    (p3 - 2 * p2 + p) * v0 +
    (-2 * p3 + 3 * p2) * y1 +
    (p3 - p2) * v1
  );
}

// Smooth C1 airborne stretch: sLaunch at liftoff -> 0 at rounded apex -> sLand at touchdown
function flightStretch(p: number, sLaunch: number, sLand: number): number {
  const q = 2 * p - 1;
  return q < 0 ? sLaunch * q * q : sLand * q * q;
}

// Exact De Casteljau subdivision [0..s] of a 2D cubic Bezier curve
function subdivideCubic(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  x3: number, y3: number,
  s: number
): string {
  const q0x = x0 + s * (x1 - x0);
  const q0y = y0 + s * (y1 - y0);
  const q1x = x1 + s * (x2 - x1);
  const q1y = y1 + s * (y2 - y1);
  const q2x = x2 + s * (x3 - x2);
  const q2y = y2 + s * (y3 - y2);

  const r0x = q0x + s * (q1x - q0x);
  const r0y = q0y + s * (q1y - q0y);
  const r1x = q1x + s * (q2x - q1x);
  const r1y = q1y + s * (q2y - q1y);

  const tx = r0x + s * (r1x - r0x);
  const ty = r0y + s * (r1y - r0y);

  return `C ${q0x.toFixed(2)} ${q0y.toFixed(2)}, ${r0x.toFixed(2)} ${r0y.toFixed(2)}, ${tx.toFixed(2)} ${ty.toFixed(2)}`;
}

interface FrameState {
  u: number;          // 0..1 progress along track
  bendU: number;      // 0..1 exact horizontal locus of elastic pocket
  stringDip: number;  // px vertical deflection at bendU
  airborneY: number;  // px altitude above the line (<= 0)
  scaleX: number;
  scaleY: number;
  tilt: number;       // degrees
}

type EnginePhase = 'COIL' | 'LAUNCH' | 'FLIGHT' | 'CATCH' | 'SETTLE';
type SimProfile = 'real' | 'fast' | 'normal' | 'slow3g';

interface LaunchFlightParams {
  uPocket: number;
  vPocket: number;
  dipBot: number;
  sBot: number;
  tiltBot: number;
  uLaunchEnd: number;
  uLand: number;
  isFinale: boolean;
  durFlight: number;
  vLaunch: number;
  vLand: number;
  apexH: number;
  sLaunch: number;
  sLand: number;
  tiltLaunch: number;
  tiltLand: number;
}

interface CatchParams {
  uLand: number;
  vLand: number;
  uPocket: number;
  vMid: number;
  dipBot: number;
  sLand: number;
  sBot: number;
  tiltLand: number;
  tiltBot: number;
}

interface SettleParams {
  sLand: number;
  tiltLand: number;
}

class AdaptiveHopEngine {
  phase: EnginePhase = 'COIL';
  t0 = 0;
  dur = 0.22;
  hopIndex = 0;
  settledAt: number | null = null;

  launchFlight: LaunchFlightParams | null = null;
  catchData: CatchParams | null = null;
  settleData: SettleParams | null = null;

  planLaunch(
    tStart: number,
    uPocket: number,
    vPocket: number,
    dipBot: number,
    sBot: number,
    tiltBot: number,
    progress: number,
    ready: boolean
  ) {
    let uLand: number;
    let isFinale = false;

    if (ready && this.hopIndex >= 1) {
      const rem = 1.0 - uPocket;
      if (rem <= 0.56) {
        uLand = 1.0;
        isFinale = true;
      } else {
        uLand = uPocket + rem * 0.52;
      }
    } else if (ready && this.hopIndex === 0) {
      // Minimum 2 crisp hops on instant cached reloads so motion feels intentional
      uLand = 0.48;
    } else {
      // Chase real app progress (capped at 90% until bootReady unlocks 100%)
      const ceiling = Math.min(0.90, Math.max(uPocket, progress));
      const headroom = Math.max(0, ceiling - uPocket);
      const delta = Math.min(0.36, headroom * 0.85);
      uLand = Math.min(0.90, uPocket + delta);
    }

    const durLaunch = 0.105;
    let uLaunchEnd = uPocket + (uLand - uPocket) * 0.08;
    if (isFinale) {
      uLaunchEnd = Math.min(0.98, uLaunchEnd);
    }

    const fDelta = Math.max(0, uLand - uLaunchEnd);
    const durFlight = 0.43 + 0.34 * fDelta;
    const vLaunch = isFinale
      ? Math.max(0.12, (fDelta / durFlight) * 1.32)
      : fDelta / durFlight;
    const vLand = isFinale ? 0.05 : vLaunch;

    this.phase = 'LAUNCH';
    this.t0 = tStart;
    this.dur = durLaunch;
    this.launchFlight = {
      uPocket,
      vPocket,
      dipBot,
      sBot,
      tiltBot,
      uLaunchEnd,
      uLand,
      isFinale,
      durFlight,
      vLaunch,
      vLand,
      apexH: 24.0 + 68.0 * fDelta,
      sLaunch: 0.12 + 0.16 * fDelta,
      sLand: 0.08 + 0.10 * fDelta,
      tiltLaunch: 3.0 + 28.0 * fDelta,
      tiltLand: -(2.5 + 16.0 * fDelta),
    };
  }

  step(t: number, progress: number, ready: boolean): FrameState {
    let u = 0.04;
    let bendU = 0.04 * 0.955;
    let stringDip = 0;
    let airborneY = 0;
    let s = 0;
    let tilt = 0;

    // Advance state machine across any completed sub-phases
    for (let guard = 0; guard < 8; guard++) {
      if (this.phase === 'COIL') {
        if (t >= this.t0 + this.dur) {
          this.planLaunch(this.t0 + this.dur, 0.04, 0, 11.0, -0.20, -6.0, progress, ready);
          continue;
        }
        const p = Math.max(0, (t - this.t0) / this.dur);
        const c = 0.5 * (1 - Math.cos(Math.PI * p));
        u = 0.04;
        bendU = u * 0.955;
        stringDip = 11.0 * c;
        airborneY = 0;
        s = -0.20 * c;
        tilt = -6.0 * c;
        break;
      }

      if (this.phase === 'LAUNCH' && this.launchFlight) {
        const P = this.launchFlight;
        if (t >= this.t0 + this.dur) {
          this.phase = 'FLIGHT';
          this.t0 = this.t0 + this.dur;
          this.dur = P.durFlight;
          continue;
        }
        const p = (t - this.t0) / this.dur;
        const ease = 0.5 * (1 - Math.cos(Math.PI * p));
        u = hermite(p, P.uPocket, P.vPocket * this.dur, P.uLaunchEnd, P.vLaunch * this.dur);
        bendU = u * 0.955;
        stringDip = P.dipBot * Math.cos(0.5 * Math.PI * p);
        airborneY = 0;
        s = P.sBot + (P.sLaunch - P.sBot) * ease;
        tilt = P.tiltBot + (P.tiltLaunch - P.tiltBot) * ease;
        break;
      }

      if (this.phase === 'FLIGHT' && this.launchFlight) {
        const P = this.launchFlight;
        if (t >= this.t0 + this.dur) {
          const tEnd = this.t0 + this.dur;
          this.hopIndex += 1;

          if (P.isFinale) {
            this.phase = 'SETTLE';
            this.t0 = tEnd;
            this.settledAt = tEnd;
            this.settleData = { sLand: P.sLand, tiltLand: P.tiltLand };
          } else {
            const durCatch = 0.095;
            const glide = Math.min(0.028, P.vLand * durCatch * 0.55);
            const uNextPocket = Math.min(0.91, P.uLand + glide);
            const vMid = ((uNextPocket - P.uLand) / durCatch) * 0.5;
            const fSpd = Math.min(0.45, P.vLand * 0.5);

            this.phase = 'CATCH';
            this.t0 = tEnd;
            this.dur = durCatch;
            this.catchData = {
              uLand: P.uLand,
              vLand: P.vLand,
              uPocket: uNextPocket,
              vMid,
              dipBot: 12.5 + 8.0 * fSpd,
              sLand: P.sLand,
              sBot: -(0.20 + 0.12 * fSpd),
              tiltLand: P.tiltLand,
              tiltBot: -2.0,
            };
          }
          continue;
        }

        const dt = t - this.t0;
        const p = dt / this.dur;
        u = P.isFinale
          ? hermite(p, P.uLaunchEnd, P.vLaunch * this.dur, 1.0, P.vLand * this.dur)
          : P.uLaunchEnd + (P.uLand - P.uLaunchEnd) * p;
        bendU = P.uLaunchEnd * 0.955;
        const amp = 4.5 + 7.5 * (P.uLand - P.uLaunchEnd);
        stringDip = -amp * Math.exp(-8.5 * dt) * Math.sin(24.0 * dt) * (1 - p * p);
        airborneY = -P.apexH * 4 * p * (1 - p);
        s = flightStretch(p, P.sLaunch, P.sLand);
        tilt = P.tiltLaunch * (1 - p) + P.tiltLand * p;
        break;
      }

      if (this.phase === 'CATCH' && this.catchData) {
        const C = this.catchData;
        if (t >= this.t0 + this.dur) {
          this.planLaunch(
            this.t0 + this.dur,
            C.uPocket,
            C.vMid,
            C.dipBot,
            C.sBot,
            C.tiltBot,
            progress,
            ready
          );
          continue;
        }
        const p = (t - this.t0) / this.dur;
        const ease = 0.5 * (1 - Math.cos(Math.PI * p));
        u = hermite(p, C.uLand, C.vLand * this.dur, C.uPocket, C.vMid * this.dur);
        bendU = u * 0.955;
        stringDip = C.dipBot * Math.sin(0.5 * Math.PI * p);
        airborneY = 0;
        s = C.sLand + (C.sBot - C.sLand) * ease;
        tilt = C.tiltLand + (C.tiltBot - C.tiltLand) * ease;
        break;
      }

      // SETTLE at 100%
      const S = this.settleData ?? { sLand: 0.12, tiltLand: -8.0 };
      const dt = Math.max(0, t - this.t0);
      u = 1.0;
      bendU = 0.955;
      stringDip = 15.0 * Math.exp(-5.8 * dt) * Math.sin(19.5 * dt);
      airborneY = 0;
      s = S.sLand * Math.exp(-18.0 * dt) - 0.24 * Math.exp(-5.8 * dt) * Math.sin(19.5 * dt);
      tilt = S.tiltLand * Math.exp(-9.0 * dt) * Math.cos(19.5 * dt);
      break;
    }

    const scaleY = 1 + s;
    const scaleX = 1 / Math.sqrt(Math.max(0.5, scaleY));

    return {
      u,
      bendU,
      stringDip,
      airborneY,
      scaleX,
      scaleY,
      tilt,
    };
  }
}

export const SanctuaryLoader: React.FC<SanctuaryLoaderProps> = ({
  onFinish,
  fontsLoaded = true,
  realProgress = 0,
  bootReady = false,
  jumperType: initialJumperType = 'paw',
}) => {
  // Studio inspection mode is opt-in via ?hold=1 or ?studio=1; normal launches auto-open.
  // Read this once per loader mount so animation renders cannot recreate the loop.
  const [shouldHold] = useState(
    () =>
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      (window.location.search.includes('hold=1') ||
        window.location.search.includes('studio=1'))
  );

  const [activeJumper, setActiveJumper] = useState<'acorn' | 'paw'>(initialJumperType);
  const [simProfile, setSimProfile] = useState<SimProfile>('real');
  const [playId, setPlayId] = useState(0);
  const [frame, setFrame] = useState<FrameState>(() => new AdaptiveHopEngine().step(0, 0, false));
  const [fadeOpacity, setFadeOpacity] = useState(1);

  const realProgressRef = useRef(realProgress);
  const bootReadyRef = useRef(bootReady);
  const simProfileRef = useRef(simProfile);
  const shouldHoldRef = useRef(shouldHold);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    realProgressRef.current = realProgress;
  }, [realProgress]);

  useEffect(() => {
    bootReadyRef.current = bootReady;
  }, [bootReady]);

  useEffect(() => {
    simProfileRef.current = simProfile;
  }, [simProfile]);

  useEffect(() => {
    shouldHoldRef.current = shouldHold;
  }, [shouldHold]);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const finishedRef = useRef(false);

  const dismissLoader = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    triggerHaptic('light');

    const fadeStart = performance.now();
    const fadeDuration = 360;
    const stepFade = (now: number) => {
      const p = Math.min(1, (now - fadeStart) / fadeDuration);
      setFadeOpacity(1 - easeInOutCubic(p));
      if (p < 1) {
        requestAnimationFrame(stepFade);
      } else {
        onFinishRef.current();
      }
    };
    requestAnimationFrame(stepFade);
  }, []);

  // Master 60-120fps adaptive physics loop
  useEffect(() => {
    finishedRef.current = false;

    const engine = new AdaptiveHopEngine();
    let rafId: number;
    const fadeResetId = requestAnimationFrame(() => setFadeOpacity(1));
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) {
        startTime = now;
      }
      const elapsedSec = (now - startTime) / 1000;

      let effProgress = realProgressRef.current;
      let effReady = bootReadyRef.current;

      // Optional network simulation profiles when testing in ?hold=1 studio mode
      const activeProfile = simProfileRef.current;
      if (activeProfile === 'fast') {
        effProgress = Math.min(1, elapsedSec / 0.08);
        effReady = elapsedSec >= 0.08;
      } else if (activeProfile === 'normal') {
        effProgress = Math.min(1, elapsedSec / 2.2);
        effReady = elapsedSec >= 2.2;
      } else if (activeProfile === 'slow3g') {
        effProgress =
          elapsedSec < 2.6
            ? Math.min(0.32, elapsedSec * 0.25)
            : Math.min(1, 0.32 + (elapsedSec - 2.6) / 1.1);
        effReady = elapsedSec >= 3.7;
      }

      const nextFrame = engine.step(elapsedSec, effProgress, effReady);
      setFrame(nextFrame);

      // Auto-dismiss 0.45s after touching down at 100% so the spring settle completes cleanly
      if (
        !shouldHoldRef.current &&
        engine.settledAt !== null &&
        elapsedSec - engine.settledAt >= 0.45 &&
        effReady
      ) {
        dismissLoader();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(fadeResetId);
    };
  }, [playId, dismissLoader]);

  // 2-Segment Linear-X C1 Cubic Hermite String:
  // Placing control X points at 1/3 and 2/3 of each segment guarantees X(u) === X0 + u*(X2-X0)
  // identically for all bendU and stringDip — zero horizontal shift on impact.
  const span = X2 - X0;
  const b = Math.max(0.02, Math.min(0.98, frame.bendU));
  const xb = X0 + b * span;
  const yb = BASE_Y + frame.stringDip;

  const l0x = X0;
  const l0y = BASE_Y;
  const l1x = X0 + (xb - X0) / 3;
  const l1y = BASE_Y;
  const l2x = X0 + (2 * (xb - X0)) / 3;
  const l2y = yb;
  const l3x = xb;
  const l3y = yb;

  const r1x = xb + (X2 - xb) / 3;
  const r1y = yb;
  const r2x = xb + (2 * (X2 - xb)) / 3;
  const r2y = BASE_Y;
  const r3x = X2;
  const r3y = BASE_Y;

  const leftSegStr = `C ${l1x.toFixed(2)} ${l1y.toFixed(2)}, ${l2x.toFixed(2)} ${l2y.toFixed(2)}, ${l3x.toFixed(2)} ${l3y.toFixed(2)}`;
  const rightSegStr = `C ${r1x.toFixed(2)} ${r1y.toFixed(2)}, ${r2x.toFixed(2)} ${r2y.toFixed(2)}, ${r3x.toFixed(2)} ${r3y.toFixed(2)}`;
  const fullTrackPath = `M ${l0x.toFixed(2)} ${l0y.toFixed(2)} ${leftSegStr} ${rightSegStr}`;

  const u = Math.max(0, Math.min(1, frame.u));
  const activeFillPath =
    u <= b
      ? `M ${l0x.toFixed(2)} ${l0y.toFixed(2)} ${subdivideCubic(l0x, l0y, l1x, l1y, l2x, l2y, l3x, l3y, u / b)}`
      : `M ${l0x.toFixed(2)} ${l0y.toFixed(2)} ${leftSegStr} ${subdivideCubic(l3x, l3y, r1x, r1y, r2x, r2y, r3x, r3y, (u - b) / (1 - b))}`;

  // Exact linear-X foot position slightly inside the leading rounded cap (jumperU <= u)
  const jumperU = u * 0.955;
  const footX = X0 + jumperU * span;
  let footY: number;
  if (jumperU <= b) {
    const sL = jumperU / b;
    const inv = 1 - sL;
    footY = BASE_Y + frame.stringDip * (3 * inv * sL * sL + sL * sL * sL);
  } else {
    const sR = (jumperU - b) / (1 - b);
    const inv = 1 - sR;
    footY = BASE_Y + frame.stringDip * (inv * inv * inv + 3 * inv * inv * sR);
  }

  // Exact aspect-matched clay dimensions so bottom pixel perches cleanly on top of the line
  const jumperW = activeJumper === 'paw' ? 52 : 46;
  const jumperH = activeJumper === 'paw' ? 50 : 62;
  const altitude = Math.abs(frame.airborneY);

  const lineTopY = footY - LINE_STROKE * 0.5 + 1.2;
  const scaleFootOffset = (1 - frame.scaleY) * (jumperH * 0.5);
  const jumperLeft = footX - jumperW / 2;
  const jumperTop = lineTopY - jumperH + frame.airborneY + scaleFootOffset;

  const shadowAlpha = Math.max(0.06, 0.16 - altitude * 0.0018).toFixed(3);
  const shadowBlur = (3.5 + altitude * 0.07).toFixed(1);
  const webDropShadow =
    Platform.OS === 'web'
      ? ({
          filter: `drop-shadow(0px 3px ${shadowBlur}px rgba(44, 37, 35, ${shadowAlpha}))`,
        } as any)
      : undefined;

  const jumperSource = activeJumper === 'paw' ? LOADER_PAW : LOADER_ACORN;
  const pct = Math.round(u * 100);

  return (
    <View
      style={[styles.overlay, { opacity: fadeOpacity }]}
      pointerEvents={fadeOpacity < 0.05 ? 'none' : 'auto'}
    >
      {/* Subtle Warm Ambient Alabaster Glow */}
      <View style={styles.ambientGlowWrap} pointerEvents="none">
        <Svg width={340} height={340} viewBox="0 0 340 340">
          <Defs>
            <RadialGradient id="sanctuaryGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#EFE9DE" stopOpacity="0.55" />
              <Stop offset="65%" stopColor="#F6F2EB" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#FAF8F5" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="170" cy="170" r="170" fill="url(#sanctuaryGlow)" />
        </Svg>
      </View>

      {/* Centerpiece Stage */}
      <View style={styles.centerStage}>
        {/* Elastic SVG Loading Line & 3D Springy Jumper Arena */}
        <View style={styles.trackArena}>
          <Svg width={SVG_W} height={SVG_H} style={styles.svgLayer}>
            <Defs>
              <LinearGradient
                id="sanctuaryCordGrad"
                gradientUnits="userSpaceOnUse"
                x1={X0}
                y1={BASE_Y}
                x2={X2}
                y2={BASE_Y}
              >
                <Stop offset="0%" stopColor="#949F6E" />
                <Stop offset="52%" stopColor="#707552" />
                <Stop offset="100%" stopColor="#525738" />
              </LinearGradient>
            </Defs>

            {/* Clean Warm Oat Sandstone Unfilled Track */}
            <Path
              d={fullTrackPath}
              stroke="#E7E0D6"
              strokeWidth={LINE_STROKE}
              strokeLinecap="round"
              fill="none"
            />

            {/* Seamless Botanical Olive-Sage Active Elastic Cord */}
            <Path
              d={activeFillPath}
              stroke="url(#sanctuaryCordGrad)"
              strokeWidth={LINE_STROKE}
              strokeLinecap="round"
              fill="none"
            />
          </Svg>

          {/* 3D Springy Clay Jumper perched cleanly on the top surface of the line */}
          <View
            pointerEvents="none"
            style={[
              styles.jumperWrap,
              {
                width: jumperW,
                height: jumperH,
                left: jumperLeft,
                top: jumperTop,
                transform: [
                  { scaleX: frame.scaleX },
                  { scaleY: frame.scaleY },
                  { rotate: `${frame.tilt.toFixed(1)}deg` },
                ],
              },
              webDropShadow,
            ]}
          >
            <Image source={jumperSource} style={styles.jumperImg} resizeMode="contain" />
          </View>
        </View>

        {/* Short Modern Caption + Live Percentage */}
        <View style={styles.captionWrap}>
          <Text
            style={[
              styles.captionText,
              fontsLoaded && { fontFamily: 'Fredoka_600SemiBold' },
            ]}
          >
            Finding calm shows...
          </Text>
          <Text
            style={[
              styles.percentText,
              fontsLoaded && { fontFamily: 'Fredoka_700Bold' },
            ]}
          >
            {pct}%
          </Text>
        </View>

        {/* Opt-in Studio Simulator Controls (?hold=1 or ?studio=1) */}
        {shouldHold && (
          <View style={styles.studioWrap}>
            <View style={styles.studioControlsRow}>
              {(
                [
                  { id: 'fast', label: '⚡ Fast' },
                  { id: 'normal', label: '🌐 2.2s' },
                  { id: 'slow3g', label: '🐢 Slow 3G' },
                ] as const
              ).map((preset) => {
                const active = simProfile === preset.id;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSimProfile(preset.id);
                      setPlayId((n) => n + 1);
                    }}
                    style={[styles.replayBtn, active && styles.replayBtnActive]}
                  >
                    <Text
                      style={[
                        styles.replayBtnText,
                        active && styles.replayBtnTextActive,
                        fontsLoaded && { fontFamily: 'Fredoka_600SemiBold' },
                      ]}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.studioControlsRow}>
              <Pressable
                onPress={() => {
                  triggerHaptic('selection');
                  setActiveJumper((prev) => (prev === 'paw' ? 'acorn' : 'paw'));
                  setPlayId((n) => n + 1);
                }}
                style={styles.replayBtn}
              >
                <Ionicons
                  name={activeJumper === 'paw' ? 'leaf' : 'paw'}
                  size={14}
                  color={activeJumper === 'paw' ? CalmColors.sage : '#8B5E3C'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.replayBtnText, fontsLoaded && { fontFamily: 'Fredoka_600SemiBold' }]}>
                  {activeJumper === 'paw' ? 'Try Acorn' : 'Try Paw'}
                </Text>
              </Pressable>

              <Pressable onPress={dismissLoader} style={styles.holdContinueBtn}>
                <Text style={[styles.holdContinueText, fontsLoaded && { fontFamily: 'Fredoka_700Bold' }]}>
                  Continue →
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: CalmColors.canvasPrimary, // #FAF8F5 warm alabaster
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 9999,
  },
  ambientGlowWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  trackArena: {
    width: SVG_W,
    height: SVG_H,
    marginTop: 44,
    position: 'relative',
  },
  svgLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  jumperWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumperImg: {
    width: '100%',
    height: '100%',
  },
  captionWrap: {
    marginTop: 12,
    alignItems: 'center',
    gap: 4,
  },
  captionText: {
    fontSize: 15.5,
    fontWeight: '600',
    color: CalmColors.textPrimary,
    letterSpacing: 0.2,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '700',
    color: CalmColors.sage,
    letterSpacing: 0.5,
  },
  studioWrap: {
    marginTop: 24,
    alignItems: 'center',
    gap: 10,
  },
  studioControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.14)',
  },
  replayBtnActive: {
    backgroundColor: 'rgba(112, 117, 82, 0.14)',
    borderColor: CalmColors.sage,
  },
  replayBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: CalmColors.textPrimary,
  },
  replayBtnTextActive: {
    color: CalmColors.sageDark,
  },
  holdContinueBtn: {
    backgroundColor: CalmColors.textPrimary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    shadowColor: '#2C2523',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  holdContinueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAF8F5',
    letterSpacing: 0.2,
  },
});
