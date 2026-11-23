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
The optimized production bundle will be generated in the `dist/` directory.

### 4. Preview Production Build
```bash
npm run preview
```

---

## 📲 APK Download Configuration (IMPORTANT)

The landing page features a **single centralized configuration file** for the Android APK download link:

📁 [`src/config/download.ts`](file:///c:/Users/toufi/OneDrive/Documents/Desktop/edit-flow-website/src/config/download.ts)

```typescript
export const DOWNLOAD_CONFIG = {
  // Replace with your direct APK download link (e.g. GitHub Releases, Firebase, S3):
  apkUrl: 'https://your-domain.com/downloads/ANote.apk',
  
  // App metadata
  appName: 'A Note',
  version: 'v1.0.0',
  buildNumber: 5,
  minAndroidVersion: 'Android 8.0 (Oreo) or higher',
  estimatedSize: '28.4 MB',
  packageId: 'com.editflow.app',
};
```

### Behavior:
- **When `apkUrl` is configured**: Every *"Download for Android"*, *"Download App"*, and *"Download A Note"* button initiates an instant, direct download of your APK.
- **When `apkUrl` is empty or left as placeholder**: Clicking any download button automatically launches an informative modal informing the user that the APK release is being finalized, without serving fake or broken links.

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

---

## 📂 Project Structure

```text
edit-flow-website/
├── public/
│   ├── icon.png                 # Official A Note app icon
│   ├── favicon.png              # Favicon
│   └── screenshots/             # Real device screenshots
│       ├── home_dashboard.png   # Main dashboard overview
│       ├── custom_types.png     # Video type & pricing manager
│       └── client_details.png   # Client video checklist pipeline
├── src/
│   ├── config/
│   │   └── download.ts          # Centralized APK download link & metadata
│   ├── components/
│   │   ├── Navbar.tsx           # Sticky nav with logo and CTAs
│   │   ├── Hero.tsx             # Hero headline, CTAs & realistic smartphone mockup
│   │   ├── Features.tsx         # 6 core feature cards in balanced grid
│   │   ├── AppPreview.tsx       # Tabbed interactive screenshot showcase
│   │   ├── AboutSection.tsx     # Value comparison & on-device storage explanation
│   │   ├── FinalDownload.tsx    # Conversion CTA section
│   │   ├── Footer.tsx           # Logo, links, copyright & privacy trigger
│   │   ├── DownloadModal.tsx    # Transparent setup guidance modal
│   │   └── PrivacyModal.tsx     # Offline SQLite data privacy policy
│   ├── App.tsx                  # Main layout coordinator
│   ├── index.css                # Tailwind directives & phone frame styles
│   └── main.tsx                 # React entrypoint
├── index.html                   # SEO-optimized title, OpenGraph & meta tags
├── tailwind.config.js           # Brand colors, typography, custom shadows
└── vite.config.ts               # Vite configuration
```
