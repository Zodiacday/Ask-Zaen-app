import type Database from 'better-sqlite3';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { apiError } from './api';
import { CATEGORIES_CONFIG, getDb, type RawMediaRow } from './db';
import { runtimeEnv } from './runtime-env';

export type PublicMediaType = 'show' | 'video' | 'music';

export type SensoryProfile = {
  visualPace: string | null;
  soundIntensity: string | null;
  narrativePressure: string | null;
  emotionalArousal: string | null;
  rewardPressure: string | null;
  cutsPerMinute: number | null;
  recommendedRoutine: string | null;
  parentAdvisory: string | null;
};

export type PlatformOffer = { platform: string; url: string };

export type MediaItemDto = {
  id: number;
  title: string;
  mediaType: PublicMediaType;
  ageGroup: string | null;
  genre: string | null;
  description: string | null;
  duration: string | null;
  durationSeconds: number | null;
  platformUrl: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  creatorPublisher: string | null;
  language: string | null;
  releaseYear: number | null;
  stimulationScore: number | null;
  stimulationLabel: 'calm' | 'moderate' | null;
  safetyTags: string[];
  platformOffers: PlatformOffer[];
  sensoryProfile: SensoryProfile | null;
  parentShowId: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  hasEpisodes: boolean;
  episodeCount: number;
  seasonCount: number;
};

export type QueryRow = RawMediaRow & {
  relevance?: number;
  sort_score?: number;
  rotation_band?: number;
  rotation_key?: number;
  poster_url?: string | null;
  backdrop_url?: string | null;
};

type Metadata = Record<string, any>;

const DEFAULT_SORT_KEY = 2_147_483_647;
const CURSOR_VERSION = 2;
const SEARCH_WEIGHTS = '10.0, 1.0, 3.0, 4.0, 2.0';
const ROTATION_MODULUS = 2_147_483_647;

