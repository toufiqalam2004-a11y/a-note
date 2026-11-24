import { adminNotConfigured, checkPassword, createSessionCookie, isAdminConfigured } from '../../server/auth.js';
import { ConfigError, db } from '../../server/db.js';
import { BadRequest, clientIp, errorJson, hashIdentifier, json, methodNotAllowed, readJsonBody } from '../../server/http.js';
import { isRateLimited, recordEvent } from '../../server/rateLimit.js';

const MAX_FAILURES = 8; // failed logins per IP...
const WINDOW_SECONDS = 15 * 60; // ...per 15 minutes

/** POST /api/admin/login  Body: { password } */
export async function POST(request: Request): Promise<Response> {
  if (!isAdminConfigured()) return adminNotConfigured();
  try {
    const body = await readJsonBody(request);
    const password = typeof body.password === 'string' ? body.password : '';

    const pool = await db();
    const ipHash = hashIdentifier(clientIp(request));
    if (await isRateLimited(pool, 'admin_login_fail', ipHash, MAX_FAILURES, WINDOW_SECONDS)) {
      return errorJson(429, 'rate_limited', 'Too many failed attempts. Try again in 15 minutes.', {
        'Retry-After': String(WINDOW_SECONDS),
      });
    }

    if (!password || password.length > 512 || !checkPassword(password)) {
      await recordEvent(pool, 'admin_login_fail', ipHash);
      return errorJson(401, 'invalid_credentials', 'Incorrect password.');
    }

    return json({ ok: true }, 200, { 'Set-Cookie': createSessionCookie() });
  } catch (err) {
    if (err instanceof BadRequest) return errorJson(err.status, err.code, err.message);
    if (err instanceof ConfigError) return errorJson(503, 'unavailable', 'Database is not configured.');
    console.error('[admin/login] unexpected error:', err);
    return errorJson(500, 'server_error', 'Something went wrong. Please try again.');
  }
}

export function GET(): Response {
  return methodNotAllowed(['POST']);
}
