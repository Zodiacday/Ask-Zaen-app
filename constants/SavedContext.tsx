import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KidsMediaItem, getMediaItemById } from '@/constants/kidsDb';

export interface Playlist {
  id: string;
  title: string;
  emoji?: string;
  isDefault?: boolean;
  itemIds: number[];
  createdAt: number;
  updatedAt: number;
}

export const PLAYLISTS_STORAGE_KEY = '@askzaen_playlists_v2';
export const TITLES_POOL_STORAGE_KEY = '@askzaen_titles_pool_v2';
const LEGACY_SAVED_STORAGE_KEY = '@askzaen_saved_titles';
const ANCIENT_SAVED_STORAGE_KEY = '@netflix_clone_saved_movies';

export const DEFAULT_PLAYLIST_ID = 'default';

const INITIAL_DEFAULT_PLAYLIST: Playlist = {
  id: DEFAULT_PLAYLIST_ID,
  title: 'Default',
  emoji: '⭐',
  isDefault: true,
  itemIds: [],
  createdAt: 1715000000000,
  updatedAt: 1715000000000,
};

interface SavedContextType {
  // Legacy Flat API (for backward compatibility)
  savedMovies: KidsMediaItem[];
  isSaved: (id: number) => boolean;
  toggleSave: (movie: KidsMediaItem) => Promise<void>;
  removeMovie: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;

  // Playlists API
  playlists: Playlist[];
  defaultPlaylist: Playlist;
  createPlaylist: (title: string, emoji?: string) => Promise<string>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  renamePlaylist: (playlistId: string, newTitle: string, emoji?: string) => Promise<void>;
  addItemToPlaylist: (playlistId: string, item: KidsMediaItem) => Promise<void>;
  removeItemFromPlaylist: (playlistId: string, itemId: number) => Promise<void>;
  toggleItemInPlaylist: (playlistId: string, item: KidsMediaItem) => Promise<void>;
  isItemInPlaylist: (playlistId: string, itemId: number) => boolean;
  getPlaylistsForItem: (itemId: number) => string[];
  getPlaylistItems: (playlistId: string) => KidsMediaItem[];
  getPlaylistById: (playlistId: string) => Playlist | undefined;
  replacePlaylists: (next: Playlist[]) => Promise<void>;
}

const SavedContext = createContext<SavedContextType>({
  savedMovies: [],
  isSaved: () => false,
  toggleSave: async () => {},
  removeMovie: async () => {},
  clearAll: async () => {},

  playlists: [INITIAL_DEFAULT_PLAYLIST],
  defaultPlaylist: INITIAL_DEFAULT_PLAYLIST,
  createPlaylist: async () => '',
  deletePlaylist: async () => {},
  renamePlaylist: async () => {},
  addItemToPlaylist: async () => {},
  removeItemFromPlaylist: async () => {},
  toggleItemInPlaylist: async () => {},
  isItemInPlaylist: () => false,
  getPlaylistsForItem: () => [],
  getPlaylistItems: () => [],
  getPlaylistById: () => undefined,
  replacePlaylists: async () => {},
});

interface SavedProviderProps {
  children: React.ReactNode;
  initialPlaylists?: Playlist[];
  initialSavedMovies?: KidsMediaItem[];
}

