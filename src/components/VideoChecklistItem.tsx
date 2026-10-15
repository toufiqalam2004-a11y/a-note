import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoItem } from '../types';
import { THEME } from '../constants/theme';
import { formatCurrency } from '../utils/calculations';

interface VideoChecklistItemProps {
  video: VideoItem;
  ratePerVideo: number;
  onToggle: (video: VideoItem) => void;
}

export const VideoChecklistItem: React.FC<VideoChecklistItemProps> = ({
  video,
  ratePerVideo,
  onToggle,
}) => {
  return (
    <TouchableOpacity
      style={[styles.itemContainer, video.isCompleted && styles.itemCompleted]}
      onPress={() => onToggle(video)}
      activeOpacity={0.7}
    >
      <View style={styles.leftGroup}>
        {/* Checkbox button */}
        <View
          style={[
            styles.checkbox,
            video.isCompleted ? styles.checkboxChecked : styles.checkboxUnchecked,
          ]}
        >
          {video.isCompleted && (
            <Ionicons name="checkmark" size={14} color="#0B0C0E" />
          )}
        </View>

        <View style={styles.textGroup}>
          <Text
            style={[
              styles.videoTitle,
              video.isCompleted && styles.videoTitleCompleted,
            ]}
          >
            Video {video.videoNumber}
          </Text>
          <Text style={styles.rateSubtitle}>
            {video.isCompleted ? 'Completed' : `Pending • ${formatCurrency(ratePerVideo)}`}
          </Text>
        </View>
      </View>

      <View style={styles.rightGroup}>
        {video.isCompleted ? (
          <View style={styles.donePill}>
            <Text style={styles.donePillText}>DONE</Text>
          </View>
        ) : (
          <Text style={styles.actionPrompt}>Tap to complete</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: THEME.colors.surfaceSubtle,
    borderRadius: THEME.radius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  itemCompleted: {
    backgroundColor: 'rgba(5, 214, 158, 0.04)',
    borderColor: 'rgba(5, 214, 158, 0.2)',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    borderColor: THEME.colors.textMuted,
    backgroundColor: THEME.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: THEME.colors.mint,
  },
  textGroup: {
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: THEME.typography.sizes.base,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  videoTitleCompleted: {
    color: THEME.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  rateSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  rightGroup: {
    alignItems: 'flex-end',
  },
  donePill: {
    backgroundColor: THEME.colors.mintGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  donePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.mint,
    letterSpacing: 0.5,
  },
  actionPrompt: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
});
