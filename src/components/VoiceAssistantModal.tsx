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
  KeyboardAvoidingView,
  BackHandler,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ClientWithVideos, PendingVoiceAction, VoiceState } from '../types';
import { THEME } from '../constants/theme';
import { parseVoiceCommand, ParseResult } from '../services/voiceParser';
import {
  isRunningInExpoGo,
  isSherpaNativeAvailable,
  startSherpaOfflineListening,
  stopSherpaOfflineListening,
} from '../services/sherpaOfflineSpeechService';
import {
  checkSherpaModelInstalled,
  downloadSherpaModel,
  SHERPA_ZIPFORMER_EN_20M,
} from '../services/sherpaModelManager';

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  clients: ClientWithVideos[];
  onExecutePendingAction: (action: PendingVoiceAction) => void;
  onNavigate: (screen: 'dashboard' | 'clients' | 'new_client', client?: ClientWithVideos) => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

const EXAMPLE_CHIPS = [
  'Rahul, video five is done',
  'Video 5 is done',
];

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  visible,
  onClose,
  clients,
  onExecutePendingAction,
  onNavigate,
  onNotify,
}) => {
  const insets = useSafeAreaInsets();
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('Tap microphone to speak');
  const [typedInput, setTypedInput] = useState('');
  const [feedbackColor, setFeedbackColor] = useState<string>(THEME.colors.purple);

  // Sherpa-ONNX model installation state
  const [modelInstalled, setModelInstalled] = useState<boolean | null>(null);
  const [isDownloadingModel, setIsDownloadingModel] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStatusText, setDownloadStatusText] = useState<string>('');

  // Prevent duplicate transcript triggers
  const lastProcessedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  // Pulsing animation for mic button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const wave1 = useRef(new Animated.Value(8)).current;
  const wave2 = useRef(new Animated.Value(14)).current;
  const wave3 = useRef(new Animated.Value(20)).current;
  const wave4 = useRef(new Animated.Value(12)).current;

  // Pulse ring animation when listening
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (voiceState === 'listening') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
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

  // Audio wave animation when listening
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
        createBarAnim(wave1, 26, 8, 360),
        createBarAnim(wave2, 34, 10, 460),
        createBarAnim(wave3, 38, 12, 320),
        createBarAnim(wave4, 28, 8, 420),
      ]);
      waveLoop.start();
    } else {
      Animated.parallel([
        Animated.timing(wave1, { toValue: 8, duration: 200, useNativeDriver: false }),
        Animated.timing(wave2, { toValue: 14, duration: 200, useNativeDriver: false }),
        Animated.timing(wave3, { toValue: 20, duration: 200, useNativeDriver: false }),
        Animated.timing(wave4, { toValue: 12, duration: 200, useNativeDriver: false }),
      ]).start();
    }
    return () => {
      if (waveLoop) waveLoop.stop();
    };
  }, [voiceState, wave1, wave2, wave3, wave4]);

  // Check offline voice model installation status
  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    (async () => {
      const res = await checkSherpaModelInstalled();
      if (isMounted) {
        setModelInstalled(res.isInstalled);
        if (!res.isInstalled) {
          setStatusMessage('Download the free offline voice model (~43 MB) to enable speech.');
        } else {
          setStatusMessage('Tap microphone to speak offline.');
        }
      }
    })();
    return () => {
      isMounted = false;
      stopSherpaOfflineListening();
    };
  }, [visible]);

  const handleStopListening = useCallback(() => {
    stopSherpaOfflineListening();
    if (voiceState === 'listening') {
      setVoiceState('idle');
      setStatusMessage('Tap microphone to speak');
    }
  }, [voiceState]);

  // Safe Android BackHandler
  const handleSafeBackOrClose = useCallback(() => {
    handleStopListening();
    onClose();
    return true;
  }, [handleStopListening, onClose]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', handleSafeBackOrClose);
    return () => sub.remove();
  }, [visible, handleSafeBackOrClose]);

  // Execute command parsing & action
  const handleProcessCommand = (commandText: string) => {
    const result: ParseResult = parseVoiceCommand(commandText, clients);

    // 1. Navigation query
    if (result.targetScreen) {
      setVoiceState('success');
      setStatusMessage(result.message);
      setFeedbackColor(THEME.colors.mint);
      setTimeout(() => {
        onNavigate(result.targetScreen!, result.matchedClient);
        onClose();
      }, 700);
      return;
    }

    // 2. Ambiguity
    if (result.isAmbiguous) {
      setVoiceState('idle');
      setStatusMessage(result.ambiguityPrompt || result.message);
      setFeedbackColor(THEME.colors.amber);
      return;
    }

    // 3. Command Unrecognized or validation error
    if (!result.success) {
      setVoiceState('error');
      setStatusMessage(result.message);
      setFeedbackColor('#FF5E7E');
      return;
    }

    // 4. Already completed video: friendly neutral/green message, NO error dialog, NO duplicate history
    if (result.alreadyCompleted) {
      setVoiceState('success');
      setStatusMessage(result.message);
      setFeedbackColor(THEME.colors.mint);
      onNotify(result.message);
      return;
    }

    // 5. Valid unambiguous action: DIRECT EXECUTION (No unnecessary confirmation popup!)
    if (result.pendingAction) {
      setVoiceState('success');
      setStatusMessage(result.message);
      setFeedbackColor(THEME.colors.mint);
      onExecutePendingAction(result.pendingAction);
      onNotify(result.message);
      return;
    }

    // General success fallback
    setVoiceState('success');
    setStatusMessage(result.message);
    setFeedbackColor(THEME.colors.mint);
  };

  const handleDownloadModel = async () => {
    setIsDownloadingModel(true);
    setDownloadProgress(0);
    setDownloadStatusText('Starting download from Hugging Face...');
    setStatusMessage('Downloading offline voice model (~43.6 MB)...');
    setFeedbackColor(THEME.colors.purple);

    const result = await downloadSherpaModel((percent, status) => {
      setDownloadProgress(percent);
      setDownloadStatusText(status);
    });

    setIsDownloadingModel(false);

    if (result.success) {
      setModelInstalled(true);
      setStatusMessage('Offline model ready! Tap microphone to speak.');
      setFeedbackColor(THEME.colors.mint);
      onNotify('Offline voice model installed successfully!');
    } else {
      setStatusMessage(result.error || 'Failed to download model. You can type commands below.');
      setFeedbackColor('#FF5E7E');
    }
  };

  const handleStartListening = async () => {
    setTranscript('');
    setFeedbackColor(THEME.colors.mint);

    if (isRunningInExpoGo) {
      setVoiceState('listening');
      setStatusMessage('Expo Go detected: Type a command below or tap an example chip.');
      return;
    }

    if (!modelInstalled) {
      setStatusMessage('Download the offline voice model to start.');
      setFeedbackColor(THEME.colors.amber);
      return;
    }

    const res = await startSherpaOfflineListening({
      onListeningStart: () => {
        setVoiceState('listening');
        setStatusMessage('Listening offline... Speak naturally.');
        setFeedbackColor(THEME.colors.mint);
      },
      onTranscript: (text: string, isFinal: boolean) => {
        if (!text) return;
        setTranscript(text);
        if (isFinal) {
          const clean = text.trim().toLowerCase();
          const now = Date.now();
          if (clean === lastProcessedRef.current.text && now - lastProcessedRef.current.time < 2000) {
            return;
          }
          lastProcessedRef.current = { text: clean, time: now };

          setVoiceState('processing');
          setStatusMessage(`Processing: "${text}"`);
          handleProcessCommand(text);
        }
      },
      onError: (errMsg: string) => {
        setVoiceState('error');
        setStatusMessage(errMsg || 'Recognition error. You can retry or type below.');
        setFeedbackColor('#FF5E7E');
      },
      onListeningEnd: () => {
        if (voiceState === 'listening') {
          setVoiceState('idle');
          setStatusMessage('Listening finished. Tap mic to speak again.');
        }
      },
    });

    if (!res.success) {
      setVoiceState('error');
      setStatusMessage(res.error || 'Could not start offline microphone.');
      setFeedbackColor('#FF5E7E');
    }
  };

  const handleToggleMic = () => {
    if (voiceState === 'listening') {
      handleStopListening();
    } else {
      handleStartListening();
    }
  };

  const handleSendTypedCommand = () => {
    if (!typedInput.trim()) return;
    const cmd = typedInput.trim();
    setTypedInput('');
    setTranscript(cmd);
    setVoiceState('processing');
    setStatusMessage(`Processing: "${cmd}"`);
    setTimeout(() => {
      handleProcessCommand(cmd);
    }, 150);
  };

  const handleChipPress = (cmd: string) => {
    setTranscript(cmd);
    setVoiceState('processing');
    setStatusMessage(`Processing: "${cmd}"`);
    setTimeout(() => {
      handleProcessCommand(cmd);
    }, 150);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleSafeBackOrClose}
    >
      <View style={[styles.rootContainer, { paddingTop: insets.top }]}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleSafeBackOrClose}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Close Voice Assistant"
          >
            <Ionicons name="arrow-back" size={20} color={THEME.colors.textNavy} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Voice Assistant</Text>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Instruction Banner */}
            <View style={styles.instructionBox}>
              <Text style={styles.instructionMain}>
                Speak naturally to track client videos &amp; progress
              </Text>
              <Text style={styles.instructionSub}>
                Say a client name and video number to complete it directly.
              </Text>
            </View>

            {/* Quick Example Chips */}
            <View style={styles.chipsRow}>
              {EXAMPLE_CHIPS.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.exampleChip}
                  onPress={() => handleChipPress(chip)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="sparkles" size={12} color={THEME.colors.mint} />
                  <Text style={styles.chipText}>“{chip}”</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Offline Model Setup Card (shown if model is not yet downloaded) */}
            {modelInstalled === false && (
              <View style={styles.modelCard}>
                <View style={styles.modelHeaderRow}>
                  <View style={styles.modelBadge}>
                    <Ionicons name="shield-checkmark" size={13} color="#7C5CFC" />
                    <Text style={styles.modelBadgeText}>FREE ON-DEVICE STT</Text>
                  </View>
                  <Text style={styles.modelSizeText}>~{SHERPA_ZIPFORMER_EN_20M.approxSizeMb} MB</Text>
                </View>

                <Text style={styles.modelTitle}>{SHERPA_ZIPFORMER_EN_20M.displayName}</Text>
                <Text style={styles.modelSubtitle}>
                  Download the open-source speech model once to enable 100% offline speech recognition without cloud APIs.
                </Text>

                {isDownloadingModel ? (
                  <View style={styles.downloadContainer}>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
                    </View>
                    <View style={styles.progressRow}>
                      <Text style={styles.progressStatusText} numberOfLines={1}>
                        {downloadStatusText || 'Downloading...'}
                      </Text>
                      <Text style={styles.progressPercentText}>{downloadProgress}%</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={handleDownloadModel}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.downloadButtonText}>Download Offline Model (~43 MB)</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Central Prominent Microphone Button */}
            <View style={styles.micCenterContainer}>
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    borderColor:
                      voiceState === 'listening'
                        ? THEME.colors.mint
                        : 'rgba(124, 92, 252, 0.2)',
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.micButton,
                    voiceState === 'listening' ? styles.micButtonListening : styles.micButtonIdle,
                  ]}
                  onPress={handleToggleMic}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={voiceState === 'listening' ? 'Stop listening' : 'Start listening'}
                >
                  <Ionicons
                    name={voiceState === 'listening' ? 'mic' : 'mic-outline'}
                    size={36}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </Animated.View>

              {/* Sound wave visualizer when listening */}
              {voiceState === 'listening' && (
                <View style={styles.waveContainer}>
                  <Animated.View style={[styles.waveBar, { height: wave1 }]} />
                  <Animated.View style={[styles.waveBar, { height: wave2 }]} />
                  <Animated.View style={[styles.waveBar, { height: wave3 }]} />
                  <Animated.View style={[styles.waveBar, { height: wave4 }]} />
                </View>
              )}
            </View>

            {/* Status Message & Live Transcript */}
            <View style={styles.statusCard}>
              <View style={[styles.statusDot, { backgroundColor: feedbackColor }]} />
              <Text style={[styles.statusText, { color: feedbackColor }]} numberOfLines={2}>
                {statusMessage}
              </Text>
            </View>

            {modelInstalled && (
              <View style={styles.offlineReadyBadge}>
                <Ionicons name="checkmark-circle" size={13} color={THEME.colors.mint} />
                <Text style={styles.offlineReadyText}>100% Offline Speech Active</Text>
              </View>
            )}

            {transcript.length > 0 && (
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptLabel}>Heard:</Text>
                <Text style={styles.transcriptText}>“{transcript}”</Text>
              </View>
            )}
          </ScrollView>

          {/* Bottom Anchored Typed Command Input */}
          <View style={[styles.bottomInputSection, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
            <Text style={styles.typePrompt}>Or type your command:</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Rahul, video 5 is done"
                placeholderTextColor={THEME.colors.textMuted}
                value={typedInput}
                onChangeText={setTypedInput}
                onSubmitEditing={handleSendTypedCommand}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  typedInput.trim().length > 0 ? styles.sendButtonActive : styles.sendButtonDisabled,
                ]}
                onPress={handleSendTypedCommand}
                disabled={typedInput.trim().length === 0}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={typedInput.trim().length > 0 ? '#FFFFFF' : THEME.colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F0EBF8',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.3,
  },
  keyboardAvoidingContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  instructionBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionMain: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textNavy,
    textAlign: 'center',
    marginBottom: 4,
  },
  instructionSub: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 28,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textNavy,
  },
  micCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  pulseRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  micButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  micButtonIdle: {
    backgroundColor: THEME.colors.mint,
  },
  micButtonListening: {
    backgroundColor: '#7C5CFC',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    marginTop: 14,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.mint,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  transcriptBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  transcriptText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textNavy,
    fontStyle: 'italic',
  },
  bottomInputSection: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  typePrompt: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#F7F3FC',
    borderRadius: 23,
    paddingHorizontal: 16,
    fontSize: 13,
    color: THEME.colors.textNavy,
    borderWidth: 1,
    borderColor: '#E8E1F3',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: THEME.colors.mint,
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#EBE5F5',
  },
  modelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  modelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0EBF8',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  modelBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C5CFC',
    letterSpacing: 0.5,
  },
  modelSizeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  modelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    marginBottom: 4,
  },
  modelSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C5CFC',
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  downloadContainer: {
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EBE5F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.mint,
    borderRadius: 4,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressStatusText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    flex: 1,
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textNavy,
    marginLeft: 8,
  },
  offlineReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 201, 167, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    marginTop: 8,
    gap: 5,
  },
  offlineReadyText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
});

