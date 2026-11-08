import React, { useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/calculations';
import { PREDEFINED_VIDEO_TYPES } from '../constants/videoTypes';
import { ClientWithVideos } from '../types';
import { PressableScale } from './PressableScale';

interface AddClientModalProps {
  visible: boolean;
  onClose: () => void;
  onAddClient: (name: string, budget: number, rate: number, videoTypes?: string[]) => void;
  onUpdateClient?: (
    clientId: string,
    name: string,
    budget: number,
    rate: number,
    videoTypes?: string[]
  ) => void;
  initialClient?: ClientWithVideos | null;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  visible,
  onClose,
  onAddClient,
  onUpdateClient,
  initialClient,
}) => {
  const isEditing = Boolean(initialClient);
  const { theme, isDark } = useTheme();

  const [name, setName] = useState('');
  const [budgetStr, setBudgetStr] = useState('');
  const [rateStr, setRateStr] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [customTypesList, setCustomTypesList] = useState<string[]>([]);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInputText, setCustomInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state when opening or when initialClient changes
  useEffect(() => {
    if (visible) {
      if (initialClient) {
        setName(initialClient.name || '');
        setBudgetStr(initialClient.totalBudget ? initialClient.totalBudget.toString() : '');
        setRateStr(initialClient.ratePerVideo ? initialClient.ratePerVideo.toString() : '');
        const clientTypes = initialClient.videoTypes || [];
        setSelectedTypes(clientTypes);
        // Identify any custom types already present in client
        const extraTypes = clientTypes.filter(
          (t) => !PREDEFINED_VIDEO_TYPES.includes(t)
        );
        setCustomTypesList(extraTypes);
      } else {
        setName('');
        setBudgetStr('');
        setRateStr('');
        setSelectedTypes([]);
        setCustomTypesList([]);
      }
      setIsAddingCustom(false);
      setCustomInputText('');
      setErrorMsg('');
    }
  }, [visible, initialClient]);

  const numBudget = parseFloat(budgetStr.replace(/[^0-9.]/g, '')) || 0;
  const numRate = parseFloat(rateStr.replace(/[^0-9.]/g, '')) || 0;

  const totalVideos = numRate > 0 ? Math.floor(numBudget / numRate) : 0;
  const unusedBudget = numRate > 0 ? Math.max(0, numBudget - totalVideos * numRate) : 0;
  const assignedValue = totalVideos * numRate;

  // Toggle selection of a video type
  const handleToggleType = (type: string) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Add custom video type
  const handleAddCustomType = () => {
    const trimmed = customInputText.trim();
    if (!trimmed) return;

    if (!PREDEFINED_VIDEO_TYPES.includes(trimmed) && !customTypesList.includes(trimmed)) {
      setCustomTypesList((prev) => [...prev, trimmed]);
    }
    if (!selectedTypes.includes(trimmed)) {
      setSelectedTypes((prev) => [...prev, trimmed]);
    }

    setCustomInputText('');
    setIsAddingCustom(false);
  };

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

    if (isEditing && initialClient && onUpdateClient) {
      onUpdateClient(initialClient.id, name.trim(), numBudget, numRate, selectedTypes);
    } else {
      onAddClient(name.trim(), numBudget, numRate, selectedTypes);
    }

    handleClose();
  };

  const handleClose = () => {
    setName('');
    setBudgetStr('');
    setRateStr('');
    setSelectedTypes([]);
    setCustomTypesList([]);
    setIsAddingCustom(false);
    setCustomInputText('');
    setErrorMsg('');
    onClose();
  };

  const allAvailableTypes = [
    ...PREDEFINED_VIDEO_TYPES,
    ...customTypesList.filter((t) => !PREDEFINED_VIDEO_TYPES.includes(t)),
  ];

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
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderLight,
                  shadowColor: theme.colors.shadowColor,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerTitleGroup}>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                    {isEditing ? 'Edit Client' : 'New Client'}
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
                    {isEditing
                      ? 'Update client details and video categories'
                      : 'Set budget, rate, and video types'}
                  </Text>
                </View>
                <PressableScale
                  onPress={handleClose}
                  style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundSubtle }]}
                  activeScale={0.88}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close Client Modal"
                >
                  <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
                </PressableScale>
              </View>

              {/* Error prompt if any */}
              {errorMsg ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={THEME.colors.danger} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Client Name Field */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Client Name</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.backgroundSubtle,
                        borderColor: theme.colors.borderLight,
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor={theme.colors.textMuted}
                    value={name}
                    onChangeText={(t) => {
                      setName(t);
                      setErrorMsg('');
                    }}
                    autoFocus={!isEditing}
                  />
                </View>

                {/* Budget & Rate Fields */}
                <View style={styles.rowFields}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Total Budget (₹)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.backgroundSubtle,
                          borderColor: theme.colors.borderLight,
                          color: theme.colors.textPrimary,
                        },
                      ]}
                      placeholder="e.g. 10000"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                      value={budgetStr}
                      onChangeText={(t) => {
                        setBudgetStr(t);
                        setErrorMsg('');
                      }}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Per-Video Rate (₹)</Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.colors.backgroundSubtle,
                          borderColor: theme.colors.borderLight,
                          color: theme.colors.textPrimary,
                        },
                      ]}
                      placeholder="e.g. 800"
                      placeholderTextColor={theme.colors.textMuted}
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
                  <View style={[styles.calcPreviewBox, { backgroundColor: theme.colors.backgroundSubtle }]}>
                    <View style={styles.calcTitleRow}>
                      <Ionicons name="calculator-outline" size={15} color={theme.colors.mint} />
                      <Text style={[styles.calcTitle, { color: theme.colors.textPrimary }]}>Automatic Capacity</Text>
                    </View>
                    <View style={styles.calcGrid}>
                      <View style={styles.calcItem}>
                        <Text style={[styles.calcLabel, { color: theme.colors.textMuted }]}>Total Videos</Text>
                        <Text style={[styles.calcValue, { color: theme.colors.mint }]}>
                          {totalVideos} videos
                        </Text>
                      </View>
                      <View style={styles.calcItem}>
                        <Text style={[styles.calcLabel, { color: theme.colors.textMuted }]}>Earnable Value</Text>
                        <Text style={[styles.calcValue, { color: theme.colors.textPrimary }]}>{formatCurrency(assignedValue)}</Text>
                      </View>
                      <View style={styles.calcItem}>
                        <Text style={[styles.calcLabel, { color: theme.colors.textMuted }]}>Unused Balance</Text>
                        <Text
                          style={[
                            styles.calcValue,
                            unusedBudget > 0
                              ? { color: theme.colors.amber }
                              : { color: theme.colors.textPrimary },
                          ]}
                        >
                          {formatCurrency(unusedBudget)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Video Types Selection Section */}
                <View style={styles.videoTypesSection}>
                  <View style={styles.videoTypesHeader}>
                    <View style={styles.videoTypesTitleGroup}>
                      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Video Types</Text>
                      <Text style={[styles.videoTypesSubtitle, { color: theme.colors.textMuted }]}>
                        Select categories for this client's videos
                      </Text>
                    </View>
                    <View style={[styles.selectedCountBadge, { backgroundColor: theme.colors.mintLight }]}>
                      <Text style={[styles.selectedCountText, { color: theme.colors.mintDark }]}>
                        {selectedTypes.length > 0
                          ? `${selectedTypes.length} selected`
                          : 'Optional'}
                      </Text>
                    </View>
                  </View>

                  {/* Chips Container */}
                  <View style={styles.chipsContainer}>
                    {allAvailableTypes.map((type) => {
                      const isSelected = selectedTypes.includes(type);
                      return (
                        <PressableScale
                          key={type}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected ? theme.colors.mintLight : theme.colors.backgroundSubtle,
                              borderColor: isSelected ? theme.colors.mint : theme.colors.borderLight,
                            },
                            isSelected && styles.chipSelected,
                          ]}
                          onPress={() => handleToggleType(type)}
                          activeScale={0.92}
                          accessibilityRole="button"
                          accessibilityLabel={`${type} category, ${isSelected ? 'selected' : 'not selected'}`}
                        >
                          <Ionicons
                            name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                            size={14}
                            color={isSelected ? theme.colors.mintDark : theme.colors.textMuted}
                            style={{ marginRight: 5 }}
                          />
                          <Text
                            style={[
                              styles.chipText,
                              { color: isSelected ? theme.colors.mintDark : theme.colors.textPrimary },
                              isSelected && styles.chipTextSelected,
                            ]}
                          >
                            {type}
                          </Text>
                        </PressableScale>
                      );
                    })}

                    {/* Custom Type Trigger Button */}
                    {!isAddingCustom ? (
                      <PressableScale
                        style={[
                          styles.customTypeTriggerBtn,
                          {
                            backgroundColor: theme.colors.purpleLight,
                            borderColor: theme.colors.purpleBorder,
                          },
                        ]}
                        onPress={() => setIsAddingCustom(true)}
                        activeScale={0.93}
                        accessibilityRole="button"
                        accessibilityLabel="Add custom video type"
                      >
                        <Ionicons name="sparkles-outline" size={13} color={theme.colors.purple} />
                        <Text style={[styles.customTypeTriggerText, { color: theme.colors.purpleDark }]}>+ Custom Type</Text>
                      </PressableScale>
                    ) : null}
                  </View>

                  {/* Inline Custom Type Input */}
                  {isAddingCustom && (
                    <View
                      style={[
                        styles.customInputRow,
                        {
                          backgroundColor: theme.colors.backgroundSubtle,
                          borderColor: theme.colors.borderLight,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.customTextInput, { color: theme.colors.textPrimary }]}
                        placeholder="Enter custom type (e.g. Drone Video)"
                        placeholderTextColor={theme.colors.textMuted}
                        value={customInputText}
                        onChangeText={setCustomInputText}
                        onSubmitEditing={handleAddCustomType}
                        returnKeyType="done"
                        autoFocus
                      />
                      <TouchableOpacity
                        style={[styles.addCustomBtn, { backgroundColor: theme.colors.mint }]}
                        onPress={handleAddCustomType}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.addCustomBtnText}>Add</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelCustomBtn}
                        onPress={() => {
                          setIsAddingCustom(false);
                          setCustomInputText('');
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={16} color={theme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Actions Footer */}
              <View style={styles.actionsRow}>
                <PressableScale
                  style={[styles.cancelButton, { backgroundColor: theme.colors.backgroundSubtle }]}
                  onPress={handleClose}
                  activeScale={0.94}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.textMuted }]}>Cancel</Text>
                </PressableScale>

                <PressableScale
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: theme.colors.mint,
                      shadowColor: theme.colors.mint,
                    },
                  ]}
                  onPress={handleSave}
                  activeScale={0.94}
                  accessibilityRole="button"
                  accessibilityLabel={isEditing ? 'Save Changes' : 'Create Client'}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'Save Changes' : 'Create Client'}
                  </Text>
                </PressableScale>
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
    padding: THEME.spacing.md,
  },
  modalContentWrapper: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
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
    maxHeight: '100%',
  },
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
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
    marginBottom: 12,
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
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F7F3FC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
    color: THEME.colors.textNavy,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#EAE4F5',
  },
  calcPreviewBox: {
    backgroundColor: '#E8FBF2',
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
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
  videoTypesSection: {
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#FAF8FD',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEBF6',
  },
  videoTypesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  videoTypesTitleGroup: {
    flex: 1,
  },
  videoTypesSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  selectedCountBadge: {
    backgroundColor: '#EDE8F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.purple,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E7E2F2',
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: '#E8FBF2',
    borderColor: THEME.colors.mint,
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  chipTextSelected: {
    color: THEME.colors.textNavy,
    fontWeight: '700',
  },
  customTypeTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EEFB',
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: THEME.colors.purple,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  customTypeTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.purple,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  customTextInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: THEME.colors.textNavy,
    fontWeight: '600',
    borderWidth: 1.2,
    borderColor: THEME.colors.purple,
  },
  addCustomBtn: {
    backgroundColor: THEME.colors.purple,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  addCustomBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelCustomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAE4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F0FB',
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
