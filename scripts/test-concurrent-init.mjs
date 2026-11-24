/**
 * Cold-start race test for schema initialisation against a REAL Postgres.
 * Spawns N separate Node processes (like N serverless instances) that all run
 * the migration and insert one row at the same moment.
 *
 * Run it ONLY against a disposable Neon dev branch, never the production DB:
 *   $env:DATABASE_URL="<neon dev-branch pooled URL>"; node scripts/test-concurrent-init.mjs --confirm-test-db
 *
 * Requires Node 23.6+ (native TypeScript type-stripping). Inserts rows with
 * @example.invalid emails; deletes nothing.
 */
import { spawn } from 'node:child_process';
import pg from 'pg';

if (!process.argv.includes('--confirm-test-db')) {
  console.error('Refusing to run: pass --confirm-test-db to confirm DATABASE_URL is a disposable test branch.');
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(2);
}

const N = 12;
const run = Date.now().toString(36);
const worker = `
  const { db, closeDb } = await import(${JSON.stringify(new URL('../server/db.ts', import.meta.url).href)});
  const pool = await db();
  await pool.query("INSERT INTO waitlist_entries (full_name, email) VALUES ($1, $2) ON CONFLICT ((lower(email))) DO NOTHING",
    ['Concurrency Test', 'concurrency-' + process.argv[1] + '-${run}@example.invalid']);
  await closeDb();
`;

const results = await Promise.all(
  Array.from({ length: N }, (_, i) =>
    new Promise((resolve) => {
      const p = spawn(process.execPath, ['--no-warnings', '--input-type=module', '-e', worker, String(i)], { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d) => (err += d));
      p.on('exit', (code) => resolve({ i, code, err: err.split('\n').find((l) => /error/i.test(l)) }));
    }),
  ),
);

const failed = results.filter((r) => r.code !== 0);
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const migrations = (await c.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map((r) => r.version);
const inserted = (await c.query('SELECT count(*)::int AS n FROM waitlist_entries WHERE email LIKE $1', [`%-${run}@example.invalid`])).rows[0].n;
await c.end();

console.log({ workers: N, failedWorkers: failed.length, migrations, rowsInserted: inserted });
failed.forEach((f) => console.log(`  worker ${f.i}: ${f.err}`));
const ok = failed.length === 0 && inserted === N && migrations.length === new Set(migrations).size;
console.log(ok ? 'PASS: concurrent cold starts are safe' : 'FAIL');
process.exit(ok ? 0 : 1);
