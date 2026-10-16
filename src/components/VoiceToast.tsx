import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

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
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss());
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [message, translateY, opacity, onDismiss]);

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        isError ? styles.toastError : styles.toastSuccess,
        { transform: [{ translateY }], opacity },
      ]}
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
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
});
