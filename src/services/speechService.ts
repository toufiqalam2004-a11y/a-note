import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import Constants, { AppOwnership } from 'expo-constants';

/**
 * Checks whether the app is currently running inside standard Expo Go.
 * Standard Expo Go only includes pre-bundled Expo SDK native modules
 * and cannot execute third-party native code like `expo-speech-recognition`.
 */
export const isRunningInExpoGo: boolean =
  Constants.appOwnership === AppOwnership.Expo ||
  Constants.appOwnership === 'expo';

let cachedModule: any = null;
let moduleResolutionAttempted = false;

/**
 * Safely resolves the native ExpoSpeechRecognition module without throwing
 * if running in Expo Go, web, or an unlinked environment.
 */
export function getNativeSpeechModule(): any | null {
  if (Platform.OS === 'web') return null;

  if (moduleResolutionAttempted) {
    return cachedModule;
  }

  moduleResolutionAttempted = true;

  try {
    // Check if the native binary actually contains the native module.
    // In Expo Go, this returns null safely.
    // In a custom Development Build (APK) or Release APK, this returns the native module.
    const nativeModule = requireOptionalNativeModule('ExpoSpeechRecognition');
    if (!nativeModule) {
      cachedModule = null;
      return null;
    }

    // Module exists in this binary; load the JS wrapper
    const speechPkg = require('expo-speech-recognition');
    cachedModule = speechPkg.ExpoSpeechRecognitionModule || nativeModule;
    return cachedModule;
  } catch (err) {
    console.warn('[EditFlow Speech] Could not load ExpoSpeechRecognition module:', err);
    cachedModule = null;
    return null;
  }
}

/**
 * Returns true if the native speech recognition module is bundled and available.
 */
export function isNativeSpeechAvailable(): boolean {
  return getNativeSpeechModule() != null;
}

/**
 * Query supported and installed locales from the Android speech service
 */
export async function getSupportedSpeechLocales(): Promise<{
  locales: string[];
  installedLocales: string[];
}> {
  const mod = getNativeSpeechModule();
  if (!mod || typeof mod.getSupportedLocales !== 'function') {
    return { locales: [], installedLocales: [] };
  }

  try {
    const result = await mod.getSupportedLocales({});
    return {
      locales: result.locales || [],
      installedLocales: result.installedLocales || [],
    };
  } catch (e) {
    console.warn('[EditFlow Speech] getSupportedLocales warning:', e);
    return { locales: [], installedLocales: [] };
  }
}

export interface OptimalLocaleInfo {
  locale: string;
  isInstalled: boolean;
  displayName: string;
}

/**
 * Resolves the optimal English locale for speech recognition.
 * Strategy:
 * 1. Checks installed and supported locales on device.
 * 2. Prefers English (India) 'en-IN' if installed.
 * 3. If 'en-IN' is not downloaded yet, checks if any other English locale is already installed (e.g. 'en-US', 'en-GB').
 * 4. If 'en-IN' is supported but not downloaded, returns 'en-IN' with isInstalled=false.
 * 5. Falls back to 'en-IN' as default preferred target.
 */
export async function getOptimalSpeechLocale(): Promise<OptimalLocaleInfo> {
  const { locales, installedLocales } = await getSupportedSpeechLocales();

  // Normalize helper
  const matches = (list: string[], tag: string) =>
    list.some((l) => l.toLowerCase().replace(/_/g, '-') === tag.toLowerCase());

  // 1. Is en-IN already installed on device?
  if (matches(installedLocales, 'en-IN')) {
    return {
      locale: 'en-IN',
      isInstalled: true,
      displayName: 'English (India)',
    };
  }

  // 2. Is any other English locale installed?
  const installedEnglish = installedLocales.find((l) =>
    l.toLowerCase().startsWith('en')
  );
  if (installedEnglish) {
    const clean = installedEnglish.replace(/_/g, '-');
    const name = clean === 'en-US' ? 'English (US)' : clean === 'en-GB' ? 'English (UK)' : `English (${clean})`;
    return {
      locale: clean,
      isInstalled: true,
      displayName: name,
    };
  }

  // 3. Is en-IN in supported locales (even if not yet downloaded)?
  if (matches(locales, 'en-IN')) {
    return {
      locale: 'en-IN',
      isInstalled: false,
      displayName: 'English (India)',
    };
  }

  // 4. Default to en-IN as preferred Indian English locale
  return {
    locale: 'en-IN',
    isInstalled: false,
    displayName: 'English (India)',
  };
}

