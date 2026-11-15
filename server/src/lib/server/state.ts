import { apiError } from './api';
import { clerk } from './clerk';

export type PlaylistState = {
  id: string;
  title: string;
  emoji: string;
  isDefault: boolean;
  itemIds: number[];
  createdAt: string;
  updatedAt: string;
};

export type ZaenPreferences = {
  language: string;
  ageTier: string;
  subscriptions: string[];
};

export type ZaenState = {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  preferences: ZaenPreferences;
  playlists: PlaylistState[];
};

const MAX_STATE_BYTES = 7000;
const MAX_PLAYLISTS = 10;
const MAX_ITEMS_PER_PLAYLIST = 100;
const MAX_UNIQUE_ITEMS = 250;
const MAX_TITLE_LENGTH = 80;
const locks = new Map<string, Promise<unknown>>();

function now(): string { return new Date().toISOString(); }

export function emptyState(): ZaenState {
  const timestamp = now();
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: timestamp,
    preferences: { language: 'English', ageTier: 'preschool', subscriptions: [] },
    playlists: [{ id: 'default', title: 'Default', emoji: '⭐', isDefault: true, itemIds: [], createdAt: timestamp, updatedAt: timestamp }],
  };
}

function cleanText(value: unknown, fallback: string, max: number): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return (trimmed || fallback).slice(0, max);
}

function cleanItems(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is number => Number.isInteger(item) && item > 0)));
}

function cleanPlaylist(value: unknown, index: number): PlaylistState {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const id = cleanText(input.id, index === 0 ? 'default' : `playlist-${index}`, 80);
  const isDefault = id === 'default' || input.isDefault === true;
  return {
    id: isDefault ? 'default' : id,
    title: cleanText(input.title, isDefault ? 'Default' : 'Playlist', MAX_TITLE_LENGTH),
    emoji: cleanText(input.emoji, '⭐', 8),
    isDefault,
    itemIds: cleanItems(input.itemIds).slice(0, MAX_ITEMS_PER_PLAYLIST),
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : now(),
    updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : now(),
  };
}

export function normalizeState(input: unknown, revisionOverride?: number): ZaenState {
  if (!input || typeof input !== 'object') throw apiError('INVALID_STATE', 'State must be a JSON object.', 400);
  const value = input as Record<string, unknown>;
  const rawPreferences = value.preferences && typeof value.preferences === 'object' ? value.preferences as Record<string, unknown> : {};
  const playlistsInput = Array.isArray(value.playlists) ? value.playlists : [];
  const playlists = playlistsInput.slice(0, MAX_PLAYLISTS).map(cleanPlaylist);
  const defaultPlaylist = playlists.find((playlist) => playlist.id === 'default') ?? cleanPlaylist({}, 0);
  const withoutDuplicateDefault = playlists.filter((playlist) => playlist.id !== 'default');
  const finalPlaylists = [defaultPlaylist, ...withoutDuplicateDefault].slice(0, MAX_PLAYLISTS);
  const uniqueItems = new Set(finalPlaylists.flatMap((playlist) => playlist.itemIds));
  const revision = revisionOverride ?? (Number.isInteger(value.revision) && Number(value.revision) >= 0 ? Number(value.revision) : 0);
  const state: ZaenState = {
    schemaVersion: 1,
    revision,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now(),
    preferences: {
      language: cleanText(rawPreferences.language, 'English', 80),
      ageTier: cleanText(rawPreferences.ageTier, 'preschool', 32),
      subscriptions: Array.from(new Set(Array.isArray(rawPreferences.subscriptions)
        ? rawPreferences.subscriptions.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 20)
        : [])),
    },
    playlists: finalPlaylists,
  };

  if (uniqueItems.size > MAX_UNIQUE_ITEMS) throw apiError('STATE_TOO_LARGE', 'Saved media is limited to 250 unique titles.', 413);
  const bytes = Buffer.byteLength(JSON.stringify(state), 'utf8');
  if (bytes >= MAX_STATE_BYTES) throw apiError('STATE_TOO_LARGE', 'Your saved state is too large for the v1 account storage limit.', 413);
  return state;
}

