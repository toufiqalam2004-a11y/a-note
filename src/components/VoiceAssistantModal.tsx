import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  BackHandler,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ClientWithVideos, PendingVoiceAction, VoiceState } from '../types';
import { THEME } from '../constants/theme';
import { parseVoiceCommand, ParseResult } from '../services/voiceParser';
import { PressableScale } from './PressableScale';
import { GlassView } from './GlassView';
import {
  startSpeechRecognition,
  stopSpeechRecognition,
  abortSpeechRecognition,
  getSpeechRecognitionCapabilities,
  SpeechCapabilities,
  isRunningInExpoGo,
} from '../services/speechRecognitionService';

interface VoiceAssistantModalProps {
  visible: boolean;
  onClose: () => void;
  clients: ClientWithVideos[];
  onExecutePendingAction: (action: PendingVoiceAction) => void;
  onNavigate: (screen: 'dashboard' | 'clients' | 'new_client', client?: ClientWithVideos) => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

const EXAMPLE_CHIPS = [
  'Hardik, video 5 is done',
  "Show Hardik's progress",
  'Hardik',
  'video 5',
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
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState('Tap microphone to speak');
  const [feedbackColor, setFeedbackColor] = useState(THEME.colors.mint);
  const [typedCommand, setTypedCommand] = useState('');
  const [capabilities, setCapabilities] = useState<SpeechCapabilities | null>(null);
  const [parsedResult, setParsedResult] = useState<ParseResult | null>(null);

  // Audio-reactive Google-style 4-bar waveform (transforms useNativeDriver: true)
  const wave1 = useRef(new Animated.Value(0.15)).current;
  const wave2 = useRef(new Animated.Value(0.15)).current;
  const wave3 = useRef(new Animated.Value(0.15)).current;
  const wave4 = useRef(new Animated.Value(0.15)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Single-session guard to prevent duplicate execution
  const lastProcessedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });
  const isExecutingRef = useRef(false);

