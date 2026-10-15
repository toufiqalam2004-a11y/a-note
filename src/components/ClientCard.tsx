import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClientWithVideos, VideoItem } from '../types';
import { THEME } from '../constants/theme';
import { formatCurrency } from '../utils/calculations';
import { VideoChecklistItem } from './VideoChecklistItem';

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
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
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
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.nameGroup}>
          <Text style={styles.clientName}>{client.name}</Text>
          <Text style={styles.rateSubtitle}>
            {formatCurrency(client.ratePerVideo)} / video
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleDeletePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.expandToggleBtn}
            onPress={() => setIsExpanded(!isExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandToggleText}>
              {isExpanded ? 'Hide Videos' : `Videos (${calculations.completedVideos}/${calculations.totalVideos})`}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={THEME.colors.mint}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
      </View>

      {/* Key Numbers Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Budget</Text>
          <Text style={styles.statValue}>{formatCurrency(client.totalBudget)}</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Videos</Text>
          <Text style={styles.statValue}>
            {calculations.totalVideos}{' '}
            <Text style={styles.statUnit}>videos</Text>
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={[styles.statValue, { color: THEME.colors.mint }]}>
            {calculations.completedVideos}
          </Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Remaining</Text>
          <Text style={styles.statValue}>{calculations.remainingVideos}</Text>
        </View>
      </View>

      {/* Financials & Unused Budget Row */}
      <View style={styles.financialRow}>
        <View style={styles.finPill}>
          <Text style={styles.finPillLabel}>Completed Value:</Text>
          <Text style={[styles.finPillVal, { color: THEME.colors.mint }]}>
            {formatCurrency(calculations.completedValue)}
          </Text>
        </View>

        <View style={styles.finPill}>
          <Text style={styles.finPillLabel}>Remaining Value:</Text>
          <Text style={styles.finPillVal}>
            {formatCurrency(calculations.remainingValue)}
          </Text>
        </View>

        {calculations.unusedBudget > 0 && (
          <View style={[styles.finPill, styles.unusedPill]}>
            <Text style={[styles.finPillLabel, { color: THEME.colors.amber }]}>
              Unused Budget:
            </Text>
            <Text style={[styles.finPillVal, { color: THEME.colors.amber }]}>
              {formatCurrency(calculations.unusedBudget)}
            </Text>
          </View>
        )}
      </View>

      {/* Expandable Video Checklist */}
      {isExpanded && (
        <View style={styles.checklistSection}>
          <View style={styles.checklistDivider} />
          <View style={styles.checklistHeader}>
            <Text style={styles.checklistTitle}>Video Delivery Checklist</Text>
            <Text style={styles.checklistHint}>
              Tap to mark done or say: &ldquo;{client.name}, video 1 done&rdquo;
            </Text>
          </View>

          {videos.length === 0 ? (
            <Text style={styles.emptyVideosText}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.sm,
  },
  nameGroup: {
    flex: 1,
  },
  clientName: {
    fontSize: THEME.typography.sizes.lg,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  rateSubtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.mintBorder,
    gap: 4,
  },
  expandToggleText: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.mint,
  },
  progressContainer: {
    height: 4,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 2,
    marginVertical: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: THEME.colors.mint,
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    padding: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
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
    marginBottom: 3,
  },
  statValue: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  statUnit: {
    fontSize: 10,
    fontWeight: '400',
    color: THEME.colors.textSecondary,
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
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  unusedPill: {
    backgroundColor: THEME.colors.amberGlow,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  finPillLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  finPillVal: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  checklistSection: {
    marginTop: THEME.spacing.md,
  },
  checklistDivider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginBottom: THEME.spacing.sm,
  },
  checklistHeader: {
    marginBottom: 8,
  },
  checklistTitle: {
    fontSize: THEME.typography.sizes.sm,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  checklistHint: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  emptyVideosText: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
