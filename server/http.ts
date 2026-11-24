import { createHash } from 'node:crypto';

const BASE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex',
};

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

export function errorJson(status: number, code: string, message: string, extraHeaders: Record<string, string> = {}): Response {
  return json({ ok: false, code, error: message }, status, extraHeaders);
}

export function methodNotAllowed(allowed: string[]): Response {
  return errorJson(405, 'method_not_allowed', 'Method not allowed', { Allow: allowed.join(', ') });
}

export class BadRequest extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

const MAX_BODY_BYTES = 8 * 1024;

/**
 * CSRF defence-in-depth: browsers always send Origin on cross-site POSTs, so a
 * POST whose Origin host differs from the request host is refused. (Admin
 * cookies are also SameSite=Strict, and JSON bodies force a CORS preflight.)
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return; // non-browser clients (curl, server-to-server)
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new BadRequest('forbidden_origin', 'Cross-origin request refused', 403);
  }
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
  if (originHost !== host) throw new BadRequest('forbidden_origin', 'Cross-origin request refused', 403);
}

/** Reads a small JSON body. Rejects cross-origin requests and non-JSON content types. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  assertSameOrigin(request);
  const type = request.headers.get('content-type') || '';
  if (!type.toLowerCase().startsWith('application/json')) {
    throw new BadRequest('unsupported_media_type', 'Expected application/json', 415);
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new BadRequest('payload_too_large', 'Request body is too large', 413);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BadRequest('invalid_json', 'Request body must be valid JSON');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new BadRequest('invalid_json', 'Request body must be a JSON object');
  }
  return data as Record<string, unknown>;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** One-way hash so raw IP addresses are never stored. */
export function hashIdentifier(value: string): string {
  const salt = process.env.IP_HASH_SALT || process.env.ADMIN_SESSION_SECRET || 'a-note-waitlist';
  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}
