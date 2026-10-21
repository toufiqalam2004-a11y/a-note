import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { getDbInstance } from './db';
import { Client, VideoItem, CompletionHistoryEntry } from '../types';

export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_APP_NAME = 'A Note';

export interface BackupMetadata {
  app: string;
  schemaVersion: number;
  backupVersion: string;
  createdAt: string; // ISO 8601
  devicePlatform: string;
  counts: {
    clients: number;
    videos: number;
    completionHistory: number;
  };
}

export interface BackupPayload {
  metadata: BackupMetadata;
  clients: Client[];
  videos: VideoItem[];
  completionHistory: CompletionHistoryEntry[];
}

export interface BackupResult {
  success: boolean;
  message: string;
  fileUri?: string;
  fileSize?: number;
  counts?: {
    clients: number;
    videos: number;
    completionHistory: number;
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  mode: 'merge' | 'replace';
  restoredCounts: {
    clients: number;
    videos: number;
    completionHistory: number;
  };
}

/**
 * Reads all data from local SQLite database into structured backup payload
 */
export async function getBackupData(): Promise<BackupPayload> {
  const db = await getDbInstance();
  if (!db) {
    throw new Error('Database is not initialized or accessible on this device.');
  }

  // 1. Fetch Clients
  const rawClients = await db.getAllAsync<{
    id: string;
    name: string;
    total_budget: number;
    rate_per_video: number;
    created_at: string;
    video_types?: string | null;
  }>('SELECT * FROM clients ORDER BY created_at ASC;');

  const clients: Client[] = rawClients.map((r) => {
    let videoTypes: string[] | undefined = undefined;
    if (r.video_types) {
      try {
        const parsed = JSON.parse(r.video_types);
        if (Array.isArray(parsed)) videoTypes = parsed;
      } catch {}
    }

    return {
      id: r.id,
      name: r.name,
      totalBudget: Number(r.total_budget),
      ratePerVideo: Number(r.rate_per_video),
      createdAt: r.created_at,
      videoTypes,
    };
  });

  // 2. Fetch Videos
  const rawVideos = await db.getAllAsync<{
    id: string;
    client_id: string;
    video_number: number;
    title: string | null;
    video_type?: string | null;
    is_completed: number;
    completed_at: string | null;
  }>('SELECT * FROM videos ORDER BY client_id, video_number ASC;');

  const videos: VideoItem[] = rawVideos.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    videoNumber: Number(r.video_number),
    title: r.title || undefined,
    videoType: r.video_type || undefined,
    isCompleted: Number(r.is_completed) === 1,
    completedAt: r.completed_at,
  }));

  // 3. Fetch Completion History
  const rawHistory = await db.getAllAsync<{
    id: string;
    client_id: string;
    client_name: string;
    video_id: string;
    video_number: number;
    completed_date: string;
    created_at: string;
  }>('SELECT * FROM completion_history ORDER BY created_at ASC;');

  const completionHistory: CompletionHistoryEntry[] = rawHistory.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    clientName: r.client_name,
    videoId: r.video_id,
    videoNumber: Number(r.video_number),
    completedDate: r.completed_date,
    createdAt: r.created_at,
  }));

  const metadata: BackupMetadata = {
    app: BACKUP_APP_NAME,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    backupVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    devicePlatform: Platform.OS,
    counts: {
      clients: clients.length,
      videos: videos.length,
      completionHistory: completionHistory.length,
    },
  };

  return {
    metadata,
    clients,
    videos,
    completionHistory,
  };
}

/**
 * Creates a verified JSON backup file and opens Android's document save / share sheet
 */
export async function createAndExportBackup(): Promise<BackupResult> {
  const payload = await getBackupData();

  const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error('Local file storage is not available on this device.');
  }

  const backupDir = `${baseDir.endsWith('/') ? baseDir : `${baseDir}/`}backups/`;

  // Ensure persistent backups directory exists
  const dirInfo = await FileSystem.getInfoAsync(backupDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `ANote_Backup_${timestamp}.json`;
  const fileUri = `${backupDir}${fileName}`;

  // Serialize to JSON with readable indentation
  const jsonContent = JSON.stringify(payload, null, 2);

  // Write file to persistent storage
  await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Verify file existence and non-zero size
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists || !fileInfo.size || fileInfo.size === 0) {
    throw new Error('Backup failed: the backup file was not created or is empty.');
  }

  // Trigger Android system document save / share sheet
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: `Save A Note Backup (${fileName})`,
      UTI: 'public.json',
    });
  }

  const sizeKb = Math.max(1, Math.round(fileInfo.size / 1024));

  return {
    success: true,
    message: `Backup created successfully (${sizeKb} KB, ${payload.clients.length} clients, ${payload.videos.length} videos).`,
    fileUri,
    fileSize: fileInfo.size,
    counts: payload.metadata.counts,
  };
}

/**
 * Validates the structure, schema, and field integrity of an imported backup payload
 */
