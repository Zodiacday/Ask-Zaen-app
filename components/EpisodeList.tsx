import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  KidsMediaItem,
  parseItemPoster,
} from '@/constants/kidsDb';
import {
  getEpisodeSeasons,
  getEpisodesForShow,
  parseEpisodeMeta,
  fetchRemoteShowDetail,
  normalizeRemoteItem,
} from '@/constants/mediaSource';
import { CalmColors } from '@/constants/Colors';
import { PressableScale } from '@/components/PressableScale';
import { Reveal } from '@/components/Reveal';
import { ResilientPoster } from '@/components/ResilientPoster';
import { useParentExternalLink } from '@/constants/useParentExternalLink';

interface EpisodeListProps {
  show: KidsMediaItem;
}

const PREVIEW_COUNT = 6;



export const EpisodeList: React.FC<EpisodeListProps> = ({ show }) => {
  const { openExternalLink, parentLinkGate } = useParentExternalLink();
  const localEpisodes = useMemo(() => getEpisodesForShow(show.id), [show.id]);
  const [remoteEpisodes, setRemoteEpisodes] = useState<KidsMediaItem[] | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchRemoteShowDetail(show.id)
      .then((detail) => {
        if (isMounted && detail && Array.isArray(detail.episodes) && detail.episodes.length > 0) {
          const mapped: KidsMediaItem[] = detail.episodes.map(normalizeRemoteItem);
          setRemoteEpisodes(mapped);
        }
      })
      .catch(() => {
        // Gracefully keep local episodes on offline
      });

    return () => {
      isMounted = false;
    };
  }, [
    show.creator_publisher,
    show.genre_category,
    show.id,
    show.language,
    show.target_age_group,
  ]);

  const episodes = remoteEpisodes && remoteEpisodes.length > 0 ? remoteEpisodes : localEpisodes;
  const seasons = useMemo(() => getEpisodeSeasons(episodes), [episodes]);

  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const activeSeason =
    selectedSeason !== null && seasons.includes(selectedSeason)
      ? selectedSeason
      : seasons[0];

  const seasonEpisodes = useMemo(
    () =>
      episodes.filter(
        (episode) => parseEpisodeMeta(episode).season === activeSeason
      ),
    [episodes, activeSeason]
  );

  if (episodes.length === 0) return null;

  const fallbackImage = parseItemPoster(show, true);
  const previewEpisodes = seasonEpisodes.slice(0, PREVIEW_COUNT);
  const extraEpisodes = seasonEpisodes.slice(PREVIEW_COUNT);

  const openEpisode = (episode: KidsMediaItem) => {
    // Prefer a real streaming link; fall back to the show page when the
    // episode URL is only a metadata reference (e.g. TVMaze).
    const episodeUrl =
      episode.platform_url && !/tvmaze\.com/i.test(episode.platform_url)
        ? episode.platform_url
        : null;
    const url = episodeUrl || show.platform_url;
    if (url) {
      openExternalLink(url);
    }
  };

  const renderEpisodeRow = (episode: KidsMediaItem) => {
    const meta = parseEpisodeMeta(episode);
    const imageUri = meta.image || fallbackImage;
    const numbered = meta.number > 0;

    return (
      <PressableScale
        key={episode.id}
        style={styles.episodeRow}
        scaleTo={0.99}
        haptic="heavy"
        accessibilityRole="button"
        accessibilityLabel={`Episode ${meta.number}: ${meta.name}. Open on streaming service.`}
        onPress={() => openEpisode(episode)}
      >
        <View style={styles.thumbWrap}>
          <ResilientPoster
            item={episode}
            parentItem={show}
            sourceUri={imageUri}
            fallbackVariant="episode"
            episodeLabel={`Season ${meta.season} · Episode ${meta.number}`}
            style={styles.thumb}
            contentFit="cover"
          />
          {episode.duration ? (
            <View style={styles.epDurationBadge}>
              <Text style={styles.epDurationText}>{episode.duration}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.episodeBody}>
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {numbered ? `${meta.number}. ` : ''}
            {meta.name}
          </Text>

          {meta.summary ? (
            <Text style={styles.episodeSummary} numberOfLines={2}>
              {meta.summary}
            </Text>
          ) : null}
        </View>

        <View style={styles.openButton}>
          <Ionicons name="play" size={13} color="#FFFFFF" style={{ marginLeft: 1 }} />
        </View>
      </PressableScale>
    );
  };

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Episodes</Text>
        <Text style={styles.headerMeta}>
          {seasons.length} {seasons.length === 1 ? 'season' : 'seasons'} ·{' '}
          {episodes.length} {episodes.length === 1 ? 'episode' : 'episodes'}
        </Text>
      </View>

      {/* Season selector, only when there is more than one */}
      {seasons.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.seasonScroll}
        >
          {seasons.map((season) => {
            const isActive = season === activeSeason;
            return (
              <PressableScale
                key={season}
                style={[styles.seasonPill, isActive && styles.seasonPillActive]}
                scaleTo={0.94}
                haptic="selection"
                onPress={() => {
                  setSelectedSeason(season);
                  setExpanded(false);
                }}
              >
                <Text
                  style={[
                    styles.seasonPillText,
                    isActive && styles.seasonPillTextActive,
                  ]}
                >
                  Season {season}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      )}

      {/* Episode rows */}
      {previewEpisodes.map(renderEpisodeRow)}

      {expanded && extraEpisodes.length > 0 && (
        <Reveal>{extraEpisodes.map(renderEpisodeRow)}</Reveal>
      )}

      {/* Expand / collapse */}
      {seasonEpisodes.length > PREVIEW_COUNT && (
        <PressableScale
          style={styles.showAllButton}
          scaleTo={0.98}
          haptic="selection"
          onPress={() => setExpanded((value) => !value)}
        >
          <Text style={styles.showAllText}>
            {expanded
              ? 'Show fewer episodes'
              : `Show all ${seasonEpisodes.length} episodes`}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={CalmColors.sageDark}
            style={{ marginLeft: 4 }}
          />
        </PressableScale>
      )}
      {parentLinkGate}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: CalmColors.textPrimary,
    letterSpacing: -0.2,
  },
  headerMeta: {
    fontSize: 10.5,
    fontWeight: '600',
    color: CalmColors.textMuted,
  },
  seasonScroll: {
    gap: 6,
    paddingVertical: 8,
    marginBottom: 6,
  },
  seasonPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: CalmColors.canvasSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  seasonPillActive: {
    backgroundColor: CalmColors.sage,
    borderColor: CalmColors.sage,
  },
  seasonPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: CalmColors.textMuted,
  },
  seasonPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: CalmColors.dividerSubtle,
  },
  thumbWrap: {
    width: 92,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: CalmColors.canvasSecondary,
    marginRight: 10,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  epDurationBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(28, 25, 23, 0.82)',
    paddingHorizontal: 4.5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  epDurationText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  episodeBody: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  episodeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: CalmColors.textPrimary,
  },
  episodeSummary: {
    fontSize: 10.5,
    lineHeight: 15,
    color: CalmColors.textMuted,
    marginTop: 4,
  },
  openButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: CalmColors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CalmColors.sageDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  showAllButton: {
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CalmColors.sageBorder,
    backgroundColor: CalmColors.sageSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showAllText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: CalmColors.sageDark,
  },
});
