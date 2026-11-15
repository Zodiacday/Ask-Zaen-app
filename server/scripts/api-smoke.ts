const baseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:4173/api/v1';

async function get(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`${path} returned non-JSON content type: ${contentType || 'missing'}`);
  }
  const body = await response.json();
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function options(origin: string) {
  return fetch(`${baseUrl}/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization, Content-Type',
    },
  });
}

async function status(path: string) {
  const response = await fetch(`${baseUrl}${path}`);
  return response.status;
}

const health = await get('/health');
const page = await get('/media?page=1&limit=2');
const first = await get('/media?pagination=cursor&limit=2');
const second = first.nextCursor
  ? await get(`/media?pagination=cursor&limit=2&cursor=${encodeURIComponent(first.nextCursor)}`)
  : { items: [] };
const detail = await get(`/media/${page.items[0].id}`);
const rotationParams = 'pagination=cursor&limit=2&sort=recommended&rotationDate=2026-11-15&rotationSeed=0123456789abcdef0123456789abcdef&rotationSurface=discover';
const recommended = await get(`/media?${rotationParams}`);
const recommendedRepeat = await get(`/media?${rotationParams}`);
const recommendedNext = recommended.nextCursor
  ? await get(`/media?${rotationParams}&cursor=${encodeURIComponent(recommended.nextCursor)}`)
  : { items: [] };
const recommendedIds = [...recommended.items, ...recommendedNext.items].map((item: any) => item.id);
const recommendedMismatch = await status(
  `/media?${rotationParams.replace('2026-11-15', '2026-11-16')}&cursor=${encodeURIComponent(recommended.nextCursor || '')}`
);

if (health.status !== 'ok') throw new Error('Health check failed');
if (page.items.some((item: any) => item.mediaType === 'episode')) throw new Error('Browse returned an episode');
if (page.items.some((item: any) => Object.prototype.hasOwnProperty.call(item, 'metadataJson'))) throw new Error('Raw metadata leaked');
if (new Set([...first.items, ...second.items].map((item: any) => item.id)).size !== first.items.length + second.items.length) throw new Error('Cursor duplicated an item');
if (!Array.isArray(detail.episodes)) throw new Error('Detail response is missing episodes');
if ((recommended.items || []).some((item: any) => item.mediaType === 'episode' || item.stimulationLabel === 'high')) throw new Error('Recommended browse returned hidden media');
if ((recommendedRepeat.items || []).map((item: any) => item.id).join(',') !== (recommended.items || []).map((item: any) => item.id).join(',')) throw new Error('Recommended ordering is not deterministic');
if (new Set(recommendedIds).size !== recommendedIds.length) throw new Error('Recommended cursor duplicated an item');
if (recommendedMismatch !== 400) throw new Error(`Recommended cursor mismatch returned ${recommendedMismatch}`);

const corsPreflight = await options('http://localhost:8083');
if (corsPreflight.status !== 204) throw new Error(`CORS preflight returned ${corsPreflight.status}`);
if (corsPreflight.headers.get('access-control-allow-origin') !== 'http://localhost:8083') {
  throw new Error('CORS preflight did not allow the configured localhost origin');
}

const blockedPreflight = await options('https://example.invalid');
if (blockedPreflight.status !== 403) throw new Error(`Disallowed CORS preflight returned ${blockedPreflight.status}`);
if (blockedPreflight.headers.has('access-control-allow-origin')) {
  throw new Error('Disallowed CORS origin was granted access');
}

console.log(JSON.stringify({
  health,
  pageItems: page.items.length,
  cursorItems: first.items.length + second.items.length,
  recommendedItems: recommendedIds.length,
  detailId: detail.id,
  cors: 'ok',
}, null, 2));

