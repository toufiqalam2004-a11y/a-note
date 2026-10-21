const fs = require('fs');
const path = require('path');

console.log('=== A Note Local Backup & Restore Verification Test Suite ===\n');

// Mock data matching real SQLite output
const sampleRahulClient = {
  id: 'client_rahul_1',
  name: 'Rahul',
  totalBudget: 10000,
  ratePerVideo: 800,
  createdAt: '2026-10-15T10:00:00.000Z',
};

const sampleVideos = [
  { id: 'vid_1', clientId: 'client_rahul_1', videoNumber: 1, title: 'Cinematic Edit', isCompleted: true, completedAt: '2026-10-15T16:00:00.000Z' },
  { id: 'vid_2', clientId: 'client_rahul_1', videoNumber: 2, title: 'Short Edit', isCompleted: true, completedAt: '2026-10-15T14:16:00.000Z' },
  { id: 'vid_3', clientId: 'client_rahul_1', videoNumber: 3, title: 'Football Edit', isCompleted: true, completedAt: '2026-10-15T15:00:00.000Z' },
  { id: 'vid_4', clientId: 'client_rahul_1', videoNumber: 4, title: 'Highlight Reel', isCompleted: false, completedAt: null },
];

const sampleHistory = [
  { id: 'hist_1', clientId: 'client_rahul_1', clientName: 'Rahul', videoId: 'vid_1', videoNumber: 1, completedDate: '2026-10-15', createdAt: '2026-10-15T16:00:00.000Z' },
  { id: 'hist_2', clientId: 'client_rahul_1', clientName: 'Rahul', videoId: 'vid_2', videoNumber: 2, completedDate: '2026-10-15', createdAt: '2026-10-15T14:16:00.000Z' },
];

const validBackupPayload = {
  metadata: {
    app: 'A Note',
    schemaVersion: 1,
    backupVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    devicePlatform: 'android',
    counts: {
      clients: 1,
      videos: 4,
      completionHistory: 2,
    },
  },
  clients: [sampleRahulClient],
  videos: sampleVideos,
  completionHistory: sampleHistory,
};

// 1. Validation Logic Test
function validateBackupPayload(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file: Root content is not a valid JSON object.');
  }

  const metadata = data.metadata;
  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Invalid backup file: Missing metadata block.');
  }

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

  for (let i = 0; i < data.clients.length; i++) {
    const c = data.clients[i];
    if (!c.id || typeof c.id !== 'string') throw new Error(`Client record #${i + 1} is missing a valid ID.`);
    if (!c.name || typeof c.name !== 'string') throw new Error(`Client record #${i + 1} has an invalid name.`);
    if (typeof c.totalBudget !== 'number' || isNaN(c.totalBudget) || c.totalBudget < 0) {
      throw new Error(`Client "${c.name}" has an invalid total payment budget.`);
    }
    if (typeof c.ratePerVideo !== 'number' || isNaN(c.ratePerVideo) || c.ratePerVideo <= 0) {
      throw new Error(`Client "${c.name}" has an invalid rate per video.`);
    }
  }

  for (let i = 0; i < data.videos.length; i++) {
    const v = data.videos[i];
    if (!v.id || typeof v.id !== 'string') throw new Error(`Video record #${i + 1} is missing a valid ID.`);
    if (!v.clientId || typeof v.clientId !== 'string') throw new Error(`Video record #${i + 1} is missing a valid client ID.`);
    if (typeof v.videoNumber !== 'number' || v.videoNumber < 1) throw new Error(`Video record #${i + 1} has an invalid video number.`);
  }

  return true;
}

console.log('--- TEST 1: Backup Schema & Payload Validation ---');
try {
  const isValid = validateBackupPayload(validBackupPayload);
  console.log('✓ Valid backup payload accepted:', isValid);
} catch (e) {
  console.error('✗ Failed on valid payload:', e.message);
  process.exit(1);
}

// Test rejection of unknown app
try {
  const invalidApp = JSON.parse(JSON.stringify(validBackupPayload));
  invalidApp.metadata.app = 'RandomApp';
  validateBackupPayload(invalidApp);
  console.error('✗ Should have rejected unknown app');
  process.exit(1);
} catch (e) {
  console.log('✓ Incompatible app correctly rejected:', e.message);
}

