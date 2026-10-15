import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClientWithVideos, PendingVoiceAction, VoiceState } from '../types';
import { THEME } from '../constants/theme';
import { parseVoiceCommand, ParseResult } from '../services/voiceParser';
import {
  isRunningInExpoGo,
  isNativeSpeechAvailable,
  requestSpeechPermissions,
  startSpeechRecognition,
  stopSpeechRecognition,
  useSafeSpeechRecognitionEvent,
} from '../services/speechService';

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  clients: ClientWithVideos[];
  onExecutePendingAction: (action: PendingVoiceAction) => void;
  onNavigate: (screen: 'dashboard' | 'clients') => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  visible,
  onClose,
  clients,
  onExecutePendingAction,
  onNavigate,
  onNotify,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    isRunningInExpoGo
      ? 'Expo Go: Use quick test commands or manual tester below'
      : 'Tap the microphone to speak'
  );
  const [pendingAction, setPendingAction] = useState<PendingVoiceAction | null>(null);
  const [ambiguityPrompt, setAmbiguityPrompt] = useState<string | null>(null);
  const [customTestInput, setCustomTestInput] = useState('');
  const [pulseAnim] = useState(new Animated.Value(1));

  const nativeSupported = isNativeSpeechAvailable();

  // Pulse animation for listening state
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (voiceState === 'listening') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (animation) animation.stop();
    };
  }, [voiceState, pulseAnim]);

  // Safe Native Speech Recognition Event Handlers
  useSafeSpeechRecognitionEvent('start', () => {
    setVoiceState('listening');
    setStatusMessage('Listening... Speak your command now.');
  });

  useSafeSpeechRecognitionEvent('result', (event: any) => {
    const text = event?.results?.[0]?.transcript || '';
    setTranscript(text);

    if (event?.isFinal) {
      setVoiceState('processing');
      handleProcessTranscript(text);
    }
  });

  useSafeSpeechRecognitionEvent('error', (event: any) => {
    console.warn('[Voice Recognition Error]:', event);
    setVoiceState('error');
    let msg = event?.message || 'Speech recognition error occurred.';

    const isNetworkRelated =
      event?.error === 'service-not-allowed' ||
      (event?.message && event.message.toLowerCase().includes('network'));

    if (isNetworkRelated) {
      msg =
        'Speech service connection required. If recognition fails, please ensure an active internet connection or download an offline speech language pack on your device.';
    } else if (event?.error === 'no-speech') {
      msg = 'No speech was detected. Please tap mic and speak again.';
    } else if (event?.error === 'audio-capture') {
      msg = 'Microphone capture error. Check device audio permissions.';
    }

    setStatusMessage(msg);
  });

  useSafeSpeechRecognitionEvent('end', () => {
    if (voiceState === 'listening') {
      setVoiceState('idle');
    }
  });

  const handleStartListening = async () => {
    setPendingAction(null);
    setAmbiguityPrompt(null);
    setTranscript('');

    if (Platform.OS === 'web') {
      setStatusMessage('Browser mode: Use quick test commands or manual tester below.');
      return;
    }

    if (!nativeSupported) {
      setVoiceState('idle');
      if (isRunningInExpoGo) {
        setStatusMessage(
          'Expo Go detected: The native speech recognition module is not bundled in Expo Go. Launch via your custom Development Build or test commands below.'
        );
      } else {
        setStatusMessage(
          'Native speech module is unavailable in this binary. Use test commands below or rebuild your development APK.'
        );
      }
      return;
    }

    setStatusMessage('Requesting microphone permission...');

    try {
      const permission = await requestSpeechPermissions();
      if (!permission.granted) {
        setVoiceState('error');
        setStatusMessage(
          permission.message ||
            'Microphone permission denied. Please allow microphone access in device settings.'
        );
        return;
      }

      setVoiceState('listening');
      setStatusMessage('Listening... Speak now.');

      startSpeechRecognition({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        addsPunctuation: false,
      });
    } catch (e: any) {
      console.warn('[EditFlow Voice] Error starting speech recognition:', e);
      setVoiceState('error');
      setStatusMessage(
        e.message || 'Speech recognition failed to start. You can test commands below.'
      );
    }
  };

  const handleStopListening = () => {
    stopSpeechRecognition();
    setVoiceState('idle');
  };

  const handleProcessTranscript = (text: string) => {
    const result: ParseResult = parseVoiceCommand(text, clients);

    if (result.targetScreen) {
      onNavigate(result.targetScreen);
    }

    if (result.isAmbiguous) {
      setVoiceState('idle');
      setAmbiguityPrompt(result.ambiguityPrompt || 'Command is ambiguous.');
      setStatusMessage('Clarification Needed');
      return;
    }

    if (!result.success) {
      setVoiceState('error');
      setStatusMessage(result.message);
      return;
    }

    if (result.pendingAction) {
      setVoiceState('idle');
      setPendingAction(result.pendingAction);
      setStatusMessage('Please confirm this action:');
      return;
    }

    // Direct success
    setVoiceState('success');
    setStatusMessage(result.message);
    onNotify(result.message);
  };

  const handleConfirmAction = () => {
    if (pendingAction) {
      onExecutePendingAction(pendingAction);
      const actionDesc = pendingAction.description;
      setPendingAction(null);
      setVoiceState('success');
      setStatusMessage(`Completed: ${actionDesc}`);
      onNotify(`Success: ${actionDesc}`);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    setAmbiguityPrompt(null);
    setVoiceState('idle');
    setStatusMessage('Action cancelled. Tap mic to try another command.');
  };

  const runSampleCommand = (command: string) => {
    setTranscript(command);
    setVoiceState('processing');
    setTimeout(() => {
      handleProcessTranscript(command);
    }, 250);
  };

  const handleManualSubmit = () => {
    if (!customTestInput.trim()) return;
    const cmd = customTestInput.trim();
    setCustomTestInput('');
    runSampleCommand(cmd);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerBadge}>
              <View
                style={[
                  styles.statusDot,
                  voiceState === 'listening'
                    ? styles.statusDotListening
                    : voiceState === 'success'
                    ? styles.statusDotSuccess
                    : styles.statusDotIdle,
                ]}
              />
              <Text style={styles.headerTitle}>EditFlow Voice Control</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Environment Information Badge */}
            {!nativeSupported && isRunningInExpoGo ? (
              <View style={styles.expoGoBanner}>
                <Ionicons name="information-circle-outline" size={18} color={THEME.colors.mint} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.expoGoTitle}>Running in Expo Go</Text>
                  <Text style={styles.expoGoText}>
                    Expo Go does not include custom native modules. For hardware mic recognition, launch using your Android development build APK. All commands can also be tested below!
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Prominent Microphone Center Button */}
            <View style={styles.micCenterContainer}>
              <Animated.View
                style={[
                  styles.micGlowRing,
                  voiceState === 'listening' && {
                    transform: [{ scale: pulseAnim }],
                    borderColor: THEME.colors.mint,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.micButton,
                    voiceState === 'listening' && styles.micButtonListening,
                  ]}
                  onPress={
                    voiceState === 'listening'
                      ? handleStopListening
                      : handleStartListening
                  }
                  activeOpacity={0.85}
                >
                  {voiceState === 'processing' ? (
                    <ActivityIndicator size="large" color="#0B0C0E" />
                  ) : (
                    <Ionicons
                      name={voiceState === 'listening' ? 'radio' : 'mic'}
                      size={36}
                      color={voiceState === 'listening' ? '#FFFFFF' : '#0B0C0E'}
                    />
                  )}
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.micStateText}>
                {voiceState === 'listening'
                  ? 'LISTENING... (TAP TO STOP)'
                  : voiceState === 'processing'
                  ? 'PROCESSING COMMAND...'
                  : nativeSupported
                  ? 'TAP MIC TO SPEAK'
                  : 'TAP FOR STATUS / USE TESTERS BELOW'}
              </Text>
            </View>

            {/* Transcript & Feedback Card */}
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackLabel}>Status / Transcript</Text>
              {transcript ? (
                <Text style={styles.transcriptText}>
                  &ldquo;{transcript}&rdquo;
                </Text>
              ) : null}
              <Text
                style={[
                  styles.statusMessage,
                  voiceState === 'error' && styles.statusMessageError,
                  voiceState === 'success' && styles.statusMessageSuccess,
                ]}
              >
                {statusMessage}
              </Text>
            </View>

            {/* Ambiguity Prompt */}
            {ambiguityPrompt && (
              <View style={styles.ambiguityCard}>
                <Ionicons name="help-circle-outline" size={20} color={THEME.colors.amber} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ambiguityTitle}>Confirmation Needed</Text>
                  <Text style={styles.ambiguityText}>{ambiguityPrompt}</Text>
                </View>
              </View>
            )}

            {/* Pending Action Confirmation Card */}
            {pendingAction && (
              <View style={styles.pendingActionCard}>
                <View style={styles.pendingActionHeader}>
                  <Ionicons name="sparkles" size={16} color={THEME.colors.mint} />
                  <Text style={styles.pendingActionTitle}>Confirm Voice Action</Text>
                </View>
                <Text style={styles.pendingActionDesc}>
                  {pendingAction.description}
                </Text>

                <View style={styles.pendingActionsRow}>
                  <TouchableOpacity
                    style={styles.cancelActionBtn}
                    onPress={handleCancelAction}
                  >
                    <Text style={styles.cancelActionBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmActionBtn}
                    onPress={handleConfirmAction}
                  >
                    <Ionicons name="checkmark" size={16} color="#0B0C0E" />
                    <Text style={styles.confirmActionBtnText}>Confirm Action</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Quick Test Voice Command Chips */}
            <View style={styles.sectionDivider} />
            <Text style={styles.testSectionTitle}>Supported Voice Commands</Text>
            <Text style={styles.testSectionSubtitle}>
              Tap any command below to test or speak it aloud:
            </Text>

            <View style={styles.chipsContainer}>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => runSampleCommand('Rahul, video 1 done')}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={THEME.colors.mint} />
                <Text style={styles.chipText}>&ldquo;Rahul, video 1 done&rdquo;</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chip}
                onPress={() => runSampleCommand('Rahul, video two completed')}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={THEME.colors.mint} />
                <Text style={styles.chipText}>&ldquo;Rahul, video two completed&rdquo;</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chip}
                onPress={() =>
                  runSampleCommand('Add client Priya, budget 12000, rate 1000')
                }
              >
                <Ionicons name="person-add-outline" size={14} color={THEME.colors.mint} />
                <Text style={styles.chipText}>
                  &ldquo;Add client Priya, budget 12000, rate 1000&rdquo;
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chip}
                onPress={() => runSampleCommand('Show remaining videos')}
              >
                <Ionicons name="list-outline" size={14} color={THEME.colors.mint} />
                <Text style={styles.chipText}>&ldquo;Show remaining videos&rdquo;</Text>
              </TouchableOpacity>
            </View>

            {/* Manual Tester Input */}
            <View style={styles.manualInputRow}>
              <TextInput
                style={styles.manualInput}
                placeholder="Or type custom command to test..."
                placeholderTextColor={THEME.colors.textMuted}
                value={customTestInput}
                onChangeText={setCustomTestInput}
                onSubmitEditing={handleManualSubmit}
              />
              <TouchableOpacity
                style={styles.manualSendBtn}
                onPress={handleManualSubmit}
              >
                <Ionicons name="arrow-up" size={16} color="#0B0C0E" />
              </TouchableOpacity>
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
    backgroundColor: THEME.colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotIdle: {
    backgroundColor: THEME.colors.textMuted,
  },
  statusDotListening: {
    backgroundColor: THEME.colors.mint,
  },
  statusDotSuccess: {
    backgroundColor: THEME.colors.mint,
  },
  headerTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: THEME.spacing.lg,
  },
  expoGoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(5, 214, 158, 0.08)',
    borderWidth: 1,
    borderColor: THEME.colors.mintBorder,
    borderRadius: THEME.radius.md,
    padding: 10,
    marginBottom: THEME.spacing.sm,
  },
  expoGoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.mint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expoGoText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  micCenterContainer: {
    alignItems: 'center',
    marginVertical: THEME.spacing.md,
  },
  micGlowRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: THEME.colors.mintBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonListening: {
    backgroundColor: '#EF4444',
  },
  micStateText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 12,
  },
  feedbackCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: THEME.spacing.sm,
  },
  feedbackLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
    color: THEME.colors.mint,
    marginVertical: 4,
  },
  statusMessage: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  statusMessageError: {
    color: THEME.colors.danger,
    fontWeight: '600',
  },
  statusMessageSuccess: {
    color: THEME.colors.mint,
    fontWeight: '600',
  },
  ambiguityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: THEME.colors.amberGlow,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginVertical: 6,
  },
  ambiguityTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.amber,
    textTransform: 'uppercase',
  },
  ambiguityText: {
    fontSize: THEME.typography.sizes.sm,
    color: THEME.colors.textPrimary,
    marginTop: 2,
  },
  pendingActionCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.lg,
    borderWidth: 1.5,
    borderColor: THEME.colors.mint,
    marginVertical: THEME.spacing.sm,
  },
  pendingActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  pendingActionTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.mint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pendingActionDesc: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    marginBottom: 12,
  },
  pendingActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelActionBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cancelActionBtnText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  confirmActionBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: THEME.colors.mint,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  confirmActionBtnText: {
    fontSize: THEME.typography.sizes.xs,
    color: '#0B0C0E',
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },
  testSectionTitle: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  testSectionSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.radius.full,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  chipText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textPrimary,
    fontWeight: '500',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  manualInput: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: THEME.colors.textPrimary,
    fontSize: THEME.typography.sizes.sm,
  },
  manualSendBtn: {
    width: 42,
    height: 42,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
