import pg from 'pg';
import { attachDatabasePool } from '@vercel/functions';

/**
 * Postgres access for the waitlist.
 *
 * Works with any standard Postgres URL (Neon via the Vercel Marketplace,
 * Supabase, Railway, self-hosted...). Reads DATABASE_URL, falling back to the
 * POSTGRES_URL variable that the Vercel/Neon integration injects.
 *
 * Schema changes are additive, versioned migrations that only ever run
 * CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS. Nothing here drops,
 * truncates or rewrites existing waitlist rows, so deployments never lose data.
 */

const { Pool } = pg;

export class ConfigError extends Error {}

let pool: pg.Pool | null = null;
let schemaReady: Promise<void> | null = null;

function connectionString(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new ConfigError('DATABASE_URL is not set');
  }
  return url;
}

function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString(),
      // Serverless functions run many small instances; keep each one light.
      max: Number(process.env.PG_POOL_MAX) || 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
    pool.on('error', (err) => {
      console.error('[db] idle client error', err.message);
    });
    // On Vercel Fluid compute, release idle clients before the instance suspends
    // so connections are not leaked. No-op outside Vercel (local dev/preview).
    attachDatabasePool(pool);
  }
  return pool;
}

/** Ordered, append-only migrations. Never edit or remove an entry once shipped. */
const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS waitlist_entries (
        id          BIGSERIAL PRIMARY KEY,
        full_name   TEXT        NOT NULL,
        email       TEXT        NOT NULL,
        whatsapp    TEXT,
        ip_hash     TEXT,
        user_agent  TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS waitlist_entries_email_key
        ON waitlist_entries (lower(email));
      CREATE INDEX IF NOT EXISTS waitlist_entries_created_at_idx
        ON waitlist_entries (created_at DESC);

      CREATE TABLE IF NOT EXISTS rate_limit_events (
        id          BIGSERIAL PRIMARY KEY,
        bucket      TEXT        NOT NULL,
        key_hash    TEXT        NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS rate_limit_events_lookup_idx
        ON rate_limit_events (bucket, key_hash, created_at);
    `,
  },
];

async function migrate(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    // Serialise concurrent cold starts so two instances never race on DDL.
    await client.query('SELECT pg_advisory_xact_lock(727274001)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ version: number }>('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((r) => Number(r.version)));
    for (const m of MIGRATIONS) {
      if (applied.has(m.version)) continue;
      await client.query(m.sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [m.version]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Ensures the schema exists (once per function instance), then returns the pool. */
export async function db(): Promise<pg.Pool> {
  const p = getPool();
  if (!schemaReady) {
    schemaReady = migrate().catch((err) => {
      schemaReady = null; // retry on the next request
      throw err;
    });
  }
  await schemaReady;
  return p;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    schemaReady = null;
  }
}
