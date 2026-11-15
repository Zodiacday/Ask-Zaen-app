import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  getLocalRotationDay,
  type RotationContext,
  type RotationExposure,
  type RotationSurface,
} from './contentRotation';

const STORAGE_KEY = '@zaen_rotation_v1';
const STORAGE_VERSION = 1;
const EXPOSURE_RETENTION_DAYS = 7;
const MAX_EXPOSURES_PER_DAY = 500;

type RotationStore = {
  version: typeof STORAGE_VERSION;
  installSeed: string;
  exposures: RotationExposure[];
};

export type ContentRotationState = RotationContext & {
  ready: boolean;
  markShown: (ids: readonly number[]) => void;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fallbackSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function pruneExposures(exposures: readonly RotationExposure[], dayKey: string): RotationExposure[] {
  const kept = exposures.filter((entry) => {
    const current = Date.parse(`${dayKey}T00:00:00`);
    const exposure = Date.parse(`${entry.dayKey}T00:00:00`);
    if (!Number.isFinite(current) || !Number.isFinite(exposure)) return false;
    const age = Math.floor((current - exposure) / 86_400_000);
    return age >= 0 && age < EXPOSURE_RETENTION_DAYS;
  });

  const byDay = new Map<string, RotationExposure[]>();
  for (const entry of kept) {
    const dayItems = byDay.get(entry.dayKey) ?? [];
    if (dayItems.length < MAX_EXPOSURES_PER_DAY) dayItems.push(entry);
    byDay.set(entry.dayKey, dayItems);
  }

  return Array.from(byDay.values()).flat();
}

async function createSeed(): Promise<string> {
  try {
    return bytesToHex(await Crypto.getRandomBytesAsync(16));
  } catch {
    return fallbackSeed();
  }
}

export function useContentRotation(
  surface: RotationSurface,
  filterKey: string = ''
): ContentRotationState {
  const [dayKey, setDayKey] = useState(() => getLocalRotationDay());
  const [store, setStore] = useState<RotationStore | null>(null);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      const currentDay = getLocalRotationDay();
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        const valid =
          parsed &&
          parsed.version === STORAGE_VERSION &&
          typeof parsed.installSeed === 'string' &&
          Array.isArray(parsed.exposures);

        const nextStore: RotationStore = valid
          ? {
              version: STORAGE_VERSION,
              installSeed: parsed.installSeed,
              exposures: pruneExposures(parsed.exposures, currentDay),
            }
          : {
              version: STORAGE_VERSION,
              installSeed: await createSeed(),
              exposures: [],
            };

        if (!mounted) return;
        setDayKey(currentDay);
        setStore(nextStore);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
      } catch {
        if (mounted) {
          setStore({
            version: STORAGE_VERSION,
            installSeed: fallbackSeed(),
            exposures: [],
          });
        }
      }
    };

    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const nextDay = getLocalRotationDay();
      setDayKey((currentDay) => (currentDay === nextDay ? currentDay : nextDay));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const markShown = useCallback((ids: readonly number[]) => {
    if (ids.length === 0) return;

    setStore((current) => {
      if (!current) return current;

      const currentDay = getLocalRotationDay();
      const existing = new Set(current.exposures.map((entry) => `${entry.dayKey}:${entry.id}`));
      const additions: RotationExposure[] = [];
      for (const id of ids) {
        if (!Number.isInteger(id) || id <= 0 || additions.length >= MAX_EXPOSURES_PER_DAY) continue;
        const key = `${currentDay}:${id}`;
        if (existing.has(key)) continue;
        existing.add(key);
        additions.push({ id, dayKey: currentDay });
      }

      // Do not return a new store when everything is already recorded. This
      // keeps exposure-reporting effects from creating a render loop.
      if (additions.length === 0) return current;

      const nextStore: RotationStore = {
        ...current,
        exposures: pruneExposures([...current.exposures, ...additions], currentDay),
      };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStore));
      return nextStore;
    });
  }, []);

  return useMemo(
    () => ({
      dayKey,
      installSeed: store?.installSeed ?? 'askzaen-local-seed',
      surface,
      filterKey,
      exposures: store?.exposures ?? [],
      ready: store !== null,
      markShown,
    }),
    [dayKey, filterKey, markShown, store, surface]
  );
}

