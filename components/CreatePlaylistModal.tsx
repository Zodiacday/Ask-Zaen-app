import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { PressableScale } from '@/components/PressableScale';
import { CalmColors } from '@/constants/Colors';
import { triggerHaptic } from '@/constants/haptics';
import { X, Check } from 'phosphor-react-native';

const SUGGESTED_EMOJIS = [
  { emoji: '⭐', label: 'Favorites' },
  { emoji: '🌙', label: 'Bedtime' },
  { emoji: '☀️', label: 'Morning' },
  { emoji: '🚗', label: 'Travel' },
  { emoji: '🌿', label: 'Calm' },
  { emoji: '📚', label: 'Stories' },
  { emoji: '🎨', label: 'Play' },
  { emoji: '🎵', label: 'Music' },
];

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, emoji: string) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  visible,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const handleCreate = () => {
    if (!title.trim()) return;
    triggerHaptic('medium');
    onCreate(title.trim(), selectedEmoji || '');
    setTitle('');
    setSelectedEmoji(null);
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setSelectedEmoji(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={styles.dismissArea} onPress={handleClose} />

        <View style={styles.modalCard}>
          {/* Header (No Subtitle, Only New Playlist) */}
          <View style={styles.header}>
            <Text style={styles.title}>New Playlist</Text>
            <PressableScale onPress={handleClose} style={styles.closeBtn} scaleTo={0.9}>
              <X size={18} color={CalmColors.textPrimary} weight="bold" />
            </PressableScale>
          </View>

          {/* 4x2 Symmetrical Icon Grid */}
          <Text style={styles.sectionLabel}>CHOOSE AN ICON (OPTIONAL)</Text>
          <View style={styles.emojiGrid}>
            {SUGGESTED_EMOJIS.map((item) => {
              const isSelected = selectedEmoji === item.emoji;
              return (
                <PressableScale
                  key={item.emoji}
                  style={[styles.emojiChip, isSelected && styles.emojiChipSelected]}
                  onPress={() => {
                    triggerHaptic('selection');
                    setSelectedEmoji(isSelected ? null : item.emoji);
                  }}
                  scaleTo={0.92}
                >
                  <Text style={styles.emojiText}>{item.emoji}</Text>
                </PressableScale>
              );
            })}
          </View>

          {/* Playlist Name Input */}
          <Text style={styles.sectionLabel}>PLAYLIST NAME</Text>
          <View style={styles.inputWrapper}>
            {selectedEmoji ? (
              <Text style={styles.inputPrefixEmoji}>{selectedEmoji}</Text>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="e.g. Bedtime Wind-Down"
              placeholderTextColor={CalmColors.textSubtle}
              value={title}
              onChangeText={setTitle}
              maxLength={36}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            {title.length > 0 && (
              <PressableScale
                onPress={() => setTitle('')}
                style={styles.clearBtn}
                scaleTo={0.9}
              >
                <X size={13} color={CalmColors.textMuted} weight="bold" />
              </PressableScale>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <PressableScale
              style={[styles.createBtn, !title.trim() && styles.createBtnDisabled]}
              onPress={handleCreate}
              scaleTo={0.97}
              disabled={!title.trim()}
            >
              {title.trim().length > 0 && (
                <Check size={18} color="#FFFFFF" weight="bold" style={{ marginRight: 6 }} />
              )}
              <Text
                style={[styles.createBtnText, !title.trim() && styles.createBtnTextDisabled]}
              >
                Create Playlist
              </Text>
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 24, 22, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dismissArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FAF8F5',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(92, 107, 72, 0.20)',
    shadowColor: '#101804',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: CalmColors.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(44, 37, 35, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: CalmColors.terracotta,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  emojiChip: {
    flex: 1,
    minWidth: '22%',
    maxWidth: '23%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(44, 37, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(46, 58, 30, 0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  emojiChipSelected: {
    borderColor: CalmColors.sageDark,
    backgroundColor: CalmColors.sageSoft,
    borderWidth: 2,
    transform: [{ scale: 1.04 }],
  },
  emojiText: {
    fontSize: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(92, 107, 72, 0.25)',
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 20,
  },
  inputPrefixEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: CalmColors.textPrimary,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(44, 37, 35, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CalmColors.sageDark,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    flex: 1,
    shadowColor: CalmColors.sageDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  createBtnDisabled: {
    backgroundColor: 'rgba(92, 107, 72, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(92, 107, 72, 0.18)',
    shadowOpacity: 0,
    elevation: 0,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  createBtnTextDisabled: {
    color: CalmColors.textMuted,
    fontWeight: '700',
  },
});
