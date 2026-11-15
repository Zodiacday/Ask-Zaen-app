import React, { useMemo, useState } from 'react';
import { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { FallbackArtwork, FallbackArtworkVariant, getFallbackArtworkVariant } from '@/components/FallbackArtwork';
import { getPosterCandidates, KidsMediaItem } from '@/constants/kidsDb';

export interface ResilientPosterProps {
  item: KidsMediaItem;
  parentItem?: KidsMediaItem | null;
  style: StyleProp<ViewStyle>;
  sourceUri?: string | null;
  fallbackVariant?: FallbackArtworkVariant;
  compact?: boolean;
  episodeLabel?: string | null;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Shared media artwork with bounded provider candidates and a local branded fallback.
 * Once the candidate list is exhausted, the fallback is deliberately rendered
 * without another network request.
 */
export const ResilientPoster: React.FC<ResilientPosterProps> = ({
  item,
  parentItem,
  style,
  sourceUri: sourceUriOverride,
  fallbackVariant,
  compact = false,
  episodeLabel,
  contentFit = 'cover',
  priority = 'normal',
}) => {
  const candidates = useMemo(() => {
    const values = [
      ...(sourceUriOverride ? [sourceUriOverride] : []),
      ...getPosterCandidates(item),
      ...(parentItem ? getPosterCandidates(parentItem) : []),
    ];
    return values.filter((value, index) => value && values.indexOf(value) === index);
  }, [item, parentItem, sourceUriOverride]);
  const candidateKey = useMemo(
    () => `${item.id}:${candidates.join('|')}`,
    [candidates, item.id]
  );
  const [attempt, setAttempt] = useState({ key: '', index: 0 });
  const activeIndex = attempt.key === candidateKey ? attempt.index : 0;
  const showFallback = candidates.length === 0 || activeIndex >= candidates.length;
  const activeUri = candidates[activeIndex];

  if (showFallback) {
    return <FallbackArtwork
      item={item}
      parentItem={parentItem}
      variant={fallbackVariant ?? getFallbackArtworkVariant(item)}
      compact={compact}
      episodeLabel={episodeLabel}
      style={style}
    />;
  }

  return (
    <ExpoImage
      source={{ uri: activeUri }}
      style={style as StyleProp<ImageStyle>}
      contentFit={contentFit}
      transition={150}
      cachePolicy="memory-disk"
      priority={priority}
      onError={() => {
        setAttempt((previous) => {
          const currentIndex = previous.key === candidateKey ? previous.index : 0;
          return { key: candidateKey, index: currentIndex + 1 };
        });
      }}
    />
  );
};
