import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { Image as ExpoImage } from 'expo-image';
import { ONBOARDING_COMPLETED_KEY } from '@/components/OnboardingModal';
import { KidsMediaItem, parseItemPoster } from '@/constants/kidsDb';
import { getHomeShelves, getLanguageFeatured } from '@/constants/mediaSource';
import { normalizeLanguage } from '@/constants/languages';

const LANGUAGE_STORAGE_KEY = '@zaen_selected_language';
const SAVED_STORAGE_KEY = '@askzaen_saved_titles';
const LEGACY_SAVED_STORAGE_KEY = '@netflix_clone_saved_movies';

const PER_BUNDLED_TIMEOUT_MS = 2200;
const PER_REMOTE_TIMEOUT_MS = 3200;
const SAFETY_CEILING_MS = 5500;

// Bundled visual modules for Onboarding path
const ONBOARDING_BUNDLED_MODULES: number[] = [
  require('@/assets/images/onboarding_nature_welcome.jpg'),
  require('@/assets/images/onboarding_nature2.jpg'),
  require('@/assets/images/onboarding_nature1.jpg'),
  require('@/assets/images/onboarding_nature3.jpg'),
  require('@/assets/images/postcard_clean_card.png'),
  require('@/assets/images/logo.png'),
  require('@/assets/icons/zaen_waving.png'),
  require('@/assets/icons/whirlwind.png'),
  require('@/assets/icons/sprout.png'),
  require('@/assets/icons/bear_baby.png'),
  require('@/assets/icons/bear_preschool.png'),
  require('@/assets/icons/bear_explorer.png'),
  require('@/assets/images/streaming/youtube.png'),
  require('@/assets/images/streaming/disney.png'),
  require('@/assets/images/streaming/pbs.png'),
  require('@/assets/images/streaming/netflix.png'),
  require('@/assets/images/streaming/apple.png'),
  require('@/assets/images/streaming/prime.png'),
  require('@/assets/images/streaming/cbeebies.png'),
];

// Bundled visual modules for direct Home path
const HOME_BUNDLED_MODULES: number[] = [
  require('@/assets/images/logo.png'),
  require('@/assets/icons/everything.png'),
  require('@/assets/icons/shows.png'),
  require('@/assets/icons/curious.png'),
  require('@/assets/icons/feelings.png'),
  require('@/assets/icons/bedtime.png'),
  require('@/assets/images/streaming/youtube.png'),
  require('@/assets/images/streaming/disney.png'),
  require('@/assets/images/streaming/netflix.png'),
  require('@/assets/images/streaming/prime.png'),
  require('@/assets/images/streaming/pbs.png'),
  require('@/assets/images/streaming/apple.png'),
  require('@/assets/images/streaming/paramount.png'),
  require('@/assets/images/streaming/cbeebies.png'),
];

export interface HydratedBootState {
  showOnboarding: boolean;
  language: string | null;
  savedMovies: KidsMediaItem[];
}

export interface AppBootStatus {
  realProgress: number;
  bootReady: boolean;
  canMountScene: boolean;
  fontsReady: boolean;
  hydratedState: HydratedBootState | null;
  markSceneLaidOut: () => void;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);

    promise
      .then((val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

async function decodeBundledModule(mod: any): Promise<void> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      let uri: string | null = null;
      if (typeof mod === 'string') {
        uri = mod;
      } else {
        const asset = Asset.fromModule(mod);
        uri = asset.uri || asset.localUri || null;
      }
      if (uri) {
        const img = new window.Image();
        img.src = uri;
        if (typeof img.decode === 'function') {
          await img.decode();
        } else {
          await new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          });
        }
      }
      return;
    }

    // Downloading the file is not enough for a native first frame. Ask
    // expo-image to decode the bundled source into its native image cache.
    await ExpoImage.loadAsync(mod);
  } catch {
    // Non-fatal fallback
  }
}

