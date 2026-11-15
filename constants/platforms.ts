import { KidsMediaItem } from './kidsDb';

export interface PlatformInfo {
  id: string;
  /** Display name for the handoff CTA, e.g. "Netflix". */
  name: string;
  /** True when the URL points directly at a streaming service. */
  isDirect: boolean;
  /** True when the URL is only a metadata reference (TVMaze, TMDB, IMDb). */
  isMetadata: boolean;
}

export interface StreamingLogoInfo {
  source: any;
  width: number;
  height: number;
  name: string;
}

export const STREAMING_BRAND_LOGOS: Record<string, StreamingLogoInfo> = {
  pbs: {
    source: require('../assets/images/streaming/pbs.png'),
    width: 22,
    height: 22,
    name: 'PBS KIDS',
  },
  disney: {
    source: require('../assets/images/streaming/disney.png'),
    width: 42,
    height: 22,
    name: 'Disney+',
  },
  netflix: {
    source: require('../assets/images/streaming/netflix.png'),
    width: 66,
    height: 18,
    name: 'Netflix',
  },
  apple: {
    source: require('../assets/images/streaming/apple.png'),
    width: 48,
    height: 18,
    name: 'Apple TV+',
  },
  cbeebies: {
    source: require('../assets/images/streaming/cbeebies.png'),
    width: 52,
    height: 20,
    name: 'CBeebies',
  },
  paramount: {
    source: require('../assets/images/streaming/paramount.png'),
    width: 74,
    height: 17,
    name: 'Paramount+',
  },
  prime: {
    source: require('../assets/images/streaming/prime.png'),
    width: 58,
    height: 18,
    name: 'Prime Video',
  },
  youtube: {
    source: require('../assets/images/streaming/youtube.png'),
    width: 76,
    height: 17,
    name: 'YouTube',
  },
  hoopla: {
    source: require('../assets/images/streaming/hoopla.png'),
    width: 44,
    height: 17,
    name: 'Hoopla',
  },
};

export function getStreamingPlatformLogo(item: KidsMediaItem | any): StreamingLogoInfo | null {
  if (!item) return null;
  const text = `${item.creator_publisher || ''} ${item.platform_url || ''} ${item.title || ''}`.toLowerCase();

  if (text.includes('pbs')) return STREAMING_BRAND_LOGOS.pbs;
  if (text.includes('disney')) return STREAMING_BRAND_LOGOS.disney;
  if (text.includes('netflix')) return STREAMING_BRAND_LOGOS.netflix;
  if (text.includes('apple')) return STREAMING_BRAND_LOGOS.apple;
  if (text.includes('cbeebies') || text.includes('bbc') || text.includes('cbbc')) return STREAMING_BRAND_LOGOS.cbeebies;
  if (text.includes('paramount') || text.includes('nickelodeon') || text.includes('nick')) return STREAMING_BRAND_LOGOS.paramount;
  if (text.includes('prime') || text.includes('amazon')) return STREAMING_BRAND_LOGOS.prime;
  if (
    text.includes('youtube') ||
    text.includes('youtu.be') ||
    text.includes('cocomelon') ||
    text.includes('super simple') ||
    text.includes('scishow')
  ) {
    return STREAMING_BRAND_LOGOS.youtube;
  }

  return null;
}

export interface SecondaryStreamingOffer {
  id: string;
  name: string;
  url: string;
  type: string;
  isFree: boolean;
  logo: StreamingLogoInfo | null;
  score?: number;
}

