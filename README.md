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
