import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/PressableScale';
import {
  getDedicatedHubData,
  KidsMediaItem,
  matchesStreamingService,
  isAudioItem,
} from '@/constants/kidsDb';
import {
  StreamingServicesCarousel,
  StreamingServiceId,
} from '@/components/StreamingServicesCarousel';
import { MovieRow } from '@/components/MovieRow';
import { MovieDetailSheet } from '@/components/MovieDetailSheet';
import { CalmColors } from '@/constants/Colors';
import { triggerHaptic } from '@/constants/haptics';
import { useLanguage } from '@/constants/LanguageContext';
import { useSubscriptions } from '@/constants/SubscriptionsContext';
import { useRemoteMedia } from '@/constants/useRemoteMedia';
import { getLanguageSpec, matchesLanguage } from '@/constants/languages';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContentRotation } from '@/constants/useContentRotation';
import { rotateRankedItems } from '@/constants/contentRotation';

const CATEGORY_ICONS: Record<string, any> = {
  all: require('@/assets/icons/everything.png'),
  mixed: require('@/assets/icons/everything.png'),
  shows: require('@/assets/icons/shows.png'),
  learning: require('@/assets/icons/curious.png'),
  feelings: require('@/assets/icons/feelings.png'),
  bedtime: require('@/assets/icons/bedtime.png'),
};

