import type { KidsMediaItem, MainShelfSpec } from './kidsDb';

/**
 * Sanctuary Recommendation & Ranking Engine (90k-Scale Client Fine-Ranker)
 *
 * Pure TypeScript module with zero React Native or asset runtime imports so it
 * executes deterministically on both mobile/web JS runtimes and standalone Node
 * verification benchmarks.
 *
 * Designed as Stage 2 of Ask Zaen's 2-stage 90k architecture:
 * - Stage 1 (SQLite / FastAPI pushdown) pre-filters episodes & high-stimulation
 *   items, runs FTS5 search, and returns circadian-ordered pages.
 * - Stage 2 (this module) caches parsed JSON/sensory features once per item in O(1),
 *   applies 7-routine + sub-routine tie-breaking, age specificity (IoU), O(1)
 *   saved-title affinity, creator diversity caps, and cross-shelf deduplication.
 */

export type CircadianWindow = 'morning' | 'daytime' | 'wind_down' | 'bedtime';

export type CanonicalRoutine =
  | 'bedtime'
  | 'wind_down'
  | 'quiet_play'
  | 'learning'
  | 'afternoon_entertainment'
  | 'afternoon_adventure'
  | 'active_dance';

export interface ExtractedFeatures {
  routine: CanonicalRoutine;
  /** Normalized 0..100 sensory pace score where LOWER = calmer. */
  stimScore: number;
  ageRange: [number, number] | null;
  creatorKey: string | null;
  editorialTrust: number;
  genreTags: string[];
  isAudio: boolean;
  hasArtwork: boolean;
  isSleepCue: boolean;
  isFeelingsCue: boolean;
  isInquiryCue: boolean;
  isShow: boolean;
}

export interface SavedAffinityProfile {
  savedIds: Set<number>;
  creators: Set<string>;
  genreCounts: Map<string, number>;
  isEmpty: boolean;
}

export interface SanctuaryContext {
  window: CircadianWindow;
  ageTier?: string | null;
  savedAffinity?: SavedAffinityProfile;
  savedMovies?: readonly KidsMediaItem[];
  preferAudio?: boolean;
  gateId?: string | null;
}

export interface RankOptions {
  /** Maximum number of items to return (e.g. bounded shelf or page). */
  limit?: number;
  /** Hard cap per creator in the returned top slice (e.g. 2 on 12-card Home shelves). */
  maxPerCreator?: number;
  /** Item IDs to push behind non-duplicate candidates (cross-shelf top-slot dedup). */
  deprioritizeIds?: ReadonlySet<number>;
  /** Creator keys already featured in lead slots of higher Home shelves. */
  deprioritizeCreators?: ReadonlySet<string>;
}

const ROUTINE_WEIGHTS: Record<CircadianWindow, Record<CanonicalRoutine, number>> = {
  morning: {
    bedtime: 0,
    wind_down: 18,
    quiet_play: 34,
    learning: 42,
    afternoon_entertainment: 12,
    afternoon_adventure: -15,
    active_dance: -10,
  },
  daytime: {
    bedtime: 0,
    wind_down: 16,
    quiet_play: 38,
    learning: 38,
    afternoon_entertainment: 22,
    afternoon_adventure: -10,
    active_dance: 0,
  },
  wind_down: {
    bedtime: 28,
    wind_down: 52,
    quiet_play: 30,
    learning: 14,
    afternoon_entertainment: -20,
    afternoon_adventure: -35,
    active_dance: -35,
  },
  bedtime: {
    bedtime: 62,
    wind_down: 42,
    quiet_play: 10,
    learning: -12,
    afternoon_entertainment: -40,
    afternoon_adventure: -50,
    active_dance: -50,
  },
};

const HOME_SHELF_ORDER: Record<CircadianWindow, readonly string[]> = {
  morning: ['learning', 'shows', 'all', 'feelings', 'bedtime'],
  daytime: ['all', 'shows', 'learning', 'feelings', 'bedtime'],
  wind_down: ['shows', 'feelings', 'all', 'bedtime', 'learning'],
  bedtime: ['bedtime', 'feelings', 'all', 'shows', 'learning'],
};

const CANONICAL_ROUTINES = new Set<string>([
  'bedtime',
  'wind_down',
  'quiet_play',
  'learning',
  'afternoon_entertainment',
  'afternoon_adventure',
  'active_dance',
]);

