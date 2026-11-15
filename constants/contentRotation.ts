import type { KidsMediaItem, MainShelfSpec } from './kidsDb';

export type RotationSurface = 'home' | 'discover' | 'language' | 'category';

export type RotationExposure = {
  id: number;
  dayKey: string;
};

export type RotationContext = {
  dayKey: string;
  installSeed: string;
  surface: RotationSurface;
  filterKey?: string;
  exposures?: readonly RotationExposure[];
};

export type RotationOptions = {
  anchorCount?: number;
  qualityBandSize?: number;
};

export function getLocalRotationDay(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRotationDayAge(currentDay: string, exposureDay: string): number | null {
  const current = Date.parse(`${currentDay}T00:00:00`);
  const exposure = Date.parse(`${exposureDay}T00:00:00`);
  if (!Number.isFinite(current) || !Number.isFinite(exposure)) return null;
  const age = Math.floor((current - exposure) / 86_400_000);
  return age >= 0 ? age : null;
}

/** Stable, cross-platform 32-bit hash for daily ordering. */
export function hashRotationKey(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function exposurePenalty(itemId: number, context: RotationContext): number {
  const exposure = context.exposures?.find((entry) => entry.id === itemId);
  if (!exposure) return 0;

  const age = getRotationDayAge(context.dayKey, exposure.dayKey);
  // Keep the current day's order stable after recording what was rendered.
  if (age === 0) return 0;
  if (age === 1) return 0.38;
  if (age !== null && age <= 3) return 0.24;
  if (age !== null && age <= 6) return 0.1;
  return 0;
}

function itemRotationScore(item: KidsMediaItem, context: RotationContext): number {
  const key = [
    context.dayKey,
    context.installSeed,
    context.surface,
    context.filterKey ?? '',
    item.id,
  ].join('|');
  const normalizedHash = hashRotationKey(key) / 4_294_967_296;
  return normalizedHash - exposurePenalty(item.id, context);
}

/**
 * Rotates items inside quality bands while preserving the ranked quality order.
 * The first `anchorCount` items remain fixed for recognition and trust.
 */
export function rotateRankedItems(
  items: readonly KidsMediaItem[],
  context: RotationContext,
  options: RotationOptions = {}
): KidsMediaItem[] {
  if (items.length <= 1) return items.slice();

  const anchorCount = Math.max(0, Math.min(items.length, options.anchorCount ?? 0));
  const qualityBandSize = Math.max(2, options.qualityBandSize ?? 8);
  const anchors = items.slice(0, anchorCount);

  const rotating = items.slice(anchorCount).map((item, index) => ({
    item,
    originalIndex: index,
    qualityBand: Math.floor(index / qualityBandSize),
    rotationScore: itemRotationScore(item, context),
  }));

  rotating.sort((left, right) => {
    if (left.qualityBand !== right.qualityBand) {
      return left.qualityBand - right.qualityBand;
    }
    if (right.rotationScore !== left.rotationScore) {
      return right.rotationScore - left.rotationScore;
    }
    return left.originalIndex - right.originalIndex;
  });

  return [...anchors, ...rotating.map((entry) => entry.item)];
}

/**
 * Rotates Home shelves without allowing the same creator to dominate the
 * leading cards of several shelves.
 */
export function rotateHomeShelves(
  shelves: readonly MainShelfSpec[],
  context: RotationContext
): MainShelfSpec[] {
  const usedLeadIds = new Set<number>();
  const usedLeadCreators = new Set<string>();

  return shelves.map((shelf) => {
    const eligibleAnchors: KidsMediaItem[] = [];
    const remaining: KidsMediaItem[] = [];

    for (const item of shelf.items) {
      const creator = item.creator_publisher?.trim().toLowerCase() || null;
      const isLeadConflict =
        usedLeadIds.has(item.id) || (creator !== null && usedLeadCreators.has(creator));

      if (eligibleAnchors.length < 2 && !isLeadConflict) {
        eligibleAnchors.push(item);
      } else {
        remaining.push(item);
      }
    }

    const rotated = rotateRankedItems(
      [...eligibleAnchors, ...remaining],
      { ...context, surface: 'home', filterKey: shelf.id },
      { anchorCount: eligibleAnchors.length, qualityBandSize: 8 }
    );

    for (const item of rotated.slice(0, 6)) {
      usedLeadIds.add(item.id);
      const creator = item.creator_publisher?.trim().toLowerCase();
      if (creator) usedLeadCreators.add(creator);
    }

    return { ...shelf, items: rotated };
  });
}

