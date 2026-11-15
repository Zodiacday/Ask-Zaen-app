import { useEffect, useRef } from 'react';
import { useZaenAuth } from '@/constants/AuthContext';
import { useLanguage } from '@/constants/LanguageContext';
import { useSaved, type Playlist } from '@/constants/SavedContext';
import { useSubscriptions } from '@/constants/SubscriptionsContext';
import { restoreGuestState, syncLocalState, type ZaenState } from '@/constants/zaenApi';
import { normalizeStoredAgeTier } from '@/constants/ageTiers';

function applyState(state: ZaenState, replacePlaylists: (next: Playlist[]) => Promise<void>, replacePreferences: (subscriptions: string[], ageTier: any) => Promise<void>, setLanguage: (language: string | null) => Promise<void>) {
  const playlists: Playlist[] = state.playlists.map((playlist) => ({
    id: playlist.id,
    title: playlist.title,
    emoji: playlist.emoji,
    isDefault: playlist.isDefault,
    itemIds: playlist.itemIds,
    createdAt: Date.parse(playlist.createdAt) || Date.now(),
    updatedAt: Date.parse(playlist.updatedAt) || Date.now(),
  }));
  return Promise.all([
    replacePlaylists(playlists),
    replacePreferences(state.preferences.subscriptions, normalizeStoredAgeTier(state.preferences.ageTier)),
    setLanguage(state.preferences.language || null),
  ]);
}

export default function ZaenSyncBridge() {
  const { isLoaded, isSignedIn, userId, getToken } = useZaenAuth();
  const { replacePlaylists } = useSaved();
  const { replaceSyncedPreferences } = useSubscriptions();
  const { setLanguage } = useLanguage();
  const lastSignedInUser = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && userId && lastSignedInUser.current !== userId) {
      lastSignedInUser.current = userId;
      syncLocalState(getToken)
        .then((state) => applyState(state, replacePlaylists, replaceSyncedPreferences, setLanguage))
        .catch((error) => {
          lastSignedInUser.current = null;
          console.warn('Zaen account sync unavailable; local state remains usable.', error);
        });
      return;
    }
    if (!isSignedIn && lastSignedInUser.current) {
      lastSignedInUser.current = null;
      restoreGuestState()
        .then((state) => state && applyState(state, replacePlaylists, replaceSyncedPreferences, setLanguage))
        .catch((error) => console.warn('Could not restore guest state after sign-out.', error));
    }
  }, [getToken, isLoaded, isSignedIn, replacePlaylists, replaceSyncedPreferences, setLanguage, userId]);

  return null;
}

