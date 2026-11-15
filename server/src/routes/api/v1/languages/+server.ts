import type { RequestHandler } from './$types';
import { errorResponse, okResponse, requestId } from '$lib/server/api';
import { getPublicLanguages } from '$lib/server/public-media';

export const GET: RequestHandler = async () => {
  const id = requestId();
  try {
    return okResponse({ items: getPublicLanguages() }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300', 'x-request-id': id } });
  } catch (err) {
    return errorResponse(err, id);
  }
};

