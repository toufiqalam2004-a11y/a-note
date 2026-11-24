/**
 * End-to-end checks for the waitlist API against a running server.
 *
 *   npm run db:local          # terminal 1 (local Postgres)
 *   npm run dev               # terminal 2 (or: npm run build && npm run preview)
 *   npm run test:waitlist     # terminal 3   (BASE_URL=http://localhost:4173 for preview)
 *
 * Reads ADMIN_PASSWORD from .env.local. Writes test rows to whatever database
 * the server is using, so only run it against a local/dev database.
 */
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const env = Object.fromEntries(
  (fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD;

let passed = 0;
let failed = 0;
function check(cond, msg, detail) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${msg}`);
  } else {
    failed++;
    console.log(`  FAIL  ${msg}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

const run = Date.now().toString(36);
const ip = () => `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

async function join(body, { ipAddr = ip(), contentType = 'application/json', raw } = {}) {
  const res = await fetch(`${BASE}/api/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'X-Forwarded-For': ipAddr },
    body: raw ?? JSON.stringify({ startedAt: Date.now() - 10_000, website: '', ...body }),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function admin(path, cookie, init = {}) {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { ...(init.headers || {}), ...(cookie ? { Cookie: cookie } : {}) } });
  return res;
}

const email = `qa.${run}@example.com`;

console.log(`\nWaitlist API checks against ${BASE}\n`);

console.log('Registration');
let r = await join({ fullName: 'QA Tester', email, whatsapp: '+880 1712-345678' });
check(r.status === 201 && r.data?.ok, 'valid registration is accepted (201)', r);

r = await join({ fullName: 'QA Tester Again', email: `  ${email.toUpperCase()} ` });
check(r.status === 409 && r.data?.code === 'duplicate_email', 'duplicate email (different case/spaces) is rejected (409)', r);

r = await join({ fullName: 'No Phone', email: `nophone.${run}@example.com` });
check(r.status === 201, 'WhatsApp is optional', r);

console.log('\nValidation');
r = await join({ fullName: 'Bad Email', email: 'not-an-email' });
check(r.status === 422 && r.data?.fields?.email, 'invalid email rejected (422)', r);
r = await join({ fullName: 'Bad Email', email: 'a@b' });
check(r.status === 422 && r.data?.fields?.email, 'email without TLD rejected', r);
r = await join({ fullName: '', email: `noname.${run}@example.com` });
check(r.status === 422 && r.data?.fields?.fullName, 'missing name rejected', r);
r = await join({ fullName: 'Buy now http://spam.example', email: `spam.${run}@example.com` });
check(r.status === 422 && r.data?.fields?.fullName, 'URL in name rejected', r);
r = await join({ fullName: 'Bad Phone', email: `badphone.${run}@example.com`, whatsapp: 'call me' });
check(r.status === 422 && r.data?.fields?.whatsapp, 'invalid WhatsApp rejected', r);
r = await join({}, { contentType: 'text/plain', raw: 'fullName=x' });
check(r.status === 415, 'non-JSON body rejected (415)', r);
r = await join({}, { raw: '{"fullName":' });
check(r.status === 400, 'malformed JSON rejected (400)', r);