const GENERIC_CREATORS = new Set<string>([
  '',
  'unknown',
  'streaming',
  'youtube',
  'various artists',
  'curated pick',
]);

const FLAGSHIP_TITLE_KEYS = [
  'daniel tiger',
  'bluey',
  'trash truck',
  'tumble leaf',
  'puffin rock',
  'octonauts',
  'mister rogers',
  'stillwater',
  'sarah & duck',
  'little bear',
];

const HERITAGE_TRUST_CREATORS = [
  'pbs',
  'fred rogers',
  'cbeebies',
  'bbc',
  'sesame',
  'raffi',
  'national geographic',
  'scishow',
  'super simple',
  'storybook',
];

const HYPER_FRANCHISE_CREATORS = [
  'cocomelon',
  'pinkfong',
  'babybus',
  'little baby bum',
  'blippi',
  'chuchu',
  'vlad and niki',
];

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Resolves any stored or filter age identifier into a canonical [minAge, maxAge] bracket.
 * - '0-3' / 'preschool' / 'baby' / 'toddler' -> [0, 3]
 * - '4-6' / 'big_kids'                       -> [4, 6]
 * - '7+'  / 'tweens' / 'older' / 'explorer'  -> [7, 12]
 * - 'all' / null / undefined                 -> null (unfiltered)
 */
export function resolveChildAgeRange(ageTier?: string | null): [number, number] | null {
  if (!ageTier || ageTier === 'all') return null;
  const key = ageTier.trim().toLowerCase();

  if (key === '0-3' || key === '0–3' || key === 'preschool' || key === 'baby' || key === 'toddler') {
    return [0, 3];
  }
  if (key === '4-6' || key === '4–6' || key === 'big_kids') {
    return [4, 6];
  }
  if (key === '7+' || key === 'tweens' || key === 'older' || key === 'explorer') {
    return [7, 12];
  }

  return parseAgeRange(key);
}

/**
 * Age-calibrated bedtime start in minutes after midnight:
 * - Ages 0–3: 19:00 (1140)
 * - Ages 4–6: 19:30 (1170)
 * - Ages 7+:  20:00 (1200)
 */
export function getBedtimeStartMinutes(ageTier?: string | null): number {
  const range = resolveChildAgeRange(ageTier);
  if (!range) return 19 * 60 + 30;
  if (range[1] <= 3) return 19 * 60;
  if (range[1] <= 6) return 19 * 60 + 30;
  return 20 * 60;
}

/**
 * Evaluates the current circadian window for a family's child age tier.
 */
export function getCircadianWindow(
  now: Date = new Date(),
  ageTier?: string | null
): CircadianWindow {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const bedtimeStart = getBedtimeStartMinutes(ageTier);

  // Night & early pre-dawn hours (bedtimeStart -> 05:59)
  if (minutes >= bedtimeStart || minutes < 6 * 60) {
    return 'bedtime';
  }
  // Gentle morning rhythm (06:00 -> 10:59)
  if (minutes < 11 * 60) {
    return 'morning';
  }
  // Daytime inquiry & calm play (11:00 -> 16:59)
  if (minutes < 17 * 60) {
    return 'daytime';
  }
  // Evening transition (17:00 -> bedtimeStart - 1)
  return 'wind_down';
}

/**
 * Parses catalog age strings ('0-2', '3-5', '3-8', '6-12', '2+', 'All') into [min, max].
 */
export function parseAgeRange(raw?: string | null): [number, number] | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === 'all' || trimmed === 'all ages') return null;

  const matches = trimmed.match(/\d+/g);
  if (!matches || matches.length === 0) return null;

  const first = parseInt(matches[0], 10);
  if (!Number.isFinite(first)) return null;

  if (matches.length >= 2) {
    const second = parseInt(matches[1], 10);
    if (Number.isFinite(second)) {
      return [Math.min(first, second), Math.max(first, second)];
    }
  }

  if (trimmed.includes('+')) {
    return [first, Math.max(first + 4, 12)];
  }

  return [first, first + 2];
}

