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
      activeOpacity={0.75}
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
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  itemCompleted: {
    backgroundColor: '#F9FBFB',
    borderColor: 'rgba(0, 210, 135, 0.25)',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    borderColor: '#D4C9E6',
    backgroundColor: '#F7F3FC',
  },
  checkboxChecked: {
    backgroundColor: THEME.colors.mint,
  },
  textGroup: {
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  videoTitleCompleted: {
    color: THEME.colors.textMuted,
  },
  rateSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  rightGroup: {
    alignItems: 'flex-end',
  },
  donePill: {
    backgroundColor: THEME.colors.mintLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  donePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.mint,
    letterSpacing: 0.5,
  },
  actionPrompt: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
});
