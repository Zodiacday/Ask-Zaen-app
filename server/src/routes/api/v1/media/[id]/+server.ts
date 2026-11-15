import type { RequestHandler } from './$types';
import { apiError, errorResponse, okResponse, requestId } from '$lib/server/api';
import { getPublicMediaById, toPublicMedia } from '$lib/server/public-media';

export const GET: RequestHandler = async ({ params }) => {
  const id = requestId();
  try {
    const mediaId = Number(params.id);
    if (!Number.isInteger(mediaId) || mediaId <= 0) throw apiError('INVALID_ID', 'The media ID is invalid.', 400);
    const result = getPublicMediaById(mediaId);
    if (!result) throw apiError('NOT_FOUND', 'Media item not found.', 404);
    const item = toPublicMedia(result.row);
    const episodes = result.episodes.map(toPublicMedia);
    return okResponse(
      { ...item, hasEpisodes: episodes.length > 0, episodeCount: episodes.length, seasonCount: new Set(episodes.map((episode) => episode.seasonNumber ?? 1)).size, episodes },
      { headers: { 'cache-control': 'public, max-age=60, s-maxage=300', 'x-request-id': id } }
    );
  } catch (err) {
    return errorResponse(err, id);
  }
};