function normalizeRoutineString(
  rawRoutine: string | null | undefined,
  textBlob: string
): CanonicalRoutine {
  if (rawRoutine) {
    const clean = rawRoutine.trim().toLowerCase();
    if (CANONICAL_ROUTINES.has(clean)) {
      return clean as CanonicalRoutine;
    }

    // Free-text hero or human-curated routine descriptions
    if (clean.includes('lullab') || clean.includes('sleep')) {
      return 'bedtime';
    }
    if (
      clean.includes('wind-down') ||
      clean.includes('wind down') ||
      clean.includes('pre-bed') ||
      clean.includes('bedtime soother') ||
      clean.includes('bedtime transition')
    ) {
      return 'wind_down';
    }
    if (
      clean.includes('inquiry') ||
      clean.includes('science') ||
      clean.includes('curiosity') ||
      clean.includes('learning') ||
      clean.includes('phonics') ||
      clean.includes('math')
    ) {
      return 'learning';
    }
    if (clean.includes('dance')) return 'active_dance';
    if (clean.includes('adventure')) return 'afternoon_adventure';
    if (clean.includes('entertainment')) return 'afternoon_entertainment';
    if (clean.includes('quiet') || clean.includes('gentle') || clean.includes('play')) {
      return 'quiet_play';
    }
  }

  // Keyword inference fallback when metadata_json is absent or lacks sensory_profile
  if (
    textBlob.includes('lullab') ||
    textBlob.includes('sleep') ||
    textBlob.includes('bedtime') ||
    textBlob.includes('music box') ||
    textBlob.includes('white noise')
  ) {
    return 'bedtime';
  }
  if (
    textBlob.includes('wind down') ||
    textBlob.includes('calm down') ||
    textBlob.includes('evening story')
  ) {
    return 'wind_down';
  }
  if (
    textBlob.includes('phonic') ||
    textBlob.includes('alphabet') ||
    textBlob.includes(' abc') ||
    textBlob.includes('math') ||
    textBlob.includes('science') ||
    textBlob.includes('stem') ||
    textBlob.includes('biology') ||
    textBlob.includes('explained') ||
    textBlob.includes('number')
  ) {
    return 'learning';
  }
  if (textBlob.includes('dance') || textBlob.includes('boogie')) {
    return 'active_dance';
  }

  return 'quiet_play';
}

function normalizeStimScore(item: KidsMediaItem): number {
  const raw = item.stimulation_score;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Guard against legacy inverted calm percentages (e.g. calm show with score 98/100)
    if (item.stimulation_label === 'calm' && raw > 60) {
      return clamp(100 - raw, 2, 35);
    }
    return clamp(raw, 0, 100);
  }

  if (item.stimulation_label === 'calm') return 20;
  if (item.stimulation_label === 'moderate') return 42;
  if (item.stimulation_label === 'high') return 72;
  return 24;
}

const AUDIO_PLATFORM_HINTS = [
  'spotify.com',
  'podcasts.apple.com',
  'music.apple.com',
  'music.youtube.com',
  'audible.',
  'soundcloud.com',
  'yotoplay.com',
  'tonies.com',
] as const;

const EXPLICIT_AUDIO_FORMAT_RE =
  /\b(podcasts?|audiobooks?|audio\s+stor(?:y|ies)|audio[\s-]+only)\b/i;

/**
 * Canonical audio-only / music detector shared by UI cards, Discover filters, and the ranker.
 * Strictly excludes TV shows, movies, and show episodes, matching only genuine music tracks,
 * podcasts, audiobooks, and dedicated audio-story formats.
 */
export function isGenuineAudioMedia(item: KidsMediaItem): boolean {
  const mediaType = String(item.media_type || '').trim().toLowerCase();
  if (mediaType === 'show' || mediaType === 'movie' || mediaType === 'episode') {
    return false;
  }
  if (
    mediaType === 'music' ||
    mediaType === 'audio' ||
    mediaType === 'podcast' ||
    mediaType === 'audiobook'
  ) {
    return true;
  }

  const urlLower = (item.platform_url || '').toLowerCase();
  if (urlLower && AUDIO_PLATFORM_HINTS.some((domain) => urlLower.includes(domain))) {
    return true;
  }

  const metaText = `${item.title || ''} ${item.genre_category || ''} ${item.safety_rating_tags || ''}`;
  return EXPLICIT_AUDIO_FORMAT_RE.test(metaText);
}

// Dual-tier O(1) feature cache: WeakMap for in-memory object references + bounded ID cache for paginated API rows
const objectFeatureCache = new WeakMap<KidsMediaItem, ExtractedFeatures>();
const idFeatureCache = new Map<
  number,
  { jsonLen: number; stim: number | null; age: string | null; features: ExtractedFeatures }
