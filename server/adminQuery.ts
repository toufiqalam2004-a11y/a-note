/**
 * Shared search / filter parsing for the admin list and CSV export, so both
 * always return exactly the same set of rows. Every value is passed to
 * Postgres as a bound parameter; only whitelisted column names are inlined.
 */

export interface AdminFilters {
  q: string;
  whatsapp: 'any' | 'yes' | 'no';
  from: string | null; // YYYY-MM-DD (inclusive, in tz)
  to: string | null; // YYYY-MM-DD (inclusive, in tz)
  sort: 'newest' | 'oldest' | 'name' | 'email';
  tz: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validTimeZone(tz: string): boolean {
  if (!tz || tz.length > 64 || !/^[A-Za-z0-9_+\-/]+$/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function validDate(value: string | null): string | null {
  if (!value || !DATE_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : value;
}

export function parseFilters(url: URL): AdminFilters {
  const p = url.searchParams;
  const whatsapp = p.get('whatsapp');
  const sort = p.get('sort');
  const tz = p.get('tz') || 'UTC';
  return {
    q: (p.get('q') || '').trim().slice(0, 100),
    whatsapp: whatsapp === 'yes' || whatsapp === 'no' ? whatsapp : 'any',
    from: validDate(p.get('from')),
    to: validDate(p.get('to')),
    sort: sort === 'oldest' || sort === 'name' || sort === 'email' ? sort : 'newest',
    tz: validTimeZone(tz) ? tz : 'UTC',
  };
}

export function buildWhere(f: AdminFilters): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (f.q) {
    // Escape LIKE wildcards so the search is literal.
    params.push(`%${f.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    const i = params.length;
    clauses.push(`(full_name ILIKE $${i} OR email ILIKE $${i} OR coalesce(whatsapp, '') ILIKE $${i})`);
  }
  if (f.whatsapp === 'yes') clauses.push('whatsapp IS NOT NULL');
  if (f.whatsapp === 'no') clauses.push('whatsapp IS NULL');
  if (f.from) {
    params.push(f.from, f.tz);
    clauses.push(`created_at >= ($${params.length - 1}::date)::timestamp AT TIME ZONE $${params.length}`);
  }
  if (f.to) {
    params.push(f.to, f.tz);
    clauses.push(`created_at < (($${params.length - 1}::date + 1))::timestamp AT TIME ZONE $${params.length}`);
  }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

export function orderBy(f: AdminFilters): string {
  switch (f.sort) {
    case 'oldest':
      return 'ORDER BY created_at ASC, id ASC';
    case 'name':
      return 'ORDER BY lower(full_name) ASC, id ASC';
    case 'email':
      return 'ORDER BY lower(email) ASC, id ASC';
    default:
      return 'ORDER BY created_at DESC, id DESC';
  }
}
