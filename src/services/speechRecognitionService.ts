import { Platform } from 'react-native';
import * as AndroidSpeech from './speechRecognitionService.android';
import * as IOSSpeech from './speechRecognitionService.ios';
import {
  SpeechCapabilities,
  SpeechRecognitionCallbacks,
  StartListeningOptions,
  isRunningInExpoGo,
} from './speechRecognitionTypes';

export * from './speechRecognitionTypes';

/**
 * Universal Speech Recognition Service Dispatcher.
 * Delegates to platform-specific implementations:
 * - speechRecognitionService.android.ts for Android (Android SpeechRecognizer / Google Speech Services)
 * - speechRecognitionService.ios.ts for iOS (Apple SFSpeechRecognizer / CoreML)
 */

export async function getSpeechRecognitionCapabilities(
  configuredLocale = 'en-IN'
): Promise<SpeechCapabilities> {
  if (Platform.OS === 'ios') {
    return IOSSpeech.getSpeechRecognitionCapabilities(configuredLocale);
  }
  return AndroidSpeech.getSpeechRecognitionCapabilities(configuredLocale);
}

export async function requestSpeechPermissions(): Promise<{ granted: boolean; message?: string }> {
  if (Platform.OS === 'ios') {
    return IOSSpeech.requestSpeechPermissions();
  }
  return AndroidSpeech.requestSpeechPermissions();
}

export async function startSpeechRecognition(
  callbacks: SpeechRecognitionCallbacks,
  options: StartListeningOptions = {}
): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'ios') {
    return IOSSpeech.startSpeechRecognition(callbacks, options);
  }
  return AndroidSpeech.startSpeechRecognition(callbacks, options);
}

export async function stopSpeechRecognition(): Promise<void> {
  if (Platform.OS === 'ios') {
    return IOSSpeech.stopSpeechRecognition();
  }
  return AndroidSpeech.stopSpeechRecognition();
}

export async function abortSpeechRecognition(): Promise<void> {
  if (Platform.OS === 'ios') {
    return IOSSpeech.abortSpeechRecognition();
  }
  return AndroidSpeech.abortSpeechRecognition();
}
