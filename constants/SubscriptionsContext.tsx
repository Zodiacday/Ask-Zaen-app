import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KidsMediaItem, AgeTier, matchesStreamingService } from '@/constants/kidsDb';
import { normalizeStoredAgeTier } from '@/constants/ageTiers';
import { USER_PREFERRED_AGE_KEY } from '@/components/OnboardingModal';
import { triggerHaptic } from '@/constants/haptics';
import { markPreferencesUpdated } from '@/constants/preferencesStorage';

export const USER_SUBSCRIPTIONS_STORAGE_KEY = '@askzaen_user_subscriptions_v2';
export const SUGGESTED_SHOWS_STORAGE_KEY = '@askzaen_suggested_shows_v2';

export interface ShowSuggestion {
  id: string;
  title: string;
  submittedAt: number;
  status: 'reviewing' | 'added' | 'received';
  ageGroup?: string;
  note?: string;
}

export interface StreamingPlatformConfig {
  id: string;
  name: string;
  isFree?: boolean;
  description: string;
}

export const SUPPORTED_SUBSCRIPTION_PLATFORMS: StreamingPlatformConfig[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    isFree: true,
    description: 'Free gentle science, music & nature videos',
  },
  {
    id: 'pbs',
    name: 'PBS KIDS',
    isFree: true,
    description: 'Free Daniel Tiger, Mister Rogers & classics',
  },
  {
    id: 'disney',
    name: 'Disney+',
    isFree: false,
    description: 'Bluey, Winnie the Pooh, gentle stories',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    isFree: false,
    description: 'Puffin Rock, Trash Truck, Sea of Love',
  },
  {
    id: 'apple',
    name: 'Apple TV+',
    isFree: false,
    description: 'Stillwater, Slumberkins, Duck & Goose',
  },
  {
    id: 'prime',
    name: 'Prime Video',
    isFree: false,
    description: 'Tumble Leaf, Pete the Cat, gentle tales',
  },
  {
    id: 'cbeebies',
    name: 'CBeebies',
    isFree: true,
    description: 'Hey Duggee, JoJo & Gran Gran (UK)',
  },
];

export const ALL_PLATFORM_IDS = SUPPORTED_SUBSCRIPTION_PLATFORMS.map((p) => p.id);
export const FREE_PLATFORM_IDS = SUPPORTED_SUBSCRIPTION_PLATFORMS.filter((p) => p.isFree).map((p) => p.id);

interface SubscriptionsContextValue {
  // Subscriptions
  subscriptions: string[];
  isServiceActive: (serviceId: string) => boolean;
  toggleSubscription: (serviceId: string) => Promise<void>;
  setAllSubscriptions: (enableAll: boolean) => Promise<void>;
  setFreeOnlySubscriptions: () => Promise<void>;
  matchesUserSubscriptions: (item: KidsMediaItem) => boolean;

  // Child Age (Current Child Only)
  childAge: AgeTier;
  setChildAge: (tier: AgeTier) => Promise<void>;
  replaceSyncedPreferences: (subscriptions: string[], ageTier: AgeTier) => Promise<void>;

  // Show Suggestions ("Tell Zaen")
  suggestedShows: ShowSuggestion[];
  submitShowSuggestion: (titleOrUrl: string, ageGroup?: string, note?: string) => Promise<boolean>;
  removeSuggestedShow: (id: string) => Promise<void>;
}

const SubscriptionsContext = createContext<SubscriptionsContextValue>({
  subscriptions: ALL_PLATFORM_IDS,
  isServiceActive: () => true,
  toggleSubscription: async () => {},
  setAllSubscriptions: async () => {},
  setFreeOnlySubscriptions: async () => {},
  matchesUserSubscriptions: () => true,

  childAge: 'preschool',
  setChildAge: async () => {},
  replaceSyncedPreferences: async () => {},

  suggestedShows: [],
  submitShowSuggestion: async () => false,
  removeSuggestedShow: async () => {},
});

