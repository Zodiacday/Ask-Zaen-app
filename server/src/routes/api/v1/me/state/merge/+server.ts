import type { RequestHandler } from './$types';
import { apiError, errorResponse, okResponse, readJsonBody, requestId } from '$lib/server/api';
import { requireUser } from '$lib/server/clerk';
import { assertBaseRevision, mergeStates, readUserState, replaceUserState, withUserLock } from '$lib/server/state';

export const POST: RequestHandler = async ({ request }) => {
  const id = requestId();
  try {
    const { userId } = await requireUser(request);
    const body = await readJsonBody(request);
    const snapshot = body.snapshot ?? body.state;
    if (!snapshot || typeof snapshot !== 'object') throw apiError('INVALID_STATE', 'The request must include a snapshot object.', 400);
    const result = await withUserLock(userId, async () => {
      const current = await readUserState(userId);
      assertBaseRevision(body, current);
      const next = mergeStates(current, snapshot);
      return replaceUserState(userId, next);
    });
    return okResponse({ state: result }, { headers: { 'cache-control': 'no-store', 'x-request-id': id } });
  } catch (err) {
    return errorResponse(err, id);
  }
};

