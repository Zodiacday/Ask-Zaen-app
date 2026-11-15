import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/mediaSource';
import { PLAYLISTS_STORAGE_KEY, type Playlist } from '@/constants/SavedContext';
import { USER_PREFERRED_AGE_KEY } from '@/components/OnboardingModal';
import { USER_SUBSCRIPTIONS_STORAGE_KEY } from '@/constants/SubscriptionsContext';
import { PREFERENCES_UPDATED_AT_KEY } from '@/constants/preferencesStorage';

export type ZaenPlaylist = {
  id: string;
  title: string;
  emoji: string;
  isDefault: boolean;
  itemIds: number[];
  createdAt: string;
  updatedAt: string;
};

export type ZaenState = {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  preferences: { language: string; ageTier: string; subscriptions: string[] };
  playlists: ZaenPlaylist[];
};

type TokenGetter = () => Promise<string | null>;
const PRELOGIN_GUEST_STATE_KEY = '@askzaen_prelogin_guest_state_v1';

function toIso(value: number | string | undefined): string {
  if (typeof value === 'number') return new Date(value).toISOString();
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : new Date().toISOString();
}

export async function readLocalState(): Promise<ZaenState> {
  const [rawPlaylists, rawAge, rawSubscriptions, rawPreferencesUpdatedAt] = await Promise.all([
    AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY),
    AsyncStorage.getItem(USER_PREFERRED_AGE_KEY),
    AsyncStorage.getItem(USER_SUBSCRIPTIONS_STORAGE_KEY),
    AsyncStorage.getItem(PREFERENCES_UPDATED_AT_KEY),
  ]);
  const parsedPlaylists = rawPlaylists ? JSON.parse(rawPlaylists) : [];
  const playlists: ZaenPlaylist[] = (Array.isArray(parsedPlaylists) ? parsedPlaylists : []).slice(0, 10).map((playlist: Playlist) => ({
    id: String(playlist.id),
    title: String(playlist.title || 'Playlist').slice(0, 80),
    emoji: String(playlist.emoji || '⭐').slice(0, 8),
    isDefault: playlist.id === 'default' || playlist.isDefault === true,
    itemIds: Array.from(new Set((Array.isArray(playlist.itemIds) ? playlist.itemIds : []).filter((id) => Number.isInteger(id) && id > 0))).slice(0, 100),
    createdAt: toIso(playlist.createdAt),
    updatedAt: toIso(playlist.updatedAt),
  }));
  const timestamp = rawPreferencesUpdatedAt || new Date().toISOString();
  if (!playlists.some((playlist) => playlist.id === 'default')) {
    playlists.unshift({ id: 'default', title: 'Default', emoji: '⭐', isDefault: true, itemIds: [], createdAt: timestamp, updatedAt: timestamp });
  }
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: timestamp,
    preferences: {
      language: 'English',
      ageTier: rawAge || 'preschool',
      subscriptions: rawSubscriptions ? JSON.parse(rawSubscriptions) : [],
    },
    playlists,
  };
}

export async function applyCanonicalState(state: ZaenState): Promise<void> {
  const playlists: Playlist[] = state.playlists.map((playlist) => ({
    id: playlist.id,
    title: playlist.title,
    emoji: playlist.emoji,
    isDefault: playlist.isDefault,
    itemIds: playlist.itemIds,
    createdAt: Date.parse(playlist.createdAt) || Date.now(),
    updatedAt: Date.parse(playlist.updatedAt) || Date.now(),
  }));
  await Promise.all([
    AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists)),
    AsyncStorage.setItem(USER_PREFERRED_AGE_KEY, state.preferences.ageTier),
    AsyncStorage.setItem(USER_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(state.preferences.subscriptions)),
    AsyncStorage.setItem(PREFERENCES_UPDATED_AT_KEY, state.updatedAt),
  ]);
}

async function authenticatedRequest(path: string, getToken: TokenGetter, init?: RequestInit): Promise<Response> {
  const token = await getToken();
  if (!token) throw new Error('No Clerk session token available');
  const headers = new Headers(init?.headers);
  headers.set('authorization', `Bearer ${token}`);
  headers.set('content-type', 'application/json');
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

async function readError(response: Response): Promise<any> {
  try { return await response.json(); } catch { return null; }
}

export async function syncLocalState(getToken: TokenGetter): Promise<ZaenState> {
  const local = await readLocalState();
  await AsyncStorage.setItem(PRELOGIN_GUEST_STATE_KEY, JSON.stringify(local));
  const currentResponse = await authenticatedRequest('/me/state', getToken);
  if (!currentResponse.ok) throw new Error(`State read failed: ${currentResponse.status}`);
  const currentPayload = await currentResponse.json() as { state: ZaenState };

  const merge = async (baseRevision: number) => authenticatedRequest('/me/state/merge', getToken, {
    method: 'POST',
    body: JSON.stringify({ baseRevision, snapshot: local }),
  });
  let response = await merge(currentPayload.state.revision);
  if (response.status === 409) {
    const conflict = await readError(response);
    const latest = conflict?.error?.latestState as ZaenState | undefined;
    if (latest) response = await merge(latest.revision);
  }
  if (!response.ok) throw new Error(`State merge failed: ${response.status}`);
  const payload = await response.json() as { state: ZaenState };
  await applyCanonicalState(payload.state);
  return payload.state;
}

export async function restoreGuestState(): Promise<ZaenState | null> {
  const raw = await AsyncStorage.getItem(PRELOGIN_GUEST_STATE_KEY);
  if (!raw) return null;
  const state = JSON.parse(raw) as ZaenState;
  await applyCanonicalState(state);
  await AsyncStorage.removeItem(PRELOGIN_GUEST_STATE_KEY);
  return state;
}

export async function updateRemoteState(getToken: TokenGetter, state: ZaenState): Promise<ZaenState> {
  const response = await authenticatedRequest('/me/state', getToken, {
    method: 'PUT',
    body: JSON.stringify({ baseRevision: state.revision, state }),
  });
  if (!response.ok) throw new Error(`State update failed: ${response.status}`);
  const payload = await response.json() as { state: ZaenState };
  await applyCanonicalState(payload.state);
  return payload.state;
}

