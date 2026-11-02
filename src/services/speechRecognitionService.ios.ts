import {
  SpeechCapabilities,
  SpeechRecognitionCallbacks,
  StartListeningOptions,
  isRunningInExpoGo,
} from './speechRecognitionTypes';

export * from './speechRecognitionTypes';

/**
 * Speech Recognition Service for iOS powered by Apple SFSpeechRecognizer & AVAudioEngine
 * through expo-speech-recognition.
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
    console.warn('[SpeechService.iOS] expo-speech-recognition module could not be required:', err);
  }
  return null;
}

/**
 * Detects current speech recognition capabilities on iOS.
 * Checks Apple SFSpeechRecognizer availability and supported locales dynamically.
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
      supportedLocales: [],
      localeSupported: false,
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
      supportedLocales: [],
      localeSupported: false,
    };
  }

  let isAvailable = false;
  let supportsOnDevice = false;
  let supportedLocales: string[] = [];
  let localeSupported = false;

  try {
    if (typeof speechMod.isRecognitionAvailable === 'function') {
      isAvailable = speechMod.isRecognitionAvailable();
    } else {
      isAvailable = true;
    }

    if (typeof speechMod.supportsOnDeviceRecognition === 'function') {
      supportsOnDevice = speechMod.supportsOnDeviceRecognition();
    }

    if (typeof speechMod.getSupportedLocales === 'function') {
      try {
        const result = await speechMod.getSupportedLocales({});
        supportedLocales = result?.locales || [];
        // Check if configuredLocale (e.g. en-IN or en_IN) is in supportedLocales
        const normalized = configuredLocale.replace(/_/g, '-');
        localeSupported = supportedLocales.some(
          (loc) => loc.replace(/_/g, '-').toLowerCase() === normalized.toLowerCase()
        );
      } catch (locErr) {
        console.warn('[SpeechService.iOS] Could not retrieve supported locales:', locErr);
        // en-IN is supported on iOS 10+
        localeSupported = true;
      }
    } else {
      localeSupported = true;
    }

    let permStatus: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';
    if (typeof speechMod.getPermissionsAsync === 'function') {
      try {
        const p = await speechMod.getPermissionsAsync();
        permStatus = p?.granted ? 'granted' : (p?.status === 'denied' ? 'denied' : 'prompt');
      } catch {}
    }

    return {
      available: isAvailable,
      isExpoGo: false,
      services: ['apple.speech.sfspeechrecognizer'],
      defaultService: 'Apple Speech Recognition (SFSpeechRecognizer)',
      isGoogleAvailable: false,
      supportsOnDevice,
      currentLocale: configuredLocale,
      supportedLocales,
      localeSupported,
      permissionStatus: permStatus,
    };
  } catch (err) {
    console.warn('[SpeechService.iOS] Error checking iOS capabilities:', err);
    return {
      available: true,
      isExpoGo: false,
      services: ['apple.speech.sfspeechrecognizer'],
      defaultService: 'Apple Speech Recognition (SFSpeechRecognizer)',
      isGoogleAvailable: false,
      supportsOnDevice: false,
      currentLocale: configuredLocale,
      permissionStatus: 'unknown',
    };
  }
}

/**
 * Requests microphone and speech recognition permissions on iOS using Apple's authorization dialogs.
 * Bypasses Android permission APIs; uses native Apple authorization.
 */
