import React, { useDeferredValue, useEffect, useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Keyboard,
  ImageSourcePropType,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  KidsMediaItem,
  getMainShelves,
  isAudioItem,
} from '@/constants/kidsDb';
import { getBrowsableItems } from '@/constants/mediaSource';
import {
  DISCOVER_AGE_FILTERS,
  DiscoverAgeFilter,
  parseAgeRange,
} from '@/constants/ageTiers';
import {
  buildSavedAffinity,
  rankItems,
} from '@/constants/sanctuaryAlgorithm';
import { useCircadianWindow } from '@/constants/useCircadianWindow';
import { searchMedia } from '@/constants/search';
import { CalmColors } from '@/constants/Colors';
import { MovieDetailSheet } from '@/components/MovieDetailSheet';
import { CategoryModal } from '@/components/CategoryModal';
import { PressableScale } from '@/components/PressableScale';
import { Reveal } from '@/components/Reveal';
import {
  MediaMasonry,
  MEDIA_GRID_PADDING,
  useMediaGridLayout,
} from '@/components/MediaGrid';
import { useLanguage } from '@/constants/LanguageContext';
import { getLanguageSpec, matchesLanguage } from '@/constants/languages';
import { useSubscriptions } from '@/constants/SubscriptionsContext';
import { useSaved } from '@/constants/SavedContext';
import { triggerHaptic } from '@/constants/haptics';
import { useRemoteMedia } from '@/constants/useRemoteMedia';
import { useParentExternalLink } from '@/constants/useParentExternalLink';
import { AmbientWaveBand } from '@/components/AmbientWaveBand';
import { rotateRankedItems } from '@/constants/contentRotation';
import { useContentRotation } from '@/constants/useContentRotation';

const PAGE_SIZE = 48;

const RECENT_SEARCHES_KEY = '@zaen_recent_searches';
const SEARCH_SUGGESTIONS = ['bedtime', 'bluey', 'feelings', 'math', 'lullaby', 'PBS'];

// 1. Visual Sanctuary Gateway Tiles
export interface SanctuaryGate {
  id: string;
  title: string;
  subtitle: string;
  icon: ImageSourcePropType;
  bgColor: string;
  activeColor: string;
  borderColor: string;
  textColor: string;
  keywords?: string[];
  shelfId?: string;
}

export const SANCTUARY_GATES: SanctuaryGate[] = [
  {
    id: 'all',
    title: 'All',
    subtitle: 'Entire calm collection',
    icon: require('@/assets/icons/everything.png'),
    bgColor: 'rgba(112, 117, 82, 0.10)',
    activeColor: '#707552',
    borderColor: 'rgba(112, 117, 82, 0.25)',
    textColor: '#565B3A',
  },
  {
    id: 'audio_only',
    title: 'Audio',
    subtitle: 'Listen without screens',
    icon: require('@/assets/icons/music.png'),
    bgColor: 'rgba(232, 171, 106, 0.14)',
    activeColor: '#E8AB6A',
    borderColor: 'rgba(232, 171, 106, 0.30)',
    textColor: '#C78C4D',
  },
  {
    id: 'morning',
    title: 'Morning',
    subtitle: 'Gentle waking tempo',
    icon: require('@/assets/icons/morning.png'),
    bgColor: 'rgba(214, 137, 88, 0.10)',
    activeColor: '#D68958',
    borderColor: 'rgba(214, 137, 88, 0.26)',
    textColor: '#B86B3E',
    keywords: ['daniel tiger', 'trash truck', 'bluey', 'puffin rock', 'alma'],
  },
  {
    id: 'learning',
    title: 'Learning',
    subtitle: 'Science & quiet inquiry',
    icon: require('@/assets/icons/curious.png'),
    bgColor: 'rgba(112, 117, 82, 0.10)',
    activeColor: '#707552',
    borderColor: 'rgba(112, 117, 82, 0.25)',
    textColor: '#565B3A',
    shelfId: 'learning',
  },
  {
    id: 'feelings',
    title: 'Feelings',
    subtitle: 'Co-regulation & kindness',
    icon: require('@/assets/icons/feelings.png'),
    bgColor: 'rgba(232, 171, 106, 0.12)',
    activeColor: '#E8AB6A',
    borderColor: 'rgba(232, 171, 106, 0.28)',
    textColor: '#C78C4D',
    shelfId: 'feelings',
  },
  {
    id: 'bedtime',
    title: 'Bedtime',
    subtitle: 'Low audio & soothing',
    icon: require('@/assets/icons/bedtime.png'),
    bgColor: 'rgba(232, 171, 106, 0.12)',
    activeColor: '#E8AB6A',
    borderColor: 'rgba(232, 171, 106, 0.28)',
    textColor: '#C78C4D',
    shelfId: 'bedtime',
  },
  {
    id: 'shows',
    title: 'Shows',
    subtitle: 'PBS & CBeebies gems',
    icon: require('@/assets/icons/shows.png'),
    bgColor: 'rgba(112, 117, 82, 0.10)',
    activeColor: '#707552',
    borderColor: 'rgba(112, 117, 82, 0.25)',
    textColor: '#565B3A',
    shelfId: 'shows',
  },
  {
    id: 'tunes',
    title: 'Music',
    subtitle: 'Acoustic lullabies',
    icon: require('@/assets/icons/music.png'),
    bgColor: 'rgba(214, 137, 88, 0.10)',
    activeColor: '#D68958',
    borderColor: 'rgba(214, 137, 88, 0.26)',
    textColor: '#B86B3E',
    keywords: ['song', 'lullab', 'music', 'rhyme', 'melody', 'sing'],
  },
];