function parseMetadata(value: string | null | undefined): Metadata {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function positiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeDuration(value: unknown): string | null {
  const duration = nonEmptyString(value);
  if (!duration || /^n\/a$/i.test(duration) || /^0{1,2}:0{2}(?::0{2})?$/.test(duration)) {
    return null;
  }
  return duration;
}

function mediaType(value: string): PublicMediaType {
  return value === 'show' ? 'show' : value === 'music' ? 'music' : 'video';
}

function parseImage(value: unknown): { posterUrl: string | null; backdropUrl: string | null } {
  if (typeof value === 'string') return { posterUrl: value, backdropUrl: null };
  if (!value || typeof value !== 'object') return { posterUrl: null, backdropUrl: null };
  const image = value as Record<string, unknown>;
  const posterUrl = nonEmptyString(image.medium) ?? nonEmptyString(image.original);
  const backdropUrl = nonEmptyString(image.original) ?? nonEmptyString(image.medium);
  return { posterUrl, backdropUrl };
}

function parseOffers(meta: Metadata): PlatformOffer[] {
  const offers = Array.isArray(meta.streaming_offers) ? meta.streaming_offers : [];
  return offers.flatMap((offer: unknown) => {
    if (!offer || typeof offer !== 'object') return [];
    const row = offer as Record<string, unknown>;
    const platform = nonEmptyString(row.platform) ?? nonEmptyString(row.provider);
    const url = nonEmptyString(row.url);
    return platform && url ? [{ platform, url }] : [];
  });
}

function parseSensoryProfile(meta: Metadata): SensoryProfile | null {
  const raw = meta.sensory_profile;
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  return {
    visualPace: nonEmptyString(value.visual_pace),
    soundIntensity: nonEmptyString(value.sound_intensity),
    narrativePressure: nonEmptyString(value.narrative_pressure),
    emotionalArousal: nonEmptyString(value.emotional_arousal),
    rewardPressure: nonEmptyString(value.reward_pressure),
    cutsPerMinute: typeof value.cuts_per_minute === 'number' && Number.isFinite(value.cuts_per_minute)
      ? value.cuts_per_minute
      : null,
    recommendedRoutine: nonEmptyString(value.recommended_routine),
    parentAdvisory: nonEmptyString(value.parent_advisory),
  };
}

function parseTags(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(',').map((tag) => tag.trim()).filter(Boolean);
}

function episodeNumberFromMetadata(meta: Metadata, key: 'season' | 'number' | 'season_number' | 'episode_number') {
  const candidate = Number(meta[key]);
  return Number.isFinite(candidate) && candidate >= 0 ? candidate : null;
}

export function toPublicMedia(row: QueryRow): MediaItemDto {
  const meta = parseMetadata(row.metadata_json);
  const image = parseImage(meta.image);
  const explicitPoster = nonEmptyString(row.poster_url);
  const explicitBackdrop = nonEmptyString(row.backdrop_url);
  const platformUrl = nonEmptyString(row.platform_url);
  const youtubeId = platformUrl?.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&/]|$)/)?.[1];
  const label = row.stimulation_label === 'calm' || row.stimulation_label === 'moderate'
    ? row.stimulation_label
    : null;
  const mediaTypeValue = mediaType(row.media_type);
  const season = episodeNumberFromMetadata(meta, 'season') ?? episodeNumberFromMetadata(meta, 'season_number');
  const episode = episodeNumberFromMetadata(meta, 'number') ?? episodeNumberFromMetadata(meta, 'episode_number');
  const duration = normalizeDuration(row.duration);
  const durationSeconds = positiveNumber(row.duration_seconds);

  return {
    id: row.id,
    title: row.title,
    mediaType: mediaTypeValue,
    ageGroup: nonEmptyString(row.target_age_group),
    genre: nonEmptyString(row.genre_category),
    description: nonEmptyString(row.description),
    duration,
    durationSeconds,
    platformUrl,
    posterUrl: explicitPoster ?? image.posterUrl ?? (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg` : null),
    backdropUrl: explicitBackdrop ?? image.backdropUrl,
    creatorPublisher: nonEmptyString(row.creator_publisher),
    language: nonEmptyString(row.language),
    releaseYear: typeof row.release_year === 'number' && Number.isInteger(row.release_year) ? row.release_year : null,
    stimulationScore: typeof row.stimulation_score === 'number' && Number.isFinite(row.stimulation_score)
      ? row.stimulation_score
      : null,
    stimulationLabel: label,
    safetyTags: parseTags(row.safety_rating_tags),
    platformOffers: parseOffers(meta),
    sensoryProfile: parseSensoryProfile(meta),
    parentShowId: row.parent_show_id == null ? null : Number(row.parent_show_id),
    seasonNumber: season,
    episodeNumber: episode,
    hasEpisodes: Boolean(row.has_episodes),
    episodeCount: Number(row.episode_count ?? 0),
    seasonCount: Number(row.season_count ?? 0),
  };
}

export type MediaFilters = {
  stimulation: string;
  category: string | null;
  gate: string;
  mediaType: string;
  age: string;
  language: string | null;
  platforms: string[];
  audioOnly: boolean;
  query: string | null;
  ftsQuery: string | null;
  sort: string;
  rotationDate: string | null;
  rotationSeed: string | null;
  rotationSurface: 'discover' | 'category' | 'language' | null;
};

export type CursorPayload = {
  v: number;
  fingerprint: string;
  mode: 'relevance' | 'score' | 'score_desc' | 'newest' | 'recommended';
  key: number;
  tie?: number;
  id: number;
};

function cursorSecret(): string {
  return runtimeEnv('CURSOR_SECRET') || runtimeEnv('CLERK_SECRET_KEY') || 'askzaen-development-cursor-secret';
}

function sign(value: string): string {
  return createHmac('sha256', cursorSecret()).update(value).digest('base64url');
}

export function encodeCursor(payload: CursorPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

export function decodeCursor(value: string): CursorPayload {
  try {
    const [body, signature] = value.split('.');
    if (!body || !signature || signature.length !== 43) throw new Error('Malformed cursor');
    const expected = sign(body);
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Bad cursor signature');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as CursorPayload;
    if (
      payload?.v !== CURSOR_VERSION ||
      typeof payload.fingerprint !== 'string' ||
      !['relevance', 'score', 'score_desc', 'newest', 'recommended'].includes(payload.mode) ||
      !Number.isFinite(payload.key) ||
      !Number.isInteger(payload.id) ||
      (payload.mode === 'recommended' && !Number.isFinite(payload.tie))
    ) throw new Error('Invalid cursor payload');
    return payload;
  } catch {
    throw apiError('INVALID_CURSOR', 'The pagination cursor is invalid.', 400);
  }
}

export function buildFtsQuery(value: string | null): string | null {
  if (!value) return null;
  const tokens = value.normalize('NFKC').match(/[\p{L}\p{N}]+/gu) ?? [];
  const safe = tokens.map((token) => `"${token.replaceAll('"', '""')}"*`).filter(Boolean);
  return safe.length ? safe.join(' AND ') : null;
}

function hashRotationSalt(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  const normalized = hash >>> 0;
  return (normalized % (ROTATION_MODULUS - 1)) + 1;
}

function isValidRotationDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function rotationExpressions(filters: MediaFilters): { band: string; key: string } | null {
  if (
    filters.sort !== 'recommended' ||
    filters.ftsQuery ||
    !filters.rotationDate ||
    !filters.rotationSeed ||
    !filters.rotationSurface
  ) {
    return null;
  }

  const salt = hashRotationSalt(
    `${filters.rotationDate}|${filters.rotationSeed}|${filters.rotationSurface}`
  );
  const offset = hashRotationSalt(`${filters.rotationSeed}|${filters.rotationSurface}`);
  const key = `(((m.id * ${salt}) + ${offset}) % ${ROTATION_MODULUS} + ${ROTATION_MODULUS}) % ${ROTATION_MODULUS}`;
  const band = 'CAST(COALESCE(m.stimulation_score, 1000) / 8 AS INTEGER)';
  return { band, key };
}

function addGateFilter(where: string[], gate: string): void {
  const filters: Record<string, string> = {
    morning: "(LOWER(m.title) LIKE '%daniel tiger%' OR LOWER(m.title) LIKE '%trash truck%' OR LOWER(m.title) LIKE '%bluey%' OR LOWER(m.title) LIKE '%puffin rock%' OR LOWER(m.title) LIKE '%alma%')",
    learning: "(LOWER(m.genre_category) LIKE '%educational%' OR LOWER(m.genre_category) LIKE '%science%' OR LOWER(m.genre_category) LIKE '%phonics%' OR LOWER(m.genre_category) LIKE '%math%' OR LOWER(m.genre_category) LIKE '%discovery%' OR LOWER(m.genre_category) LIKE '%stem%' OR LOWER(m.genre_category) LIKE '%art%' OR LOWER(m.title) LIKE '%learn%' OR LOWER(m.title) LIKE '%explained%' OR LOWER(m.title) LIKE '%curious%') AND LOWER(COALESCE(m.genre_category, '')) NOT LIKE '%nursery%' AND LOWER(COALESCE(m.genre_category, '')) NOT LIKE '%lullaby%' AND LOWER(COALESCE(m.genre_category, '')) NOT LIKE '%bedtime%' AND LOWER(COALESCE(m.title, '')) NOT LIKE '%lullaby%' AND LOWER(COALESCE(m.title, '')) NOT LIKE '%nursery%' AND LOWER(COALESCE(m.title, '')) NOT LIKE '%bedtime%' AND LOWER(COALESCE(m.title, '')) NOT LIKE '%sleep%'",
    feelings: "(LOWER(m.genre_category) LIKE '%feelings%' OR LOWER(m.genre_category) LIKE '%social%' OR LOWER(m.genre_category) LIKE '%emotional%' OR LOWER(m.title) LIKE '%kindness%' OR LOWER(m.title) LIKE '%friend%')",
    bedtime: "(LOWER(m.genre_category) LIKE '%lullaby%' OR LOWER(m.genre_category) LIKE '%bedtime%' OR LOWER(m.title) LIKE '%lullaby%' OR LOWER(m.title) LIKE '%sleep%' OR LOWER(m.title) LIKE '%calm%')",
    shows: "m.media_type = 'show'",
    tunes: "(m.media_type = 'music' OR LOWER(m.genre_category) LIKE '%song%' OR LOWER(m.genre_category) LIKE '%music%' OR LOWER(m.title) LIKE '%lullab%' OR LOWER(m.title) LIKE '%rhyme%' OR LOWER(m.title) LIKE '%melody%')",
  };
  if (filters[gate]) where.push(filters[gate]);
}

function addAgeFilter(where: string[], params: unknown[], age: string): void {
  if (age === 'all') return;
  if (age === '2' || age === '0-3') where.push("(m.target_age_group = '0-2' OR m.target_age_group = '3-5')");
  else if (age === '4' || age === '4-6') where.push("(m.target_age_group = '3-5' OR m.target_age_group = '6-8')");
  else if (age === '6') where.push("m.target_age_group = '6-8'");
  else if (age === '8' || age === '7+') where.push("(m.target_age_group = '6-8' OR m.target_age_group = '9-12')");
  else { where.push('m.target_age_group = ?'); params.push(age); }
}

function categoryFilter(category: string | null): string | null {
  if (!category) return null;
  if (category === 'bad') return '0';
  const match = CATEGORIES_CONFIG.find((candidate) => candidate.id === category);
  return match ? `(${match.query})` : null;
}

export function parseFilters(url: URL): MediaFilters {
  const stimulation = url.searchParams.get('stimulation') || 'calm';
  const mediaType = url.searchParams.get('mediaType') || 'all';
  const category = url.searchParams.get('category');
  const gate = url.searchParams.get('gate') || 'all';
  const age = url.searchParams.get('age') || 'all';
  const language = nonEmptyString(url.searchParams.get('language'));
  const platforms = (url.searchParams.get('platforms') || '')
    .split(',').map((value) => value.trim().toLowerCase()).filter((value) => value && value !== 'all');
  const audioOnly = url.searchParams.get('audioOnly') === 'true' || gate === 'audio_only';
  const query = nonEmptyString(url.searchParams.get('query'));
  const rotationDate = nonEmptyString(url.searchParams.get('rotationDate'));
  const rotationSeed = nonEmptyString(url.searchParams.get('rotationSeed'));
  const rotationSurfaceValue = nonEmptyString(url.searchParams.get('rotationSurface'));
  const rotationSurface =
    rotationSurfaceValue === 'discover' ||
    rotationSurfaceValue === 'category' ||
    rotationSurfaceValue === 'language'
      ? rotationSurfaceValue
      : null;
  const sort = url.searchParams.get('sort') || 'calm_first';

  if (!['all', 'show', 'video', 'music'].includes(mediaType)) throw apiError('INVALID_FILTER', 'The mediaType filter is invalid.', 400);
  if (!['all', 'calm', 'low', 'moderate', 'medium'].includes(stimulation)) throw apiError('INVALID_FILTER', 'The stimulation filter is invalid.', 400);
  if (!['calm_first', 'stim_high', 'newest', 'recommended'].includes(sort)) throw apiError('INVALID_FILTER', 'The sort filter is invalid.', 400);
  if (category && category !== 'bad' && !CATEGORIES_CONFIG.some((candidate) => candidate.id === category)) throw apiError('INVALID_FILTER', 'The category filter is invalid.', 400);
  if (gate !== 'all' && gate !== 'audio_only' && gate !== 'mixed' && !['morning', 'learning', 'feelings', 'bedtime', 'shows', 'tunes'].includes(gate)) {
    throw apiError('INVALID_FILTER', 'The gate filter is invalid.', 400);
  }
  if (sort === 'recommended') {
    if (!isValidRotationDate(rotationDate)) throw apiError('INVALID_FILTER', 'A valid rotationDate is required for recommended sorting.', 400);
    if (!rotationSeed || !/^[A-Za-z0-9_-]{8,128}$/.test(rotationSeed)) {
      throw apiError('INVALID_FILTER', 'A valid rotationSeed is required for recommended sorting.', 400);
    }
    if (!rotationSurface) throw apiError('INVALID_FILTER', 'A valid rotationSurface is required for recommended sorting.', 400);
  }

  return {
    stimulation,
    category,
    gate,
    mediaType,
    age,
    language,
    platforms,
    audioOnly,
    query,
    ftsQuery: buildFtsQuery(query),
    sort,
    rotationDate,
    rotationSeed,
    rotationSurface,
  };
}

export function filterFingerprint(filters: MediaFilters): string {
  return JSON.stringify({
    stimulation: filters.stimulation,
    category: filters.category,
    gate: filters.gate,
    mediaType: filters.mediaType,
    age: filters.age,
    language: filters.language,
    platforms: filters.platforms,
    audioOnly: filters.audioOnly,
    ftsQuery: filters.ftsQuery,
    sort: filters.sort,
    rotationDate: filters.rotationDate,
    rotationSeed: filters.rotationSeed,
    rotationSurface: filters.rotationSurface,
  });
}

function episodeSummarySql(alias = 'm'): string {
  return `
    EXISTS(SELECT 1 FROM kids_media AS e WHERE e.parent_show_id = ${alias}.id AND e.media_type = 'episode') AS has_episodes,
    (SELECT COUNT(*) FROM kids_media AS e WHERE e.parent_show_id = ${alias}.id AND e.media_type = 'episode') AS episode_count,
    (SELECT COUNT(DISTINCT COALESCE(CAST(json_extract(e.metadata_json, '$.season') AS INTEGER), 1))
      FROM kids_media AS e WHERE e.parent_show_id = ${alias}.id AND e.media_type = 'episode') AS season_count`;
}

const baseSelect = `
  m.id, m.title, m.media_type, m.target_age_group, m.genre_category, m.duration,
  m.duration_seconds, m.platform_url, m.description, m.creator_publisher,
  m.language, m.release_year, m.metadata_json, m.stimulation_score, m.stimulation_label,
  m.parent_show_id, m.safety_rating_tags, ${episodeSummarySql('m')}`;

export function browseMedia(filters: MediaFilters, limit: number, cursor: CursorPayload | null) {
  const db = getDb();
  const where: string[] = [
    "m.media_type != 'episode'",
    "(m.stimulation_label != 'high' OR m.stimulation_label IS NULL)",
  ];
  const params: unknown[] = [];

  if (filters.category === 'bad' || filters.stimulation === 'high') return { rows: [], hasMore: false, mode: 'score' as const };
  const category = categoryFilter(filters.category);
  if (category) where.push(category);
  if (filters.mediaType !== 'all') { where.push('m.media_type = ?'); params.push(filters.mediaType); }
  if (filters.stimulation === 'calm' || filters.stimulation === 'low') where.push("m.stimulation_label = 'calm'");
  if (filters.stimulation === 'moderate' || filters.stimulation === 'medium') where.push("m.stimulation_label = 'moderate'");

  addAgeFilter(where, params, filters.age);
  if (filters.language) { where.push('LOWER(m.language) = LOWER(?)'); params.push(filters.language); }
  if (filters.audioOnly) where.push("m.media_type = 'music'");
  if (filters.gate !== 'all' && filters.gate !== 'audio_only') addGateFilter(where, filters.gate);

  for (const platform of filters.platforms) {
    if (platform === 'youtube') where.push("LOWER(m.platform_url) LIKE '%youtube.com%'");
    else if (platform === 'netflix') where.push("LOWER(m.metadata_json) LIKE '%netflix%'");
    else if (platform === 'disney') where.push("(LOWER(m.metadata_json) LIKE '%disney%' OR LOWER(m.metadata_json) LIKE '%disney_plus%')");
    else if (platform === 'prime') where.push("(LOWER(m.metadata_json) LIKE '%amazon%' OR LOWER(m.metadata_json) LIKE '%prime%')");
  }

  const searchFrom = filters.ftsQuery
    ? `JOIN (SELECT rowid, bm25(kids_media_fts, ${SEARCH_WEIGHTS}) AS relevance FROM kids_media_fts WHERE kids_media_fts MATCH ?) AS f ON f.rowid = m.id`
    : '';
  const fromParams = filters.ftsQuery ? [filters.ftsQuery] : [];
  const rotation = rotationExpressions(filters);
  const rankExpression = filters.ftsQuery ? 'f.relevance' : 'COALESCE(m.stimulation_score, 2147483647)';
  let mode: CursorPayload['mode'] = filters.ftsQuery ? 'relevance' : 'score';
  let order = filters.ftsQuery
    ? 'ORDER BY f.relevance ASC, m.id ASC'
    : 'ORDER BY COALESCE(m.stimulation_score, 2147483647) ASC, m.id ASC';

  if (!filters.ftsQuery && filters.sort === 'recommended' && rotation) {
    mode = 'recommended';
    order = `ORDER BY ${rotation.band} ASC, ${rotation.key} ASC, m.id ASC`;
  } else if (!filters.ftsQuery && filters.sort === 'stim_high') {
    mode = 'score_desc';
    order = 'ORDER BY COALESCE(m.stimulation_score, 2147483647) DESC, m.id DESC';
  } else if (!filters.ftsQuery && filters.sort === 'newest') {
    mode = 'newest';
    order = 'ORDER BY m.id DESC';
  }

  if (cursor) {
    if (cursor.mode !== mode) throw apiError('INVALID_CURSOR', 'The pagination cursor does not match these filters.', 400);
    if (mode === 'newest') { where.push('m.id < ?'); params.push(cursor.id); }
    else if (mode === 'recommended' && rotation) {
      where.push(`(${rotation.band} > ? OR (${rotation.band} = ? AND (${rotation.key} > ? OR (${rotation.key} = ? AND m.id > ?))))`);
      params.push(cursor.key, cursor.key, cursor.tie, cursor.tie, cursor.id);
    }
    else if (mode === 'score_desc') { where.push(`(${rankExpression} < ? OR (${rankExpression} = ? AND m.id < ?))`); params.push(cursor.key, cursor.key, cursor.id); }
    else { where.push(`(${rankExpression} > ? OR (${rankExpression} = ? AND m.id > ?))`); params.push(cursor.key, cursor.key, cursor.id); }
  }

  const rotationSelect = mode === 'recommended' && rotation
    ? `, ${rotation.band} AS rotation_band, ${rotation.key} AS rotation_key`
    : '';
  const sql = `SELECT ${baseSelect}${filters.ftsQuery ? ', f.relevance AS relevance' : ''}${rotationSelect}, ${rankExpression} AS sort_score
    FROM kids_media AS m ${searchFrom}
    WHERE ${where.join(' AND ')} ${order} LIMIT ?`;
  const rows = db.prepare(sql).all(...fromParams, ...params, limit + 1) as QueryRow[];
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit, mode };
}