export function getSecondaryStreamingOffers(
  item: KidsMediaItem | any,
  primaryLogoName?: string
): SecondaryStreamingOffer[] {
  if (!item || !item.metadata_json) return [];

  let metadata: any = null;
  try {
    if (typeof item.metadata_json === 'string') {
      metadata = JSON.parse(item.metadata_json);
    } else {
      metadata = item.metadata_json;
    }
  } catch {
    return [];
  }

  const offers = metadata?.streaming_offers;
  if (!Array.isArray(offers) || offers.length === 0) return [];

  const primaryLower = (primaryLogoName || '').toLowerCase();
  const seenBrands = new Set<string>();
  const results: SecondaryStreamingOffer[] = [];

  for (const offer of offers) {
    const rawPlatform = (offer.platform || '').trim();
    const url = (offer.url || '').trim();
    if (!url) continue;

    const platLower = rawPlatform.toLowerCase();

    // 1. Filter out physical disc media
    if (
      platLower.includes('dvd') ||
      platLower.includes('blu-ray') ||
      platLower.includes('barnes')
    ) {
      continue;
    }

    // 2. Filter out primary provider
    if (primaryLower) {
      if (primaryLower.includes('pbs') && platLower.includes('pbs')) continue;
      if (primaryLower.includes('disney') && platLower.includes('disney')) continue;
      if (primaryLower.includes('netflix') && platLower.includes('netflix')) continue;
      if (primaryLower.includes('apple') && platLower.includes('apple')) continue;
      if (primaryLower.includes('prime') && (platLower.includes('prime') || platLower.includes('amazon'))) continue;
      if (primaryLower.includes('paramount') && platLower.includes('paramount')) continue;
      if (primaryLower.includes('youtube') && platLower.includes('youtube')) continue;
    }

    // 3. Detect brand and logo
    let brandKey: string | null = null;
    let displayName = rawPlatform;

    if (platLower.includes('apple')) {
      brandKey = 'apple';
      displayName = 'Apple TV';
    } else if (platLower.includes('prime') || platLower.includes('amazon')) {
      brandKey = 'prime';
      displayName = 'Prime Video';
    } else if (platLower.includes('disney')) {
      brandKey = 'disney';
      displayName = 'Disney+';
    } else if (platLower.includes('netflix')) {
      brandKey = 'netflix';
      displayName = 'Netflix';
    } else if (platLower.includes('youtube')) {
      brandKey = 'youtube';
      displayName = 'YouTube';
    } else if (platLower.includes('paramount')) {
      brandKey = 'paramount';
      displayName = 'Paramount+';
    } else if (platLower.includes('hoopla')) {
      brandKey = 'hoopla';
      displayName = 'Hoopla';
    } else if (platLower.includes('hulu')) {
      brandKey = 'hulu';
      displayName = 'Hulu';
    } else {
      // Clean up common vendor suffixes
      displayName = rawPlatform.replace(/ Amazon Channel/i, '').replace(/ Store/i, '');
    }

    const dedupeKey = brandKey || displayName.toLowerCase();
    if (seenBrands.has(dedupeKey)) continue;
    seenBrands.add(dedupeKey);

    const isFree =
      offer.type === 'FREE' ||
      platLower.includes('free') ||
      platLower.includes('hoopla');

    const hasLogo = Boolean(brandKey && STREAMING_BRAND_LOGOS[brandKey]);
    const score = (isFree ? 100 : 0) + (offer.type === 'FLATRATE' ? 50 : 0) + (hasLogo ? 30 : 0);

    results.push({
      id: dedupeKey,
      name: displayName,
      url,
      type: offer.type || 'STREAM',
      isFree,
      logo: brandKey && STREAMING_BRAND_LOGOS[brandKey] ? STREAMING_BRAND_LOGOS[brandKey] : null,
      score,
    });
  }

  results.sort((a: any, b: any) => b.score - a.score);
  return results.slice(0, 4);
}

const DIRECT_PLATFORMS: Array<{ pattern: RegExp; id: string; name: string }> = [
  { pattern: /netflix\.com/i, id: 'netflix', name: 'Netflix' },
  { pattern: /disneyplus\.com|disney\.com/i, id: 'disney', name: 'Disney+' },
  { pattern: /primevideo\.com|amazon\./i, id: 'prime', name: 'Prime Video' },
  { pattern: /pbskids\.org|pbs\.org/i, id: 'pbs', name: 'PBS KIDS' },
  { pattern: /youtube\.com|youtu\.be/i, id: 'youtube', name: 'YouTube' },
  { pattern: /tv\.apple\.com|apple\.com/i, id: 'apple', name: 'Apple TV+' },
  { pattern: /paramountplus\.com/i, id: 'paramount', name: 'Paramount+' },
  { pattern: /nickjr\.com|nick\.com/i, id: 'nick', name: 'Nick Jr.' },
  { pattern: /bbc\.co\.uk|cbeebies/i, id: 'bbc', name: 'CBeebies' },
  { pattern: /spotify\.com/i, id: 'spotify', name: 'Spotify' },
  { pattern: /soundcloud\.com/i, id: 'soundcloud', name: 'SoundCloud' },
  { pattern: /hoopladigital\.com/i, id: 'hoopla', name: 'Hoopla' },
  { pattern: /hulu\.com/i, id: 'hulu', name: 'Hulu' },
  { pattern: /therokuchannel\.com|roku\.com/i, id: 'roku', name: 'The Roku Channel' },
];

const METADATA_PATTERNS = [/tvmaze\.com/i, /themoviedb\.org/i, /imdb\.com/i];

/**
 * Works out where a title lives from its platform URL, so the detail page can
 * say "Watch on Netflix" instead of a generic play button. Falls back to the
 * publisher name when the link is only a metadata page.
 */
export function getPlatformInfo(item: KidsMediaItem): PlatformInfo {
  const url = item.platform_url || '';

  for (const platform of DIRECT_PLATFORMS) {
    if (platform.pattern.test(url)) {
      return {
        id: platform.id,
        name: platform.name,
        isDirect: true,
        isMetadata: false,
      };
    }
  }

  const publisher = (item.creator_publisher || '').trim();

  for (const pattern of METADATA_PATTERNS) {
    if (pattern.test(url)) {
      return {
        id: 'metadata',
        name: publisher || 'the web',
        isDirect: false,
        isMetadata: true,
      };
    }
  }

  return {
    id: 'external',
    name: publisher || 'external link',
    isDirect: false,
    isMetadata: false,
  };
}
