import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { SPRING_PRESETS, TIMING_PRESETS } from '../utils/motion';
import { GlassView } from './GlassView';

interface VoiceToastProps {
  message: string | null;
  isError?: boolean;
  onDismiss: () => void;
}

export const VoiceToast: React.FC<VoiceToastProps> = ({
  message,
  isError = false,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-35)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    if (reduceMotion) {
      onDismiss();
      return;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -35,
        duration: TIMING_PRESETS.exit,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.95,
        duration: TIMING_PRESETS.exit,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: TIMING_PRESETS.exit,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  };

  useEffect(() => {
    if (message) {
      if (reduceMotion) {
        translateY.setValue(0);
        scale.setValue(1);
        opacity.setValue(1);
      } else {
        translateY.setValue(-35);
        scale.setValue(0.95);
        opacity.setValue(0);
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            ...SPRING_PRESETS.snappy,
          }),
          Animated.spring(scale, {
            toValue: 1,
            ...SPRING_PRESETS.snappy,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      }

      const timer = setTimeout(() => {
        handleDismiss();
      }, 3400);

      return () => clearTimeout(timer);
    }
  }, [message, translateY, scale, opacity, reduceMotion]);

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        { top: Math.max(insets.top, 24) + 12 },
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <GlassView
        style={[
          styles.toastGlass,
          isError ? styles.toastError : styles.toastSuccess,
        ]}
        intensity={60}
        borderRadius={22}
        borderWidth={1.5}
        borderColor={isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 210, 135, 0.4)'}
        backgroundColor={isError ? 'rgba(255, 245, 245, 0.92)' : 'rgba(245, 255, 250, 0.92)'}
      >
        <TouchableOpacity
          style={styles.toastTouchable}
          onPress={handleDismiss}
          activeOpacity={0.9}
          accessibilityRole="alert"
          accessibilityLabel={message}
        >
          <View
            style={[
              styles.iconBadge,
              isError ? styles.iconBadgeError : styles.iconBadgeSuccess,
            ]}
          >
            <Ionicons
              name={isError ? 'alert-circle' : 'checkmark-circle'}
              size={18}
              color={isError ? THEME.colors.danger : THEME.colors.mint}
            />
          </View>
          <Text style={styles.toastText} numberOfLines={2}>
            {message}
          </Text>
          <Ionicons name="close" size={16} color={THEME.colors.textMuted} style={styles.closeIcon} />
        </TouchableOpacity>
      </GlassView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 99999,
  },
  toastGlass: {
    borderRadius: 22,
    shadowRadius: 18,
    elevation: 8,
  },
  toastTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeSuccess: {
    backgroundColor: THEME.colors.mintLight,
  },
  iconBadgeError: {
    backgroundColor: THEME.colors.dangerLight,
  },
  toastSuccess: {
    borderColor: THEME.colors.mintBorder,
  },
  toastError: {
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textNavy,
  },
  closeIcon: {
    marginLeft: 4,
  },
});
