import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';

export class ApiHttpError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

export function apiError(code: string, message: string, status = 400, details?: unknown): ApiHttpError {
  return new ApiHttpError(code, message, status, details);
}

export function requestId(): string {
  return randomUUID();
}

export function errorResponse(err: unknown, id: string) {
  const apiErr = err instanceof ApiHttpError
    ? err
    : new ApiHttpError('INTERNAL_ERROR', 'An unexpected server error occurred.', 500);

  if (!(err instanceof ApiHttpError)) {
    console.error(`[${id}]`, err);
  }

  const body: { error: { code: string; message: string; requestId: string; latestState?: unknown } } = {
    error: { code: apiErr.code, message: apiErr.message, requestId: id },
  };
  if (apiErr.code === 'STALE_STATE' && apiErr.details !== undefined) {
    body.error.latestState = apiErr.details;
  }

  return json(
    body,
    { status: apiErr.status, headers: { 'x-request-id': id } }
  );
}

export function okResponse<T>(body: T, init?: ResponseInit) {
  return json(body, init);
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw apiError('INVALID_BODY', 'The request body must be a JSON object.', 400);
    }
    return body as Record<string, unknown>;
  } catch (err) {
    if (err instanceof ApiHttpError) throw err;
    throw apiError('INVALID_BODY', 'The request body must contain valid JSON.', 400);
  }
}

