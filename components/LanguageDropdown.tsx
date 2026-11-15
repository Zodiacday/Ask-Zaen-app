import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { CalmColors } from '@/constants/Colors';
import { LanguageOption, normalizeLanguage } from '@/constants/languages';
import { getLanguageFlagSource } from '@/constants/languageFlags';
import { PressableScale } from '@/components/PressableScale';

interface LanguageDropdownProps {
  languages: LanguageOption[];
  selected: string | null;
  totalCount: number;
  onSelect: (code: string | null) => void;
  onClose: () => void;
}

/**
 * Anchored language menu. Rendered by LanguageBrowse directly under the
 * selector bar; the parent owns positioning and the outside-tap overlay.
 */
export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  languages,
  selected,
  totalCount,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  const search = query.trim().toLowerCase();
  const aliasMatch = normalizeLanguage(query);

  const filteredLanguages = useMemo(
    () =>
      search
        ? languages.filter(
            (option) =>
              option.nativeName.toLowerCase().includes(search) ||
              option.englishName.toLowerCase().includes(search) ||
              option.code.toLowerCase().includes(search) ||
              (aliasMatch !== null && option.code === aliasMatch)
          )
        : languages,
    [languages, search, aliasMatch]
  );

  const pick = (code: string | null) => {
    onSelect(code);
    onClose();
  };

  const renderRow = (
    key: string,
    label: string,
    subtitle: string,
    count: number,
    active: boolean,
    onPress: () => void,
    badgeContent: React.ReactNode,
    isFlag = true
  ) => (
    <PressableScale
      key={key}
      style={[styles.row, active && styles.rowActive]}
      scaleTo={0.98}
      haptic="selection"
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}, ${count} titles`}
      onPress={onPress}
    >
      <View
        style={
          isFlag
            ? [styles.badgePill, active && styles.badgePillActive]
            : styles.globeSlot
        }
      >
        {badgeContent}
      </View>

      <View style={styles.rowTextWrap}>
        <Text numberOfLines={1}>
          <Text style={[styles.nativeName, active && styles.nativeNameActive]}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={styles.englishName}>  ·  {subtitle}</Text>
          ) : null}
        </Text>
      </View>

      <View style={styles.rightGroup}>
        <Text style={[styles.countNumber, active && styles.countNumberActive]}>
          {count}
        </Text>
        {active && (
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={CalmColors.sageDark}
            style={styles.checkIcon}
          />
        )}
      </View>
    </PressableScale>
  );

  return (
    <View style={styles.surface}>
      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchCapsule}>
          <Ionicons
            name="search"
            size={15}
            color={CalmColors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search languages..."
            placeholderTextColor={CalmColors.textSubtle}
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            accessibilityLabel="Search languages"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <PressableScale onPress={() => setQuery('')} style={styles.clearIcon} scaleTo={0.85}>
              <Ionicons name="close-circle" size={16} color={CalmColors.textMuted} />
            </PressableScale>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {!search &&
          renderRow(
            'all',
            'All languages',
            '',
            totalCount,
            !selected,
            () => pick(null),
            <Ionicons
              name="globe-outline"
              size={18}
              color={!selected ? CalmColors.sageDark : CalmColors.textMuted}
            />,
            false
          )}

        {filteredLanguages.map((option) => {
          const isActive = selected === option.code;
          const flagSource = getLanguageFlagSource(option.code);
          const isoCode = option.code.slice(0, 2).toUpperCase();

          return renderRow(
            option.code,
            option.nativeName,
            option.englishName !== option.nativeName ? option.englishName : '',
            option.count,
            isActive,
            () => pick(option.code),
            flagSource ? (
              <ExpoImage
                source={flagSource}
                style={styles.flagImage}
                contentFit="cover"
              />
            ) : (
              <Text
                style={[
                  styles.badgeText,
                  isActive && styles.badgeTextActive,
                ]}
              >
                {isoCode}
              </Text>
            )
          );
        })}

        {filteredLanguages.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="language-outline" size={28} color={CalmColors.textSubtle} />
            <Text style={styles.emptyTitle}>No languages match</Text>
            <Text style={styles.emptySubtitle}>
              Try a name or code, like “Spanish” or “es”.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  surface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CalmColors.dividerSubtle,
    overflow: 'hidden',
    shadowColor: 'rgba(44, 37, 35, 0.14)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  searchWrap: {
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: CalmColors.dividerSubtle,
  },
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CalmColors.canvasSecondary,
    borderRadius: 16,
    paddingHorizontal: 10,
    height: 34,
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.06)',
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    color: CalmColors.textPrimary,
    fontSize: 12.5,
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  clearIcon: {
    padding: 2,
  },
  list: {
    maxHeight: 270,
  },
  listContent: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6.5,
    borderRadius: 9,
  },
  rowActive: {
    backgroundColor: 'rgba(112, 117, 82, 0.10)',
  },
  globeSlot: {
    width: 32,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  badgePill: {
    width: 32,
    height: 22,
    borderRadius: 5,
    backgroundColor: CalmColors.canvasSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.12)',
  },
  badgePillActive: {
    backgroundColor: CalmColors.sage,
    borderColor: CalmColors.sageDark,
  },
  flagImage: {
    width: '100%',
    height: '100%',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    letterSpacing: 0.5,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  rowTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  nativeName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: CalmColors.textPrimary,
    letterSpacing: -0.1,
  },
  nativeNameActive: {
    color: CalmColors.sageDark,
  },
  englishName: {
    fontSize: 11.5,
    fontWeight: '500',
    color: CalmColors.textMuted,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countNumber: {
    fontSize: 11.5,
    fontWeight: '600',
    color: CalmColors.textMuted,
  },
  countNumberActive: {
    color: CalmColors.sageDark,
    fontWeight: '700',
  },
  checkIcon: {
    marginLeft: 6,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 11,
    color: CalmColors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 3,
  },
});
