import bundledData from './bundled_kids_media.json';
import { isGenuineAudioMedia } from './sanctuaryAlgorithm';

export interface SensoryProfile {
  visual_pace: 'low' | 'medium' | 'high';
  sound_intensity: 'low' | 'medium' | 'high';
  narrative_pressure: 'low' | 'medium' | 'high';
  emotional_arousal: 'low' | 'medium' | 'high';
  reward_pressure: 'low' | 'medium' | 'high';
  cuts_per_minute: number;
  recommended_routine: string;
  parent_advisory: string;
}

export interface KidsMediaItem {
  id: number;
  title: string;
  media_type: 'show' | 'video' | 'music' | 'episode';
  target_age_group: string | null;
  genre_category: string | null;
  duration: string | null;
  duration_seconds: number | null;
  platform_url: string | null;
  /** Direct high-resolution portrait poster image URL (2:3 aspect ratio). */
  poster_url?: string | null;
  /** Direct high-resolution widescreen backdrop image URL (16:9 aspect ratio). */
  backdrop_url?: string | null;
  description: string | null;
  creator_publisher: string | null;
  language: string | null;
  release_year: number | null;
  metadata_json: string | null;
  stimulation_score: number | null;
  stimulation_label: 'calm' | 'moderate' | 'high' | null;
  safety_rating_tags?: string | null;
  /** Set on episode items, linking them to their parent show. */
  parent_show_id?: number | null;
  /** Explicit episode hierarchy returned by the remote API when available. */
  season_number?: number | null;
  episode_number?: number | null;
  has_episodes?: boolean;
  episode_count?: number;
  season_count?: number;
}

export function parseSensoryProfile(item: KidsMediaItem): SensoryProfile | null {
  if (item.metadata_json) {
    try {
      const meta = JSON.parse(item.metadata_json);
      if (meta.sensory_profile) {
        return meta.sensory_profile as SensoryProfile;
      }
    } catch {
      // ignore JSON parse error
    }
  }
  return null;
}

export interface CategorySpec {
  id: string;
  title: string;
  badge: string;
  icon: string;
  age: string;
  count: number;
}

export const HD_BACKDROP_MAP: Record<string, string> = {
  'daniel tiger': 'https://static.tvmaze.com/uploads/images/original_untouched/223/559286.jpg',
  'bluey': 'https://static.tvmaze.com/uploads/images/original_untouched/226/565400.jpg',
  'trash truck': 'https://static.tvmaze.com/uploads/images/original_untouched/282/705252.jpg',
  'tumble leaf': 'https://static.tvmaze.com/uploads/images/original_untouched/228/570752.jpg',
  'puffin rock': 'https://static.tvmaze.com/uploads/images/original_untouched/49/124003.jpg',
  'octonauts': 'https://static.tvmaze.com/uploads/images/original_untouched/356/891360.jpg',
  'mister rogers': 'https://static.tvmaze.com/uploads/images/original_untouched/26/67175.jpg',
  'avatar': 'https://static.tvmaze.com/uploads/images/original_untouched/148/371534.jpg',
};

function addArtworkCandidate(candidates: string[], value: unknown): void {
  if (typeof value !== 'string') return;
  const normalized = value.trim();
  if (normalized && !candidates.includes(normalized)) candidates.push(normalized);
}

function youtubeThumbnail(item: KidsMediaItem): string | null {
  if (!item.platform_url || (!item.platform_url.includes('youtube.com') && !item.platform_url.includes('youtu.be'))) {
    return null;
  }
  const match = item.platform_url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match?.[1] ? `https://i.ytimg.com/vi/${match[1]}/mqdefault.jpg` : null;
}

/**
 * Returns bounded remote artwork candidates in reliability order.
 * Local branded artwork is intentionally handled by FallbackArtwork instead of
 * pretending that an unrelated remote image is a valid poster.
 */
