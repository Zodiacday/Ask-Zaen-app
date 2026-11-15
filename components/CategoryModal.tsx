import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalmColors } from '@/constants/Colors';
import { PressableScale } from '@/components/PressableScale';
import { triggerHaptic } from '@/constants/haptics';
import type { SanctuaryGate } from '@/app/(tabs)/search';

export interface CategoryModalProps {
  visible: boolean;
  onClose: () => void;
  categories: SanctuaryGate[];
  activeGateId: string;
  audioOnly: boolean;
  onSelectCategory: (gate: SanctuaryGate) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  visible,
  onClose,
  categories,
  activeGateId,
  audioOnly,
  onSelectCategory,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop press to dismiss */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            triggerHaptic('light');
            onClose();
          }}
        />

        {/* Centered Sanctuary Modal Card */}
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Categories</Text>

            <PressableScale
              style={styles.closeBtn}
              scaleTo={0.92}
              haptic="light"
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={16} color={CalmColors.textPrimary} />
            </PressableScale>
          </View>

          {/* 2-Column Categories Grid */}
          <View style={styles.gridContainer}>
            {categories.map((gate) => {
              const isSelected =
                (activeGateId === gate.id || (gate.id === 'audio_only' && audioOnly));

              return (
                <PressableScale
                  key={gate.id}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: isSelected ? gate.activeColor : gate.bgColor,
                      borderColor: isSelected ? gate.activeColor : gate.borderColor,
                    },
                    isSelected && styles.categoryCardSelected,
                  ]}
                  scaleTo={0.96}
                  haptic="selection"
                  onPress={() => {
                    onSelectCategory(gate);
                    onClose();
                  }}
                >
                  <View style={styles.cardTopRow}>
                    <Image
                      source={gate.icon}
                      style={styles.cardIcon}
                      resizeMode="contain"
                    />
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#FFFFFF"
                        style={styles.checkIcon}
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.cardTitle,
                      { color: isSelected ? '#FFFFFF' : CalmColors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {gate.title}
                  </Text>

                  <Text
                    style={[
                      styles.cardSubtitle,
                      { color: isSelected ? 'rgba(255, 255, 255, 0.88)' : CalmColors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {gate.subtitle}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(38, 42, 28, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: CalmColors.canvasPrimary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(112, 117, 82, 0.18)',
    padding: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 20px 48px rgba(38, 42, 28, 0.22), 0 4px 12px rgba(38, 42, 28, 0.08)',
      } as any,
      default: {
        shadowColor: '#262A1C',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 12,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(112, 117, 82, 0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  categoryCard: {
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 11,
    minHeight: 64,
    justifyContent: 'center',
  },
  categoryCardSelected: {
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
      } as any,
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardIcon: {
    width: 22,
    height: 22,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 1,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 10.5,
    lineHeight: 13,
  },
});
