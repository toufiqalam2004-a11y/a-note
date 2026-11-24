/**
 * Centralized Download Configuration for A Note Android APK
 * 
 * Production APK is served statically from `/downloads/ANote.apk` (84.6 MB).
 * Package ID: com.editflow.app (Build #5, v1.0.0)
 * SHA-256: B1D0FD4B2DB797010E361CC4E177B52BA56C48E73C541EB8CACE2B105A0222C5
 * 
 * Every download CTA across Desktop Navbar, Mobile Navbar, Hero, and Final CTA
 * uses this centralized configuration and initiates direct download with filename ANote.apk.
 */
export const DOWNLOAD_CONFIG = {
  // Verified production APK static route:
  apkUrl: '/downloads/ANote.apk', 

  // App metadata displayed across the landing page
  appName: 'A Note',
  appTagline: 'Video Editing & Earnings Tracker',
  version: '1.0.0',
  buildNumber: 5,
  minAndroidVersion: 'Android 8.0 (Oreo) or higher',
  estimatedSize: '84.6 MB',
  packageId: 'com.editflow.app',
  architecture: 'Universal APK (arm64-v8a, armeabi-v7a, x86_64)',
  database: 'Local SQLite (100% Offline & Private)',
  sha256: 'B1D0FD4B2DB797010E361CC4E177B52BA56C48E73C541EB8CACE2B105A0222C5',
};

/**
 * Initiates direct download of the production APK with filename ANote.apk
 */
export function initiateApkDownload(onOpenPlaceholderModal?: () => void): void {
  const url = DOWNLOAD_CONFIG.apkUrl.trim();
  
  if (url && url !== '#' && !url.includes('example.com') && !url.includes('PLACEHOLDER')) {
    // Valid URL configured: initiate direct download with filename ANote.apk
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', 'ANote.apk');
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } else if (onOpenPlaceholderModal) {
    // Fallback if URL is ever cleared
    onOpenPlaceholderModal();
  }
}
