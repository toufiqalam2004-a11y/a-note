import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  RefreshCw,
  Search,
  Users,
  X,
} from 'lucide-react';

interface Entry {
  id: string;
  fullName: string;
  email: string;
  whatsapp: string | null;
  createdAt: string;
}

interface Stats {
  total: number;
  today: number;
  last7Days: number;
  withWhatsapp: number;
  latestAt: string | null;
}

interface ListResponse {
  entries: Entry[];
  matching: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: Stats;
}

interface Filters {
  q: string;
  whatsapp: 'any' | 'yes' | 'no';
  from: string;
  to: string;
  sort: 'newest' | 'oldest' | 'name' | 'email';
}

const EMPTY_FILTERS: Filters = { q: '', whatsapp: 'any', from: '', to: '', sort: 'newest' };
const PAGE_SIZE = 25;
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

class AuthError extends Error {}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', ...init });
  const data = await res.json().catch(() => null);
  if (res.status === 401) throw new AuthError(data?.error || 'Please sign in.');
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

function buildQuery(filters: Filters, extra: Record<string, string | number> = {}): string {
  const p = new URLSearchParams();
  if (filters.q.trim()) p.set('q', filters.q.trim());
  if (filters.whatsapp !== 'any') p.set('whatsapp', filters.whatsapp);
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);
  p.set('sort', filters.sort);
  p.set('tz', TZ);
  for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
  return p.toString();
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/* ------------------------------------------------------------------ */

