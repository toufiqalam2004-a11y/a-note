import { Platform, PermissionsAndroid } from 'react-native';
import {
  SpeechCapabilities,
  SpeechRecognitionCallbacks,
  StartListeningOptions,
  isRunningInExpoGo,
} from './speechRecognitionTypes';

export * from './speechRecognitionTypes';

/**
 * Speech Recognition Service for Android powered by expo-speech-recognition
 * (Android SpeechRecognizer / Google Speech Services).
 */

let cachedModule: any = null;
let activeSessionId = 0;
let isSessionActive = false;
let activeUnsubscribers: (() => void)[] = [];

/**
 * Safely resolves the expo-speech-recognition module without crashing in Expo Go.
 */
function getSpeechModule(): any {
  if (isRunningInExpoGo()) return null;
  if (cachedModule) return cachedModule;

  try {
    const mod = require('expo-speech-recognition');
    if (mod && mod.ExpoSpeechRecognitionModule) {
      cachedModule = mod.ExpoSpeechRecognitionModule;
      return cachedModule;
    }
  } catch (err) {
    console.warn('[SpeechService.Android] expo-speech-recognition module could not be required:', err);
  }
  return null;
}

/**
 * Detects current speech recognition capabilities on Android.
 */
export async function getSpeechRecognitionCapabilities(
  configuredLocale = 'en-IN'
): Promise<SpeechCapabilities> {
  const isExpoGo = isRunningInExpoGo();
  if (isExpoGo) {
    return {
      available: false,
      isExpoGo: true,
      services: [],
      defaultService: '',
      isGoogleAvailable: false,
      supportsOnDevice: false,
      currentLocale: configuredLocale,
    };
  }

  const speechMod = getSpeechModule();
  if (!speechMod) {
    return {
      available: false,
      isExpoGo: false,
      services: [],
      defaultService: '',
      isGoogleAvailable: false,
      supportsOnDevice: false,
      currentLocale: configuredLocale,
    };
  }

  let services: string[] = [];
  let defaultService = '';
  let isGoogleAvailable = false;
  let supportsOnDevice = false;
  let supportedLocales: string[] = [];

  try {
    if (typeof speechMod.getSpeechRecognitionServices === 'function') {
      services = speechMod.getSpeechRecognitionServices() || [];
    }
    if (typeof speechMod.getDefaultRecognitionService === 'function') {
      const def = speechMod.getDefaultRecognitionService();
      defaultService = def?.packageName || '';
    }
    isGoogleAvailable = services.some(
      (s) =>
        s.includes('google') ||
        s.includes('com.google.android.googlequicksearchbox') ||
        s.includes('com.google.android.as')
    );
    if (typeof speechMod.supportsOnDeviceRecognition === 'function') {
      supportsOnDevice = speechMod.supportsOnDeviceRecognition();
    }
    if (typeof speechMod.getSupportedLocales === 'function') {
      try {
        const locResult = await speechMod.getSupportedLocales({});
        supportedLocales = locResult?.locales || [];
      } catch {}
    }

    return {
      available: true,
      isExpoGo: false,
      services,
      defaultService,
      isGoogleAvailable,
      supportsOnDevice,
      currentLocale: configuredLocale,
      supportedLocales,
      localeSupported: supportedLocales.length > 0 ? supportedLocales.includes(configuredLocale) : true,
      permissionStatus: (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO))
        ? 'granted'
        : 'prompt',
    };
  } catch (err) {
    console.warn('[SpeechService.Android] Error checking capabilities:', err);
    return {
      available: true,
      isExpoGo: false,
      services: [],
      defaultService: '',
      isGoogleAvailable: false,
      supportsOnDevice: false,
      currentLocale: configuredLocale,
      permissionStatus: 'unknown',
    };
  }
}

/**
 * Requests microphone and speech recognition permissions on Android.
 */
export async function requestSpeechPermissions(): Promise<{ granted: boolean; message?: string }> {
  if (isRunningInExpoGo()) {
    return {
      granted: false,
      message: 'Speech recognition requires a standalone APK build. Please type commands in Expo Go.',
    };
  }

  const speechMod = getSpeechModule();
  if (!speechMod) {
    return {
      granted: false,
      message: 'Native speech recognition module is not available.',
    };
  }

  try {
    // 1. Android RECORD_AUDIO permission via PermissionsAndroid
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    if (!alreadyGranted) {
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'A Note requires microphone access for voice recognition.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      if (res !== PermissionsAndroid.RESULTS.GRANTED) {
        return {
          granted: false,
          message: 'Microphone permission was denied. Please allow microphone access in device settings.',
        };
      }
    }

    // 2. Module permission
    if (typeof speechMod.requestPermissionsAsync === 'function') {
      const permResponse = await speechMod.requestPermissionsAsync();
      if (!permResponse.granted) {
        return {
          granted: false,
          message: 'Speech recognition permission was denied. Please grant permission in device settings.',
        };
      }
    }

    return { granted: true };
  } catch (err: any) {
    console.warn('[SpeechService.Android] Permission request failed:', err);
    return {
      granted: false,
      message: err?.message || 'Failed to request speech recognition permissions.',
    };
  }
}

/**
 * Clean up active event listeners.
 */
function cleanupListeners() {
  activeUnsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch {}
  });
  activeUnsubscribers = [];
}

/**
 * Starts an Android speech recognition session.
 * Guaranteed at-most-once session execution and single-listener lifecycle.
 */
