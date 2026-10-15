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
    // In a custom Development Build (APK), this returns the native module.
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
          'Expo Go detected: Third-party native modules are not bundled in Expo Go. A custom development build (npx expo run:android) is required for hardware speech recognition.',
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
