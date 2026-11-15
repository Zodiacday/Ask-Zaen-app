import React, { useMemo, useCallback, forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/PressableScale';
import {
  KidsMediaItem,
  isWidescreenItem,
  isAudioItem,
} from '@/constants/kidsDb';
import { CalmColors } from '@/constants/Colors';
import { ResilientPoster } from '@/components/ResilientPoster';

export const MEDIA_GRID_GAP = 12;
export const MEDIA_GRID_PADDING = 16;

/**
 * Shared responsive grid math. Discover and the language browser use this so
 * cards line up identically on every screen size.
 */
export function useMediaGridLayout() {
  const { width: windowWidth } = useWindowDimensions();

  const numColumns = useMemo(() => {
    if (windowWidth >= 1200) return 4;
    if (windowWidth >= 768) return 3;
    return 2;
  }, [windowWidth]);

  const columnWidth = useMemo(() => {
    const totalGap = MEDIA_GRID_GAP * (numColumns - 1);
    const availableWidth = windowWidth - MEDIA_GRID_PADDING * 2 - totalGap;
    return Math.floor(availableWidth / numColumns);
  }, [windowWidth, numColumns]);

  return { windowWidth, numColumns, columnWidth };
}

interface AdaptiveMediaCardProps {
  item: KidsMediaItem;
  width: number;
  onSelect: (item: KidsMediaItem) => void;
  onPlay: (item: KidsMediaItem) => void;
}

/** Poster card with a natural 16:9 or 2:3 aspect ratio, matching Discover. */
export const AdaptiveMediaCard: React.FC<AdaptiveMediaCardProps> = React.memo(({
  item,
  width,
  onSelect,
  onPlay,
}) => {
  const isHigh = item.stimulation_label === 'high';
  const isModerate = item.stimulation_label === 'moderate';
  const stimLabel = isHigh ? 'Intense' : isModerate ? 'Active' : 'Calm';
  const isWide = isWidescreenItem(item);
  const isAudio = isAudioItem(item);
  const posterHeight = isWide
    ? Math.round((width * 9) / 16)
    : Math.round((width * 3) / 2);

  return (
    <PressableScale
      style={{ width }}
      scaleTo={0.97}
      onPress={() => onSelect(item)}
    >
      <View style={[styles.posterWrapper, { height: posterHeight }]}>
        <ResilientPoster
          item={item}
          style={styles.posterImage}
          contentFit="cover"
        />

        <PressableScale
          style={[styles.quickPlayBtn, isAudio && styles.quickAudioBtn]}
          scaleTo={0.86}
          onPress={() => onPlay(item)}
        >
          <Ionicons
            name={isAudio ? 'headset' : 'play'}
            size={12}
            color="#FFFFFF"
            style={!isAudio ? { marginLeft: 1 } : undefined}
          />
        </PressableScale>

        {item.duration ? (
          <View style={styles.durationPill}>
            <Text style={styles.durationText}>{item.duration}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardDetails}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          {(isHigh || isModerate) && (
            <View
              style={[
                styles.trustChip,
                isHigh ? styles.trustChipHigh : styles.trustChipModerate,
              ]}
            >
              <Ionicons
                name={isHigh ? 'warning' : 'sunny'}
                size={8}
                color={
                  isHigh
                    ? CalmColors.sensoryAlert
                    : CalmColors.amber
                }
                style={{ marginRight: 2 }}
              />
              <Text
                style={[
                  styles.trustChipText,
                  isHigh
                    ? styles.trustChipTextHigh
                    : styles.trustChipTextModerate,
                ]}
                numberOfLines={1}
              >
                {stimLabel}
              </Text>
            </View>
          )}

          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {item.creator_publisher || item.genre_category || 'Curated pick'}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}, (prev, next) => prev.item.id === next.item.id && prev.width === next.width);
AdaptiveMediaCard.displayName = 'AdaptiveMediaCard';

export interface MediaMasonryProps {
  items: KidsMediaItem[];
  numColumns: number;
  columnWidth: number;
  onSelect: (item: KidsMediaItem) => void;
  onPlay: (item: KidsMediaItem) => void;
  contentContainerStyle?: any;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
}

/**
 * High-performance virtualized media grid. Windowed with initialNumToRender={6}
 * and removeClippedSubviews for instant tab switching and smooth 60fps scrolling.
 */
export const MediaMasonry = forwardRef<FlatList<KidsMediaItem>, MediaMasonryProps>((props, ref) => {
  const {
    items,
    numColumns,
    columnWidth,
    onSelect,
    onPlay,
    contentContainerStyle,
    ListHeaderComponent,
    ListFooterComponent,
    onEndReached,
    onEndReachedThreshold = 0.6,
  } = props;

  const renderItem = useCallback(
    ({ item }: { item: KidsMediaItem }) => (
      <AdaptiveMediaCard
        item={item}
        width={columnWidth}
        onSelect={onSelect}
        onPlay={onPlay}
      />
    ),
    [columnWidth, onSelect, onPlay]
  );

  const keyExtractor = useCallback((item: KidsMediaItem) => String(item.id), []);

  return (
    <FlatList
      ref={ref}
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={numColumns}
      key={`grid-cols-${numColumns}`}
      columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
      contentContainerStyle={[styles.defaultContentContainer, contentContainerStyle]}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={5}
      removeClippedSubviews={Platform.OS !== 'web'}
      updateCellsBatchingPeriod={40}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent ?? undefined}
      ListFooterComponent={ListFooterComponent ?? undefined}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReached ? onEndReachedThreshold : undefined}
    />
  );
});
MediaMasonry.displayName = 'MediaMasonry';

const styles = StyleSheet.create({
  columnWrapper: {
    gap: MEDIA_GRID_GAP,
    marginBottom: 16,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  defaultContentContainer: {
    paddingHorizontal: MEDIA_GRID_PADDING,
    paddingTop: 12,
    paddingBottom: 135,
  },
  masonryContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: MEDIA_GRID_GAP,
  },
  masonryColumn: {
    flexDirection: 'column',
    gap: 16,
  },
  posterWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: CalmColors.surfaceCard,
    position: 'relative',
    borderWidth: 1,
    borderColor: CalmColors.divider,
    shadowColor: 'rgba(74, 63, 56, 0.08)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  posterImage: {
    width: '100%',
    height: '100%',
    backgroundColor: CalmColors.surfaceCard,
  },
  quickPlayBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: CalmColors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CalmColors.sageDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  quickAudioBtn: {
    backgroundColor: CalmColors.amber,
    shadowColor: CalmColors.amberDark,
  },
  audioBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
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
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(28, 25, 23, 0.82)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '700',
  },
  cardDetails: {
    marginTop: 6,
    paddingHorizontal: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CalmColors.textPrimary,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 5,
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
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
    fontSize: 9,
    fontWeight: '800',
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
  cardSubtitle: {
    fontSize: 10,
    color: CalmColors.textMuted,
    flex: 1,
  },
});