>();
const MAX_ID_CACHE_ENTRIES = 15_000;

/**
 * Extracts and caches normalized ranking features for an item.
 * `JSON.parse(metadata_json)` runs at most once per unique item across the session.
 */
export function extractFeatures(item: KidsMediaItem): ExtractedFeatures {
  const fromWeak = objectFeatureCache.get(item);
  if (fromWeak) return fromWeak;

  const jsonLen = item.metadata_json ? item.metadata_json.length : 0;
  const cachedById = idFeatureCache.get(item.id);
  if (
    cachedById &&
    cachedById.jsonLen === jsonLen &&
    cachedById.stim === item.stimulation_score &&
    cachedById.age === item.target_age_group
  ) {
    objectFeatureCache.set(item, cachedById.features);
    return cachedById.features;
  }

  let rawRoutine: string | null = null;
  let metaHasArt = false;

  if (item.metadata_json) {
    try {
      const meta = JSON.parse(item.metadata_json);
      if (meta && typeof meta === 'object') {
        if (meta.sensory_profile && typeof meta.sensory_profile.recommended_routine === 'string') {
          rawRoutine = meta.sensory_profile.recommended_routine;
        }
        if (meta.backdrop) {
          metaHasArt = true;
        } else if (typeof meta.image === 'string' && meta.image.length > 0) {
          metaHasArt = true;
        } else if (meta.image && typeof meta.image === 'object') {
          metaHasArt = Boolean(meta.image.original || meta.image.medium);
        }
      }
    } catch {
      // Malformed metadata_json falls back cleanly to column + keyword signals.
    }
  }

  const titleLower = (item.title || '').toLowerCase();
  const genreLower = (item.genre_category || '').toLowerCase();
  const tagsLower = (item.safety_rating_tags || '').toLowerCase();
  const descLower = (item.description || '').toLowerCase();
  const textBlob = `${titleLower} ${genreLower} ${tagsLower} ${descLower}`;

  const routine = normalizeRoutineString(rawRoutine, textBlob);
  const stimScore = normalizeStimScore(item);
  const ageRange = parseAgeRange(item.target_age_group);

  const rawCreator = (item.creator_publisher || '').trim().toLowerCase();
  const creatorKey = GENERIC_CREATORS.has(rawCreator) ? null : rawCreator;

  const creatorAndTitle = `${rawCreator} ${titleLower}`;
  let editorialTrust = 0;
  if (HYPER_FRANCHISE_CREATORS.some((bad) => creatorAndTitle.includes(bad))) {
    editorialTrust = -18;
  } else if (
    HERITAGE_TRUST_CREATORS.some((good) => rawCreator.includes(good)) ||
    FLAGSHIP_TITLE_KEYS.some((k) => titleLower.includes(k))
  ) {
    editorialTrust = 8;
  }

  const genreTags = `${genreLower},${tagsLower}`
    .split(/[,•|/&]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);

  const isAudio = isGenuineAudioMedia(item);

  const urlLower = (item.platform_url || '').toLowerCase();
  const hasYoutubeThumb = urlLower.includes('youtube.com/') || urlLower.includes('youtu.be/');
  const hasFlagshipBackdrop = FLAGSHIP_TITLE_KEYS.some((k) => titleLower.includes(k));
  const hasExplicitPoster =
    Boolean(item.poster_url && !item.poster_url.includes('images.unsplash.com')) ||
    Boolean(item.backdrop_url);
  const hasArtwork = hasExplicitPoster || metaHasArt || hasYoutubeThumb || hasFlagshipBackdrop;

  const isSleepCue =
    textBlob.includes('lullab') ||
    textBlob.includes('sleep') ||
    textBlob.includes('bedtime') ||
    textBlob.includes('night') ||
    textBlob.includes('dream') ||
    textBlob.includes('music box') ||
    textBlob.includes('mozart') ||
    textBlob.includes('brahms') ||
    textBlob.includes('slumber');

  const isFeelingsCue =
    textBlob.includes('feeling') ||
    textBlob.includes('emotion') ||
    textBlob.includes('kindness') ||
    textBlob.includes('empathy') ||
    textBlob.includes('friend') ||
    textBlob.includes('calm') ||
    textBlob.includes('breath') ||
    textBlob.includes('share') ||
    textBlob.includes('cooperat') ||
    textBlob.includes('family');

  const isInquiryCue =
    textBlob.includes('science') ||
    textBlob.includes('nature') ||
    textBlob.includes('wildlife') ||
    textBlob.includes('animal') ||
    textBlob.includes('math') ||
    textBlob.includes('number') ||
    textBlob.includes('phonic') ||
    textBlob.includes('alphabet') ||
    textBlob.includes('letter') ||
    textBlob.includes('curious') ||
    textBlob.includes('discover') ||
    textBlob.includes('plant') ||
    textBlob.includes('space') ||
    textBlob.includes('art') ||
    textBlob.includes('craft');

  const features: ExtractedFeatures = {
    routine,
    stimScore,
    ageRange,
    creatorKey,
    editorialTrust,
    genreTags,
    isAudio,
    hasArtwork,
    isSleepCue,
    isFeelingsCue,
    isInquiryCue,
    isShow: item.media_type === 'show',
  };

  objectFeatureCache.set(item, features);

  if (typeof item.id === 'number' && Number.isFinite(item.id)) {
    if (idFeatureCache.size >= MAX_ID_CACHE_ENTRIES) {
      const oldestKey = idFeatureCache.keys().next().value;
      if (oldestKey !== undefined) {
        idFeatureCache.delete(oldestKey);
      }
    }
    idFeatureCache.set(item.id, {
      jsonLen,
      stim: item.stimulation_score,
      age: item.target_age_group,
      features,
    });
  }

  return features;
}