export function browseMediaPage(filters: MediaFilters, limit: number, page: number) {
  const db = getDb();
  const where: string[] = ["m.media_type != 'episode'", "(m.stimulation_label != 'high' OR m.stimulation_label IS NULL)"];
  const params: unknown[] = [];
  if (filters.category === 'bad' || filters.stimulation === 'high') return { rows: [], total: 0 };
  const category = categoryFilter(filters.category);
  if (category) where.push(category);
  if (filters.mediaType !== 'all') { where.push('m.media_type = ?'); params.push(filters.mediaType); }
  if (filters.stimulation === 'calm' || filters.stimulation === 'low') where.push("m.stimulation_label = 'calm'");
  else if (filters.stimulation === 'moderate' || filters.stimulation === 'medium') where.push("m.stimulation_label = 'moderate'");
  addAgeFilter(where, params, filters.age);
  if (filters.language) { where.push('LOWER(m.language) = LOWER(?)'); params.push(filters.language); }
  if (filters.audioOnly) where.push("m.media_type = 'music'");
  if (filters.gate !== 'all' && filters.gate !== 'audio_only') addGateFilter(where, filters.gate);
  for (const platform of filters.platforms) {
    if (platform === 'youtube') where.push("LOWER(m.platform_url) LIKE '%youtube.com%'");
    else if (platform === 'netflix') where.push("LOWER(m.metadata_json) LIKE '%netflix%'");
    else if (platform === 'disney') where.push("(LOWER(m.metadata_json) LIKE '%disney%' OR LOWER(m.metadata_json) LIKE '%disney_plus%')");
    else if (platform === 'prime') where.push("(LOWER(m.metadata_json) LIKE '%amazon%' OR LOWER(m.metadata_json) LIKE '%prime%')");
  }

  const searchFrom = filters.ftsQuery
    ? `JOIN (SELECT rowid, bm25(kids_media_fts, ${SEARCH_WEIGHTS}) AS relevance FROM kids_media_fts WHERE kids_media_fts MATCH ?) AS f ON f.rowid = m.id`
    : '';
  const fromParams = filters.ftsQuery ? [filters.ftsQuery] : [];
  const rotation = rotationExpressions(filters);
  const rankExpression = filters.ftsQuery ? 'f.relevance' : 'COALESCE(m.stimulation_score, 2147483647)';
  const order = filters.ftsQuery
    ? 'ORDER BY f.relevance ASC, m.id ASC'
    : filters.sort === 'recommended' && rotation
      ? `ORDER BY ${rotation.band} ASC, ${rotation.key} ASC, m.id ASC`
      : filters.sort === 'newest'
      ? 'ORDER BY m.id DESC'
      : filters.sort === 'stim_high'
        ? 'ORDER BY COALESCE(m.stimulation_score, 2147483647) DESC, m.id DESC'
        : 'ORDER BY COALESCE(m.stimulation_score, 2147483647) ASC, m.id ASC';
  const whereSql = where.join(' AND ');
  const count = db.prepare(`SELECT COUNT(*) AS total FROM kids_media AS m ${searchFrom} WHERE ${whereSql}`).get(...fromParams, ...params) as { total: number };
  const rotationSelect = filters.sort === 'recommended' && rotation
    ? `, ${rotation.band} AS rotation_band, ${rotation.key} AS rotation_key`
    : '';
  const rows = db.prepare(`SELECT ${baseSelect}${filters.ftsQuery ? ', f.relevance AS relevance' : ''}${rotationSelect}, ${rankExpression} AS sort_score FROM kids_media AS m ${searchFrom} WHERE ${whereSql} ${order} LIMIT ? OFFSET ?`)
    .all(...fromParams, ...params, limit, (page - 1) * limit) as QueryRow[];
  return { rows, total: Number(count?.total ?? 0) };
}

