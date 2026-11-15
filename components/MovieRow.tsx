import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import {
  KidsMediaItem,
  isWidescreenItem,
  isAudioItem,
} from '@/constants/kidsDb';
import { CalmColors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/PressableScale';
import { ResilientPoster } from '@/components/ResilientPoster';

interface MovieRowProps {
  title: string;
  badge?: string;
  subtitle?: string;
  icon?: ImageSourcePropType;
  movies: KidsMediaItem[];
  onSelectMovie: (movie: KidsMediaItem) => void;
  onPressHeader?: () => void;
  isWarning?: boolean;
}

const AdaptiveCard: React.FC<{
  item: KidsMediaItem;
  onSelectMovie: (movie: KidsMediaItem) => void;
}> = React.memo(({ item, onSelectMovie }) => {
  const isWide = isWidescreenItem(item);
  // Adaptive dimensions: 16:9 widescreen (220 x 124) vs 2:3 portrait (140 x 205)
  const cardWidth = isWide ? 220 : 140;
  const imageHeight = isWide ? 124 : 205;
  const borderRadius = isWide ? 18 : 20;

  const isHigh = item.stimulation_label === 'high';
  const isAudio = isAudioItem(item);

  return (
    <PressableScale
      style={[styles.cardContainer, { width: cardWidth }]}
      scaleTo={0.96}
      haptic="light"
      onPress={() => onSelectMovie(item)}
    >
      <View
        style={[
          styles.imageWrapper,
          { width: cardWidth, height: imageHeight, borderRadius },
          isHigh && styles.imageWrapperWarning,
        ]}
      >
        <ResilientPoster
          item={item}
          style={[
            styles.poster,
            { width: cardWidth, height: imageHeight, borderRadius },
          ]}
          contentFit="cover"
        />

        {/* Audio Badge Pill on Top-Left */}
        {isAudio && (
          <View style={styles.audioBadge}>
            <Ionicons name="headset" size={9} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.audioBadgeText}>Audio</Text>
          </View>
        )}

        {/* Duration Badge Pill on Bottom-Right */}
        {item.duration && (
          <View style={styles.durationPill}>
            <Text style={styles.durationPillText}>{item.duration}</Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
}, (prev, next) => prev.item.id === next.item.id);

AdaptiveCard.displayName = 'AdaptiveCard';

export const MovieRow: React.FC<MovieRowProps> = ({
  title,
  badge,
  subtitle,
  icon,
  movies,
  onSelectMovie,
  onPressHeader,
  isWarning = false,
}) => {
  if (!movies || movies.length === 0) return null;

  return (
    <View style={styles.container}>
      <PressableScale
        style={styles.titleRow}
        scaleTo={0.99}
        haptic={onPressHeader ? 'light' : undefined}
        onPress={() => onPressHeader?.()}
        disabled={!onPressHeader}
      >
        <View style={styles.titleColumn}>
          <View style={styles.headingGroup}>
            {icon && (
              <View style={styles.headerMedallion}>
                <Image source={icon} style={styles.headerIcon} resizeMode="contain" />
              </View>
            )}
            <Text
              style={[
                styles.sectionTitle,
                isWarning && { color: CalmColors.sensoryAlert },
              ]}
            >
              {title}
            </Text>
            {badge ? (
              <View
                style={[
                  styles.badgePill,
                  isWarning && {
                    backgroundColor: CalmColors.sensoryAlertSoft,
                    borderColor: CalmColors.sensoryAlertBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgePillText,
                    isWarning && { color: CalmColors.sensoryAlert },
                  ]}
                >
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <Text style={styles.sectionSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Clickable Header Action Affordance */}
        {onPressHeader ? (
          <View style={styles.headerActionLink}>
            <Text style={styles.headerActionText}>See all</Text>
            <Ionicons
              name="chevron-forward"
              size={13}
              color="#353E23"
              style={styles.headerActionChevron}
            />
          </View>
        ) : null}
      </PressableScale>

      <FlatList
        data={movies}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item }) => (
          <AdaptiveCard item={item} onSelectMovie={onSelectMovie} />
        )}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={40}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  titleColumn: {
    flex: 1,
    marginRight: 8,
  },
  headerActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 2,
  },
  headerActionText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#353E23', // Deep Woodland Olive matching tab bar and calm palette
    letterSpacing: 0.2,
  },
  headerActionChevron: {
    marginLeft: 2,
    marginTop: 1,
  },
  headingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerMedallion: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  headerIcon: {
    width: 34,
    height: 34,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: CalmColors.textPrimary,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: CalmColors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  badgePill: {
    backgroundColor: CalmColors.sageSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: CalmColors.sageBorder,
  },
  badgePillText: {
    color: CalmColors.sageDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  listContent: {
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  cardContainer: {
    marginRight: 14,
  },
  imageWrapper: {
    overflow: 'hidden',
    backgroundColor: CalmColors.surfaceCard,
    position: 'relative',
    borderWidth: 1,
    borderColor: CalmColors.divider,
    shadowColor: 'rgba(74, 63, 56, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrapperWarning: {
    borderColor: CalmColors.sensoryAlertBorder,
  },
  poster: {
    backgroundColor: CalmColors.surfaceCard,
  },
  audioBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: CalmColors.amber,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    shadowColor: CalmColors.amberDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  audioBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  durationPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(28, 25, 23, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardTextWrapper: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CalmColors.textPrimary,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  trustChipCalm: {
    backgroundColor: 'rgba(62, 99, 77, 0.12)',
    borderColor: 'rgba(62, 99, 77, 0.28)',
  },
  trustChipModerate: {
    backgroundColor: CalmColors.amberSoft,
    borderColor: 'rgba(217, 119, 6, 0.25)',
  },
  trustChipHigh: {
    backgroundColor: CalmColors.sensoryAlertSoft,
    borderColor: CalmColors.sensoryAlertBorder,
  },
  trustChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  trustChipTextCalm: {
    color: CalmColors.sageDark,
  },
  trustChipTextModerate: {
    color: CalmColors.amber,
  },
  trustChipTextHigh: {
    color: CalmColors.sensoryAlert,
  },
  itemSubtitle: {
    fontSize: 11,
    color: CalmColors.textMuted,
    flex: 1,
  },
});
