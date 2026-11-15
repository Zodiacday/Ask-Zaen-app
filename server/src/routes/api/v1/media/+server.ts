import type { RequestHandler } from './$types';
import { apiError, errorResponse, okResponse, requestId } from '$lib/server/api';
import {
  browseMedia,
  browseMediaPage,
  decodeCursor,
  encodeCursor,
  filterFingerprint,
  parseFilters,
  toPublicMedia,
} from '$lib/server/public-media';

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const GET: RequestHandler = async ({ url }) => {
  const id = requestId();
  try {
    const filters = parseFilters(url);
    const limit = Math.min(100, positiveInt(url.searchParams.get('limit'), 48));
    const cursorValue = url.searchParams.get('cursor');
    const cursorMode = cursorValue !== null || url.searchParams.get('pagination') === 'cursor' || !url.searchParams.has('page');

    if (cursorMode) {
      const cursor = cursorValue ? decodeCursor(cursorValue) : null;
      const fingerprint = filterFingerprint(filters);
      if (cursor && cursor.fingerprint !== fingerprint) {
        throw apiError('INVALID_CURSOR', 'The pagination cursor is invalid.', 400);
      }
      const result = browseMedia(filters, limit, cursor);
      const cacheControl = filters.sort === 'recommended'
        ? 'private, no-store'
        : 'public, max-age=30, s-maxage=120';
      const last = result.rows[result.rows.length - 1];
      const nextCursor = result.hasMore && last
        ? encodeCursor({
            v: 2,
            fingerprint,
            mode: result.mode,
            key: result.mode === 'newest'
              ? last.id
              : result.mode === 'relevance'
                ? Number(last.relevance)
                : result.mode === 'recommended'
                  ? Number(last.rotation_band)
                : Number(last.sort_score),
            ...(result.mode === 'recommended'
              ? { tie: Number(last.rotation_key) }
              : {}),
            id: last.id,
          })
        : null;
      return okResponse(
        { items: result.rows.map(toPublicMedia), limit, hasMore: result.hasMore, nextCursor },
        { headers: { 'cache-control': cacheControl, 'x-request-id': id } }
      );
    }

    const page = positiveInt(url.searchParams.get('page'), 1);
    const result = browseMediaPage(filters, limit, page);
    const cacheControl = filters.sort === 'recommended'
      ? 'private, no-store'
      : 'public, max-age=30, s-maxage=120';
    return okResponse(
      {
        items: result.rows.map(toPublicMedia),
        page,
        pages: Math.max(1, Math.ceil(result.total / limit)),
        total: result.total,
        limit,
      },
      { headers: { 'cache-control': cacheControl, 'x-request-id': id } }
    );
  } catch (err) {
    return errorResponse(err, id);
  }
};

