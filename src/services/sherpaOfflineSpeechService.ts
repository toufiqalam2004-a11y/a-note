import { Platform, PermissionsAndroid, NativeModules, TurboModuleRegistry } from 'react-native';
import { isRunningInExpoGo as isExpoGoRuntime } from 'expo';
import Constants, { AppOwnership } from 'expo-constants';
import {
  checkSherpaModelInstalled,
  getSherpaModelDirectory,
  getSherpaModelNativePath,
} from './sherpaModelManager';

let cachedSttModule: any = null;
let cachedAudioModule: any = null;
let moduleResolutionAttempted = false;
let lastEngineInitError: string | null = null;

/**
 * Reliably checks whether the app is currently running inside standard Expo Go.
 *
 * Uses the official Expo SDK runtime detection:
 * 1. `isRunningInExpoGo()` from `expo` (detects presence of native `ExpoGo` module linked exclusively in Expo Go host app).
 * 2. `Constants.appOwnership === AppOwnership.Expo || Constants.appOwnership === 'expo'`.
 *
 * Note: Standalone APKs (EAS build) or development builds do NOT have the `ExpoGo` native module,
 * so this returns false.
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

/**
 * Checks whether the native SherpaOnnx module is bundled and available in the current binary.
 * In Expo Go, custom C++ ONNX native binaries are never available, so we immediately return false
 * without attempting any TurboModule or NativeModules lookup that could fail.
 */
export function isSherpaNativeAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (isRunningInExpoGo()) return false;

  try {
    const turboModule = TurboModuleRegistry.get('SherpaOnnx');
    if (turboModule != null) return true;
  } catch {}

  try {
    const legacyModule = (NativeModules as any)?.SherpaOnnx;
    if (legacyModule != null) return true;
  } catch {}

  return false;
}

/**
 * Safely resolves the native SherpaOnnx STT and Audio modules.
 * In Expo Go, this strictly returns null and NEVER requires or imports `react-native-sherpa-onnx`.
 */
export function getNativeSherpaModule(): { stt: any; audio: any } | null {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null;

  if (cachedSttModule && cachedAudioModule) {
    return { stt: cachedSttModule, audio: cachedAudioModule };
  }

  if (moduleResolutionAttempted && (!cachedSttModule || !cachedAudioModule)) {
    return null;
  }

  moduleResolutionAttempted = true;

  try {
    const isAvailable = isSherpaNativeAvailable();
    if (!isAvailable) {
      console.warn('[SherpaSpeech] SherpaOnnx native module is not registered in the runtime binary.');
      return null;
    }

    const stt = require('react-native-sherpa-onnx/stt');
    const audio = require('react-native-sherpa-onnx/audio');

    if (
      stt &&
      typeof stt.createStreamingSTT === 'function' &&
      audio &&
      typeof audio.createPcmLiveStream === 'function'
    ) {
      cachedSttModule = stt;
      cachedAudioModule = audio;
      console.log('[SherpaSpeech] Successfully resolved react-native-sherpa-onnx STT and Audio modules.');
      return { stt: cachedSttModule, audio: cachedAudioModule };
    } else {
      console.warn('[SherpaSpeech] react-native-sherpa-onnx modules resolved but expected factory functions are missing.');
      return null;
    }
  } catch (err) {
    console.warn('[SherpaSpeech] Could not resolve react-native-sherpa-onnx native module:', err);
    cachedSttModule = null;
    cachedAudioModule = null;
    return null;
  }
}

/**
 * Requests microphone permission on Android safely.
 */
