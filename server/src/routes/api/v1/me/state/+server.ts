import type { RequestHandler } from './$types';
import { apiError, errorResponse, okResponse, readJsonBody, requestId } from '$lib/server/api';
import { requireUser } from '$lib/server/clerk';
import { assertBaseRevision, emptyState, normalizeState, readUserState, replaceUserState, withUserLock, type ZaenState } from '$lib/server/state';

function stateFromBody(body: Record<string, unknown>): unknown {
  if (body.state && typeof body.state === 'object') return body.state;
  throw apiError('INVALID_STATE', 'The request must include a state object.', 400);
}

export const GET: RequestHandler = async ({ request }) => {
  const id = requestId();
  try {
    const { userId } = await requireUser(request);
    return okResponse({ state: await readUserState(userId) }, { headers: { 'cache-control': 'no-store', 'x-request-id': id } });
  } catch (err) {
    return errorResponse(err, id);
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  const id = requestId();
  try {
    const { userId } = await requireUser(request);
    const body = await readJsonBody(request);
    const result = await withUserLock(userId, async () => {
      const current = await readUserState(userId);
      assertBaseRevision(body, current);
      const input = stateFromBody(body) as ZaenState;
      const next = normalizeState({ ...input, revision: current.revision + 1, updatedAt: new Date().toISOString() }, current.revision + 1);
      return replaceUserState(userId, next);
    });
    return okResponse({ state: result }, { headers: { 'cache-control': 'no-store', 'x-request-id': id } });
  } catch (err) {
    return errorResponse(err, id);
  }
};

