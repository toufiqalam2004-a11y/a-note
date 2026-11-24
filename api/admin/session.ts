import { hasValidSession, isAdminConfigured } from '../../server/auth.js';
import { json } from '../../server/http.js';

/** GET /api/admin/session -> { configured, authenticated } */
export function GET(request: Request): Response {
  return json({ ok: true, configured: isAdminConfigured(), authenticated: hasValidSession(request) });
}
