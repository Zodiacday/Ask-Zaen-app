import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalmColors } from '@/constants/Colors';
import { PressableScale } from '@/components/PressableScale';
import { triggerHaptic } from '@/constants/haptics';
import { useSubscriptions } from '@/constants/SubscriptionsContext';

const ZAEN_WAVING_IMG = require('@/assets/icons/zaen_waving.png');

interface TellZaenViewProps {
  onBack: () => void;
  onClose: () => void;
}

const AGE_CHIPS = [
  { id: '0-3', label: '0 to 3' },
  { id: '4-6', label: '4 to 6' },
  { id: '7+', label: '7+' },
] as const;

export const TellZaenView: React.FC<TellZaenViewProps> = ({ onBack, onClose }) => {
  const insets = useSafeAreaInsets();
  const { suggestedShows, submitShowSuggestion, removeSuggestedShow } = useSubscriptions();

  const [titleOrUrl, setTitleOrUrl] = useState('');
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState<string | null>(null);
  const [isLinkFocused, setIsLinkFocused] = useState(false);
  const [isNoteFocused, setIsNoteFocused] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = titleOrUrl.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    const ok = await submitShowSuggestion(trimmed, selectedAge || undefined, noteText.trim() || undefined);
    setIsSubmitting(false);

    if (ok) {
      setSubmittedTitle(trimmed);
      setTitleOrUrl('');
      setSelectedAge(null);
      setNoteText('');
      setTimeout(() => {
        setSubmittedTitle(null);
      }, 3500);
    }
  }, [titleOrUrl, selectedAge, noteText, isSubmitting, submitShowSuggestion]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      {/* Top Navigation Bar */}
      <View
        style={[
          styles.navBar,
          { paddingTop: Math.max(insets.top + 10, 18) },
        ]}
      >
        <PressableScale
          style={styles.backBtn}
          onPress={() => {
            triggerHaptic('light');
            onBack();
          }}
          scaleTo={0.94}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={18} color={CalmColors.textPrimary} />
          <Text style={styles.backBtnText}>Settings</Text>
        </PressableScale>

        <Text style={styles.navTitle}>Tell Zaen</Text>

        <PressableScale
          style={styles.closeBtn}
          onPress={() => {
            triggerHaptic('light');
            onClose();
          }}
          scaleTo={0.92}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={20} color={CalmColors.textPrimary} />
        </PressableScale>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 28, 44) },
        ]}
      >
        {/* ========================================================
            1. HERO: Mascot + 1-Line Invitation
            ======================================================== */}
        <View style={styles.heroSection}>
          <Image
            source={ZAEN_WAVING_IMG}
            style={styles.heroMascot}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>Have a calm show you love?</Text>
          <Text style={styles.heroSubtitle}>
            Tell Zaen. We review every show before adding it to the app.
          </Text>
        </View>

        {/* ========================================================
            2. THE ESSENTIAL FORM
            ======================================================== */}
        <View style={styles.card}>
          {/* Bigger, Wider Link/Title Input Field */}
          <View style={[styles.inputWrap, isLinkFocused && styles.inputWrapFocused]}>
            <Ionicons
              name="link-outline"
              size={20}
              color={isLinkFocused ? CalmColors.sageDark : 'rgba(74, 63, 56, 0.55)'}
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={styles.inputField}
              placeholder="Show title or YouTube link..."
              placeholderTextColor="rgba(74, 63, 56, 0.45)"
              value={titleOrUrl}
              onChangeText={setTitleOrUrl}
              onFocus={() => setIsLinkFocused(true)}
              onBlur={() => setIsLinkFocused(false)}
              returnKeyType="next"
            />
            {titleOrUrl.length > 0 && (
              <PressableScale
                onPress={() => setTitleOrUrl('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={CalmColors.textMuted} />
              </PressableScale>
            )}
          </View>

          {/* Note Section directly under the link */}
          <View style={[styles.noteWrap, isNoteFocused && styles.noteWrapFocused]}>
            <Ionicons
              name="pencil-outline"
              size={16}
              color={isNoteFocused ? CalmColors.sageDark : 'rgba(74, 63, 56, 0.55)'}
              style={{ marginRight: 10, marginTop: 2 }}
            />
            <TextInput
              style={styles.noteField}
              placeholder="Add a note (why your child loves it)..."
              placeholderTextColor="rgba(74, 63, 56, 0.45)"
              value={noteText}
              onChangeText={setNoteText}
              onFocus={() => setIsNoteFocused(true)}
              onBlur={() => setIsNoteFocused(false)}
              multiline
              numberOfLines={2}
            />
            {noteText.length > 0 && (
              <PressableScale
                onPress={() => setNoteText('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color={CalmColors.textMuted} />
              </PressableScale>
            )}
          </View>

          {/* Optional Age Chips */}
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>Age (optional):</Text>
            <View style={styles.chipsRow}>
              {AGE_CHIPS.map((chip) => {
                const isSelected = selectedAge === chip.id;
                return (
                  <PressableScale
                    key={chip.id}
                    style={[
                      styles.ageChip,
                      isSelected && styles.ageChipSelected,
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedAge(isSelected ? null : chip.id);
                    }}
                    scaleTo={0.95}
                  >
                    <Text
                      style={[
                        styles.ageChipText,
                        isSelected && styles.ageChipTextSelected,
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <PressableScale
            style={[
              styles.submitBtn,
              !titleOrUrl.trim() && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!titleOrUrl.trim() || isSubmitting}
            scaleTo={0.98}
          >
            <Text style={styles.submitBtnText}>Send to Zaen</Text>
            <Ionicons name="paper-plane" size={14} color="#FAF8F5" style={{ marginLeft: 6 }} />
          </PressableScale>

          {/* Success Banner */}
          {submittedTitle && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color={CalmColors.sageDark} />
              <Text style={styles.successBannerText}>
                Zaen is reviewing “{submittedTitle}”!
              </Text>
            </View>
          )}
        </View>

        {/* ========================================================
            3. YOUR SUBMISSIONS (Only if any exist)
            ======================================================== */}
        {suggestedShows.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionHeading}>YOUR SUGGESTIONS</Text>
            <View style={styles.historyList}>
              {suggestedShows.map((item, idx) => (
                <View key={item.id} style={styles.historyRow}>
                  <Ionicons
                    name="leaf-outline"
                    size={15}
                    color={CalmColors.sageDark}
                    style={{ marginRight: 8, marginTop: item.note ? 2 : 0 }}
                  />
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.note ? (
                      <Text style={styles.historyNote} numberOfLines={1}>
                        “{item.note}”
                      </Text>
                    ) : null}
                  </View>
                  {item.ageGroup && (
                    <Text style={styles.historyAgeBadge}>{item.ageGroup}</Text>
                  )}
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>In Review</Text>
                  </View>
                  <PressableScale
                    onPress={() => removeSuggestedShow(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={16} color={CalmColors.textMuted} />
                  </PressableScale>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CalmColors.canvasPrimary,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
    backgroundColor: CalmColors.canvasPrimary,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: CalmColors.surfaceCard,
    borderWidth: 1,
    borderColor: CalmColors.divider,
  },
  backBtnText: {
    fontSize: 13,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.textPrimary,
  },
  navTitle: {
    fontSize: 18,
    fontFamily: 'Baloo2_700Bold',
    color: CalmColors.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CalmColors.surfaceCard,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // 1. Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  heroMascot: {
    width: 86,
    height: 86,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: 'Baloo2_700Bold',
    color: CalmColors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },

  // 2. Card Form
  card: {
    backgroundColor: '#FAF5EE',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#DFD5C6',
    marginBottom: 18,
  },
  // Link Input: Wider & Bigger
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#DFD5C6',
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginBottom: 10,
  },
  inputWrapFocused: {
    borderColor: CalmColors.sageDark,
    backgroundColor: '#FFFFFF',
    shadowColor: CalmColors.sageDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  inputField: {
    flex: 1,
    fontSize: 15.5,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textPrimary,
    padding: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  // Note Section directly under the link
  noteWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#DFD5C6',
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 64,
    marginBottom: 14,
  },
  noteWrapFocused: {
    borderColor: CalmColors.sageDark,
    backgroundColor: '#FFFFFF',
    shadowColor: CalmColors.sageDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 3,
  },
  noteField: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textPrimary,
    padding: 0,
    lineHeight: 18,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  chipsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  chipsLabel: {
    fontSize: 12,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.textMuted,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  ageChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFD5C6',
  },
  ageChipSelected: {
    backgroundColor: CalmColors.sageDark,
    borderColor: CalmColors.sageDark,
  },
  ageChipText: {
    fontSize: 11.5,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.textPrimary,
  },
  ageChipTextSelected: {
    color: '#FAF8F5',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CalmColors.sageDark,
    borderRadius: 14,
    paddingVertical: 12,
  },
  submitBtnDisabled: {
    backgroundColor: '#C5BCB2',
  },
  submitBtnText: {
    fontSize: 13.5,
    fontFamily: 'Quicksand_700Bold',
    color: '#FAF8F5',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E7EFE3',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: CalmColors.sageDark,
  },
  successBannerText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.sageDark,
  },

  // 3. Submissions History
  historySection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingLeft: 2,
  },
  historyList: {
    gap: 6,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DFD5C6',
  },
  historyTitle: {
    fontSize: 13,
    fontFamily: 'Baloo2_700Bold',
    color: CalmColors.textPrimary,
  },
  historyNote: {
    fontSize: 11,
    fontFamily: 'Quicksand_600SemiBold',
    color: CalmColors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  historyAgeBadge: {
    fontSize: 10,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.textMuted,
    backgroundColor: 'rgba(74, 63, 56, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    marginRight: 6,
  },
  statusPill: {
    backgroundColor: 'rgba(107, 124, 89, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginRight: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Quicksand_700Bold',
    color: CalmColors.sageDark,
  },
});
