/**
 * Centralized Download Configuration for A Note Android APK
 * 
 * Instructions:
 * Replace `apkUrl` with your actual direct APK download URL (e.g. GitHub Releases,
 * Google Cloud Storage, Firebase Hosting, S3, or your self-hosted server).
 * 
 * When configured, all "Download for Android", "Download App", and "Download A Note"
 * buttons trigger direct download of this APK.
 * 
 * If left empty or set to a placeholder, clicking any download button opens a clean,
 * helpful modal informing users that the APK download is being prepared.
 */
export const DOWNLOAD_CONFIG = {
  // >>> SET YOUR APK URL HERE <<<
  // Example: 'https://github.com/your-username/a-note/releases/download/v1.0.0/ANote-v1.0.0.apk'
  apkUrl: '', 

  // App metadata displayed across the landing page
  appName: 'A Note',
  appTagline: 'Video Editing & Earnings Tracker',
  version: 'v1.0.0',
  buildNumber: 5,
  minAndroidVersion: 'Android 8.0 (Oreo) or higher',
  estimatedSize: '28.4 MB',
  packageId: 'com.editflow.app',
  architecture: 'Universal APK (arm64-v8a, armeabi-v7a, x86_64)',
  database: 'Local SQLite (100% Offline & Private)',
};

/**
 * Helper to trigger download or launch fallback modal
 */
export function initiateApkDownload(onOpenPlaceholderModal: () => void): void {
  const url = DOWNLOAD_CONFIG.apkUrl.trim();
  
  if (url && url !== '#' && !url.includes('example.com') && !url.includes('PLACEHOLDER')) {
    // Valid URL configured: initiate direct download
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.setAttribute('download', 'ANote.apk');
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } else {
    // URL not yet configured: invoke callback to show transparent placeholder modal
    onOpenPlaceholderModal();
  }
}