export async function requestSpeechPermissions(): Promise<{ granted: boolean; message?: string }> {
  if (isRunningInExpoGo()) {
    return {
      granted: false,
      message: 'Speech recognition requires a standalone build. In Expo Go, please type commands.',
    };
  }

  const speechMod = getSpeechModule();
  if (!speechMod) {
    return {
      granted: false,
      message: 'Apple Speech Recognition module is not available in this binary.',
    };
  }

  try {
    // On iOS, requestPermissionsAsync() prompts both SFSpeechRecognizer and AVAudioSession permissions
    if (typeof speechMod.requestPermissionsAsync === 'function') {
      const permResponse = await speechMod.requestPermissionsAsync();
      if (!permResponse.granted) {
        if (permResponse.status === 'denied') {
          return {
            granted: false,
            message: 'Microphone or Speech Recognition permission was denied. Please allow access in iOS Settings > A Note.',
          };
        }
        return {
          granted: false,
          message: 'Speech recognition permission was not granted.',
        };
      }
    }

    return { granted: true };
  } catch (err: any) {
    console.warn('[SpeechService.iOS] Permission request failed:', err);
    return {
      granted: false,
      message: err?.message || 'Failed to request iOS speech recognition permissions.',
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
 * Starts an Apple Speech Recognition session on iOS.
 * Guaranteed at-most-once session execution and single-listener lifecycle.
 */
export async function startSpeechRecognition(
  callbacks: SpeechRecognitionCallbacks,
  options: StartListeningOptions = {}
): Promise<{ success: boolean; error?: string }> {
  if (isRunningInExpoGo()) {
    const msg = 'Speech recognition requires a standalone build. In Expo Go, please use typed commands.';
    callbacks.onError(msg, 'expo-go');
    return { success: false, error: msg };
  }

  const speechMod = getSpeechModule();
  if (!speechMod) {
    const msg = 'Apple Speech Recognition module is unavailable.';
    callbacks.onError(msg, 'module-unavailable');
    return { success: false, error: msg };
  }

  // 1. Request/verify permissions
  const perm = await requestSpeechPermissions();
  if (!perm.granted) {
    callbacks.onError(perm.message || 'Microphone or speech permission denied.', 'permission-denied');
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

  // 3. Prepare contextual biasing strings for Apple SFSpeechAudioBufferRecognitionRequest
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
    // 4. Configure iOS AVAudioSession Category
    if (typeof speechMod.setCategoryIOS === 'function') {
      try {
        speechMod.setCategoryIOS({
          category: 'playAndRecord',
          categoryOptions: ['duckOthers', 'defaultToSpeaker'],
          mode: 'measurement',
        });
      } catch (catErr) {
        console.warn('[SpeechService.iOS] Note: setCategoryIOS exception:', catErr);
      }
    }

    // 5. Register event listeners on speechMod
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
        // iOS emits power/decibel values (often -160 to 0 dB, or linear 0 to 1)
        const raw = typeof event?.value === 'number' ? event.value : 0;
        let normalized = 0;
        if (raw >= 0 && raw <= 1) {
          normalized = raw;
        } else if (raw < 0) {
          // Decibels: -60 dB is silence, 0 dB is peak
          normalized = Math.max(0, Math.min(1, (raw + 60) / 60));
        }
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
        let userMessage = event?.message || 'Apple Speech Recognition encountered an issue.';

        if (errType === 'no-speech') {
          userMessage = 'No speech detected. Tap microphone to speak.';
        } else if (errType === 'network') {
          userMessage = 'Apple speech recognition service requires a network connection on this device.';
        } else if (errType === 'not-allowed') {
          userMessage = 'Microphone or Speech Recognition permission not allowed in iOS Settings.';
        } else if (errType === 'interrupted' || errType === 'busy') {
          userMessage = 'Audio session was interrupted. Tap microphone to try again.';
        } else if (errType === 'language-not-supported') {
          userMessage = `Locale "${targetLocale}" is not supported on this device.`;
        } else if (errType === 'service-not-allowed') {
          userMessage = 'Speech recognition is restricted on this device (check Screen Time / Content Restrictions).';
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

    // 6. Start native Apple Speech recognition
    speechMod.start({
      lang: targetLocale,
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: options.requiresOnDevice || false,
      addsPunctuation: false,
      contextualStrings,
      iosTaskHint: 'dictation',
      volumeChangeEventOptions: {
        enabled: true,
        intervalMillis: 60,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.warn('[SpeechService.iOS] Failed to start recognition:', err);
    isSessionActive = false;
    cleanupListeners();
    callbacks.onError(err?.message || 'Failed to start Apple speech recognition.', 'start-failed');
    return { success: false, error: err?.message };
  }
}

/**
 * Stops Apple speech recognition gracefully and waits for final result.
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
 * Aborts Apple speech recognition immediately without waiting for final result.
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
