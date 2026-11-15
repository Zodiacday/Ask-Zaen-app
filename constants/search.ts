import {
  KidsMediaItem,
  getBrowsableCategoryItems,
  getCategories,
  getFeaturedCarouselShows,
} from './kidsDb';
import { getPlatformInfo } from './platforms';
import { matchesLanguage } from './languages';

/**
 * Local search engine for the curated library.
 *
 * - Accent- and punctuation-insensitive
 * - Multi-token queries with AND semantics
 * - Weighted fields: title, creator, categories, genre, tags, platform, age
 * - Whole-word and prefix bonuses
 * - Light stemming, synonyms, and a typo-tolerant fallback
 */

interface SearchField {
  text: string;
  words: string[];
}

interface SearchEntry {
  item: KidsMediaItem;
  title: SearchField;
  creator: SearchField;
  genre: SearchField;
  categories: SearchField;
  tags: SearchField;
  platform: SearchField;
  description: SearchField;
  age: SearchField;
  mediaType: SearchField;
  language: SearchField;
}

const FIELD_WEIGHTS = {
  title: 120,
  creator: 45,
  categories: 40,
  genre: 30,
  tags: 25,
  platform: 20,
  language: 18,
  age: 12,
  mediaType: 10,
  description: 8,
};

const SYNONYMS: Record<string, string[]> = {
  tv: ['show', 'series'],
  shows: ['show'],
  series: ['show', 'tv'],
  movie: ['film'],
  film: ['movie'],
  cartoon: ['show', 'animation'],
  animation: ['cartoon', 'show'],
  maths: ['math'],
  abc: ['phonics', 'alphabet'],
  alphabet: ['phonics'],
  letters: ['phonics'],
  sleep: ['bedtime', 'lullaby', 'night'],
  sleepy: ['bedtime', 'night'],
  night: ['bedtime'],
  nighttime: ['bedtime'],
  lullaby: ['bedtime', 'nursery', 'sleep'],
  song: ['music'],
  songs: ['music', 'song'],
  sing: ['music'],
  singing: ['music'],
  calm: ['gentle', 'quiet'],
  calming: ['calm', 'gentle'],
  gentle: ['calm'],
  quiet: ['calm', 'bedtime'],
  feeling: ['feelings', 'emotion'],
  emotion: ['feelings', 'feeling'],
  emotions: ['feelings'],
  kindness: ['feelings', 'manners'],
  animal: ['discovery', 'nature'],
  animals: ['discovery', 'nature'],
  nature: ['discovery'],
  science: ['stem', 'discovery'],
  scientific: ['stem'],
  drawing: ['art', 'creative'],
  craft: ['art', 'creative'],
  dance: ['movement', 'active'],
  dancing: ['movement', 'active'],
  preschooler: ['preschool'],
  toddler: ['preschool'],
  toddlers: ['preschool'],
};

/** Common British/American spelling pairs so either spelling finds both. */
const SPELLING_VARIANTS: Record<string, string[]> = {
  color: ['colour'],
  colour: ['color'],
  favorite: ['favourite'],
  favourite: ['favorite'],
  behavior: ['behaviour'],
  behaviour: ['behavior'],
  organize: ['organise'],
  organise: ['organize'],
  center: ['centre'],
  centre: ['center'],
  theater: ['theatre'],
  theatre: ['theater'],
  program: ['programme'],
  programme: ['program'],
  canceled: ['cancelled'],
  cancelled: ['canceled'],
  traveling: ['travelling'],
  travelling: ['traveling'],
  mom: ['mum'],
  mum: ['mom'],
  gray: ['grey'],
  grey: ['gray'],
};

function makeField(value: string | null | undefined): SearchField {
  const text = normalizeSearchText(value || '');
  return { text, words: text ? text.split(' ') : [] };
}

