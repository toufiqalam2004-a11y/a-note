import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  Client,
  ClientWithVideos,
  CompletionHistoryEntry,
  VideoItem,
} from '../types';
import { calculateClientMetrics } from '../utils/calculations';

const ASYNC_STORAGE_KEY = '@editflow_local_backup_v1';
let sqliteDbInstance: SQLite.SQLiteDatabase | null = null;
let isSQLiteAvailable = true;

/**
 * Open or retrieve SQLite database instance with graceful fallback
 */
export async function getDbInstance(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === 'web') {
    // SQLite can have issues on standard Web without OPFS/wasm setup, use fallback
    isSQLiteAvailable = false;
    return null;
  }

  if (sqliteDbInstance) return sqliteDbInstance;

  try {
    const db = await SQLite.openDatabaseAsync('editflow.db');
    sqliteDbInstance = db;
    isSQLiteAvailable = true;
    return db;
  } catch (error) {
    console.warn('[EditFlow DB] SQLite initialization note, falling back to persistent storage:', error);
    isSQLiteAvailable = false;
    return null;
  }
}

/**
 * Safe database migrations to adapt schema without losing user data
 */
async function runDatabaseMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // 1. Verify videos table columns
    const videoCols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(videos);');
    const hasCompletedAt = videoCols.some((col) => col.name === 'completed_at');
    if (!hasCompletedAt) {
      await db.execAsync('ALTER TABLE videos ADD COLUMN completed_at TEXT;');
    }

    // 2. Add performance indices if not exists
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_videos_client_num ON videos(client_id, video_number);
      CREATE INDEX IF NOT EXISTS idx_hist_client_date ON completion_history(client_id, completed_date);
    `);
  } catch (err) {
    console.warn('[EditFlow DB] Migration note:', err);
  }
}

/**
 * Initializes database tables and seeds sample data if fresh
 */
export async function initDatabase(): Promise<void> {
  const db = await getDbInstance();

  if (db && isSQLiteAvailable) {
    try {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          total_budget REAL NOT NULL,
          rate_per_video REAL NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS videos (
          id TEXT PRIMARY KEY NOT NULL,
          client_id TEXT NOT NULL,
          video_number INTEGER NOT NULL,
          title TEXT,
          is_completed INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS completion_history (
          id TEXT PRIMARY KEY NOT NULL,
          client_id TEXT NOT NULL,
          client_name TEXT NOT NULL,
          video_id TEXT NOT NULL,
          video_number INTEGER NOT NULL,
          completed_date TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);

      // Run non-destructive schema migrations
      await runDatabaseMigrations(db);

      // Check if table has ever been seeded or initialized
      const hasSeeded = await AsyncStorage.getItem('@anote_has_seeded_v1');
      const countResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM clients;'
      );

      if (!hasSeeded && (!countResult || countResult.count === 0)) {
        await seedInitialData();
        await AsyncStorage.setItem('@anote_has_seeded_v1', 'true');
      }
      return;
    } catch (e) {
      console.warn('[A Note DB] Error creating SQLite tables, using fallback storage:', e);
      isSQLiteAvailable = false;
    }
  }

  // Fallback to AsyncStorage for offline web/test
  const hasSeededFallback = await AsyncStorage.getItem('@anote_has_seeded_v1');
  const stored = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
  if (!hasSeededFallback && !stored) {
    await seedInitialDataFallback();
    await AsyncStorage.setItem('@anote_has_seeded_v1', 'true');
  }
}

/**
 * Seed initial sample client (Rahul with budget 10000, rate 800)
 */
async function seedInitialData(): Promise<void> {
  const db = sqliteDbInstance;
  if (!db) return;

  const now = new Date();
  const sampleTitles = [
    'Cinematic Edit',
    'Short Edit',
    'Football Edit',
    'Highlight Reel',
    'Short Edit',
    'Cinematic Edit',
    'Vlog Cut',
    'Commercial Promo',
    'Documentary Intro',
    'Reels Montage',
    'Color Grade Cut',
    'Final Master',
  ];

  // 1. Rahul (12 videos, 3 completed: 25%)
  const client1Id = 'client_rahul_demo';
  const name1 = 'Rahul';
  const totalBudget1 = 10000;
  const ratePerVideo1 = 800;
  const createdAt1 = now.toISOString();

  await db.runAsync(
    'INSERT OR IGNORE INTO clients (id, name, total_budget, rate_per_video, created_at) VALUES (?, ?, ?, ?, ?);',
    client1Id,
    name1,
    totalBudget1,
    ratePerVideo1,
    createdAt1
  );

  const totalVideos1 = Math.floor(totalBudget1 / ratePerVideo1); // 12
  for (let i = 1; i <= totalVideos1; i++) {
    const videoId = `video_${client1Id}_${i}`;
    const isCompleted = i <= 3 ? 1 : 0; // 3 completed (25%)
    const completedAt = isCompleted
      ? new Date(now.getTime() - (4 - i) * 86400000).toISOString()
      : null;
    const title = sampleTitles[i - 1] || `Video ${i}`;

    await db.runAsync(
      'INSERT OR IGNORE INTO videos (id, client_id, video_number, title, is_completed, completed_at) VALUES (?, ?, ?, ?, ?, ?);',
      videoId,
      client1Id,
      i,
      title,
      isCompleted,
      completedAt
    );

    if (isCompleted) {
      const historyId = `hist_${client1Id}_${i}`;
      const completedDate = completedAt!.split('T')[0];
      await db.runAsync(
        'INSERT OR IGNORE INTO completion_history (id, client_id, client_name, video_id, video_number, completed_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
        historyId,
        client1Id,
        name1,
        videoId,
        i,
        completedDate,
        completedAt!
      );
    }
  }

  // 2. Priya (8 videos, 4 completed: 50%)
  const client2Id = 'client_priya_demo';
  const name2 = 'Priya';
  const totalBudget2 = 8000;
  const ratePerVideo2 = 1000;
  const createdAt2 = now.toISOString();

  await db.runAsync(
    'INSERT OR IGNORE INTO clients (id, name, total_budget, rate_per_video, created_at) VALUES (?, ?, ?, ?, ?);',
    client2Id,
    name2,
    totalBudget2,
    ratePerVideo2,
    createdAt2
  );

  const totalVideos2 = Math.floor(totalBudget2 / ratePerVideo2); // 8
  for (let i = 1; i <= totalVideos2; i++) {
    const videoId = `video_${client2Id}_${i}`;
    const isCompleted = i <= 4 ? 1 : 0;
    const completedAt = isCompleted
      ? new Date(now.getTime() - (5 - i) * 86400000).toISOString()
      : null;
    const title = sampleTitles[i - 1] || `Video ${i}`;

    await db.runAsync(
      'INSERT OR IGNORE INTO videos (id, client_id, video_number, title, is_completed, completed_at) VALUES (?, ?, ?, ?, ?, ?);',
      videoId,
      client2Id,
      i,
      title,
      isCompleted,
      completedAt
    );
  }
}

async function seedInitialDataFallback(): Promise<void> {
  const clientId = 'client_rahul_demo';
  const name = 'Rahul';
  const totalBudget = 10000;
  const ratePerVideo = 800;
  const createdAt = new Date().toISOString();

  const totalVideos = Math.floor(totalBudget / ratePerVideo);
  const videos: VideoItem[] = [];
  const history: CompletionHistoryEntry[] = [];

  for (let i = 1; i <= totalVideos; i++) {
    const videoId = `video_${clientId}_${i}`;
    const isCompleted = i <= 2;
    const completedAt = isCompleted ? new Date().toISOString() : null;

    videos.push({
      id: videoId,
      clientId,
      videoNumber: i,
      title: `Video ${i}`,
      isCompleted,
      completedAt,
    });

    if (isCompleted) {
      history.push({
        id: `hist_${clientId}_${i}`,
        clientId,
        clientName: name,
        videoId,
        videoNumber: i,
        completedDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });
    }
  }

  const client: Client = {
    id: clientId,
    name,
    totalBudget,
    ratePerVideo,
    createdAt,
  };

  const payload = {
    clients: [client],
    videos: { [clientId]: videos },
    history,
  };

  await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(payload));
}

/**
 * Fetch all clients with their respective video checklists and calculated metrics
 */
export async function getClientsWithVideos(): Promise<ClientWithVideos[]> {
  const db = await getDbInstance();

  if (db && isSQLiteAvailable) {
    try {
      const clientRows = await db.getAllAsync<{
        id: string;
        name: string;
        total_budget: number;
        rate_per_video: number;
        created_at: string;
      }>('SELECT * FROM clients ORDER BY created_at DESC;');

      const result: ClientWithVideos[] = [];

      for (const c of clientRows) {
        const videoRows = await db.getAllAsync<{
          id: string;
          client_id: string;
          video_number: number;
          title: string | null;
          is_completed: number;
          completed_at: string | null;
        }>(
          'SELECT * FROM videos WHERE client_id = ? ORDER BY video_number ASC;',
          c.id
        );

        const videos: VideoItem[] = videoRows.map((v) => ({
          id: v.id,
          clientId: v.client_id,
          videoNumber: v.video_number,
          title: v.title ?? `Video ${v.video_number}`,
          isCompleted: v.is_completed === 1,
          completedAt: v.completed_at,
        }));

        const calculations = calculateClientMetrics(
          c.total_budget,
          c.rate_per_video,
          videos
        );

        result.push({
          id: c.id,
          name: c.name,
          totalBudget: c.total_budget,
          ratePerVideo: c.rate_per_video,
          createdAt: c.created_at,
          videos,
          calculations,
        });
      }

      // Sync backup copy
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(result));
      return result;
    } catch (e) {
      console.warn('[EditFlow DB] SQLite read error, using fallback:', e);
    }
  }

  // Fallback read
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      // In format of ClientWithVideos[]
      return parsed.map((item) => ({
        ...item,
        calculations: calculateClientMetrics(
          item.totalBudget,
          item.ratePerVideo,
          item.videos || []
        ),
      }));
    }

    if (parsed.clients) {
      return parsed.clients.map((c: Client) => {
        const videos: VideoItem[] = parsed.videos[c.id] || [];
        return {
          ...c,
          videos,
          calculations: calculateClientMetrics(c.totalBudget, c.ratePerVideo, videos),
        };
      });
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Add a new client and generate video checklist
 */
export async function addClient(
  name: string,
  totalBudget: number,
  ratePerVideo: number
): Promise<ClientWithVideos> {
  const db = await getDbInstance();
  const clientId = 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const createdAt = new Date().toISOString();
  const totalVideos = Math.floor(totalBudget / (ratePerVideo > 0 ? ratePerVideo : 1));

  const generatedVideos: VideoItem[] = [];
  for (let i = 1; i <= totalVideos; i++) {
    generatedVideos.push({
      id: `v_${clientId}_${i}`,
      clientId,
      videoNumber: i,
      title: `Video ${i}`,
      isCompleted: false,
      completedAt: null,
    });
  }

  if (db && isSQLiteAvailable) {
    try {
      await db.runAsync(
        'INSERT INTO clients (id, name, total_budget, rate_per_video, created_at) VALUES (?, ?, ?, ?, ?);',
        clientId,
        name.trim(),
        totalBudget,
        ratePerVideo,
        createdAt
      );

      for (const v of generatedVideos) {
        await db.runAsync(
          'INSERT INTO videos (id, client_id, video_number, title, is_completed, completed_at) VALUES (?, ?, ?, ?, ?, ?);',
          v.id,
          v.clientId,
          v.videoNumber,
          v.title || `Video ${v.videoNumber}`,
          0,
          null
        );
      }
    } catch (e) {
      console.warn('[EditFlow DB] Failed to insert client in SQLite:', e);
    }
  }

  // Also update local storage fallback
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    let clientsList: ClientWithVideos[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) clientsList = parsed;
    }

    const newClientWithVideos: ClientWithVideos = {
      id: clientId,
      name: name.trim(),
      totalBudget,
      ratePerVideo,
      createdAt,
      videos: generatedVideos,
      calculations: calculateClientMetrics(totalBudget, ratePerVideo, generatedVideos),
    };

    clientsList.unshift(newClientWithVideos);
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(clientsList));
    return newClientWithVideos;
  } catch {
    return {
      id: clientId,
      name: name.trim(),
      totalBudget,
      ratePerVideo,
      createdAt,
      videos: generatedVideos,
      calculations: calculateClientMetrics(totalBudget, ratePerVideo, generatedVideos),
    };
  }
}

/**
 * Toggle completion status of a video with duplicate completion prevention
 */
export async function toggleVideoStatus(
  videoId: string,
  clientId: string,
  newCompletedStatus: boolean,
  clientName: string,
  videoNumber: number
): Promise<void> {
  const db = await getDbInstance();
  const completedAt = newCompletedStatus ? new Date().toISOString() : null;

  if (db && isSQLiteAvailable) {
    try {
      // 1. Prevent duplicate completion: check current state in SQLite
      const existing = await db.getFirstAsync<{ is_completed: number }>(
        'SELECT is_completed FROM videos WHERE id = ?;',
        videoId
      );

      if (existing) {
        const currentlyCompleted = existing.is_completed === 1;
        if (newCompletedStatus && currentlyCompleted) {
          // Already marked completed; avoid duplicate insert/update
          return;
        }
        if (!newCompletedStatus && !currentlyCompleted) {
          // Already pending; no-op
          return;
        }
      }

      // 2. Perform safe update
      await db.runAsync(
        'UPDATE videos SET is_completed = ?, completed_at = ? WHERE id = ?;',
        newCompletedStatus ? 1 : 0,
        completedAt,
        videoId
      );

      if (newCompletedStatus) {
        const histId = 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const today = new Date().toISOString().split('T')[0];
        await db.runAsync(
          'INSERT INTO completion_history (id, client_id, client_name, video_id, video_number, completed_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);',
          histId,
          clientId,
          clientName,
          videoId,
          videoNumber,
          today,
          completedAt!
        );
      } else {
        // Unmarking video: remove record from completion history
        await db.runAsync('DELETE FROM completion_history WHERE video_id = ?;', videoId);
      }
    } catch (e) {
      console.warn('[EditFlow DB] Error toggling video status:', e);
    }
  }

  // Sync fallback
  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (raw) {
      const parsed: ClientWithVideos[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const updated = parsed.map((c) => {
          if (c.id === clientId) {
            const updatedVideos = c.videos.map((v) =>
              v.id === videoId
                ? { ...v, isCompleted: newCompletedStatus, completedAt }
                : v
            );
            return {
              ...c,
              videos: updatedVideos,
              calculations: calculateClientMetrics(
                c.totalBudget,
                c.ratePerVideo,
                updatedVideos
              ),
            };
          }
          return c;
        });
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(updated));
      }
    }
  } catch (err) {
    console.warn('[EditFlow DB] Failed to update fallback storage:', err);
  }
}

/**
 * Delete a client and their videos
 */
export async function deleteClient(clientId: string): Promise<void> {
  const db = await getDbInstance();
  if (db && isSQLiteAvailable) {
    try {
      await db.runAsync('DELETE FROM videos WHERE client_id = ?;', clientId);
      await db.runAsync('DELETE FROM completion_history WHERE client_id = ?;', clientId);
      await db.runAsync('DELETE FROM clients WHERE id = ?;', clientId);
    } catch (e) {
      console.warn('[EditFlow DB] Error deleting client in SQLite:', e);
    }
  }

  try {
    const raw = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (raw) {
      const parsed: ClientWithVideos[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((c) => c.id !== clientId);
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(filtered));
      }
    }
  } catch {}
}

/**
 * Get daily completion history records across all clients
 */
export async function getCompletionHistory(): Promise<CompletionHistoryEntry[]> {
  const db = await getDbInstance();
  if (db && isSQLiteAvailable) {
    try {
      const rows = await db.getAllAsync<{
        id: string;
        client_id: string;
        client_name: string;
        video_id: string;
        video_number: number;
        completed_date: string;
        created_at: string;
      }>('SELECT * FROM completion_history ORDER BY created_at DESC LIMIT 100;');

      return rows.map((r) => ({
        id: r.id,
        clientId: r.client_id,
        clientName: r.client_name,
        videoId: r.video_id,
        videoNumber: r.video_number,
        completedDate: r.completed_date,
        createdAt: r.created_at,
      }));
    } catch (e) {
      console.warn('[EditFlow DB] Error reading history from SQLite:', e);
    }
  }
  return [];
}

/**
 * Get client-specific completion history filtered by date range
 */
export async function getClientCompletionHistory(
  clientId: string,
  dateRange: 'all' | 'today' | 'last7' | 'last30' = 'all'
): Promise<CompletionHistoryEntry[]> {
  const db = await getDbInstance();
  if (db && isSQLiteAvailable) {
    try {
      let query = 'SELECT * FROM completion_history WHERE client_id = ?';
      const params: any[] = [clientId];

      const now = new Date();
      if (dateRange === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        query += ' AND completed_date = ?';
        params.push(todayStr);
      } else if (dateRange === 'last7') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        query += ' AND completed_date >= ?';
        params.push(sevenDaysAgo);
      } else if (dateRange === 'last30') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        query += ' AND completed_date >= ?';
        params.push(thirtyDaysAgo);
      }

      query += ' ORDER BY created_at DESC;';

      const rows = await db.getAllAsync<{
        id: string;
        client_id: string;
        client_name: string;
        video_id: string;
        video_number: number;
        completed_date: string;
        created_at: string;
      }>(query, ...params);

      return rows.map((r) => ({
        id: r.id,
        clientId: r.client_id,
        clientName: r.client_name,
        videoId: r.video_id,
        videoNumber: r.video_number,
        completedDate: r.completed_date,
        createdAt: r.created_at,
      }));
    } catch (e) {
      console.warn('[EditFlow DB] Error reading client history from SQLite:', e);
    }
  }
  return [];
}

/**
 * Fetch a single client with videos and calculated metrics
 */
export async function getClientById(clientId: string): Promise<ClientWithVideos | null> {
  const all = await getClientsWithVideos();
  return all.find((c) => c.id === clientId) || null;
}

/**
 * Permanently deletes all user client records, video items, and completion history
 * inside a secure SQLite transaction. Preserves database schema and backup files.
 */
export async function deleteAllAppData(): Promise<{ success: boolean; message: string }> {
  const db = await getDbInstance();

  if (db && isSQLiteAvailable) {
    try {
      await db.withTransactionAsync(async () => {
        // Delete records in dependency order
        await db.execAsync(`
          DELETE FROM completion_history;
          DELETE FROM videos;
          DELETE FROM clients;
        `);
      });

      // Clear local storage cache
      await AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
      // Ensure seed flag is set so empty state persists as a clean slate
      await AsyncStorage.setItem('@anote_has_seeded_v1', 'true');

      return {
        success: true,
        message: 'All client, video, and delivery records have been permanently cleared.',
      };
    } catch (err: any) {
      console.error('[A Note DB] Failed to delete all app data:', err);
      throw new Error(`Database transaction failed: ${err.message || 'Could not clear data'}`);
    }
  }

  // Fallback storage
  await AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
  await AsyncStorage.setItem('@anote_has_seeded_v1', 'true');
  return {
    success: true,
    message: 'All client and video data cleared from local storage.',
  };
}
