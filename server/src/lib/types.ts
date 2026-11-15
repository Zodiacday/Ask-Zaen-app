export interface BaseResource {
  id: string;
  type: 'show' | 'video' | 'music' | 'toy';
  title: string;
  age: string;
  description: string | null;
  duration?: string | null;
  durationSeconds?: number | null;
  mediaType?: 'show' | 'video' | 'music' | 'episode';
  parentShowId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  hasEpisodes?: boolean;
  episodeCount?: number;
  seasonCount?: number;
  safetyRatingTags?: string | null;
  creatorPublisher?: string | null;
  language?: string | null;
  releaseYear?: number | null;
  metadataJson?: string | null;
  stimulationScore?: number | null;
  platform: string;
  stimulation_level: 'low' | 'medium' | 'high';
  profiles: string[];
  featured: boolean;
  linkUrl: string;
  imageUrl?: string;
}

export interface ShowResource extends BaseResource {
  type: 'show';
  tvmaze_id?: number | null;
  network?: string | null;
  premiered?: string | null;
  ended?: string | null;
  status?: string | null;
  runtime?: number | null;
  genres?: string[];
  rating?: number | null;
  officialSite?: string | null;
  cast?: { name: string; character: string; image: string | null }[];
}

export type ReviewSignal = 'low' | 'medium' | 'high' | 'unknown';

export interface ReviewEvidence {
  url: string;
  note?: string;
  supports?: string;
}

export interface ReviewedEpisode {
  title: string;
  url: string;
  basis?: string;
}

export interface ReviewedResource extends BaseResource {
  contentId: string;
  sourceIndex: number;
  metadataOnly: boolean;
  reviewScope?: 'listing' | 'sampled' | 'full' | null;
  classification: 'low' | 'high';
  publicBucket: 'discovery' | 'bad';
  parentNote: string;
  shortReason: string;
  signals: Record<string, ReviewSignal>;
  evidence: ReviewEvidence[];
  episodesReviewed: ReviewedEpisode[];
  confidence: 'high' | 'medium' | 'low';
  reviewerNotes: string;
  episodes?: ReviewedResource[];
}

export type ReviewedShowResource = ReviewedResource;
export type Resource = ReviewedResource;

export interface CategoryInfo {
  id: string;
  title: string;
  tagline: string;
  mediaType: 'music' | 'show' | 'video' | 'all';
  ageRange: string;
  icon: string;
  badge: string;
  count: number;
  sampleTitles: string[];
}
