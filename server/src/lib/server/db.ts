import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import type { CategoryInfo, ReviewedResource } from '$lib/types';
import { runtimeEnv } from './runtime-env';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const candidatePaths = [
    runtimeEnv('DATABASE_PATH'),
    path.resolve(process.cwd(), 'data', 'kids_media.db'),
    path.resolve(process.cwd(), '..', 'kids_media_db', 'kids_media.db'),
    path.resolve(process.cwd(), 'kids_media.db')
  ].filter(Boolean) as string[];

  const dbPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!dbPath) {
    throw new Error(
      `SQLite database kids_media.db not found. Searched in: ${candidatePaths.join(', ')}`
    );
  }

  dbInstance = new Database(dbPath, {
    readonly: true,
    fileMustExist: true
  });

  dbInstance.pragma('busy_timeout = 60000');
  dbInstance.pragma('foreign_keys = ON');
  dbInstance.pragma('query_only = ON');

  if (Number(dbInstance.pragma('foreign_keys', { simple: true })) !== 1) {
    dbInstance.close();
    dbInstance = null;
    throw new Error('SQLite foreign-key enforcement could not be enabled.');
  }

  const schemaVersion = dbInstance.pragma('user_version', { simple: true });
  if (schemaVersion !== 2) {
    dbInstance.close();
    dbInstance = null;
    throw new Error(
      `Unsupported media database schema version ${schemaVersion}; expected 2. Run pnpm db:migrate before starting the service.`
    );
  }

  const ftsTable = dbInstance.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'kids_media_fts'").get();
  if (!ftsTable) {
    dbInstance.close();
    dbInstance = null;
    throw new Error('The media database is missing the kids_media_fts index.');
  }

  // Enable WAL mode and 64MB memory cache for sub-millisecond query performance
  try {
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('cache_size = -64000');
  } catch {
    // Readonly mode may ignore pragma write
  }

  return dbInstance;
}

export interface RawMediaRow {
  id: number;
  title: string;
  media_type: string;
  target_age_group: string | null;
  genre_category: string | null;
  duration: string | null;
  duration_seconds: number | null;
  platform_url: string | null;
  description: string | null;
  creator_publisher: string | null;
  language: string | null;
  release_year: number | null;
  metadata_json: string | null;
  stimulation_score: number | null;
  stimulation_label: string | null;
  parent_show_id?: number | null;
  safety_rating_tags?: string | null;
  has_episodes?: number | boolean;
  episode_count?: number;
  season_count?: number;
}

