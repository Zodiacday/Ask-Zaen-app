import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import {
  X,
  Play,
  Headphones,
  BookmarkSimple,
  ShareNetwork,
  CaretDown,
  CaretUp,
  GlobeSimple,
  TelevisionSimple,
  Hash,
} from 'phosphor-react-native';
import Svg, { Path } from 'react-native-svg';
import { isAudioItem, getRelatedMediaItems } from '@/constants/kidsDb';
import { getStreamingPlatformLogo, getSecondaryStreamingOffers } from '@/constants/platforms';
import { EpisodeList } from '@/components/EpisodeList';
import { PressableScale } from '@/components/PressableScale';
import { CalmColors } from '@/constants/Colors';
import { useSaved } from '@/constants/SavedContext';
import { triggerHaptic } from '@/constants/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SaveToPlaylistSheet } from '@/components/SaveToPlaylistSheet';
import { useParentExternalLink } from '@/constants/useParentExternalLink';
import { ResilientPoster } from '@/components/ResilientPoster';

const { height } = Dimensions.get('window');

interface MovieDetailSheetProps {
  movie: any | null;
  onClose: () => void;
  onSelectRelated: (item: any) => void;
}

const getMediaTags = (item: any): string[] => {
  if (!item) return [];
  const raw = item.safety_rating_tags || item.genre_category || '';
  const tags = raw
    .split(/[,•]/)
    .map((s: string) => s.trim())
    .filter(Boolean);

  const cleaned: string[] = [];
  for (const t of tags) {
    const lower = t.toLowerCase();
    if (lower === 'certified calm video' || lower === 'low-cut certified') {
      cleaned.push('Calm Rhythm');
    } else if (lower.includes('nervous system safe')) {
      cleaned.push('Gentle Pace');
    } else if (lower.includes('low stimulation')) {
      cleaned.push('Low Stimulation');
    } else {
      cleaned.push(t);
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of cleaned) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(t);
    }
  }
  return result.slice(0, 3);
};

interface TagTheme {
  bg: string;
  text: string;
  border: string;
}

const getTagThemeStyle = (tag: string): TagTheme => {
  const lower = tag.toLowerCase();
  if (/learning|active|play|music|movement|math/.test(lower)) {
    return { bg: '#FAF3E3', text: '#8B6514', border: '#EEDFB8' }; // Sunlight Wheat
  }
  if (/nature|science|empathy|kindness|friendship|social/.test(lower)) {
    return { bg: '#EDF4EE', text: '#2F6240', border: '#D2E3D4' }; // Botanical Sage
  }
  if (/exploration|adventure|space|discovery|animals/.test(lower)) {
    return { bg: '#EAF3F5', text: '#246574', border: '#CBE2E6' }; // Mineral Sky
  }
  if (/calm|gentle|slow|bedtime|nervous|soothing/.test(lower)) {
    return { bg: '#F3F0F8', text: '#5E4A84', border: '#E1D9EB' }; // Soft Lavender
  }
  return { bg: '#F4EFEA', text: '#5D5048', border: '#E5DDD5' }; // Soft Sand
};

const formatPlatformSummary = (offers: any[]): string => {
  if (offers.length === 0) return '';
  if (offers.length === 1) return offers[0].name;
  if (offers.length === 2) return `${offers[0].name} & ${offers[1].name}`;
  return `${offers[0].name}, ${offers[1].name} & ${offers.length - 2} more`;
};

