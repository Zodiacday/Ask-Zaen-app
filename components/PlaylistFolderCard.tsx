import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { CalmColors } from '@/constants/Colors';
import { Playlist } from '@/constants/SavedContext';
import { KidsMediaItem, parseItemPoster } from '@/constants/kidsDb';
import { ResilientPoster } from '@/components/ResilientPoster';
import { FolderSimple, FolderPlus } from 'phosphor-react-native';

interface PlaylistFolderCardProps {
  playlist: Playlist;
  items: KidsMediaItem[];
  onPress: () => void;
  highlightQuery?: string;
  width?: number;
}

export const PlaylistFolderCard: React.FC<PlaylistFolderCardProps> = ({
  playlist,
  items,
  onPress,
  highlightQuery,
  width,
}) => {
  const count = items.length;

  // Render cover:
  // - 0 titles: Clean minimalist folder with soft sage icon
  // - 1+ titles: Always 4 thumbnails in a balanced 2x2 grid (never a single image)
  const renderFolderCover = () => {
    if (count === 0) {
      return (
        <View style={styles.emptyFolderCover}>
          <View style={styles.emptyFolderCircle}>
            <FolderSimple size={36} color={CalmColors.sageDark} weight="duotone" />
          </View>
        </View>
      );
    }

    // Always render 4 thumbnails in a 2x2 grid
    // If fewer than 4 items, cycle through posters and backdrops so all 4 slots are filled!
    const getSlot = (index: number): { item: KidsMediaItem; sourceUri?: string | null } | null => {
      if (items.length === 0) return null;
      if (items.length === 1) {
        const single = items[0];
        // Alternate poster and backdrop for visual variety across the 4 quadrants
        if (index === 1 || index === 2) {
          return { item: single, sourceUri: parseItemPoster(single, true) };
        }
        return { item: single, sourceUri: parseItemPoster(single, false) };
      }
      if (items.length === 2) {
        // [Item 0, Item 1]
        // [Item 1, Item 0]
        const idx = index === 2 ? 1 : index === 3 ? 0 : index;
        return { item: items[idx] };
      }
      if (items.length === 3) {
        // [Item 0, Item 1]
        // [Item 2, Item 0]
        const idx = index === 3 ? 0 : index;
        return { item: items[idx] };
      }
      return { item: items[index] };
    };

    const slot0 = getSlot(0);
    const slot1 = getSlot(1);
    const slot2 = getSlot(2);
    const slot3 = getSlot(3);

    return (
      <View style={styles.quadGrid}>
        <View style={styles.quadRow}>
          {slot0 ? (
            <ResilientPoster
              item={slot0.item}
              sourceUri={slot0.sourceUri}
              compact
              style={styles.quadCell}
            />
          ) : (
            <View style={styles.quadPlaceholder} />
          )}

          {slot1 ? (
            <ResilientPoster
              item={slot1.item}
              sourceUri={slot1.sourceUri}
              compact
              style={styles.quadCell}
            />
          ) : (
            <View style={styles.quadPlaceholder} />
          )}
        </View>

        <View style={styles.quadRow}>
          {slot2 ? (
            <ResilientPoster
              item={slot2.item}
              sourceUri={slot2.sourceUri}
              compact
              style={styles.quadCell}
            />
          ) : (
            <View style={styles.quadPlaceholder} />
          )}

          {slot3 ? (
            <ResilientPoster
              item={slot3.item}
              sourceUri={slot3.sourceUri}
              compact
              style={styles.quadCell}
            />
          ) : (
            <View style={styles.quadPlaceholder} />
          )}
        </View>
      </View>
    );
  };

  return (
    <PressableScale
      style={[styles.cardWrapper, width ? { width } : { flex: 1 }]}
      onPress={onPress}
      scaleTo={0.96}
    >
      {/* Folder Cover Tile */}
      <View style={[styles.folderCoverTile, { width: '100%', aspectRatio: 1 }]}>
        {renderFolderCover()}

        {/* Count badge overlay */}
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {count} {count === 1 ? 'title' : 'titles'}
          </Text>
        </View>
      </View>

      {/* Playlist Name ONLY appears under */}
      <View style={styles.titleWrapper}>
        <Text style={styles.playlistTitle} numberOfLines={1}>
          {playlist.emoji ? `${playlist.emoji} ` : ''}
          {playlist.title}
        </Text>
      </View>
    </PressableScale>
  );
};

interface CreatePlaylistCardProps {
  onPress: () => void;
  width?: number;
}

export const CreatePlaylistCard: React.FC<CreatePlaylistCardProps> = ({ onPress, width }) => {
  return (
    <PressableScale
      style={[styles.cardWrapper, width ? { width } : { flex: 1 }]}
      onPress={onPress}
      scaleTo={0.96}
    >
      {/* Dashed Create Folder Tile */}
      <View
        style={[
          styles.folderCoverTile,
          styles.createCoverTile,
          { width: '100%', aspectRatio: 1 },
        ]}
      >
        <View style={styles.createIconCircle}>
          <FolderPlus size={30} color={CalmColors.sageDark} weight="bold" />
        </View>
      </View>

      {/* Name ONLY appears under */}
      <View style={styles.titleWrapper}>
        <Text style={[styles.playlistTitle, styles.createTitle]} numberOfLines={1}>
          ＋ New Playlist
        </Text>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    marginBottom: 4,
  },
  folderCoverTile: {
    borderRadius: 18,
    backgroundColor: '#F3EFEA',
    borderWidth: 1.5,
    borderColor: 'rgba(44, 37, 35, 0.08)',
    overflow: 'hidden',
    shadowColor: 'rgba(46, 58, 30, 0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  emptyFolderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3EFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFolderCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(92, 107, 72, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullCoverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ECE6DE',
  },
  quadGrid: {
    flex: 1,
    backgroundColor: 'rgba(44, 37, 35, 0.08)',
    gap: 1.5,
  },
  quadRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 1.5,
  },
  quadCell: {
    flex: 1,
    height: '100%',
    backgroundColor: '#ECE6DE',
  },
  quadPlaceholder: {
    flex: 1,
    height: '100%',
    backgroundColor: '#ECE6DE',
  },
  countBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(16, 24, 4, 0.72)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  titleWrapper: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    letterSpacing: -0.2,
  },
  createCoverTile: {
    borderStyle: 'dashed',
    borderColor: 'rgba(92, 107, 72, 0.35)',
    backgroundColor: '#FAF8F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: CalmColors.sageSoft,
    borderWidth: 1.5,
    borderColor: CalmColors.sageBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTitle: {
    color: CalmColors.sageDark,
  },
});
