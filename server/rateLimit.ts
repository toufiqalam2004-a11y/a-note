import type pg from 'pg';

/**
 * Fixed-window rate limiting backed by Postgres, so limits hold across every
 * serverless instance. Returns true when the caller is over the limit.
 */
export async function isRateLimited(
  pool: pg.Pool,
  bucket: string,
  keyHash: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM rate_limit_events
      WHERE bucket = $1 AND key_hash = $2 AND created_at > now() - make_interval(secs => $3)`,
    [bucket, keyHash, windowSeconds],
  );
  return Number(rows[0]?.count ?? 0) >= limit;
}

export async function recordEvent(pool: pg.Pool, bucket: string, keyHash: string): Promise<void> {
  await pool.query('INSERT INTO rate_limit_events (bucket, key_hash) VALUES ($1, $2)', [bucket, keyHash]);
  // Occasionally prune rate-limit events older than a day (never touches waitlist data).
  if (Math.random() < 0.05) {
    await pool
      .query(`DELETE FROM rate_limit_events WHERE created_at < now() - interval '1 day'`)
      .catch(() => {});
  }
}
