import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { THEME } from '../constants/theme';
import {
  createAndExportBackup,
  validateBackupPayload,
  restoreBackupData,
  BackupPayload,
} from '../services/backupService';

interface BackupRestoreModalProps {
  visible: boolean;
  onClose: () => void;
  onRestoreSuccess: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  visible,
  onClose,
  onRestoreSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingRestorePayload, setPendingRestorePayload] = useState<BackupPayload | null>(null);

  // 1. Create & Export Backup
  const handleCreateBackup = async () => {
    setIsProcessing(true);
    setStatusMessage('Reading local database & creating backup...');
    try {
      const result = await createAndExportBackup();
      setStatusMessage(null);
      if (result.success) {
        Alert.alert(
          'Backup Created',
          `${result.message}\n\nYou can save this file to your device Downloads, Google Drive, or share it securely.`
        );
      }
    } catch (e: any) {
      setStatusMessage(null);
      Alert.alert('Backup Failed', e.message || 'Could not create backup file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Pick & Validate Backup File
  const handleSelectFileToRestore = async () => {
    try {
      const pickResult = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (pickResult.canceled || !pickResult.assets || pickResult.assets.length === 0) {
        // User cancelled picker
        return;
      }

      const fileAsset = pickResult.assets[0];
      setIsProcessing(true);
      setStatusMessage('Validating backup integrity...');

      const content = await FileSystem.readAsStringAsync(fileAsset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!content || content.trim().length === 0) {
        throw new Error('Selected backup file is completely empty.');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (jsonErr) {
        throw new Error('Selected file is not valid JSON. Ensure you selected an A Note .json backup.');
      }

      // Validate schema and fields
      const validatedPayload = validateBackupPayload(parsed);
      setPendingRestorePayload(validatedPayload);
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage(null);
      Alert.alert('Invalid Backup File', err.message || 'Could not read or validate backup file.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Execute Confirmed Restore
  const handleConfirmRestore = async (mode: 'merge' | 'replace') => {
    if (!pendingRestorePayload) return;

    setIsProcessing(true);
    setStatusMessage(
      mode === 'replace'
        ? 'Replacing database records in safe transaction...'
        : 'Merging backup data into local database...'
    );

    try {
      const result = await restoreBackupData(pendingRestorePayload, mode);
      setPendingRestorePayload(null);
      setStatusMessage(null);

      Alert.alert(
        'Restore Complete',
        `${result.message}\n\nYour dashboard and client records are now fully updated.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onRestoreSuccess();
              onClose();
            },
          },
        ]
      );
    } catch (e: any) {
      setStatusMessage(null);
      Alert.alert('Restore Failed', e.message || 'Transaction was rolled back. Existing database remains untouched.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 12,
              paddingTop: insets.top > 0 ? insets.top : 16,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerTitle}>Local Backup &amp; Restore</Text>
              <Text style={styles.headerSubtitle}>100% Offline &bull; No Cloud Required</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Loading Indicator */}
            {isProcessing && (
              <View style={styles.loadingBanner}>
                <ActivityIndicator size="small" color={THEME.colors.mint} />
                <Text style={styles.loadingText}>{statusMessage || 'Processing...'}</Text>
              </View>
            )}

            {/* Pending Restore Confirmation Box */}
            {pendingRestorePayload && (
              <View style={styles.confirmBox}>
                <View style={styles.confirmHeader}>
                  <Ionicons name="shield-checkmark" size={20} color={THEME.colors.mint} />
                  <Text style={styles.confirmTitle}>Backup Validated</Text>
                </View>

                <Text style={styles.confirmMeta}>
                  Created: {new Date(pendingRestorePayload.metadata.createdAt).toLocaleString()}
                </Text>

                <View style={styles.statsSummaryRow}>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillCount}>{pendingRestorePayload.clients.length}</Text>
                    <Text style={styles.statPillLabel}>Clients</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillCount}>{pendingRestorePayload.videos.length}</Text>
                    <Text style={styles.statPillLabel}>Videos</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillCount}>{pendingRestorePayload.completionHistory.length}</Text>
                    <Text style={styles.statPillLabel}>History</Text>
                  </View>
                </View>

                <Text style={styles.confirmInstruction}>
                  Choose how you want to restore these records:
                </Text>

                {/* Option 1: Merge (Recommended) */}
                <TouchableOpacity
                  style={styles.btnMerge}
                  onPress={() => handleConfirmRestore('merge')}
                  activeOpacity={0.8}
                >
                  <View style={styles.btnMergeIcon}>
                    <Ionicons name="git-merge-outline" size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.btnMergeTitle}>Merge with Existing Data</Text>
                    <Text style={styles.btnMergeSub}>Safe: Keeps current clients and adds missing records.</Text>
                  </View>
                </TouchableOpacity>

                {/* Option 2: Replace */}
                <TouchableOpacity
                  style={styles.btnReplace}
                  onPress={() => {
                    Alert.alert(
                      'Replace Entire Database?',
                      'This will wipe your current records and restore exact backup snapshot. This cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Replace All',
                          style: 'destructive',
                          onPress: () => handleConfirmRestore('replace'),
                        },
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.btnReplaceIcon}>
                    <Ionicons name="refresh" size={18} color="#FF4D6D" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.btnReplaceTitle}>Replace All Records</Text>
                    <Text style={styles.btnReplaceSub}>Overwrites current database with backup snapshot.</Text>
                  </View>
                </TouchableOpacity>

                {/* Cancel pending restore */}
                <TouchableOpacity
                  style={styles.btnCancelRestore}
                  onPress={() => setPendingRestorePayload(null)}
                >
                  <Text style={styles.btnCancelRestoreText}>Cancel File Selection</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Section 1: Create Backup */}
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={[styles.iconCircle, { backgroundColor: '#EBFBF5' }]}>
                  <Ionicons name="cloud-upload-outline" size={20} color="#00D287" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Create Local Backup</Text>
                  <Text style={styles.cardDesc}>
                    Save all clients, advance payments, and video history into a versioned JSON backup file.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.actionBtnMint}
                onPress={handleCreateBackup}
                disabled={isProcessing}
                activeOpacity={0.85}
              >
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionBtnTextWhite}>Export &amp; Save Backup</Text>
              </TouchableOpacity>
            </View>

            {/* Section 2: Restore from Backup */}
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={[styles.iconCircle, { backgroundColor: '#F3EFFF' }]}>
                  <Ionicons name="document-attach-outline" size={20} color="#7C5CFC" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Restore from File</Text>
                  <Text style={styles.cardDesc}>
                    Select a previously exported A Note (.json) backup file from your phone storage or Google Drive.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.actionBtnPurple}
                onPress={handleSelectFileToRestore}
                disabled={isProcessing}
                activeOpacity={0.85}
              >
                <Ionicons name="folder-open-outline" size={18} color={THEME.colors.purpleDark} />
                <Text style={styles.actionBtnTextPurple}>Select Backup File</Text>
              </TouchableOpacity>
            </View>

            {/* Privacy & Safety Guarantee */}
            <View style={styles.safetyBox}>
              <Ionicons name="lock-closed" size={14} color="#8E8AAB" />
              <Text style={styles.safetyText}>
                Zero cloud servers. Backups remain strictly local to your phone and wherever you choose to save them.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 28, 0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#F0EBF8',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '88%',
    paddingBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 138, 171, 0.15)',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E1B38',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8AAB',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 16,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#1E1B38',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1B38',
  },
  cardDesc: {
    fontSize: 12,
    color: '#6B6684',
    marginTop: 3,
    lineHeight: 17,
  },
  actionBtnMint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D287',
    borderRadius: 9999,
    paddingVertical: 13,
    gap: 8,
    shadowColor: '#00D287',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnTextWhite: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionBtnPurple: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3EFFF',
    borderRadius: 9999,
    paddingVertical: 13,
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 92, 252, 0.35)',
  },
  actionBtnTextPurple: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7C5CFC',
  },
  confirmBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 2,
    borderColor: '#00D287',
    shadowColor: '#00D287',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1B38',
  },
  confirmMeta: {
    fontSize: 11,
    color: '#8E8AAB',
    marginBottom: 12,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#F0EBF8',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statPillCount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7C5CFC',
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8AAB',
    marginTop: 2,
  },
  confirmInstruction: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A4568',
    marginBottom: 12,
  },
  btnMerge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D287',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    marginBottom: 10,
  },
  btnMergeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMergeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  btnMergeSub: {
    fontSize: 10,
    color: '#E8FFF5',
    marginTop: 2,
  },
  btnReplace: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F3',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 109, 0.3)',
    marginBottom: 10,
  },
  btnReplaceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE3E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReplaceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF4D6D',
  },
  btnReplaceSub: {
    fontSize: 10,
    color: '#8E8AAB',
    marginTop: 2,
  },
  btnCancelRestore: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  btnCancelRestoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8AAB',
  },
  safetyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  safetyText: {
    fontSize: 11,
    color: '#8E8AAB',
    flex: 1,
    lineHeight: 16,
  },
});
