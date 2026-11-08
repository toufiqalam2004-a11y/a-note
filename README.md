# A Note — Client Video & Delivery Tracker

[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-blue.svg)](https://reactnative.dev)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-57-black.svg)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A Note** is a modern, privacy-focused, local-first mobile application designed specifically for video editors, content creators, animators, and digital freelancers to track client video deliverables, payments, milestones, and progress with an integrated voice assistant.

---

## Key Features

- **Local-First & Offline-First**: Powered by native SQLite (`expo-sqlite`) with zero reliance on mandatory cloud backends. All client records and deliverable history remain 100% on-device.
- **Voice Assistant**: Integrated native speech recognition (`expo-speech-recognition`) with dynamic, audio-reactive waveform animations for hands-free video status updates and client lookups.
- **Client & Deliverable Tracking**:
  - Track video quotas, rates, delivered milestones, and pending tasks.
  - Automatic reconciliation between total budget, per-video earnings, and pending balances.
  - Granular per-video status toggling (Pending / Completed) and category tagging.
- **Dynamic 4-Preset Theme System**:
  - **Lavender Mint** (Default airy aesthetic)
  - **Midnight** (High-contrast OLED dark theme)
  - **Ocean Blue** (Deep cyan & navy workspace)
  - **Rose Pink** (Vibrant creative theme)
  - Instant live preview and persistent theme selection across sessions.
- **Export & Reporting Engine**:
  - One-tap PDF summary generation (`expo-print`, `pdf-lib`) for professional client invoices and receipts.
  - Formatted Excel spreadsheet export (`xlsx`) with delivery timestamps.
- **Backup & Disaster Recovery**:
  - Atomic JSON export and import with cryptographic schema verification.
  - Safe transaction rollback on corrupted inputs.

---

## Tech Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | React Native 0.86.3 / Expo SDK 57 |
| **Language** | TypeScript |
| **Database** | SQLite (`expo-sqlite`) |
| **Speech Engine** | Google Speech Services via `expo-speech-recognition` |
| **Styling & UI** | Dynamic Context-driven Theme System with tactile spring physics |
| **Documents & Export** | `pdf-lib`, `expo-print`, `xlsx`, `expo-sharing` |
| **Build System** | EAS Build (Production AAB & Universal APK profiles) |

---

## Project Structure

```text
├── src/
│   ├── components/        # UI components (WelcomeCard, ClientCard, Modals, etc.)
│   ├── constants/         # Theme tokens, video types, color palettes
│   ├── context/           # ThemeContext and global providers
│   ├── services/          # SQLite database, backup, speech recognition, profile
│   ├── types/             # TypeScript interfaces and schema models
│   └── utils/             # Calculations, motion presets, formatters
├── assets/                # App icons, splash screens, and adaptive resources
├── App.tsx                # App root with ThemeProvider and Safe Area wrapper
├── app.json               # Expo configuration and EAS plugins
├── eas.json               # EAS build and credential profiles
└── package.json           # Dependencies and scripts
```

---

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Expo CLI (`npx expo`)
- Android Studio / ADB for physical device or emulator testing

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/a-note.git
cd a-note

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

### Running on Android

```bash
npx expo run:android
```

### Type Checking & Quality Assurance

```bash
# Run TypeScript compilation check
npx tsc --noEmit
```

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
