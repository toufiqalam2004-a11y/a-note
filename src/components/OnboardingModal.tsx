import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { PressableScale } from './PressableScale';
import {
  PROFESSIONS,
  ProfessionType,
  UserProfile,
  saveUserProfile,
  skipOnboarding,
} from '../services/userProfileService';

interface OnboardingModalProps {
  visible: boolean;
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
}

const PROFESSION_ICONS: Record<ProfessionType, keyof typeof Ionicons.glyphMap> = {
  'Video Editor': 'videocam-outline',
  'Content Creator': 'sparkles-outline',
  'Photographer': 'camera-outline',
  'Freelancer': 'briefcase-outline',
  'Graphic Designer': 'color-palette-outline',
  'Other': 'create-outline',
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const [reduceMotion, setReduceMotion] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [selectedProfession, setSelectedProfession] = useState<ProfessionType>('Video Editor');
  const [studioName, setStudioName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (visible) {
      setNameError(null);
      if (reduceMotion) {
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
        logoScale.setValue(1);
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 380,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 42,
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 6,
            tension: 45,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible, reduceMotion, fadeAnim, slideAnim, logoScale]);

  const triggerShake = () => {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleGetStarted = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      setNameError('Please enter what we should call you.');
      triggerShake();
      nameInputRef.current?.focus();
      return;
    }

    setNameError(null);
    setIsSubmitting(true);
    try {
      const profile = await saveUserProfile({
        displayName: trimmed,
        profession: selectedProfession,
        studioName: studioName.trim(),
      });
      setIsSubmitting(false);
      onComplete(profile);
    } catch (e: any) {
      setIsSubmitting(false);
      setNameError(e.message || 'Could not save profile.');
    }
  };

  const handleSkip = async () => {
    await skipOnboarding();
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handleSkip}
    >
      <View style={[styles.rootContainer, { paddingTop: insets.top }]}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <Animated.View
            style={[
              styles.innerContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: Math.max(insets.bottom, 20) + 24 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Header Branding */}
              <View style={styles.header}>
                <Animated.View
                  style={[
                    styles.logoWrapper,
                    { transform: [{ scale: logoScale }] },
                  ]}
                >
                  <Image
                    source={require('../../assets/images/anote-logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </Animated.View>

                {/* Pill Badge */}
                <View style={styles.badgePill}>
                  <Ionicons name="sparkles" size={13} color={THEME.colors.mint} />
                  <Text style={styles.badgeText}>WELCOME TO A NOTE</Text>
                </View>

                {/* Main Heading */}
                <Text style={styles.mainHeading}>Welcome to A Note</Text>
                <Text style={styles.subHeading}>
                  Your creative work, beautifully organized.
                </Text>

                {/* Intro Banner */}
                <View style={styles.introBanner}>
                  <Ionicons name="color-wand-outline" size={16} color={THEME.colors.purple} />
                  <Text style={styles.introBannerText}>Let’s personalize your workspace.</Text>
                </View>
              </View>

              {/* Form Card */}
              <View style={styles.cardContainer}>
                {/* 1. Required Display Name */}
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>Display Name</Text>
                    <Text style={styles.requiredStar}>*</Text>
                  </View>

                  <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    <View
                      style={[
                        styles.inputWrapper,
                        nameError ? styles.inputWrapperError : null,
                      ]}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={nameError ? THEME.colors.danger : THEME.colors.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        ref={nameInputRef}
                        style={styles.textInput}
                        value={displayName}
                        onChangeText={(val) => {
                          setDisplayName(val);
                          if (nameError) setNameError(null);
                        }}
                        placeholder="What should we call you?"
                        placeholderTextColor="#A09CB8"
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="next"
                        accessibilityLabel="Display Name"
                        accessibilityHint="Required name used to personalize your workspace greeting"
                      />
                    </View>
                  </Animated.View>

                  {nameError ? (
                    <View style={styles.errorRow}>
                      <Ionicons name="alert-circle" size={13} color={THEME.colors.danger} />
                      <Text style={styles.errorText}>{nameError}</Text>
                    </View>
                  ) : null}
                </View>

                {/* 2. Profession Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>Profession</Text>
                  <Text style={styles.helperText}>Select the role that fits your work best:</Text>

                  <View style={styles.professionGrid}>
                    {PROFESSIONS.map((profession) => {
                      const isSelected = selectedProfession === profession;
                      const iconName = PROFESSION_ICONS[profession] || 'create-outline';

                      return (
                        <PressableScale
                          key={profession}
                          style={[
                            styles.professionCard,
                            isSelected && styles.professionCardSelected,
                          ]}
                          onPress={() => setSelectedProfession(profession)}
                          activeScale={0.96}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: isSelected }}
                          accessibilityLabel={profession}
                        >
                          <View
                            style={[
                              styles.professionIconBox,
                              isSelected && styles.professionIconBoxSelected,
                            ]}
                          >
                            <Ionicons
                              name={iconName}
                              size={18}
                              color={isSelected ? THEME.colors.mintDark : THEME.colors.textSecondary}
                            />
                          </View>
                          <Text
                            style={[
                              styles.professionTitle,
                              isSelected && styles.professionTitleSelected,
                            ]}
                            numberOfLines={1}
                          >
                            {profession}
                          </Text>
                          {isSelected && (
                            <View style={styles.checkBadge}>
                              <Ionicons name="checkmark-sharp" size={12} color="#FFFFFF" />
                            </View>
                          )}
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>

                {/* 3. Optional Studio / Business Name */}
                <View style={[styles.inputGroup, { marginBottom: 4 }]}>
                  <View style={styles.labelRow}>
                    <Text style={styles.fieldLabel}>Studio / Business Name</Text>
                    <Text style={styles.optionalBadge}>Optional</Text>
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="business-outline"
                      size={18}
                      color={THEME.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={studioName}
                      onChangeText={setStudioName}
                      placeholder="Your studio or business name"
                      placeholderTextColor="#A09CB8"
                      autoCapitalize="words"
                      autoCorrect={false}
                      accessibilityLabel="Studio or Business Name"
                      accessibilityHint="Optional business or studio name displayed on your dashboard"
                    />
                  </View>
                  <Text style={styles.subHelperText}>
                    Displayed on your home dashboard if provided.
                  </Text>
                </View>
              </View>

              {/* Bottom Buttons */}
              <View style={styles.actionsContainer}>
                {/* Primary Button: Let's Get Started */}
                <PressableScale
                  style={styles.primaryButton}
                  onPress={handleGetStarted}
                  activeScale={0.96}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Let's Get Started"
                >
                  <Text style={styles.primaryButtonText}>Let’s Get Started</Text>
                  <View style={styles.arrowCircle}>
                    <Ionicons name="arrow-forward" size={16} color="#1E1B38" />
                  </View>
                </PressableScale>

                {/* Secondary Button: Skip for Now */}
                <PressableScale
                  style={styles.skipButton}
                  onPress={handleSkip}
                  activeScale={0.94}
                  accessibilityRole="button"
                  accessibilityLabel="Skip for Now"
                >
                  <Text style={styles.skipButtonText}>Skip for Now</Text>
                </PressableScale>

                <Text style={styles.privacyNote}>
                  Stored securely &amp; offline on your phone &bull; Never uploaded
                </Text>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F0EBF8', // Soft pastel lavender
  },
  keyboardContainer: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  logoWrapper: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E1B38',
    letterSpacing: 1.2,
  },
  mainHeading: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1E1B38',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 13,
    color: '#6E6A8A',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  introBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE8FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    marginTop: 12,
  },
  introBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.purple,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 18,
  },
  inputGroup: {
    marginBottom: 16,
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
    marginTop: 5,
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
  professionCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8FD',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ECE5F7',
    gap: 8,
    position: 'relative',
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
    fontSize: 12,
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
  actionsContainer: {
    alignItems: 'center',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1B38',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#1E1B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8AAB',
  },
  privacyNote: {
    fontSize: 10,
    color: '#A09CB8',
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});

