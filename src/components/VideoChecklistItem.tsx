import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoItem } from '../types';
import { THEME } from '../constants/theme';
import { formatCurrency } from '../utils/calculations';

interface VideoChecklistItemProps {
  video: VideoItem;
  ratePerVideo: number;
  onToggle?: (video: VideoItem) => void;
  onComplete?: (video: VideoItem) => void;
  onReopen?: (video: VideoItem) => void;
  onPressRow?: (video: VideoItem) => void;
}

export const VideoChecklistItem: React.FC<VideoChecklistItemProps> = ({
  video,
  ratePerVideo,
  onToggle,
  onComplete,
  onReopen,
  onPressRow,
}) => {
  const handleCheckboxPress = () => {
    if (video.isCompleted) {
      if (onReopen) {
        onReopen(video);
      } else if (onToggle) {
        onToggle(video);
      }
    } else {
      if (onComplete) {
        onComplete(video);
      } else if (onToggle) {
        onToggle(video);
      }
    }
  };

  return (
    <View style={[styles.itemContainer, video.isCompleted && styles.itemCompleted]}>
      {/* Tapping row body opens details/options — NEVER toggles completion */}
      <TouchableOpacity
        style={styles.leftGroup}
        onPress={() => onPressRow && onPressRow(video)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Video ${video.videoNumber} details`}
      >
        {/* Dedicated completion button */}
        <TouchableOpacity
          style={[
            styles.checkbox,
            video.isCompleted ? styles.checkboxChecked : styles.checkboxUnchecked,
          ]}
          onPress={handleCheckboxPress}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: video.isCompleted }}
          accessibilityLabel={
            video.isCompleted
              ? `Video ${video.videoNumber} completed. Tap to mark as pending.`
              : `Mark Video ${video.videoNumber} as completed.`
          }
        >
          {video.isCompleted && (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          )}
        </TouchableOpacity>

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
      </TouchableOpacity>

      <View style={styles.rightGroup}>
        {video.isCompleted ? (
          <TouchableOpacity
            style={styles.reopenButton}
            onPress={() => onReopen ? onReopen(video) : onToggle && onToggle(video)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.donePill}>
              <Text style={styles.donePillText}>DONE</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.completeActionBtn}
            onPress={() => onComplete ? onComplete(video) : onToggle && onToggle(video)}
            activeOpacity={0.75}
          >
            <Text style={styles.actionPrompt}>Mark Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    flex: 1,
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
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donePill: {
    backgroundColor: 'rgba(0, 210, 135, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  donePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.mint,
    letterSpacing: 0.5,
  },
  completeActionBtn: {
    backgroundColor: '#F7F3FC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E1F3',
  },
  actionPrompt: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.purple,
  },
  reopenButton: {
    padding: 2,
  },
});
