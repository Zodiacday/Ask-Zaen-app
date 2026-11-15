import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalmColors } from '@/constants/Colors';
import { PressableScale } from '@/components/PressableScale';
import { triggerHaptic } from '@/constants/haptics';
import {
  useSubscriptions,
  SUPPORTED_SUBSCRIPTION_PLATFORMS,
} from '@/constants/SubscriptionsContext';
import { AgeTier } from '@/constants/kidsDb';
import { TellZaenView } from '@/components/TellZaenView';

// Brand & Visual Assets
const BEAR_BABY_ICON = require('@/assets/icons/bear_baby.png');
const BEAR_PRESCHOOL_ICON = require('@/assets/icons/bear_preschool.png');
const BEAR_EXPLORER_ICON = require('@/assets/icons/bear_explorer.png');

// Platform Logos
const STREAMING_LOGOS: Record<string, any> = {
  youtube: require('@/assets/images/streaming/youtube.png'),
  disney: require('@/assets/images/streaming/disney.png'),
  netflix: require('@/assets/images/streaming/netflix.png'),
  prime: require('@/assets/images/streaming/prime.png'),
  pbs: require('@/assets/images/streaming/pbs.png'),
  apple: require('@/assets/images/streaming/apple.png'),
  cbeebies: require('@/assets/images/streaming/cbeebies.png'),
};

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onResetTour?: () => void;
  initialViewMode?: 'settings' | 'tell_zaen';
}

interface AgeOption {
  id: AgeTier;
  title: string;
  description: string;
  icon: any;
  iconSize: number;
}

