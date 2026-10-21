import { Platform, PermissionsAndroid } from 'react-native';
import Constants, { AppOwnership } from 'expo-constants';
import { requireOptionalNativeModule } from 'expo';
import {
  checkSherpaModelInstalled,
  getSherpaModelDirectory,
  getSherpaModelNativePath,
} from './sherpaModelManager';

/**
 * Checks whether the app is currently running inside standard Expo Go.
 */
export const isRunningInExpoGo: boolean =
  Constants.appOwnership === AppOwnership.Expo ||
  Constants.appOwnership === 'expo';

let cachedSttModule: any = null;
let cachedAudioModule: any = null;
let moduleResolutionAttempted = false;

/**
 * Safely resolves the native SherpaOnnx module without crashing in Expo Go or web.
 */
export function getNativeSherpaModule(): { stt: any; audio: any } | null {
  if (Platform.OS === 'web') return null;

  if (moduleResolutionAttempted) {
    if (cachedSttModule && cachedAudioModule) {
      return { stt: cachedSttModule, audio: cachedAudioModule };
    }
    return null;
  }

  moduleResolutionAttempted = true;

  try {
    const nativeModule = requireOptionalNativeModule('SherpaOnnx');
    if (!nativeModule) {
      cachedSttModule = null;
      cachedAudioModule = null;
      return null;
    }

    cachedSttModule = require('react-native-sherpa-onnx/stt');
    cachedAudioModule = require('react-native-sherpa-onnx/audio');
    return { stt: cachedSttModule, audio: cachedAudioModule };
  } catch (err) {
    console.warn('[SherpaSpeech] Could not resolve react-native-sherpa-onnx native module:', err);
    cachedSttModule = null;
    cachedAudioModule = null;
    return null;
  }
}

/**
 * Returns true if the native Sherpa-ONNX engine is bundled and available in the current binary.
 */
export function isSherpaNativeAvailable(): boolean {
  return getNativeSherpaModule() != null;
}

/**
 * Requests microphone permission on Android safely.
 */
export async function requestMicrophonePermission(): Promise<{ granted: boolean; message?: string }> {
  if (Platform.OS !== 'android') {
    return { granted: true };
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'A Note requires microphone access for offline voice recognition.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return {
      granted: granted === PermissionsAndroid.RESULTS.GRANTED,
      message: granted === PermissionsAndroid.RESULTS.GRANTED ? undefined : 'Microphone permission denied.',
    };
  } catch (err: any) {
    return { granted: false, message: err?.message || 'Permission request failed.' };
  }
}

// Singleton state for Sherpa-ONNX engine and active stream
let activeEngine: any = null;
let activeEngineModelDir: string | null = null;
let activeStream: any = null;
let activePcmHandle: any = null;
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
    // Wait briefly if initialization is already in progress
    let waitCount = 0;
    while (isInitializingEngine && waitCount < 20) {
      await new Promise((r) => setTimeout(r, 150));
      waitCount++;
    }
    if (activeEngine) return { engine: activeEngine };
  }

  const native = getNativeSherpaModule();
  if (!native) {
    if (isRunningInExpoGo) {
      return {
        engine: null,
        error:
          'Expo Go does not include on-device C++ ONNX native binaries. A standalone Android APK or development build is required for offline speech recognition.',
      };
    }
    return {
      engine: null,
      error: 'Sherpa-ONNX native library is not linked in this build.',
    };
  }

  const modelStatus = await checkSherpaModelInstalled();
  if (!modelStatus.isInstalled) {
    return {
      engine: null,
      error: 'Offline voice model is not installed. Please download the model first.',
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
  if (isListening) {
    return { success: false, error: 'Recognition session already running.' };
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
    pcm.onData(async (samples: Float32Array, sr: number) => {
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

    pcm.onError((errMsg: string) => {
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
    const errMsg = err?.message || 'Failed to start audio recording.';
    callbacks.onError(errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Stops the active listening session safely.
 */
export async function stopSherpaOfflineListening(): Promise<void> {
  if (!isListening && !activePcmHandle) return;

  isListening = false;
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