export const MovieDetailSheet: React.FC<MovieDetailSheetProps> = ({
  movie,
  onClose,
  onSelectRelated,
}) => {
  const insets = useSafeAreaInsets();
  const { isSaved } = useSaved();
  const { openExternalLink, parentLinkGate } = useParentExternalLink();
  const [expandedPlatformsMovieId, setExpandedPlatformsMovieId] = useState<number | null>(null);
  const [showSaveToPlaylist, setShowSaveToPlaylist] = useState(false);

  const [translateY] = useState(() => new Animated.Value(height));
  const [backdropOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (movie) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 25,
          stiffness: 220,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [movie, translateY, backdropOpacity]);

  const handleClose = () => {
    triggerHaptic('light');
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => onClose());
  };

  if (!movie) return null;

  const showOtherPlatforms = expandedPlatformsMovieId === movie.id;
  const saved = isSaved(movie.id);
  const stimScore = movie.stimulation_score !== null ? movie.stimulation_score : 12;
  const stimLabel = movie.stimulation_label || (stimScore <= 30 ? 'calm' : stimScore <= 60 ? 'moderate' : 'high');
  const isHigh = stimLabel === 'high';



  const isAudio = isAudioItem(movie);
  const platformLogo = movie ? getStreamingPlatformLogo(movie) : null;
  const secondaryOffers = movie
    ? getSecondaryStreamingOffers(movie, platformLogo?.name)
    : [];
  const mediaTags = movie ? getMediaTags(movie) : [];
  const relatedItems = movie ? getRelatedMediaItems(movie, 6) : [];

  const handleOpenSecondaryStream = (url: string) => {
    if (!url) return;
    triggerHaptic('medium');
    openExternalLink(url);
  };

  const handleOpenStream = () => {
    if (!movie.platform_url) return;
    triggerHaptic('heavy');
    openExternalLink(movie.platform_url);
  };

  const handleShare = async () => {
    triggerHaptic('medium');
    await Share.share({
      message: `Listen/Watch "${movie.title}" on Ask Zaen: ${movie.platform_url || ''}`,
    });
  };

  return (
    <Modal
      visible={!!movie}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleClose}
      />

      <Animated.View
        style={[
          styles.sheetContainer,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Close Button */}
        <PressableScale
          style={[styles.closeBtn, insets.top > 0 && { top: insets.top + 8 }]}
          onPress={handleClose}
          scaleTo={0.9}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={20} color={CalmColors.textPrimary} weight="bold" />
        </PressableScale>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header Banner */}
          <View style={styles.bannerWrapper}>
            <ResilientPoster
              key={movie.id}
              item={movie}
              style={styles.bannerImage}
              contentFit="cover"
            />
            <PressableScale
              style={styles.playOverlayButton}
              onPress={handleOpenStream}
              scaleTo={0.92}
            >
              {isAudio ? (
                <Headphones size={26} color="#FFFFFF" weight="fill" />
              ) : (
                <Play
                  size={26}
                  color="#FFFFFF"
                  weight="fill"
                  style={{ marginLeft: 3 }}
                />
              )}
            </PressableScale>

            {/* Half-circle arched edge */}
            <View style={styles.archEdgeWrapper} pointerEvents="none">
              <Svg
                width="100%"
                height={42}
                viewBox="0 0 400 42"
                preserveAspectRatio="none"
              >
                <Path
                  d="M 0,42 A 200 42 0 0 1 400,42 L 400,42 L 0,42 Z"
                  fill={CalmColors.surfaceCard}
                />
              </Svg>
            </View>
          </View>

          {/* Content Details */}
          <View style={styles.infoWrapper}>
            <Text style={styles.sheetTitle}>{movie.title}</Text>

            {/* Option C: Unified Metadata Capsule with Refined Micro-Accents */}
            <View style={styles.metaCapsule}>
              {/* Left: Platform Logo or Publisher Text */}
              {platformLogo ? (
                <Image
                  source={platformLogo.source}
                  style={{
                    width: platformLogo.width,
                    height: platformLogo.height,
                    resizeMode: 'contain',
                  }}
                  accessibilityLabel={platformLogo.name}
                />
              ) : (
                <Text style={styles.metaCapsuleCreator}>
                  {movie.creator_publisher || 'Curated Media'}
                </Text>
              )}

              {/* Vertical Hairline Divider */}
              <View style={styles.metaCapsuleDivider} />

              {/* Right: Specifications (Age / Language with Micro-Accents) */}
              <View style={styles.metaCapsuleSpecs}>
                {movie.target_age_group ? (
                  <>
                    <Text style={styles.metaCapsuleAge}>AGES {movie.target_age_group}</Text>
                    <Text style={styles.metaCapsuleSlash}>/</Text>
                  </>
                ) : null}
                <View style={styles.metaCapsuleLangGroup}>
                  <GlobeSimple
                    size={12}
                    color={CalmColors.sageDark}
                    weight="bold"
                    style={{ marginRight: 3.5 }}
                  />
                  <Text style={styles.metaCapsuleLang}>
                    {movie.language || 'English'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Row: Play, Save, Share */}
            <View style={styles.actionRow}>
              <PressableScale
                style={[
                  styles.primaryPlayBtn,
                  isHigh && { backgroundColor: CalmColors.terracotta },
                ]}
                onPress={handleOpenStream}
                scaleTo={0.98}
              >
                <Play
                  size={18}
                  color="#FFFFFF"
                  weight="fill"
                  style={{ marginRight: 6, marginLeft: 2 }}
                />
                <Text style={styles.primaryPlayBtnText}>Play</Text>
              </PressableScale>

              <PressableScale
                style={[styles.iconActionBtn, saved && styles.iconActionBtnActive]}
                scaleTo={0.92}
                onPress={() => {
                  triggerHaptic('selection');
                  setShowSaveToPlaylist(true);
                }}
              >
                <BookmarkSimple
                  size={21}
                  color={saved ? CalmColors.sageDark : CalmColors.textPrimary}
                  weight={saved ? 'fill' : 'bold'}
                />
              </PressableScale>

              <PressableScale
                style={styles.iconActionBtn}
                scaleTo={0.92}
                onPress={handleShare}
              >
                <ShareNetwork
                  size={20}
                  color={CalmColors.textPrimary}
                  weight="bold"
                />
              </PressableScale>
            </View>

            {/* Upgrade 1: Tactile Provider Pill */}
            {secondaryOffers.length > 0 && (
              <View style={styles.otherPlatformsWrapper}>
                <PressableScale
                  style={styles.platformHandoffPill}
                  scaleTo={0.97}
                  onPress={() => {
                    triggerHaptic('light');
                    setExpandedPlatformsMovieId((prev) => (prev === movie.id ? null : movie.id));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Also available on ${secondaryOffers.length} other platforms`}
                >
                  <Text style={styles.platformHandoffPrefix}>Also on</Text>

                  {/* Overlapping Avatar Stack */}
                  <View style={styles.avatarStack}>
                    {secondaryOffers.slice(0, 3).map((offer, idx) => (
                      <View
                        key={offer.id}
                        style={[
                          styles.avatarCircle,
                          idx > 0 && { marginLeft: -6 },
                        ]}
                      >
                        {offer.logo ? (
                          <Image
                            source={offer.logo.source}
                            style={styles.avatarLogo}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={styles.avatarInitial}>
                            {offer.name.charAt(0)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Summary Text */}
                  <Text style={styles.platformHandoffSummary} numberOfLines={1}>
                    {formatPlatformSummary(secondaryOffers)}
                  </Text>

                  {showOtherPlatforms ? (
                    <CaretUp
                      size={13}
                      color={CalmColors.textMuted}
                      weight="bold"
                      style={{ marginLeft: 2 }}
                    />
                  ) : (
                    <CaretDown
                      size={13}
                      color={CalmColors.textMuted}
                      weight="bold"
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </PressableScale>

                {showOtherPlatforms && (
                  <View style={styles.otherPlatformsExpanded}>
                    <View style={styles.secondaryOffersPills}>
                      {secondaryOffers.map((offer) => (
                        <PressableScale
                          key={offer.id + offer.url}
                          style={styles.secondaryOfferPill}
                          onPress={() => handleOpenSecondaryStream(offer.url)}
                          scaleTo={0.94}
                        >
                          {offer.logo ? (
                            <Image
                              source={offer.logo.source}
                              style={{
                                width: Math.round(offer.logo.width * 0.72),
                                height: 14,
                                resizeMode: 'contain',
                              }}
                              accessibilityLabel={offer.name}
                            />
                          ) : (
                            <Text style={styles.secondaryOfferPillText}>{offer.name}</Text>
                          )}
                        </PressableScale>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* About content is intentionally omitted when the database has no description. */}
            {movie.description ? (
              <View style={styles.curatorCard}>
                <View style={styles.curatorHeaderRow}>
                  {isAudio ? (
                    <Headphones
                      size={13}
                      color={CalmColors.terracotta}
                      weight="bold"
                      style={{ marginRight: 6 }}
                    />
                  ) : (
                    <TelevisionSimple
                      size={13.5}
                      color={CalmColors.terracotta}
                      weight="bold"
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text style={styles.curatorEyebrow}>{isAudio ? 'ABOUT THIS STORY' : 'ABOUT THIS SHOW'}</Text>
                </View>
                <Text style={styles.curatorOverviewText}>{movie.description}</Text>
              </View>
            ) : null}

            {/* Upgrade 1: Nature-Toned Theme Badges with Hashtag Icon */}
            {mediaTags.length > 0 && (
              <View style={styles.tagRow}>
                {mediaTags.map((tag, idx) => {
                  const theme = getTagThemeStyle(tag);
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.tagPill,
                        {
                          backgroundColor: theme.bg,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Hash
                        size={11.5}
                        color={theme.text}
                        weight="bold"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.tagPillText, { color: theme.text }]}>
                        {tag}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Episode list for shows */}
            {movie.media_type === 'show' && (
              <EpisodeList key={movie.id} show={movie} />
            )}

            {/* More Like This (Option A: Horizontal Scroll Carousel) */}
            {relatedItems.length > 0 && (
              <View style={styles.relatedSection}>
                <Text style={styles.relatedSectionTitle}>More Like This</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.relatedScrollContent}
                >
                  {relatedItems.map((item) => (
                    <PressableScale
                      key={item.id}
                      style={styles.relatedCard}
                      onPress={() => {
                        triggerHaptic('light');
                        onSelectRelated(item);
                      }}
                      scaleTo={0.94}
                    >
                      <View style={styles.relatedPosterWrapper}>
                        <ResilientPoster
                          item={item}
                          style={styles.relatedPoster}
                          contentFit="cover"
                        />
                        {item.target_age_group && (
                          <View style={styles.relatedAgeBadge}>
                            <Text style={styles.relatedAgeText}>Ages {item.target_age_group}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.relatedTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.relatedCreator} numberOfLines={1}>
                        {item.creator_publisher || 'Curated'}
                      </Text>
                    </PressableScale>
                  ))}
                </ScrollView>
              </View>
            )}

          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>

    <SaveToPlaylistSheet
      visible={showSaveToPlaylist}
      movie={movie}
      onClose={() => setShowSaveToPlaylist(false)}
    />
    {parentLinkGate}
  </Modal>
);
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(44, 37, 35, 0.45)', // warm espresso backdrop
    zIndex: 9999,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '100%',
    backgroundColor: CalmColors.surfaceCard,
    overflow: 'hidden',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 4,
  },
  scrollContent: {
    paddingBottom: 64,
  },
  bannerWrapper: {
    width: '100%',
    height: 280,
    position: 'relative',
    backgroundColor: CalmColors.canvasSecondary,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  archEdgeWrapper: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 42,
    zIndex: 10,
  },
  playOverlayButton: {
    position: 'absolute',
    top: '32%',
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: CalmColors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CalmColors.sageDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 5,
  },
  infoWrapper: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: CalmColors.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.3,
  },

  metaCapsule: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 37, 35, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.08)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
    maxWidth: '100%',
  },
  metaCapsuleCreator: {
    color: CalmColors.terracottaDark,
    fontSize: 12,
    fontWeight: '700',
  },
  metaCapsuleDivider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(74, 63, 56, 0.16)',
    marginHorizontal: 10,
  },
  metaCapsuleSpecs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metaCapsuleAge: {
    color: CalmColors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  metaCapsuleSlash: {
    color: 'rgba(74, 63, 56, 0.28)',
    fontSize: 11,
    fontWeight: '400',
  },
  metaCapsuleLangGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaCapsuleLang: {
    color: CalmColors.sageDark,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  primaryPlayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CalmColors.sage,
    height: 48,
    borderRadius: 24,
  },
  primaryPlayBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  iconActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CalmColors.canvasSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.08)',
  },
  iconActionBtnActive: {
    backgroundColor: CalmColors.sageSoft,
    borderColor: CalmColors.sageBorder,
  },
  otherPlatformsWrapper: {
    marginTop: -2,
    marginBottom: 16,
  },
  platformHandoffPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(44, 37, 35, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.08)',
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 6,
    gap: 7,
  },
  platformHandoffPrefix: {
    fontSize: 12,
    fontWeight: '700',
    color: CalmColors.textSubtle,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: CalmColors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 1,
    elevation: 1,
  },
  avatarLogo: {
    width: 13,
    height: 13,
  },
  avatarInitial: {
    fontSize: 9,
    fontWeight: '800',
    color: CalmColors.textPrimary,
  },
  platformHandoffSummary: {
    fontSize: 12,
    fontWeight: '700',
    color: CalmColors.textPrimary,
    maxWidth: 200,
  },
  otherPlatformsExpanded: {
    marginTop: 10,
    backgroundColor: 'rgba(44, 37, 35, 0.04)',
    borderRadius: 14,
    padding: 10,
  },
  secondaryOffersPills: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  secondaryOfferPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(44, 37, 35, 0.05)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  secondaryOfferPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: CalmColors.textPrimary,
  },
  curatorCard: {
    backgroundColor: 'rgba(44, 37, 35, 0.035)',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(74, 63, 56, 0.06)',
    marginBottom: 16,
  },
  curatorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  curatorEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: CalmColors.terracottaDark,
  },
  curatorOverviewText: {
    color: CalmColors.textPrimary,
    fontSize: 13.5,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  relatedSection: {
    marginTop: 0,
    marginBottom: 20,
  },
  relatedSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: CalmColors.textPrimary,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  relatedScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  relatedCard: {
    width: 120,
  },
  relatedPosterWrapper: {
    width: 120,
    height: 168,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: CalmColors.canvasSecondary,
    marginBottom: 6,
  },
  relatedPoster: {
    width: '100%',
    height: '100%',
  },
  relatedAgeBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relatedAgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  relatedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CalmColors.textPrimary,
    marginBottom: 2,
  },
  relatedCreator: {
    fontSize: 11,
    fontWeight: '500',
    color: CalmColors.textMuted,
  },
});
