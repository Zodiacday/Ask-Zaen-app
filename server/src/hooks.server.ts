import type { Handle } from '@sveltejs/kit';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://www.askzaen.com',
  'https://askzaen.com',
  'http://localhost:8081',
  'http://localhost:8083',
  'http://localhost:5173',
];

function allowedOrigins(): Set<string> {
  const configured = process.env.CORS_ALLOWED_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set(configured && configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function applyCorsHeaders(headers: Headers, origin: string): void {
  headers.set('access-control-allow-origin', origin);
  headers.set('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('access-control-allow-headers', 'Authorization, Content-Type');
  headers.set('access-control-expose-headers', 'x-request-id');
  headers.set('access-control-max-age', '600');
  headers.append('vary', 'Origin');
}

export const handle: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith('/api/v1')) {
    return resolve(event);
  }

  const origin = event.request.headers.get('origin');
  const isAllowedOrigin = origin ? allowedOrigins().has(origin) : false;

  if (event.request.method === 'OPTIONS') {
    const headers = new Headers();
    if (isAllowedOrigin && origin) {
      applyCorsHeaders(headers, origin);
    }
    return new Response(null, {
      status: isAllowedOrigin ? 204 : 403,
      headers,
    });
  }

  const response = await resolve(event);
  if (!isAllowedOrigin || !origin) {
    return response;
  }

  const headers = new Headers(response.headers);
  applyCorsHeaders(headers, origin);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