/** Lowercases, strips Latin diacritics and punctuation, collapses whitespace. */
export function normalizeSearchText(value: string): string {
  const normalized =
    typeof value.normalize === 'function' ? value.normalize('NFD') : value;

  return normalized
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[.,!?;:()[\]{}'"“”‘’\-_/\+*、。！？・]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function expandToken(token: string): string[] {
  const variants = new Set<string>([token]);

  if (token.endsWith('ies') && token.length > 4) {
    variants.add(`${token.slice(0, -3)}y`);
  } else if (token.endsWith('s') && token.length > 3) {
    variants.add(token.slice(0, -1));
  }

  for (const variant of Array.from(variants)) {
    for (const synonym of SYNONYMS[variant] || []) {
      variants.add(synonym);
    }
    for (const spelling of SPELLING_VARIANTS[variant] || []) {
      variants.add(spelling);
    }
  }

  return Array.from(variants);
}

function stimRank(label: KidsMediaItem['stimulation_label']): number {
  if (label === 'calm') return 0;
  if (label === 'moderate') return 1;
  if (label === 'high') return 2;
  return 3;
}

function matchField(field: SearchField, alternative: string): number {
  if (!field.text) return 0;

  // Single characters should only match whole words, never substrings.
  if (alternative.length <= 1) {
    return field.words.includes(alternative) ? 0.75 : 0;
  }

  if (field.text === alternative) return 0.95;
  if (field.words.includes(alternative)) return 0.75;
  if (field.words.some((word) => word.startsWith(alternative))) return 0.55;
  if (field.text.includes(alternative)) return 0.3;
  return 0;
}

function scoreGroup(entry: SearchEntry, alternatives: string[]): number {
  let best = 0;

  for (const alternative of alternatives) {
    const score =
      matchField(entry.title, alternative) * FIELD_WEIGHTS.title +
      matchField(entry.creator, alternative) * FIELD_WEIGHTS.creator +
      matchField(entry.categories, alternative) * FIELD_WEIGHTS.categories +
      matchField(entry.genre, alternative) * FIELD_WEIGHTS.genre +
      matchField(entry.tags, alternative) * FIELD_WEIGHTS.tags +
      matchField(entry.platform, alternative) * FIELD_WEIGHTS.platform +
      matchField(entry.language, alternative) * FIELD_WEIGHTS.language +
      matchField(entry.age, alternative) * FIELD_WEIGHTS.age +
      matchField(entry.mediaType, alternative) * FIELD_WEIGHTS.mediaType +
      matchField(entry.description, alternative) * FIELD_WEIGHTS.description;

    if (score > best) best = score;
  }

  return best;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }

    previous = current;
  }

  return previous[b.length];
}

function fuzzyFieldScore(field: SearchField, alternative: string): number {
  if (alternative.length < 4) return 0;

  const threshold = alternative.length <= 6 ? 1 : 2;
  let best = 0;

  for (const word of field.words) {
    if (Math.abs(word.length - alternative.length) > threshold) continue;

    const distance = levenshtein(alternative, word);
    if (distance <= threshold) {
      best = Math.max(best, 1 - distance / Math.max(alternative.length, word.length));
    }
  }

  return best;
}

let cachedIndex: SearchEntry[] | null = null;

function buildIndex(): SearchEntry[] {
  const categoryTitles = new Map(
    getCategories().map((category) => [category.id, category.title])
  );
  const categoryItems = getBrowsableCategoryItems();

  const itemsById = new Map<number, KidsMediaItem>();
  const categoriesById = new Map<number, { ids: string[]; titles: string[] }>();

  for (const categoryId in categoryItems) {
    const title = categoryTitles.get(categoryId) || categoryId;

    for (const item of categoryItems[categoryId]) {
      itemsById.set(item.id, item);

      const existing = categoriesById.get(item.id) || { ids: [], titles: [] };
      existing.ids.push(categoryId);
      existing.titles.push(title);
      categoriesById.set(item.id, existing);
    }
  }

  // The hero lineup is curated outside the category shelves.
  for (const item of getFeaturedCarouselShows('preschool')) {
    if (!itemsById.has(item.id)) {
      itemsById.set(item.id, item);
      categoriesById.set(item.id, {
        ids: ['featured_calm'],
        titles: ['Featured Calm Picks'],
      });
    }
  }

  const entries: SearchEntry[] = [];

  for (const [itemId, item] of itemsById) {
    const category = categoriesById.get(itemId);
    const platform = getPlatformInfo(item);

    const stimulationText =
      item.stimulation_label === 'high'
        ? 'high intense stimulating'
        : item.stimulation_label === 'moderate'
        ? 'moderate active'
        : 'calm gentle healthy';

    const mediaTypeText =
      item.media_type === 'music'
        ? 'music song songs lullaby audio'
        : item.media_type === 'video'
        ? 'video'
        : item.media_type === 'show'
        ? 'show series tv cartoon animation'
        : item.media_type;

    entries.push({
      item,
      title: makeField(item.title),
      creator: makeField(item.creator_publisher),
      genre: makeField(item.genre_category),
      categories: makeField(
        `${category?.ids.join(' ') || ''} ${category?.ids.join('') || ''} ` +
          `${category?.titles.join(' ') || ''} ${category?.titles.join('') || ''}`
      ),
      tags: makeField(`${item.safety_rating_tags || ''} ${stimulationText}`),
      platform: makeField(`${platform.name} ${item.platform_url || ''}`),
      description: makeField(item.description),
      age: makeField(item.target_age_group),
      mediaType: makeField(mediaTypeText),
      language: makeField(item.language),
    });
  }

  return entries;
}

