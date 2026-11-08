import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface OverallProgressCardProps {
  completedVideos: number;
  totalVideos: number;
}

export const OverallProgressCard: React.FC<OverallProgressCardProps> = ({
  completedVideos,
  totalVideos,
}) => {
  const { theme } = useTheme();
  const percentage =
    totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;

  const widthAnim = useRef(new Animated.Value(Math.min(100, percentage))).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(100, percentage),
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width on isolated leaf bar maintains corner radius without layout side-effects
    }).start();
  }, [percentage, widthAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

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
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Overall Progress</Text>
        <Text style={[styles.percentText, { color: theme.colors.textPrimary }]}>{percentage}%</Text>
      </View>

      {/* Progress Track */}
      <View style={[styles.track, { backgroundColor: theme.colors.backgroundSubtle }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: animatedWidth,
              backgroundColor: theme.colors.mint,
            },
          ]}
        />
      </View>

      {/* Subtitle */}
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        {completedVideos} of {totalVideos} {totalVideos === 1 ? 'video' : 'videos'} completed
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: THEME.spacing.lg,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textNavy,
    letterSpacing: -0.2,
  },
  percentText: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.colors.textNavy,
  },
  track: {
    height: 10,
    backgroundColor: '#F0EBF8',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    backgroundColor: THEME.colors.mint,
    borderRadius: 5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
});
