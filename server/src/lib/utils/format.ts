// Common formatting and stimulation diagnostic utilities

export function parseCutRate(reviewerNotes?: string): number | null {
  if (!reviewerNotes) return null;
  const match = reviewerNotes.match(/([\d\.]+)\s*cuts\/min/);
  return match ? parseFloat(match[1]) : null;
}

export function parseStimulationScore(reviewerNotes?: string): number | null {
  if (!reviewerNotes) return null;
  const match = reviewerNotes.match(/Stimulation Score:\s*(\d+)\/100/);
  return match ? parseInt(match[1], 10) : null;
}

export function getCutRateDisplay(reviewerNotes?: string, stimulationLevel?: string): string {
  const rate = parseCutRate(reviewerNotes);
  if (rate !== null) {
    return `${rate.toFixed(1)} cuts/m`;
  }
  if (stimulationLevel === 'low') return 'quiet pace';
  if (stimulationLevel === 'medium') return 'steady pace';
  return 'not approved';
}

export function formatAgeRange(age?: string): string {
  if (!age) return 'All ages';
  if (age.includes('-')) return `Ages ${age}`;
  return `Ages ${age}+`;
}

export function getHighResImageUrl(url?: string, preferMaxRes = true): string {
  if (!url) return '';
  let highRes = url.replace('medium_portrait', 'original_untouched');
  // Upgrade YouTube thumbnails to crystal clear HD (maxresdefault is 1280x720 / 1920x1080)
  if (highRes.includes('img.youtube.com') || highRes.includes('i.ytimg.com')) {
    if (preferMaxRes) {
      highRes = highRes.replace(/\/(default|mqdefault|hqdefault|sddefault)\.jpg/i, '/maxresdefault.jpg');
    } else {
      highRes = highRes.replace(/\/(default|mqdefault)\.jpg/i, '/hqdefault.jpg');
    }
  }
  // Upgrade TMDB posters if present
  if (highRes.includes('image.tmdb.org/t/p/w')) {
    highRes = highRes.replace(/\/w\d+\//, '/original/');
  }
  return highRes;
}

export function getHeroBackdropUrl(url?: string): string {
  return getHighResImageUrl(url, true);
}
