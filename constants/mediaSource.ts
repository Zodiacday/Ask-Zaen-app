import bundledData from './bundled_kids_media.json';
import {
  AgeTier,
  KidsMediaItem,
  MainShelfSpec,
  getCalmFeed,
  getCategories,
  getCategoryItems,
  getFeaturedCarouselShows,
  getMainShelves,
  isBrowsableItem,
} from './kidsDb';
import {
  LanguageOption,
  buildLanguageOptions,
  getLanguageSpec,
  matchesLanguage,
  normalizeLanguage,
} from './languages';
import {
  CircadianWindow,
  getCircadianWindow,
  rankHomeShelves,
} from './sanctuaryAlgorithm';
import { rotateHomeShelves, type RotationContext } from './contentRotation';

/** Canonical HTTPS API origin for the live Ask Zaen media service. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || 'https://www.askzaen.com/api/v1';

function normalizeMediaType(raw: any): KidsMediaItem['media_type'] {
  const value = String(raw.mediaType ?? raw.media_type ?? raw.type ?? 'video').toLowerCase();
  if (value === 'episode') return 'episode';
  if (raw.parentShowId != null && raw.episodeNumber != null && value !== 'show') return 'episode';
  if (value === 'show' || value === 'music') return value;
  return 'video';
}

function normalizeStimulationLabel(raw: any): KidsMediaItem['stimulation_label'] {
  const value = String(raw.stimulation_label ?? raw.stimulationLevel ?? raw.stimulation_level ?? '').toLowerCase();
  if (value === 'low') return 'calm';
  if (value === 'medium') return 'moderate';
  if (value === 'calm' || value === 'moderate' || value === 'high') return value;
  return null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function compatibilityMetadata(raw: any): string | null {
  const sensory = raw.sensoryProfile;
  const offers = Array.isArray(raw.platformOffers) ? raw.platformOffers : [];
  const image = raw.posterUrl || raw.backdropUrl;
  const metadata: Record<string, unknown> = {};
  if (image) metadata.image = image;
  if (offers.length > 0) metadata.streaming_offers = offers;
  if (sensory && typeof sensory === 'object') {
    metadata.sensory_profile = {
      visual_pace: sensory.visualPace ?? null,
      sound_intensity: sensory.soundIntensity ?? null,
      narrative_pressure: sensory.narrativePressure ?? null,
      emotional_arousal: sensory.emotionalArousal ?? null,
      reward_pressure: sensory.rewardPressure ?? null,
      cuts_per_minute: sensory.cutsPerMinute ?? null,
      recommended_routine: sensory.recommendedRoutine ?? null,
      parent_advisory: sensory.parentAdvisory ?? null,
    };
  }
  if (raw.seasonNumber != null) metadata.season = raw.seasonNumber;
  if (raw.episodeNumber != null) metadata.number = raw.episodeNumber;
  return Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;
}

/**
 * Normalizes a remote database row into a strict `KidsMediaItem` (coercing string
 * IDs from FastAPI/SvelteKit adapters into numeric IDs for O(1) Set/Map lookups).
 */
export function normalizeRemoteItem(raw: any): KidsMediaItem {
  const mediaType = normalizeMediaType(raw);
  const parentShowId = raw.parentShowId ?? raw.parent_show_id;
  return {
    id: Number(raw.numericId ?? raw.id ?? raw.contentId),
    title: String(raw.title ?? ''),
    media_type: mediaType,
    target_age_group: raw.ageGroup ?? raw.target_age_group ?? raw.age ?? null,
    genre_category: raw.genre ?? raw.genre_category ?? null,
    duration: raw.duration ?? null,
    duration_seconds: nullableNumber(raw.durationSeconds ?? raw.duration_seconds),
    platform_url: raw.platformUrl ?? raw.platform_url ?? raw.linkUrl ?? null,
    poster_url: raw.posterUrl ?? raw.poster_url ?? raw.imageUrl ?? null,
    backdrop_url: raw.backdropUrl ?? raw.backdrop_url ?? null,
    description: raw.description ?? null,
    creator_publisher: raw.creator_publisher ?? raw.creatorPublisher ?? null,
    language: raw.language ?? null,
    release_year: nullableNumber(raw.release_year ?? raw.releaseYear),
    metadata_json: compatibilityMetadata(raw),
    stimulation_score: nullableNumber(raw.stimulation_score ?? raw.stimulationScore),
    stimulation_label: normalizeStimulationLabel(raw),
    safety_rating_tags: Array.isArray(raw.safetyTags)
      ? raw.safetyTags.join(', ')
      : raw.safety_rating_tags ?? null,
    parent_show_id: parentShowId != null ? Number(parentShowId) : null,
    season_number: nullableNumber(raw.seasonNumber ?? raw.season_number),
    episode_number: nullableNumber(raw.episodeNumber ?? raw.episode_number),
    has_episodes: raw.hasEpisodes === true,
    episode_count: typeof raw.episodeCount === 'number' ? raw.episodeCount : 0,
    season_count: typeof raw.seasonCount === 'number' ? raw.seasonCount : 0,
  };
}