/**
 * Builds an O(1) lookup profile from the family's saved list once per `savedMovies` update.
 */
export function buildSavedAffinity(
  savedMovies?: readonly KidsMediaItem[]
): SavedAffinityProfile {
  const savedIds = new Set<number>();
  const creators = new Set<string>();
  const genreCounts = new Map<string, number>();

  if (!savedMovies || savedMovies.length === 0) {
    return { savedIds, creators, genreCounts, isEmpty: true };
  }

  for (const movie of savedMovies) {
    if (!movie) continue;
    savedIds.add(movie.id);
    const feat = extractFeatures(movie);
    if (feat.creatorKey) {
      creators.add(feat.creatorKey);
    }
    for (const tag of feat.genreTags) {
      genreCounts.set(tag, (genreCounts.get(tag) ?? 0) + 1);
    }
  }

  return {
    savedIds,
    creators,
    genreCounts,
    isEmpty: creators.size === 0 && genreCounts.size === 0,
  };
}

function scoreAgeFit(
  itemRange: [number, number] | null,
  childRange: [number, number] | null,
  routine: CanonicalRoutine,
  window: CircadianWindow
): number {
  if (!childRange || !itemRange) return 0;

  const [cMin, cMax] = childRange;
  const [iMin, iMax] = itemRange;

  const overlapMin = Math.max(cMin, iMin);
  const overlapMax = Math.min(cMax, iMax);

  if (overlapMin <= overlapMax) {
    // Inclusive year-span overlap + bracket specificity bonus so tight age-matched
    // titles ('0-2', '3-5', '6-8') outrank broad '2-8' catch-alls.
    const childSpan = Math.max(1, cMax - cMin + 1);
    const itemSpan = Math.max(1, iMax - iMin + 1);
    const overlapSpan = overlapMax - overlapMin + 1;
    const coverage = clamp(overlapSpan / childSpan, 0.25, 1);
    const specificity = 6 / Math.max(1, Math.abs(itemSpan - childSpan) + 1);
    return 22 + coverage * 14 + specificity;
  }

  // Item is aimed at older kids than the child -> strong developmental penalty
  if (iMin > cMax) {
    return -30;
  }

  // Item is aimed at younger kids than the child (iMax < cMin):
  // Gentle sleep audio remains soothing across ages during Bedtime, whereas
  // baby rhymes/lullabies should sink for 7+ kids during active daytime browsing.
  if (window === 'bedtime' && routine === 'bedtime') {
    return -8;
  }
  return cMin >= 7 ? -22 : -12;
}