export default function DedicatedCategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = insets.top > 0 ? insets.top + 6 : 14;
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = (id || 'all').toLowerCase();
  const { language } = useLanguage();
  const { matchesUserSubscriptions } = useSubscriptions();
  const languageSpec = language ? getLanguageSpec(language) : null;

  const [activePlatform, setActivePlatform] = useState<StreamingServiceId>('all');
  const [selectedMovie, setSelectedMovie] = useState<KidsMediaItem | null>(null);

  // Dedicated Bedtime Superpower: Sleep Audio Mode
  const [sleepAudioOnly, setSleepAudioOnly] = useState<boolean>(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const rotation = useContentRotation(
    'category',
    `${categoryId}|${language ?? ''}|${activePlatform}|${sleepAudioOnly ? 1 : 0}`
  );

  // Load curated hub data (thematic sub-shelves)
  const hub = useMemo(() => getDedicatedHubData(categoryId), [categoryId]);

  // The curated hub remains the offline fallback. Once the VPS responds, this
  // category surface uses the same cursor-backed catalog as Discover/search.
  const remoteCategorySupported =
    ['all', 'mixed', 'shows', 'learning', 'feelings', 'bedtime'].includes(categoryId);
  const remoteParams = useMemo(() => ({
    limit: 48,
    stimulation: 'all',
    gate: ['all', 'mixed'].includes(categoryId) ? undefined : categoryId,
    language: language ?? undefined,
    platforms: activePlatform === 'all' ? undefined : [activePlatform],
    audio_only: categoryId === 'bedtime' && sleepAudioOnly,
    sort: 'recommended' as const,
    rotationDate: rotation.dayKey,
    rotationSeed: rotation.installSeed,
    rotationSurface: 'category' as const,
  }), [activePlatform, categoryId, language, rotation.dayKey, rotation.installSeed, sleepAudioOnly]);
  const remoteMedia = useRemoteMedia(remoteParams, remoteCategorySupported && rotation.ready);
  const remoteAvailable = remoteMedia.ready && !remoteMedia.failed;
  const remoteItems = useMemo(
    () => remoteMedia.items.filter(matchesUserSubscriptions),
    [matchesUserSubscriptions, remoteMedia.items]
  );

  const offlineRotationIds = useMemo(() => {
    const ids: number[] = [];
    for (const shelf of hub.subShelves) {
      ids.push(...shelf.items.slice(0, 48).map((item) => item.id));
    }
    return ids;
  }, [hub]);
  const rotationReady = rotation.ready;
  const markRotationShown = rotation.markShown;

  useEffect(() => {
    if (!rotationReady) return;
    const ids = remoteAvailable
      ? remoteItems.slice(0, 48).map((item) => item.id)
      : offlineRotationIds;
    markRotationShown(ids);
  }, [markRotationShown, offlineRotationIds, remoteAvailable, remoteItems, rotationReady]);

  // Total items in hub
  const totalItemCount = useMemo(() => {
    const seen = new Set<number>();
    hub.subShelves.forEach((s) =>
      s.items.forEach((item) => {
        if (matchesLanguage(item, language)) seen.add(item.id);
      })
    );
    return seen.size;
  }, [hub, language]);
  const visibleItemCount = remoteAvailable
    ? remoteMedia.total ?? remoteItems.length
    : totalItemCount;

  const languageHasContent = useMemo(
    () =>
      !language ||
      hub.subShelves.some((s) =>
        s.items.some((item) => matchesLanguage(item, language))
      ),
    [hub, language]
  );

  const handleSelectMovie = (movie: KidsMediaItem) => {
    triggerHaptic('light');
    setSelectedMovie(movie);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Sleek, Breathable Glass Top Bar */}
      <View style={[styles.topBar, { paddingTop: topPadding }]}>
        {/* Back Button */}
        <PressableScale
          style={styles.circleButton}
          onPress={() => {
            triggerHaptic('selection');
            router.back();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={CalmColors.textPrimary}
          />
        </PressableScale>

        {/* Category Title & Inline Count */}
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            {CATEGORY_ICONS[categoryId] && (
              <Image
                source={CATEGORY_ICONS[categoryId]}
                style={styles.headerMedallionIcon}
                resizeMode="contain"
              />
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>
              {hub.title}
              <Text style={styles.headerCountText}> ({visibleItemCount} contents)</Text>
            </Text>
          </View>
        </View>

        {/* Optical Balancer (Clean Breathing Room on Right) */}
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bedtime Superpower: Ultra-Compact Sleep Bar */}
        {categoryId === 'bedtime' && (
          <View style={styles.sleepControlRow}>
            <PressableScale
              style={[
                styles.sleepTogglePill,
                sleepAudioOnly && styles.sleepTogglePillActive,
              ]}
              onPress={() => {
                triggerHaptic('medium');
                setSleepAudioOnly(!sleepAudioOnly);
              }}
            >
              <Ionicons
                name="moon"
                size={14}
                color={sleepAudioOnly ? '#FFFFFF' : CalmColors.amber}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.sleepToggleText,
                  sleepAudioOnly && styles.sleepToggleTextActive,
                ]}
              >
                {sleepAudioOnly ? 'Audio Only Mode (ON)' : 'Audio Only Mode'}
              </Text>
            </PressableScale>

            {/* Quick Timer Chips */}
            <View style={styles.timerChipsGroup}>
              {[15, 30, 45].map((mins) => {
                const isActive = sleepTimer === mins;
                return (
                  <PressableScale
                    key={mins}
                    style={[
                      styles.timerChip,
                      isActive && styles.timerChipActive,
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSleepTimer(isActive ? null : mins);
                    }}
                  >
                    <Text
                      style={[
                        styles.timerChipText,
                        isActive && styles.timerChipTextActive,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        )}

        {/* Floating Streaming Platform Dock */}
        <View style={styles.dockWrapper}>
          <StreamingServicesCarousel
            activeService={activePlatform}
            onSelectService={(serviceId) => setActivePlatform(serviceId)}
          />
        </View>

        {/* The VPS catalog replaces the curated shelves after a valid response. */}
        {remoteAvailable ? (
          remoteItems.length > 0 ? (
            <>
              <View style={styles.shelfBlock}>
                <MovieRow
                  title="Live catalog"
                  movies={remoteItems}
                  onSelectMovie={handleSelectMovie}
                />
              </View>
              {remoteMedia.hasMore && (
                <PressableScale
                  style={styles.loadMoreButton}
                  onPress={() => void remoteMedia.loadMore()}
                  disabled={remoteMedia.loading}
                >
                  <Text style={styles.loadMoreButtonText}>
                    {remoteMedia.loading ? 'Loading…' : 'Load more'}
                  </Text>
                </PressableScale>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name={language ? 'language-outline' : 'tv-outline'}
                size={40}
                color={CalmColors.textSubtle}
              />
              <Text style={styles.emptyTitle}>
                {language
                  ? `No ${languageSpec?.nativeName ?? 'selected-language'} titles in this collection yet`
                  : 'No titles are available in this collection yet'}
              </Text>
            </View>
          )
        ) : (
          <>
            {/* Offline curated fallback */}
            {hub.subShelves.map((shelf) => {
              let items = shelf.items;

              if (language) {
                items = items.filter((item) => matchesLanguage(item, language));
              }

              if (activePlatform !== 'all') {
                items = items.filter((item) =>
                  matchesStreamingService(item, activePlatform)
                );
              }

              if (categoryId === 'bedtime' && sleepAudioOnly) {
                items = items.filter((item) => isAudioItem(item));
              }

              items = items.filter(matchesUserSubscriptions);

              if (rotation.ready) {
                items = rotateRankedItems(items, {
                  ...rotation,
                  filterKey: `${categoryId}|${shelf.id}`,
                }, { qualityBandSize: 8 });
              }

              if (items.length === 0) return null;

              return (
                <View key={shelf.id} style={styles.shelfBlock}>
                  <MovieRow
                    title={shelf.title}
                    movies={items}
                    onSelectMovie={handleSelectMovie}
                  />
                </View>
              );
            })}

            {/* Empty State when Platform Filter has no matches */}
            {hub.subShelves.every((s) => {
              let items = language
                ? s.items.filter((item) => matchesLanguage(item, language))
                : s.items;
              if (activePlatform !== 'all') {
                items = items.filter((item) =>
                  matchesStreamingService(item, activePlatform)
                );
              }
              items = items.filter(matchesUserSubscriptions);
              return items.length === 0;
            }) && (
          <View style={styles.emptyState}>
            <Ionicons
              name={languageHasContent ? 'tv-outline' : 'language-outline'}
              size={40}
              color={CalmColors.textSubtle}
            />
            <Text style={styles.emptyTitle}>
              {languageHasContent
                ? `No shows available on ${activePlatform.toUpperCase()}`
                : `No ${languageSpec?.nativeName ?? 'selected-language'} titles in this collection yet`}
            </Text>
            <PressableScale
              style={styles.emptyButton}
              onPress={() => {
                triggerHaptic('selection');
                if (!languageHasContent) {
                  router.push('/languages');
                } else {
                  setActivePlatform('all');
                  setSleepAudioOnly(false);
                }
              }}
            >
              <Text style={styles.emptyButtonText}>
                {languageHasContent ? 'Reset Platform Filter' : 'Browse Languages'}
              </Text>
            </PressableScale>
              </View>
            )}
          </>
        )}

        <View style={{ height: 70 }} />
      </ScrollView>

      {/* Movie Detail Bottom Sheet Modal */}
      {selectedMovie && (
        <MovieDetailSheet
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onSelectRelated={(related) => setSelectedMovie(related)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CalmColors.canvasPrimary,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(250, 248, 245, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: CalmColors.dividerSubtle,
    zIndex: 40,
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.08)',
    shadowColor: '#2C2523',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  headerMedallionIcon: {
    width: 22,
    height: 22,
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    letterSpacing: -0.2,
  },
  headerCountText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: CalmColors.textMuted,
    letterSpacing: 0,
  },
  headerRightSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 40,
  },
  dockWrapper: {
    marginTop: 0,
    marginBottom: 4,
  },
  shelfBlock: {
    marginBottom: 2,
  },
  loadMoreButton: {
    alignSelf: 'center',
    backgroundColor: CalmColors.sage,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
    marginBottom: 16,
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Bedtime Sleep Control Bar */
  sleepControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  sleepTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CalmColors.amberSoft,
    borderWidth: 1,
    borderColor: CalmColors.amberBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  sleepTogglePillActive: {
    backgroundColor: CalmColors.amber,
    borderColor: CalmColors.amber,
    shadowColor: CalmColors.amberDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  sleepToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: CalmColors.amberDark,
  },
  sleepToggleTextActive: {
    color: '#FFFFFF',
  },
  timerChipsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(74, 63, 56, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.14)',
  },
  timerChipActive: {
    backgroundColor: CalmColors.amber,
    borderColor: CalmColors.amber,
  },
  timerChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: CalmColors.textPrimary,
  },
  timerChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 14,
    textAlign: 'center',
    color: CalmColors.textPrimary,
  },
  emptyButton: {
    backgroundColor: CalmColors.sage,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
