import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { deleteAllAppData } from '../services/db';

interface DataManagementModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenBackupRestore: () => void;
  onDataCleared: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

const CONFIRM_PHRASE = 'DELETE ALL DATA';

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  visible,
  onClose,
  onOpenBackupRestore,
  onDataCleared,
  onNotify,
}) => {
  const insets = useSafeAreaInsets();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [typedPhrase, setTypedPhrase] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Safe Android BackHandler
  const handleSafeBack = useCallback(() => {
    if (showDeleteConfirm) {
      setShowDeleteConfirm(false);
      setTypedPhrase('');
      return true;
    }
    onClose();
    return true;
  }, [showDeleteConfirm, onClose]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleSafeBack);
    return () => sub.remove();
  }, [visible, handleSafeBack]);

  const handleExecuteDeleteAll = async () => {
    if (typedPhrase.trim() !== CONFIRM_PHRASE) {
      Alert.alert(
        'Confirmation Mismatch',
        `Please type "${CONFIRM_PHRASE}" exactly to confirm data deletion.`
      );
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteAllAppData();
      await onDataCleared();
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setTypedPhrase('');
      onClose();
      onNotify('All client records and video data cleared successfully.');
      Alert.alert(
        'Fresh Workspace',
        'All client records, video items, and completion history have been permanently deleted from your local device.\n\nYour separately saved backup files remain safe.'
      );
    } catch (err: any) {
      setIsDeleting(false);
      Alert.alert(
        'Deletion Failed',
        err.message || 'Could not delete database records. Transaction was rolled back.'
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleSafeBack}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleSafeBack}
        />

        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Data Management</Text>
              <Text style={styles.subtitle}>Settings &bull; Backup &bull; Clean Slate</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleSafeBack}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Backup & Restore Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#EDE8FD' }]}>
                  <Ionicons name="cloud-upload-outline" size={20} color={THEME.colors.purple} />
                </View>
                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.sectionTitle}>Backup &amp; Restore</Text>
                  <Text style={styles.sectionDesc}>
                    Save your clients, video progress, and financials to a JSON file or restore from a previous backup.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onClose();
                  onOpenBackupRestore();
                }}
                activeOpacity={0.75}
              >
                <View style={styles.actionRowLeft}>
                  <Ionicons name="save-outline" size={18} color={THEME.colors.purple} />
                  <Text style={styles.actionRowText}>Open Backup &amp; Restore Center</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={THEME.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 2. Privacy & Storage Note */}
            <View style={styles.privacyCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color={THEME.colors.mint} />
              <Text style={styles.privacyText}>
                A Note uses strictly offline local SQLite storage. None of your client details or financial rates leave this device.
              </Text>
            </View>

            {/* 3. Danger Zone: Delete All App Data */}
            <View style={styles.dangerCard}>
              <View style={styles.dangerHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#FFF0F3' }]}>
                  <Ionicons name="trash-outline" size={20} color="#FF5E7E" />
                </View>
                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.dangerTitle}>Danger Zone: Clear App Data</Text>
                  <Text style={styles.dangerDesc}>
                    Permanently delete all locally stored clients, video items, completion history, and payment summaries.
                  </Text>
                </View>
              </View>

              {!showDeleteConfirm ? (
                <TouchableOpacity
                  style={styles.deleteInitBtn}
                  onPress={() => setShowDeleteConfirm(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-bin-outline" size={16} color="#FF5E7E" />
                  <Text style={styles.deleteInitBtnText}>Delete All App Data</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.confirmBox}>
                  <View style={styles.warningAlert}>
                    <Ionicons name="warning-outline" size={18} color="#FF5E7E" />
                    <Text style={styles.warningAlertText}>
                      This action cannot be undone. All local records will be wiped. Separately saved backup files will NOT be affected.
                    </Text>
                  </View>

                  <Text style={styles.typeInstruction}>
                    To confirm, please type <Text style={styles.boldPhrase}>{CONFIRM_PHRASE}</Text> below:
                  </Text>

                  <TextInput
                    style={styles.confirmInput}
                    placeholder={`Type ${CONFIRM_PHRASE}`}
                    placeholderTextColor="#A09CB8"
                    value={typedPhrase}
                    onChangeText={setTypedPhrase}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />

                  <View style={styles.confirmActionsRow}>
                    <TouchableOpacity
                      style={styles.cancelConfirmBtn}
                      onPress={() => {
                        setShowDeleteConfirm(false);
                        setTypedPhrase('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelConfirmText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.deleteFinalBtn,
                        typedPhrase.trim() === CONFIRM_PHRASE
                          ? styles.deleteFinalBtnActive
                          : styles.deleteFinalBtnDisabled,
                      ]}
                      onPress={handleExecuteDeleteAll}
                      disabled={typedPhrase.trim() !== CONFIRM_PHRASE || isDeleting}
                      activeOpacity={0.85}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.deleteFinalBtnText}>Permanently Delete</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
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
    backgroundColor: 'rgba(20, 16, 40, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingTop: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF8',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F3FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: '#FAFAFD',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECE5F7',
  },
  sectionHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  sectionDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E1F3',
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionRowText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.purple,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EBFBF5',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 135, 0.25)',
  },
  privacyText: {
    flex: 1,
    fontSize: 11,
    color: '#008754',
    lineHeight: 16,
    fontWeight: '600',
  },
  dangerCard: {
    backgroundColor: '#FFF8F9',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD6DF',
  },
  dangerHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FF5E7E',
  },
  dangerDesc: {
    fontSize: 11,
    color: '#8E8AAB',
    marginTop: 2,
    lineHeight: 16,
  },
  deleteInitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFCCD6',
    marginTop: 4,
  },
  deleteInitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF5E7E',
  },
  confirmBox: {
    marginTop: 6,
  },
  warningAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0F3',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  warningAlertText: {
    flex: 1,
    fontSize: 11,
    color: '#D63353',
    fontWeight: '600',
    lineHeight: 15,
  },
  typeInstruction: {
    fontSize: 12,
    color: THEME.colors.textNavy,
    marginBottom: 8,
  },
  boldPhrase: {
    fontWeight: '800',
    color: '#FF5E7E',
  },
  confirmInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textNavy,
    borderWidth: 1.5,
    borderColor: '#FFB8C6',
    marginBottom: 12,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F0EBF8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  deleteFinalBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteFinalBtnActive: {
    backgroundColor: '#FF5E7E',
    shadowColor: '#FF5E7E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  deleteFinalBtnDisabled: {
    backgroundColor: '#EBE5F5',
  },
  deleteFinalBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
