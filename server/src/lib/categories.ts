import type { CategoryInfo, ReviewedResource } from './types';
import { CURATED_RESOURCES } from './curated-data';

export const DEFAULT_CATEGORIES: CategoryInfo[] = [
  {
    id: 'bedtime',
    title: 'Bedtime Audio & Sleep',
    tagline: 'Mozart, gentle music box melodies, and calm continuous sleep tracks.',
    mediaType: 'music',
    ageRange: '0–2',
    icon: 'Moon',
    badge: 'Sleep Sanctuary',
    count: 148,
    sampleTitles: ['Twinkle Twinkle Little Star', 'Baby Mozart Deep Sleep', '8 Hours Ambient Piano', 'Calm Night Music Box']
  },
  {
    id: 'nursery',
    title: 'Toddler Sing-Alongs',
    tagline: 'Gentle acoustic rhymes and movement songs from The Wiggles and Super Simple.',
    mediaType: 'music',
    ageRange: '1–4',
    icon: 'Music',
    badge: 'Early Rhythm',
    count: 1685,
    sampleTitles: ['Super Simple Rhymes', 'The Wiggles Nursery Melodies', 'Gracie’s Corner Phonics', 'Dave and Ava Baby Songs']
  },
  {
    id: 'phonics',
    title: 'Phonics & Early ABCs',
    tagline: 'Letter sounds, phonemic songs, and gentle foundation alphabet rhymes.',
    mediaType: 'music',
    ageRange: '3–5',
    icon: 'BookOpen',
    badge: 'Foundations',
    count: 105,
    sampleTitles: ['Super Simple ABCs', 'Alphabet Sound Chant', 'Lowercase Phonics Rhythm', 'Signing Alphabet for Babies']
  },
  {
    id: 'pbs',
    title: 'PBS Kids Sanctuary',
    tagline: 'Golden-age storytelling built for empathy, curiosity, and calm pacing.',
    mediaType: 'show',
    ageRange: '3–8',
    icon: 'Tv',
    badge: 'Calm Television',
    count: 71,
    sampleTitles: ['Arthur', 'The Magic School Bus', 'Cyberchase', 'Dragon Tales']
  },
  {
    id: 'nick_jr',
    title: 'Nick Jr. Gentle Classics',
    tagline: 'Interactive slow-paced pioneers including Blue’s Clues, Little Bear, and Dora.',
    mediaType: 'show',
    ageRange: '2–6',
    icon: 'PawPrint',
    badge: 'Preschool Heritage',
    count: 181,
    sampleTitles: ['Blue’s Clues', 'Little Bear', 'Dora the Explorer', 'Hey Arnold!']
  },
  {
    id: 'disney',
    title: 'Disney Storyscapes',
    tagline: 'Acoustic piano Disney melodies, classic soundtracks, and gentle Disney Jr. tales.',
    mediaType: 'all',
    ageRange: '3–8',
    icon: 'Sparkles',
    badge: 'Orchestral Tales',
    count: 943,
    sampleTitles: ['You’ve Got a Friend in Me', 'Calm Night Disney Piano', 'Bear in the Big Blue House', 'Encanto Acoustic']
  },
  {
    id: 'bbc',
    title: 'BBC & CBeebies Storytelling',
    tagline: 'Gentle British stop-motion and soothing narrations like Teletubbies and Sarah & Duck.',
    mediaType: 'show',
    ageRange: '0–5',
    icon: 'CloudSun',
    badge: 'British Heritage',
    count: 583,
    sampleTitles: ['Teletubbies', 'In the Night Garden', 'Bob the Builder', 'Sarah & Duck']
  },
  {
    id: 'calm_videos',
    title: 'Graded Calm Videos',
    tagline: 'Laboratory-verified camera transitions under 15 cuts/min. Safe for bedtime.',
    mediaType: 'video',
    ageRange: 'All',
    icon: 'ShieldCheck',
    badge: 'Lab Certified',
    count: 1948,
    sampleTitles: ['Five Little Ducks Ambient', 'Slow Wildlife Moments', 'Gentle Storybook Reads', 'Quiet Clay Play']
  },
  {
    id: 'pop',
    title: 'Clean Pop & Active Dance',
    tagline: 'Family-clean dance energy from KIDZ BOP and joyful sing-alongs.',
    mediaType: 'music',
    ageRange: '6–12',
    icon: 'Radio',
    badge: 'Movement & Joy',
    count: 53,
    sampleTitles: ['KIDZ BOP Clean Party', 'Family Dance Rhythm', 'Upbeat Acoustic Joy', 'Zootopia Dance Mix']
  },
  {
    id: 'bad',
    title: 'The Sensory Boundary',
    tagline: 'Rapid-cut (>30 cuts/min) warning directory to protect developing attention.',
    mediaType: 'video',
    ageRange: 'All',
    icon: 'TriangleAlert',
    badge: 'Sensory Warning',
    count: 3139,
    sampleTitles: ['Hyper-cut Sensory Reels', 'Surprise Eggs Flashes', 'Jump-cut Animation Loops', 'Rapid Sound Effects']
  }
];

const API_BASE = '/api';

export async function fetchCategories(): Promise<CategoryInfo[]> {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('API request failed');
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function fetchCategoryMedia(
  categoryId: string,
  page = 1,
  limit = 24
): Promise<{ items: ReviewedResource[]; total: number; pages: number }> {
  try {
    const res = await fetch(`${API_BASE}/media?category=${encodeURIComponent(categoryId)}&page=${page}&limit=${limit}`);
    if (!res.ok) throw new Error('API media request failed');
    const data = await res.json();
    return {
      items: data.items || [],
      total: data.total || 0,
      pages: data.pages || 1
    };
  } catch {
    // Fallback filter using client curated resources
    const localFiltered = CURATED_RESOURCES.filter((r) => {
      if (categoryId === 'bad') return r.classification === 'high';
      if (categoryId === 'calm_videos') return r.classification === 'low';
      if (categoryId === 'pbs') return r.platform === 'PBS' || (r.description ?? '').toLowerCase().includes('pbs');
      if (categoryId === 'nick_jr') return r.title.toLowerCase().includes('blue') || r.title.toLowerCase().includes('bear');
      if (categoryId === 'disney') return r.platform === 'Disney' || r.title.toLowerCase().includes('disney');
      return true;
    });
    const start = (page - 1) * limit;
    return {
      items: localFiltered.slice(start, start + limit),
      total: localFiltered.length,
      pages: Math.max(1, Math.ceil(localFiltered.length / limit))
    };
  }
}