export function getPosterCandidates(item: KidsMediaItem, preferBackdrop: boolean = false): string[] {
  const candidates: string[] = [];
  const titleLower = (item.title || '').toLowerCase();

  if (preferBackdrop) {
    addArtworkCandidate(candidates, item.backdrop_url);
    for (const [key, hdUrl] of Object.entries(HD_BACKDROP_MAP)) {
      if (titleLower.includes(key)) addArtworkCandidate(candidates, hdUrl);
    }
  } else {
    addArtworkCandidate(candidates, item.poster_url);
  }

  if (item.metadata_json) {
    try {
      const meta = JSON.parse(item.metadata_json);
      const image = meta?.image;
      if (typeof image === 'object' && image) {
        addArtworkCandidate(candidates, image.medium);
        addArtworkCandidate(candidates, image.original);
      } else {
        addArtworkCandidate(candidates, image);
      }
      addArtworkCandidate(candidates, preferBackdrop ? meta?.backdrop : null);
    } catch {
      // Ignore malformed optional metadata and continue to provider fallbacks.
    }
  }

  if (!preferBackdrop) addArtworkCandidate(candidates, item.backdrop_url);
  addArtworkCandidate(candidates, item.poster_url);
  addArtworkCandidate(candidates, youtubeThumbnail(item));

  return candidates;
}

export function parseItemPoster(item: KidsMediaItem, preferBackdrop: boolean = false): string | null {
  return getPosterCandidates(item, preferBackdrop)[0] ?? null;
}

/**
 * Determines whether an item should render in 16:9 landscape widescreen
 * or 2:3 vertical portrait.
 */
export function isWidescreenItem(item: KidsMediaItem): boolean {
  if (item.platform_url && (item.platform_url.includes('youtube.com') || item.platform_url.includes('youtu.be'))) {
    return true;
  }
  if (item.media_type === 'video' || item.media_type === 'music' || item.media_type === 'episode') {
    return true;
  }
  if (item.backdrop_url && !item.poster_url) {
    return true;
  }
  if (item.poster_url && !item.backdrop_url) {
    return false;
  }
  if (item.metadata_json) {
    try {
      const meta = JSON.parse(item.metadata_json);
      if (meta.image && typeof meta.image === 'object') {
        const img = meta.image.original || meta.image.medium || '';
        if (img.includes('portrait')) {
          return false;
        }
      }
      if (meta.backdrop && !meta.image) {
        return true;
      }
    } catch {}
  }
  if (item.media_type === 'show') {
    return false;
  }
  return true;
}

/**
 * Detects whether an item is genuine audio/music media (music, podcast, audiobook,
 * or audio-only story) intended for listening without screen fixation. Never matches TV shows.
 */
export function isAudioItem(item: KidsMediaItem): boolean {
  return isGenuineAudioMedia(item);
}

export type HomepageIntentId = 'all' | 'shows' | 'learning' | 'feelings' | 'bedtime';

export interface HomepageIntentCategory {
  id: HomepageIntentId;
  label: string;
  title: string;
  emoji: string;
  intentSubtitle: string;
  intentDescription: string;
  shelfIds: string[];
}

export const HOMEPAGE_INTENT_CATEGORIES: HomepageIntentCategory[] = [
  {
    id: 'all',
    label: 'Curated Mix',
    title: 'Curated Mix',
    emoji: '',
    intentSubtitle: '',
    intentDescription: '',
    shelfIds: [
      'feelings',
      'pbs',
      'phonics',
      'discovery',
      'bedtime',
      'disney',
      'math',
      'stem',
      'art_studio',
      'bbc',
      'nick_jr',
    ],
  },
  {
    id: 'shows',
    label: 'Gentle Shows',
    title: 'Gentle Shows',
    emoji: '',
    intentSubtitle: '',
    intentDescription: '',
    shelfIds: ['pbs', 'nick_jr', 'disney', 'bbc', 'big_kids', 'tweens'],
  },
  {
    id: 'learning',
    label: 'Curious Wonder',
    title: 'Curious Wonder',
    emoji: '',
    intentSubtitle: '',
    intentDescription: '',
    shelfIds: ['phonics', 'math', 'stem', 'discovery', 'art_studio'],
  },
  {
    id: 'feelings',
    label: 'Big Feelings',
    title: 'Big Feelings',
    emoji: '',
    intentSubtitle: '',
    intentDescription: '',
    shelfIds: ['feelings'],
  },
  {
    id: 'bedtime',
    label: 'Bedtime & Sleep',
    title: 'Bedtime & Sleep',
    emoji: '',
    intentSubtitle: '',
    intentDescription: '',
    shelfIds: ['bedtime', 'nursery'],
  },
];

export function getShelvesForIntent(intentId: HomepageIntentId): CategorySpec[] {
  const intent = HOMEPAGE_INTENT_CATEGORIES.find((c) => c.id === intentId) || HOMEPAGE_INTENT_CATEGORIES[0];
  const allCategories = getCategories();
  return intent.shelfIds
    .map((id) => allCategories.find((cat) => cat.id === id))
    .filter((cat): cat is CategorySpec => cat !== undefined);
}