export async function startSpeechRecognition(
  callbacks: SpeechRecognitionCallbacks,
  options: StartListeningOptions = {}
): Promise<{ success: boolean; error?: string }> {
  if (isRunningInExpoGo()) {
    const msg = 'Speech recognition requires the standalone A Note APK. In Expo Go, please use typed commands.';
    callbacks.onError(msg, 'expo-go');
    return { success: false, error: msg };
  }

  const speechMod = getSpeechModule();
  if (!speechMod) {
    const msg = 'Speech recognition native module is unavailable.';
    callbacks.onError(msg, 'module-unavailable');
    return { success: false, error: msg };
  }

  // 1. Check/request permission
  const perm = await requestSpeechPermissions();
  if (!perm.granted) {
    callbacks.onError(perm.message || 'Microphone permission denied.', 'permission-denied');
    return { success: false, error: perm.message };
  }

  // 2. Cancel any running session before starting new one
  if (isSessionActive) {
    await abortSpeechRecognition();
  }

  const thisSessionId = ++activeSessionId;
  isSessionActive = true;
  cleanupListeners();

  const targetLocale = options.locale || 'en-IN';

  // 3. Prepare contextual biasing strings (Client names + core verbs)
  // Biasing strings improve recognition accuracy on Android 13+ (EXTRA_BIASING_STRINGS)
  const contextualStrings: string[] = [
    'video',
    'videos',
    'done',
    'complete',
    'completed',
    'finish',
    'progress',
    'status',
    'client',
    ...(options.clientNames || []),
  ];

  let hasEnded = false;

  const handleEnd = () => {
    if (hasEnded || activeSessionId !== thisSessionId) return;
    hasEnded = true;
    isSessionActive = false;
    cleanupListeners();
    callbacks.onEnd?.();
  };

  try {
    // 4. Register event listeners on speechMod
    if (typeof speechMod.addListener === 'function') {
      const subStart = speechMod.addListener('start', () => {
        if (activeSessionId !== thisSessionId) return;
        callbacks.onStart?.();
      });
      activeUnsubscribers.push(() => subStart?.remove?.());

      const subSpeechStart = speechMod.addListener('speechstart', () => {
        if (activeSessionId !== thisSessionId) return;
        callbacks.onSpeechStart?.();
      });
      activeUnsubscribers.push(() => subSpeechStart?.remove?.());

      const subSpeechEnd = speechMod.addListener('speechend', () => {
        if (activeSessionId !== thisSessionId) return;
        callbacks.onSpeechEnd?.();
      });
      activeUnsubscribers.push(() => subSpeechEnd?.remove?.());

      const subVolume = speechMod.addListener('volumechange', (event: any) => {
        if (activeSessionId !== thisSessionId) return;
        // Native volume is typically -2 to 10 on Android; normalize to 0.0 - 1.0
        const raw = typeof event?.value === 'number' ? event.value : 0;
        const normalized = Math.max(0, Math.min(1, raw <= 0 ? 0 : raw / 8));
        callbacks.onVolumeChange?.(normalized);
      });
      activeUnsubscribers.push(() => subVolume?.remove?.());

      const subResult = speechMod.addListener('result', (event: any) => {
        if (activeSessionId !== thisSessionId) return;
        const resultItem = event?.results?.[0];
        const transcript = (resultItem?.transcript || '').trim();
        const isFinal = Boolean(event?.isFinal);
        const confidence = typeof resultItem?.confidence === 'number' ? resultItem.confidence : undefined;

        if (transcript) {
          callbacks.onTranscript(transcript, isFinal, confidence);
        }

        if (isFinal) {
          handleEnd();
        }
      });
      activeUnsubscribers.push(() => subResult?.remove?.());

      const subError = speechMod.addListener('error', (event: any) => {
        if (activeSessionId !== thisSessionId) return;
        const errType = event?.error || 'unknown';
        let userMessage = event?.message || 'Speech recognition encountered an issue.';

        if (errType === 'no-speech' || errType === 'speech-timeout') {
          userMessage = 'No speech detected. Tap microphone to try again.';
        } else if (errType === 'network') {
          userMessage = 'Network error during recognition. Check your internet connection or offline voice settings.';
        } else if (errType === 'not-allowed') {
          userMessage = 'Microphone or speech permission not allowed.';
        } else if (errType === 'busy') {
          userMessage = 'Speech recognizer is busy. Please try again.';
        }

        callbacks.onError(userMessage, errType);
        handleEnd();
      });
      activeUnsubscribers.push(() => subError?.remove?.());

      const subEnd = speechMod.addListener('end', () => {
        if (activeSessionId !== thisSessionId) return;
        handleEnd();
      });
      activeUnsubscribers.push(() => subEnd?.remove?.());
    }

    // 5. Start native recognition
    speechMod.start({
      lang: targetLocale,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: options.requiresOnDevice || false,
      addsPunctuation: false,
      contextualStrings,
      volumeChangeEventOptions: {
        enabled: true,
        intervalMillis: 60,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.warn('[SpeechService.Android] Failed to start recognition:', err);
    isSessionActive = false;
    cleanupListeners();
    callbacks.onError(err?.message || 'Failed to start speech recognition.', 'start-failed');
    return { success: false, error: err?.message };
  }
}

/**
 * Stops Android speech recognition gracefully and waits for final result.
 */
export async function stopSpeechRecognition(): Promise<void> {
  isSessionActive = false;
  const speechMod = getSpeechModule();
  if (speechMod && typeof speechMod.stop === 'function') {
    try {
      await speechMod.stop();
    } catch {}
  }
}

/**
 * Aborts Android speech recognition immediately without final result.
 */
export async function abortSpeechRecognition(): Promise<void> {
  activeSessionId++;
  isSessionActive = false;
  cleanupListeners();
  const speechMod = getSpeechModule();
  if (speechMod && typeof speechMod.abort === 'function') {
    try {
      await speechMod.abort();
    } catch {}
  }
}
