import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

export type TabKey = 'home' | 'clients';

interface NavigationBarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onMicPress: () => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentTab,
  onTabChange,
  onMicPress,
}) => {
  return (
    <View style={styles.navWrapper}>
      <View style={styles.navBar}>
        {/* Home Tab */}
        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'home' && styles.tabButtonActive]}
          onPress={() => onTabChange('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'home' ? 'grid' : 'grid-outline'}
            size={20}
            color={currentTab === 'home' ? THEME.colors.mint : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'home' && styles.tabLabelActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* Floating Voice Mic Button */}
        <View style={styles.micButtonContainer}>
          <TouchableOpacity
            style={styles.micButton}
            onPress={onMicPress}
            activeOpacity={0.85}
          >
            <View style={styles.micInner}>
              <Ionicons name="mic" size={26} color="#0B0C0E" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Clients Tab */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            currentTab === 'clients' && styles.tabButtonActive,
          ]}
          onPress={() => onTabChange('clients')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'clients' ? 'people' : 'people-outline'}
            size={20}
            color={currentTab === 'clients' ? THEME.colors.mint : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'clients' && styles.tabLabelActive,
            ]}
          >
            Clients
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navWrapper: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: THEME.spacing.md,
    backgroundColor: 'transparent',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.radius.full,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.full,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.mintGlow,
  },
  tabLabel: {
    fontSize: THEME.typography.sizes.xs,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabLabelActive: {
    color: THEME.colors.mint,
    fontWeight: '700',
  },
  micButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.mintBorder,
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  micInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
