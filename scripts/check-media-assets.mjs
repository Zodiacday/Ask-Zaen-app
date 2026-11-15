import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const mediaPath = new URL('../constants/bundled_kids_media.json', import.meta.url);
const timeoutMs = Number(process.env.MEDIA_ASSET_CHECK_TIMEOUT_MS || 8000);
const requestedLimit = Number(process.env.MEDIA_ASSET_CHECK_LIMIT || 200);
const reportPath = process.env.MEDIA_ASSET_REPORT_PATH
  ? resolve(process.env.MEDIA_ASSET_REPORT_PATH)
  : null;
const concurrency = 8;

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function addCandidate(candidates, url, source) {
  const normalized = nonEmpty(url);
  if (!normalized || !/^https?:\/\//i.test(normalized)) return;
  if (!candidates.some((candidate) => candidate.url === normalized)) {
    candidates.push({ url: normalized, source });
  }
}

function youtubeThumbnail(platformUrl) {
  const match = nonEmpty(platformUrl)?.match(/(?:v=|youtu\.be\/)([0-9A-Za-z_-]{11})/);
  return match?.[1] ? `https://i.ytimg.com/vi/${match[1]}/mqdefault.jpg` : null;
}

function itemCandidates(item) {
  const candidates = [];
  addCandidate(candidates, item.poster_url, 'explicit_poster');

  let metadata = {};
  try {
    metadata = typeof item.metadata_json === 'string'
      ? JSON.parse(item.metadata_json)
      : item.metadata_json || {};
  } catch {
    metadata = {};
  }

  const image = metadata?.image;
  if (image && typeof image === 'object') {
    addCandidate(candidates, image.medium, 'tvmaze_medium');
    addCandidate(candidates, image.original, 'tvmaze_original');
  } else {
    addCandidate(candidates, image, 'metadata_image');
  }

  addCandidate(candidates, item.backdrop_url, 'explicit_backdrop');
  addCandidate(candidates, metadata?.backdrop, 'metadata_backdrop');
  addCandidate(candidates, youtubeThumbnail(item.platform_url), 'youtube_derived');
  return candidates;
}

function collectItems(data) {
  const values = [
    ...(Array.isArray(data.calmFeed) ? data.calmFeed : []),
    ...Object.values(data.categoryItems || {}).flatMap((items) => Array.isArray(items) ? items : []),
    ...Object.values(data.bundledEpisodes || {}).flatMap((items) => Array.isArray(items) ? items : []),
  ];
  return [...new Map(values.map((item) => [String(item.id), item])).values()];
}

function withTimeout(signalController) {
  return setTimeout(() => signalController.abort(), timeoutMs);
}

async function inspectUrl(url) {
  const request = async (method, headers = {}) => {
    const controller = new AbortController();
    const timer = withTimeout(controller);
    try {
      const response = await fetch(url, { method, headers, signal: controller.signal });
      const contentType = response.headers.get('content-type') || '';
      return {
        ok: response.ok && contentType.toLowerCase().includes('image'),
        status: response.status,
        contentType: contentType || null,
        method,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        contentType: null,
        method,
        error: error instanceof Error ? error.message : 'request failed',
      };
    } finally {
      clearTimeout(timer);
    }
  };

  const head = await request('HEAD');
  if (head.ok || (head.status !== 405 && head.status !== 501 && head.contentType)) return head;
  return request('GET', { Range: 'bytes=0-1' });
}

const data = JSON.parse(await readFile(mediaPath, 'utf8'));
const items = collectItems(data);
const itemRecords = items.map((item) => ({ item, candidates: itemCandidates(item) }));
const allUrls = [...new Set(itemRecords.flatMap(({ candidates }) => candidates.map(({ url }) => url)))].sort();
const urls = requestedLimit > 0 ? allUrls.slice(0, requestedLimit) : allUrls;
const checks = new Map();
let nextIndex = 0;

async function checkNext() {
  while (nextIndex < urls.length) {
    const url = urls[nextIndex++];
    checks.set(url, await inspectUrl(url));
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => checkNext()));

const reportItems = itemRecords.map(({ item, candidates }) => {
  const checkedCandidate = candidates.some(({ url }) => checks.has(url));
  const workingIndex = candidates.findIndex(({ url }) => checks.get(url)?.ok);
  const status = candidates.length === 0
    ? 'missing'
    : !checkedCandidate
      ? 'unverified'
    : workingIndex === 0
      ? 'healthy_primary'
      : workingIndex > 0
        ? 'healthy_alternate'
        : 'failed';
  const selected = workingIndex >= 0 ? candidates[workingIndex] : null;
  return {
    id: item.id,
    title: item.title,
    mediaType: item.media_type,
    parentShowId: item.parent_show_id ?? null,
    status,
    selectedUrl: selected?.url ?? null,
    selectedSource: selected?.source ?? null,
    candidates: candidates.map(({ url, source }) => ({
      url,
      source,
      ok: checks.get(url)?.ok ?? false,
    })),
  };
});

const byId = new Map(items.map((item) => [String(item.id), item]));
for (const record of reportItems) {
  if (record.mediaType !== 'episode' || !record.parentShowId) continue;
  const parent = byId.get(String(record.parentShowId));
  const parentCandidates = parent ? itemCandidates(parent) : [];
  const parentChecked = parentCandidates.some(({ url }) => checks.has(url));
  const parentHasArtwork = parentCandidates.some(({ url }) => checks.get(url)?.ok);
  record.parentArtwork = !parent
    ? 'missing'
    : !parentChecked
      ? 'unverified'
      : parentHasArtwork
        ? 'available'
        : 'missing';
}

const summary = reportItems.reduce((result, record) => {
  result[record.status] = (result[record.status] || 0) + 1;
  if (record.selectedSource) result[record.selectedSource] = (result[record.selectedSource] || 0) + 1;
  return result;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  totalItems: items.length,
  uniqueImageUrls: allUrls.length,
  checkedImageUrls: urls.length,
  truncated: urls.length < allUrls.length,
  summary,
  items: reportItems,
};

if (reportPath) {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`media-assets: report written to ${reportPath}`);
}

console.log(`media-assets: checked ${urls.length}/${allUrls.length} image URLs across ${items.length} media items`);
if (urls.length < allUrls.length) console.log('media-assets: set MEDIA_ASSET_CHECK_LIMIT=0 to check all URLs');
console.log(`media-assets: summary ${JSON.stringify(summary)}`);

const failures = reportItems.filter((record) => record.status === 'failed');
const localFallbacks = reportItems.filter((record) => record.status === 'missing');
if (localFallbacks.length) {
  console.log(`media-assets: ${localFallbacks.length} items have no remote artwork and will use local fallback covers`);
  localFallbacks.slice(0, 50).forEach((record) => console.log(`  ${record.id} ${record.title}`));
}
if (failures.length) {
  console.error(`media-assets: ${failures.length} items have failed remote artwork candidates`);
  failures.slice(0, 50).forEach((record) => console.error(`  ${record.id} ${record.title}`));
  process.exitCode = 1;
} else {
  console.log('media-assets: ok');
}