const AGE_OPTIONS: AgeOption[] = [
  {
    id: 'preschool',
    title: 'Ages 0 to 3',
    description: 'Slow sensory rhythms, gentle voices & calm lullabies',
    icon: BEAR_BABY_ICON,
    iconSize: 42,
  },
  {
    id: 'big_kids',
    title: 'Ages 4 to 6',
    description: 'Quiet wonder, phonics, feelings & friendly characters',
    icon: BEAR_PRESCHOOL_ICON,
    iconSize: 52,
  },
  {
    id: 'tweens',
    title: 'Ages 7+',
    description: 'Nature science, wildlife biology & thoughtful tales',
    icon: BEAR_EXPLORER_ICON,
    iconSize: 66,
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  onResetTour,
  initialViewMode = 'settings',
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    subscriptions,
    toggleSubscription,
    setAllSubscriptions,
    setFreeOnlySubscriptions,
    childAge,
    setChildAge,
  } = useSubscriptions();

  // Navigation mode: 'settings' or 'tell_zaen' (full-blown curation page)
  const [viewMode, setViewMode] = useState<'settings' | 'tell_zaen'>(initialViewMode);

  const handleClose = useCallback(() => {
    setViewMode('settings');
    onClose();
  }, [onClose]);

  const openLegal = (path: '/legal/terms' | '/legal/privacy') => {
    handleClose();
    setTimeout(() => router.push(path), 180);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={handleClose}
    >
      {viewMode === 'tell_zaen' ? (
        <TellZaenView
          onBack={() => {
            triggerHaptic('light');
            setViewMode('settings');
          }}
          onClose={handleClose}
        />
      ) : (
        <View style={styles.root}>
          {/* Top Header: Only the Close [X] Button */}
          <View
            style={[
              styles.header,
              { paddingTop: Math.max(insets.top + 10, 18) },
            ]}
          >
            <PressableScale
              style={styles.closeBtn}
              onPress={() => {
                triggerHaptic('light');
                handleClose();
              }}
              scaleTo={0.92}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            >
              <Ionicons name="close" size={20} color={CalmColors.textPrimary} />
            </PressableScale>
          </View>

          {/* Scrollable Settings Content */}
          <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 28, 48) },
          ]}
        >
          {/* ========================================================
              SECTION 1: Child's Age (Floating Bears, No Boxes)
              ======================================================== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Child&apos;s Age</Text>
              <Text style={styles.sectionSubtitle}>
                Puts the right calm shows and pacing first for your child.
              </Text>
            </View>

            <View style={styles.ageList}>
              {AGE_OPTIONS.map((opt, idx) => {
                const isSelected = childAge === opt.id;
                return (
                  <React.Fragment key={opt.id}>
                    {idx > 0 && <View style={styles.ageRowDivider} />}
                    <PressableScale
                      style={[
                        styles.ageRow,
                        isSelected && styles.ageRowSelected,
                      ]}
                      onPress={() => setChildAge(opt.id)}
                      scaleTo={0.99}
                    >
                      {/* Floating Bear Icon (No Circle Background) */}
                      <View style={styles.floatingBearWrap}>
                        <Image
                          source={opt.icon}
                          style={{ width: opt.iconSize, height: opt.iconSize }}
                          resizeMode="contain"
                        />
                      </View>

                      {/* Age Text (No label tags like preschool bear) */}
                      <View style={styles.ageTextCol}>
                        <Text style={[styles.ageTitle, isSelected && styles.ageTitleSelected]}>
                          {opt.title}
                        </Text>
                        <Text style={styles.ageDesc}>{opt.description}</Text>
                      </View>

                      {/* Radio Indicator */}
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected ? (
                          <Ionicons name="checkmark" size={13} color="#FAF8F5" />
                        ) : null}
                      </View>
                    </PressableScale>
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Section Divider */}
          <View style={styles.sectionDivider} />

          {/* ========================================================
              SECTION 2: Our Subscriptions (Option B: Pure Logo + Switch)
              ======================================================== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Our Subscriptions</Text>
              <Text style={styles.sectionSubtitle}>
                Only show what your family can watch.
              </Text>
            </View>

            {/* Quick Action Convenience Chips */}
            <View style={styles.quickChipsRow}>
              <PressableScale
                style={styles.quickChip}
                onPress={() => setAllSubscriptions(true)}
                scaleTo={0.95}
              >
                <Ionicons name="checkmark-done" size={13} color={CalmColors.sageDark} />
                <Text style={styles.quickChipText}>Select All</Text>
              </PressableScale>

              <PressableScale
                style={styles.quickChip}
                onPress={setFreeOnlySubscriptions}
                scaleTo={0.95}
              >
                <Ionicons name="gift-outline" size={13} color={CalmColors.sageDark} />
                <Text style={styles.quickChipText}>Free Only</Text>
              </PressableScale>
            </View>

            {/* Platform Toggle List (Pure Logo + Switch, Zero Text Redundancy) */}
            <View style={styles.platformsList}>
              {SUPPORTED_SUBSCRIPTION_PLATFORMS.map((platform, idx) => {
                const isActive = subscriptions.includes(platform.id);
                const logo = STREAMING_LOGOS[platform.id];

                return (
                  <React.Fragment key={platform.id}>
                    {idx > 0 && <View style={styles.rowDivider} />}
                    <PressableScale
                      style={styles.platformRow}
                      onPress={() => toggleSubscription(platform.id)}
                      scaleTo={0.99}
                    >
                      {/* Floating Platform Logo */}
                      <View style={styles.floatingLogoWrap}>
                        {logo ? (
                          <Image
                            source={logo}
                            style={styles.platformLogo}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={styles.fallbackPlatformName}>{platform.name}</Text>
                        )}
                      </View>

                      {/* Subtle FREE pill badge */}
                      {platform.isFree && (
                        <View style={styles.freeBadge}>
                          <Text style={styles.freeBadgeText}>FREE</Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }} />

                      {/* Toggle Switch */}
                      <View
                        style={[
                          styles.toggleSwitch,
                          isActive ? styles.toggleSwitchOn : styles.toggleSwitchOff,
                        ]}
                      >
                        <View
                          style={[
                            styles.toggleThumb,
                            isActive ? styles.toggleThumbOn : styles.toggleThumbOff,
                          ]}
                        />
                      </View>
                    </PressableScale>
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Section Divider */}
          <View style={styles.sectionDivider} />

          {/* ========================================================
              SECTION 3: Suggestion / Tell Zaen Entry
              ======================================================== */}
          <View style={styles.section}>
            <PressableScale
              style={styles.suggestionEntryBtn}
              onPress={() => {
                triggerHaptic('medium');
                setViewMode('tell_zaen');
              }}
              scaleTo={0.98}
            >
              <View style={styles.suggestionIconWrap}>
                <Ionicons name="sparkles" size={19} color="#FAF8F5" />
              </View>

              <View style={styles.suggestionTextCol}>
                <View style={styles.suggestionTitleRow}>
                  <Text style={styles.suggestionTitle}>Tell Zaen</Text>
                  <View style={styles.suggestionBadge}>
                    <Text style={styles.suggestionBadgeText}>SUGGESTION</Text>
                  </View>
                </View>
                <Text style={styles.suggestionSubtitle}>
                  Have a calm show you love? Suggest it to Zaen
                </Text>
              </View>

              <View style={styles.suggestionArrowWrap}>
                <Ionicons name="chevron-forward" size={18} color={CalmColors.sageDark} />
              </View>
            </PressableScale>
          </View>

          {/* Section Divider */}
          <View style={styles.sectionDivider} />

          {/* ========================================================
              SECTION 4: Science & Trust Footnote
              ======================================================== */}
          <View style={styles.trustFooter}>
            <View style={styles.trustBadgeRow}>
              <View style={styles.trustIconCircle}>
                <Ionicons name="shield-checkmark" size={16} color={CalmColors.sageDark} />
              </View>
              <View style={styles.trustTextCol}>
                <Text style={styles.trustHeading}>100% Calm by Design</Text>
                <Text style={styles.trustBody}>
                  Zero fast-paced cuts • Measured vocal cadence • No algorithmic autoplay traps
                </Text>
              </View>
            </View>

            {onResetTour && (
              <PressableScale
                style={styles.resetTourBtn}
                onPress={() => {
                  triggerHaptic('medium');
                  onResetTour();
                  onClose();
                }}
                scaleTo={0.96}
              >
                <Ionicons name="refresh" size={14} color={CalmColors.textMuted} />
                <Text style={styles.resetTourText}>Replay Welcome Tour</Text>
              </PressableScale>
            )}
          </View>

          <View style={styles.sectionDivider} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Legal & support</Text>
              <Text style={styles.sectionSubtitle}>Learn how Ask Zaen handles the service and your data.</Text>
            </View>

            <View style={styles.legalList}>
              <PressableScale
                style={styles.legalRow}
                onPress={() => openLegal('/legal/terms')}
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel="Open Terms of Use"
              >
                <View style={styles.legalIconWrap}>
                  <Ionicons name="document-text-outline" size={18} color={CalmColors.sageDark} />
                </View>
                <Text style={styles.legalRowText}>Terms of Use</Text>
                <Ionicons name="chevron-forward" size={18} color={CalmColors.sageDark} />
              </PressableScale>
              <View style={styles.rowDivider} />
              <PressableScale
                style={styles.legalRow}
                onPress={() => openLegal('/legal/privacy')}
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel="Open Privacy Policy"
              >
                <View style={styles.legalIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={CalmColors.sageDark} />
                </View>
                <Text style={styles.legalRowText}>Privacy Policy</Text>
                <Ionicons name="chevron-forward" size={18} color={CalmColors.sageDark} />
              </PressableScale>
              <View style={styles.rowDivider} />
              <PressableScale
                style={styles.legalRow}
                onPress={() => void Linking.openURL('mailto:asteriuselos@gmail.com')}
                scaleTo={0.99}
                accessibilityRole="button"
                accessibilityLabel="Email Ask Zaen support"
              >
                <View style={styles.legalIconWrap}>
                  <Ionicons name="mail-outline" size={18} color={CalmColors.sageDark} />
                </View>
                <Text style={styles.legalRowText}>Contact support</Text>
                <Ionicons name="chevron-forward" size={18} color={CalmColors.sageDark} />
              </PressableScale>
            </View>
          </View>
        </ScrollView>
      </View>
    )}
  </Modal>
);
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CalmColors.canvasPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CalmColors.surfaceCard,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(74, 63, 56, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Open Section Layout (No Box Container)
  section: {
    paddingVertical: 4,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Baloo2_700Bold',
    color: CalmColors.textPrimary,
    marginBottom: 4,
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textMuted,
    lineHeight: 18,
  },
  legalList: {
    backgroundColor: CalmColors.surfaceCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    overflow: 'hidden',
  },
  legalRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 11,
  },
  legalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7EFE0',
  },
  legalRowText: {
    flex: 1,
    color: CalmColors.textPrimary,
    fontFamily: 'Quicksand_700Bold',
    fontSize: 14,
  },

  // Section & Row Dividers
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(74, 63, 56, 0.12)',
    marginVertical: 18,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(74, 63, 56, 0.08)',
    marginHorizontal: 4,
  },
  ageRowDivider: {
    height: 1,
    backgroundColor: 'rgba(74, 63, 56, 0.08)',
    marginLeft: 74,
  },

  // Section 1: Child Age Options (Floating Bears, No Boxes)
  ageList: {
    gap: 2,
  },
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  ageRowSelected: {
    // Zero background box - completely floating and open
  },
  floatingBearWrap: {
    width: 60,
    height: 62,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  ageTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  ageTitle: {
    fontSize: 16,
    fontFamily: 'Baloo2_700Bold',
    color: CalmColors.textPrimary,
    marginBottom: 2,
  },
  ageTitleSelected: {
    color: CalmColors.sageDark,
  },
  ageDesc: {
    fontSize: 12,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textMuted,
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(74, 63, 56, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioCircleSelected: {
    backgroundColor: CalmColors.sageDark,
    borderColor: CalmColors.sageDark,
  },

  // Section 2: Subscriptions (Floating Bigger Logos, No Boxes)
  quickChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: CalmColors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CalmColors.divider,
  },
  quickChipText: {
    fontSize: 11.5,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.textPrimary,
  },
  platformsList: {
    gap: 2,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  floatingLogoWrap: {
    width: 108,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginRight: 10,
  },
  platformLogo: {
    width: '100%',
    height: '100%',
  },
  fallbackPlatformName: {
    fontSize: 16,
    fontFamily: 'Baloo2_700Bold',
    color: CalmColors.textPrimary,
  },
  freeBadge: {
    backgroundColor: 'rgba(107, 124, 89, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  freeBadgeText: {
    fontSize: 10,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.sageDark,
    letterSpacing: 0.3,
  },
  toggleSwitch: {
    width: 44,
    height: 25,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
    marginLeft: 8,
  },
  toggleSwitchOn: {
    backgroundColor: CalmColors.sageDark,
  },
  toggleSwitchOff: {
    backgroundColor: '#DCD4C9',
  },
  toggleThumb: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: '#FAF8F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  toggleThumbOff: {
    alignSelf: 'flex-start',
  },

  // Section 3: Suggestion / Tell Zaen Entry Row
  suggestionEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#DFD5C6',
    shadowColor: 'rgba(74, 63, 56, 0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: CalmColors.sageDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  suggestionTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  suggestionTitle: {
    fontSize: 16.5,
    fontFamily: 'Baloo2_700Bold',
    color: CalmColors.textPrimary,
  },
  suggestionBadge: {
    backgroundColor: 'rgba(107, 124, 89, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  suggestionBadgeText: {
    fontSize: 9.5,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.sageDark,
    letterSpacing: 0.6,
  },
  suggestionSubtitle: {
    fontSize: 12,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textMuted,
    lineHeight: 16,
  },
  suggestionArrowWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(107, 124, 89, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section 4: Trust & Reset Footer
  trustFooter: {
    alignItems: 'center',
    paddingTop: 4,
    gap: 14,
  },
  trustBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  trustIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(107, 124, 89, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustTextCol: {
    flex: 1,
  },
  trustHeading: {
    fontSize: 13,
    fontFamily: 'Baloo2_700Bold',
    color: CalmColors.textPrimary,
  },
  trustBody: {
    fontSize: 11,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textMuted,
    lineHeight: 15,
  },
  resetTourBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    backgroundColor: CalmColors.surfaceGlass,
  },
  resetTourText: {
    fontSize: 11.5,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textMuted,
  },
});