export const SavedProvider: React.FC<SavedProviderProps> = ({
  children,
  initialPlaylists,
  initialSavedMovies,
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    if (initialPlaylists) return initialPlaylists;
    if (initialSavedMovies) {
      return [
        {
          ...INITIAL_DEFAULT_PLAYLIST,
          itemIds: initialSavedMovies.map((m) => m.id),
          updatedAt: Date.now(),
        },
      ];
    }
    return [INITIAL_DEFAULT_PLAYLIST];
  });

  const [titlesPool, setTitlesPool] = useState<Record<number, KidsMediaItem>>(() => {
    const pool: Record<number, KidsMediaItem> = {};
    if (initialSavedMovies) {
      initialSavedMovies.forEach((m) => {
        pool[m.id] = m;
      });
    }
    return pool;
  });

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (initialPlaylists !== undefined) {
      setIsLoaded(true);
      return;
    }
    loadData();
  }, [initialPlaylists]);

  const loadData = async () => {
    try {
      // 1. Try loading playlists v2
      const rawPlaylists = await AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY);
      const rawPool = await AsyncStorage.getItem(TITLES_POOL_STORAGE_KEY);

      let pool: Record<number, KidsMediaItem> = rawPool ? JSON.parse(rawPool) : {};
      if (initialSavedMovies) {
        initialSavedMovies.forEach((m) => {
          pool[m.id] = m;
        });
      }

      if (rawPlaylists) {
        const parsed: Playlist[] = JSON.parse(rawPlaylists);
        // Ensure default playlist exists
        if (!parsed.some((p) => p.id === DEFAULT_PLAYLIST_ID)) {
          parsed.unshift(INITIAL_DEFAULT_PLAYLIST);
        }
        setPlaylists(parsed);
        setTitlesPool(pool);
        setIsLoaded(true);
        return;
      }

      // 2. Migration from legacy flat saved titles
      let legacyItems: KidsMediaItem[] = [];
      const legacyData = await AsyncStorage.getItem(LEGACY_SAVED_STORAGE_KEY);
      if (legacyData) {
        legacyItems = JSON.parse(legacyData);
      } else {
        const ancient = await AsyncStorage.getItem(ANCIENT_SAVED_STORAGE_KEY);
        if (ancient) {
          legacyItems = JSON.parse(ancient);
        }
      }

      const defaultPl: Playlist = {
        ...INITIAL_DEFAULT_PLAYLIST,
        itemIds: legacyItems.map((m) => m.id),
        updatedAt: Date.now(),
      };

      legacyItems.forEach((item) => {
        pool[item.id] = item;
      });

      const initialList: Playlist[] = [defaultPl];
      setPlaylists(initialList);
      setTitlesPool(pool);
      setIsLoaded(true);

      // Persist migrated data
      await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(initialList));
      await AsyncStorage.setItem(TITLES_POOL_STORAGE_KEY, JSON.stringify(pool));
    } catch (e) {
      console.warn('Failed to load playlists', e);
      setIsLoaded(true);
    }
  };

  const persist = async (
    newPlaylists: Playlist[],
    newPool?: Record<number, KidsMediaItem>
  ) => {
    try {
      setPlaylists(newPlaylists);
      await AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(newPlaylists));
      if (newPool) {
        setTitlesPool(newPool);
        await AsyncStorage.setItem(TITLES_POOL_STORAGE_KEY, JSON.stringify(newPool));
      }
    } catch (e) {
      console.warn('Failed to persist playlists', e);
    }
  };

  const replacePlaylists = useCallback(async (next: Playlist[]) => {
    await persist(next);
  }, []);

  const defaultPlaylist = useMemo(() => {
    return (
      playlists.find((p) => p.id === DEFAULT_PLAYLIST_ID) ?? INITIAL_DEFAULT_PLAYLIST
    );
  }, [playlists]);

  // Lookup a media item from titlesPool, or fallback to kidsDb
  const getItem = useCallback(
    (id: number): KidsMediaItem | null => {
      if (titlesPool[id]) return titlesPool[id];
      const fromDb = getMediaItemById(id);
      return fromDb;
    },
    [titlesPool]
  );

  // Return all items for a given playlist in order
  const getPlaylistItems = useCallback(
    (playlistId: string): KidsMediaItem[] => {
      const pl = playlists.find((p) => p.id === playlistId);
      if (!pl) return [];
      const items: KidsMediaItem[] = [];
      pl.itemIds.forEach((id) => {
        const item = getItem(id);
        if (item) items.push(item);
      });
      return items;
    },
    [playlists, getItem]
  );

  // Flat list of unique saved movies across ALL playlists (for backward compatibility)
  const savedMovies = useMemo(() => {
    const seenIds = new Set<number>();
    const all: KidsMediaItem[] = [];
    playlists.forEach((pl) => {
      pl.itemIds.forEach((id) => {
        if (!seenIds.has(id)) {
          seenIds.add(id);
          const item = getItem(id);
          if (item) all.push(item);
        }
      });
    });
    return all;
  }, [playlists, getItem]);

  const isSaved = useCallback(
    (id: number) => {
      return playlists.some((pl) => pl.itemIds.includes(id));
    },
    [playlists]
  );

  const isItemInPlaylist = useCallback(
    (playlistId: string, itemId: number) => {
      const pl = playlists.find((p) => p.id === playlistId);
      return pl ? pl.itemIds.includes(itemId) : false;
    },
    [playlists]
  );

  const getPlaylistsForItem = useCallback(
    (itemId: number): string[] => {
      return playlists
        .filter((pl) => pl.itemIds.includes(itemId))
        .map((pl) => pl.id);
    },
    [playlists]
  );

  const getPlaylistById = useCallback(
    (playlistId: string): Playlist | undefined => {
      return playlists.find((p) => p.id === playlistId);
    },
    [playlists]
  );

  const createPlaylist = useCallback(
    async (title: string, emoji: string = '📁'): Promise<string> => {
      const cleanTitle = title.trim() || 'New Playlist';
      const id = 'pl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const newPl: Playlist = {
        id,
        title: cleanTitle,
        emoji,
        isDefault: false,
        itemIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updated = [...playlists, newPl];
      await persist(updated);
      return id;
    },
    [playlists]
  );

  const deletePlaylist = useCallback(
    async (playlistId: string) => {
      if (playlistId === DEFAULT_PLAYLIST_ID) {
        return; // Cannot delete default playlist
      }
      const updated = playlists.filter((p) => p.id !== playlistId);
      await persist(updated);
    },
    [playlists]
  );

  const renamePlaylist = useCallback(
    async (playlistId: string, newTitle: string, emoji?: string) => {
      const updated = playlists.map((pl) => {
        if (pl.id !== playlistId) return pl;
        return {
          ...pl,
          title: newTitle.trim() || pl.title,
          emoji: emoji !== undefined ? emoji : pl.emoji,
          updatedAt: Date.now(),
        };
      });
      await persist(updated);
    },
    [playlists]
  );

  const addItemToPlaylist = useCallback(
    async (playlistId: string, item: KidsMediaItem) => {
      const pool = { ...titlesPool, [item.id]: item };
      const updated = playlists.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.itemIds.includes(item.id)) return pl;
        return {
          ...pl,
          itemIds: [item.id, ...pl.itemIds],
          updatedAt: Date.now(),
        };
      });
      await persist(updated, pool);
    },
    [playlists, titlesPool]
  );

  const removeItemFromPlaylist = useCallback(
    async (playlistId: string, itemId: number) => {
      const updated = playlists.map((pl) => {
        if (pl.id !== playlistId) return pl;
        return {
          ...pl,
          itemIds: pl.itemIds.filter((id) => id !== itemId),
          updatedAt: Date.now(),
        };
      });
      await persist(updated);
    },
    [playlists]
  );

  const toggleItemInPlaylist = useCallback(
    async (playlistId: string, item: KidsMediaItem) => {
      const pl = playlists.find((p) => p.id === playlistId);
      if (!pl) return;
      if (pl.itemIds.includes(item.id)) {
        await removeItemFromPlaylist(playlistId, item.id);
      } else {
        await addItemToPlaylist(playlistId, item);
      }
    },
    [playlists, addItemToPlaylist, removeItemFromPlaylist]
  );

  // Legacy toggleSave: toggles in default playlist
  const toggleSave = useCallback(
    async (movie: KidsMediaItem) => {
      await toggleItemInPlaylist(DEFAULT_PLAYLIST_ID, movie);
    },
    [toggleItemInPlaylist]
  );

  // Legacy removeMovie: removes from ALL playlists
  const removeMovie = useCallback(
    async (id: number) => {
      const updated = playlists.map((pl) => ({
        ...pl,
        itemIds: pl.itemIds.filter((itemId) => itemId !== id),
        updatedAt: Date.now(),
      }));
      await persist(updated);
    },
    [playlists]
  );

  // Legacy clearAll: clears all playlists
  const clearAll = useCallback(async () => {
    const updated = [
      {
        ...INITIAL_DEFAULT_PLAYLIST,
        itemIds: [],
        updatedAt: Date.now(),
      },
    ];
    await persist(updated);
  }, []);

  const value = useMemo(
    () => ({
      savedMovies,
      isSaved,
      toggleSave,
      removeMovie,
      clearAll,
      playlists,
      defaultPlaylist,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addItemToPlaylist,
      removeItemFromPlaylist,
      toggleItemInPlaylist,
      isItemInPlaylist,
      getPlaylistsForItem,
      getPlaylistItems,
      getPlaylistById,
      replacePlaylists,
    }),
    [
      savedMovies,
      isSaved,
      toggleSave,
      removeMovie,
      clearAll,
      playlists,
      defaultPlaylist,
      createPlaylist,
      deletePlaylist,
      renamePlaylist,
      addItemToPlaylist,
      removeItemFromPlaylist,
      toggleItemInPlaylist,
      isItemInPlaylist,
      getPlaylistsForItem,
      getPlaylistItems,
      getPlaylistById,
      replacePlaylists,
    ]
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
};

export const useSaved = () => useContext(SavedContext);