function scoreWindowMicroFit(feat: ExtractedFeatures, window: CircadianWindow, gateId?: string | null): number {
  let bonus = 0;

  if (window === 'morning') {
    if (feat.isInquiryCue) bonus += 8;
    if (feat.isShow) bonus += 4;
  } else if (window === 'daytime') {
    if (feat.isShow) bonus += 6;
    if (feat.isInquiryCue || feat.isFeelingsCue) bonus += 6;
  } else if (window === 'wind_down') {
    if (feat.isFeelingsCue) bonus += 9;
    if (feat.isShow) bonus += 4;
  } else if (window === 'bedtime') {
    if (feat.isSleepCue) bonus += 12;
  }

  // Gate-specific micro-alignment on Discover
  if (gateId === 'morning' && (feat.isFeelingsCue || feat.isShow)) {
    bonus += 5;
  } else if (gateId === 'learning' && feat.isInquiryCue) {
    bonus += 6;
  } else if (gateId === 'feelings' && feat.isFeelingsCue) {
    bonus += 6;
  } else if (gateId === 'bedtime' && feat.isSleepCue) {
    bonus += 8;
  }

  return bonus;
}

/**
 * Computes a deterministic, NaN-proof suitability score for a single media item.
 */
export function scoreItem(item: KidsMediaItem, ctx: SanctuaryContext): number {
  const feat = extractFeatures(item);
  const childRange = resolveChildAgeRange(ctx.ageTier);

  // 1. Primary circadian routine score
  const rScore = ROUTINE_WEIGHTS[ctx.window][feat.routine];

  // 2. Sub-routine micro-fit (breaks ties across the 88% 'quiet_play' catalog)
  const mScore = scoreWindowMicroFit(feat, ctx.window, ctx.gateId);

  // 3. Continuous calmness tie-breaker (0..35)
  const cScore = clamp(40 - feat.stimScore, 0, 35);

  // 4. Developmental age overlap & specificity (-30..+42)
  const aScore = scoreAgeFit(feat.ageRange, childRange, feat.routine, ctx.window);

  // 5. Saved-title affinity (0..20)
  const affinity =
    ctx.savedAffinity ??
    (ctx.savedMovies && ctx.savedMovies.length > 0 ? buildSavedAffinity(ctx.savedMovies) : undefined);

  let fScore = 0;
  if (affinity && !affinity.isEmpty) {
    if (feat.creatorKey && affinity.creators.has(feat.creatorKey)) {
      fScore += 12;
    }
    let tagBonus = 0;
    for (const tag of feat.genreTags) {
      if (affinity.genreCounts.has(tag)) {
        tagBonus += 4;
        if (tagBonus >= 8) break;
      }
    }
    fScore += Math.min(8, tagBonus);
  }

  // 6. Audio-first boost at Bedtime or when Audio mode is active (0..15)
  const bScore = feat.isAudio && (ctx.window === 'bedtime' || ctx.preferAudio) ? 15 : 0;

  // 7. Artwork completeness + Sanctuary editorial heritage trust (-18..+13)
  const qScore = (feat.hasArtwork ? 5 : 0) + feat.editorialTrust;

  const total = rScore + mScore + cScore + aScore + fScore + bScore + qScore;
  return Number.isFinite(total) ? total : 0;
}

interface ScoredCandidate {
  item: KidsMediaItem;
  creatorKey: string | null;
  baseScore: number;
  effectiveScore: number;
  originalIndex: number;
}

/**
 * Ranks a candidate pool deterministically with creator frequency decay,
 * max-2-consecutive creator diversity, and optional per-shelf creator caps.
 * Never drops items unless `opts.limit` is explicitly provided.
 */