export interface MainShelfSpec {
  id: string;
  title: string;
  badge?: string;
  subtitle?: string;
  items: KidsMediaItem[];
}

function uniqueById(items: KidsMediaItem[]): KidsMediaItem[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/** 
 * Browsable items in the calm sanctuary.
 * Episodes belong in their parent show, and high-stimulation
 * content is strictly isolated to the Sensory Boundary alone.
 */
export function isBrowsableItem(item: KidsMediaItem): boolean {
  return item.media_type !== 'episode' && item.stimulation_label !== 'high';
}

let browsableCategoryCache: Record<string, KidsMediaItem[]> | null = null;

/** Category items with episodes removed, cached for the browse surfaces. */
export function getBrowsableCategoryItems(): Record<string, KidsMediaItem[]> {
  if (browsableCategoryCache) return browsableCategoryCache;

  const raw = bundledData.categoryItems as Record<string, KidsMediaItem[]>;
  const result: Record<string, KidsMediaItem[]> = {};
  for (const categoryId in raw) {
    result[categoryId] = raw[categoryId].filter(isBrowsableItem);
  }

  browsableCategoryCache = result;
  return result;
}

/**
 * Returns strictly low-stimulation titles matching the given item's age bracket,
 * media type, and theme/network affinity.
 */
export function getRelatedMediaItems(
  item: KidsMediaItem,
  limit: number = 6
): KidsMediaItem[] {
  if (!item) return [];

  const allCategoryItems = getBrowsableCategoryItems();
  const pool: KidsMediaItem[] = [];
  const seenIds = new Set<number>();

  for (const list of Object.values(allCategoryItems)) {
    for (const candidate of list) {
      if (
        candidate.id !== item.id &&
        !candidate.parent_show_id &&
        candidate.media_type !== 'episode' &&
        candidate.stimulation_label === 'calm' &&
        !seenIds.has(candidate.id)
      ) {
        seenIds.add(candidate.id);
        pool.push(candidate);
      }
    }
  }

  // Fallback to any non-high stimulation if pool is small
  if (pool.length < limit) {
    for (const list of Object.values(allCategoryItems)) {
      for (const candidate of list) {
        if (
          candidate.id !== item.id &&
          !candidate.parent_show_id &&
          candidate.media_type !== 'episode' &&
          candidate.stimulation_label !== 'high' &&
          !seenIds.has(candidate.id)
        ) {
          seenIds.add(candidate.id);
          pool.push(candidate);
        }
      }
    }
  }

  const targetAge = item.target_age_group || '';
  const targetType = item.media_type || '';
  const targetCreator = (item.creator_publisher || '').toLowerCase();
  const targetTags = new Set(
    `${item.safety_rating_tags || ''},${item.genre_category || ''}`
      .split(/[,•]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  const scored = pool.map((candidate) => {
    let score = 0;

    // 1. Age bracket match (Highest weight)
    const candAge = candidate.target_age_group || '';
    if (targetAge && candAge) {
      if (targetAge === candAge) {
        score += 60;
      } else {
        const targetParts = targetAge.split(/[-+]/).filter(Boolean);
        const candParts = candAge.split(/[-+]/).filter(Boolean);
        const hasOverlap = targetParts.some((p) => candParts.includes(p));
        if (hasOverlap) score += 35;
      }
    }

    // 2. Media type affinity (show -> show, audio -> audio)
    if (targetType && candidate.media_type === targetType) {
      score += 25;
    }

    // 3. Network / Creator affinity
    const candCreator = (candidate.creator_publisher || '').toLowerCase();
    if (
      targetCreator &&
      candCreator &&
      (targetCreator.includes(candCreator) || candCreator.includes(targetCreator))
    ) {
      score += 20;
    }

    // 4. Theme & Tag overlap
    const candTags = `${candidate.safety_rating_tags || ''},${candidate.genre_category || ''}`
      .split(/[,•]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    for (const tag of candTags) {
      if (targetTags.has(tag)) {
        score += 10;
      }
    }

    return { candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.candidate);
}

export function getMainShelves(ageTier?: AgeTier): MainShelfSpec[] {
  const catItems = getBrowsableCategoryItems();

  // Adapt show list based on child age tier
  const showCategories =
    ageTier === 'preschool'
      ? ['pbs', 'nick_jr', 'disney', 'bbc']
      : ageTier === 'tweens'
      ? ['big_kids', 'tweens', 'disney', 'bbc', 'pbs']
      : ['pbs', 'nick_jr', 'disney', 'bbc', 'big_kids'];

  const shows = uniqueById(
    showCategories.flatMap((cat) => catItems[cat] || [])
  );

  const learningCategories =
    ageTier === 'preschool'
      ? ['phonics', 'math', 'discovery']
      : ageTier === 'tweens'
      ? ['stem', 'discovery', 'art_studio', 'math']
      : ['phonics', 'math', 'stem', 'discovery', 'art_studio'];

  const learning = uniqueById(
    learningCategories.flatMap((cat) => catItems[cat] || [])
  );

  const feelings = uniqueById(catItems['feelings'] || []);

  const bedtime = uniqueById([
    ...(catItems['bedtime'] || []),
    ...(catItems['nursery'] || []),
  ]);

  // Curated blend for "🌟 Mixed"
  const allBlendSeen = new Set<number>();
  const allBlend: KidsMediaItem[] = [];
  const maxItems = 45;
  for (let i = 0; i < 20; i++) {
    for (const item of [shows[i], learning[i], feelings[i], bedtime[i]]) {
      if (item && !allBlendSeen.has(item.id)) {
        allBlendSeen.add(item.id);
        allBlend.push(item);
        if (allBlend.length >= maxItems) break;
      }
    }
    if (allBlend.length >= maxItems) break;
  }

  return [
    {
      id: 'all',
      title: 'Curated Mix',
      items: allBlend,
    },
    {
      id: 'shows',
      title: 'Gentle Shows',
      items: shows,
    },
    {
      id: 'learning',
      title: 'Curious Wonder',
      items: learning,
    },
    {
      id: 'feelings',
      title: 'Big Feelings',
      items: feelings,
    },
    {
      id: 'bedtime',
      title: 'Bedtime & Sleep',
      items: bedtime,
    },
  ];
}

export function getMainShelfById(id: string): MainShelfSpec | undefined {
  const shelves = getMainShelves();
  if (id === 'mixed' || id === 'all') return shelves.find((s) => s.id === 'all');
  return shelves.find((s) => s.id === id);
}

export interface DedicatedHubSubShelf {
  id: string;
  title: string;
  items: KidsMediaItem[];
}

export interface DedicatedHubSpec {
  id: string;
  title: string;
  tagline: string;
  isNightMode?: boolean;
  subShelves: DedicatedHubSubShelf[];
}

export function getDedicatedHubData(categoryId: string): DedicatedHubSpec {
  const catItems = getBrowsableCategoryItems();
  const id = (categoryId || 'all').toLowerCase();

  if (id === 'shows') {
    return {
      id: 'shows',
      title: 'Gentle Shows',
      tagline: 'Gentle narrative storytelling with low scene-cut velocity',
      subShelves: [
        { id: 'pbs', title: 'PBS KIDS Classics', items: catItems['pbs'] || [] },
        { id: 'bbc', title: 'CBeebies Calm Stories', items: catItems['bbc'] || [] },
        { id: 'disney', title: 'Disney Family Favorites', items: catItems['disney'] || [] },
        { id: 'nick_jr', title: 'Nick Jr. Gentle Friends', items: catItems['nick_jr'] || [] },
        { id: 'big_kids', title: 'Elementary Adventures (6+)', items: catItems['big_kids'] || [] },
      ],
    };
  }

  if (id === 'learning') {
    return {
      id: 'learning',
      title: 'Curious Wonder',
      tagline: 'Curiosity-driven screen time centered on discovery',
      subShelves: [
        { id: 'phonics', title: 'Phonics & Letters', items: catItems['phonics'] || [] },
        { id: 'math', title: 'Numbers & Shapes', items: catItems['math'] || [] },
        { id: 'stem', title: 'Science & Discovery', items: catItems['stem'] || [] },
        { id: 'discovery', title: 'Nature & Animals', items: catItems['discovery'] || [] },
        { id: 'art_studio', title: 'Art & Music Studio', items: catItems['art_studio'] || [] },
      ],
    };
  }

  if (id === 'feelings') {
    const feelings = catItems['feelings'] || [];
    const calmDown = feelings.filter((i) => {
      const t = (i.title + ' ' + (i.description || '')).toLowerCase();
      return t.includes('calm') || t.includes('mad') || t.includes('breath') || t.includes('feelings');
    });
    const sharing = feelings.filter((i) => {
      const t = (i.title + ' ' + (i.description || '')).toLowerCase();
      return t.includes('share') || t.includes('friend') || t.includes('play');
    });
    const patience = feelings.filter((i) => {
      const t = (i.title + ' ' + (i.description || '')).toLowerCase();
      return t.includes('patient') || t.includes('wait') || t.includes('turn') || t.includes('song');
    });

    return {
      id: 'feelings',
      title: 'Big Feelings',
      tagline: 'Emotional regulation, empathy, and calming-down routines',
      subShelves: [
        { id: 'calm_down', title: 'Calming Down & Breath Routines', items: calmDown.length > 0 ? calmDown : feelings.slice(0, 5) },
        { id: 'sharing', title: 'Sharing & Taking Turns', items: sharing.length > 0 ? sharing : feelings.slice(5, 10) },
        { id: 'patience', title: 'Patience & Waiting Songs', items: patience.length > 0 ? patience : feelings.slice(10, 14) },
        { id: 'all_feelings', title: 'All About Feelings', items: feelings },
      ],
    };
  }

  if (id === 'bedtime') {
    const bedtime = catItems['bedtime'] || [];
    const nursery = catItems['nursery'] || [];
    const dimStories = bedtime.filter(
      (i) => i.media_type === 'video' || (i.title + ' ' + (i.description || '')).toLowerCase().includes('story')
    );

    return {
      id: 'bedtime',
      title: 'Bedtime & Sleep',
      tagline: 'Zero-cut sleep audio, lullabies, and dim night stories',
      subShelves: [
        { id: 'bedtime_audio', title: 'Zero-Cut Sleep Audio & Lullabies', items: bedtime },
        { id: 'nursery', title: 'Gentle Nursery Rhymes', items: nursery },
        { id: 'dim_stories', title: 'Dim Evening Stories', items: dimStories.length > 0 ? dimStories : bedtime.slice(0, 15) },
      ],
    };
  }

  // Fallback: 'mixed' or 'all'
  const shelves = getMainShelves();
  return {
    id: 'mixed',
    title: 'Curated Mix',
    tagline: 'Curated balance across all sanctuary shelves',
    subShelves: shelves.map((s) => ({
      id: s.id,
      title: s.title,
      items: s.items,
    })),
  };
}

export function getCategories(): CategorySpec[] {
  return bundledData.categories as CategorySpec[];
}

export function getCategoryItems(categoryId: string): KidsMediaItem[] {
  return ((bundledData.categoryItems as Record<string, any[]>)[categoryId] || []) as KidsMediaItem[];
}

export function getCalmFeed(): KidsMediaItem[] {
  return bundledData.calmFeed as KidsMediaItem[];
}

export function getMediaItemById(id: number): KidsMediaItem | null {
  const feed = getCalmFeed();
  const fromFeed = feed.find((m) => m.id === id);
  if (fromFeed) return fromFeed;

  const cats = getBrowsableCategoryItems();
  for (const key in cats) {
    const found = cats[key].find((m) => m.id === id);
    if (found) return found;
  }
  return null;
}

export function matchesStreamingService(item: KidsMediaItem, serviceId: string): boolean {
  if (serviceId === 'all') return true;
  const url = (item.platform_url || '').toLowerCase();
  const creator = (item.creator_publisher || '').toLowerCase();
  const title = (item.title || '').toLowerCase();

  switch (serviceId) {
    case 'youtube':
      return url.includes('youtube') || url.includes('youtu.be');
    case 'disney':
      return url.includes('disney') || creator.includes('disney');
    case 'paramount':
      return url.includes('paramountplus') || url.includes('nick') || creator.includes('nick');
    case 'prime':
      return url.includes('amazon') || url.includes('primevideo');
    case 'pbs':
      return url.includes('pbskids') || creator.includes('pbs');
    case 'apple':
      return url.includes('apple');
    case 'bbc':
      return url.includes('bbc') || creator.includes('cbeebies') || creator.includes('bbc');
    case 'netflix':
      return url.includes('netflix') || title.includes('magic school bus') || title.includes('octonauts');
    default:
      return true;
  }
}

export type AgeTier = 'preschool' | 'big_kids' | 'tweens' | 'all';

export const AGE_TIER_CATEGORY_MAP: Record<AgeTier, string[]> = {
  preschool: [
    'phonics',
    'math',
    'feelings',
    'discovery',
    'pbs',
    'nick_jr',
    'disney',
    'bbc',
    'bedtime',
    'nursery',
  ],
  big_kids: [
    'big_kids',
    'stem',
    'discovery',
    'art_studio',
    'pop',
  ],
  tweens: [
    'tweens',
    'stem',
    'art_studio',
    'pop',
  ],
  all: [
    'phonics',
    'math',
    'stem',
    'discovery',
    'feelings',
    'art_studio',
    'pbs',
    'nick_jr',
    'disney',
    'bbc',
    'bedtime',
    'nursery',
    'pop',
    'big_kids',
    'tweens',
  ],
};

export function getCategoriesForTier(tier: AgeTier): CategorySpec[] {
  const allowedIds = AGE_TIER_CATEGORY_MAP[tier];
  const allCats = getCategories();
  if (tier === 'all') return allCats;
  return allowedIds
    .map((id) => allCats.find((c) => c.id === id))
    .filter((c): c is CategorySpec => c !== undefined);
}

export function getHeroForTier(tier: AgeTier): KidsMediaItem | null {
  const list = getFeaturedCarouselShows(tier);
  return list[0] || null;
}

export function getFeaturedCarouselShows(tier: AgeTier): KidsMediaItem[] {
  // Flagship calm sanctuary shows with crystal-clear 1080p/720p HD backdrops
  return [
    {
      id: 21229,
      title: "Daniel Tiger's Neighborhood",
      media_type: 'show',
      target_age_group: '2-6',
      genre_category: 'Emotional & Social Growth',
      duration: '25 min',
      duration_seconds: 1500,
      platform_url: 'https://pbskids.org/danieltiger/',
      description: 'Gentle social-emotional learning with soft pacing and musical cues from Fred Rogers Productions.',
      creator_publisher: 'PBS Kids',
      language: 'en',
      release_year: 2012,
      metadata_json: JSON.stringify({
        backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/223/559286.jpg',
        badge: 'Calm Flow Pick',
        sensory_profile: {
          visual_pace: 'low',
          sound_intensity: 'low',
          narrative_pressure: 'low',
          emotional_arousal: 'low',
          reward_pressure: 'low',
          cuts_per_minute: 2.1,
          recommended_routine: 'Gentle Morning & Bedtime Transition',
          parent_advisory: 'Certified gentle stimulation. Calming musical strategies for handling emotions.'
        }
      }),
      stimulation_score: 4,
      stimulation_label: 'calm',
      safety_rating_tags: 'Certified Calm • Low Sound Pressure • Emotional Growth',
    },
    {
      id: 41821,
      title: 'Bluey',
      media_type: 'show',
      target_age_group: '3-8',
      genre_category: 'Imaginative Play & Family',
      duration: '8 min',
      duration_seconds: 480,
      platform_url: 'https://www.disneyplus.com/series/bluey/1ESvLdHwzEBr',
      description: 'Warm, heartwarming adventures celebrating gentle, creative childhood play with Bandit, Chilli, and Bingo.',
      creator_publisher: 'Disney+ / BBC',
      language: 'en',
      release_year: 2018,
      metadata_json: JSON.stringify({
        backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/226/565400.jpg',
        badge: 'Family Pick',
        sensory_profile: {
          visual_pace: 'low',
          sound_intensity: 'low',
          narrative_pressure: 'low',
          emotional_arousal: 'low',
          reward_pressure: 'low',
          cuts_per_minute: 2.8,
          recommended_routine: 'Family Play & Wind-down',
          parent_advisory: 'Wholesome humor without overstimulation or high-tempo sound effects.'
        }
      }),
      stimulation_score: 8,
      stimulation_label: 'calm',
      safety_rating_tags: 'Creative Play • Cooperative Family • Low Tension',
    },
    {
      id: 39629,
      title: 'Trash Truck',
      media_type: 'show',
      target_age_group: '2-6',
      genre_category: 'Gentle Friendship & Nature',
      duration: '12 min',
      duration_seconds: 720,
      platform_url: 'https://www.netflix.com/title/80242926',
      description: 'Hank and his best friend, a giant gentle trash truck, explore the sunny meadow with soft acoustic scores.',
      creator_publisher: 'Netflix',
      language: 'en',
      release_year: 2020,
      metadata_json: JSON.stringify({
        backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/282/705252.jpg',
        badge: 'Ultra-Gentle Acoustic Score',
        sensory_profile: {
          visual_pace: 'low',
          sound_intensity: 'low',
          narrative_pressure: 'low',
          emotional_arousal: 'low',
          reward_pressure: 'low',
          cuts_per_minute: 1.8,
          recommended_routine: 'Afternoon Quiet Time & Pre-Bed',
          parent_advisory: 'Minimal dialogue, slow panning camera, zero jump-scares or rapid flash sequences.'
        }
      }),
      stimulation_score: 3,
      stimulation_label: 'calm',
      safety_rating_tags: 'Acoustic Score • Low Cut Frequency • Slow Transitions',
    },
    {
      id: 9627,
      title: 'Tumble Leaf',
      media_type: 'show',
      target_age_group: '3-7',
      genre_category: 'Wonder-Filled Nature Discovery',
      duration: '13 min',
      duration_seconds: 780,
      platform_url: 'https://www.amazon.com/dp/B00K3UWNDW',
      description: 'Award-winning stop-motion masterpiece following Fig the Fox discovering everyday scientific wonders.',
      creator_publisher: 'Prime Video',
      language: 'en',
      release_year: 2014,
      metadata_json: JSON.stringify({
        backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/228/570752.jpg',
        badge: 'Stop-Motion Wonder',
        sensory_profile: {
          visual_pace: 'low',
          sound_intensity: 'low',
          narrative_pressure: 'low',
          emotional_arousal: 'low',
          reward_pressure: 'low',
          cuts_per_minute: 1.9,
          recommended_routine: 'Curiosity & Quiet Exploration',
          parent_advisory: 'Intricate tactile stop-motion animation with soft natural Foley sound design.'
        }
      }),
      stimulation_score: 5,
      stimulation_label: 'calm',
      safety_rating_tags: 'Tactile Artistry • Nature Acoustics • Zero Aggression',
    },
    {
      id: 3003,
      title: 'Puffin Rock',
      media_type: 'show',
      target_age_group: '2-6',
      genre_category: 'Wildlife & Natural Wonder',
      duration: '7 min',
      duration_seconds: 420,
      platform_url: 'https://www.netflix.com/title/80044949',
      description: 'Oona and Baba explore wildlife on a beautiful Irish island with calming narration by Chris O\'Dowd.',
      creator_publisher: 'Netflix',
      language: 'en',
      release_year: 2015,
      metadata_json: JSON.stringify({
        backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/49/124003.jpg',
        badge: 'Calm Irish Coast',
        sensory_profile: {
          visual_pace: 'low',
          sound_intensity: 'low',
          narrative_pressure: 'low',
          emotional_arousal: 'low',
          reward_pressure: 'low',
          cuts_per_minute: 2.0,
          recommended_routine: 'Bedtime Soother & Gentle Discovery',
          parent_advisory: 'Gentle orchestral strings and peaceful environmental sounds.'
        }
      }),
      stimulation_score: 6,
      stimulation_label: 'calm',
      safety_rating_tags: 'Gentle Narration • Wildlife Education • Soothing Scenery',
    },
    {
      id: 10001,
      title: 'SciShow Kids: How Does a Seed Become a Plant?',
      media_type: 'video',
      target_age_group: '4-8',
      genre_category: 'Nature & Plant Biology',
      duration: '4 min',
      duration_seconds: 254,
      platform_url: 'https://www.youtube.com/watch?v=tkFPyue5X3Q',
      description: 'Jessi and Squeaks explore germination with time-lapse nature photography and calm explanations.',
      creator_publisher: 'YouTube Learning',
      language: 'en',
      release_year: 2021,
      metadata_json: JSON.stringify({
        backdrop: 'https://i.ytimg.com/vi/tkFPyue5X3Q/maxresdefault.jpg',
        badge: 'Curious Minds',
        sensory_profile: {
          visual_pace: 'low',
          sound_intensity: 'low',
          narrative_pressure: 'low',
          emotional_arousal: 'low',
          reward_pressure: 'low',
          cuts_per_minute: 2.5,
          recommended_routine: 'Daytime Inquiry & Science Fun',
          parent_advisory: 'High educational value with respectful, measured pacing.'
        }
      }),
      stimulation_score: 10,
      stimulation_label: 'calm',
      safety_rating_tags: 'Educational • Nature Footage • Measured Narration',
    },
  ];
}
