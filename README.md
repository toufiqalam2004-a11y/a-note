# A Note – Video Editing & Earnings Tracker (Official Landing Page)

A clean, modern, and premium landing page for **A Note**, the Android app designed for freelance video editors and content creators.

Built with **React**, **Vite**, **TypeScript**, and **Tailwind CSS**.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
```
The optimized production bundle including the verified production APK will be generated in `dist/`.

### 4. Preview Production Build
```bash
npm run preview
```

---

## 📝 Waitlist System

The `#waitlist` section collects Full Name, Email (required) and WhatsApp (optional). Submissions are stored permanently in **Postgres** through **Vercel Functions** in `api/`. The admin dashboard is at **`/admin`**.

| Path | Purpose |
| --- | --- |
| `src/components/Waitlist.tsx` | Waitlist section (form, loading, errors, success state) |
| `src/admin/AdminApp.tsx` | Admin dashboard, lazy-loaded only on `/admin` |
| `api/waitlist.ts` | `POST` signup: validation, honeypot, timing check, per-IP rate limit, duplicate check |
| `api/admin/*.ts` | `login`, `logout`, `session`, `waitlist` (list/search/filter/stats), `export` (CSV) |
| `server/*.ts` | Shared server code (kept outside `api/` so it is not deployed as functions): DB pool + additive migrations, auth, validation, rate limiting |

**Data safety:** the table is created with `CREATE ... IF NOT EXISTS` and migrations are append-only. Nothing in the code drops, truncates or rewrites rows. Emails are unique (case-insensitive) at the database level.

**Security:** the admin password and DB URL exist only as server env vars (none are `VITE_*`, so none reach the browser). Admin sessions use an HMAC-signed `HttpOnly; Secure; SameSite=Strict` cookie that lasts 8 hours. Failed logins are rate-limited, and raw IPs are never stored (only salted hashes).

### Production setup (Vercel)
1. In Vercel, open **Project → Storage → Create Database → Neon (Postgres)** and connect it to this project. Tick **Production** only, unless you also enable Neon's per-preview database branches. Otherwise preview deployments would write into the production waitlist. The code reads `DATABASE_URL`, falling back to `POSTGRES_URL`. Use Neon's **pooled** connection string (host contains `-pooler`).
2. In **Settings → Environment Variables**, add these for **Production** only (use different values for Preview if you enable it there):
   - `ADMIN_PASSWORD`: 16+ characters recommended (minimum 12), mark it **Sensitive**
   - `ADMIN_SESSION_SECRET`: 64 hex chars (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), mark it **Sensitive**
3. Redeploy. The tables are created automatically on the first request (an advisory lock makes concurrent cold starts safe).
4. To sign out every admin session at once, change `ADMIN_SESSION_SECRET` (or the password) and redeploy.

Optional check against a disposable Neon **dev branch** (never production): `node scripts/test-concurrent-init.mjs --confirm-test-db` with that branch's `DATABASE_URL` set.

### Local development
```bash
cp .env.example .env.local   # then set a password + secret
npm run db:local             # terminal 1: local Postgres (PGlite) on :5433, data in .local-db/
npm run dev                  # terminal 2: site + /api on http://localhost:3000
npm run test:waitlist        # terminal 3: 31 end-to-end API checks (local DB only!)
```
`npm run preview` also serves `/api`, so you can test the production build locally (`BASE_URL=http://localhost:4173 npm run test:waitlist`).

---

## 📲 APK Download Configuration

The production APK is packaged and statically served at `/downloads/ANote.apk`:

📁 [`src/config/download.ts`](file:///c:/Users/toufi/OneDrive/Documents/Desktop/edit-flow-website/src/config/download.ts)

```typescript
export const DOWNLOAD_CONFIG = {
  apkUrl: '/downloads/ANote.apk',
  appName: 'A Note',
  version: '1.0.0',
  buildNumber: 5,
  minAndroidVersion: 'Android 8.0 (Oreo) or higher',
  estimatedSize: '84.6 MB',
  packageId: 'com.editflow.app',
  sha256: 'B1D0FD4B2DB797010E361CC4E177B52BA56C48E73C541EB8CACE2B105A0222C5',
};
```

All download buttons across Navbar, Hero, and the Final Call-to-Action directly trigger downloading `ANote.apk`.

---

## 🎨 Design & Architecture

- **Visual Aesthetic**: Minimal, elegant, and professional — avoiding generic AI gradients, glowing neon boxes, and unnecessary glassmorphism.
- **Color Palette**: Complements the mobile app’s default theme:
  - Brand Purple: `#7C5CFC`
  - Accent Mint: `#00D287`
  - Deep Navy / Charcoal: `#1E1B38`
  - Body Slate: `#4A4568`
  - Neutral Background: `#FAFAFD`
- **Authentic App UI**: Uses actual high-resolution screenshots from the A Note app (`/screenshots/home_dashboard.png`, `/screenshots/custom_types.png`, `/screenshots/client_details.png`).
- **Smartphone Frames**: Realistic flagship mobile frames with hardware bezels, punch-hole cameras, and screen glare for authentic product presentation.
- **Offline & Privacy Focused**: Includes dedicated Privacy Policy modal reflecting A Note's 100% on-device SQLite storage model.
