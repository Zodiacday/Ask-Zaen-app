// Client-safe TVmaze API metadata & thumbnail enrichment service

export interface TVmazeCastMember {
  personName: string;
  characterName: string;
  image?: string;
  isVoice: boolean;
}

export interface TVmazeEpisode {
  id: number;
  name: string;
  season: number;
  number: number;
  runtime?: number;
  image?: string;
  summary?: string;
}

export interface TVmazeEnrichment {
  tvmazeId: number;
  name: string;
  posterOriginal?: string;
  posterMedium?: string;
  network?: string;
  premiered?: string;
  status?: string;
  runtime?: number;
  averageRuntime?: number;
  genres: string[];
  rating?: number;
  officialSite?: string;
  summary?: string;
  cast: TVmazeCastMember[];
  episodes: TVmazeEpisode[];
}

const memoryCache = new Map<string, TVmazeEnrichment | null>();

/**
 * Cleans titles for higher search precision on TVmaze
 * e.g. "Bluey (Season 1)" -> "Bluey", "Sarah & Duck (UK)" -> "Sarah & Duck"
 */
export function cleanSearchTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*-\s*Season\s*\d+/gi, '')
    .replace(/\s*:\s*Season\s*\d+/gi, '')
    .replace(/\s*Season\s*\d+/gi, '')
    .trim();
}

/**
 * Fetches studio metadata, high-resolution thumbnails, cast, and episode runtimes from TVmaze.
 * Returns null if not found or on network failure.
 */
export async function fetchTVmazeEnrichment(rawTitle: string): Promise<TVmazeEnrichment | null> {
  const cleanTitle = cleanSearchTitle(rawTitle);
  if (!cleanTitle) return null;

  const cacheKey = `tvmaze-${cleanTitle.toLowerCase()}`;

  // 1. Check in-memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey) ?? null;
  }

  // 2. Check sessionStorage if in browser
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as TVmazeEnrichment;
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {}
  }

  try {
    const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanTitle)}&embed[]=cast&embed[]=episodes`;
    const res = await fetch(url);
    if (!res.ok) {
      memoryCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (!data || !data.name) {
      memoryCache.set(cacheKey, null);
      return null;
    }

    const castRaw = data._embedded?.cast || [];
    const cast: TVmazeCastMember[] = castRaw.slice(0, 8).map((c: any) => ({
      personName: c.person?.name || 'Actor',
      characterName: c.character?.name || 'Character',
      image: c.character?.image?.medium || c.person?.image?.medium,
      isVoice: Boolean(c.voice)
    }));

    const episodesRaw = data._embedded?.episodes || [];
    const episodes: TVmazeEpisode[] = episodesRaw.slice(0, 12).map((ep: any) => ({
      id: ep.id,
      name: ep.name,
      season: ep.season,
      number: ep.number,
      runtime: ep.runtime || data.averageRuntime || data.runtime,
      image: ep.image?.medium || ep.image?.original,
      summary: ep.summary ? ep.summary.replace(/<[^>]+>/g, '') : undefined
    }));

    const enrichment: TVmazeEnrichment = {
      tvmazeId: data.id,
      name: data.name,
      posterOriginal: data.image?.original,
      posterMedium: data.image?.medium,
      network: data.network?.name || data.webChannel?.name,
      premiered: data.premiered ? data.premiered.slice(0, 4) : undefined,
      status: data.status,
      runtime: data.runtime,
      averageRuntime: data.averageRuntime || data.runtime || (episodes[0]?.runtime ?? 7),
      genres: Array.isArray(data.genres) ? data.genres : [],
      rating: data.rating?.average,
      officialSite: data.officialSite,
      summary: data.summary ? data.summary.replace(/<[^>]+>/g, '') : undefined,
      cast,
      episodes
    };

    // Cache result
    memoryCache.set(cacheKey, enrichment);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(enrichment));
      } catch {}
    }

    return enrichment;
  } catch (err) {
    console.debug('TVmaze enrichment fetch error for:', cleanTitle, err);
    memoryCache.set(cacheKey, null);
    return null;
  }
}
