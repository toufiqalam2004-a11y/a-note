import { clearSessionCookie } from '../../server/auth.js';
import { assertSameOrigin, BadRequest, errorJson, json, methodNotAllowed } from '../../server/http.js';

/** POST /api/admin/logout */
export function POST(request: Request): Response {
  try {
    assertSameOrigin(request);
  } catch (err) {
    if (err instanceof BadRequest) return errorJson(err.status, err.code, err.message);
    throw err;
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
}

export function GET(): Response {
  return methodNotAllowed(['POST']);
}
