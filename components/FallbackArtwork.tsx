import React, { useMemo } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CalmColors } from '@/constants/Colors';
import { isAudioItem, KidsMediaItem } from '@/constants/kidsDb';

export type FallbackArtworkVariant =
  | 'show'
  | 'learning'
  | 'bedtime'
  | 'music'
  | 'audio'
  | 'episode';

type FallbackArtworkProps = {
  item: KidsMediaItem;
  parentItem?: KidsMediaItem | null;
  variant?: FallbackArtworkVariant;
  compact?: boolean;
  episodeLabel?: string | null;
  style: StyleProp<ViewStyle>;
};

const TEXTURES: Record<FallbackArtworkVariant, ImageSourcePropType> = {
  show: require('@/assets/images/artwork/fallback_show.jpg'),
  learning: require('@/assets/images/artwork/fallback_learning.jpg'),
  bedtime: require('@/assets/images/artwork/fallback_bedtime.jpg'),
  music: require('@/assets/images/artwork/fallback_music.jpg'),
  audio: require('@/assets/images/artwork/fallback_audio.jpg'),
  episode: require('@/assets/images/artwork/fallback_show.jpg'),
};

const ICONS: Record<FallbackArtworkVariant, React.ComponentProps<typeof Ionicons>['name']> = {
  show: 'leaf-outline',
  learning: 'school-outline',
  bedtime: 'moon-outline',
  music: 'musical-notes-outline',
  audio: 'headset-outline',
  episode: 'leaf-outline',
};

const ACCENTS = ['#596747', '#B96E45', '#6C7890', '#C18B3A', '#8A6A88'];

export function getFallbackArtworkVariant(item: KidsMediaItem): FallbackArtworkVariant {
  if (item.media_type === 'episode') return 'episode';
  if (item.media_type === 'music') return 'music';
  if (isAudioItem(item)) return 'audio';

  const haystack = `${item.title} ${item.genre_category ?? ''}`.toLowerCase();
  if (/(bedtime|sleep|lullaby|nursery)/.test(haystack)) return 'bedtime';
  if (/(phonics|reading|math|stem|science|discovery|learning|education|art)/.test(haystack)) {
    return 'learning';
  }
  return 'show';
}

function episodeLabel(item: KidsMediaItem, explicitLabel?: string | null): string | null {
  if (explicitLabel) return explicitLabel;
  if (item.season_number == null && item.episode_number == null) return null;
  const season = item.season_number == null ? '—' : item.season_number;
  const episode = item.episode_number == null ? '—' : item.episode_number;
  return `Season ${season} · Episode ${episode}`;
}

export const FallbackArtwork: React.FC<FallbackArtworkProps> = ({
  item,
  parentItem,
  variant: requestedVariant,
  compact = false,
  episodeLabel: explicitEpisodeLabel,
  style,
}) => {
  const variant = requestedVariant ?? getFallbackArtworkVariant(item);
  const accent = ACCENTS[Math.abs(item.id) % ACCENTS.length];
  const isEpisode = variant === 'episode' || item.media_type === 'episode';
  const title = isEpisode && parentItem?.title ? parentItem.title : item.title;
  const episodeText = isEpisode ? episodeLabel(item, explicitEpisodeLabel) : null;
  const context = episodeText || item.target_age_group || item.genre_category || 'Calm media';

  const accessibilityLabel = useMemo(
    () => `Artwork for ${title || 'media item'}`,
    [title]
  );

  return (
    <View
      style={[styles.root, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Image
        source={TEXTURES[variant]}
        style={styles.texture}
        resizeMode="cover"
        pointerEvents="none"
        accessible={false}
      />
      <LinearGradient
        colors={['rgba(255, 253, 248, 0.04)', 'rgba(37, 34, 29, 0.42)']}
        style={StyleSheet.absoluteFill}
      />

      {compact ? (
        <View style={[styles.compactIcon, { backgroundColor: `${accent}D9` }]}>
          <Ionicons name={ICONS[variant]} size={16} color="#FFFDF8" />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: `${accent}E6` }]}>
            <Ionicons name={ICONS[variant]} size={18} color="#FFFDF8" />
          </View>
          <View style={styles.textPanel}>
            <Text style={styles.title} numberOfLines={2}>
              {title || 'Ask Zaen'}
            </Text>
            <Text style={styles.context} numberOfLines={1}>
              {context}
            </Text>
            {isEpisode && item.title !== title ? (
              <Text style={styles.episodeTitle} numberOfLines={1}>
                {item.title}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: CalmColors.sageSoft,
  },
  texture: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
  },
  iconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: 17,
    marginBottom: 7,
  },
  compactIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignSelf: 'center',
  },
  textPanel: {
    alignSelf: 'stretch',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 253, 248, 0.88)',
  },
  title: {
    color: CalmColors.textPrimary,
    fontFamily: 'DynaPuff_700Bold',
    fontSize: 14,
    lineHeight: 17,
  },
  context: {
    color: CalmColors.sageDark,
    fontFamily: 'Quicksand_700Bold',
    fontSize: 9.5,
    marginTop: 3,
  },
  episodeTitle: {
    color: CalmColors.textMuted,
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: 8.5,
    marginTop: 2,
  },
});