export async function requestMicrophonePermission(): Promise<{ granted: boolean; message?: string }> {
  if (Platform.OS !== 'android') {
    return { granted: true };
  }

  try {
    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    if (alreadyGranted) {
      return { granted: true };
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'A Note requires microphone access for offline voice recognition.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
    return {
      granted: isGranted,
      message: isGranted
        ? undefined
        : 'Microphone permission was denied. Please allow microphone access in device settings.',
    };
  } catch (err: any) {
    return { granted: false, message: err?.message || 'Failed to request microphone permission.' };
  }
}

// Singleton state for Sherpa-ONNX engine and active stream
let activeEngine: any = null;
let activeEngineModelDir: string | null = null;
let activeStream: any = null;
let activePcmHandle: any = null;
let unsubscribePcmData: (() => void) | null = null;
let unsubscribePcmError: (() => void) | null = null;
let isInitializingEngine = false;
let isListening = false;

/**
 * Initializes or reuses the singleton Streaming STT engine for the downloaded model.
 */
export async function getOrInitializeSherpaEngine(): Promise<{
  engine: any | null;
  error?: string;
}> {
  if (activeEngine && activeEngineModelDir) {
    return { engine: activeEngine };
  }

  if (isInitializingEngine) {
    let waitCount = 0;
    while (isInitializingEngine && waitCount < 20) {
      await new Promise((r) => setTimeout(r, 150));
      waitCount++;
    }
    if (activeEngine) return { engine: activeEngine };
  }

  // 1. Check if genuinely running inside standard Expo Go
  if (isRunningInExpoGo()) {
    return {
      engine: null,
      error:
        'Expo Go detected: Offline voice recognition requires the standalone A Note APK. Native C++ ONNX speech binaries cannot run inside Expo Go.',
    };
  }

  // 2. Check native module availability
  const native = getNativeSherpaModule();
  if (!native) {
    return {
      engine: null,
      error:
        'Sherpa-ONNX native module is not registered in this binary. Please ensure you are running the installed standalone APK.',
    };
  }

  // 3. Check model installation
  const modelStatus = await checkSherpaModelInstalled();
  if (!modelStatus.isInstalled) {
    return {
      engine: null,
      error: 'Offline voice model is not installed. Please download the model first (~43 MB).',
    };
  }

  try {
    isInitializingEngine = true;
    const rawNativeDir = getSherpaModelNativePath();
    // Ensure clean POSIX path without file:// or trailing slash
    const cleanNativeDir = rawNativeDir.replace(/^file:\/\//, '').replace(/\/+$/, '');

    console.log('[SherpaSpeech] Initializing native engine with clean path:', cleanNativeDir);

    const engine = await native.stt.createStreamingSTT({
      modelPath: { type: 'file', path: cleanNativeDir },
      modelType: 'transducer',
      enableEndpoint: true,
      enableInputNormalization: false, // CRITICAL: Stop 80x noise magnification on silence
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      numThreads: 2,
      endpointConfig: {
        rule1: { mustContainNonSilence: true, minTrailingSilence: 2.4, minUtteranceLength: 0.0 },
        rule2: { mustContainNonSilence: true, minTrailingSilence: 1.2, minUtteranceLength: 0.0 },
        rule3: { mustContainNonSilence: false, minTrailingSilence: 0.0, minUtteranceLength: 20.0 },
      },
    });

    activeEngine = engine;
    activeEngineModelDir = cleanNativeDir;
    console.log('[SherpaSpeech] Offline speech engine initialized successfully with calibrated endpointing.');
    return { engine: activeEngine };
  } catch (err: any) {
    console.warn('[SherpaSpeech] Engine initialization failed:', err);
    activeEngine = null;
    activeEngineModelDir = null;
    return {
      engine: null,
      error: err?.message || 'Failed to initialize offline recognition engine.',
    };
  } finally {
    isInitializingEngine = false;
  }
}

/**
 * Calculates the Root-Mean-Square (RMS) audio energy of a PCM chunk.
 * Normal Float32Array values are in range [-1.0, 1.0].
 * Silence is typically < 0.010; normal voice speech is typically 0.02 to 0.3+.
 */
export function calculatePcmRms(samples: Float32Array): number {
  if (!samples || samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

// Calibrated RMS threshold for human speech activity vs room silence
export const SPEECH_RMS_THRESHOLD = 0.015;
// Max time to wait for initial speech before timing out
export const INITIAL_SILENCE_TIMEOUT_MS = 5500;
// Silence after speech required to finalize utterance
export const TRAILING_SILENCE_TIMEOUT_MS = 1400;

export interface OfflineListeningCallbacks {
  onListeningStart?: () => void;
  onAudioLevel?: (rms: number, isSpeech: boolean) => void;
  onSpeechStart?: () => void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onSilenceTimeout?: () => void;
  onError: (errorMessage: string) => void;
  onListeningEnd?: () => void;
}

let sessionCounter = 0;

/**
 * Starts live on-device offline recognition via microphone stream.
 * Employs Google-style voice interaction:
 * - Silence keeps UI calm and motionless
 * - Speech triggers audio-reactive waveform
 * - Chunks are queued sequentially to prevent bridge collisions
 * - Trailing silence triggers utterance finalization
 */
export async function startSherpaOfflineListening(
  callbacks: OfflineListeningCallbacks
): Promise<{ success: boolean; error?: string }> {
  // Prevent multiple simultaneous microphone sessions
  if (isListening || activePcmHandle) {
    console.log('[SherpaSpeech] Previous session active, stopping before starting fresh session.');
    await stopSherpaOfflineListening();
  }

  // 1. Guard against running inside Expo Go
  if (isRunningInExpoGo()) {
    const errMsg = 'Offline voice recognition requires the standalone A Note APK. In Expo Go, please use typed commands.';
    callbacks.onError(errMsg);
    return { success: false, error: errMsg };
  }

  // 2. Check microphone permission
  const perm = await requestMicrophonePermission();
  if (!perm.granted) {
    const errMsg = perm.message || 'Microphone permission was not granted.';
    callbacks.onError(errMsg);
    return { success: false, error: errMsg };
  }

  // 3. Resolve or initialize engine
  const { engine, error: engineError } = await getOrInitializeSherpaEngine();
  if (!engine) {
    const errMsg = engineError || 'Failed to start offline voice engine.';
    callbacks.onError(errMsg);
    return { success: false, error: errMsg };
  }

  const native = getNativeSherpaModule();
  if (!native) {
    const errMsg = 'Native audio capture module unavailable.';
    callbacks.onError(errMsg);
    return { success: false, error: errMsg };
  }

  const currentSessionId = ++sessionCounter;

  try {
    isListening = true;

    // 4. Create fresh stream from engine
    const stream = await engine.createStream();
    activeStream = stream;

    // 5. Create native PCM live stream (16kHz mono)
    const pcm = native.audio.createPcmLiveStream({
      sampleRate: 16000,
      channelCount: 1,
    });
    activePcmHandle = pcm;

    let hasEnded = false;
    let accumulatedText = '';
    let hasDetectedSpeech = false;
    let lastSpeechTimestamp = 0;
    const sessionStartTime = Date.now();

    // FIFO queue for incoming audio chunks to serialize native calls
    interface AudioChunkItem {
      samples: Float32Array;
      sampleRate: number;
    }
    const chunkQueue: AudioChunkItem[] = [];
    let isProcessingQueue = false;

    // Helper: Finalizes the decoder stream and flushes any trailing tokens
    const finalizeStream = async (): Promise<string> => {
      if (!activeStream || hasEnded) return accumulatedText;
      try {
        await stream.inputFinished();
        let loopCount = 0;
        while ((await stream.isReady()) && loopCount < 15) {
          await stream.decode();
          loopCount++;
        }
        const finalResult = await stream.getResult();
        const finalText = (finalResult?.text || '').trim();
        if (finalText) {
          accumulatedText = finalText;
        }
      } catch (finErr) {
        console.warn('[SherpaSpeech] Error during stream finalization:', finErr);
      }
      return accumulatedText;
    };

    const cleanupActiveSession = async () => {
      if (hasEnded || currentSessionId !== sessionCounter) return;
      hasEnded = true;
      isListening = false;

      if (silenceCheckInterval) {
        clearInterval(silenceCheckInterval);
        silenceCheckInterval = null;
      }

      if (unsubscribePcmData) {
        try { unsubscribePcmData(); } catch {}
        unsubscribePcmData = null;
      }
      if (unsubscribePcmError) {
        try { unsubscribePcmError(); } catch {}
        unsubscribePcmError = null;
      }

      try {
        await pcm.stop();
      } catch {}
      try {
        await stream.release();
      } catch {}

      activeStream = null;
      activePcmHandle = null;
      callbacks.onListeningEnd?.();
    };

    // Sequential queue processor
    const drainQueue = async () => {
      if (isProcessingQueue || hasEnded) return;
      isProcessingQueue = true;
      try {
        while (chunkQueue.length > 0 && !hasEnded && activeStream) {
          const item = chunkQueue.shift();
          if (!item) break;
          const { result, isEndpoint } = await stream.processAudioChunk(item.samples, item.sampleRate);
          const currentText = (result?.text || '').trim();

          if (currentText) {
            accumulatedText = currentText;
            callbacks.onTranscript(currentText, false);
          }

          if (isEndpoint) {
            // Sherpa endpoint detected
            const finalText = await finalizeStream();
            await cleanupActiveSession();
            callbacks.onTranscript(finalText || accumulatedText, true);
            break;
          }
        }
      } catch (err: any) {
        console.warn('[SherpaSpeech] Chunk queue drain error:', err);
      } finally {
        isProcessingQueue = false;
      }
    };

    // Periodic silence / endpoint detector (runs every 150ms)
    let silenceCheckInterval: any = setInterval(async () => {
      if (hasEnded || currentSessionId !== sessionCounter) {
        if (silenceCheckInterval) clearInterval(silenceCheckInterval);
        return;
      }

      const now = Date.now();

      // Case 1: Initial silence timeout (user didn't say anything for INITIAL_SILENCE_TIMEOUT_MS)
      if (!hasDetectedSpeech && now - sessionStartTime > INITIAL_SILENCE_TIMEOUT_MS) {
        await cleanupActiveSession();
        callbacks.onSilenceTimeout?.();
        return;
      }

      // Case 2: Trailing silence after speech detected (user paused/finished speaking)
      if (hasDetectedSpeech && now - lastSpeechTimestamp > TRAILING_SILENCE_TIMEOUT_MS) {
        const finalText = await finalizeStream();
        await cleanupActiveSession();
        callbacks.onTranscript(finalText || accumulatedText, true);
        return;
      }
    }, 150);

    // Attach data listener: incoming PCM samples fed through RMS meter and serialized queue
    unsubscribePcmData = pcm.onData((samples: Float32Array, sr: number) => {
      if (hasEnded || currentSessionId !== sessionCounter) return;

      const rms = calculatePcmRms(samples);
      const isSpeech = rms >= SPEECH_RMS_THRESHOLD;

      // Provide live audio level for Google-style waveform visualization
      callbacks.onAudioLevel?.(rms, isSpeech);

      if (isSpeech) {
        if (!hasDetectedSpeech) {
          hasDetectedSpeech = true;
          callbacks.onSpeechStart?.();
        }
        lastSpeechTimestamp = Date.now();
      }

      // Push to FIFO queue and drain sequentially
      chunkQueue.push({ samples, sampleRate: sr });
      drainQueue();
    });

    unsubscribePcmError = pcm.onError((errMsg: string) => {
      if (hasEnded || currentSessionId !== sessionCounter) return;
      callbacks.onError(errMsg || 'Microphone stream error.');
      cleanupActiveSession();
    });

    // 6. Start microphone capture
    await pcm.start();
    callbacks.onListeningStart?.();

    return { success: true };
  } catch (err: any) {
    isListening = false;
    activeStream = null;
    activePcmHandle = null;
    if (unsubscribePcmData) {
      try { unsubscribePcmData(); } catch {}
      unsubscribePcmData = null;
    }
    if (unsubscribePcmError) {
      try { unsubscribePcmError(); } catch {}
      unsubscribePcmError = null;
    }
    const errMsg = err?.message || 'Failed to start audio recording.';
    callbacks.onError(errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Stops the active listening session safely.
 */
export async function stopSherpaOfflineListening(): Promise<void> {
  isListening = false;

  if (unsubscribePcmData) {
    try { unsubscribePcmData(); } catch {}
    unsubscribePcmData = null;
  }
  if (unsubscribePcmError) {
    try { unsubscribePcmError(); } catch {}
    unsubscribePcmError = null;
  }

  if (activePcmHandle) {
    try {
      await activePcmHandle.stop();
    } catch {}
    activePcmHandle = null;
  }

  if (activeStream) {
    try {
      await activeStream.release();
    } catch {}
    activeStream = null;
  }
}

/**
 * Unloads the engine to completely free native ONNX memory.
 */
export async function destroySherpaOfflineEngine(): Promise<void> {
  await stopSherpaOfflineListening();

  if (activeEngine) {
    try {
      await activeEngine.destroy();
    } catch {}
    activeEngine = null;
    activeEngineModelDir = null;
  }
}

export interface SherpaDiagnostics {
  isExpoGo: boolean;
  executionEnvironment: string;
  isNativeModuleAvailable: boolean;
  modelInstalled: boolean;
  modelNativeDir: string;
  engineInitialized: boolean;
  lastError: string | null;
}

/**
 * Returns comprehensive runtime diagnostics for development / verification.
 * In Expo Go, returns safe environment indicators without attempting native module calls or disk checks.
 */
export async function getSherpaDiagnostics(): Promise<SherpaDiagnostics> {
  const isExpo = isRunningInExpoGo();
  if (isExpo) {
    return {
      isExpoGo: true,
      executionEnvironment: String(Constants.executionEnvironment || 'storeClient'),
      isNativeModuleAvailable: false,
      modelInstalled: false,
      modelNativeDir: '',
      engineInitialized: false,
      lastError: 'Expo Go detected: Offline voice recognition requires the standalone A Note APK.',
    };
  }

  const nativeAvailable = isSherpaNativeAvailable();
  const modelCheck = await checkSherpaModelInstalled();
  return {
    isExpoGo: false,
    executionEnvironment: String(Constants.executionEnvironment || 'unknown'),
    isNativeModuleAvailable: nativeAvailable,
    modelInstalled: modelCheck.isInstalled,
    modelNativeDir: getSherpaModelNativePath(),
    engineInitialized: !!activeEngine,
    lastError: lastEngineInitError,
  };
}