export function stateFromPrivateMetadata(metadata: unknown): ZaenState {
  const privateMetadata = metadata && typeof metadata === 'object' ? metadata as Record<string, unknown> : {};
  return privateMetadata.zaen ? normalizeState(privateMetadata.zaen) : emptyState();
}

async function readUser(userId: string) {
  try {
    return await clerk().users.getUser(userId);
  } catch {
    throw apiError('AUTH_INVALID', 'The authenticated parent account could not be loaded.', 401);
  }
}

export async function readUserState(userId: string): Promise<ZaenState> {
  const user = await readUser(userId);
  return stateFromPrivateMetadata(user.privateMetadata);
}

export async function readUserProfile(userId: string) {
  const user = await readUser(userId);
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Parent';
  return {
    userId: user.id,
    displayName,
    email: user.primaryEmailAddress?.emailAddress ?? null,
    state: stateFromPrivateMetadata(user.privateMetadata),
  };
}

export async function replaceUserState(userId: string, state: ZaenState): Promise<ZaenState> {
  const user = await readUser(userId);
  const privateMetadata = user.privateMetadata && typeof user.privateMetadata === 'object'
    ? user.privateMetadata as Record<string, unknown>
    : {};
  await clerk().users.updateUserMetadata(userId, {
    privateMetadata: { ...privateMetadata, zaen: state },
  });
  return state;
}

export async function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(userId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  locks.set(userId, current);
  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(userId) === current) locks.delete(userId);
  }
}

export function assertBaseRevision(body: Record<string, unknown>, current: ZaenState): number {
  const baseRevision = body.baseRevision;
  if (!Number.isInteger(baseRevision) || Number(baseRevision) < 0) {
    throw apiError('INVALID_REVISION', 'baseRevision must be a non-negative integer.', 400);
  }
  if (Number(baseRevision) !== current.revision) {
    throw apiError('STALE_STATE', 'The account state changed on another device.', 409, current);
  }
  return Number(baseRevision);
}

function newer(local: string, server: string): boolean {
  const localTime = Date.parse(local);
  const serverTime = Date.parse(server);
  return Number.isFinite(localTime) && (!Number.isFinite(serverTime) || localTime > serverTime);
}

function mergePlaylist(server: PlaylistState, local: PlaylistState): PlaylistState {
  const itemIds = Array.from(new Set([...server.itemIds, ...local.itemIds])).slice(0, MAX_ITEMS_PER_PLAYLIST);
  const localIsNewer = newer(local.updatedAt, server.updatedAt);
  return {
    ...server,
    ...(localIsNewer ? { title: local.title, emoji: local.emoji, updatedAt: local.updatedAt } : {}),
    itemIds,
  };
}

export function mergeStates(serverState: ZaenState, localInput: unknown): ZaenState {
  const local = normalizeState(localInput, 0);
  const serverById = new Map(serverState.playlists.map((playlist) => [playlist.id, playlist]));
  const merged: PlaylistState[] = [];
  for (const serverPlaylist of serverState.playlists) {
    const localPlaylist = local.playlists.find((playlist) => playlist.id === serverPlaylist.id);
    merged.push(localPlaylist ? mergePlaylist(serverPlaylist, localPlaylist) : serverPlaylist);
  }
  for (const localPlaylist of local.playlists) {
    if (!serverById.has(localPlaylist.id)) merged.push(localPlaylist);
  }
  return normalizeState({
    schemaVersion: 1,
    revision: serverState.revision + 1,
    updatedAt: now(),
    preferences: newer(local.updatedAt, serverState.updatedAt) ? local.preferences : serverState.preferences,
    playlists: merged,
  }, serverState.revision + 1);
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await withUserLock(userId, async () => {
    const user = await readUser(userId);
    const privateMetadata = user.privateMetadata && typeof user.privateMetadata === 'object'
      ? user.privateMetadata as Record<string, unknown>
      : {};
    await clerk().users.updateUserMetadata(userId, { privateMetadata: { ...privateMetadata, zaen: null } });
    await clerk().users.deleteUser(userId);
  });
}