export function validateBackupPayload(data: any): BackupPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file: Root content is not a valid JSON object.');
  }

  const metadata = data.metadata;
  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Invalid backup file: Missing metadata block.');
  }

  // Support both "A Note" and previous "EditFlow" backups safely
  const validAppNames = ['A Note', 'EditFlow'];
  if (!metadata.app || !validAppNames.includes(metadata.app)) {
    throw new Error(`Incompatible backup file: Created for "${metadata.app || 'Unknown'}", expected "A Note".`);
  }

  if (metadata.schemaVersion !== 1) {
    throw new Error(`Unsupported schema version: ${metadata.schemaVersion}. This app supports schema version 1.`);
  }

  if (!Array.isArray(data.clients)) {
    throw new Error('Invalid backup file: "clients" list is missing or invalid.');
  }

  if (!Array.isArray(data.videos)) {
    throw new Error('Invalid backup file: "videos" list is missing or invalid.');
  }

  if (!Array.isArray(data.completionHistory)) {
    throw new Error('Invalid backup file: "completionHistory" list is missing or invalid.');
  }

  // Validate each client record
  for (let i = 0; i < data.clients.length; i++) {
    const c = data.clients[i];
    if (!c.id || typeof c.id !== 'string') {
      throw new Error(`Client record #${i + 1} is missing a valid ID.`);
    }
    if (!c.name || typeof c.name !== 'string') {
      throw new Error(`Client record #${i + 1} has an invalid name.`);
    }
    if (typeof c.totalBudget !== 'number' || isNaN(c.totalBudget) || c.totalBudget < 0) {
      throw new Error(`Client "${c.name}" has an invalid total payment budget.`);
    }
    if (typeof c.ratePerVideo !== 'number' || isNaN(c.ratePerVideo) || c.ratePerVideo <= 0) {
      throw new Error(`Client "${c.name}" has an invalid rate per video.`);
    }
  }

  // Validate each video record
  for (let i = 0; i < data.videos.length; i++) {
    const v = data.videos[i];
    if (!v.id || typeof v.id !== 'string') {
      throw new Error(`Video record #${i + 1} is missing a valid ID.`);
    }
    if (!v.clientId || typeof v.clientId !== 'string') {
      throw new Error(`Video record #${i + 1} is missing a valid client ID.`);
    }
    if (typeof v.videoNumber !== 'number' || v.videoNumber < 1) {
      throw new Error(`Video record #${i + 1} has an invalid video number.`);
    }
  }

  return data as BackupPayload;
}

/**
 * Restores data from a backup payload into SQLite using a safe transaction with rollback
 */
export async function restoreBackupData(
  payload: BackupPayload,
  mode: 'merge' | 'replace' = 'merge'
): Promise<RestoreResult> {
  const db = await getDbInstance();
  if (!db) {
    throw new Error('Database is not initialized or accessible.');
  }

  // Validate again before touching the database
  const valid = validateBackupPayload(payload);

  // Execute in an explicit safe SQLite transaction
  await db.execAsync('BEGIN TRANSACTION;');

  try {
    if (mode === 'replace') {
      // Clear existing records in proper dependency order
      await db.execAsync('DELETE FROM completion_history;');
      await db.execAsync('DELETE FROM videos;');
      await db.execAsync('DELETE FROM clients;');
    }

    // Insert or update clients
    for (const client of valid.clients) {
      const typesJson = client.videoTypes && Array.isArray(client.videoTypes)
        ? JSON.stringify(client.videoTypes)
        : null;

      await db.runAsync(
        `INSERT INTO clients (id, name, total_budget, rate_per_video, created_at, video_types)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           total_budget = excluded.total_budget,
           rate_per_video = excluded.rate_per_video,
           video_types = excluded.video_types;`,
        client.id,
        client.name,
        client.totalBudget,
        client.ratePerVideo,
        client.createdAt || new Date().toISOString(),
        typesJson
      );
    }

    // Insert or update videos
    for (const video of valid.videos) {
      await db.runAsync(
        `INSERT INTO videos (id, client_id, video_number, title, video_type, is_completed, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           video_type = excluded.video_type,
           is_completed = excluded.is_completed,
           completed_at = excluded.completed_at;`,
        video.id,
        video.clientId,
        video.videoNumber,
        video.title || null,
        video.videoType || null,
        video.isCompleted ? 1 : 0,
        video.completedAt || null
      );
    }

    // Insert completion history (ignoring duplicates by ID)
    for (const hist of valid.completionHistory) {
      await db.runAsync(
        `INSERT OR IGNORE INTO completion_history (id, client_id, client_name, video_id, video_number, completed_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        hist.id,
        hist.clientId,
        hist.clientName,
        hist.videoId,
        hist.videoNumber,
        hist.completedDate,
        hist.createdAt || new Date().toISOString()
      );
    }

    // Commit transaction
    await db.execAsync('COMMIT;');

    const modeLabel = mode === 'replace' ? 'replaced' : 'merged';
    return {
      success: true,
      message: `Successfully ${modeLabel} ${valid.clients.length} clients, ${valid.videos.length} video records, and ${valid.completionHistory.length} history items.`,
      mode,
      restoredCounts: {
        clients: valid.clients.length,
        videos: valid.videos.length,
        completionHistory: valid.completionHistory.length,
      },
    };
  } catch (error) {
    // Rollback on any failure to preserve existing database state
    try {
      await db.execAsync('ROLLBACK;');
    } catch (rbErr) {
      console.warn('[A Note Backup] Rollback error:', rbErr);
    }
    throw error;
  }
}