function LoginScreen({ notConfigured, onSuccess }: { notConfigured: boolean; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    try {
      await api('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      setPassword('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/icon.png" alt="" className="w-11 h-11 rounded-xl border border-brand-border shadow-sm" />
          <div>
            <p className="text-lg font-bold text-brand-navy leading-none">A Note</p>
            <p className="text-xs text-brand-muted mt-1">Waitlist Admin</p>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-brand-border shadow-card p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-brand-purple" />
            <h1 className="text-lg font-bold text-brand-navy">Sign in</h1>
          </div>

          {notConfigured ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              Admin access isn't configured yet. Set <code className="font-mono">ADMIN_PASSWORD</code> and{' '}
              <code className="font-mono">ADMIN_SESSION_SECRET</code> in the server environment, then redeploy.
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="admin-pw" className="block text-sm font-semibold text-brand-navy mb-1.5">
                  Admin password
                </label>
                <input
                  id="admin-pw"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-brand-border px-4 py-3 text-base outline-none focus:border-brand-purple focus:ring-4 focus:ring-brand-purpleLight transition-smooth"
                />
              </div>
              {error && (
                <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !password}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-purple hover:bg-brand-purpleDark disabled:opacity-60 text-white font-semibold shadow-button transition-smooth"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </>
          )}
        </form>
        <p className="text-center text-xs text-brand-muted mt-6">
          <a href="/" className="hover:text-brand-purple">← Back to site</a>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-border shadow-soft p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs sm:text-sm font-semibold text-brand-muted">{label}</p>
        <span className="text-brand-purple">{icon}</span>
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-brand-navy tabular-nums">{value}</p>
    </div>
  );
}

function Dashboard({ onSignedOut }: { onSignedOut: () => void }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === searchInput ? f : { ...f, q: searchInput }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof AuthError) onSignedOut();
      else setError(err instanceof Error ? err.message : 'Something went wrong.');
    },
    [onSignedOut],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<ListResponse>(`/api/admin/waitlist?${buildQuery(filters, { page, pageSize: PAGE_SIZE })}`)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && handleError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters, page, reloadKey, handleError]);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const hasFilters = useMemo(
    () => filters.q !== '' || filters.whatsapp !== 'any' || filters.from !== '' || filters.to !== '',
    [filters],
  );

  const clearFilters = () => {
    setSearchInput('');
    setFilters((f) => ({ ...EMPTY_FILTERS, sort: f.sort }));
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/export?${buildQuery(filters)}`, { credentials: 'same-origin' });
      if (res.status === 401) throw new AuthError('Please sign in.');
      if (!res.ok) throw new Error('Export failed. Please try again.');
      const blob = await res.blob();
      const name =
        res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ||
        `anote-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      handleError(err);
    } finally {
      setExporting(false);
    }
  };

  const signOut = async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    onSignedOut();
  };

  const stats = data?.stats;
  const start = data && data.matching > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const end = data ? Math.min(data.page * data.pageSize, data.matching) : 0;

  const fieldClass =
    'rounded-xl border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-purple focus:ring-4 focus:ring-brand-purpleLight transition-smooth';

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header */}
      <header className="bg-white border-b border-brand-border sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/icon.png" alt="" className="w-9 h-9 rounded-lg border border-brand-border shrink-0" />
            <div className="min-w-0">
              <p className="text-base font-bold text-brand-navy leading-none truncate">Waitlist Admin</p>
              <p className="text-xs text-brand-muted mt-1 truncate">A Note</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="p-2.5 rounded-xl border border-brand-border text-brand-slate hover:bg-brand-subtle transition-smooth"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportCsv}
              disabled={exporting || !data || data.matching === 0}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purpleDark disabled:opacity-50 text-white text-sm font-semibold shadow-button transition-smooth"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button
              onClick={signOut}
              className="p-2.5 rounded-xl border border-brand-border text-brand-slate hover:bg-brand-subtle transition-smooth"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total registered" value={stats?.total ?? '—'} icon={<Users className="w-4 h-4" />} />
          <StatCard label="Joined today" value={stats?.today ?? '—'} icon={<CalendarDays className="w-4 h-4" />} />
          <StatCard label="Last 7 days" value={stats?.last7Days ?? '—'} icon={<CalendarDays className="w-4 h-4" />} />
          <StatCard label="With WhatsApp" value={stats?.withWhatsapp ?? '—'} icon={<MessageCircle className="w-4 h-4" />} />
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-brand-border shadow-soft p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email or WhatsApp…"
              className={`${fieldClass} w-full pl-10`}
              aria-label="Search registrations"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <label className="flex flex-col gap-1 text-xs font-semibold text-brand-muted">
              WhatsApp
              <select
                value={filters.whatsapp}
                onChange={(e) => setFilter('whatsapp', e.target.value as Filters['whatsapp'])}
                className={fieldClass}
              >
                <option value="any">Any</option>
                <option value="yes">Provided</option>
                <option value="no">Not provided</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brand-muted">
              Sort
              <select
                value={filters.sort}
                onChange={(e) => setFilter('sort', e.target.value as Filters['sort'])}
                className={fieldClass}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A–Z</option>
                <option value="email">Email A–Z</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brand-muted">
              From
              <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brand-muted">
              To
              <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} className={fieldClass} />
            </label>
            <button
              onClick={clearFilters}
              disabled={!hasFilters}
              className="col-span-2 md:col-span-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-brand-border text-sm font-semibold text-brand-slate hover:bg-brand-subtle disabled:opacity-40 transition-smooth"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        <div className="bg-white rounded-2xl border border-brand-border shadow-soft overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-brand-border flex items-center justify-between text-sm">
            <p className="text-brand-slate">
              {data ? (
                data.matching === 0 ? (
                  'No registrations found'
                ) : (
                  <>
                    Showing <b className="text-brand-navy">{start}–{end}</b> of{' '}
                    <b className="text-brand-navy">{data.matching}</b>
                    {hasFilters && stats ? ` (filtered from ${stats.total})` : ''}
                  </>
                )
              ) : (
                'Loading…'
              )}
            </p>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-brand-muted" />}
          </div>

          {data && data.entries.length > 0 && (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-brand-bg text-left text-xs uppercase tracking-wider text-brand-muted">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Name</th>
                      <th className="px-5 py-3 font-semibold">Email</th>
                      <th className="px-5 py-3 font-semibold">WhatsApp</th>
                      <th className="px-5 py-3 font-semibold">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border">
                    {data.entries.map((e) => (
                      <tr key={e.id} className="hover:bg-brand-bg/60">
                        <td className="px-5 py-3.5 font-semibold text-brand-navy">{e.fullName}</td>
                        <td className="px-5 py-3.5">
                          <a href={`mailto:${e.email}`} className="text-brand-purple hover:underline break-all">{e.email}</a>
                        </td>
                        <td className="px-5 py-3.5 text-brand-slate">
                          {e.whatsapp ? (
                            <a href={`https://wa.me/${e.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-mintDark">
                              {e.whatsapp}
                            </a>
                          ) : (
                            <span className="text-brand-muted">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-brand-slate whitespace-nowrap">{dateFmt.format(new Date(e.createdAt))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="md:hidden divide-y divide-brand-border">
                {data.entries.map((e) => (
                  <li key={e.id} className="px-4 py-3.5 space-y-1">
                    <p className="font-semibold text-brand-navy">{e.fullName}</p>
                    <a href={`mailto:${e.email}`} className="block text-sm text-brand-purple break-all">{e.email}</a>
                    <div className="flex items-center justify-between gap-3 text-xs text-brand-muted">
                      <span>{e.whatsapp ?? 'No WhatsApp'}</span>
                      <span>{dateFmt.format(new Date(e.createdAt))}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {data && data.totalPages > 1 && (
            <div className="px-4 sm:px-5 py-3 border-t border-brand-border flex items-center justify-between text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-brand-border text-brand-slate hover:bg-brand-subtle disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-brand-muted">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-brand-border text-brand-slate hover:bg-brand-subtle disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type AuthState = 'checking' | 'signed-out' | 'not-configured' | 'signed-in';

export default function AdminApp() {
  const [state, setState] = useState<AuthState>('checking');

  const check = useCallback(() => {
    api<{ configured: boolean; authenticated: boolean }>('/api/admin/session')
      .then((s) => setState(!s.configured ? 'not-configured' : s.authenticated ? 'signed-in' : 'signed-out'))
      .catch(() => setState('signed-out'));
  }, []);

  useEffect(check, [check]);

  if (state === 'checking') {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-purple" />
      </div>
    );
  }
  if (state === 'signed-in') return <Dashboard onSignedOut={() => setState('signed-out')} />;
  return <LoginScreen notConfigured={state === 'not-configured'} onSuccess={() => setState('signed-in')} />;
}
