import type { RequestHandler } from './$types';
import { errorResponse, okResponse, requestId } from '$lib/server/api';

export const GET: RequestHandler = async () => {
  const id = requestId();
  try {
    return okResponse({ status: 'ok' }, { headers: { 'cache-control': 'no-store', 'x-request-id': id } });
  } catch (err) {
    return errorResponse(err, id);
  }
};

