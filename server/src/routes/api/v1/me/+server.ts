import type { RequestHandler } from './$types';
import { errorResponse, okResponse, requestId } from '$lib/server/api';
import { requireUser } from '$lib/server/clerk';
import { deleteUserAccount, readUserProfile } from '$lib/server/state';

export const GET: RequestHandler = async ({ request }) => {
  const id = requestId();
  try {
    const { userId } = await requireUser(request);
    const profile = await readUserProfile(userId);
    return okResponse({ userId: profile.userId, displayName: profile.displayName, email: profile.email, stateRevision: profile.state.revision }, { headers: { 'cache-control': 'no-store', 'x-request-id': id } });
  } catch (err) {
    return errorResponse(err, id);
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  const id = requestId();
  try {
    const { userId } = await requireUser(request);
    await deleteUserAccount(userId);
    return okResponse({ deleted: true }, { headers: { 'cache-control': 'no-store', 'x-request-id': id } });
  } catch (err) {
    return errorResponse(err, id);
  }
};