export function useAppBoot(fontsLoaded: boolean, fontError: Error | null): AppBootStatus {
  const [hydratedState, setHydratedState] = useState<HydratedBootState | null>(null);
  const [storageDone, setStorageDone] = useState(false);
  const [bundledRatio, setBundledRatio] = useState(0);
  const [bundledDone, setBundledDone] = useState(false);
  const [remoteRatio, setRemoteRatio] = useState(0);
  const [sceneLaidOut, setSceneLaidOut] = useState(false);
  const [safetyTimedOut, setSafetyTimedOut] = useState(false);


  const fontsReady = fontsLoaded || Boolean(fontError) || safetyTimedOut;

  const markSceneLaidOut = useCallback(() => {
    setSceneLaidOut(true);
  }, []);

  // Hard safety ceiling so offline / stalled image CDNs never trap the user
  useEffect(() => {
    const timer = setTimeout(() => {
      setSafetyTimedOut(true);
    }, SAFETY_CEILING_MS);
    return () => clearTimeout(timer);
  }, []);

  // Stage 1 + Stage 3 + Stage 4: Hydrate AsyncStorage, then fan out bundled decode & remote poster prefetch
  useEffect(() => {
    let cancelled = false;

    const runBootPipeline = async () => {
      let showOnboarding = false;
      let language: string | null = null;
      let savedMovies: KidsMediaItem[] = [];

      try {
        const forceResetOnWeb =
          Platform.OS === 'web' &&
          typeof window !== 'undefined' &&
          (window.location.search.includes('reset=1') ||
            window.location.search.includes('onboarding=1'));

        const [rawOnboarding, rawLang, rawSaved, rawLegacySaved] = await Promise.all([
          forceResetOnWeb
            ? AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY).then(() => null)
            : AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY),
          AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
          AsyncStorage.getItem(SAVED_STORAGE_KEY),
          AsyncStorage.getItem(LEGACY_SAVED_STORAGE_KEY),
        ]);

        showOnboarding = forceResetOnWeb || rawOnboarding !== 'true';

        if (rawLang) {
          language = normalizeLanguage(rawLang) ?? rawLang;
        }

        if (rawSaved) {
          const parsed = JSON.parse(rawSaved);
          if (Array.isArray(parsed)) savedMovies = parsed;
        } else if (rawLegacySaved) {
          const parsed = JSON.parse(rawLegacySaved);
          if (Array.isArray(parsed)) {
            savedMovies = parsed;
            AsyncStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(parsed)).catch(() => {});
          }
          AsyncStorage.removeItem(LEGACY_SAVED_STORAGE_KEY).catch(() => {});
        }
      } catch {
        // Safe defaults on storage failure
      }

      if (cancelled) return;
      setHydratedState({ showOnboarding, language, savedMovies });
      setStorageDone(true);

      // Stage 3: Bundled critical visual assets for target screen
      const targetModules = showOnboarding ? ONBOARDING_BUNDLED_MODULES : HOME_BUNDLED_MODULES;
      let completedBundled = 0;
      const totalBundled = targetModules.length || 1;

      const bundledTask = Promise.all(
        targetModules.map((mod) =>
          withTimeout(decodeBundledModule(mod), PER_BUNDLED_TIMEOUT_MS, undefined).then(() => {
            completedBundled += 1;
            if (!cancelled) {
              setBundledRatio(completedBundled / totalBundled);
            }
          })
        )
      ).then(() => {
        if (!cancelled) {
          setBundledRatio(1);
          setBundledDone(true);
        }
      });

      // Stage 4: Above-the-fold remote Hero Billboard & Shelf-1 thumbnails
      const featured = getLanguageFeatured(language).slice(0, 3);
      const shelves = getHomeShelves(language);
      const firstRowItems = shelves[0]?.items?.slice(0, 6) ?? [];

      const uniqueUrls = Array.from(
        new Set(
          [...featured, ...firstRowItems]
            .map((item) => parseItemPoster(item))
            .filter((u): u is string => Boolean(u && u.startsWith('http')))
        )
      );

      let remoteTask: Promise<void>;
      if (uniqueUrls.length === 0) {
        setRemoteRatio(1);
        remoteTask = Promise.resolve();
      } else {
        let completedRemote = 0;
        const totalRemote = uniqueUrls.length;
        remoteTask = Promise.all(
          uniqueUrls.map((url) =>
            withTimeout(ExpoImage.prefetch(url), PER_REMOTE_TIMEOUT_MS, false).then(() => {
              completedRemote += 1;
              if (!cancelled) {
                setRemoteRatio(completedRemote / totalRemote);
              }
            })
          )
        ).then(() => {
          if (!cancelled) {
            setRemoteRatio(1);
          }
        });
      }

      await Promise.all([bundledTask, remoteTask]);
    };

    runBootPipeline();

    return () => {
      cancelled = true;
    };
  }, []);

  // The first scene must not mount until its bundled visual assets have been
  // decoded. Remote catalog artwork is intentionally allowed to warm in the
  // background after this point so a slow CDN cannot block the app shell.
  // Local artwork is part of the first-frame contract. The safety timer may
  // release font/storage failures, but it must never reveal a scene before
  // the bundled image decode pass has completed.
  const criticalAssetsReady = bundledDone;
  const canMountScene = fontsReady && storageDone && hydratedState !== null && criticalAssetsReady;

  const rawWeightedProgress = safetyTimedOut
    ? 1
    : (storageDone ? 0.15 : 0.03) +
      (fontsReady ? 0.25 : 0) +
      0.25 * bundledRatio +
      0.25 * remoteRatio +
      (sceneLaidOut ? 0.10 : 0);

  const clamped = Math.max(0, Math.min(1, rawWeightedProgress));

  const bootReady = storageDone && fontsReady && bundledDone && sceneLaidOut;

  return {
    realProgress: bootReady ? 1 : clamped,
    bootReady,
    canMountScene,
    fontsReady,
    hydratedState,
    markSceneLaidOut,
  };
}
