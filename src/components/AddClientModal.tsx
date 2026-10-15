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
                  <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
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
                    <Ionicons name="calculator-outline" size={14} color={THEME.colors.mint} />
                    <Text style={styles.calcTitle}>Automatic Calculation</Text>
                  </View>
                  <View style={styles.calcGrid}>
                    <View style={styles.calcItem}>
                      <Text style={styles.calcLabel}>Total Videos</Text>
                      <Text style={[styles.calcValue, { color: THEME.colors.mint }]}>
                        {totalVideos} whole videos
                      </Text>
                    </View>
                    <View style={styles.calcItem}>
                      <Text style={styles.calcLabel}>Video Value</Text>
                      <Text style={styles.calcValue}>{formatCurrency(assignedValue)}</Text>
                    </View>
                    <View style={styles.calcItem}>
                      <Text style={styles.calcLabel}>Unused Budget</Text>
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
                  {unusedBudget > 0 && (
                    <Text style={styles.unusedNotice}>
                      ₹{unusedBudget} remainder will be recorded as unused budget.
                    </Text>
                  )}
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
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark" size={18} color="#0B0C0E" />
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
    backgroundColor: THEME.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalContentWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.md,
  },
  headerTitleGroup: {
    flex: 1,
  },
  title: {
    fontSize: THEME.typography.sizes.xl,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.dangerGlow,
    padding: 10,
    borderRadius: THEME.radius.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.danger,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: THEME.spacing.md,
  },
  rowFields: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  label: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.base,
  },
  calcPreviewBox: {
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.mintBorder,
  },
  calcTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  calcTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.mint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calcGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calcItem: {
    flex: 1,
  },
  calcLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  calcValue: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  unusedNotice: {
    fontSize: 11,
    color: THEME.colors.amber,
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cancelButtonText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.mint,
    gap: 6,
  },
  saveButtonText: {
    fontSize: THEME.typography.sizes.sm,
    color: '#0B0C0E',
    fontWeight: '700',
  },
});
