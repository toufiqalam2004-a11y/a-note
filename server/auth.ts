import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { errorJson } from './http.js';

/**
 * Admin authentication.
 *
 * - The password lives only in the ADMIN_PASSWORD server environment variable.
 * - A successful login sets an HttpOnly, Secure, SameSite=Strict cookie holding
 *   an HMAC-signed expiry (signed with ADMIN_SESSION_SECRET). Nothing secret is
 *   ever sent to, or stored by, the browser's JavaScript.
 * - Changing ADMIN_PASSWORD or ADMIN_SESSION_SECRET invalidates every session.
 */

export const SESSION_COOKIE = 'anote_admin';
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours

interface AdminConfig {
  password: string;
  secret: string;
}

function adminConfig(): AdminConfig | null {
  const password = process.env.ADMIN_PASSWORD || '';
  const secret = process.env.ADMIN_SESSION_SECRET || '';
  if (password.length < 12 || secret.length < 32) return null;
  return { password, secret };
}

export function adminNotConfigured(): Response {
  return errorJson(
    503,
    'admin_not_configured',
    'Admin access is not configured. Set ADMIN_PASSWORD (12+ chars) and ADMIN_SESSION_SECRET (32+ chars).',
  );
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function passwordFingerprint(cfg: AdminConfig): string {
  return createHmac('sha256', cfg.secret).update(`pw:${cfg.password}`).digest('base64url').slice(0, 16);
}

export function isAdminConfigured(): boolean {
  return adminConfig() !== null;
}

export function checkPassword(candidate: string): boolean {
  const cfg = adminConfig();
  if (!cfg) return false;
  // Hash both sides so the comparison is constant-time regardless of length.
  return timingSafeEqual(sha256(candidate), sha256(cfg.password));
}

export function createSessionCookie(): string {
  const cfg = adminConfig();
  if (!cfg) throw new Error('Admin not configured');
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${exp}.${passwordFingerprint(cfg)}`;
  const token = `${payload}.${sign(payload, cfg.secret)}`;
  return `${SESSION_COOKIE}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

export function hasValidSession(request: Request): boolean {
  const cfg = adminConfig();
  if (!cfg) return false;
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [expStr, fingerprint, signature] = parts;
  const expected = Buffer.from(sign(`${expStr}.${fingerprint}`, cfg.secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  if (fingerprint !== passwordFingerprint(cfg)) return false;
  const exp = Number(expStr);
  return Number.isFinite(exp) && exp > Math.floor(Date.now() / 1000);
}

/** Returns an error Response when the request is not from a signed-in admin, otherwise null. */
export function requireAdmin(request: Request): Response | null {
  if (!isAdminConfigured()) return adminNotConfigured();
  if (!hasValidSession(request)) return errorJson(401, 'unauthorized', 'Please sign in.');
  return null;
}