export interface RemoteMediaQueryParams {
  page?: number;
  limit?: number;
  cursor?: string | null;
  stimulation?: string;
  category?: string;
  gate?: string;
  media_type?: string;
  window?: CircadianWindow;
  age?: string;
  language?: string | null;
  platforms?: readonly string[];
  audio_only?: boolean;
  query?: string;
  sort?: 'calm_first' | 'stim_high' | 'newest' | 'recommended' | string;
  rotationDate?: string;
  rotationSeed?: string;
  rotationSurface?: 'discover' | 'category' | 'language';
  signal?: AbortSignal;
}

export interface RemoteMediaPage {
  total?: number;
  page?: number;
  pages?: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  items: KidsMediaItem[];
}

/**
 * Stage 1 (90k-Scale SQL Pushdown): Fetches paginated, pre-filtered, circadian-sorted
 * media pages from the remote FastAPI/SQLite database (`limit = 48` default).
 */
export async function fetchRemoteMedia(
  params: RemoteMediaQueryParams = {}
): Promise<RemoteMediaPage | null> {
  try {
    const queryParts: string[] = [];
    queryParts.push(`limit=${params.limit ?? 48}`);
    if (params.cursor !== undefined) {
      if (params.cursor) {
        queryParts.push(`cursor=${encodeURIComponent(params.cursor)}`);
      } else {
        queryParts.push('pagination=cursor');
      }
    } else {
      queryParts.push(`page=${params.page ?? 1}`);
    }
    if (params.stimulation) queryParts.push(`stimulation=${encodeURIComponent(params.stimulation)}`);
    if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params.gate) queryParts.push(`gate=${encodeURIComponent(params.gate)}`);
    if (params.media_type && params.media_type !== 'all') queryParts.push(`mediaType=${encodeURIComponent(params.media_type)}`);
    if (params.age && params.age !== 'all') queryParts.push(`age=${encodeURIComponent(params.age)}`);
    if (params.language) queryParts.push(`language=${encodeURIComponent(params.language)}`);
    if (params.platforms && params.platforms.length > 0) {
      queryParts.push(`platforms=${encodeURIComponent(params.platforms.join(','))}`);
    }
    if (params.audio_only) queryParts.push('audioOnly=true');
    if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
    if (params.sort) queryParts.push(`sort=${encodeURIComponent(params.sort)}`);
    if (params.rotationDate) queryParts.push(`rotationDate=${encodeURIComponent(params.rotationDate)}`);
    if (params.rotationSeed) queryParts.push(`rotationSeed=${encodeURIComponent(params.rotationSeed)}`);
    if (params.rotationSurface) queryParts.push(`rotationSurface=${encodeURIComponent(params.rotationSurface)}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await fetch(`${API_BASE_URL}/media${qs}`, { signal: params.signal });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) return null;
    const data = await res.json();
    const rawItems = Array.isArray(data?.items) ? data.items : [];
    return {
      total: typeof data?.total === 'number' ? data.total : undefined,
      page: typeof data?.page === 'number' ? data.page : undefined,
      pages: typeof data?.pages === 'number' ? data.pages : undefined,
      limit: Number(data?.limit ?? params.limit ?? 48),
      hasMore: data?.hasMore === true,
      nextCursor: typeof data?.nextCursor === 'string' ? data.nextCursor : null,
      items: rawItems.map(normalizeRemoteItem),
    };
  } catch {
    return null;
  }
}

/**
 * Stage 1 + Stage 2 for 90k Home Shelves: Fetches bounded shelf candidate pools
 * (`/api/home-shelves`) from the remote DB and runs client fine-ranking & cross-shelf dedup.
 */
export async function fetchRemoteHomeShelves(opts: {
  language?: string | null;
  ageTier?: AgeTier;
  platforms?: readonly string[];
  window?: CircadianWindow;
  savedMovies?: readonly KidsMediaItem[];
} = {}): Promise<MainShelfSpec[] | null> {
  // Home shelves remain intentionally local until /api/v1/home-shelves is planned.
  void opts;
  return null;
}

/**
 * Live remote show detail with full episode catalog from VPS.
 */
export async function fetchRemoteShowDetail(showId: number): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/media/${showId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Content adapter.
 *
 * Everything in the app reads content through this module. Today it is backed
 * by the bundled catalog; to point the app at a separate database, reimplement
 * these functions (or swap this file for an API-backed version) and no screen
 * needs to change.
 */

let cachedAllItems: KidsMediaItem[] | null = null;

/** Every unique title in the library, regardless of category. */
export function getAllItems(): KidsMediaItem[] {
  if (cachedAllItems) return cachedAllItems;

  const seen = new Map<number, KidsMediaItem>();

  for (const item of getCalmFeed()) {
    seen.set(item.id, item);
  }

  const categoryItems = bundledData.categoryItems as Record<string, KidsMediaItem[]>;
  for (const categoryId in categoryItems) {
    for (const item of categoryItems[categoryId]) {
      seen.set(item.id, item);
    }
  }

  // Curated hero titles can live outside the category shelves.
  for (const item of getFeaturedCarouselShows('preschool')) {
    if (!seen.has(item.id)) {
      seen.set(item.id, item);
    }
  }

  cachedAllItems = Array.from(seen.values());
  return cachedAllItems;
}

let cachedBrowsableItems: KidsMediaItem[] | null = null;

/**
 * Titles that belong in browse surfaces. Episodes are excluded here because
 * they are presented inside their parent show's detail page.
 */
export function getBrowsableItems(): KidsMediaItem[] {
  if (cachedBrowsableItems) return cachedBrowsableItems;
  cachedBrowsableItems = getAllItems().filter(isBrowsableItem);
  return cachedBrowsableItems;
}

export function filterByLanguage(
  items: KidsMediaItem[],
  code?: string | null
): KidsMediaItem[] {
  if (!code) return items;
  return items.filter((item) => matchesLanguage(item, code));
}

/** Only languages that actually contain titles are returned. */
export function getAvailableLanguages(): LanguageOption[] {
  return buildLanguageOptions(getBrowsableItems());
}

export function getLanguageCount(code?: string | null): number {
  return filterByLanguage(getBrowsableItems(), code).length;
}

export interface HomeShelvesOptions {
  window?: CircadianWindow;
  savedMovies?: readonly KidsMediaItem[];
  rotation?: RotationContext;
}

/**
 * The five home shelves, respecting the selected language, child age tier,
 * live circadian window, saved-title affinity, creator diversity, and cross-shelf dedup.
 */
export function getHomeShelves(
  code?: string | null,
  ageTier?: AgeTier,
  opts?: HomeShelvesOptions
): MainShelfSpec[] {
  const activeWindow = opts?.window ?? getCircadianWindow(new Date(), ageTier);
  const languageFiltered = getMainShelves(ageTier).map((shelf) => ({
    ...shelf,
    items: filterByLanguage(shelf.items, code),
  }));

  const ranked = rankHomeShelves(languageFiltered, {
    window: activeWindow,
    ageTier,
    savedMovies: opts?.savedMovies,
  }).filter((shelf) => shelf.items.length > 0);

  return opts?.rotation ? rotateHomeShelves(ranked, opts.rotation) : ranked;
}

export interface LanguageShelf {
  id: string;
  title: string;
  badge?: string;
  items: KidsMediaItem[];
}

/** All category shelves that contain titles in the selected language. */
export function getLanguageShelves(code?: string | null): LanguageShelf[] {
  return getCategories()
    .map((category) => ({
      id: category.id,
      title: category.title,
      badge: category.age,
      items: filterByLanguage(
        getCategoryItems(category.id).filter(isBrowsableItem),
        code
      ),
    }))
    .filter((shelf) => shelf.items.length > 0);
}

function hasArtwork(item: KidsMediaItem): boolean {
  if (!item.metadata_json) return false;

  try {
    const meta = JSON.parse(item.metadata_json);
    return Boolean(meta?.backdrop || meta?.image);
  } catch {
    return false;
  }
}

/**
 * Hero titles for a language. Uses the curated flagship picks when they match,
 * otherwise falls back to the best-illustrated titles in that language.
 */
export function getLanguageFeatured(code?: string | null): KidsMediaItem[] {
  const flagship = getFeaturedCarouselShows('preschool');

  if (!code) return flagship;

  const matchingFlagship = filterByLanguage(flagship, code);
  if (matchingFlagship.length > 0) return matchingFlagship;

  const languageItems = filterByLanguage(getBrowsableItems(), code);
  if (languageItems.length === 0) return [];

  const illustrated = languageItems.filter(hasArtwork);
  return (illustrated.length > 0 ? illustrated : languageItems).slice(0, 6);
}

export interface EpisodeMeta {
  season: number;
  number: number;
  name: string;
  summary: string;
  image: string | null;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/** Normalizes an episode's metadata into the fields the UI needs. */
export function parseEpisodeMeta(item: KidsMediaItem): EpisodeMeta {
  const fallbackName =
    item.title.replace(/^.*?-\s*S\d+E\d+\s*-\s*/i, '').trim() || item.title;

  const result: EpisodeMeta = {
    season: item.season_number ?? 1,
    number: item.episode_number ?? 0,
    name: fallbackName,
    summary: item.description || '',
    image: null,
  };

  if (!item.metadata_json) return result;

  try {
    const meta = JSON.parse(item.metadata_json);
    if (typeof meta.season === 'number') result.season = meta.season;
    if (typeof meta.number === 'number') result.number = meta.number;
    if (typeof meta.name === 'string' && meta.name.trim()) result.name = meta.name.trim();
    if (typeof meta.summary === 'string' && meta.summary.trim()) {
      result.summary = stripHtml(meta.summary);
    }
    if (typeof meta.image === 'string') {
      result.image = meta.image;
    } else if (meta.image && typeof meta.image === 'object') {
      result.image = meta.image.original || meta.image.medium || null;
    }
  } catch {
    // Malformed metadata: keep the title-based fallbacks.
  }

  return result;
}

let episodesByShow: Map<number, KidsMediaItem[]> | null = null;

function buildEpisodeIndex(): Map<number, KidsMediaItem[]> {
  const index = new Map<number, KidsMediaItem[]>();

  // Pre-populate starter episodes for flagship calm shows
  const bundledEps = (bundledData as any).bundledEpisodes as Record<string, KidsMediaItem[]> | undefined;
  if (bundledEps) {
    for (const showIdStr in bundledEps) {
      const showId = Number(showIdStr);
      index.set(showId, [...bundledEps[showIdStr]]);
    }
  }

  for (const item of getAllItems()) {
    if (item.media_type !== 'episode' || item.parent_show_id == null) continue;

    const list = index.get(item.parent_show_id) ?? [];
    if (!list.some((e) => e.id === item.id)) {
      list.push(item);
      index.set(item.parent_show_id, list);
    }
  }

  for (const list of index.values()) {
    list.sort((a, b) => {
      const metaA = parseEpisodeMeta(a);
      const metaB = parseEpisodeMeta(b);
      return metaA.season - metaB.season || metaA.number - metaB.number;
    });
  }

  return index;
}

/** All episodes belonging to a show, sorted by season and episode number. */
export function getEpisodesForShow(showId: number): KidsMediaItem[] {
  if (!episodesByShow) {
    episodesByShow = buildEpisodeIndex();
  }
  return episodesByShow.get(showId) ?? [];
}

/** Distinct season numbers present in an episode list, ascending. */
export function getEpisodeSeasons(episodes: KidsMediaItem[]): number[] {
  return Array.from(
    new Set(episodes.map((episode) => parseEpisodeMeta(episode).season))
  ).sort((a, b) => a - b);
}

/** Display helpers so screens do not need to import the registry directly. */
export function getLanguageLabel(code?: string | null): string {
  return getLanguageSpec(normalizeLanguage(code) ?? code).nativeName;
}
