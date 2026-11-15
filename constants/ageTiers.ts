import { ImageSourcePropType } from 'react-native';
import type { AgeTier } from './kidsDb';
import {
  getBedtimeStartMinutes,
  parseAgeRange,
  resolveChildAgeRange,
} from './sanctuaryAlgorithm';

export { getBedtimeStartMinutes, parseAgeRange, resolveChildAgeRange };

export const BEAR_BABY_ICON: ImageSourcePropType = require('@/assets/icons/bear_baby.png');
export const BEAR_PRESCHOOL_ICON: ImageSourcePropType = require('@/assets/icons/bear_preschool.png');
export const BEAR_EXPLORER_ICON: ImageSourcePropType = require('@/assets/icons/bear_explorer.png');

export interface DiscoverAgeFilter {
  id: 'all' | '0-3' | '4-6' | '7+';
  label: string;
  icon?: ImageSourcePropType;
  minAge?: number;
  maxAge?: number;
}

/**
 * Discover Age Filter Tiers:
 * Uses the 3 clay sanctuary bears + concise age brackets only.
 */
export const DISCOVER_AGE_FILTERS: DiscoverAgeFilter[] = [
  { id: 'all', label: 'All Ages' },
  { id: '0-3', label: '0–3', icon: BEAR_BABY_ICON, minAge: 0, maxAge: 3 },
  { id: '4-6', label: '4–6', icon: BEAR_PRESCHOOL_ICON, minAge: 4, maxAge: 6 },
  { id: '7+', label: '7+', icon: BEAR_EXPLORER_ICON, minAge: 7, maxAge: 12 },
];

/**
 * Normalizes persisted AsyncStorage age tier values into canonical `AgeTier` IDs:
 * - 'preschool' -> Ages 0 to 3
 * - 'big_kids'  -> Ages 4 to 6
 * - 'tweens'    -> Ages 7+
 * Migrates legacy 'all' (previously saved by "Ages 7+") cleanly when needed,
 * while supporting '0-3', '4-6', '7+' aliases.
 */
export function normalizeStoredAgeTier(raw?: string | null): AgeTier {
  if (!raw) return 'preschool';
  const clean = raw.trim().toLowerCase();
  if (clean === 'preschool' || clean === '0-3' || clean === '0–3' || clean === 'baby' || clean === 'toddler') {
    return 'preschool';
  }
  if (clean === 'big_kids' || clean === '4-6' || clean === '4–6') {
    return 'big_kids';
  }
  if (clean === 'tweens' || clean === '7+' || clean === 'older' || clean === 'explorer' || clean === 'all') {
    return 'tweens';
  }
  return 'preschool';
}

/**
 * Resolves the Profile screen's clay bear icon and label for any stored `AgeTier`.
 */
export function getProfileAgeInfo(tier?: string | null): { label: string; icon: ImageSourcePropType } {
  const normalized = normalizeStoredAgeTier(tier);
  if (normalized === 'preschool') {
    return { label: 'Ages 0 to 3', icon: BEAR_BABY_ICON };
  }
  if (normalized === 'big_kids') {
    return { label: 'Ages 4 to 6', icon: BEAR_PRESCHOOL_ICON };
  }
  return { label: 'Ages 7+', icon: BEAR_EXPLORER_ICON };
}