  // Load speech engine capabilities on open
  useEffect(() => {
    if (!visible) return;
    let mounted = true;

    getSpeechRecognitionCapabilities('en-IN')
      .then((caps) => {
        if (mounted) {
          setCapabilities(caps);
          if (caps.permissionStatus === 'denied') {
            setStatusMessage(
              Platform.OS === 'ios'
                ? 'Microphone permission denied. Enable in iOS Settings > A Note.'
                : 'Microphone permission denied. Enable in App Settings.'
            );
            setFeedbackColor(THEME.colors.amber);
          }
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [visible]);

  // Reset waveform to calm resting baseline
  const resetWaveform = useCallback(() => {
    Animated.parallel([
      Animated.timing(wave1, { toValue: 0.15, duration: 140, useNativeDriver: true }),
      Animated.timing(wave2, { toValue: 0.15, duration: 140, useNativeDriver: true }),
      Animated.timing(wave3, { toValue: 0.15, duration: 140, useNativeDriver: true }),
      Animated.timing(wave4, { toValue: 0.15, duration: 140, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [wave1, wave2, wave3, wave4, pulseAnim]);

  // Update waveform bars responsively when speech volume changes
  const updateAudioWaveform = useCallback(
    (normalizedVolume: number) => {
      if (normalizedVolume <= 0.05) {
        Animated.parallel([
          Animated.timing(wave1, { toValue: 0.15, duration: 100, useNativeDriver: true }),
          Animated.timing(wave2, { toValue: 0.15, duration: 100, useNativeDriver: true }),
          Animated.timing(wave3, { toValue: 0.15, duration: 100, useNativeDriver: true }),
          Animated.timing(wave4, { toValue: 0.15, duration: 100, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        return;
      }

      const energy = Math.min(1, Math.max(0, (normalizedVolume - 0.05) / 0.95));
      const s1 = +(0.2 + energy * 0.75).toFixed(2);
      const s2 = +(0.25 + energy * 1.15).toFixed(2);
      const s3 = +(0.25 + energy * 0.95).toFixed(2);
      const s4 = +(0.2 + energy * 0.65).toFixed(2);
      const scale = +(1.0 + energy * 0.12).toFixed(2);

      Animated.parallel([
        Animated.timing(wave1, { toValue: s1, duration: 75, useNativeDriver: true }),
        Animated.timing(wave2, { toValue: s2, duration: 75, useNativeDriver: true }),
        Animated.timing(wave3, { toValue: s3, duration: 75, useNativeDriver: true }),
        Animated.timing(wave4, { toValue: s4, duration: 75, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: scale, duration: 75, useNativeDriver: true }),
      ]).start();
    },
    [wave1, wave2, wave3, wave4, pulseAnim]
  );

  const isListeningState =
    voiceState === 'listening' ||
    voiceState === 'speechDetected' ||
    voiceState === 'partialTranscript' ||
    voiceState === 'finalizing';

  const handleStopListening = useCallback(async () => {
    await stopSpeechRecognition();
    resetWaveform();
    setVoiceState((prev) => {
      if (
        prev === 'listening' ||
        prev === 'speechDetected' ||
        prev === 'partialTranscript' ||
        prev === 'finalizing'
      ) {
        return 'idle';
      }
      return prev;
    });
    setStatusMessage('Tap microphone to speak');
  }, [resetWaveform]);

  // Safe Android BackHandler
  const handleSafeBackOrClose = useCallback(async () => {
    await abortSpeechRecognition();
    resetWaveform();
    setVoiceState('idle');
    setParsedResult(null);
    onClose();
    return true;
  }, [resetWaveform, onClose]);

  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      handleSafeBackOrClose();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, handleSafeBackOrClose]);

  // Process final command through deterministic parser
  const handleProcessCommand = (commandText: string, confidence?: number) => {
    const clean = commandText.trim().toLowerCase();
    const now = Date.now();

    // Prevent duplicate rapid processing
    if (clean === lastProcessedRef.current.text && now - lastProcessedRef.current.time < 1800) {
      return;
    }
    lastProcessedRef.current = { text: clean, time: now };

    const result = parseVoiceCommand(commandText, clients, confidence);
    setParsedResult(result);

    // 1. Navigation query
    if (result.targetScreen) {
      setVoiceState('success');
      setStatusMessage(result.message);
      setFeedbackColor(THEME.colors.mint);
      setTimeout(() => {
        onNavigate(result.targetScreen!, result.matchedClient);
        handleSafeBackOrClose();
      }, 700);
      return;
    }

    // 2. Ambiguity / Clarification Required (e.g. bare "video 5" or multiple Rahuls)
    if (result.actionType === 'CLARIFICATION' || result.isAmbiguous) {
      setVoiceState('clarification');
      setStatusMessage(result.ambiguityPrompt || result.message);
      setFeedbackColor(THEME.colors.amber);
      return;
    }

    // 3. Client identification query ("Hardik") or progress query ("Show Hardik's progress")
    if (
      result.actionType === 'QUERY' ||
      result.actionType === 'CLIENT_PROGRESS' ||
      result.actionType === 'SELECT_VIDEO'
    ) {
      setVoiceState('success');
      if (result.actionType === 'QUERY' && result.matchedClient) {
        setStatusMessage(`Client "${result.matchedClient.name}" recognized (${result.matchedClient.calculations.completedVideos}/${result.matchedClient.calculations.totalVideos} done)`);
      } else {
        setStatusMessage(result.message);
      }
      setFeedbackColor(THEME.colors.purple);
      return;
    }

    // 4. Command Unrecognized
    if (!result.success) {
      setVoiceState('error');
      setStatusMessage(result.message);
      setFeedbackColor('#FF5E7E');
      return;
    }

    // 5. Already completed video
    if (result.alreadyCompleted) {
      setVoiceState('success');
      setStatusMessage(result.message);
      setFeedbackColor(THEME.colors.mint);
      onNotify(result.message);
      return;
    }

    // 6. Action requiring explicit confirmation (COMPLETE_VIDEO, ADD_CLIENT, or low confidence)
    if (result.pendingAction) {
      if (
        result.requiresConfirmation ||
        result.pendingAction.type === 'COMPLETE_VIDEO' ||
        result.pendingAction.type === 'ADD_CLIENT'
      ) {
        setVoiceState('confirmation');
        setStatusMessage('Please confirm the action below:');
        setFeedbackColor(THEME.colors.amber);
        return;
      }

      setVoiceState('success');
      setStatusMessage(result.message);
      setFeedbackColor(THEME.colors.mint);
      onExecutePendingAction(result.pendingAction);
      onNotify(result.message);
      return;
    }

    setVoiceState('success');
    setStatusMessage(result.message);
    setFeedbackColor(THEME.colors.mint);
  };

  const handleConfirmAction = () => {
    if (parsedResult?.pendingAction && !isExecutingRef.current) {
      isExecutingRef.current = true;
      onExecutePendingAction(parsedResult.pendingAction);
      onNotify(parsedResult.message);
      setVoiceState('success');
      setStatusMessage(`Completed: ${parsedResult.pendingAction.description}`);
      setFeedbackColor(THEME.colors.mint);
      setTimeout(() => {
        isExecutingRef.current = false;
        setParsedResult(null);
      }, 1000);
    }
  };

  const handleCancelAction = () => {
    setParsedResult(null);
    setVoiceState('idle');
    setStatusMessage('Action cancelled. Tap microphone to speak.');
    setFeedbackColor(THEME.colors.mint);
  };

  const handleStartListening = async () => {
    setInterimTranscript('');
    setFinalTranscript('');
    setParsedResult(null);
    setFeedbackColor(THEME.colors.mint);
    resetWaveform();

    if (isRunningInExpoGo()) {
      setVoiceState('listening');
      setStatusMessage('Expo Go detected: Speech recognition requires the standalone APK. Type a command below.');
      return;
    }

    const clientNames = clients.map((c) => c.name);

    setVoiceState('requestingPermission');
    setStatusMessage('Starting microphone...');

    const res = await startSpeechRecognition(
      {
        onStart: () => {
          setVoiceState('listening');
          setStatusMessage('Listening... Speak naturally.');
          setFeedbackColor(THEME.colors.mint);
          resetWaveform();
        },
        onSpeechStart: () => {
          setVoiceState('speechDetected');
          setStatusMessage('Listening... (speech detected)');
        },
        onVolumeChange: (normVol: number) => {
          updateAudioWaveform(normVol);
        },
        onTranscript: (transcript: string, isFinal: boolean, confidence?: number) => {
          if (!transcript) return;

          if (!isFinal) {
            setInterimTranscript(transcript);
            setVoiceState('partialTranscript');
          } else {
            setInterimTranscript('');
            setFinalTranscript(transcript);
            resetWaveform();
            setVoiceState('processing');
            setStatusMessage(`Processing: "${transcript}"`);

            setTimeout(() => {
              handleProcessCommand(transcript, confidence);
            }, 60);
          }
        },
        onError: (errMsg: string) => {
          resetWaveform();
          setVoiceState('error');
          setStatusMessage(errMsg);
          setFeedbackColor('#FF5E7E');
        },
        onEnd: () => {
          resetWaveform();
          setVoiceState((prev) => {
            if (
              prev === 'listening' ||
              prev === 'speechDetected' ||
              prev === 'partialTranscript' ||
              prev === 'finalizing'
            ) {
              return 'idle';
            }
            return prev;
          });
        },
      },
      {
        locale: 'en-IN',
        clientNames,
      }
    );

    if (!res.success) {
      setVoiceState('error');
      setStatusMessage(res.error || 'Could not start speech recognition.');
      setFeedbackColor('#FF5E7E');
    }
  };

  const handleSendTypedCommand = () => {
    const cmd = typedCommand.trim();
    if (!cmd) return;
    setTypedCommand('');
    setInterimTranscript('');
    setFinalTranscript(cmd);
    setVoiceState('processing');
    setStatusMessage(`Processing: "${cmd}"`);
    setTimeout(() => {
      handleProcessCommand(cmd);
    }, 100);
  };

  const handleSelectExampleChip = (chip: string) => {
    setTypedCommand('');
    setInterimTranscript('');
    setFinalTranscript(chip);
    setVoiceState('processing');
    setStatusMessage(`Processing: "${chip}"`);
    setTimeout(() => {
      handleProcessCommand(chip);
    }, 100);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleSafeBackOrClose}
    >
      <View style={[styles.rootContainer, { paddingTop: insets.top }]}>
        {/* Top Header with Glass Accent */}
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

          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerTitle}>Voice Assistant</Text>
            <View style={styles.engineBadgeRow}>
              <View
                style={[
                  styles.engineDot,
                  {
                    backgroundColor: capabilities?.available
                      ? THEME.colors.mint
                      : THEME.colors.amber,
                  },
                ]}
              />
              <Text style={styles.engineBadgeText}>
                {Platform.OS === 'ios'
                  ? isRunningInExpoGo()
                    ? 'Expo Go (Typed Mode)'
                    : capabilities?.available
                    ? `Apple Speech (${capabilities?.currentLocale || 'en-IN'})`
                    : 'Apple Speech (Unavailable)'
                  : capabilities?.isGoogleAvailable
                  ? 'Google Speech (en-IN)'
                  : capabilities?.available
                  ? 'Android Recognizer (en-IN)'
                  : isRunningInExpoGo()
                  ? 'Expo Go (Typed Mode)'
                  : 'Speech Unavailable'}
              </Text>
            </View>
          </View>

          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.contentAvoidView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Status Pill Badge */}
            <View style={styles.statusPillContainer}>
              <View style={[styles.statusPill, { borderColor: feedbackColor }]}>
                <Ionicons
                  name={
                    voiceState === 'listening' || voiceState === 'speechDetected'
                      ? 'mic'
                      : voiceState === 'success'
                      ? 'checkmark-circle'
                      : voiceState === 'error'
                      ? 'alert-circle'
                      : voiceState === 'clarification' || voiceState === 'confirmation'
                      ? 'help-circle'
                      : 'information-circle'
                  }
                  size={14}
                  color={feedbackColor}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.statusPillText, { color: feedbackColor }]}>
                  {statusMessage}
                </Text>
              </View>
            </View>

            {/* Glass Visualizer & Mic Section */}
            <GlassView
              style={styles.visualizerGlassCard}
              intensity={35}
              borderRadius={28}
              borderColor="rgba(255, 255, 255, 0.75)"
            >
              <View style={styles.visualizerInner}>
                {/* 4-bar Waveform */}
                <View style={styles.waveformContainer}>
                  {[wave1, wave2, wave3, wave4].map((anim, idx) => (
                    <Animated.View
                      key={idx}
                      style={[
                        styles.waveBar,
                        {
                          transform: [{ scaleY: anim }],
                          backgroundColor: isListeningState
                            ? idx % 2 === 0
                              ? THEME.colors.mint
                              : THEME.colors.purple
                            : THEME.colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>

                {/* Floating Microphone Button with Direct Manipulation */}
                <View style={styles.micButtonContainer}>
                  <PressableScale
                    onPress={isListeningState ? handleStopListening : handleStartListening}
                    activeScale={0.92}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isListeningState
                        ? 'Stop listening'
                        : 'Start voice recognition'
                    }
                  >
                    <Animated.View
                      style={[
                        styles.micButton,
                        {
                          transform: [{ scale: pulseAnim }],
                          backgroundColor: isListeningState
                            ? THEME.colors.mint
                            : THEME.colors.purple,
                          shadowColor: isListeningState
                            ? THEME.colors.mint
                            : THEME.colors.purple,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isListeningState ? 'square' : 'mic'}
                        size={32}
                        color="#FFFFFF"
                      />
                    </Animated.View>
                  </PressableScale>
                </View>

                <Text style={styles.micPrompt}>
                  {isListeningState ? 'Tap to finish speaking' : 'Tap to speak a command'}
                </Text>
              </View>
            </GlassView>

            {/* Transcript Surface (Interim vs Final distinction) */}
            {(finalTranscript !== '' || interimTranscript !== '') && (
              <GlassView
                style={styles.transcriptCard}
                intensity={40}
                borderRadius={20}
                borderColor="rgba(255, 255, 255, 0.85)"
              >
                <View style={styles.transcriptInner}>
                  <Text style={styles.transcriptLabel}>
                    {interimTranscript ? 'Hearing...' : 'Recognized:'}
                  </Text>
                  {finalTranscript ? (
                    <Text style={styles.finalTranscriptText}>"{finalTranscript}"</Text>
                  ) : null}
                  {interimTranscript ? (
                    <Text style={styles.interimTranscriptText}>"{interimTranscript}"</Text>
                  ) : null}
                </View>
              </GlassView>
            )}

            {/* Interpreted Action / Clarification / Confirmation Card */}
            {parsedResult && (
              <GlassView
                style={[
                  styles.intentCard,
                  parsedResult.actionType === 'CLARIFICATION'
                    ? styles.intentCardClarify
                    : parsedResult.requiresConfirmation
                    ? styles.intentCardConfirm
                    : styles.intentCardSuccess,
                ]}
                intensity={50}
                borderRadius={22}
                borderColor="rgba(255, 255, 255, 0.9)"
              >
                <View style={styles.intentInner}>
                  <View style={styles.intentHeaderRow}>
                    <Ionicons
                      name={
                        parsedResult.actionType === 'CLARIFICATION'
                          ? 'help-circle'
                          : parsedResult.requiresConfirmation
                          ? 'alert-circle'
                          : 'checkmark-circle'
                      }
                      size={20}
                      color={
                        parsedResult.actionType === 'CLARIFICATION'
                          ? THEME.colors.amber
                          : parsedResult.requiresConfirmation
                          ? THEME.colors.amber
                          : THEME.colors.mintDark
                      }
                    />
                    <Text style={styles.intentHeaderTitle}>
                      {parsedResult.actionType === 'CLARIFICATION'
                        ? 'Select Client'
                        : parsedResult.requiresConfirmation
                        ? parsedResult.pendingAction?.type === 'COMPLETE_VIDEO'
                          ? 'Confirm Video Completion'
                          : parsedResult.pendingAction?.type === 'ADD_CLIENT'
                          ? 'Confirm New Client'
                          : 'Please Confirm'
                        : parsedResult.actionType === 'CLIENT_PROGRESS'
                        ? `${parsedResult.interpretedIntent?.clientName || 'Client'}'s Progress`
                        : parsedResult.actionType === 'QUERY'
                        ? 'Client Overview'
                        : 'Action Details'}
                    </Text>
                  </View>

                  <Text style={styles.intentDescription}>
                    {parsedResult.requiresConfirmation &&
                    parsedResult.pendingAction?.type === 'COMPLETE_VIDEO'
                      ? `Mark Video #${parsedResult.interpretedIntent?.videoNumber ?? parsedResult.matchedVideoNumber} completed for ${parsedResult.interpretedIntent?.clientName ?? parsedResult.matchedClient?.name}?`
                      : parsedResult.interpretedIntent?.actionDescription || parsedResult.message}
                  </Text>

                  {/* Intent details pill row */}
                  {parsedResult.interpretedIntent && (
                    <View style={styles.intentPillRow}>
                      {parsedResult.interpretedIntent.clientName && (
                        <View style={styles.intentPill}>
                          <Text style={styles.intentPillLabel}>Client:</Text>
                          <Text style={styles.intentPillValue}>
                            {parsedResult.interpretedIntent.clientName}
                          </Text>
                        </View>
                      )}
                      {parsedResult.interpretedIntent.videoNumber !== undefined && (
                        <View style={styles.intentPill}>
                          <Text style={styles.intentPillLabel}>Video:</Text>
                          <Text style={styles.intentPillValue}>
                            #{parsedResult.interpretedIntent.videoNumber}
                          </Text>
                        </View>
                      )}
                      {parsedResult.interpretedIntent.targetStatus && (
                        <View style={styles.intentPill}>
                          <Text style={styles.intentPillLabel}>Status:</Text>
                          <Text style={[styles.intentPillValue, { color: THEME.colors.mintDark }]}>
                            {parsedResult.interpretedIntent.targetStatus}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Candidate chips if ambiguous */}
                  {parsedResult.isAmbiguous && (
                    <View style={styles.candidatesSection}>
                      <Text style={styles.candidatesPrompt}>Tap to select client:</Text>
                      <View style={styles.candidatesRow}>
                        {clients.map((c) => (
                          <PressableScale
                            key={c.id}
                            style={styles.candidateChip}
                            onPress={() => {
                              const vNum = parsedResult.matchedVideoNumber || 1;
                              handleProcessCommand(`${c.name}, video ${vNum} is done`);
                            }}
                            activeScale={0.94}
                          >
                            <Text style={styles.candidateChipText}>{c.name}</Text>
                          </PressableScale>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Explicit Confirmation Buttons */}
                  {parsedResult.requiresConfirmation && parsedResult.pendingAction && (
                    <View style={styles.confirmActionRow}>
                      <PressableScale
                        style={styles.confirmBtn}
                        containerStyle={styles.confirmBtnContainer}
                        onPress={handleConfirmAction}
                        activeScale={0.94}
                        accessibilityRole="button"
                        accessibilityLabel="Confirm Action"
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                        <Text style={styles.confirmBtnText}>Confirm</Text>
                      </PressableScale>

                      <PressableScale
                        style={styles.cancelBtn}
                        containerStyle={styles.confirmBtnContainer}
                        onPress={handleCancelAction}
                        activeScale={0.94}
                        accessibilityRole="button"
                        accessibilityLabel="Cancel Action"
                      >
                        <Ionicons name="close-circle-outline" size={16} color={THEME.colors.textNavy} />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </PressableScale>
                    </View>
                  )}
                </View>
              </GlassView>
            )}

            {/* Quick Example Chips */}
            <View style={styles.examplesSection}>
              <Text style={styles.examplesLabel}>TRY SAYING OR TYPING</Text>
              <View style={styles.chipsWrap}>
                {EXAMPLE_CHIPS.map((chip, idx) => (
                  <PressableScale
                    key={idx}
                    style={styles.exampleChip}
                    onPress={() => handleSelectExampleChip(chip)}
                    activeScale={0.95}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={13}
                      color={THEME.colors.purple}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.exampleChipText}>{chip}</Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Typed Fallback Bar */}
          <GlassView
            style={[styles.bottomInputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
            intensity={40}
            borderRadius={0}
            borderWidth={0}
            borderColor="transparent"
          >
            <View style={styles.inputInner}>
              <TextInput
                style={styles.textInput}
                placeholder="Or type a command (e.g. Hardik, video 5 is done)"
                placeholderTextColor={THEME.colors.textMuted}
                value={typedCommand}
                onChangeText={setTypedCommand}
                onSubmitEditing={handleSendTypedCommand}
                returnKeyType="send"
              />
              <PressableScale
                style={[
                  styles.sendButton,
                  !typedCommand.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSendTypedCommand}
                disabled={!typedCommand.trim()}
                activeScale={0.92}
                accessibilityRole="button"
                accessibilityLabel="Send typed command"
              >
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </PressableScale>
            </View>
          </GlassView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F0EBF8', // A Note signature lavender backdrop
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  engineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  engineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  engineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  contentAvoidView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  statusPillContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    width: '100%',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1.5,
    maxWidth: '100%',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center',
    lineHeight: 16,
  },
  visualizerGlassCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  visualizerInner: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    marginBottom: 20,
  },
  waveBar: {
    width: 8,
    height: 48,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  micButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  micPrompt: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  transcriptCard: {
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  transcriptInner: {
    padding: 16,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  finalTranscriptText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textNavy,
    lineHeight: 22,
  },
  interimTranscriptText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: THEME.colors.textMuted,
    lineHeight: 22,
  },
  intentCard: {
    marginBottom: 16,
  },
  intentCardSuccess: {
    backgroundColor: 'rgba(240, 253, 248, 0.92)',
  },
  intentCardClarify: {
    backgroundColor: 'rgba(255, 251, 240, 0.92)',
  },
  intentCardConfirm: {
    backgroundColor: 'rgba(255, 248, 240, 0.92)',
  },
  intentInner: {
    padding: 16,
  },
  intentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  intentHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    marginLeft: 6,
  },
  intentDescription: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  intentPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  intentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  intentPillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginRight: 4,
  },
  intentPillValue: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  candidatesSection: {
    marginTop: 8,
  },
  candidatesPrompt: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  candidatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  candidateChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: THEME.colors.purple,
  },
  candidateChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.purple,
  },
  confirmActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    alignItems: 'center',
  },
  confirmBtnContainer: {
    flex: 1,
  },
  confirmBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.mint,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0EBF8',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  examplesSection: {
    marginTop: 8,
  },
  examplesLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  exampleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  bottomInputBar: {
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 13,
    color: THEME.colors.textNavy,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    shadowColor: THEME.colors.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: THEME.colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});
