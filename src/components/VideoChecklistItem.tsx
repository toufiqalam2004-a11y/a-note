import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoItem } from '../types';
import { THEME } from '../constants/theme';
import { formatCurrency } from '../utils/calculations';
import { PressableScale } from './PressableScale';
import { SPRING_PRESETS } from '../utils/motion';

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
  const checkScale = useRef(new Animated.Value(1)).current;
  const isCompletedRef = useRef(video.isCompleted);

  // Trigger Apple-inspired spring bounce when completion genuinely transitions
  useEffect(() => {
    if (video.isCompleted && !isCompletedRef.current) {
      checkScale.setValue(0.75);
      Animated.spring(checkScale, {
        toValue: 1,
        ...SPRING_PRESETS.bouncy,
      }).start();
    }
    isCompletedRef.current = video.isCompleted;
  }, [video.isCompleted, checkScale]);

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
      {/* Tapping row body opens details/options with subtle scale — NEVER toggles completion */}
      <PressableScale
        style={styles.leftGroup}
        onPress={() => onPressRow && onPressRow(video)}
        activeScale={0.985}
        accessibilityRole="button"
        accessibilityLabel={`Video ${video.videoNumber} details`}
      >
        {/* Dedicated completion button with immediate tactile spring */}
        <PressableScale
          style={[
            styles.checkbox,
            video.isCompleted ? styles.checkboxChecked : styles.checkboxUnchecked,
          ]}
          onPress={handleCheckboxPress}
          activeScale={0.86}
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
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </Animated.View>
          )}
        </PressableScale>

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
            {video.videoType ? `${video.videoType} • ` : ''}
            {video.isCompleted ? 'Completed' : `Pending • ${formatCurrency(ratePerVideo)}`}
          </Text>
        </View>
      </PressableScale>

      <View style={styles.rightGroup}>
        {video.isCompleted ? (
          <PressableScale
            style={styles.reopenButton}
            onPress={() => (onReopen ? onReopen(video) : onToggle && onToggle(video))}
            activeScale={0.92}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Video ${video.videoNumber} completed, tap to reopen`}
          >
            <View style={styles.donePill}>
              <Text style={styles.donePillText}>DONE</Text>
            </View>
          </PressableScale>
        ) : (
          <PressableScale
            style={styles.completeActionBtn}
            onPress={() => (onComplete ? onComplete(video) : onToggle && onToggle(video))}
            activeScale={0.94}
            accessibilityRole="button"
            accessibilityLabel={`Mark Video ${video.videoNumber} complete`}
          >
            <Text style={styles.actionPrompt}>Mark Complete</Text>
          </PressableScale>
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
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxUnchecked: {
    borderColor: THEME.colors.border,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: THEME.colors.mint,
    backgroundColor: THEME.colors.mint,
  },
  textGroup: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  videoTitleCompleted: {
    color: THEME.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  rateSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  rightGroup: {
    marginLeft: 8,
  },
  completeActionBtn: {
    backgroundColor: THEME.colors.mintLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 135, 0.3)',
  },
  actionPrompt: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.mintDark,
  },
  reopenButton: {
    padding: 2,
  },
  donePill: {
    backgroundColor: 'rgba(0, 210, 135, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 135, 0.35)',
  },
  donePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.mintDark,
    letterSpacing: 0.5,
  },
});
