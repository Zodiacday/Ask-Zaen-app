import { createClerkClient, verifyToken } from '@clerk/backend';
import { apiError } from './api';
import { runtimeEnv } from './runtime-env';

export type AuthenticatedUser = { userId: string };

function secretKey(): string | null {
  return runtimeEnv('CLERK_SECRET_KEY')?.trim() || null;
}

function authorizedParties(): string[] | undefined {
  const values = runtimeEnv('CLERK_AUTHORIZED_PARTIES')?.split(',').map((value) => value.trim()).filter(Boolean);
  return values?.length ? values : undefined;
}

export function clerkConfigured(): boolean {
  return Boolean(secretKey());
}

export function clerk() {
  const key = secretKey();
  if (!key) throw apiError('AUTH_NOT_CONFIGURED', 'Authentication is not configured on this service.', 503);
  return createClerkClient({ secretKey: key });
}

export async function requireUser(request: Request): Promise<AuthenticatedUser> {
  const key = secretKey();
  if (!key) throw apiError('AUTH_NOT_CONFIGURED', 'Authentication is not configured on this service.', 503);

  const authorization = request.headers.get('authorization');
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw apiError('AUTH_REQUIRED', 'A valid Clerk session token is required.', 401);

  try {
    const claims = await verifyToken(token, {
      secretKey: key,
      jwtKey: runtimeEnv('CLERK_JWT_KEY')?.trim() || undefined,
      authorizedParties: authorizedParties(),
    });
    if (!claims.sub) throw new Error('Token does not contain a user id');
    return { userId: claims.sub };
  } catch {
    throw apiError('AUTH_INVALID', 'The Clerk session token is invalid or expired.', 401);
  }
}

