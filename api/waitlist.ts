import { ConfigError, db } from '../server/db.js';
import { BadRequest, clientIp, errorJson, hashIdentifier, json, methodNotAllowed, readJsonBody } from '../server/http.js';
import { isRateLimited, recordEvent } from '../server/rateLimit.js';
import { validateWaitlist } from '../server/validation.js';

/**
 * POST /api/waitlist
 * Body: { fullName, email, whatsapp?, website (honeypot), startedAt (ms epoch when the form rendered) }
 */

const MIN_FILL_MS = 2500; // humans don't fill three fields in under 2.5s
const RATE_LIMIT = 5; // submissions per IP...
const RATE_WINDOW_SECONDS = 10 * 60; // ...per 10 minutes

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonBody(request);

    // Spam trap 1: hidden honeypot field that real visitors never see or fill.
    // Spam trap 2: submissions made faster than a person could type.
    // Bots get a normal-looking success so they don't learn to adapt.
    const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
    const startedAt = Number(body.startedAt);
    const elapsed = Date.now() - startedAt;
    if (honeypot || !Number.isFinite(startedAt) || elapsed < MIN_FILL_MS) {
      return json({ ok: true }, 201);
    }

    const { data, errors } = validateWaitlist(body);
    if (!data) {
      return json({ ok: false, code: 'validation_error', error: 'Please check the highlighted fields.', fields: errors }, 422);
    }

    const pool = await db();
    const ipHash = hashIdentifier(clientIp(request));

    if (await isRateLimited(pool, 'waitlist', ipHash, RATE_LIMIT, RATE_WINDOW_SECONDS)) {
      return errorJson(429, 'rate_limited', 'Too many attempts. Please wait a few minutes and try again.', {
        'Retry-After': String(RATE_WINDOW_SECONDS),
      });
    }
    await recordEvent(pool, 'waitlist', ipHash);

    const userAgent = (request.headers.get('user-agent') || '').slice(0, 300) || null;
    const result = await pool.query<{ id: string; created_at: string }>(
      `INSERT INTO waitlist_entries (full_name, email, whatsapp, ip_hash, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ((lower(email))) DO NOTHING
       RETURNING id, created_at`,
      [data.fullName, data.email, data.whatsapp, ipHash, userAgent],
    );

    if (result.rowCount === 0) {
      return json(
        {
          ok: false,
          code: 'duplicate_email',
          error: "This email is already on the waitlist. We'll be in touch soon!",
          fields: { email: 'This email is already registered.' },
        },
        409,
      );
    }

    return json({ ok: true }, 201);
  } catch (err) {
    if (err instanceof BadRequest) return errorJson(err.status, err.code, err.message);
    if (err instanceof ConfigError) {
      console.error('[waitlist] configuration error:', err.message);
      return errorJson(503, 'unavailable', 'The waitlist is temporarily unavailable. Please try again later.');
    }
    console.error('[waitlist] unexpected error:', err);
    return errorJson(500, 'server_error', 'Something went wrong on our side. Please try again.');
  }
}

export function GET(): Response {
  return methodNotAllowed(['POST']);
}