export function rankItems(
  items: readonly KidsMediaItem[],
  ctx: SanctuaryContext,
  opts?: RankOptions
): KidsMediaItem[] {
  const len = items.length;
  if (len <= 1) return items.slice();

  const affinity =
    ctx.savedAffinity ??
    (ctx.savedMovies && ctx.savedMovies.length > 0 ? buildSavedAffinity(ctx.savedMovies) : undefined);
  const resolvedCtx: SanctuaryContext = affinity ? { ...ctx, savedAffinity: affinity } : ctx;

  const deprioritize = opts?.deprioritizeIds;
  const deprioritizeCreators = opts?.deprioritizeCreators;
  const candidates: ScoredCandidate[] = new Array(len);

  for (let i = 0; i < len; i++) {
    const item = items[i];
    const feat = extractFeatures(item);
    let baseScore = scoreItem(item, resolvedCtx);
    if (deprioritize && deprioritize.has(item.id)) {
      // Push items already featured in higher Home shelf lead slots behind fresh picks
      baseScore -= 45;
    }
    if (deprioritizeCreators && feat.creatorKey && deprioritizeCreators.has(feat.creatorKey)) {
      baseScore -= 16;
    }
    candidates[i] = {
      item,
      creatorKey: feat.creatorKey,
      baseScore,
      effectiveScore: baseScore,
      originalIndex: i,
    };
  }

  // Initial sort by score DESC, preserving original curated position on ties
  candidates.sort((a, b) => {
    if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
    return a.originalIndex - b.originalIndex;
  });

  // Apply prolific-creator frequency decay (-5 per prior appearance) so a channel
  // with hundreds of tracks naturally yields slots to other calm creators across the grid.
  const creatorSeenCounts = new Map<string, number>();
  for (let i = 0; i < len; i++) {
    const c = candidates[i];
    if (c.creatorKey) {
      const prior = creatorSeenCounts.get(c.creatorKey) ?? 0;
      if (prior >= 1) {
        c.effectiveScore = c.baseScore - Math.min(45, prior * 5);
      }
      creatorSeenCounts.set(c.creatorKey, prior + 1);
    }
  }

  candidates.sort((a, b) => {
    if (b.effectiveScore !== a.effectiveScore) return b.effectiveScore - a.effectiveScore;
    return a.originalIndex - b.originalIndex;
  });

  // O(N) zero-shift greedy diversity pass (no Array.splice allocations):
  // 1. Avoid back-to-back same-creator cards (`ck === lastCreator`) whenever another
  //    creator is available so side-by-side 2-column grid / widescreen row pairs never
  //    duplicate the same channel logo.
  // 2. If `opts.maxPerCreator` is set (e.g. Home 12-card shelf preview), overflow items
  //    from that creator are deferred to the tail rather than dropped.
  const maxPerCreator = opts?.maxPerCreator ?? 0;
  const targetOut = opts?.limit && opts.limit > 0 ? Math.min(len, opts.limit) : len;

  const result: KidsMediaItem[] = [];
  const used = new Uint8Array(len);
  const placedPerCreator = new Map<string, number>();

  let head = 0;
  let prevCreator1: string | null = null;
  let prevCreator2: string | null = null;

  while (head < len && result.length < targetOut) {
    let pickIdx = -1;

    for (let i = head; i < len; i++) {
      if (used[i]) continue;
      const ck = candidates[i].creatorKey;

      if (ck !== null) {
        if (maxPerCreator > 0 && (placedPerCreator.get(ck) ?? 0) >= maxPerCreator) {
          continue;
        }
        // Prevent both horizontal side-by-side (prev1) and 2-col vertical stripe (prev2) duplicates
        if (ck === prevCreator1 || ck === prevCreator2) {
          continue;
        }
      }

      pickIdx = i;
      break;
    }

    if (pickIdx === -1) {
      // Relax sliding-window constraint while still respecting maxPerCreator if possible
      if (maxPerCreator > 0) {
        for (let i = head; i < len; i++) {
          if (used[i]) continue;
          const ck = candidates[i].creatorKey;
          if (ck === null || (placedPerCreator.get(ck) ?? 0) < maxPerCreator) {
            pickIdx = i;
            break;
          }
        }
      }
      if (pickIdx === -1) {
        for (let i = head; i < len; i++) {
          if (!used[i] && (maxPerCreator === 0)) {
            pickIdx = i;
            break;
          }
        }
      }
      if (pickIdx === -1) {
        // Only capped overflow items remain; append them in score order so nothing is dropped
        break;
      }
    }

    used[pickIdx] = 1;
    while (head < len && used[head]) {
      head += 1;
    }

    const chosen = candidates[pickIdx];
    result.push(chosen.item);

    if (chosen.creatorKey !== null) {
      placedPerCreator.set(chosen.creatorKey, (placedPerCreator.get(chosen.creatorKey) ?? 0) + 1);
    }
    prevCreator2 = prevCreator1;
    prevCreator1 = chosen.creatorKey;
  }

  if (result.length < targetOut) {
    for (let i = head; i < len && result.length < targetOut; i++) {
      if (!used[i]) {
        result.push(candidates[i].item);
      }
    }
  }

  return result;
}

