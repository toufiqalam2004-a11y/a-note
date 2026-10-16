import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { formatCurrency } from '../utils/calculations';

interface AddClientModalProps {
  visible: boolean;
  onClose: () => void;
  onAddClient: (name: string, budget: number, rate: number) => void;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  visible,
  onClose,
  onAddClient,
}) => {
  const [name, setName] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [rateStr, setRateStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const numBudget = parseFloat(budgetStr.replace(/[^0-9.]/g, '')) || 0;
  const numRate = parseFloat(rateStr.replace(/[^0-9.]/g, '')) || 0;

  const totalVideos = numRate > 0 ? Math.floor(numBudget / numRate) : 0;
  const unusedBudget = numRate > 0 ? Math.max(0, numBudget - totalVideos * numRate) : 0;
  const assignedValue = totalVideos * numRate;

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a client name.');
      return;
    }
    if (numBudget <= 0) {
      setErrorMsg('Total budget must be greater than 0.');
      return;
    }
    if (numRate <= 0) {
      setErrorMsg('Per-video rate must be greater than 0.');
      return;
    }
    if (numRate > numBudget) {
      setErrorMsg('Per-video rate cannot exceed total budget.');
      return;
    }

    onAddClient(name.trim(), numBudget, numRate);
    setName('');
    setBudgetStr('');
    setRateStr('');
    setErrorMsg('');
    onClose();
  };

  const handleClose = () => {
    setName('');
    setBudgetStr('');
    setRateStr('');
    setErrorMsg('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContentWrapper}
          >
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerTitleGroup}>
                  <Text style={styles.title}>New Client</Text>
                  <Text style={styles.subtitle}>Set budget and per-video rate</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={THEME.colors.textNavy} />
                </TouchableOpacity>
              </View>

              {/* Error prompt if any */}
              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={THEME.colors.danger} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Client Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    setErrorMsg('');
                  }}
                  autoFocus
                />
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Total Budget (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 10000"
                    placeholderTextColor={THEME.colors.textMuted}
                    keyboardType="numeric"
                    value={budgetStr}
                    onChangeText={(t) => {
                      setBudgetStr(t);
                      setErrorMsg('');
                    }}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Per-Video Rate (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 800"
                    placeholderTextColor={THEME.colors.textMuted}
                    keyboardType="numeric"
                    value={rateStr}
                    onChangeText={(t) => {
                      setRateStr(t);
                      setErrorMsg('');
                    }}
                  />
                </View>
              </View>

              {/* Live Automatic Calculation Box */}
              {numBudget > 0 && numRate > 0 && (
                <View style={styles.calcPreviewBox}>
                  <View style={styles.calcTitleRow}>
                    <Ionicons name="calculator-outline" size={15} color={THEME.colors.mint} />
                    <Text style={styles.calcTitle}>Automatic Capacity</Text>
                  </View>
                  <View style={styles.calcGrid}>
                    <View style={styles.calcItem}>
                      <Text style={styles.calcLabel}>Total Videos</Text>
                      <Text style={[styles.calcValue, { color: THEME.colors.mint }]}>
                        {totalVideos} videos
                      </Text>
                    </View>
                    <View style={styles.calcItem}>
                      <Text style={styles.calcLabel}>Earnable Value</Text>
                      <Text style={styles.calcValue}>{formatCurrency(assignedValue)}</Text>
                    </View>
                    <View style={styles.calcItem}>
                      <Text style={styles.calcLabel}>Unused Balance</Text>
                      <Text
                        style={[
                          styles.calcValue,
                          unusedBudget > 0 ? { color: THEME.colors.amber } : {},
                        ]}
                      >
                        {formatCurrency(unusedBudget)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Create Client</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 56, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalContentWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerTitleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F0FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: THEME.colors.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: THEME.colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textNavy,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F7F3FC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: THEME.colors.textNavy,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#EAE4F5',
  },
  calcPreviewBox: {
    backgroundColor: '#E8FBF2',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: THEME.colors.mintBorder,
  },
  calcTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  calcTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.mint,
    textTransform: 'uppercase',
  },
  calcGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calcItem: {
    alignItems: 'center',
  },
  calcLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: '#F5F0FB',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.mint,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 9999,
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