function getIndex(): SearchEntry[] {
  if (!cachedIndex) cachedIndex = buildIndex();
  return cachedIndex;
}

export interface SearchOptions {
  language?: string | null;
  limit?: number;
}

export function searchMedia(
  query: string,
  options: SearchOptions = {}
): KidsMediaItem[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const groups = tokens.map(expandToken);
  const index = getIndex();

  const strictResults: Array<{ item: KidsMediaItem; score: number }> = [];

  for (const entry of index) {
    if (!matchesLanguage(entry.item, options.language)) continue;

    let score = 0;
    let matchedAll = true;

    for (const group of groups) {
      const groupScore = scoreGroup(entry, group);
      if (groupScore <= 0) {
        matchedAll = false;
        break;
      }
      score += groupScore;
    }

    if (!matchedAll) continue;

    // Curated category matches beat incidental mentions in a title or blurb.
    const categoryPhrase = entry.categories.text.includes(normalizedQuery);
    const categoryTokens = groups.every((group) =>
      group.some((alternative) =>
        entry.categories.words.some(
          (word) => word === alternative || word.startsWith(alternative)
        )
      )
    );

    if (categoryPhrase) {
      score += 90;
    } else if (categoryTokens) {
      score += 50;
    }

    // Whole-phrase bonuses.
    if (entry.title.text === normalizedQuery) {
      score += 600;
    } else if (entry.title.text.startsWith(normalizedQuery)) {
      score += 320;
    } else if (entry.title.text.includes(normalizedQuery)) {
      score += 160;
    }

    if (entry.creator.text.includes(normalizedQuery)) {
      score += 50;
    }

    // Reward titles that contain every query token.
    const titleHits = tokens.filter((token) =>
      entry.title.words.some((word) => word.startsWith(token))
    ).length;
    if (titleHits === tokens.length) {
      score += 80 * tokens.length;
    }

    strictResults.push({ item: entry.item, score });
  }

  let results = strictResults;

  // Typo-tolerant fallback, only when the strict pass finds nothing.
  if (results.length === 0 && tokens.some((token) => token.length >= 4)) {
    const fuzzyResults: Array<{ item: KidsMediaItem; score: number }> = [];

    for (const entry of index) {
      if (!matchesLanguage(entry.item, options.language)) continue;

      let score = 0;
      let matchedAll = true;

      for (const group of groups) {
        const best = group.reduce((highest, alternative) => {
          const alternativeScore =
            fuzzyFieldScore(entry.title, alternative) * 100 +
            fuzzyFieldScore(entry.creator, alternative) * 40 +
            fuzzyFieldScore(entry.categories, alternative) * 25 +
            fuzzyFieldScore(entry.genre, alternative) * 20;
          return Math.max(highest, alternativeScore);
        }, 0);

        if (best <= 0) {
          matchedAll = false;
          break;
        }
        score += best;
      }

      if (matchedAll) {
        fuzzyResults.push({ item: entry.item, score });
      }
    }

    results = fuzzyResults;
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    const stimulation =
      stimRank(a.item.stimulation_label) - stimRank(b.item.stimulation_label);
    if (stimulation !== 0) return stimulation;

    const titleLength = (a.item.title || '').length - (b.item.title || '').length;
    if (titleLength !== 0) return titleLength;

    return a.item.id - b.item.id;
  });

  const items = results.map((result) => result.item);
  return options.limit ? items.slice(0, options.limit) : items;
}