console.log('\nSpam protection');
const honeyEmail = `honeypot.${run}@example.com`;
r = await join({ fullName: 'Bot', email: honeyEmail, website: 'http://bot.example' });
check(r.status === 201, 'honeypot submission gets a silent fake success', r);
const fastEmail = `fast.${run}@example.com`;
r = await join({ fullName: 'Fast Bot', email: fastEmail, startedAt: Date.now() });
check(r.status === 201, 'instant submission gets a silent fake success', r);
const flood = ip();
const statuses = [];
for (let i = 0; i < 7; i++) statuses.push((await join({ fullName: 'Flood', email: `flood${i}.${run}@example.com` }, { ipAddr: flood })).status);
check(statuses.slice(0, 5).every((s) => s === 201) && statuses.slice(5).every((s) => s === 429), 'per-IP rate limit kicks in after 5 attempts (429)', statuses);
let xo = await fetch(`${BASE}/api/waitlist`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', 'X-Forwarded-For': ip() },
  body: JSON.stringify({ fullName: 'Cross Site', email: `xsite.${run}@example.com`, startedAt: Date.now() - 10_000 }),
});
check(xo.status === 403, 'cross-origin POST to /api/waitlist is refused (403)', xo.status);
xo = await fetch(`${BASE}/api/admin/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', 'X-Forwarded-For': ip() },
  body: JSON.stringify({ password: ADMIN_PASSWORD }),
});
check(xo.status === 403 && !xo.headers.get('set-cookie'), 'cross-origin admin login is refused (CSRF)', xo.status);
xo = await fetch(`${BASE}/api/waitlist`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: BASE, 'X-Forwarded-For': ip() },
  body: JSON.stringify({ fullName: 'Same Site', email: `samesite.${run}@example.com`, startedAt: Date.now() - 10_000 }),
});
check(xo.status === 201, 'same-origin POST (as the real form sends) is accepted', xo.status);

console.log('\nAdmin security');
let res = await admin('/api/admin/waitlist');
check(res.status === 401, 'list without session is denied (401)', res.status);
res = await admin('/api/admin/export');
check(res.status === 401, 'CSV export without session is denied (401)', res.status);
res = await admin('/api/admin/waitlist', 'anote_admin=9999999999.forged.signature');
check(res.status === 401, 'forged session cookie is denied', res.status);
res = await admin('/api/admin/login', null, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip() }, body: JSON.stringify({ password: 'wrong-password-123' }) });
check(res.status === 401, 'wrong admin password is rejected', res.status);

res = await admin('/api/admin/login', null, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip() }, body: JSON.stringify({ password: ADMIN_PASSWORD }) });
const setCookie = res.headers.get('set-cookie') || '';
check(res.status === 200 && /HttpOnly/i.test(setCookie) && /SameSite=Strict/i.test(setCookie) && /Secure/i.test(setCookie), 'correct password returns HttpOnly/Secure/SameSite=Strict session cookie', { status: res.status, setCookie });
const cookie = setCookie.split(';')[0];

console.log('\nAdmin data');
res = await admin(`/api/admin/waitlist?q=${encodeURIComponent(`qa.${run}`)}`, cookie);
let list = await res.json();
check(res.status === 200 && list.matching === 1 && list.entries[0]?.email === email, 'search finds the registered email', list);
check(list.entries[0]?.whatsapp === '+8801712345678', 'WhatsApp number stored normalised', list.entries[0]);
check(typeof list.entries[0]?.createdAt === 'string' && Math.abs(Date.now() - Date.parse(list.entries[0].createdAt)) < 5 * 60_000, 'submission timestamp recorded', list.entries[0]);
check(list.stats.total >= 7, 'total registered count returned', list.stats);

res = await admin(`/api/admin/waitlist?q=${encodeURIComponent(run)}&pageSize=100`, cookie);
list = await res.json();
const stored = list.entries.map((e) => e.email);
check(!stored.includes(honeyEmail) && !stored.includes(fastEmail), 'spam submissions were never stored', stored);
check(list.matching === 8, 'exactly the 8 legitimate rows from this run are stored', list.matching);

res = await admin(`/api/admin/waitlist?q=${encodeURIComponent(run)}&whatsapp=yes`, cookie);
list = await res.json();
check(list.matching === 1, 'WhatsApp "provided" filter works', list.matching);
const today = new Date().toISOString().slice(0, 10);
res = await admin(`/api/admin/waitlist?q=${encodeURIComponent(run)}&from=2000-01-01&to=2000-01-02&tz=UTC`, cookie);
list = await res.json();
check(list.matching === 0, 'date range filter excludes out-of-range rows', list.matching);
res = await admin(`/api/admin/waitlist?q=${encodeURIComponent(run)}&from=${today}&tz=UTC`, cookie);
list = await res.json();
check(list.matching === 8, 'date range filter includes today', list.matching);

await join({ fullName: '=HYPERLINK("x") Name', email: `formula.${run}@example.com` });
res = await admin(`/api/admin/export?q=${encodeURIComponent(run)}`, cookie);
const csv = await res.text();
check(res.status === 200 && /text\/csv/.test(res.headers.get('content-type') || '') && /attachment/.test(res.headers.get('content-disposition') || ''), 'CSV export downloads as an attachment', res.headers.get('content-type'));
check(csv.includes(email) && csv.split('\r\n').filter(Boolean).length === 1 + 9, 'CSV contains header + every matching row', csv.split('\r\n').length);
check(csv.includes(`"'=HYPERLINK(""x"") Name"`), 'CSV neutralises spreadsheet formulas', csv.split('\r\n').find((l) => l.includes('HYPERLINK')));

res = await admin('/api/admin/logout', cookie, { method: 'POST' });
check(/Max-Age=0/.test(res.headers.get('set-cookie') || ''), 'logout clears the session cookie');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
