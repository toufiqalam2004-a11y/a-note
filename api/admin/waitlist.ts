import { requireAdmin } from '../../server/auth.js';
import { buildWhere, orderBy, parseFilters } from '../../server/adminQuery.js';
import { ConfigError, db } from '../../server/db.js';
import { errorJson, json } from '../../server/http.js';

/**
 * GET /api/admin/waitlist?q=&whatsapp=any|yes|no&from=YYYY-MM-DD&to=YYYY-MM-DD&sort=&page=&pageSize=&tz=
 * Returns the matching page of entries plus overall stats.
 */
export async function GET(request: Request): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const url = new URL(request.url);
    const filters = parseFilters(url);
    const pageSize = Math.min(Math.max(Number(url.searchParams.get('pageSize')) || 25, 1), 100);
    const page = Math.max(Math.floor(Number(url.searchParams.get('page')) || 1), 1);
    const { where, params } = buildWhere(filters);

    const pool = await db();

    const [rowsResult, countResult, statsResult] = await Promise.all([
      pool.query(
        `SELECT id::text, full_name, email, whatsapp, created_at
           FROM waitlist_entries ${where} ${orderBy(filters)}
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
      pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM waitlist_entries ${where}`, params),
      pool.query<{ total: string; today: string; week: string; with_whatsapp: string; latest: string | null }>(
        `SELECT count(*)::text AS total,
                count(*) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1)::text AS today,
                count(*) FILTER (WHERE created_at >= now() - interval '7 days')::text AS week,
                count(whatsapp)::text AS with_whatsapp,
                max(created_at)::text AS latest
           FROM waitlist_entries`,
        [filters.tz],
      ),
    ]);

    const s = statsResult.rows[0];
    const matching = Number(countResult.rows[0]?.count ?? 0);

    return json({
      ok: true,
      entries: rowsResult.rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        email: r.email,
        whatsapp: r.whatsapp,
        createdAt: new Date(r.created_at).toISOString(),
      })),
      matching,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(matching / pageSize)),
      stats: {
        total: Number(s.total),
        today: Number(s.today),
        last7Days: Number(s.week),
        withWhatsapp: Number(s.with_whatsapp),
        latestAt: s.latest ? new Date(s.latest).toISOString() : null,
      },
    });
  } catch (err) {
    if (err instanceof ConfigError) return errorJson(503, 'unavailable', 'Database is not configured.');
    console.error('[admin/waitlist] unexpected error:', err);
    return errorJson(500, 'server_error', 'Could not load the waitlist.');
  }
}