export function getPublicMediaById(id: number): { row: QueryRow; episodes: QueryRow[] } | null {
  const db = getDb();
  const row = db.prepare(`SELECT ${baseSelect} FROM kids_media AS m WHERE m.id = ?`).get(id) as QueryRow | undefined;
  if (!row || row.media_type === 'episode' || row.stimulation_label === 'high') return null;
  const episodes = db.prepare(`SELECT ${baseSelect.replaceAll('m.', 'e.')} FROM kids_media AS e
    WHERE e.parent_show_id = ? AND e.media_type = 'episode'
    ORDER BY COALESCE(CAST(json_extract(e.metadata_json, '$.season') AS INTEGER), 1) ASC,
             COALESCE(CAST(json_extract(e.metadata_json, '$.number') AS INTEGER), 0) ASC,
             e.id ASC`).all(id) as QueryRow[];
  return { row, episodes };
}

export function getPublicCategories() {
  const db = getDb();
  return CATEGORIES_CONFIG.filter((category) => category.id !== 'bad').map((category) => {
    const visibility = "m.media_type != 'episode' AND (m.stimulation_label != 'high' OR m.stimulation_label IS NULL)";
    const count = db.prepare(`SELECT COUNT(*) AS count FROM kids_media AS m WHERE ${visibility} AND (${category.query})`).get() as { count: number };
    const samples = db.prepare(`SELECT m.title FROM kids_media AS m WHERE ${visibility} AND (${category.query}) ORDER BY m.id ASC LIMIT 4`).all() as Array<{ title: string }>;
    return { id: category.id, title: category.title, tagline: category.tagline, mediaType: category.mediaType, ageRange: category.ageRange, icon: category.icon, badge: category.badge, count: Number(count?.count ?? 0), sampleTitles: samples.map((row) => row.title) };
  });
}