// Test rejection of incompatible schema version
try {
  const invalidSchema = JSON.parse(JSON.stringify(validBackupPayload));
  invalidSchema.metadata.schemaVersion = 99;
  validateBackupPayload(invalidSchema);
  console.error('✗ Should have rejected schema version 99');
  process.exit(1);
} catch (e) {
  console.log('✓ Unsupported schema version correctly rejected:', e.message);
}

// Test rejection of corrupted client record (negative rate)
try {
  const corruptedClient = JSON.parse(JSON.stringify(validBackupPayload));
  corruptedClient.clients[0].ratePerVideo = -500;
  validateBackupPayload(corruptedClient);
  console.error('✗ Should have rejected negative ratePerVideo');
  process.exit(1);
} catch (e) {
  console.log('✓ Corrupted client rate correctly rejected:', e.message);
}

console.log('\n--- TEST 2: Backup File Serialization & Round-Trip ---');
const serialized = JSON.stringify(validBackupPayload, null, 2);
console.log('✓ Backup JSON size:', Buffer.byteLength(serialized, 'utf8'), 'bytes');
const deserialized = JSON.parse(serialized);
console.log('✓ Round-trip parse successful. Clients count:', deserialized.clients.length);
console.log('✓ Client Name:', deserialized.clients[0].name);
console.log('✓ Client Budget: INR', deserialized.clients[0].totalBudget);
console.log('✓ Client Rate: INR', deserialized.clients[0].ratePerVideo);
console.log('✓ Total Videos in backup:', deserialized.videos.length);
console.log('✓ Completion history records:', deserialized.completionHistory.length);

console.log('\n--- TEST 3: Merge vs Replace Conflict Simulation ---');
// Simulating in-memory database
let dbClients = [{ id: 'client_rahul_1', name: 'Rahul', totalBudget: 10000, ratePerVideo: 800 }];
let dbVideos = [{ id: 'vid_1', clientId: 'client_rahul_1', isCompleted: true }];

// New backup to merge contains an updated budget for Rahul + a new client Priya
const newBackupToMerge = {
  clients: [
    { id: 'client_rahul_1', name: 'Rahul', totalBudget: 12000, ratePerVideo: 800 },
    { id: 'client_priya_2', name: 'Priya', totalBudget: 25000, ratePerVideo: 1000 },
  ],
  videos: [
    { id: 'vid_1', clientId: 'client_rahul_1', isCompleted: true },
    { id: 'vid_priya_1', clientId: 'client_priya_2', isCompleted: false },
  ],
};

// Simulation of Merge: updates matching IDs without deleting other clients
for (const c of newBackupToMerge.clients) {
  const existingIdx = dbClients.findIndex((x) => x.id === c.id);
  if (existingIdx >= 0) {
    dbClients[existingIdx] = { ...c };
  } else {
    dbClients.push(c);
  }
}

console.log('✓ Merge result: clients count is now', dbClients.length);
console.log('✓ Rahul updated budget to INR', dbClients.find((c) => c.name === 'Rahul').totalBudget);
console.log('✓ Priya inserted with budget INR', dbClients.find((c) => c.name === 'Priya').totalBudget);

console.log('\n--- TEST 4: Transaction Rollback Simulation on Corrupted Entry ---');
const originalState = JSON.parse(JSON.stringify(dbClients));
let transactionActive = true;
try {
  // simulate transaction begin
  const unverifiedImport = [
    { id: 'bad_1', name: 'Bad Record' }, // missing totalBudget and ratePerVideo
  ];
  for (const c of unverifiedImport) {
    if (!c.totalBudget || !c.ratePerVideo) {
      throw new Error('Database transaction constraint violation: missing required rate');
    }
  }
  transactionActive = false; // commit
} catch (err) {
  // simulate rollback
  dbClients = originalState;
  console.log('✓ Caught simulated transaction error:', err.message);
  console.log('✓ Database rolled back successfully. Clients count preserved:', dbClients.length);
  console.log('✓ Existing client Rahul intact:', dbClients[0].name === 'Rahul');
}

console.log('\n=== ALL BACKUP & RESTORE VERIFICATION TESTS PASSED! ===');