// 2. Child Age Stage Tiers (Clay Sanctuary Bears + Concise Age Ranges)
export type AgeFilter = DiscoverAgeFilter;
export const AGE_FILTERS: AgeFilter[] = DISCOVER_AGE_FILTERS;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();
  const { matchesUserSubscriptions, childAge } = useSubscriptions();
  const { savedMovies } = useSaved();
  const { numColumns, columnWidth } = useMediaGridLayout();
  const { openExternalLink, parentLinkGate } = useParentExternalLink();

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const searchTerm = deferredQuery.trim();

  const [activeGate, setActiveGate] = useState('all');
  const [activeAge, setActiveAge] = useState<DiscoverAgeFilter['id']>('all');
  const [audioOnly, setAudioOnly] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<KidsMediaItem | null>(null);
  const [ageDropdownOpen, setAgeDropdownOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const filterKey = `${searchTerm}|${activeGate}|${activeAge}|${audioOnly ? 1 : 0}|${language ?? ''}`;
  const rotation = useContentRotation('discover', filterKey);
  const [pageSlice, setPageSlice] = useState<{ key: string; count: number }>({
    key: filterKey,
    count: PAGE_SIZE,
  });
  const visibleCount = pageSlice.key === filterKey ? pageSlice.count : PAGE_SIZE;

  const effectiveAgeForRanking = activeAge !== 'all' ? activeAge : childAge;
  const window = useCircadianWindow(effectiveAgeForRanking);
  const savedAffinity = useMemo(() => buildSavedAffinity(savedMovies), [savedMovies]);



  // Pre-load full browsable sanctuary library & shelf database
  const allBrowsableItems = useMemo(() => getBrowsableItems(), []);
  const mainShelves = useMemo(() => getMainShelves(childAge), [childAge]);

  const remoteParams = useMemo(() => ({
    limit: PAGE_SIZE,
    stimulation: 'all',
    gate: activeGate,
    age: activeAge !== 'all' ? activeAge : undefined,
    language: language ?? undefined,
    audio_only: audioOnly || activeGate === 'audio_only',
    query: searchTerm || undefined,
    sort: searchTerm.length === 0 ? 'recommended' as const : undefined,
    rotationDate: searchTerm.length === 0 ? rotation.dayKey : undefined,
    rotationSeed: searchTerm.length === 0 ? rotation.installSeed : undefined,
    rotationSurface: searchTerm.length === 0 ? 'discover' as const : undefined,
  }), [activeAge, activeGate, audioOnly, language, rotation.dayKey, rotation.installSeed, searchTerm]);
  const remoteMedia = useRemoteMedia(remoteParams, rotation.ready);

  // Restore recent searches once.
  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(RECENT_SEARCHES_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSearches(
            parsed
              .filter((item): item is string => typeof item === 'string')
              .slice(0, 6)
          );
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const rememberSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;

    setRecentSearches((prev) => {
      const next = [
        clean,
        ...prev.filter(
          (item) => item.toLowerCase() !== clean.toLowerCase()
        ),
      ].slice(0, 6);
      AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearRecentSearches = () => {
    triggerHaptic('light');
    setRecentSearches([]);
    AsyncStorage.removeItem(RECENT_SEARCHES_KEY).catch(() => {});
  };

  // Ranked text search, or circadian/age/saved-ranked browsing when the query is empty.
  const displayedItems = useMemo(() => {
    if (remoteMedia.ready && !remoteMedia.failed) {
      return remoteMedia.items.filter(matchesUserSubscriptions);
    }

    let pool: KidsMediaItem[];
    const isSearching = searchTerm.length > 0;

    if (isSearching) {
      pool = searchMedia(searchTerm, { language });
    } else {
      pool = allBrowsableItems;

      if (activeGate === 'audio_only') {
        pool = pool.filter((item) => isAudioItem(item));
      } else if (activeGate !== 'all') {
        const gateObj = SANCTUARY_GATES.find((g) => g.id === activeGate);
        if (gateObj?.shelfId) {
          const matchingShelf = mainShelves.find((s) => s.id === gateObj.shelfId);
          if (matchingShelf && matchingShelf.items.length > 0) {
            pool = matchingShelf.items;
          }
        } else if (gateObj?.keywords) {
          pool = allBrowsableItems.filter((item) => {
            const text = `${item.title} ${item.description || ''} ${item.genre_category || ''}`.toLowerCase();
            return gateObj.keywords!.some((kw) => text.includes(kw));
          });
        }
      }

      if (language) {
        pool = pool.filter((item) => matchesLanguage(item, language));
      }
    }

    // Audio-Only filter applies to both text searches and category browse
    if (audioOnly || activeGate === 'audio_only') {
      pool = pool.filter((item) => isAudioItem(item));
    }

    // Explicit Discover age filter applies to both search results and browse shelves
    if (activeAge !== 'all') {
      const ageObj = AGE_FILTERS.find((a) => a.id === activeAge);
      if (ageObj && ageObj.minAge !== undefined && ageObj.maxAge !== undefined) {
        pool = pool.filter((item) => {
          const parsed = parseAgeRange(item.target_age_group);
          if (!parsed) return true;
          return parsed[0] <= ageObj.maxAge! && parsed[1] >= ageObj.minAge!;
        });
      }
    }

    // Tantrum Preventer: Only show titles from subscriptions the family owns
    pool = pool.filter(matchesUserSubscriptions);

    // Apply Sanctuary ranking on browse feeds only; preserve lexical relevance on search
    if (!isSearching) {
      pool = rankItems(pool, {
        window,
        ageTier: effectiveAgeForRanking,
        savedAffinity,
        preferAudio: audioOnly || activeGate === 'audio_only',
        gateId: activeGate,
      });
      if (rotation.ready) {
        pool = rotateRankedItems(pool, rotation, { qualityBandSize: 12 });
      }
    }

    return pool;
  }, [
    searchTerm,
    activeGate,
    activeAge,
    audioOnly,
    language,
    allBrowsableItems,
    mainShelves,
    matchesUserSubscriptions,
    window,
    effectiveAgeForRanking,
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
  }, [displayedItems.length, filterKey, remoteMedia]);

  const handleSelectMovie = useCallback((item: KidsMediaItem) => {
    if (searchTerm) rememberSearch(searchTerm);
    triggerHaptic('light');
    setSelectedMovie(item);
  }, [searchTerm, rememberSearch]);

  const handlePlayContent = useCallback((item: KidsMediaItem) => {
    triggerHaptic('heavy');
    if (item.platform_url) {
      openExternalLink(item.platform_url);
    }
  }, [openExternalLink]);

  const allGate = SANCTUARY_GATES[0];
  const audioGate = SANCTUARY_GATES[1];
  const selectedGate = SANCTUARY_GATES.find((g) => g.id === activeGate);
  const selectedAgeFilter = AGE_FILTERS.find((a) => a.id === activeAge);

  const isAllSelected = activeGate === 'all' && !audioOnly && query.length === 0;
  const isAudioSelected = (activeGate === 'audio_only' || audioOnly) && query.length === 0;
  const isCustomCategorySelected =
    activeGate !== 'all' && activeGate !== 'audio_only' && query.length === 0;
  const activeCustomGate = isCustomCategorySelected ? selectedGate : null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <AmbientWaveBand />

      {/* Top Header & Search Bar */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
        {/* Search Input Capsule with Integrated Age Filter */}
        <View style={styles.searchCapsuleWrap}>
          <View style={styles.searchCapsule}>
            <Ionicons
              name="search"
              size={16}
              color={CalmColors.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search titles, routines..."
              placeholderTextColor={CalmColors.textSubtle}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => {
                rememberSearch(query);
                Keyboard.dismiss();
              }}
              style={styles.input}
              accessibilityLabel="Search the library"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <PressableScale
                onPress={() => setQuery('')}
                style={styles.clearIcon}
                scaleTo={0.85}
              >
                <Ionicons name="close-circle" size={17} color={CalmColors.textMuted} />
              </PressableScale>
            )}

            {/* Subtle Divider */}
            <View style={styles.searchDivider} />

            {/* Integrated Age Filter Pill */}
            <PressableScale
              style={[
                styles.integratedAgePill,
                (activeAge !== 'all' || ageDropdownOpen) && styles.integratedAgePillActive,
              ]}
              scaleTo={0.95}
              haptic="selection"
              onPress={() => setAgeDropdownOpen((v) => !v)}
              accessibilityLabel="Select age tier"
            >
              {selectedAgeFilter?.icon ? (
                <Image
                  source={selectedAgeFilter.icon}
                  style={styles.integratedAgeIcon}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons
                  name="person-outline"
                  size={12}
                  color={activeAge !== 'all' || ageDropdownOpen ? '#FFFFFF' : CalmColors.textMuted}
                  style={{ marginRight: 3 }}
                />
              )}
              <Text
                style={[
                  styles.integratedAgeText,
                  (activeAge !== 'all' || ageDropdownOpen) && styles.integratedAgeTextActive,
                ]}
                numberOfLines={1}
              >
                {activeAge === 'all' ? 'All Ages' : selectedAgeFilter?.label ?? 'Age'}
              </Text>
              <Ionicons
                name={ageDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={11}
                color={activeAge !== 'all' || ageDropdownOpen ? '#FFFFFF' : CalmColors.textMuted}
                style={{ marginLeft: 3 }}
              />
            </PressableScale>
          </View>

          {/* Floating Age Filter Dropdown Menu (Anchored under integrated age chip) */}
          {ageDropdownOpen && (
            <Reveal style={styles.ageDropdownPositioner} offset={-4} duration={140}>
              <View style={styles.ageDropdownCard}>
                {AGE_FILTERS.map((age) => {
                  const isSelected = activeAge === age.id;
                  return (
                    <PressableScale
                      key={`age-dd-${age.id}`}
                      style={[styles.ageDropdownRow, isSelected && styles.ageDropdownRowActive]}
                      scaleTo={0.97}
                      haptic="selection"
                      onPress={() => {
                        setActiveAge(age.id);
                        setAgeDropdownOpen(false);
                      }}
                    >
                      <View style={styles.ageDropdownIconSlot}>
                        {age.icon ? (
                          <Image source={age.icon} style={styles.ageDropdownIcon} resizeMode="contain" />
                        ) : (
                          <Ionicons
                            name="people-outline"
                            size={16}
                            color={isSelected ? CalmColors.sageDark : CalmColors.textMuted}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.ageDropdownLabel,
                          isSelected && styles.ageDropdownLabelActive,
                        ]}
                      >
                        {age.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={15}
                          color={CalmColors.sageDark}
                          style={styles.ageDropdownCheck}
                        />
                      )}
                    </PressableScale>
                  );
                })}
              </View>
            </Reveal>
          )}
        </View>

        {/* Unified 3-Pill Sanctuary Category Bar (All, Audio, Categories) */}
        <View style={styles.categoryPillsRow}>
          {/* Pill 1: All */}
          <PressableScale
            style={[
              styles.categoryPill,
              isAllSelected && {
                backgroundColor: allGate.activeColor,
                borderColor: allGate.activeColor,
              },
            ]}
            scaleTo={0.96}
            haptic="selection"
            onPress={() => {
              setQuery('');
              setActiveGate('all');
              setAudioOnly(false);
              setAgeDropdownOpen(false);
            }}
            accessibilityLabel="Show all titles"
          >
            <Image
              source={allGate.icon}
              style={styles.categoryPillIcon}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.categoryPillText,
                isAllSelected && styles.categoryPillTextActive,
              ]}
              numberOfLines={1}
            >
              All
            </Text>
            {isAllSelected && (
              <View style={styles.pillCheckDot}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            )}
          </PressableScale>

          {/* Pill 2: Audio */}
          <PressableScale
            style={[
              styles.categoryPill,
              isAudioSelected && {
                backgroundColor: audioGate.activeColor,
                borderColor: audioGate.activeColor,
              },
            ]}
            scaleTo={0.96}
            haptic="selection"
            onPress={() => {
              setQuery('');
              setActiveGate('audio_only');
              setAudioOnly(true);
              setAgeDropdownOpen(false);
            }}
            accessibilityLabel="Show audio only"
          >
            <Image
              source={audioGate.icon}
              style={styles.categoryPillIcon}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.categoryPillText,
                isAudioSelected && styles.categoryPillTextActive,
              ]}
              numberOfLines={1}
            >
              Audio
            </Text>
            {isAudioSelected && (
              <View style={styles.pillCheckDot}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>
            )}
          </PressableScale>

          {/* Pill 3: Categories / Active Off-Bar Category */}
          <PressableScale
            style={[
              styles.categoryPill,
              isCustomCategorySelected
                ? {
                    backgroundColor: activeCustomGate?.activeColor ?? CalmColors.sage,
                    borderColor: activeCustomGate?.activeColor ?? CalmColors.sageDark,
                  }
                : categoryModalOpen
                ? styles.categoryPillActive
                : styles.morePill,
            ]}
            scaleTo={0.96}
            haptic="selection"
            onPress={() => {
              setAgeDropdownOpen(false);
              setCategoryModalOpen(true);
            }}
            accessibilityLabel="Browse categories"
          >
            {isCustomCategorySelected && activeCustomGate?.icon ? (
              <Image
                source={activeCustomGate.icon}
                style={styles.categoryPillIcon}
                resizeMode="contain"
              />
            ) : (
              <Ionicons
                name="grid-outline"
                size={12}
                color={categoryModalOpen ? '#FFFFFF' : CalmColors.textMuted}
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              style={[
                styles.categoryPillText,
                (isCustomCategorySelected || categoryModalOpen) && styles.categoryPillTextActive,
              ]}
              numberOfLines={1}
            >
              {isCustomCategorySelected && activeCustomGate ? activeCustomGate.title : 'Categories'}
            </Text>
            <Ionicons
              name={categoryModalOpen ? 'chevron-up' : 'chevron-down'}
              size={11}
              color={isCustomCategorySelected || categoryModalOpen ? '#FFFFFF' : CalmColors.textMuted}
              style={{ marginLeft: 3 }}
            />
          </PressableScale>
        </View>

        {/* Recent searches, shown only before a new query is typed */}
        {query.length === 0 && recentSearches.length > 0 && (
          <Reveal style={styles.recentBlock} offset={-4} duration={140}>
            <View style={styles.recentHeader}>
              <View style={styles.recentLabelWrap}>
                <Ionicons name="time-outline" size={12} color={CalmColors.textSubtle} />
                <Text style={styles.recentLabel}>RECENT SEARCHES</Text>
              </View>
              <PressableScale
                onPress={clearRecentSearches}
                scaleTo={0.95}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.recentClear}>Clear</Text>
              </PressableScale>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recentSearches.map((term) => (
                <PressableScale
                  key={term}
                  style={styles.recentChip}
                  scaleTo={0.94}
                  haptic="selection"
                  onPress={() => {
                    setQuery(term);
                    rememberSearch(term);
                  }}
                >
                  <Ionicons
                    name="search"
                    size={11}
                    color={CalmColors.sageDark}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.recentChipText}>{term}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          </Reveal>
        )}
      </View>

      {/* Outside Tap Overlay to dismiss Age Dropdown */}
      {ageDropdownOpen && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          accessibilityLabel="Close age menu"
          onPress={() => setAgeDropdownOpen(false)}
        />
      )}

      {/* Result Status — only shown when filtering or searching */}
      {(activeGate !== 'all' || activeAge !== 'all' || audioOnly || searchTerm.length > 0 || Boolean(language)) && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {displayedItems.length} titles
            {searchTerm.length > 0
              ? ` matching "${searchTerm}"`
              : activeGate === 'audio_only' || audioOnly
              ? ' · 🎧 Audio'
              : ` in ${selectedGate?.title || 'All'}`}
            {activeAge !== 'all' ? ` · ${AGE_FILTERS.find((a) => a.id === activeAge)?.label || ''}` : ''}
            {language ? ` · ${getLanguageSpec(language).nativeName}` : ''}
          </Text>
          <PressableScale
            scaleTo={0.95}
            haptic="light"
            onPress={() => {
              setQuery('');
              setActiveGate('all');
              setActiveAge('all');
              setAudioOnly(false);
              setAgeDropdownOpen(false);
              if (language) void setLanguage(null);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.resetFiltersText}>Clear ✕</Text>
          </PressableScale>
        </View>
      )}

      {/* Adaptive Natural Aspect Ratio Masonry Grid */}
      {displayedItems.length === 0 ? (
        <Reveal style={styles.emptyBox} offset={0} duration={140}>
          <Ionicons
            name={searchTerm ? 'search-outline' : 'leaf-outline'}
            size={48}
            color={CalmColors.sage}
          />
          <Text style={styles.emptyTitle}>
            {searchTerm
              ? `No results for "${searchTerm}"`
              : 'No matching calm media found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchTerm
              ? 'Try a shorter word, another spelling, or one of these:'
              : 'Try another category or clear the age filter to see more calm titles.'}
          </Text>

          {searchTerm ? (
            <>
              <View style={styles.suggestionRow}>
                {SEARCH_SUGGESTIONS.map((suggestion) => (
                  <PressableScale
                    key={suggestion}
                    style={styles.suggestionChip}
                    scaleTo={0.94}
                    haptic="selection"
                    onPress={() => {
                      setQuery(suggestion);
                      rememberSearch(suggestion);
                    }}
                  >
                    <Text style={styles.suggestionChipText}>{suggestion}</Text>
                  </PressableScale>
                ))}
              </View>

              <PressableScale
                style={styles.emptyAction}
                scaleTo={0.97}
                haptic="light"
                onPress={() => setQuery('')}
              >
                <Text style={styles.emptyActionText}>Clear search</Text>
              </PressableScale>

              {language && (
                <PressableScale
                  style={styles.emptyLink}
                  scaleTo={0.97}
                  haptic="selection"
                  onPress={() => void setLanguage(null)}
                >
                  <Text style={styles.emptyLinkText}>
                    Search all languages instead
                  </Text>
                </PressableScale>
              )}
            </>
          ) : (
            <PressableScale
              style={styles.emptyAction}
              scaleTo={0.97}
              haptic="light"
              onPress={() => {
                setActiveGate('all');
                setActiveAge('all');
                setAgeDropdownOpen(false);
              }}
            >
              <Text style={styles.emptyActionText}>Clear filters</Text>
            </PressableScale>
          )}
        </Reveal>
      ) : (
        <MediaMasonry
          items={pagedItems}
          numColumns={numColumns}
          columnWidth={columnWidth}
          onSelect={handleSelectMovie}
          onPlay={handlePlayContent}
          onEndReached={handleLoadMore}
        />
      )}

      {/* Detail Bottom Sheet Modal */}
      {selectedMovie && (
        <MovieDetailSheet
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onSelectRelated={(related) => setSelectedMovie(related)}
        />
      )}

      {/* Centered Sanctuary Categories Modal */}
      <CategoryModal
        visible={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={SANCTUARY_GATES}
        activeGateId={activeGate}
        audioOnly={audioOnly}
        onSelectCategory={(gate) => {
          setQuery('');
          setActiveGate(gate.id);
          if (gate.id === 'audio_only') {
            setAudioOnly(true);
          } else {
            setAudioOnly(false);
          }
        }}
      />
      {parentLinkGate}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CalmColors.canvasPrimary,
  },
  headerContainer: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: CalmColors.divider,
    paddingBottom: 6,
    zIndex: 80,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: CalmColors.sage,
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: CalmColors.textPrimary,
    letterSpacing: 0.5,
  },
  searchCapsuleWrap: {
    position: 'relative',
    zIndex: 70,
  },
  searchCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CalmColors.canvasSecondary,
    marginHorizontal: 16,
    borderRadius: 22,
    paddingLeft: 12,
    paddingRight: 6,
    height: 44,
    borderWidth: 1,
    borderColor: CalmColors.divider,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 7,
  },
  input: {
    flex: 1,
    color: CalmColors.textPrimary,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      } as any,
    }),
  },
  clearIcon: {
    padding: 4,
    marginRight: 2,
  },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: CalmColors.divider,
    marginHorizontal: 6,
  },
  integratedAgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 30,
    borderRadius: 15,
    backgroundColor: CalmColors.surfaceCard,
    borderWidth: 1,
    borderColor: CalmColors.divider,
  },
  integratedAgePillActive: {
    backgroundColor: CalmColors.sage,
    borderColor: CalmColors.sageDark,
  },
  integratedAgeIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  integratedAgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: CalmColors.textPrimary,
  },
  integratedAgeTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Recent searches */
  recentBlock: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 6,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recentLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recentLabel: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: CalmColors.textSubtle,
  },
  recentClear: {
    fontSize: 10.5,
    fontWeight: '700',
    color: CalmColors.sageDark,
  },
  recentScroll: {
    gap: 6,
    paddingRight: 4,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: CalmColors.surfaceGlass,
    borderWidth: 1,
    borderColor: CalmColors.divider,
  },
  recentChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: CalmColors.textPrimary,
  },

  /* Unified 3-Pill Sanctuary Category Bar */
  categoryPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    gap: 8,
    paddingBottom: 4,
  },
  categoryPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    height: 38,
    borderRadius: 19,
    backgroundColor: CalmColors.surfaceCard,
    borderWidth: 1,
    borderColor: CalmColors.divider,
  },
  categoryPillActive: {
    backgroundColor: CalmColors.sage,
    borderColor: CalmColors.sageDark,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(44, 37, 35, 0.12)',
      } as any,
      default: {
        shadowColor: 'rgba(44, 37, 35, 0.16)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  morePill: {
    backgroundColor: CalmColors.canvasSecondary,
    borderColor: 'rgba(74, 63, 56, 0.12)',
  },
  categoryPillIcon: {
    width: 17,
    height: 17,
    marginRight: 5,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: CalmColors.textPrimary,
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pillCheckDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  ageDropdownPositioner: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 100,
  },
  ageDropdownCard: {
    width: 160,
    backgroundColor: CalmColors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(112, 117, 82, 0.20)',
    padding: 6,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 30px rgba(44, 37, 35, 0.16), 0 2px 8px rgba(44, 37, 35, 0.08)',
      } as any,
      default: {
        shadowColor: '#2C2523',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
        elevation: 12,
      },
    }),
  },
  ageDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2,
  },
  ageDropdownRowActive: {
    backgroundColor: 'rgba(112, 117, 82, 0.10)',
  },
  ageDropdownIconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  ageDropdownIcon: {
    width: 22,
    height: 22,
  },
  ageDropdownLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: CalmColors.textPrimary,
  },
  ageDropdownLabelActive: {
    color: CalmColors.sageDark,
    fontWeight: '800',
  },
  ageDropdownCheck: {
    marginLeft: 'auto',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
  },

  /* Result Status Subheader */
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

  /* Adaptive Masonry Layout */
  scrollContent: {
    paddingHorizontal: MEDIA_GRID_PADDING,
    paddingBottom: 90,
    paddingTop: 4,
  },

  /* Empty State */
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
    marginBottom: 10,
    lineHeight: 19,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 14,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: CalmColors.surfaceGlass,
    borderWidth: 1,
    borderColor: CalmColors.sageBorder,
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: CalmColors.sageDark,
  },
  emptyAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: CalmColors.sage,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyLink: {
    marginTop: 12,
  },
  emptyLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: CalmColors.sageDark,
  },
});
