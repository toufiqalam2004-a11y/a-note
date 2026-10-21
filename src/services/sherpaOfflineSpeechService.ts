import { Platform, PermissionsAndroid, NativeModules, TurboModuleRegistry } from 'react-native';
import Constants, { ExecutionEnvironment, AppOwnership } from 'expo-constants';
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
 * Checks whether the native SherpaOnnx module is bundled and available in the current binary.
 * Inspects both React Native TurboModuleRegistry and legacy NativeModules bridge.
 */
export function isSherpaNativeAvailable(): boolean {
  if (Platform.OS === 'web') return false;

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
 * Reliably checks whether the app is currently running inside standard Expo Go.
 *
 * Requirements:
 * 1. If SherpaOnnx native module is present in the binary, it CANNOT be standard Expo Go
 *    (Expo Go never includes custom native C++ ONNX modules).
 * 2. In modern Expo SDKs (SDK 50+), the official supported check is:
 *    Constants.executionEnvironment === ExecutionEnvironment.StoreClient.
 * 3. In a standalone APK or EAS preview build, Constants.executionEnvironment is 'standalone' or 'bare'.
 *    A standalone APK will never be identified as Expo Go.
 */
export function isRunningInExpoGo(): boolean {
  if (Platform.OS === 'web') return false;

  // If the binary has SherpaOnnx linked, it is a standalone APK or custom dev build, never Expo Go.
  if (isSherpaNativeAvailable()) {
    return false;
  }

  // Official Expo SDK runtime execution environment check for Expo Go store client
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return true;
  }

  // Fallback for older Expo runtime states
  if (
    Constants.appOwnership === AppOwnership.Expo ||
    (Constants.appOwnership as any) === 'expo'
  ) {
    return true;
  }

  return false;
}

/**
 * Safely resolves the native SherpaOnnx STT and Audio modules.
 */
export function getNativeSherpaModule(): { stt: any; audio: any } | null {
  if (Platform.OS === 'web') return null;

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
      decodingMethod: 'greedy_search',
      maxActivePaths: 4,
      numThreads: 2,
    });

    activeEngine = engine;
    activeEngineModelDir = cleanNativeDir;
    console.log('[SherpaSpeech] Offline speech engine initialized successfully!');
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

export interface OfflineListeningCallbacks {
  onListeningStart?: () => void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (errorMessage: string) => void;
  onListeningEnd?: () => void;
}

/**
 * Starts live on-device offline recognition via microphone stream.
 */
export async function startSherpaOfflineListening(
  callbacks: OfflineListeningCallbacks
): Promise<{ success: boolean; error?: string }> {
  // Prevent multiple simultaneous microphone sessions
  if (isListening || activePcmHandle) {
    console.log('[SherpaSpeech] Previous session active, stopping before starting fresh session.');
    await stopSherpaOfflineListening();
  }

  // 1. Check microphone permission
  const perm = await requestMicrophonePermission();
  if (!perm.granted) {
    const errMsg = perm.message || 'Microphone permission was not granted.';
    callbacks.onError(errMsg);
    return { success: false, error: errMsg };
  }

  // 2. Resolve or initialize engine
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

  try {
    isListening = true;

    // 3. Create fresh stream from engine
    const stream = await engine.createStream();
    activeStream = stream;

    // 4. Create native PCM live stream (16kHz mono)
    const pcm = native.audio.createPcmLiveStream({
      sampleRate: 16000,
      channelCount: 1,
    });
    activePcmHandle = pcm;

    let hasEnded = false;
    let accumulatedText = '';

    const cleanupActiveSession = async () => {
      if (hasEnded) return;
      hasEnded = true;
      isListening = false;

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

    // Attach data listener: incoming PCM samples fed directly into ONNX stream
    unsubscribePcmData = pcm.onData(async (samples: Float32Array, sr: number) => {
      if (hasEnded) return;
      try {
        const { result, isEndpoint } = await stream.processAudioChunk(samples, sr);
        const currentText = (result?.text || '').trim();

        if (currentText) {
          accumulatedText = currentText;
          callbacks.onTranscript(currentText, isEndpoint);
        }

        if (isEndpoint) {
          // Detected end of utterance naturally
          await cleanupActiveSession();
          if (accumulatedText) {
            callbacks.onTranscript(accumulatedText, true);
          }
        }
      } catch (chunkErr: any) {
        console.warn('[SherpaSpeech] Chunk processing error:', chunkErr);
      }
    });

    unsubscribePcmError = pcm.onError((errMsg: string) => {
      if (hasEnded) return;
      callbacks.onError(errMsg || 'Microphone stream error.');
      cleanupActiveSession();
    });

    // 5. Start microphone capture
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
 */
export async function getSherpaDiagnostics(): Promise<SherpaDiagnostics> {
  const isExpo = isRunningInExpoGo();
  const nativeAvailable = isSherpaNativeAvailable();
  const modelCheck = await checkSherpaModelInstalled();
  return {
    isExpoGo: isExpo,
    executionEnvironment: String(Constants.executionEnvironment || 'unknown'),
    isNativeModuleAvailable: nativeAvailable,
    modelInstalled: modelCheck.isInstalled,
    modelNativeDir: getSherpaModelNativePath(),
    engineInitialized: !!activeEngine,
    lastError: lastEngineInitError,
  };
}
