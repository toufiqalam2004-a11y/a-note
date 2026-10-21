import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface HeaderProps {
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuPress,
  onNotificationPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Left 3D Hamburger Menu Button */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onMenuPress}
        activeOpacity={0.75}
      >
        <Ionicons name="menu-outline" size={22} color={THEME.colors.textPrimary} />
      </TouchableOpacity>

      {/* Center Brand / App Title */}
      <View style={styles.brandContainer}>
        <View style={styles.brandRowWithLogo}>
          <Image
            source={require('../../assets/images/anote-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.titleA}>A </Text>
              <Text style={styles.titleNote}>Note</Text>
            </View>
            <Text style={styles.subtitle}>Client Video &amp; Delivery Tracker</Text>
          </View>
        </View>
      </View>

      {/* Right 3D Notification Bell Button */}
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onNotificationPress}
        activeOpacity={0.75}
      >
        <Ionicons name="notifications-outline" size={20} color={THEME.colors.textPrimary} />
        {/* Soft pink notification dot */}
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    paddingBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
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
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D6D',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRowWithLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleA: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.textNavy,
    letterSpacing: -0.3,
  },
  titleNote: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.mint,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: THEME.typography.sizes.xs,
    color: THEME.colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
});