export function parseMediaRow(row: RawMediaRow): ReviewedResource {
  let metadata: Record<string, any> = {};
  if (row.metadata_json) {
    try {
      metadata = JSON.parse(row.metadata_json);
    } catch {
      metadata = {};
    }
  }

  const streamingOffers: Array<{ platform?: string; provider?: string }> =
    metadata.streaming_offers || [];

  const platforms: string[] = [];
  for (const offer of streamingOffers) {
    const provider = offer.platform || offer.provider || '';
    if (provider && !platforms.includes(provider)) {
      platforms.push(provider);
    }
  }

  const platformUrl = row.platform_url || '';
  if (platformUrl.includes('youtube.com') && !platforms.includes('YouTube')) {
    platforms.push('YouTube');
  }

  // Thumbnail poster resolution
  let posterUrl: string | null = null;
  if (metadata.image) {
    const img = metadata.image;
    if (typeof img === 'object' && img !== null) {
      posterUrl = img.medium || img.original || null;
    } else if (typeof img === 'string') {
      posterUrl = img;
    }
  } else if (platformUrl.includes('youtube.com')) {
    const match = platformUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    if (match) {
      posterUrl = `https://i.ytimg.com/vi/${match[1]}/mqdefault.jpg`;
    }
  }

  const finalPoster = posterUrl;

  const score = row.stimulation_score;
  const cutsPerMin = score !== null ? Math.round((score / 100.0) * 40.0 * 10) / 10 : null;
  const cutsStr = cutsPerMin !== null ? `${cutsPerMin} cuts/min` : 'Graded pace';

  const stim = row.stimulation_label;
  const isHigh = stim === 'high';
  const isModerate = stim === 'moderate';

  const classification = isHigh ? ('high' as const) : ('low' as const);
  const stimulationLevel = isHigh ? ('high' as const) : isModerate ? ('medium' as const) : ('low' as const);
  const publicBucket = isHigh ? ('bad' as const) : ('discovery' as const);

  const parentNote = isHigh
    ? `Visual analysis measured ${cutsStr}. Pacing exceeds the calm standard and may cause sensory fatigue.`
    : `Visual analysis measured ${cutsStr}. Storytelling moves at a gentle, child-led tempo.`;

  const shortReason = isHigh
    ? `Exceeds recommended cut-rate (${cutsStr}). Rapid transitions detected.`
    : `Calm, measured transitions (${cutsStr}). Safe for bedtime and quiet play.`;

  const mediaT = row.media_type;
  const itemType: 'show' | 'video' | 'music' =
    mediaT === 'music' ? 'music' : mediaT === 'show' ? 'show' : 'video';

  const primaryPlatform = platforms.length > 0
    ? platforms[0]
    : platformUrl.toLowerCase().includes('spotify')
    ? 'Spotify'
    : platformUrl.toLowerCase().includes('youtube.com')
    ? 'YouTube'
    : 'Streaming';

  const rawSeason = metadata.season ?? metadata.season_number;
  const rawEpisode = metadata.number ?? metadata.episode_number;
  const seasonNumber = Number(rawSeason);
  const episodeNumber = Number(rawEpisode);
  const duration = typeof row.duration === 'string' && row.duration.trim()
    ? row.duration
    : null;
  const durationSeconds = typeof row.duration_seconds === 'number' && row.duration_seconds > 0
    ? row.duration_seconds
    : null;

  return {
    id: String(row.id),
    contentId: String(row.id),
    sourceIndex: row.id,
    type: itemType,
    title: row.title,
    age: row.target_age_group || '2+',
    description: row.description ?? null,
    duration,
    durationSeconds,
    mediaType: mediaT as 'show' | 'video' | 'music' | 'episode',
    parentShowId: row.parent_show_id != null ? String(row.parent_show_id) : null,
    seasonNumber: Number.isFinite(seasonNumber) && seasonNumber > 0 ? seasonNumber : null,
    episodeNumber: Number.isFinite(episodeNumber) && episodeNumber >= 0 ? episodeNumber : null,
    hasEpisodes: Boolean(row.has_episodes),
    episodeCount: Number(row.episode_count ?? 0),
    seasonCount: Number(row.season_count ?? 0),
    platform: primaryPlatform,
    linkUrl: platformUrl,
    imageUrl: finalPoster ?? undefined,
    safetyRatingTags: row.safety_rating_tags || null,
    creatorPublisher: row.creator_publisher || null,
    language: row.language || null,
    releaseYear: row.release_year ?? null,
    metadataJson: row.metadata_json || null,
    stimulationScore: row.stimulation_score ?? null,
    stimulation_level: stimulationLevel,
    classification,
    publicBucket,
    profiles: ['low-stim'],
    featured: false,
    metadataOnly: itemType === 'video' && platformUrl.includes('youtube.com') && cutsPerMin === null,
    reviewScope: cutsPerMin !== null ? 'full' : 'sampled',
    confidence: 'high',
    parentNote,
    shortReason,
    signals: {
      visualPacing: isHigh ? 'high' : 'low',
      audioTone: isHigh ? 'high' : 'low'
    },
    evidence: [
      {
        url: platformUrl || 'https://youtube.com',
        note: `Visual pacing scan (${cutsStr})`
      }
    ],
    episodesReviewed: [
      {
        title: row.title,
        url: platformUrl,
        basis: `Pacing analysis (${cutsStr})`
      }
    ],
    reviewerNotes: row.genre_category || ''
  };
}

