import { Platform } from 'react-native';
import { isRunningInExpoGo as isExpoGoRuntime } from 'expo';
import Constants, { AppOwnership } from 'expo-constants';

export interface SpeechCapabilities {
  available: boolean;
  isExpoGo: boolean;
  services: string[];
  defaultService: string;
  isGoogleAvailable: boolean;
  supportsOnDevice: boolean;
  currentLocale: string;
  supportedLocales?: string[];
  localeSupported?: boolean;
  permissionStatus?: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onVolumeChange?: (volume: number) => void; // Normalized 0.0 - 1.0
  onTranscript: (transcript: string, isFinal: boolean, confidence?: number) => void;
  onError: (error: string, code?: string) => void;
  onEnd?: () => void;
}

export interface StartListeningOptions {
  locale?: string;
  clientNames?: string[];
  requiresOnDevice?: boolean;
}

/**
 * Checks whether the app is currently running in standard Expo Go.
 */
export function isRunningInExpoGo(): boolean {
  if (Platform.OS === 'web') return false;

  try {
    if (typeof isExpoGoRuntime === 'function' && isExpoGoRuntime()) {
      return true;
    }
  } catch {}

  if (
    Constants.appOwnership === AppOwnership.Expo ||
    (Constants.appOwnership as any) === 'expo'
  ) {
    return true;
  }

  return false;
}
