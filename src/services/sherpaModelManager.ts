import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ModelFileInfo {
  name: string;
  expectedMinBytes: number;
}

export interface ModelConfig {
  id: string;
  displayName: string;
  architecture: string;
  license: string;
  approxSizeMb: number;
  files: ModelFileInfo[];
  baseUrl: string;
  fallbackBaseUrl?: string;
}

export const SHERPA_ZIPFORMER_EN_20M: ModelConfig = {
  id: 'sherpa-onnx-streaming-zipformer-en-20M-2023-02-17',
  displayName: 'Streaming Zipformer English (20M)',
  architecture: 'Next-gen Kaldi Zipformer Transducer (INT8 Quantized)',
  license: 'Apache-2.0 (Permissive, Open-Source, Commercial Use Allowed)',
  approxSizeMb: 43.6,
  baseUrl: 'https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17/resolve/main/',
  fallbackBaseUrl: 'https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/',
  files: [
    { name: 'encoder-epoch-99-avg-1.int8.onnx', expectedMinBytes: 40_000_000 },
    { name: 'decoder-epoch-99-avg-1.int8.onnx', expectedMinBytes: 500_000 },
    { name: 'joiner-epoch-99-avg-1.int8.onnx', expectedMinBytes: 240_000 },
    { name: 'tokens.txt', expectedMinBytes: 4_000 },
  ],
};

const ASYNC_STORAGE_MODEL_INSTALLED_KEY = '@anote_sherpa_model_installed_v1';

/**
 * Returns the app-private URI (with file:// scheme) where the model files are stored.
 * Used with Expo FileSystem methods.
 */
export function getSherpaModelDirectory(): string {
  const docDir = FileSystem.documentDirectory || '';
  return `${docDir}sherpa_models/streaming-zipformer-en-20M/`;
}

/**
 * Returns the clean absolute filesystem path WITHOUT the 'file://' URI scheme,
 * and without a trailing slash. Required by native C++/Java/Kotlin File APIs.
 */
export function getSherpaModelNativePath(): string {
  const dir = getSherpaModelDirectory();
  return dir.replace(/^file:\/\//, '').replace(/\/+$/, '');
}

export interface DetailedFileCheck {
  name: string;
  expectedMinBytes: number;
  exists: boolean;
  actualBytes: number;
  uriPath: string;
  nativePath: string;
}

/**
 * Checks whether all required model files are present and have valid size on disk.
 */
export async function checkSherpaModelInstalled(): Promise<{
  isInstalled: boolean;
  modelDir: string;
  nativeDir: string;
  missingFiles: string[];
  totalBytesOnDisk: number;
  fileDetails: DetailedFileCheck[];
}> {
  const modelDir = getSherpaModelDirectory();
  const nativeDir = getSherpaModelNativePath();
  const dirInfo = await FileSystem.getInfoAsync(modelDir);

  const missingFiles: string[] = [];
  const fileDetails: DetailedFileCheck[] = [];
  let totalBytesOnDisk = 0;

  for (const file of SHERPA_ZIPFORMER_EN_20M.files) {
    const filePath = `${modelDir}${file.name}`;
    const nativeFilePath = `${nativeDir}/${file.name}`;
    let exists = false;
    let actualBytes = 0;

    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        exists = true;
        actualBytes = fileInfo.size || 0;
        if (actualBytes >= file.expectedMinBytes) {
          totalBytesOnDisk += actualBytes;
        } else {
          missingFiles.push(file.name);
        }
      } else {
        missingFiles.push(file.name);
      }
    } catch {
      missingFiles.push(file.name);
    }

    fileDetails.push({
      name: file.name,
      expectedMinBytes: file.expectedMinBytes,
      exists,
      actualBytes,
      uriPath: filePath,
      nativePath: nativeFilePath,
    });
  }

  const isInstalled = missingFiles.length === 0;

  if (isInstalled) {
    await AsyncStorage.setItem(ASYNC_STORAGE_MODEL_INSTALLED_KEY, 'true');
  } else {
    await AsyncStorage.removeItem(ASYNC_STORAGE_MODEL_INSTALLED_KEY);
  }

  return {
    isInstalled,
    modelDir,
    nativeDir,
    missingFiles,
    totalBytesOnDisk,
    fileDetails,
  };
}