/**
 * Triggers Android offline model download if supported (Android 13+)
 */
export async function triggerOfflineSpeechModelDownload(locale: string): Promise<{
  status: string;
  message: string;
}> {
  const mod = getNativeSpeechModule();
  if (!mod || typeof mod.androidTriggerOfflineModelDownload !== 'function') {
    return {
      status: 'unsupported',
      message: 'Offline language model download API is not available on this Android version.',
    };
  }

  try {
    const res = await mod.androidTriggerOfflineModelDownload({ locale });
    return {
      status: res.status,
      message: res.message || 'Offline language model download requested.',
    };
  } catch (err: any) {
    console.warn('[EditFlow Speech] triggerOfflineModelDownload error:', err);
    return {
      status: 'error',
      message: err.message || 'Could not initiate offline language download.',
    };
  }
}

/**
 * Request microphone & speech recognition permissions safely
 */
export async function requestSpeechPermissions(): Promise<{
  granted: boolean;
  message?: string;
}> {
  const mod = getNativeSpeechModule();
  if (!mod) {
    if (isRunningInExpoGo) {
      return {
        granted: false,
        message:
          'Expo Go detected: Third-party native modules are not bundled in Expo Go. A custom development build or standalone APK is required for hardware speech recognition.',
      };
    }
    return {
      granted: false,
      message: 'Native speech recognition module is not installed in this build.',
    };
  }

  try {
    if (typeof mod.requestPermissionsAsync === 'function') {
      const res = await mod.requestPermissionsAsync();
      return { granted: !!res.granted };
    }
    return { granted: true };
  } catch (e: any) {
    return { granted: false, message: e.message || 'Permission request failed' };
  }
}

/**
 * Start native speech recognition
 */
export function startSpeechRecognition(options: {
  lang?: string;
  interimResults?: boolean;
  continuous?: boolean;
  addsPunctuation?: boolean;
  requiresOnDeviceRecognition?: boolean;
}): void {
  const mod = getNativeSpeechModule();
  if (!mod) {
    throw new Error('Native speech recognition is not available in this environment.');
  }

  if (typeof mod.start === 'function') {
    mod.start(options);
  }
}

/**
 * Stop native speech recognition
 */
export function stopSpeechRecognition(): void {
  const mod = getNativeSpeechModule();
  if (mod && typeof mod.stop === 'function') {
    try {
      mod.stop();
    } catch {}
  }
}

/**
 * Abort native speech recognition
 */
export function abortSpeechRecognition(): void {
  const mod = getNativeSpeechModule();
  if (mod && typeof mod.abort === 'function') {
    try {
      mod.abort();
    } catch {}
  }
}

/**
 * Safe event listener hook that safely degrades if native module is absent
 */
export function useSafeSpeechRecognitionEvent(
  eventName: 'start' | 'result' | 'error' | 'end',
  listener: (event: any) => void
): void {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const mod = getNativeSpeechModule();
    if (!mod || typeof mod.addListener !== 'function') {
      return;
    }

    const callback = (...args: any[]) => {
      if (listenerRef.current) {
        (listenerRef.current as any)(args[0]);
      }
    };

    let subscription: any = null;
    try {
      subscription = mod.addListener(eventName, callback);
    } catch (err) {
      console.warn(`[EditFlow Speech] Failed to attach listener for ${eventName}:`, err);
    }

    return () => {
      try {
        if (subscription && typeof subscription.remove === 'function') {
          subscription.remove();
        }
      } catch {}
    };
  }, [eventName]);
}
