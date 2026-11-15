import type { Resource, ReviewedResource } from './types';
import publishedContent from './published-content.json';

type PublishedItem = {
  contentId: string;
  sourceIndex: number;
  kind: string;
  title: string;
  age: string;
  description: string;
  platform: string;
  linkUrl: string;
  imageUrl: string;
  classification: 'low' | 'high';
  publicBucket: 'discovery' | 'bad';
  reviewMethod?: 'metadata_only' | 'playback';
  reviewScope?: 'listing' | 'sampled' | 'full' | null;
  parentNote: string;
  shortReason: string;
  evidence: { url: string; note?: string; supports?: string }[];
  episodesReviewed: { title: string; url: string; basis?: string }[];
  confidence: 'high' | 'medium' | 'low';
  signals: Record<string, 'low' | 'medium' | 'high' | 'unknown'>;
  reviewerNotes?: string;
};

const searchLink = (title: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' kids show')}`;

const reviewedItems = ((publishedContent as unknown as { items?: PublishedItem[] }).items || []) as PublishedItem[];

export const REVIEWED_RESOURCES: ReviewedResource[] = reviewedItems
  .map((item, index) => ({
    id: item.contentId,
    type: item.kind === 'video' ? 'video' as const : 'show' as const,
    contentId: item.contentId,
    sourceIndex: item.sourceIndex,
    title: item.title,
    age: item.age,
    description: item.description,
    platform: item.platform,
    stimulation_level: item.classification,
    profiles: ['low-stim'],
    featured: item.publicBucket === 'discovery' && index < 6,
    linkUrl: item.linkUrl || searchLink(item.title),
    imageUrl: item.imageUrl || '',
    classification: item.classification,
    publicBucket: item.publicBucket,
    metadataOnly: item.kind === 'video' && item.reviewMethod !== 'playback',
    reviewScope: item.reviewScope,
    parentNote: item.parentNote,
    shortReason: item.shortReason,
    evidence: item.evidence.map((evidence) => ({
      url: evidence.url,
      note: evidence.note || evidence.supports || 'Review source'
    })),
    episodesReviewed: item.episodesReviewed,
    confidence: item.confidence,
    signals: item.signals,
    reviewerNotes: item.reviewerNotes || ''
  }));

export const DISCOVERY_RESOURCES = REVIEWED_RESOURCES.filter((item) => item.publicBucket === 'discovery');
export const BAD_RESOURCES = REVIEWED_RESOURCES.filter((item) => item.publicBucket === 'bad');

// Kept as the public discovery alias for existing screens and saved-list code.
export const CURATED_RESOURCES: Resource[] = DISCOVERY_RESOURCES;
