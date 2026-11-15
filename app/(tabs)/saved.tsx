import React, { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSaved, Playlist, DEFAULT_PLAYLIST_ID } from '@/constants/SavedContext';
import { KidsMediaItem } from '@/constants/kidsDb';
import { CalmColors } from '@/constants/Colors';
import { MovieDetailSheet } from '@/components/MovieDetailSheet';
import { PlaylistFolderCard, CreatePlaylistCard } from '@/components/PlaylistFolderCard';
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';
import {
  MediaMasonry,
  MEDIA_GRID_PADDING,
  useMediaGridLayout,
} from '@/components/MediaGrid';
import { triggerHaptic } from '@/constants/haptics';
import { useParentExternalLink } from '@/constants/useParentExternalLink';
import {
  MagnifyingGlass,
  X,
  ArrowLeft,
  Trash,
  FolderSimple,
} from 'phosphor-react-native';

const HORIZONTAL_PADDING = 16;
const GAP = 12;

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { numColumns, columnWidth } = useMediaGridLayout();
  const { openExternalLink, parentLinkGate } = useParentExternalLink();
  const {
    playlists,
    createPlaylist,
    deletePlaylist,
    getPlaylistItems,
  } = useSaved();

  // Navigation State
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<KidsMediaItem | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Active Playlist
  const activePlaylist = useMemo(() => {
    if (!selectedPlaylistId) return null;
    return playlists.find((p) => p.id === selectedPlaylistId) || null;
  }, [playlists, selectedPlaylistId]);

  const activePlaylistItems = useMemo(() => {
    if (!activePlaylist) return [];
    return getPlaylistItems(activePlaylist.id);
  }, [activePlaylist, getPlaylistItems]);

  // Filtered Playlists based on search query
  const filteredPlaylists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return playlists;

    return playlists.filter((pl) => {
      // Matches playlist title
      if (pl.title.toLowerCase().includes(q)) return true;
      // Matches an item inside the playlist
      const items = getPlaylistItems(pl.id);
      return items.some((item) => item.title.toLowerCase().includes(q));
    });
  }, [playlists, searchQuery, getPlaylistItems]);

  // Data for the balanced 2-column grid
  const playlistGridData = useMemo(() => {
    type PlaylistItem =
      | { id: '__create__'; kind: 'create' }
      | { id: string; kind: 'playlist'; playlist: Playlist }
      | { id: '__dummy__'; kind: 'dummy' };

    const list: PlaylistItem[] = [];
    if (!searchQuery) {
      list.push({ id: '__create__', kind: 'create' });
    }
    for (const pl of filteredPlaylists) {
      list.push({ id: pl.id, kind: 'playlist', playlist: pl });
    }
    if (list.length % 2 !== 0) {
      list.push({ id: '__dummy__', kind: 'dummy' });
    }
    return list;
  }, [searchQuery, filteredPlaylists]);

  const handleCreateNew = async (title: string, emoji: string) => {
    const newId = await createPlaylist(title, emoji);
    triggerHaptic('medium');
    // Open the newly created playlist
    setSelectedPlaylistId(newId);
  };

  const confirmDeletePlaylist = (pl: Playlist) => {
    if (pl.id === DEFAULT_PLAYLIST_ID) {
      Alert.alert('Cannot Delete', 'The Default playlist cannot be removed.');
      return;
    }

    Alert.alert(
      'Delete Playlist',
      `Are you sure you want to delete "${pl.title}"? Your saved media will remain in other playlists.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('medium');
            await deletePlaylist(pl.id);
            setSelectedPlaylistId(null);
          },
        },
      ]
    );
  };

  // ----------------------------------------------------
  // Drill-down View: Inside an Active Playlist
  // ----------------------------------------------------
  if (activePlaylist) {
    const isDefault = activePlaylist.id === DEFAULT_PLAYLIST_ID;
    const items = activePlaylistItems;

    return (
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* Drill-down Header */}
        <View style={styles.drillHeader}>
          <PressableScale
            style={styles.backBtn}
            onPress={() => {
              triggerHaptic('light');
              setSelectedPlaylistId(null);
            }}
            scaleTo={0.92}
          >
            <ArrowLeft size={18} color={CalmColors.textPrimary} weight="bold" />
            <Text style={styles.backBtnText}>Playlists</Text>
          </PressableScale>

          <Text style={styles.drillNavTitle} numberOfLines={1}>
            {activePlaylist.emoji ? `${activePlaylist.emoji} ` : ''}{activePlaylist.title}
          </Text>

          <View style={styles.drillHeaderRight}>
            {!isDefault ? (
              <PressableScale
                style={styles.deleteFolderBtn}
                onPress={() => confirmDeletePlaylist(activePlaylist)}
                scaleTo={0.92}
              >
                <Trash size={16} color={CalmColors.terracotta} weight="bold" />
              </PressableScale>
            ) : (
              <View style={{ width: 34 }} />
            )}
          </View>
        </View>

        {/* Shows Grid - Normal Ask Zaen Show Cards */}
        {items.length === 0 ? (
          <View style={styles.emptyPlaylistContainer}>
            <FolderSimple size={52} color={CalmColors.sageBorder} weight="duotone" />
            <Text style={styles.emptyPlaylistTitle}>This playlist is empty</Text>
            <Text style={styles.emptyPlaylistSubtext}>
              Tap the bookmark button on any show or story to add it to &quot;{activePlaylist.title}&quot;.
            </Text>
          </View>
        ) : (
          <MediaMasonry
            items={items}
            numColumns={numColumns}
            columnWidth={columnWidth}
            onSelect={(movie) => {
              triggerHaptic('light');
              setSelectedMovie(movie);
            }}
            onPlay={(movie) => {
              triggerHaptic('heavy');
              if (movie.platform_url) {
                openExternalLink(movie.platform_url);
              }
            }}
            contentContainerStyle={styles.playlistGridContent}
          />
        )}

        {/* Detail Sheet */}
        {selectedMovie && (
          <MovieDetailSheet
            movie={selectedMovie}
            onClose={() => setSelectedMovie(null)}
            onSelectRelated={(related) => setSelectedMovie(related)}
          />
        )}
        {parentLinkGate}
      </View>
    );
  }

  // ----------------------------------------------------
  // Top-Level View: Folders Grid + In-Page Search
  // ----------------------------------------------------
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Top Header with Back to Profile */}
      <View style={styles.topHeader}>
        <PressableScale
          style={styles.backBtn}
          onPress={() => {
            triggerHaptic('light');
            router.navigate('/profile');
          }}
          scaleTo={0.92}
        >
          <ArrowLeft size={18} color={CalmColors.textPrimary} weight="bold" />
          <Text style={styles.backBtnText}>Profile</Text>
        </PressableScale>

        <Text style={styles.topHeaderTitle}>My List</Text>

        <View style={styles.topHeaderRightPlaceholder} />
      </View>

      {/* In-Page Search Input */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <MagnifyingGlass
            size={18}
            color={CalmColors.textMuted}
            weight="bold"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search playlists and saved titles..."
            placeholderTextColor={CalmColors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <PressableScale
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchBtn}
              scaleTo={0.9}
            >
              <X size={14} color={CalmColors.textPrimary} weight="bold" />
            </PressableScale>
          )}
        </View>
      </View>

      {/* Playlists 2-Column Responsive Grid */}
      <FlatList
        data={playlistGridData}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.gridScrollContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          if (item.kind === 'dummy') {
            return <View style={{ flex: 1 }} />;
          }
          if (item.kind === 'create') {
            return (
              <CreatePlaylistCard
                onPress={() => {
                  triggerHaptic('light');
                  setShowCreateModal(true);
                }}
              />
            );
          }
          const items = getPlaylistItems(item.playlist.id);
          return (
            <PlaylistFolderCard
              playlist={item.playlist}
              items={items}
              onPress={() => {
                triggerHaptic('light');
                setSelectedPlaylistId(item.playlist.id);
              }}
              highlightQuery={searchQuery}
            />
          );
        }}
        ListEmptyComponent={
          filteredPlaylists.length === 0 && searchQuery.length > 0 ? (
            <View style={styles.emptySearchContainer}>
              <Text style={styles.emptySearchTitle}>No playlists found</Text>
              <Text style={styles.emptySearchSubtitle}>
                No playlists or saved titles match &quot;{searchQuery}&quot;.
              </Text>
              <PressableScale
                style={styles.clearFilterBtn}
                onPress={() => setSearchQuery('')}
                scaleTo={0.97}
              >
                <Text style={styles.clearFilterBtnText}>Clear Search</Text>
              </PressableScale>
            </View>
          ) : undefined
        }
      />

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateNew}
      />

      {/* Detail Sheet */}
      {selectedMovie && (
        <MovieDetailSheet
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onSelectRelated={(related) => setSelectedMovie(related)}
        />
      )}
      {parentLinkGate}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CalmColors.canvasPrimary,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 8,
  },
  topHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    letterSpacing: -0.2,
  },
  topHeaderRightPlaceholder: {
    width: 60,
  },
  searchBarWrapper: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 4,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(92, 107, 72, 0.20)',
    paddingHorizontal: 12,
    height: 44,
    shadowColor: 'rgba(46, 58, 30, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: CalmColors.textPrimary,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  clearSearchBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(44, 37, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridScrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 100,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptySearchTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    marginBottom: 4,
  },
  emptySearchSubtitle: {
    fontSize: 13,
    color: CalmColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  clearFilterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: CalmColors.surfaceCard,
    borderWidth: 1,
    borderColor: CalmColors.divider,
  },
  clearFilterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: CalmColors.textPrimary,
  },

  // Drill-down styles
  drillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingBottom: 14,
  },
  drillNavTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    letterSpacing: -0.2,
    maxWidth: 200,
    textAlign: 'center',
  },
  drillHeaderRight: {
    minWidth: 34,
    alignItems: 'flex-end',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(44, 37, 35, 0.05)',
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: CalmColors.textPrimary,
  },
  deleteFolderBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(196, 104, 81, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlaylistContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyPlaylistTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    marginTop: 6,
  },
  emptyPlaylistSubtext: {
    fontSize: 13,
    color: CalmColors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  playlistGridContent: {
    paddingHorizontal: MEDIA_GRID_PADDING,
    paddingBottom: 110,
  },
});
