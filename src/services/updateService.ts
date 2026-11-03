import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/**
 * A Note - Production Over-The-Air (OTA) Update Service
 * 
 * Safely manages background checking, downloading, and application of EAS Updates.
 * Guarantees:
 * 1. Background downloads never block app startup or UI interactions.
 * 2. Compatible updates apply automatically on next cold restart.
 * 3. Never applies or restarts during active voice recording or critical user operations.
 * 4. Gracefully degrades in development, Expo Go, or offline modes.
 */

export interface UpdateDiagnostics {
  isEnabled: boolean;
  channel: string | null;
  runtimeVersion: string | null;
  updateId: string | null;
  isEmbeddedLaunch: boolean;
  isEmergencyLaunch: boolean;
  isUpdatePendingRestart: boolean;
}

// In-memory state tracking
let isUpdateDownloadedAndPending = false;
let isVoiceRecordingActive = false;
let isDatabaseOperationActive = false;
let isCheckingOrFetching = false;

/**
 * Signals whether voice recording or assistant session is currently active.
 * When true, programmatic reloads are strictly prevented.
 */
export function setVoiceRecordingActive(active: boolean): void {
  isVoiceRecordingActive = active;
}

/**
 * Signals whether a database backup/restore or batch save is in progress.
 */
export function setDatabaseOperationActive(active: boolean): void {
  isDatabaseOperationActive = active;
}

/**
 * Checks whether an update has been downloaded in the background and is awaiting restart.
 */
export function isUpdatePendingRestart(): boolean {
  return isUpdateDownloadedAndPending;
}

/**
 * Checks if OTA updates are available and active in the current binary runtime.
 */
export function isUpdatesAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    return !!Updates.isEnabled;
  } catch {
    return false;
  }
}

/**
 * Retrieves comprehensive diagnostic information regarding the active update environment.
 */
export function getUpdateDiagnostics(): UpdateDiagnostics {
  try {
    return {
      isEnabled: !!Updates.isEnabled,
      channel: Updates.channel || null,
      runtimeVersion: typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : null,
      updateId: Updates.updateId || null,
      isEmbeddedLaunch: !!Updates.isEmbeddedLaunch,
      isEmergencyLaunch: !!Updates.isEmergencyLaunch,
      isUpdatePendingRestart: isUpdateDownloadedAndPending,
    };
  } catch (err) {
    return {
      isEnabled: false,
      channel: null,
      runtimeVersion: null,
      updateId: null,
      isEmbeddedLaunch: true,
      isEmergencyLaunch: false,
      isUpdatePendingRestart: false,
    };
  }
}

/**
 * Background update check and download runner.
 * Designed to be called on app startup with zero UI disruption.
 * 
 * @param onUpdateReady Optional callback when an update has finished downloading.
 */
export async function checkForAndDownloadUpdateInBackground(
  onUpdateReady?: (manifest: Updates.Manifest | null) => void
): Promise<{ success: boolean; updateDownloaded: boolean; message: string }> {
  if (!isUpdatesAvailable()) {
    return {
      success: true,
      updateDownloaded: false,
      message: 'Updates disabled in this environment (development or Expo Go).',
    };
  }

  if (isCheckingOrFetching) {
    return {
      success: true,
      updateDownloaded: false,
      message: 'Update check or download already in progress.',
    };
  }

  isCheckingOrFetching = true;

  try {
    // 1. Check for updates on EAS Update server
    const checkResult = await Updates.checkForUpdateAsync();

    if (!checkResult.isAvailable) {
      isCheckingOrFetching = false;
      return {
        success: true,
        updateDownloaded: false,
        message: 'A Note is up to date.',
      };
    }

    // 2. An update is available. Fetch in background
    console.log('[ANote UpdateService] New update detected. Downloading in background...');
    const fetchResult = await Updates.fetchUpdateAsync();

    if (fetchResult.isNew) {
      isUpdateDownloadedAndPending = true;
      console.log(
        '[ANote UpdateService] Update downloaded successfully. Will apply automatically on next restart.'
      );
      if (onUpdateReady) {
        onUpdateReady(fetchResult.manifest || null);
      }
      isCheckingOrFetching = false;
      return {
        success: true,
        updateDownloaded: true,
        message: 'Update downloaded. It will be applied on the next app restart.',
      };
    }

    isCheckingOrFetching = false;
    return {
      success: true,
      updateDownloaded: false,
      message: 'No new update assets were downloaded.',
    };
  } catch (err: any) {
    isCheckingOrFetching = false;
    console.warn('[ANote UpdateService] Background update check failed (offline or network error):', err?.message);
    return {
      success: false,
      updateDownloaded: false,
      message: err?.message || 'Failed to check or download update.',
    };
  }
}

/**
 * Safely applies a downloaded update by reloading the application.
 * Strictly verifies safety constraints:
 * - NEVER reloads while voice recording is active.
 * - NEVER reloads during a database operation.
 */
export async function safeApplyUpdate(): Promise<{ reloaded: boolean; reason?: string }> {
  if (!isUpdatesAvailable()) {
    return { reloaded: false, reason: 'Updates are not enabled in this environment.' };
  }

  if (!isUpdateDownloadedAndPending) {
    return { reloaded: false, reason: 'No downloaded update is pending application.' };
  }

  if (isVoiceRecordingActive) {
    console.warn('[ANote UpdateService] Reload blocked: Voice recording is currently active.');
    return {
      reloaded: false,
      reason: 'Cannot apply update while voice assistant is recording or processing speech.',
    };
  }

  if (isDatabaseOperationActive) {
    console.warn('[ANote UpdateService] Reload blocked: Database operation in progress.');
    return {
      reloaded: false,
      reason: 'Cannot apply update while saving data or performing backup.',
    };
  }

  try {
    await Updates.reloadAsync();
    return { reloaded: true };
  } catch (err: any) {
    console.warn('[ANote UpdateService] Failed to reload app:', err);
    return { reloaded: false, reason: err?.message || 'Failed to reload application.' };
  }
}

