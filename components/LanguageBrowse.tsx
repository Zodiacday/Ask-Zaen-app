import React, { useDeferredValue, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MovieDetailSheet } from '@/components/MovieDetailSheet';
import { LanguageDropdown } from '@/components/LanguageDropdown';
import { PressableScale } from '@/components/PressableScale';
import { Reveal } from '@/components/Reveal';
import {
  MediaMasonry,
  MEDIA_GRID_PADDING,
  useMediaGridLayout,
} from '@/components/MediaGrid';
import { KidsMediaItem } from '@/constants/kidsDb';
import { CalmColors } from '@/constants/Colors';
import { triggerHaptic } from '@/constants/haptics';
import { useLanguage } from '@/constants/LanguageContext';
import { useSubscriptions } from '@/constants/SubscriptionsContext';
import { useSaved } from '@/constants/SavedContext';
import { getLanguageSpec, normalizeLanguage } from '@/constants/languages';
import { getLanguageFlagSource } from '@/constants/languageFlags';
import { useParentExternalLink } from '@/constants/useParentExternalLink';
import {
  filterByLanguage,
  getAvailableLanguages,
  getBrowsableItems,
} from '@/constants/mediaSource';
import { useRemoteMedia } from '@/constants/useRemoteMedia';
import {
  buildSavedAffinity,
  rankItems,
} from '@/constants/sanctuaryAlgorithm';
import { rotateRankedItems } from '@/constants/contentRotation';
import { useContentRotation } from '@/constants/useContentRotation';
import { useCircadianWindow } from '@/constants/useCircadianWindow';
import { searchMedia } from '@/constants/search';

const PAGE_SIZE = 48;

interface LanguageBrowseProps {
  /** Route param for /languages/[code]; preselects that language. */
  initialCode?: string;
  /** Shows a back affordance when used as a pushed screen. */
  showBack?: boolean;
}

/**
 * Discover-style browsing surface: search, language filter chips, and the same
 * scrollable masonry grid used by the Discover tab.
 */