export const SubscriptionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscriptions, setSubscriptions] = useState<string[]>(ALL_PLATFORM_IDS);
  const [childAge, setChildAgeState] = useState<AgeTier>('preschool');
  const [suggestedShows, setSuggestedShows] = useState<ShowSuggestion[]>([]);

  // Hydrate from AsyncStorage on startup
  useEffect(() => {
    let isMounted = true;

    async function hydrate() {
      try {
        const [savedSubs, savedAge, savedSuggestions] = await Promise.all([
          AsyncStorage.getItem(USER_SUBSCRIPTIONS_STORAGE_KEY),
          AsyncStorage.getItem(USER_PREFERRED_AGE_KEY),
          AsyncStorage.getItem(SUGGESTED_SHOWS_STORAGE_KEY),
        ]);

        if (isMounted) {
          if (savedSubs) {
            try {
              const parsed = JSON.parse(savedSubs);
              if (Array.isArray(parsed)) {
                setSubscriptions(parsed);
              }
            } catch {}
          }

          if (savedAge) {
            setChildAgeState(normalizeStoredAgeTier(savedAge));
          }

          if (savedSuggestions) {
            try {
              const parsed = JSON.parse(savedSuggestions);
              if (Array.isArray(parsed)) {
                setSuggestedShows(parsed);
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Error hydrating subscriptions/settings:', err);
      }
    }

    hydrate();

    return () => {
      isMounted = false;
    };
  }, []);

  const isServiceActive = useCallback(
    (serviceId: string) => {
      // 'all' always true
      if (serviceId === 'all') return true;
      return subscriptions.includes(serviceId);
    },
    [subscriptions]
  );

  const toggleSubscription = useCallback(
    async (serviceId: string) => {
      triggerHaptic('selection');
      void markPreferencesUpdated();
      setSubscriptions((prev) => {
        let next: string[];
        if (prev.includes(serviceId)) {
          // Never allow unchecking everything; keep at least one
          if (prev.length <= 1) return prev;
          next = prev.filter((id) => id !== serviceId);
        } else {
          next = [...prev, serviceId];
        }
        AsyncStorage.setItem(USER_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    []
  );

  const setAllSubscriptions = useCallback(async (enableAll: boolean) => {
    triggerHaptic('medium');
    void markPreferencesUpdated();
    const next = enableAll ? ALL_PLATFORM_IDS : ['youtube', 'pbs'];
    setSubscriptions(next);
    await AsyncStorage.setItem(USER_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setFreeOnlySubscriptions = useCallback(async () => {
    triggerHaptic('medium');
    void markPreferencesUpdated();
    setSubscriptions(FREE_PLATFORM_IDS);
    await AsyncStorage.setItem(USER_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(FREE_PLATFORM_IDS)).catch(() => {});
  }, []);

  const setChildAge = useCallback(async (tier: AgeTier) => {
    triggerHaptic('selection');
    void markPreferencesUpdated();
    setChildAgeState(tier);
    await AsyncStorage.setItem(USER_PREFERRED_AGE_KEY, tier).catch(() => {});
  }, []);

  const replaceSyncedPreferences = useCallback(async (nextSubscriptions: string[], nextAgeTier: AgeTier) => {
    setSubscriptions(nextSubscriptions);
    setChildAgeState(nextAgeTier);
    await Promise.all([
      AsyncStorage.setItem(USER_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(nextSubscriptions)),
      AsyncStorage.setItem(USER_PREFERRED_AGE_KEY, nextAgeTier),
    ]);
  }, []);

  const submitShowSuggestion = useCallback(
    async (titleOrUrl: string, ageGroup?: string, note?: string): Promise<boolean> => {
      const trimmed = titleOrUrl.trim();
      if (!trimmed) return false;

      triggerHaptic('success');
      const newEntry: ShowSuggestion = {
        id: `sug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: trimmed,
        submittedAt: Date.now(),
        status: 'reviewing',
        ageGroup: ageGroup?.trim() || undefined,
        note: note?.trim() || undefined,
      };

      setSuggestedShows((prev) => {
        const next = [newEntry, ...prev.filter((p) => p.title.toLowerCase() !== trimmed.toLowerCase())];
        AsyncStorage.setItem(SUGGESTED_SHOWS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });

      return true;
    },
    []
  );

  const removeSuggestedShow = useCallback(async (id: string) => {
    triggerHaptic('light');
    setSuggestedShows((prev) => {
      const next = prev.filter((s) => s.id !== id);
      AsyncStorage.setItem(SUGGESTED_SHOWS_STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  /**
   * Evaluates if a given calm show matches the parent's enabled subscriptions.
   * If all platforms are enabled, returns true.
   * If a show is available on ANY enabled platform, returns true.
   * If a show is exclusively on a disabled subscription, returns false (tantrum preventer!).
   */
  const matchesUserSubscriptions = useCallback(
    (item: KidsMediaItem): boolean => {
      // If user has all platforms active, show everything
      if (subscriptions.length === ALL_PLATFORM_IDS.length) {
        return true;
      }

      // Check which platforms carry this item
      let matchedAnyPlatform = false;
      let matchedActivePlatform = false;

      for (const platformId of ALL_PLATFORM_IDS) {
        if (matchesStreamingService(item, platformId)) {
          matchedAnyPlatform = true;
          if (subscriptions.includes(platformId)) {
            matchedActivePlatform = true;
            break;
          }
        }
      }

      // If the show belongs to recognized subscription platforms, it must match an active one
      if (matchedAnyPlatform) {
        return matchedActivePlatform;
      }

      // If it doesn't belong to any paid/exclusive platform (e.g. general calm content), keep it visible
      return true;
    },
    [subscriptions]
  );

  const value = useMemo(
    () => ({
      subscriptions,
      isServiceActive,
      toggleSubscription,
      setAllSubscriptions,
      setFreeOnlySubscriptions,
      matchesUserSubscriptions,
      childAge,
      setChildAge,
      suggestedShows,
      submitShowSuggestion,
      removeSuggestedShow,
      replaceSyncedPreferences,
    }),
    [
      subscriptions,
      isServiceActive,
      toggleSubscription,
      setAllSubscriptions,
      setFreeOnlySubscriptions,
      matchesUserSubscriptions,
      childAge,
      setChildAge,
      suggestedShows,
      submitShowSuggestion,
      removeSuggestedShow,
      replaceSyncedPreferences,
    ]
  );

  return <SubscriptionsContext.Provider value={value}>{children}</SubscriptionsContext.Provider>;
};

export const useSubscriptions = () => useContext(SubscriptionsContext);
