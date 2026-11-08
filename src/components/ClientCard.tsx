import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClientWithVideos, VideoItem } from '../types';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils/calculations';
import { VideoChecklistItem } from './VideoChecklistItem';
import { ClientHistoryExportModal } from './ClientHistoryExportModal';
import { PressableScale } from './PressableScale';

interface ClientCardProps {
  client: ClientWithVideos;
  onToggleVideo: (video: VideoItem, client: ClientWithVideos) => void;
  onDeleteClient: (clientId: string) => void;
  defaultExpanded?: boolean;
}

export const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onToggleVideo,
  onDeleteClient,
  defaultExpanded = false,
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const { calculations, videos } = client;

  const progressPercent =
    calculations.totalVideos > 0
      ? Math.round((calculations.completedVideos / calculations.totalVideos) * 100)
      : 0;

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client.name}? All video progress will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteClient(client.id),
        },
      ]
    );
  };

  return (
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
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.nameGroup}>
          <Text style={[styles.clientName, { color: theme.colors.textPrimary }]}>{client.name}</Text>
          <Text style={[styles.rateSubtitle, { color: theme.colors.textMuted }]}>
            {formatCurrency(client.ratePerVideo)} / video
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <PressableScale
            style={styles.iconBtn}
            onPress={handleDeletePress}
            activeScale={0.88}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${client.name}`}
          >
            <Ionicons name="trash-outline" size={16} color={theme.colors.textMuted} />
          </PressableScale>

          <PressableScale
            style={styles.expandToggleBtn}
            onPress={() => setIsExpanded(!isExpanded)}
            activeScale={0.94}
            accessibilityRole="button"
            accessibilityLabel={isExpanded ? 'Hide Videos' : 'Show Videos'}
          >
            <Text style={[styles.expandToggleText, { color: theme.colors.mintDark }]}>
              {isExpanded ? 'Hide Videos' : `Videos (${calculations.completedVideos}/${calculations.totalVideos})`}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={theme.colors.mint}
            />
          </PressableScale>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: theme.colors.backgroundSubtle }]}>
        <View style={[styles.progressBar, { width: `${progressPercent}%`, backgroundColor: theme.colors.mint }]} />
      </View>

      {/* Key Numbers Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: theme.colors.backgroundSubtle }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Total Budget</Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{formatCurrency(client.totalBudget)}</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.colors.backgroundSubtle }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Total Videos</Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {calculations.totalVideos}{' '}
            <Text style={[styles.statUnit, { color: theme.colors.textMuted }]}>videos</Text>
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.colors.backgroundSubtle }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Completed</Text>
          <Text style={[styles.statValue, { color: theme.colors.mint }]}>
            {calculations.completedVideos}
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.colors.backgroundSubtle }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>Remaining</Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{calculations.remainingVideos}</Text>
        </View>
      </View>

      {/* Financials & Unused Budget Row */}
      <View style={styles.financialRow}>
        <View style={styles.finPill}>
          <Text style={[styles.finPillLabel, { color: theme.colors.textMuted }]}>Completed Value:</Text>
          <Text style={[styles.finPillVal, { color: theme.colors.mint }]}>
            {formatCurrency(calculations.completedValue)}
          </Text>
        </View>

        <View style={styles.finPill}>
          <Text style={[styles.finPillLabel, { color: theme.colors.textMuted }]}>Remaining Value:</Text>
          <Text style={[styles.finPillVal, { color: theme.colors.textPrimary }]}>
            {formatCurrency(calculations.remainingValue)}
          </Text>
        </View>

        {calculations.unusedBudget > 0 && (
          <View style={[styles.finPill, styles.unusedPill, { backgroundColor: theme.colors.amberLight }]}>
            <Text style={[styles.finPillLabel, { color: theme.colors.amber }]}>
              Unused Budget:
            </Text>
            <Text style={[styles.finPillVal, { color: theme.colors.amber }]}>
              {formatCurrency(calculations.unusedBudget)}
            </Text>
          </View>
        )}
      </View>

      {/* History & Export Action Button */}
      <View style={styles.cardActionsRow}>
        <PressableScale
          style={[styles.historyExportBtn, { backgroundColor: theme.colors.mintLight }]}
          onPress={() => setIsHistoryModalVisible(true)}
          activeScale={0.96}
          accessibilityRole="button"
          accessibilityLabel={`History and reports for ${client.name}`}
        >
          <Ionicons name="document-text-outline" size={14} color={theme.colors.mintDark} />
          <Text style={[styles.historyExportBtnText, { color: theme.colors.mintDark }]}>History & Reports (PDF / XLSX)</Text>
        </PressableScale>
      </View>

      {/* Expandable Video Checklist */}
      {isExpanded && (
        <View style={styles.checklistSection}>
          <View style={[styles.checklistDivider, { backgroundColor: theme.colors.borderSubtle }]} />
          <View style={styles.checklistHeader}>
            <Text style={[styles.checklistTitle, { color: theme.colors.textPrimary }]}>Video Delivery Checklist</Text>
            <Text style={[styles.checklistHint, { color: theme.colors.textMuted }]}>
              Tap to mark done or say: &ldquo;{client.name}, video 1 done&rdquo;
            </Text>
          </View>

          {videos.length === 0 ? (
            <Text style={[styles.emptyVideosText, { color: theme.colors.textMuted }]}>
              No videos generated. Budget is less than per-video rate.
            </Text>
          ) : (
            videos.map((vid) => (
              <VideoChecklistItem
                key={vid.id}
                video={vid}
                ratePerVideo={client.ratePerVideo}
                onToggle={(v) => onToggleVideo(v, client)}
              />
            ))
          )}
        </View>
      )}

      {/* Client History & PDF/Excel Export Modal */}
      <ClientHistoryExportModal
        visible={isHistoryModalVisible}
        client={client}
        onClose={() => setIsHistoryModalVisible(false)}
        onToggleVideo={onToggleVideo}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  nameGroup: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.2,
  },
  rateSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F0FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.mintLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    gap: 4,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.mint,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#EAE4F5',
    borderRadius: 3,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: THEME.colors.mint,
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9F6FE',
    borderRadius: 18,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#EAE4F5',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '700',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  statUnit: {
    fontSize: 10,
    fontWeight: '500',
    color: THEME.colors.textMuted,
  },
  financialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  finPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F0FB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  unusedPill: {
    backgroundColor: THEME.colors.amberLight,
  },
  finPillLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  finPillVal: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  checklistSection: {
    marginTop: 14,
  },
  checklistDivider: {
    height: 1,
    backgroundColor: '#F2EDFA',
    marginBottom: 10,
  },
  checklistHeader: {
    marginBottom: 8,
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  checklistHint: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  emptyVideosText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  cardActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  historyExportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EDE8FD',
    borderRadius: 9999,
    paddingVertical: 10,
  },
  historyExportBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.purple,
  },
});