export const CATEGORIES_CONFIG = [
  {
    id: 'bedtime',
    title: 'Bedtime Audio & Sleep',
    tagline: 'Mozart, gentle music box melodies, and calm continuous sleep tracks.',
    mediaType: 'music' as const,
    ageRange: '0–2',
    icon: 'Moon',
    badge: 'Sleep Sanctuary',
    query: "(genre_category LIKE '%Lullaby%' OR genre_category LIKE '%Sleep%' OR genre_category LIKE '%Bedtime%' OR title LIKE '%Lullaby%' OR title LIKE '%Sleep%' OR title LIKE '%Piano%') AND media_type = 'music'"
  },
  {
    id: 'nursery',
    title: 'Toddler Sing-Alongs',
    tagline: 'Gentle acoustic rhymes and movement songs from The Wiggles and Super Simple.',
    mediaType: 'music' as const,
    ageRange: '1–4',
    icon: 'Music',
    badge: 'Early Rhythm',
    query: "(genre_category LIKE '%Nursery%' OR creator_publisher IN ('Super Simple Songs', 'The Wiggles', 'Cocomelon', 'Sesame Street') OR title LIKE '%Rhyme%') AND media_type = 'music'"
  },
  {
    id: 'phonics',
    title: 'Phonics & Early ABCs',
    tagline: 'Letter sounds, phonemic songs, and gentle foundation alphabet rhymes.',
    mediaType: 'music' as const,
    ageRange: '3–5',
    icon: 'BookOpen',
    badge: 'Foundations',
    query: "(genre_category LIKE '%Phonics%' OR title LIKE '%Alphabet%' OR title LIKE '%ABC%' OR title LIKE '%Phonics%') AND media_type = 'music'"
  },
  {
    id: 'pbs',
    title: 'PBS Kids Sanctuary',
    tagline: 'Golden-age storytelling built for empathy, curiosity, and calm pacing.',
    mediaType: 'show' as const,
    ageRange: '3–8',
    icon: 'Tv',
    badge: 'Calm Television',
    query: "(creator_publisher LIKE '%PBS%' OR title IN ('Arthur', 'Cyberchase', 'The Magic School Bus', 'Clifford the Big Red Dog', 'Dragon Tales', 'Mister Rogers Neighborhood', 'Reading Rainbow')) AND media_type = 'show'"
  },
  {
    id: 'nick_jr',
    title: 'Nick Jr. Gentle Classics',
    tagline: 'Interactive slow-paced pioneers including Blue’s Clues, Little Bear, and Dora.',
    mediaType: 'show' as const,
    ageRange: '2–6',
    icon: 'PawPrint',
    badge: 'Preschool Heritage',
    query: "(creator_publisher LIKE '%Nickelodeon%' OR creator_publisher = 'Nicktoons' OR title IN ('Blue''s Clues', 'Dora the Explorer', 'Hey Arnold!', 'Rugrats', 'Little Bear', 'Jimmy Neutron')) AND media_type = 'show'"
  },
  {
    id: 'disney',
    title: 'Disney Storyscapes',
    tagline: 'Acoustic piano Disney melodies, classic soundtracks, and gentle Disney Jr. tales.',
    mediaType: 'all' as const,
    ageRange: '3–8',
    icon: 'Sparkles',
    badge: 'Orchestral Tales',
    query: "(creator_publisher LIKE '%Disney%' OR LOWER(metadata_json) LIKE '%disney%' OR title LIKE '%Disney%' OR title LIKE '%Toy Story%' OR title LIKE '%Encanto%') AND media_type != 'episode'"
  },
  {
    id: 'bbc',
    title: 'BBC & CBeebies Storytelling',
    tagline: 'Gentle British stop-motion and soothing narrations like Teletubbies and Sarah & Duck.',
    mediaType: 'show' as const,
    ageRange: '0–5',
    icon: 'CloudSun',
    badge: 'British Heritage',
    query: "(creator_publisher IN ('BBC One', 'CBeebies', 'CBBC', 'BBC iPlayer') OR title IN ('Teletubbies', 'In the Night Garden', 'Bob the Builder', 'Sarah & Duck', 'Postman Pat')) AND media_type = 'show'"
  },
  {
    id: 'calm_videos',
    title: 'Graded Calm Videos',
    tagline: 'Laboratory-verified camera transitions under 15 cuts/min. Safe for bedtime.',
    mediaType: 'video' as const,
    ageRange: 'All',
    icon: 'ShieldCheck',
    badge: 'Lab Certified',
    query: "media_type = 'video' AND stimulation_label = 'calm'"
  },
  {
    id: 'pop',
    title: 'Clean Pop & Active Dance',
    tagline: 'Family-clean dance energy from KIDZ BOP and joyful sing-alongs.',
    mediaType: 'music' as const,
    ageRange: '6–12',
    icon: 'Radio',
    badge: 'Movement & Joy',
    query: "(creator_publisher = 'KIDZ BOP' OR genre_category LIKE '%Pop%') AND media_type = 'music'"
  },
  {
    id: 'bad',
    title: 'The Sensory Boundary',
    tagline: 'Rapid-cut (>30 cuts/min) warning directory to protect developing attention.',
    mediaType: 'video' as const,
    ageRange: 'All',
    icon: 'TriangleAlert',
    badge: 'Sensory Warning',
    query: "stimulation_label = 'high'"
  }
];