export const LanguageBrowse: React.FC<LanguageBrowseProps> = ({
  initialCode,
  showBack = false,
}) => {
  const { openExternalLink, parentLinkGate } = useParentExternalLink();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { matchesUserSubscriptions, childAge } = useSubscriptions();
  const { savedMovies } = useSaved();
  const { numColumns, columnWidth } = useMediaGridLayout();

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const searchTerm = deferredQuery.trim();
  const [selectedMovie, setSelectedMovie] = useState<KidsMediaItem | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const gridRef = useRef<FlatList<KidsMediaItem>>(null);

  const filterKey = `${language ?? ''}|${searchTerm}`;
  const rotation = useContentRotation('language', filterKey);
  const [pageSlice, setPageSlice] = useState<{ key: string; count: number }>({
    key: filterKey,
    count: PAGE_SIZE,
  });
  const visibleCount = pageSlice.key === filterKey ? pageSlice.count : PAGE_SIZE;

  const window = useCircadianWindow(childAge);
  const savedAffinity = useMemo(() => buildSavedAffinity(savedMovies), [savedMovies]);

  // Switching language or searching should always start at the top of the grid.
  useEffect(() => {
    gridRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [language, query]);

  // A /languages/[code] deep link preselects its language once.
  useEffect(() => {
    const code = normalizeLanguage(initialCode) ?? initialCode;
    if (code) {
      void setLanguage(code);
    }
  }, [initialCode, setLanguage]);

  const browsableItems = useMemo(() => getBrowsableItems(), []);
  const languages = useMemo(() => getAvailableLanguages(), []);
  const spec = language ? getLanguageSpec(language) : null;
  const remoteParams = useMemo(() => ({
    limit: PAGE_SIZE,
    stimulation: 'all',
    language: language ?? undefined,
    query: searchTerm || undefined,
    sort: searchTerm.length === 0 ? 'recommended' as const : undefined,
    rotationDate: searchTerm.length === 0 ? rotation.dayKey : undefined,
    rotationSeed: searchTerm.length === 0 ? rotation.installSeed : undefined,
    rotationSurface: searchTerm.length === 0 ? 'language' as const : undefined,
  }), [language, rotation.dayKey, rotation.installSeed, searchTerm]);
  const remoteMedia = useRemoteMedia(remoteParams, rotation.ready);

  const displayedItems = useMemo(() => {
    if (remoteMedia.ready && !remoteMedia.failed) {
      return remoteMedia.items.filter(matchesUserSubscriptions);
    }
    if (searchTerm.length > 0) {
      return searchMedia(searchTerm, { language }).filter(matchesUserSubscriptions);
    }
    const filtered = filterByLanguage(browsableItems, language).filter(
      matchesUserSubscriptions
    );
    const ranked = rankItems(filtered, {
      window,
      ageTier: childAge,
      savedAffinity,
    });
    return rotation.ready
      ? rotateRankedItems(ranked, rotation, { qualityBandSize: 12 })
      : ranked;
  }, [
    searchTerm,
    language,
    browsableItems,
    matchesUserSubscriptions,
    window,
    childAge,
    savedAffinity,
    rotation,
    remoteMedia.ready,
    remoteMedia.failed,
    remoteMedia.items,
  ]);

  const pagedItems = useMemo(
    () => remoteMedia.ready && !remoteMedia.failed
      ? displayedItems
      : displayedItems.slice(0, visibleCount),
    [displayedItems, remoteMedia.failed, remoteMedia.ready, visibleCount]
  );
  const rotationReady = rotation.ready;
  const markRotationShown = rotation.markShown;

  useEffect(() => {
    if (rotationReady && pagedItems.length > 0) {
      markRotationShown(pagedItems.slice(0, PAGE_SIZE).map((item) => item.id));
    }
  }, [markRotationShown, pagedItems, rotationReady]);

  const handleLoadMore = useCallback(() => {
    if (remoteMedia.ready && !remoteMedia.failed) {
      void remoteMedia.loadMore();
      return;
    }
    setPageSlice((prev) => {
      const base = prev.key === filterKey ? prev.count : PAGE_SIZE;
      if (base >= displayedItems.length) return prev;
      return {
        key: filterKey,
        count: Math.min(base + PAGE_SIZE, displayedItems.length),
      };
    });
  }, [filterKey, displayedItems.length, remoteMedia]);

  const handleSelectMovie = useCallback((item: KidsMediaItem) => {
    triggerHaptic('light');
    setSelectedMovie(item);
  }, []);

  const handlePlayContent = useCallback((item: KidsMediaItem) => {
    triggerHaptic('heavy');
    if (item.platform_url) {
      openExternalLink(item.platform_url);
    }
  }, [openExternalLink]);

  const handleClearFilters = useCallback(() => {
    triggerHaptic('light');
    setQuery('');
    if (language) void setLanguage(null);
  }, [language, setLanguage]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/languages');
    }
  };

  const showCountRow = Boolean(language) || searchTerm.length > 0;

  const languageTotal = language
    ? languages.find((option) => option.code === language)?.count ??
      filterByLanguage(browsableItems, language).length
    : browsableItems.length;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(226, 234, 213, 0.52)', 'rgba(250, 248, 245, 0)']}
        locations={[0, 0.72]}
        style={styles.ambientWash}
      />

      {/* Fixed header: title, search, language selector */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        {showBack && (
          <View style={styles.backRow}>
            <PressableScale
              style={styles.backButton}
              scaleTo={0.9}
              haptic="selection"
              onPress={handleBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={18} color={CalmColors.textPrimary} />
            </PressableScale>
          </View>
        )}

        {/* Search within the selected language */}
        <View style={styles.searchCapsule}>
          <Ionicons
            name="search"
            size={17}
            color={CalmColors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder={
              spec
                ? `Search ${spec.nativeName} titles...`
                : 'Search all titles...'
            }
            placeholderTextColor={CalmColors.textSubtle}
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <PressableScale
              onPress={() => setQuery('')}
              style={styles.clearIcon}
              scaleTo={0.85}
            >
              <Ionicons name="close-circle" size={18} color={CalmColors.textMuted} />
            </PressableScale>
          )}
        </View>

        {/* Wide language selector under the search field */}
        <View style={styles.languageAnchor}>
          <PressableScale
            style={[styles.languageSelector, spec && styles.languageSelectorActive]}
            scaleTo={0.995}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={`Language: ${spec ? spec.nativeName : 'All languages'}. Tap to change.`}
            accessibilityState={{ expanded: pickerOpen }}
            onPress={() => setPickerOpen((open) => !open)}
          >
            {spec ? (
              <View
                style={[
                  styles.languageSelectorIcon,
                  styles.languageSelectorIconActive,
                ]}
              >
                {(() => {
                  const flagSource = getLanguageFlagSource(spec.code);
                  return flagSource ? (
                    <ExpoImage
                      source={flagSource}
                      style={styles.languageSelectorFlag}
                      contentFit="cover"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.languageSelectorIconLetter,
                        styles.languageSelectorIconLetterActive,
                      ]}
                    >
                      {spec.code.slice(0, 2).toUpperCase()}
                    </Text>
                  );
                })()}
              </View>
            ) : (
              <View style={styles.languageSelectorGlobeWrap}>
                <Ionicons name="globe-outline" size={18} color={CalmColors.textMuted} />
              </View>
            )}

            <Text
              style={[
                styles.languageSelectorValue,
                spec && styles.languageSelectorValueActive,
              ]}
              numberOfLines={1}
            >
              {spec ? spec.nativeName : 'All languages'}
            </Text>

            <Text style={styles.languageSelectorCount}>
              {languageTotal} {languageTotal === 1 ? 'title' : 'titles'}
            </Text>

            <Ionicons
              name={pickerOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={spec ? CalmColors.sageDark : CalmColors.textMuted}
            />
          </PressableScale>

          {pickerOpen && (
            <Reveal style={styles.dropdownPositioner} offset={-4} duration={140}>
              <LanguageDropdown
                languages={languages}
                selected={language}
                totalCount={browsableItems.length}
                onSelect={(code) => void setLanguage(code)}
                onClose={() => setPickerOpen(false)}
              />
            </Reveal>
          )}
        </View>
      </View>

      {/* Tap anywhere outside the menu to dismiss it */}
      {pickerOpen && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          accessibilityLabel="Close language menu"
          onPress={() => setPickerOpen(false)}
        />
      )}

      {/* Result status */}
      {showCountRow && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {displayedItems.length} titles
            {spec ? ` in ${spec.nativeName}` : ''}
            {searchTerm.length > 0 ? ` matching "${searchTerm}"` : ''}
          </Text>
          <TouchableOpacity
            onPress={handleClearFilters}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.resetFiltersText}>Clear ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Scrollable Discover-style grid */}
      {displayedItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="leaf-outline" size={48} color={CalmColors.sage} />
          <Text style={styles.emptyTitle}>
            {language
              ? `No ${spec?.nativeName ?? 'selected-language'} titles found`
              : 'No matching calm media found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchTerm.length > 0
              ? 'Try a shorter word, another spelling, or clear the language filter.'
              : 'Try another language, or show all languages to browse the whole library.'}
          </Text>
        </View>
      ) : (
        <MediaMasonry
          ref={gridRef}
          items={pagedItems}
          numColumns={numColumns}
          columnWidth={columnWidth}
          onSelect={handleSelectMovie}
          onPlay={handlePlayContent}
          onEndReached={handleLoadMore}
        />
      )}

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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CalmColors.canvasPrimary,
  },
  ambientWash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 190,
  },
  headerContainer: {
    position: 'relative',
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: CalmColors.divider,
    paddingBottom: 6,
    zIndex: 30,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CalmColors.canvasSecondary,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    marginRight: 8,
  },
  languageAnchor: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 10,
    zIndex: 60,
  },
  dropdownPositioner: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    zIndex: 70,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 48,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    backgroundColor: CalmColors.surfaceCard,
  },
  languageSelectorActive: {
    backgroundColor: CalmColors.sageSoft,
    borderColor: CalmColors.sageBorder,
  },
  languageSelectorGlobeWrap: {
    width: 28,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  languageSelectorIcon: {
    width: 32,
    height: 22,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CalmColors.canvasSecondary,
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.12)',
  },
  languageSelectorIconActive: {
    backgroundColor: CalmColors.sage,
    borderColor: CalmColors.sageDark,
  },
  languageSelectorFlag: {
    width: '100%',
    height: '100%',
  },
  languageSelectorIconLetter: {
    fontSize: 11,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    letterSpacing: 0.5,
  },
  languageSelectorIconLetterActive: {
    color: '#FFFFFF',
  },
  languageSelectorValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    flexShrink: 1,
  },
  languageSelectorValueActive: {
    color: CalmColors.sageDark,
  },
  languageSelectorCount: {
    marginLeft: 'auto',
    marginRight: 8,
    fontSize: 11,
    fontWeight: '600',
    color: CalmColors.textMuted,
  },

  /* Search */
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CalmColors.canvasSecondary,
    marginHorizontal: 16,
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: CalmColors.textPrimary,
    fontSize: 13.5,
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  clearIcon: {
    padding: 4,
  },

  /* Result status */
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: CalmColors.textMuted,
    flex: 1,
  },
  resetFiltersText: {
    fontSize: 11,
    fontWeight: '700',
    color: CalmColors.sageDark,
  },

  /* Grid */
  scrollContent: {
    paddingHorizontal: MEDIA_GRID_PADDING,
    paddingBottom: 90,
    paddingTop: 4,
  },

  /* Empty */
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    color: CalmColors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    color: CalmColors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
});
