import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { CalmNavbar } from '@/components/CalmNavbar';
import { MovieRow } from '@/components/MovieRow';
import { MovieDetailSheet } from '@/components/MovieDetailSheet';
import { ParentGateModal } from '@/components/ParentGateModal';
import { SettingsModal } from '@/components/SettingsModal';
import { GradientWaves } from '@/components/GradientWaves';
import { LinearGradient } from 'expo-linear-gradient';
import {
  StreamingServicesCarousel,
  StreamingServiceId,
} from '@/components/StreamingServicesCarousel';
import {
  KidsMediaItem,
  matchesStreamingService,
} from '@/constants/kidsDb';
import { getHomeShelves } from '@/constants/mediaSource';
import { CalmColors } from '@/constants/Colors';
import { useSaved } from '@/constants/SavedContext';
import { useLanguage } from '@/constants/LanguageContext';
import { useOnboarding } from '@/constants/OnboardingContext';
import { useSubscriptions } from '@/constants/SubscriptionsContext';
import { useCircadianWindow } from '@/constants/useCircadianWindow';
import { useContentRotation } from '@/constants/useContentRotation';
import { triggerHaptic } from '@/constants/haptics';

const SHELF_ICONS: Record<string, any> = {
  all: require('@/assets/icons/everything.png'),
  shows: require('@/assets/icons/shows.png'),
  learning: require('@/assets/icons/curious.png'),
  feelings: require('@/assets/icons/feelings.png'),
  bedtime: require('@/assets/icons/bedtime.png'),
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { savedMovies } = useSaved();
  const { language } = useLanguage();
  const { resetOnboarding: handleResetOnboarding } = useOnboarding();
  const { matchesUserSubscriptions, childAge } = useSubscriptions();

  const [activeService, setActiveService] = useState<StreamingServiceId>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<KidsMediaItem | null>(null);
  const [parentGateVisible, setParentGateVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const window = useCircadianWindow(childAge);
  const rotation = useContentRotation('home', `${language ?? ''}|${childAge ?? 'all'}|${window}`);

  // The 5 Core Homepage Categories (Row Shelves), ordered & ranked for the live circadian window:
  // 🌟 Mixed, 📺 Shows, 🎓 Learning, ❤️ Feelings, 🌙 Bedtime
  const mainShelves = useMemo(
    () => getHomeShelves(language, childAge, {
      window,
      savedMovies,
      rotation: rotation.ready ? rotation : undefined,
    }),
    [childAge, language, rotation, savedMovies, window]
  );

  const visibleRotationIds = useMemo(() => {
    const ids: number[] = [];
    for (const shelf of mainShelves) {
      const items = shelf.items
        .filter(matchesUserSubscriptions)
        .slice(0, 12);
      for (const item of items) ids.push(item.id);
    }
    return ids;
  }, [mainShelves, matchesUserSubscriptions]);
  const rotationReady = rotation.ready;
  const markRotationShown = rotation.markShown;

  useEffect(() => {
    if (rotationReady) markRotationShown(visibleRotationIds);
  }, [markRotationShown, rotationReady, visibleRotationIds]);

  const topNavbarOffset = insets.top > 0 ? insets.top + 8 : 14;
  const navbarHeight = 46;
  const contentPaddingTop = topNavbarOffset + navbarHeight + 6;

  const onRefresh = async () => {
    triggerHaptic('medium');
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 400);
  };

  const handleSelectMovie = useCallback((movie: KidsMediaItem) => {
    triggerHaptic('light');
    setSelectedMovie(movie);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Ambient React Bits Gradient Waves Canvas */}
      <View style={styles.wavesBackgroundWrapper} pointerEvents="none">
        <GradientWaves
          horizonColor={window === 'bedtime' ? '#141A11' : '#353E23'}
          waveColor={window === 'bedtime' ? '#3B4D2B' : '#5F7042'}
          crestColor="#DDE7CE"
          backgroundColor="transparent"
          lightMode={window !== 'bedtime'}
          speed={0.4}
          amplitude={2.5}
          relief={1}
          lightAngle={120}
          brightness={0.91}
          grain={0.02}
          swellOnClick={true}
          mouseInteraction={false}
          style={styles.wavesCanvas}
        />
        {/* A narrow edge fade lets the wave blend into the page instead of ending at a hard clip. */}
        <LinearGradient
          colors={['transparent', 'rgba(250, 248, 245, 0.24)', CalmColors.canvasPrimary]}
          locations={[0.68, 0.9, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      {/* Floating Liquid Glass Calm Navbar */}
      <CalmNavbar
        onSettingsPress={() => {
          triggerHaptic('light');
          setParentGateVisible(true);
        }}
        onProfilePress={() => {
          triggerHaptic('light');
          router.push('/profile');
        }}
        onLogoLongPress={handleResetOnboarding}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: contentPaddingTop },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={CalmColors.sage}
          />
        }
      >
        {/* Sleek Carousel of Streaming Services at Top */}
        <StreamingServicesCarousel
          activeService={activeService}
          onSelectService={(serviceId) => setActiveService(serviceId)}
        />

        {/* My List Row */}
        {savedMovies.length > 0 && activeService === 'all' && (
          <MovieRow
            title="Your Saved Titles"
            badge="My List"
            icon={require('@/assets/icons/feelings.png')}
            movies={savedMovies}
            onSelectMovie={handleSelectMovie}
            onPressHeader={() => {
              triggerHaptic('light');
              router.push('/profile');
            }}
          />
        )}

        {/* The 5 Homepage Category Shelves:
            1. 🌟 Mixed
            2. 📺 Shows
            3. 🎓 Learning
            4. ❤️ Feelings
            5. 🌙 Bedtime */}
        {mainShelves.map((shelf) => {
          let items = shelf.items;
          if (activeService !== 'all') {
            items = items.filter((item) => matchesStreamingService(item, activeService));
          }
          // Tantrum Preventer: Only show titles from subscriptions the family owns
          items = items.filter(matchesUserSubscriptions);

          if (items.length === 0) return null;

          // Limit home preview to top 12 items for instant rendering
          const previewItems = items.slice(0, 12);

          return (
            <MovieRow
              key={shelf.id}
              title={shelf.title}
              badge={shelf.badge}
              subtitle={shelf.subtitle}
              icon={SHELF_ICONS[shelf.id]}
              movies={previewItems}
              onSelectMovie={handleSelectMovie}
              onPressHeader={() => {
                triggerHaptic('light');
                router.push({
                  pathname: '/category/[id]',
                  params: { id: shelf.id },
                });
              }}
            />
          );
        })}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Detail Bottom Sheet Modal */}
      {selectedMovie && (
        <MovieDetailSheet
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onSelectRelated={(related) => setSelectedMovie(related)}
        />
      )}

      {/* Parent Math Gate Modal (Grown-Ups Only) */}
      <ParentGateModal
        visible={parentGateVisible}
        onSuccess={() => {
          setParentGateVisible(false);
          setSettingsVisible(true);
        }}
        onClose={() => setParentGateVisible(false)}
      />

      {/* Settings Modal (Child Age, Subscriptions, Suggest a Show) */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onResetTour={handleResetOnboarding}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CalmColors.canvasPrimary,
  },
  wavesBackgroundWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 480,
    backgroundColor: CalmColors.canvasPrimary,
    overflow: 'hidden',
    zIndex: 0,
  },
  wavesCanvas: {
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    paddingBottom: 115,
  },
});
