import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  KeyboardAvoidingView,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClientWithVideos, PendingVoiceAction, VoiceState } from '../types';
import { THEME } from '../constants/theme';
import { parseVoiceCommand, ParseResult } from '../services/voiceParser';
import {
  isRunningInExpoGo,
  isNativeSpeechAvailable,
  getOptimalSpeechLocale,
  triggerOfflineSpeechModelDownload,
  OptimalLocaleInfo,
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
  onNavigate: (screen: 'dashboard' | 'clients' | 'new_client', client?: ClientWithVideos) => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

const SUPPORTED_COMMANDS = [
  { icon: 'checkmark-circle-outline', text: 'Video five is done.', action: 'Video five is done.' },
  { icon: 'checkmark-circle-outline', text: 'Rahul, video five is done.', action: 'Rahul, video five is done.' },
  { icon: 'person-add-outline', text: 'New client.', action: 'New client.' },
  { icon: 'document-text-outline', text: 'Add client Rahul, rate 800, payment 10000.', action: 'Add client Rahul, rate 800, payment 10000.' },
  { icon: 'list-outline', text: 'Show remaining videos.', action: 'Show remaining videos.' },
  { icon: 'people-outline', text: 'Show client Rahul.', action: 'Show client Rahul.' },
];

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
  const [statusMessage, setStatusMessage] = useState('Ready to Listen');
  const [pendingAction, setPendingAction] = useState<PendingVoiceAction | null>(null);
  const [ambiguityPrompt, setAmbiguityPrompt] = useState<string | null>(null);
  const [customTestInput, setCustomTestInput] = useState('');
  const [activeLocale, setActiveLocale] = useState<OptimalLocaleInfo | null>(null);
  const [languagePackMissing, setLanguagePackMissing] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);

  const continuousModeRef = useRef(isContinuousMode);
  continuousModeRef.current = isContinuousMode;

  const lastProcessedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  // Concentric circle pulsating scale
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 4 Animated sound wave bars (Google / Where Is My Train visualizer style)
  const wave1 = useRef(new Animated.Value(8)).current;
  const wave2 = useRef(new Animated.Value(14)).current;
  const wave3 = useRef(new Animated.Value(20)).current;
  const wave4 = useRef(new Animated.Value(12)).current;

  // Pulse animation when listening
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (voiceState === 'listening') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
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

  // Soundwave bouncing animation when listening
  useEffect(() => {
    let waveLoop: Animated.CompositeAnimation | null = null;
    if (voiceState === 'listening') {
      const createBarAnim = (anim: Animated.Value, maxH: number, minH: number, dur: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: maxH, duration: dur, useNativeDriver: false }),
            Animated.timing(anim, { toValue: minH, duration: dur, useNativeDriver: false }),
          ])
        );

      waveLoop = Animated.parallel([
        createBarAnim(wave1, 28, 8, 380),
        createBarAnim(wave2, 36, 10, 480),
        createBarAnim(wave3, 42, 12, 340),
        createBarAnim(wave4, 30, 8, 440),
      ]);
      waveLoop.start();
    } else {
      Animated.parallel([
        Animated.timing(wave1, { toValue: 8, duration: 250, useNativeDriver: false }),
        Animated.timing(wave2, { toValue: 14, duration: 250, useNativeDriver: false }),
        Animated.timing(wave3, { toValue: 20, duration: 250, useNativeDriver: false }),
        Animated.timing(wave4, { toValue: 12, duration: 250, useNativeDriver: false }),
      ]).start();
    }
    return () => {
      if (waveLoop) waveLoop.stop();
    };
  }, [voiceState, wave1, wave2, wave3, wave4]);

  // Stop speech recognition helper
  const handleStopListening = useCallback(() => {
    setIsContinuousMode(false);
    continuousModeRef.current = false;
    stopSpeechRecognition();
    setVoiceState('idle');
    setStatusMessage('Ready to Listen');
  }, []);

  // Safe Back button handler (Android Back Button requirement)
  const handleSafeBackOrClose = useCallback(() => {
    if (voiceState === 'confirmation' || pendingAction) {
      // Dismiss confirmation dialog before navigating away
      setPendingAction(null);
      setAmbiguityPrompt(null);
      setVoiceState('idle');
      setStatusMessage('Action cancelled. Ready to Listen.');
      return true;
    }

    handleStopListening();
    onClose();
    return true;
  }, [voiceState, pendingAction, handleStopListening, onClose]);

  // BackHandler listener specifically for Voice screen
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleSafeBackOrClose);
    return () => sub.remove();
  }, [visible, handleSafeBackOrClose]);

  // Safe Native Speech Recognition Event Handlers
  useSafeSpeechRecognitionEvent('start', () => {
    setVoiceState('listening');
    setLanguagePackMissing(false);
    setStatusMessage(
      activeLocale
        ? `Listening (${activeLocale.displayName})... Speak now.`
        : 'Listening... Speak now.'
    );
  });

  useSafeSpeechRecognitionEvent('result', (event: any) => {
    const speechResult = event.results?.[0]?.transcript || '';
    if (speechResult) {
      setTranscript(speechResult);
      if (event.isFinal) {
        // Prevent duplicate command processing if result fires multiple times
        const clean = speechResult.trim().toLowerCase();
        const now = Date.now();
        if (
          clean === lastProcessedRef.current.text &&
          now - lastProcessedRef.current.time < 2000
        ) {
          return;
        }
        lastProcessedRef.current = { text: clean, time: now };

        setVoiceState('processing');
        setStatusMessage(`Processing: "${speechResult}"`);
        handleProcessTranscript(speechResult);
      }
    }
  });

  useSafeSpeechRecognitionEvent('end', () => {
    if (voiceState === 'listening') {
      if (continuousModeRef.current) {
        setTimeout(() => {
          handleStartListening();
        }, 800);
      } else {
        setVoiceState('idle');
        setStatusMessage('Listening finished. Tap mic to speak again.');
      }
    }
  });

  useSafeSpeechRecognitionEvent('error', (event: any) => {
    console.warn('[EditFlow Voice] Speech recognition error event:', event);
    const errCode = event.error || '';
    const errMsg = event.message || '';

    if (
      errMsg.includes('not yet downloaded') ||
      errMsg.includes('language') ||
      errCode === 'language_not_supported'
    ) {
      setLanguagePackMissing(true);
      setVoiceState('error');
      setStatusMessage(
        'Offline speech language pack not cached on device. You can download it or use test input.'
      );
      return;
    }

    if (errCode === 'no_match' || errMsg.includes('No speech')) {
      if (continuousModeRef.current) {
        setStatusMessage('No speech heard. Listening again...');
        setTimeout(() => {
          handleStartListening();
        }, 1000);
        return;
      }
      setVoiceState('idle');
      setStatusMessage('No speech detected. Tap mic to try again.');
      return;
    }

    setVoiceState('error');
    setStatusMessage(errMsg || 'Recognition error occurred. You can use test commands below.');
  });

  const handleStartListening = async (overrideLocale?: string) => {
    setPendingAction(null);
    setAmbiguityPrompt(null);
    setTranscript('');

    if (isRunningInExpoGo) {
      setVoiceState('listening');
      setStatusMessage('Simulated Listening: Tap any command below or type.');
      return;
    }

    try {
      const hasPermission = await requestSpeechPermissions();
      if (!hasPermission) {
        setVoiceState('error');
        setStatusMessage(
          'Microphone permission denied. Please allow microphone access in device settings.'
        );
        return;
      }

      let chosenLocaleTag: string | undefined = overrideLocale;
      if (!chosenLocaleTag) {
        const localeInfo = await getOptimalSpeechLocale();
        setActiveLocale(localeInfo);
        chosenLocaleTag = localeInfo.locale;
      }

      setVoiceState('listening');
      setStatusMessage(
        continuousModeRef.current
          ? `Continuous Listening active (${chosenLocaleTag}). Speak now...`
          : `Listening in ${chosenLocaleTag}...`
      );

      startSpeechRecognition({
        lang: chosenLocaleTag,
        interimResults: true,
        continuous: false,
        addsPunctuation: false,
        requiresOnDeviceRecognition: false,
      });
    } catch (e: any) {
      console.warn('[EditFlow Voice] Error starting speech recognition:', e);
      setVoiceState('error');
      setStatusMessage(e.message || 'Speech recognition failed to start.');
    }
  };

  const handleDownloadLanguageModel = async () => {
    const localeToDownload = activeLocale?.locale || 'en-IN';
    setDownloadingModel(true);
    setStatusMessage(`Requesting offline speech model download for ${localeToDownload}...`);

    try {
      const result = await triggerOfflineSpeechModelDownload(localeToDownload);
      setDownloadingModel(false);
      setStatusMessage(
        `Language model request sent (${result.status}): ${result.message}. Retrying...`
      );
      setTimeout(() => {
        handleStartListening(localeToDownload);
      }, 1000);
    } catch (err: any) {
      setDownloadingModel(false);
      setStatusMessage(`Could not initiate model download: ${err.message}.`);
    }
  };

  const handleProcessTranscript = (text: string) => {
    const result: ParseResult = parseVoiceCommand(text, clients);

    if (result.targetScreen) {
      onNavigate(result.targetScreen, result.matchedClient);
      onClose();
      return;
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
      setVoiceState('confirmation');
      setPendingAction(result.pendingAction);
      setStatusMessage('Please confirm this action:');
      return;
    }

    setVoiceState('success');
    setStatusMessage(result.message);
    onNotify(result.message);

    if (continuousModeRef.current) {
      setTimeout(() => {
        handleStartListening();
      }, 1200);
    }
  };

  const handleConfirmAction = () => {
    if (pendingAction) {
      onExecutePendingAction(pendingAction);
      const actionDesc = pendingAction.description;
      setPendingAction(null);
      setVoiceState('success');
      setStatusMessage(`Completed: ${actionDesc}`);
      onNotify(`Success: ${actionDesc}`);

      if (continuousModeRef.current) {
        setTimeout(() => {
          setStatusMessage('Listening for next command...');
          handleStartListening();
        }, 1200);
      } else {
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    }
  };

  const handleCancelAction = () => {
    setPendingAction(null);
    setAmbiguityPrompt(null);
    setVoiceState('idle');
    setStatusMessage('Action cancelled. Ready to Listen.');
    if (continuousModeRef.current) {
      setTimeout(() => {
        handleStartListening();
      }, 1000);
    }
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

  // Status badge config based on voiceState
  const getStatusBadge = () => {
    switch (voiceState) {
      case 'listening':
        return { text: 'Listening...', color: THEME.colors.mint, dotStyle: styles.statusDotListening };
      case 'processing':
        return { text: 'Processing...', color: THEME.colors.amber, dotStyle: styles.statusDotProcessing };
      case 'confirmation':
        return { text: 'Confirmation Required', color: THEME.colors.amber, dotStyle: styles.statusDotProcessing };
      case 'success':
        return { text: 'Success', color: THEME.colors.mint, dotStyle: styles.statusDotSuccess };
      case 'error':
        return { text: 'Error', color: '#FF5E7E', dotStyle: styles.statusDotError };
      case 'idle':
      default:
        return { text: 'Ready to Listen', color: THEME.colors.purple, dotStyle: styles.statusDotIdle };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleSafeBackOrClose}
    >
      <View style={styles.container}>
        {/* Top Header Row matching Screen 3 in reference */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleSafeBackOrClose}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Back to previous screen"
          >
            <Ionicons name="arrow-back" size={20} color={THEME.colors.textNavy} />
          </TouchableOpacity>

          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Voice Control</Text>
            <Text style={styles.headerSubtitle}>Where Is My Train &bull; Voice Assistant</Text>
          </View>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleSafeBackOrClose}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Close Voice Control"
          >
            <Ionicons name="close" size={20} color={THEME.colors.textNavy} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Concentric Layered Rings Hero Mic Section */}
            <View style={styles.heroMicSection}>
              {/* Outer soft concentric circle */}
              <View style={styles.outerRing}>
                {/* Middle soft concentric circle */}
                <View style={styles.middleRing}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                      style={[
                        styles.innerMicButton,
                        voiceState === 'listening' && styles.innerMicButtonActive,
                      ]}
                      onPress={
                        voiceState === 'listening' ? handleStopListening : () => handleStartListening()
                      }
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={
                        voiceState === 'listening' ? 'Stop Listening' : 'Start Listening'
                      }
                    >
                      <Ionicons
                        name={voiceState === 'listening' ? 'mic' : 'mic-outline'}
                        size={48}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>

              {/* Soundwaves visualizer bars underneath mic (Where Is My Train / Google Assistant style) */}
              <View style={styles.soundwavesContainer}>
                <Animated.View style={[styles.soundwaveBar, { height: wave1, backgroundColor: '#00D287' }]} />
                <Animated.View style={[styles.soundwaveBar, { height: wave2, backgroundColor: '#FFB800' }]} />
                <Animated.View style={[styles.soundwaveBar, { height: wave3, backgroundColor: '#8A56E2' }]} />
                <Animated.View style={[styles.soundwaveBar, { height: wave4, backgroundColor: '#00D287' }]} />
              </View>
            </View>

            {/* Mic Action Prompt / Stop Listening control */}
            <View style={styles.micPromptContainer}>
              {voiceState === 'listening' ? (
                <TouchableOpacity
                  style={styles.stopListeningButton}
                  onPress={handleStopListening}
                  activeOpacity={0.8}
                >
                  <Ionicons name="stop" size={16} color="#FFFFFF" />
                  <Text style={styles.stopListeningText}>Stop Listening</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.micPromptPill}
                  onPress={() => handleStartListening()}
                  activeOpacity={0.75}
                >
                  <Text style={styles.micPromptText}>Tap mic to start listening</Text>
                </TouchableOpacity>
              )}

              {/* Continuous Mode Toggle */}
              <TouchableOpacity
                style={[
                  styles.continuousModePill,
                  isContinuousMode && styles.continuousModePillActive,
                ]}
                onPress={() => setIsContinuousMode(!isContinuousMode)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isContinuousMode ? 'repeat' : 'repeat-outline'}
                  size={14}
                  color={isContinuousMode ? THEME.colors.purple : THEME.colors.textMuted}
                />
                <Text
                  style={[
                    styles.continuousModeText,
                    isContinuousMode && styles.continuousModeTextActive,
                  ]}
                >
                  Auto-restart: {isContinuousMode ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Status / Transcript Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusCardHeader}>
                <Text style={styles.statusCardTitle}>Status / Transcript</Text>
                <View style={styles.statusStateBadge}>
                  <View style={[styles.statusDot, statusBadge.dotStyle]} />
                  <Text style={[styles.statusStateBadgeText, { color: statusBadge.color }]}>
                    {statusBadge.text}
                  </Text>
                </View>
              </View>

              <View style={styles.statusMessageRow}>
                <Text style={styles.statusMessageText}>
                  {transcript ? `"${transcript}"` : statusMessage}
                </Text>
              </View>

              {/* Language Pack Missing Download Prompt */}
              {languagePackMissing && (
                <TouchableOpacity
                  style={styles.downloadModelBtn}
                  onPress={handleDownloadLanguageModel}
                  disabled={downloadingModel}
                >
                  {downloadingModel ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-download-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.downloadModelBtnText}>
                        Request English (India) Offline Pack
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Confirmation Box (when pendingAction is active) */}
              {voiceState === 'confirmation' && pendingAction && (
                <View style={styles.confirmationBox}>
                  <Text style={styles.confirmHeading}>Confirm Action</Text>
                  <Text style={styles.confirmDescription}>{pendingAction.description}</Text>
                  <View style={styles.confirmBtnRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={handleCancelAction}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={handleConfirmAction}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.confirmBtnText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Ambiguity Prompt Box */}
              {ambiguityPrompt && (
                <View style={styles.ambiguityBox}>
                  <Text style={styles.ambiguityText}>{ambiguityPrompt}</Text>
                </View>
              )}
            </View>

            {/* Supported Voice Commands Section (Where Is My Train "You can try saying") */}
            <View style={styles.supportedSection}>
              <View style={styles.supportedHeaderRow}>
                <View style={styles.supportedIconCircle}>
                  <Ionicons name="chatbubbles-outline" size={16} color={THEME.colors.purple} />
                </View>
                <View>
                  <Text style={styles.supportedTitle}>You can try saying</Text>
                  <Text style={styles.supportedSubtitle}>Tap any command to test instantly:</Text>
                </View>
              </View>

              {/* Six compact command chips in clean layout */}
              <View style={styles.commandsGrid}>
                {SUPPORTED_COMMANDS.map((cmd, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.commandPillCard}
                    onPress={() => runSampleCommand(cmd.action)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={cmd.text}
                  >
                    <Ionicons
                      name={cmd.icon as any}
                      size={15}
                      color={idx % 2 === 0 ? THEME.colors.mint : THEME.colors.purple}
                    />
                    <Text style={styles.commandPillText}>&ldquo;{cmd.text}&rdquo;</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ height: 90 }} />
          </ScrollView>

          {/* Bottom Manual Text Input Bar */}
          <View style={styles.bottomInputBarContainer}>
            <View style={styles.inputPill}>
              <TextInput
                style={styles.textInput}
                placeholder="Or type voice command..."
                placeholderTextColor={THEME.colors.textMuted}
                value={customTestInput}
                onChangeText={setCustomTestInput}
                onSubmitEditing={handleManualSubmit}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleManualSubmit}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Send custom command"
              >
                <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background, // Pastel lavender #F0EBF8
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: Platform.OS === 'android' ? 16 : 48,
    paddingBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 10,
  },
  heroMicSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
  },
  outerRing: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#E8FBF2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  middleRing: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: '#C5F7E2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  innerMicButton: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: THEME.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  innerMicButtonActive: {
    backgroundColor: THEME.colors.mintDark,
  },
  soundwavesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    height: 44,
  },
  soundwaveBar: {
    width: 5,
    borderRadius: 3,
  },
  micPromptContainer: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  micPromptPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  micPromptText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  stopListeningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF5E7E',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 9999,
    shadowColor: '#FF5E7E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  stopListeningText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  continuousModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#EDE8FD',
  },
  continuousModePillActive: {
    backgroundColor: '#E2D9FC',
  },
  continuousModeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  continuousModeTextActive: {
    color: THEME.colors.purple,
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  statusStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusStateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusMessageRow: {
    paddingVertical: 4,
  },
  statusMessageText: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.textNavy,
    lineHeight: 22,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotIdle: {
    backgroundColor: THEME.colors.purple,
  },
  statusDotListening: {
    backgroundColor: THEME.colors.mint,
  },
  statusDotProcessing: {
    backgroundColor: THEME.colors.amber,
  },
  statusDotSuccess: {
    backgroundColor: THEME.colors.mint,
  },
  statusDotError: {
    backgroundColor: '#FF5E7E',
  },
  downloadModelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.purple,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginTop: 12,
  },
  downloadModelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmationBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: '#FFF9ED',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE0A3',
  },
  confirmHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    marginBottom: 4,
  },
  confirmDescription: {
    fontSize: 13,
    color: THEME.colors.textNavy,
    marginBottom: 12,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0D6EC',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: THEME.colors.mint,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ambiguityBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#F3EEFD',
    borderRadius: 14,
  },
  ambiguityText: {
    fontSize: 13,
    color: THEME.colors.purple,
    fontWeight: '600',
  },
  supportedSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  supportedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  supportedIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0EBF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  supportedSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  commandsGrid: {
    gap: 8,
  },
  commandPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9F7FD',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE4F7',
  },
  commandPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textNavy,
    flex: 1,
  },
  bottomInputBarContainer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: Platform.OS === 'android' ? 16 : 30,
    paddingTop: 8,
    backgroundColor: THEME.colors.background,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.textNavy,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
});
