import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME, ThemeId } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { PressableScale } from './PressableScale';
import {
  PROFESSIONS,
  ProfessionType,
  UserProfile,
  saveUserProfile,
} from '../services/userProfileService';

interface ProfileSettingsModalProps {
  visible: boolean;
  currentProfile: UserProfile | null;
  onClose: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

const PROFESSION_ICONS: Record<ProfessionType, keyof typeof Ionicons.glyphMap> = {
  'Video Editor': 'videocam-outline',
  'Content Creator': 'sparkles-outline',
  'Photographer': 'camera-outline',
  'Freelancer': 'briefcase-outline',
  'Graphic Designer': 'color-palette-outline',
  'Other': 'create-outline',
};

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  visible,
  currentProfile,
  onClose,
  onProfileUpdated,
  onNotify,
}) => {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;

  const { theme, themeId, setThemeId, themes } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [selectedProfession, setSelectedProfession] = useState<ProfessionType>('Video Editor');
  const [studioName, setStudioName] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState<ThemeId>(themeId);
  const initialThemeIdRef = useRef<ThemeId>(themeId);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const nameInputRef = useRef<TextInput>(null);

  // Sync state when opening modal
  useEffect(() => {
    if (visible) {
      setDisplayName(currentProfile?.displayName || '');
      setSelectedProfession(
        (currentProfile?.profession as ProfessionType) || 'Video Editor'
      );
      setStudioName(currentProfile?.studioName || '');
      setSelectedThemeId(themeId);
      initialThemeIdRef.current = themeId;
      setNameError(null);
    }
  }, [visible, currentProfile, themeId]);

  const handleSafeBack = useCallback(() => {
    // If cancelled, restore initial theme
    if (selectedThemeId !== initialThemeIdRef.current) {
      setThemeId(initialThemeIdRef.current);
    }
    onClose();
    return true;
  }, [onClose, selectedThemeId, setThemeId]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleSafeBack);
    return () => sub.remove();
  }, [visible, handleSafeBack]);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameError('Display Name cannot be empty.');
      nameInputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setNameError(null);
    try {
      const updated = await saveUserProfile({
        displayName: trimmed,
        profession: selectedProfession,
        studioName: studioName.trim(),
      });
      await setThemeId(selectedThemeId);
      initialThemeIdRef.current = selectedThemeId;
      setIsSaving(false);
      onProfileUpdated(updated);
      onNotify('Profile and theme updated successfully!');
      onClose();
    } catch (e: any) {
      setIsSaving(false);
      setNameError(e.message || 'Could not save profile.');
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
          accessibilityRole="button"
          accessibilityLabel="Close Profile Modal"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          <View
            style={[
              styles.container,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
                paddingBottom: Math.max(insets.bottom, 16) + 12,
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.headerTitleGroup}>
                <View style={[styles.headerIconCircle, { backgroundColor: theme.colors.purpleLight }]}>
                  <Ionicons name="person-circle" size={24} color={theme.colors.purple} />
                </View>
                <View>
                  <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Personalize Workspace</Text>
                  <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>My Profile &bull; Local &bull; Private</Text>
                </View>
              </View>

              <PressableScale
                style={[styles.closeBtn, { backgroundColor: theme.colors.backgroundSubtle }]}
                onPress={handleSafeBack}
                activeScale={0.88}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </PressableScale>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: screenHeight * 0.72 }}
            >
              {/* 1. Display Name */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textPrimary }]}>Display Name</Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>

                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors.backgroundSubtle,
                      borderColor: nameError ? theme.colors.danger : theme.colors.border,
                    },
                    nameError ? styles.inputWrapperError : null,
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={nameError ? theme.colors.danger : theme.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={nameInputRef}
                    style={[styles.textInput, { color: theme.colors.textPrimary }]}
                    value={displayName}
                    onChangeText={(val) => {
                      setDisplayName(val);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="What should we call you?"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    accessibilityLabel="Display Name"
                  />
                </View>
                {nameError ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={13} color={theme.colors.danger} />
                    <Text style={styles.errorText}>{nameError}</Text>
                  </View>
                ) : null}
              </View>

              {/* 2. Profession */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textPrimary }]}>Profession</Text>
                <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>Select your creative discipline:</Text>

                <View style={styles.professionGrid}>
                  {PROFESSIONS.map((profession) => {
                    const isSelected = selectedProfession === profession;
                    const iconName = PROFESSION_ICONS[profession] || 'create-outline';

                    return (
                      <PressableScale
                        key={profession}
                        style={[
                          styles.professionCard,
                          {
                            backgroundColor: isSelected ? theme.colors.mintLight : theme.colors.backgroundSubtle,
                            borderColor: isSelected ? theme.colors.mint : theme.colors.border,
                          },
                          isSelected && styles.professionCardSelected,
                        ]}
                        containerStyle={styles.professionCardContainer}
                        onPress={() => setSelectedProfession(profession)}
                        activeScale={0.96}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={profession}
                      >
                        <View
                          style={[
                            styles.professionIconBox,
                            {
                              backgroundColor: theme.colors.surface,
                              borderColor: isSelected ? theme.colors.mint : theme.colors.border,
                            },
                            isSelected && styles.professionIconBoxSelected,
                          ]}
                        >
                          <Ionicons
                            name={iconName}
                            size={18}
                            color={isSelected ? theme.colors.mintDark : theme.colors.textSecondary}
                          />
                        </View>
                        <Text
                          style={[
                            styles.professionTitle,
                            { color: isSelected ? theme.colors.mintDark : theme.colors.textSecondary },
                            isSelected && styles.professionTitleSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {profession}
                        </Text>
                        {isSelected && (
                          <View style={[styles.checkBadge, { backgroundColor: theme.colors.mint }]}>
                            <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
                          </View>
                        )}
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* 3. Studio / Business Name */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textPrimary }]}>Studio / Business Name</Text>
                  <Text style={[styles.optionalBadge, { backgroundColor: theme.colors.backgroundSubtle, color: theme.colors.textMuted }]}>Optional</Text>
                </View>

                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.backgroundSubtle, borderColor: theme.colors.border }]}>
                  <Ionicons
                    name="business-outline"
                    size={18}
                    color={theme.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.textInput, { color: theme.colors.textPrimary }]}
                    value={studioName}
                    onChangeText={setStudioName}
                    placeholder="Your studio or business name"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    accessibilityLabel="Studio or Business Name"
                  />
                </View>
                <Text style={[styles.subHelperText, { color: theme.colors.textMuted }]}>
                  Shown on your dashboard header below your greeting.
                </Text>
              </View>

              {/* 4. Themes & Visual Style */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: theme.colors.textPrimary }]}>
                    App Theme
                  </Text>
                  <Text
                    style={[
                      styles.optionalBadge,
                      {
                        backgroundColor: theme.colors.purpleLight,
                        color: theme.colors.purple,
                        fontWeight: '800',
                      },
                    ]}
                  >
                    {theme.name}
                  </Text>
                </View>
                <Text style={[styles.helperText, { color: theme.colors.textMuted }]}>
                  Choose your preferred color palette & appearance:
                </Text>

                <View style={styles.themeGrid}>
                  {themes.map((preset) => {
                    const isSelected = selectedThemeId === preset.id;
                    return (
                      <PressableScale
                        key={preset.id}
                        style={[
                          styles.themeCard,
                          {
                            backgroundColor: preset.preview.surface,
                            borderColor: isSelected
                              ? preset.preview.primary
                              : preset.colors.border,
                          },
                          isSelected && styles.themeCardSelected,
                        ]}
                        containerStyle={styles.themeCardContainer}
                        onPress={() => {
                          setSelectedThemeId(preset.id);
                          setThemeId(preset.id);
                        }}
                        activeScale={0.96}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${preset.name} Theme`}
                      >
                        <View style={styles.themeCardHeader}>
                          <View style={styles.themeNameGroup}>
                            <Text
                              style={[
                                styles.themeNameText,
                                { color: preset.isDark ? '#F8F9FA' : '#1E1B38' },
                                isSelected && { fontWeight: '800' },
                              ]}
                              numberOfLines={1}
                            >
                              {preset.name}
                            </Text>
                            <Text
                              style={[
                                styles.themeTaglineText,
                                { color: preset.isDark ? '#8A91A8' : '#7D7895' },
                              ]}
                              numberOfLines={1}
                            >
                              {preset.isDark ? 'Dark Mode' : 'Light Mode'}
                            </Text>
                          </View>
                          {isSelected ? (
                            <View
                              style={[
                                styles.themeCheckBadge,
                                { backgroundColor: preset.preview.primary },
                              ]}
                            >
                              <Ionicons name="checkmark-sharp" size={11} color="#FFFFFF" />
                            </View>
                          ) : (
                            <View
                              style={[
                                styles.themeRadioUnselected,
                                { borderColor: preset.colors.border },
                              ]}
                            />
                          )}
                        </View>

                        {/* Visual Palette Swatches */}
                        <View style={styles.swatchRow}>
                          <View
                            style={[
                              styles.swatchCircle,
                              {
                                backgroundColor: preset.preview.bg,
                                borderColor: preset.isDark
                                  ? 'rgba(255,255,255,0.15)'
                                  : 'rgba(0,0,0,0.1)',
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.swatchCircle,
                              {
                                backgroundColor: preset.preview.surface,
                                borderColor: preset.isDark
                                  ? 'rgba(255,255,255,0.2)'
                                  : 'rgba(0,0,0,0.12)',
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.swatchCircle,
                              { backgroundColor: preset.preview.primary },
                            ]}
                          />
                          <View
                            style={[
                              styles.swatchCircle,
                              { backgroundColor: preset.preview.accent },
                            ]}
                          />
                        </View>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: theme.colors.backgroundSubtle }]}
                  onPress={handleSafeBack}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.colors.textPrimary }]}>Cancel</Text>
                </TouchableOpacity>

                <PressableScale
                  style={[styles.saveBtn, { backgroundColor: theme.colors.purple, shadowColor: theme.colors.purple }]}
                  containerStyle={styles.saveBtnContainer}
                  onPress={handleSave}
                  activeScale={0.96}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityLabel="Save Profile Changes"
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
                </PressableScale>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  sheetContainer: {
    width: '100%',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF8',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE8FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  subtitle: {
    fontSize: 11,
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
  inputGroup: {
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1B38',
  },
  requiredStar: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.danger,
    marginLeft: 3,
  },
  optionalBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8AAB',
    backgroundColor: '#F4EFFB',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  helperText: {
    fontSize: 11,
    color: '#8E8AAB',
    marginTop: 2,
    marginBottom: 8,
  },
  subHelperText: {
    fontSize: 10,
    color: '#8E8AAB',
    marginTop: 4,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8FD',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ECE5F7',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  inputWrapperError: {
    borderColor: THEME.colors.danger,
    backgroundColor: '#FFF8F8',
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E1B38',
    paddingVertical: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.danger,
  },
  professionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  professionCardContainer: {
    width: '48.5%',
  },
  professionCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8FD',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ECE5F7',
    gap: 8,
  },
  professionCardSelected: {
    backgroundColor: '#EBFBF5',
    borderColor: THEME.colors.mint,
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  professionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDE7F6',
  },
  professionIconBoxSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: THEME.colors.mint,
  },
  professionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#4A4568',
  },
  professionTitleSelected: {
    color: '#008754',
    fontWeight: '800',
  },
  checkBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: THEME.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F0EBF8',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  saveBtnContainer: {
    flex: 1.5,
  },
  saveBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E1B38',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    shadowColor: '#1E1B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeCardContainer: {
    width: '48.5%',
  },
  themeCard: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  themeCardSelected: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeNameGroup: {
    flex: 1,
    marginRight: 4,
  },
  themeNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  themeTaglineText: {
    fontSize: 9.5,
    marginTop: 1,
    fontWeight: '500',
  },
  themeCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeRadioUnselected: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  swatchCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
});