export function getPublicLanguages() {
  const db = getDb();
  return db.prepare(`SELECT language, COUNT(*) AS count FROM kids_media
    WHERE media_type != 'episode' AND (stimulation_label != 'high' OR stimulation_label IS NULL)
      AND language IS NOT NULL AND TRIM(language) != ''
    GROUP BY language COLLATE NOCASE ORDER BY language COLLATE NOCASE ASC`).all() as Array<{ language: string; count: number }>;
}

export function databaseHealth() {
  const db = getDb();
  const schemaVersion = Number(db.pragma('user_version', { simple: true }));
  const rowCount = Number((db.prepare('SELECT COUNT(*) AS count FROM kids_media').get() as { count: number }).count);
  const ftsCount = Number((db.prepare('SELECT COUNT(*) AS count FROM kids_media_fts').get() as { count: number }).count);
  const highCount = Number((db.prepare("SELECT COUNT(*) AS count FROM kids_media WHERE stimulation_label = 'high'").get() as { count: number }).count);
  const orphanEpisodes = Number((db.prepare("SELECT COUNT(*) AS count FROM kids_media AS e WHERE e.media_type = 'episode' AND NOT EXISTS (SELECT 1 FROM kids_media AS p WHERE p.id = e.parent_show_id AND p.media_type = 'show')").get() as { count: number }).count);
  const integrity = db.pragma('integrity_check', { simple: true }) as string;
  const foreignKeys = db.pragma('foreign_key_check') as unknown[];
  return { schemaVersion, rowCount, ftsCount, highCount, orphanEpisodes, integrity, foreignKeyErrors: foreignKeys.length, expectedRowCount: 71963 };
}