/**
 * Reorders the 5 Home category shelves according to the active circadian window.
 */
export function orderShelves(
  shelves: readonly MainShelfSpec[],
  window: CircadianWindow
): MainShelfSpec[] {
  const order = HOME_SHELF_ORDER[window];
  const indexMap = new Map<string, number>();
  order.forEach((id, idx) => indexMap.set(id, idx));

  return shelves.slice().sort((a, b) => {
    const idxA = indexMap.get(a.id) ?? 99;
    const idxB = indexMap.get(b.id) ?? 99;
    return idxA - idxB;
  });
}

/**
 * Ranks items inside each Home shelf, rebuilds `Curated Mix` ('all') from the
 * freshly ranked constituent shelves, orders shelves for the circadian window,
 * and deduplicates top-6 lead cards across shelves so consecutive rows never
 * open with identical posters.
 */
export function rankHomeShelves(
  rawShelves: readonly MainShelfSpec[],
  ctx: SanctuaryContext
): MainShelfSpec[] {
  const affinity =
    ctx.savedAffinity ??
    (ctx.savedMovies && ctx.savedMovies.length > 0 ? buildSavedAffinity(ctx.savedMovies) : undefined);
  const resolvedCtx: SanctuaryContext = affinity ? { ...ctx, savedAffinity: affinity } : ctx;

  // 1. Pre-rank non-mix shelves so Curated Mix interleaves top circadian picks
  const rankedById = new Map<string, KidsMediaItem[]>();
  for (const shelf of rawShelves) {
    if (shelf.id === 'all') continue;
    rankedById.set(shelf.id, rankItems(shelf.items, resolvedCtx));
  }

  // 2. Rebuild Curated Mix ('all') by interleaving the ranked constituent shelves
  const mixSourceIds =
    resolvedCtx.window === 'bedtime'
      ? ['bedtime', 'feelings', 'shows', 'learning']
      : resolvedCtx.window === 'wind_down'
      ? ['shows', 'feelings', 'bedtime', 'learning']
      : resolvedCtx.window === 'morning'
      ? ['learning', 'shows', 'feelings', 'bedtime']
      : ['shows', 'learning', 'feelings', 'bedtime'];

  const mixSeen = new Set<number>();
  const mixPool: KidsMediaItem[] = [];
  const rawMix = rawShelves.find((s) => s.id === 'all');

  for (let i = 0; i < 24 && mixPool.length < 48; i++) {
    for (const sid of mixSourceIds) {
      const list = rankedById.get(sid);
      const item = list?.[i];
      if (item && !mixSeen.has(item.id)) {
        mixSeen.add(item.id);
        mixPool.push(item);
        if (mixPool.length >= 48) break;
      }
    }
  }
  if (rawMix) {
    for (const item of rawMix.items) {
      if (!mixSeen.has(item.id) && mixPool.length < 48) {
        mixSeen.add(item.id);
        mixPool.push(item);
      }
    }
  }

  // 3. Order shelves for the active circadian window, then finalize each shelf
  //    with cross-shelf top-6 lead-slot deduplication and max-2-per-creator shelf cap.
  const orderedSpecs = orderShelves(rawShelves, resolvedCtx.window);
  const usedInLeadSlots = new Set<number>();
  const usedLeadCreators = new Set<string>();
  const finalShelves: MainShelfSpec[] = [];

  for (const spec of orderedSpecs) {
    const sourceItems = spec.id === 'all' ? mixPool : (rankedById.get(spec.id) ?? spec.items);
    const ranked = rankItems(sourceItems, resolvedCtx, {
      maxPerCreator: 2,
      deprioritizeIds: usedInLeadSlots.size > 0 && sourceItems.length >= 6 ? usedInLeadSlots : undefined,
      deprioritizeCreators: usedLeadCreators.size > 0 && sourceItems.length >= 6 ? usedLeadCreators : undefined,
    });

    const leadCount = Math.min(6, ranked.length);
    for (let i = 0; i < leadCount; i++) {
      usedInLeadSlots.add(ranked[i].id);
      if (i < 2) {
        const ck = extractFeatures(ranked[i]).creatorKey;
        if (ck) usedLeadCreators.add(ck);
      }
    }

    finalShelves.push({
      ...spec,
      items: ranked,
    });
  }

  return finalShelves;
}