/**
 * Downloads the Sherpa-ONNX model files directly with progressive callback updates.
 * Files are verified after download and stored in app-private storage.
 */
export async function downloadSherpaModel(
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<{ success: boolean; modelDir: string; error?: string }> {
  const modelDir = getSherpaModelDirectory();

  try {
    // 1. Ensure model target directory exists
    const dirInfo = await FileSystem.getInfoAsync(modelDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
    }

    const totalFiles = SHERPA_ZIPFORMER_EN_20M.files.length;
    let completedFiles = 0;

    for (let i = 0; i < totalFiles; i++) {
      const file = SHERPA_ZIPFORMER_EN_20M.files[i];
      const targetFilePath = `${modelDir}${file.name}`;
      const tempFilePath = `${targetFilePath}.download`;

      // Check if file is already downloaded with valid size
      const existingInfo = await FileSystem.getInfoAsync(targetFilePath);
      if (existingInfo.exists && existingInfo.size && existingInfo.size >= file.expectedMinBytes) {
        completedFiles++;
        continue;
      }

      const fileDisplayName = file.name.replace('.int8.onnx', '').replace('-epoch-99-avg-1', '');
      onProgress?.(
        Math.round((completedFiles / totalFiles) * 100),
        `Downloading ${fileDisplayName} (${i + 1}/${totalFiles})...`
      );

      // Download using FileSystem.createDownloadResumable for reliable progress tracking
      const downloadUrl = `${SHERPA_ZIPFORMER_EN_20M.baseUrl}${file.name}`;
      const downloadResumable = FileSystem.createDownloadResumable(
        downloadUrl,
        tempFilePath,
        {},
        (downloadProgress) => {
          if (downloadProgress.totalBytesExpectedToWrite > 0) {
            const fileFraction = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            const overallPercent = Math.min(
              99,
              Math.round(((completedFiles + fileFraction) / totalFiles) * 100)
            );
            onProgress?.(
              overallPercent,
              `Downloading ${fileDisplayName}... ${Math.round(fileFraction * 100)}%`
            );
          }
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();
      if (!downloadResult || downloadResult.status !== 200) {
        // Clean up partial temp file
        try {
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        } catch {}
        throw new Error(
          `Failed to download ${file.name} (HTTP ${downloadResult?.status || 'Unknown'}). Check internet connection.`
        );
      }

      // Verify downloaded file size
      const downloadedInfo = await FileSystem.getInfoAsync(tempFilePath);
      if (!downloadedInfo.exists || (downloadedInfo.size && downloadedInfo.size < file.expectedMinBytes)) {
        try {
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        } catch {}
        throw new Error(`Downloaded ${file.name} appears incomplete or corrupted.`);
      }

      // Atomically move temp file to permanent target
      await FileSystem.moveAsync({
        from: tempFilePath,
        to: targetFilePath,
      });

      completedFiles++;
    }

    // Final verification of all model files
    const verification = await checkSherpaModelInstalled();
    if (!verification.isInstalled) {
      throw new Error(`Model installation incomplete. Missing files: ${verification.missingFiles.join(', ')}`);
    }

    await AsyncStorage.setItem(ASYNC_STORAGE_MODEL_INSTALLED_KEY, 'true');
    onProgress?.(100, 'Offline speech model ready!');

    return { success: true, modelDir };
  } catch (err: any) {
    console.warn('[SherpaModelManager] Download error:', err);
    return {
      success: false,
      modelDir,
      error: err?.message || 'Failed to download offline voice model.',
    };
  }
}

/**
 * Deletes the locally downloaded model files to free space if needed.
 */
export async function deleteSherpaModel(): Promise<void> {
  const modelDir = getSherpaModelDirectory();
  try {
    await FileSystem.deleteAsync(modelDir, { idempotent: true });
    await AsyncStorage.removeItem(ASYNC_STORAGE_MODEL_INSTALLED_KEY);
  } catch (err) {
    console.warn('[SherpaModelManager] Delete error:', err);
  }
}
