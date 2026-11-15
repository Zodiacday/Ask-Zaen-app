import React, { useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/PressableScale';
import { KidsMediaItem } from '@/constants/kidsDb';
import { CalmColors } from '@/constants/Colors';
import { useSaved } from '@/constants/SavedContext';
import { triggerHaptic } from '@/constants/haptics';
import { ResilientPoster } from '@/components/ResilientPoster';

interface HeroBillboardCarouselProps {
  movies: KidsMediaItem[];
  onSelectMovie: (movie: KidsMediaItem) => void;
  onPlayContent: (movie: KidsMediaItem) => void;
}

export const HeroBillboardCarousel: React.FC<HeroBillboardCarouselProps> = ({
  movies,
  onSelectMovie,
  onPlayContent,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [fadeAnim] = useState(() => new Animated.Value(1));

  const { isSaved, toggleSave } = useSaved();

  const total = movies.length;
  const currentMovie = movies[currentIndex] || movies[0];

  const changeSlide = useCallback((newIndex: number) => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0.35,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      setCurrentIndex(newIndex);
      // Fade back in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
  }, [fadeAnim]);

  const goToPrev = useCallback(() => {
    triggerHaptic('selection');
    const prev = (currentIndex - 1 + total) % total;
    changeSlide(prev);
  }, [changeSlide, currentIndex, total]);

  const goToNext = useCallback(() => {
    triggerHaptic('selection');
    const next = (currentIndex + 1) % total;
    changeSlide(next);
  }, [changeSlide, currentIndex, total]);

  // Auto advance slides every 6.5 seconds
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const interval = setInterval(goToNext, 6500);
    return () => clearInterval(interval);
  }, [goToNext, isPaused, total]);

  if (!currentMovie) return null;

  const saved = isSaved(currentMovie.id);
  const title = currentMovie.title || 'Calm Pick';
  const creator = currentMovie.creator_publisher || 'Curated pick';
  const ageGroup = currentMovie.target_age_group ? `Age ${currentMovie.target_age_group}` : 'All Ages';
  const duration = currentMovie.duration || 'Feature';
  const isHighStim = currentMovie.stimulation_label === 'high';

  let customBadge = isHighStim ? 'Too stimulating' : 'Healthy pick';
  if (currentMovie.metadata_json) {
    try {
      const meta = JSON.parse(currentMovie.metadata_json);
      if (meta.badge) customBadge = meta.badge;
    } catch {}
  }

  return (
    <View
      style={styles.container}
      // Pause auto-rotation on mouse hover or touch on web
      // @ts-ignore
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* High-Resolution HD Backdrop Image with Animated Fade */}
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <ResilientPoster
          item={currentMovie}
          style={styles.poster}
          contentFit="cover"
          priority="high"
        />
      </Animated.View>

      {/* Gentle Alabaster / Organic Sandstone Gradients */}
      <LinearGradient
        colors={['rgba(250, 248, 245, 0.88)', 'rgba(250, 248, 245, 0.2)', 'transparent']}
        style={styles.topVignette}
      />
      <LinearGradient
        colors={[
          'transparent',
          'rgba(250, 248, 245, 0.45)',
          'rgba(250, 248, 245, 0.94)',
          CalmColors.canvasPrimary,
        ]}
        locations={[0, 0.45, 0.78, 1]}
        style={styles.bottomVignette}
      />

      {/* Left Navigation Chevron Button */}
      {total > 1 && (
        <PressableScale
          style={styles.navArrowLeft}
          onPress={goToPrev}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={styles.navArrowGlass}>
            <Ionicons name="chevron-back" size={20} color={CalmColors.textPrimary} />
          </View>
        </PressableScale>
      )}

      {/* Right Navigation Chevron Button */}
      {total > 1 && (
        <PressableScale
          style={styles.navArrowRight}
          onPress={goToNext}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <View style={styles.navArrowGlass}>
            <Ionicons name="chevron-forward" size={20} color={CalmColors.textPrimary} />
          </View>
        </PressableScale>
      )}

      {/* Bottom Content Overlay */}
      <View style={styles.contentOverlay}>
        {/* Sensory Assessment Badge */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.sensoryBadge,
              isHighStim && styles.sensoryBadgeWarning,
            ]}
          >
            <View
              style={[
                styles.sensoryDot,
                isHighStim && { backgroundColor: CalmColors.sensoryAlert },
              ]}
            />
            <Text
              style={[
                styles.sensoryBadgeText,
                isHighStim && { color: CalmColors.sensoryAlert },
              ]}
            >
              {customBadge}
            </Text>
          </View>
        </View>

        {/* Title */}
        <PressableScale
          onPress={() => onSelectMovie(currentMovie)}
        >
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </PressableScale>

        {/* Meta Row: Creator & Age */}
        <View style={styles.metaRow}>
          <Text style={styles.creatorText}>{creator}</Text>
          <Text style={styles.metaDivider}>•</Text>
          <Text style={styles.ageBadgeText}>{ageGroup}</Text>
          <Text style={styles.metaDivider}>•</Text>
          <Text style={styles.durationText}>{duration}</Text>
        </View>

        {/* Action Buttons Row: Streamlined Primary Play + Sleek Round Buttons */}
        <View style={styles.actionsRow}>
          {/* Primary CTA Play Button */}
          <PressableScale
            style={styles.playButton}
            onPress={() => {
              triggerHaptic('heavy');
              onPlayContent(currentMovie);
            }}
          >
            <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.playButtonText}>Stream Video</Text>
          </PressableScale>

          {/* Save / Bookmark Button */}
          <PressableScale
            style={styles.glassRoundButton}
            onPress={() => {
              triggerHaptic('medium');
              toggleSave(currentMovie);
            }}
            accessibilityLabel="Bookmark Show"
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={19}
              color={saved ? CalmColors.sage : CalmColors.textPrimary}
            />
          </PressableScale>

          {/* Pacing Info Button */}
          <PressableScale
            style={styles.glassRoundButton}
            onPress={() => {
              triggerHaptic('light');
              onSelectMovie(currentMovie);
            }}
            accessibilityLabel="Pacing Details"
          >
            <Ionicons name="information-circle-outline" size={21} color={CalmColors.textPrimary} />
          </PressableScale>
        </View>

        {/* Pagination Indicator Pips */}
        {total > 1 && (
          <View style={styles.paginationRow}>
            {movies.map((_, index) => {
              const isActive = index === currentIndex;
              return (
                <PressableScale
                  key={index}
                  onPress={() => {
                    triggerHaptic('selection');
                    changeSlide(index);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                >
                  <View
                    style={[
                      styles.pageDot,
                      isActive && styles.pageDotActive,
                    ]}
                  />
                </PressableScale>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 540,
    width: '100%',
    position: 'relative',
    backgroundColor: CalmColors.canvasSecondary,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  topVignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 1,
  },
  bottomVignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 310,
    zIndex: 1,
  },
  navArrowLeft: {
    position: 'absolute',
    left: 14,
    top: '40%',
    zIndex: 20,
  },
  navArrowRight: {
    position: 'absolute',
    right: 14,
    top: '40%',
    zIndex: 20,
  },
  navArrowGlass: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(44, 37, 35, 0.12)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 3,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 22,
    zIndex: 10,
  },
  badgeRow: {
    marginBottom: 8,
  },
  sensoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4.5,
    borderRadius: 9999,
    backgroundColor: 'rgba(62, 99, 77, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(62, 99, 77, 0.28)',
    shadowColor: CalmColors.sage,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sensoryBadgeWarning: {
    backgroundColor: CalmColors.sensoryAlertSoft,
    borderColor: CalmColors.sensoryAlertBorder,
  },
  sensoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CalmColors.sage,
    marginRight: 6,
  },
  sensoryBadgeText: {
    color: CalmColors.sageDark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    color: CalmColors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 33,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  creatorText: {
    color: CalmColors.terracottaDark,
    fontSize: 13,
    fontWeight: '700',
  },
  metaDivider: {
    color: CalmColors.textSubtle,
    fontSize: 11,
  },
  ageBadgeText: {
    color: CalmColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  durationText: {
    color: CalmColors.textSubtle,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 14,
  },
  glassRoundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(74, 63, 56, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CalmColors.sage,
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 9999,
    shadowColor: CalmColors.sageDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(74, 63, 56, 0.22)',
  },
  pageDotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: CalmColors.sage,
  },
});
