import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { CalmColors } from '@/constants/Colors';
import { useSaved } from '@/constants/SavedContext';
import { KidsMediaItem } from '@/constants/kidsDb';
import { triggerHaptic } from '@/constants/haptics';
import { CreatePlaylistModal } from '@/components/CreatePlaylistModal';
import { X, Check, Plus } from 'phosphor-react-native';
import { ResilientPoster } from '@/components/ResilientPoster';

interface SaveToPlaylistSheetProps {
  visible: boolean;
  movie: KidsMediaItem | null;
  onClose: () => void;
}

export const SaveToPlaylistSheet: React.FC<SaveToPlaylistSheetProps> = ({
  visible,
  movie,
  onClose,
}) => {
  const { playlists, toggleItemInPlaylist, isItemInPlaylist, createPlaylist } = useSaved();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (!movie) return null;

  const handleToggle = async (playlistId: string) => {
    triggerHaptic('selection');
    await toggleItemInPlaylist(playlistId, movie);
  };

  const handleCreateNew = async (title: string, emoji: string) => {
    const newId = await createPlaylist(title, emoji);
    // Automatically add the current movie to the newly created playlist
    await toggleItemInPlaylist(newId, movie);
  };

  return (
    <>
      <Modal
        visible={visible && !showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <Pressable style={styles.dismissArea} onPress={onClose} />

          <View style={styles.sheetContainer}>
            {/* Grabber */}
            <View style={styles.grabber} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.movieHeaderPreview}>
                <ResilientPoster
                  item={movie}
                  style={styles.movieThumb}
                  contentFit="cover"
                />
                <View style={styles.movieInfo}>
                  <Text style={styles.saveToHeading}>Save to Playlist</Text>
                  <Text style={styles.movieTitle} numberOfLines={1}>
                    {movie.title}
                  </Text>
                </View>
              </View>

              <PressableScale onPress={onClose} style={styles.closeBtn}>
                <X size={18} color={CalmColors.textPrimary} weight="bold" />
              </PressableScale>
            </View>

            {/* Playlists List */}
            <ScrollView style={styles.playlistList} showsVerticalScrollIndicator={false}>
              {playlists.map((pl) => {
                const checked = isItemInPlaylist(pl.id, movie.id);
                return (
                  <PressableScale
                    key={pl.id}
                    style={[styles.playlistRow, checked && styles.playlistRowChecked]}
                    onPress={() => handleToggle(pl.id)}
                    scaleTo={0.98}
                  >
                    <View style={styles.playlistEmojiBox}>
                      <Text style={styles.playlistEmojiText}>{pl.emoji || '📁'}</Text>
                    </View>

                    <View style={styles.playlistRowInfo}>
                      <Text style={styles.playlistRowTitle}>{pl.title}</Text>
                      <Text style={styles.playlistRowCount}>
                        {pl.itemIds.length} {pl.itemIds.length === 1 ? 'title' : 'titles'}
                      </Text>
                    </View>

                    {/* Checkbox */}
                    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                      {checked && <Check size={14} color="#FFFFFF" weight="bold" />}
                    </View>
                  </PressableScale>
                );
              })}

              {/* Add New Playlist Option */}
              <PressableScale
                style={styles.newPlaylistRow}
                onPress={() => {
                  triggerHaptic('light');
                  setShowCreateModal(true);
                }}
                scaleTo={0.98}
              >
                <View style={styles.newIconCircle}>
                  <Plus size={16} color={CalmColors.sageDark} weight="bold" />
                </View>
                <Text style={styles.newPlaylistText}>Create new playlist...</Text>
              </PressableScale>
            </ScrollView>

            {/* Bottom Done Button */}
            <PressableScale style={styles.doneBtn} onPress={onClose} scaleTo={0.97}>
              <Text style={styles.doneBtnText}>Done</Text>
            </PressableScale>
          </View>
        </View>
      </Modal>

      {/* Creation Modal */}
      <CreatePlaylistModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateNew}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 24, 22, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(92, 107, 72, 0.20)',
    shadowColor: '#101804',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  grabber: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(44, 37, 35, 0.20)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(44, 37, 35, 0.08)',
    marginBottom: 10,
  },
  movieHeaderPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  movieThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EAE4DC',
  },
  movieInfo: {
    flex: 1,
  },
  saveToHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: CalmColors.terracotta,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(44, 37, 35, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistList: {
    maxHeight: 340,
    marginVertical: 4,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(44, 37, 35, 0.06)',
    marginBottom: 8,
  },
  playlistRowChecked: {
    borderColor: 'rgba(92, 107, 72, 0.40)',
    backgroundColor: '#F5F7F0',
  },
  playlistEmojiBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FAF8F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playlistEmojiText: {
    fontSize: 18,
  },
  playlistRowInfo: {
    flex: 1,
  },
  playlistRowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: CalmColors.textPrimary,
  },
  playlistRowCount: {
    fontSize: 11,
    color: CalmColors.textMuted,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: CalmColors.textSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: CalmColors.sageDark,
    borderColor: CalmColors.sageDark,
  },
  newPlaylistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: 'rgba(92, 107, 72, 0.35)',
    backgroundColor: '#FAF8F4',
    marginTop: 4,
    marginBottom: 10,
  },
  newIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CalmColors.sageSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  newPlaylistText: {
    fontSize: 13,
    fontWeight: '800',
    color: CalmColors.sageDark,
  },
  doneBtn: {
    backgroundColor: CalmColors.sageDark,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
