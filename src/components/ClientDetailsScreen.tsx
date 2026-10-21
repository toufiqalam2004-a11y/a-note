import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ClientWithVideos, VideoItem } from '../types';
import { THEME } from '../constants/theme';
import { formatCurrency, formatDate, formatTime } from '../utils/calculations';
import { ClientHistoryExportModal } from './ClientHistoryExportModal';
import { getDeterministicVideoType } from '../constants/videoTypes';

interface ClientDetailsScreenProps {
  client: ClientWithVideos;
  onBack: () => void;
  onToggleVideo?: (video: VideoItem, client: ClientWithVideos) => void;
  onCompleteVideo?: (video: VideoItem, client: ClientWithVideos) => void;
  onReopenVideo?: (video: VideoItem, client: ClientWithVideos) => void;
  onOpenVoice: () => void;
  onDeleteClient: (clientId: string) => void;
  onEditClient?: (client: ClientWithVideos) => void;
  onUpdateVideoType?: (videoId: string, videoType: string) => void;
}

export const ClientDetailsScreen: React.FC<ClientDetailsScreenProps> = ({
  client,
  onBack,
  onToggleVideo,
  onCompleteVideo,
  onReopenVideo,
  onOpenVoice,
  onDeleteClient,
  onEditClient,
  onUpdateVideoType,
}) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'videos' | 'history' | 'reports'>('videos');
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [selectedVideoForDetails, setSelectedVideoForDetails] = useState<VideoItem | null>(null);
  const { calculations, videos } = client;

  // Hardware Back Button handler for Client Details Screen
  useEffect(() => {
    const handleHardwareBack = () => {
      if (selectedVideoForDetails) {
        setSelectedVideoForDetails(null);
        return true;
      }
      if (isExportModalVisible) {
        setIsExportModalVisible(false);
        return true;
      }
      onBack();
      return true;
    };
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack
    );
    return () => subscription.remove();
  }, [selectedVideoForDetails, isExportModalVisible, onBack]);

  const handleManualComplete = (vid: VideoItem) => {
    if (vid.isCompleted) return;
    if (onCompleteVideo) {
      onCompleteVideo(vid, client);
    } else if (onToggleVideo) {
      onToggleVideo(vid, client);
    }
  };

  const handleManualReopen = (vid: VideoItem) => {
    Alert.alert(
      `Reopen Video ${vid.videoNumber}?`,
      `Are you sure you want to change Video ${vid.videoNumber} back to pending? This will deduct ${formatCurrency(client.ratePerVideo)} from earned revenue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen Video',
          style: 'destructive',
          onPress: () => {
            if (onReopenVideo) {
              onReopenVideo(vid, client);
            } else if (onToggleVideo) {
              onToggleVideo(vid, client);
            }
          },
        },
      ]
    );
  };

  const handleVideoOptions = (vid: VideoItem) => {
    setSelectedVideoForDetails(vid);
  };

  const progressPercent =
    calculations.totalVideos > 0
      ? Math.round((calculations.completedVideos / calculations.totalVideos) * 100)
      : 0;

  const initial = (client.name || 'C').charAt(0).toUpperCase();

  const handleOptionsPress = () => {
    Alert.alert(
      client.name,
      `Rate: ${formatCurrency(client.ratePerVideo)}/video\nBudget: ${formatCurrency(client.totalBudget)}`,
      [
        {
          text: 'Export PDF / Excel Report',
          onPress: () => setIsExportModalVisible(true),
        },
        {
          text: 'Delete Client',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete Client',
              `Are you sure you want to delete ${client.name}? All progress records will be removed.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    onDeleteClient(client.id);
                    onBack();
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header Row matching Screen 2 in reference */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconButton} onPress={onBack} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={20} color={THEME.colors.textNavy} />
        </TouchableOpacity>

        <View style={styles.clientProfileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.clientNameGroup}>
            <Text style={styles.headerClientName}>{client.name}</Text>
            <Text style={styles.headerSubtitle}>Client Details</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editPillBtn}
            onPress={() => onEditClient ? onEditClient(client) : setIsExportModalVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="pencil-outline" size={13} color={THEME.colors.textNavy} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButtonSmall}
            onPress={handleOptionsPress}
            activeOpacity={0.75}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={THEME.colors.textNavy} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 3 Summary Cards Row (Rate, Payment, Unused) */}
        <View style={styles.summaryRow}>
          {/* Card 1: Per Video Rate */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconCircleAmber}>
              <Ionicons name="cash-outline" size={16} color={THEME.colors.amber} />
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(client.ratePerVideo)}</Text>
            <Text style={styles.summaryLabel}>Per Video Rate</Text>
          </View>

          {/* Card 2: Payment Received */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconCirclePurple}>
              <Ionicons name="wallet-outline" size={16} color={THEME.colors.purple} />
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(client.totalBudget)}</Text>
            <Text style={styles.summaryLabel}>Payment Received</Text>
          </View>

          {/* Card 3: Unused Balance */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconCirclePurple}>
              <Ionicons name="pie-chart-outline" size={16} color={THEME.colors.purple} />
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(calculations.unusedBudget)}</Text>
            <Text style={styles.summaryLabel}>Unused Balance</Text>
          </View>
        </View>

        {/* Video Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardHeader}>
            <Text style={styles.progressCardTitle}>Video Progress</Text>
            <View style={styles.progressRightGroup}>
              <Text style={styles.progressCount}>
                {calculations.completedVideos} / {calculations.totalVideos}
              </Text>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>
          </View>

          {/* Mint Progress Track */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          {/* Bottom Financial Reconciliation */}
          <View style={styles.progressFooterRow}>
            <Text style={styles.earnedText}>
              {formatCurrency(calculations.completedValue)} earned
            </Text>
            <Text style={styles.pendingText}>
              {formatCurrency(calculations.remainingValue)} pending
            </Text>
          </View>
        </View>

        {/* Navigation Tabs (Videos, History, Reports) */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'videos' && styles.tabPillActiveMint]}
            onPress={() => setActiveTab('videos')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="videocam-outline"
              size={15}
              color={activeTab === 'videos' ? THEME.colors.mint : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.tabPillText,
                activeTab === 'videos' && styles.tabPillTextActiveMint,
              ]}
            >
              Videos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'history' && styles.tabPillActivePurple]}
            onPress={() => {
              setActiveTab('history');
              setIsExportModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={activeTab === 'history' ? THEME.colors.purple : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.tabPillText,
                activeTab === 'history' && styles.tabPillTextActivePurple,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'reports' && styles.tabPillActivePurple]}
            onPress={() => {
              setActiveTab('reports');
              setIsExportModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="document-text-outline"
              size={15}
              color={activeTab === 'reports' ? THEME.colors.purple : THEME.colors.textMuted}
            />
            <Text
              style={[
                styles.tabPillText,
                activeTab === 'reports' && styles.tabPillTextActivePurple,
              ]}
            >
              Reports
            </Text>
          </TouchableOpacity>
        </View>

        {/* Video Checklist Items (Matching Screen 2) */}
        <View style={styles.videoListContainer}>
          {videos.length === 0 ? (
            <View style={styles.emptyVideosCard}>
              <Text style={styles.emptyTitle}>No Videos Generated</Text>
              <Text style={styles.emptySubtitle}>
                Total budget is less than the per-video rate.
              </Text>
            </View>
          ) : (
            videos.map((vid) => {
              const isCompleted = vid.isCompleted;
              const videoSubtitle = getDeterministicVideoType(
                vid.videoNumber,
                client.videoTypes,
                vid.videoType || (vid.title && vid.title !== `Video ${vid.videoNumber}` ? vid.title : null),
                client.videoTypes && client.videoTypes.length > 0 ? '' : 'No type selected'
              );
              const dateDisplay = vid.completedAt
                ? formatDate(vid.completedAt)
                : '16 Oct 2026';

              return (
                <View
                  key={vid.id}
                  style={[styles.videoCard, isCompleted && styles.videoCardCompleted]}
                >
                  {/* Left: Number circle (Green check for completed, Purple for pending) */}
                  {/* Left: Number circle - opens details, NEVER toggles completion */}
                  <TouchableOpacity
                    style={[
                      styles.numberCircle,
                      isCompleted ? styles.numberCircleDone : styles.numberCirclePending,
                    ]}
                    onPress={() => handleVideoOptions(vid)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Video ${vid.videoNumber} ${
                      isCompleted ? 'Completed' : 'Pending'
                    } details`}
                  >
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                    ) : (
                      <Text style={styles.numberTextPending}>{vid.videoNumber}</Text>
                    )}
                  </TouchableOpacity>

                  {/* Middle: Video title & sub-title - opens details, NEVER toggles completion */}
                  <TouchableOpacity
                    style={styles.videoInfoCol}
                    onPress={() => handleVideoOptions(vid)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.videoTitle,
                        isCompleted && styles.videoTitleCompleted,
                      ]}
                    >
                      Video {vid.videoNumber}
                    </Text>
                    <Text style={styles.videoSubtitle}>{videoSubtitle}</Text>
                  </TouchableOpacity>

                  {/* Right: Dedicated status button and isolated dots */}
                  <View style={styles.videoActionCol}>
                    {isCompleted ? (
                      <View style={styles.doneStatusGroup}>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={THEME.colors.mint}
                        />
                        <Text style={styles.videoDateText}>{dateDisplay}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.pendingCheckButton}
                        onPress={() => handleManualComplete(vid)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Mark Video ${vid.videoNumber} as completed`}
                      >
                        <View style={styles.pendingCheckboxRing} />
                        <Text style={styles.pendingPillText}>Pending</Text>
                      </TouchableOpacity>
                    )}

                    {/* Isolated overflow menu for video options */}
                    <TouchableOpacity
                      style={styles.moreDotsBtn}
                      onPress={() => handleVideoOptions(vid)}
                      hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Options for Video ${vid.videoNumber}`}
                    >
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={16}
                        color={THEME.colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: Math.max(insets.bottom, 16) + 72 }} />
      </ScrollView>

      {/* Floating Bottom Button: "Mark Video with Voice" */}
      <View style={[styles.bottomBarContainer, { bottom: Math.max(insets.bottom, 16) + 8 }]}>
        <TouchableOpacity
          style={styles.voiceFloatingBtn}
          onPress={onOpenVoice}
          activeOpacity={0.85}
        >
          <View style={styles.voiceBtnCircleIcon}>
            <Ionicons name="mic" size={18} color={THEME.colors.purple} />
          </View>

          <Text style={styles.voiceBtnText}>Mark Video with Voice</Text>

          <View style={styles.voiceBtnCircleIcon}>
            <Ionicons name="arrow-forward" size={16} color={THEME.colors.purple} />
          </View>
        </TouchableOpacity>
      </View>

      {/* History & Reports Modal */}
      <ClientHistoryExportModal
        visible={isExportModalVisible}
        client={client}
        onClose={() => setIsExportModalVisible(false)}
        onToggleVideo={onToggleVideo}
      />

      {/* Video Details & Interaction Modal */}
      {selectedVideoForDetails && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedVideoForDetails(null)}
        >
          <View style={styles.videoDetailsOverlay}>
            <View style={styles.videoDetailsCard}>
              <View style={styles.videoDetailsHeader}>
                <View>
                  <Text style={styles.videoDetailsTitle}>
                    Video #{selectedVideoForDetails.videoNumber}
                  </Text>
                  <Text style={styles.videoDetailsSub}>{client.name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.videoDetailsCloseBtn}
                  onPress={() => setSelectedVideoForDetails(null)}
                >
                  <Ionicons name="close" size={20} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.videoDetailsMetaGrid}>
                <View style={styles.videoMetaItem}>
                  <Text style={styles.videoMetaLabel}>Status</Text>
                  <View
                    style={[
                      styles.videoStatusPill,
                      selectedVideoForDetails.isCompleted
                        ? styles.videoStatusPillDone
                        : styles.videoStatusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.videoStatusPillText,
                        selectedVideoForDetails.isCompleted
                          ? { color: THEME.colors.mint }
                          : { color: THEME.colors.purple },
                      ]}
                    >
                      {selectedVideoForDetails.isCompleted ? 'COMPLETED' : 'PENDING'}
                    </Text>
                  </View>
                </View>

                <View style={styles.videoMetaItem}>
                  <Text style={styles.videoMetaLabel}>Agreed Rate</Text>
                  <Text style={styles.videoMetaVal}>
                    {formatCurrency(client.ratePerVideo)}
                  </Text>
                </View>

                <View style={styles.videoMetaItem}>
                  <Text style={styles.videoMetaLabel}>Video Type</Text>
                  <Text style={[styles.videoMetaVal, { color: THEME.colors.purple }]}>
                    {getDeterministicVideoType(
                      selectedVideoForDetails.videoNumber,
                      client.videoTypes,
                      selectedVideoForDetails.videoType || (selectedVideoForDetails.title && selectedVideoForDetails.title !== `Video ${selectedVideoForDetails.videoNumber}` ? selectedVideoForDetails.title : null),
                      'No type selected'
                    )}
                  </Text>
                </View>
              </View>

              {/* Per-Video Type Override Selector if client has selected types */}
              {client.videoTypes && client.videoTypes.length > 0 && (
                <View style={{ marginTop: 14, marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: THEME.colors.textMuted, marginBottom: 8 }}>
                    ASSIGN SPECIFIC TYPE:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {client.videoTypes.map((t) => {
                      const currentType = getDeterministicVideoType(
                        selectedVideoForDetails.videoNumber,
                        client.videoTypes,
                        selectedVideoForDetails.videoType,
                        ''
                      );
                      const isCurrent = currentType === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 14,
                            backgroundColor: isCurrent ? '#E8FBF2' : '#F5F0FB',
                            borderWidth: 1.2,
                            borderColor: isCurrent ? THEME.colors.mint : '#EAE4F5',
                          }}
                          onPress={() => {
                            setSelectedVideoForDetails({
                              ...selectedVideoForDetails,
                              videoType: t,
                            });
                            if (onUpdateVideoType) {
                              onUpdateVideoType(selectedVideoForDetails.id, t);
                            }
                          }}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isCurrent ? '800' : '600',
                              color: isCurrent ? THEME.colors.textNavy : THEME.colors.textMuted,
                            }}
                          >
                            {isCurrent ? '✓ ' : ''}{t}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {selectedVideoForDetails.completedAt && (
                <View style={styles.videoCompletedDateBox}>
                  <Ionicons name="time-outline" size={14} color={THEME.colors.mint} />
                  <Text style={styles.videoCompletedDateText}>
                    Completed: {formatDate(selectedVideoForDetails.completedAt)} at{' '}
                    {formatTime(selectedVideoForDetails.completedAt)}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.videoDetailsActions}>
                {selectedVideoForDetails.isCompleted ? (
                  <TouchableOpacity
                    style={styles.reopenActionBtn}
                    onPress={() => {
                      const vidToReopen = selectedVideoForDetails;
                      setSelectedVideoForDetails(null);
                      handleManualReopen(vidToReopen);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={16} color="#FF5E7E" />
                    <Text style={styles.reopenActionText}>Mark as Pending</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.completeActionMainBtn}
                    onPress={() => {
                      const vidToComplete = selectedVideoForDetails;
                      setSelectedVideoForDetails(null);
                      handleManualComplete(vidToComplete);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.completeActionMainText}>Mark as Completed</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.sm,
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
  clientProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginLeft: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: THEME.colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  clientNameGroup: {
    justifyContent: 'center',
  },
  headerClientName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  iconButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryIconCircleAmber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryIconCirclePurple: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.3,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  progressCard: {
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
  progressCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  progressRightGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  progressCount: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  progressTrack: {
    height: 9,
    backgroundColor: '#EAE4F5',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.mint,
    borderRadius: 5,
  },
  progressFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earnedText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabPillActiveMint: {
    backgroundColor: THEME.colors.mintLight,
    borderColor: THEME.colors.mintBorder,
  },
  tabPillActivePurple: {
    backgroundColor: THEME.colors.purpleLight,
    borderColor: THEME.colors.purpleBorder,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabPillTextActiveMint: {
    color: THEME.colors.mint,
    fontWeight: '700',
  },
  tabPillTextActivePurple: {
    color: THEME.colors.purple,
    fontWeight: '700',
  },
  videoListContainer: {
    gap: 10,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  numberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberCircleDone: {
    backgroundColor: THEME.colors.mint,
  },
  numberCirclePending: {
    backgroundColor: THEME.colors.purple,
  },
  numberText: {
    fontSize: 14,
    fontWeight: '800',
  },
  numberTextDone: {
    color: '#FFFFFF',
  },
  numberTextPending: {
    color: '#FFFFFF',
  },
  videoInfoCol: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  videoSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  videoActionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doneStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textNavy,
  },
  pendingCheckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE8FD',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#D4C9E6',
  },
  pendingCheckboxRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: THEME.colors.purple,
    backgroundColor: '#FFFFFF',
  },
  pendingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.purple,
  },
  videoCardCompleted: {
    backgroundColor: '#FAFCFB',
    borderColor: 'rgba(0, 210, 135, 0.25)',
  },
  videoTitleCompleted: {
    color: THEME.colors.textNavy,
  },
  moreDotsBtn: {
    padding: 6,
  },
  emptyVideosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: THEME.spacing.lg,
    right: THEME.spacing.lg,
  },
  voiceFloatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.purple,
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: THEME.colors.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  voiceBtnCircleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  videoDetailsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 40, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  videoDetailsCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  videoDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBF8',
    paddingBottom: 12,
  },
  videoDetailsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  videoDetailsSub: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  videoDetailsCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7F3FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDetailsMetaGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  videoMetaItem: {
    flex: 1,
    backgroundColor: '#F9F7FD',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ECE5F7',
  },
  videoMetaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  videoMetaVal: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  videoStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  videoStatusPillDone: {
    backgroundColor: 'rgba(0, 210, 135, 0.15)',
  },
  videoStatusPillPending: {
    backgroundColor: 'rgba(124, 92, 252, 0.15)',
  },
  videoStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoCompletedDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBFBF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  videoCompletedDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.mint,
  },
  videoDetailsActions: {
    marginTop: 4,
  },
  completeActionMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.mint,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  completeActionMainText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reopenActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F3',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFD6DF',
  },
  reopenActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5E7E',
  },
});
