import { requireAdmin } from '../../server/auth.js';
import { buildWhere, orderBy, parseFilters } from '../../server/adminQuery.js';
import { ConfigError, db } from '../../server/db.js';
import { errorJson } from '../../server/http.js';

/** Quote a CSV cell and neutralise spreadsheet formula injection (=, +, -, @, tab, CR). */
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** GET /api/admin/export?<same filters as /api/admin/waitlist>  -> text/csv download */
export async function GET(request: Request): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const filters = parseFilters(new URL(request.url));
    const { where, params } = buildWhere(filters);
    const pool = await db();
    const { rows } = await pool.query(
      `SELECT id::text, full_name, email, whatsapp, created_at
         FROM waitlist_entries ${where} ${orderBy(filters)}`,
      params,
    );

    const lines = [
      ['ID', 'Full Name', 'Email', 'WhatsApp', 'Registered At (UTC)'].map(csvCell).join(','),
      ...rows.map((r) =>
        [r.id, r.full_name, r.email, r.whatsapp ?? '', new Date(r.created_at).toISOString()].map(csvCell).join(','),
      ),
    ];
    // BOM so Excel opens UTF-8 names correctly.
    const csv = `﻿${lines.join('\r\n')}\r\n`;
    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="anote-waitlist-${stamp}.csv"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (err) {
    if (err instanceof ConfigError) return errorJson(503, 'unavailable', 'Database is not configured.');
    console.error('[admin/export] unexpected error:', err);
    return errorJson(500, 'server_error', 'Could not export the waitlist.');
  }
}
