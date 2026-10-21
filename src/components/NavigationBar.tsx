import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';

export type TabKey = 'home' | 'clients' | 'voice' | 'reports' | 'more';

interface NavigationBarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onVoicePress?: () => void;
  isVoiceActive?: boolean;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentTab,
  onTabChange,
  onVoicePress,
  isVoiceActive = false,
}) => {
  const insets = useSafeAreaInsets();
  // Ensure the navigation bar is positioned strictly above the Android system navigation bar
  // (3-button navigation ~48dp, gesture navigation ~16-24dp, or minimum 12dp)
  const bottomInset = Math.max(insets.bottom, 12);

  const isHomeActive = currentTab === 'home';
  const isClientsActive = currentTab === 'clients';
  const isVoiceSelected = isVoiceActive || currentTab === 'voice';

  return (
    <View style={[styles.navWrapper, { paddingBottom: bottomInset + 6 }]}>
      <View style={styles.navBar}>
        {/* 1. LEFT TAB: Home */}
        <TouchableOpacity
          style={[
            styles.sideTabButton,
            isHomeActive ? styles.tabButtonActiveHome : styles.tabButtonInactive,
          ]}
          onPress={() => onTabChange('home')}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Home Dashboard"
          accessibilityState={{ selected: isHomeActive }}
        >
          <Ionicons
            name={isHomeActive ? 'home' : 'home-outline'}
            size={20}
            color={isHomeActive ? THEME.colors.mint : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              isHomeActive ? styles.tabLabelActiveHome : styles.tabLabelInactive,
            ]}
            numberOfLines={1}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* 2. CENTER TAB: Prominent Circular Voice Button (Visually Larger) */}
        <View style={styles.centerVoiceContainer}>
          <TouchableOpacity
            style={[
              styles.centerVoiceButton,
              isVoiceSelected
                ? styles.centerVoiceButtonActive
                : styles.centerVoiceButtonInactive,
            ]}
            onPress={() => {
              if (onVoicePress) {
                onVoicePress();
              } else {
                onTabChange('voice');
              }
            }}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Voice Control Assistant"
            accessibilityState={{ selected: isVoiceSelected }}
          >
            <View
              style={[
                styles.voiceInnerRing,
                isVoiceSelected && styles.voiceInnerRingActive,
              ]}
            >
              <Ionicons
                name="mic"
                size={26}
                color={isVoiceSelected ? '#FFFFFF' : THEME.colors.mint}
              />
            </View>
          </TouchableOpacity>
          <Text
            style={[
              styles.voiceLabel,
              isVoiceSelected ? styles.voiceLabelActive : styles.voiceLabelInactive,
            ]}
          >
            Voice
          </Text>
        </View>

        {/* 3. RIGHT TAB: Clients */}
        <TouchableOpacity
          style={[
            styles.sideTabButton,
            isClientsActive
              ? styles.tabButtonActiveClients
              : styles.tabButtonInactiveClients,
          ]}
          onPress={() => onTabChange('clients')}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Clients Directory"
          accessibilityState={{ selected: isClientsActive }}
        >
          <Ionicons
            name={isClientsActive ? 'people' : 'people-outline'}
            size={20}
            color={isClientsActive ? THEME.colors.purple : '#8E8AAB'}
          />
          <Text
            style={[
              styles.tabLabel,
              isClientsActive
                ? styles.tabLabelActiveClients
                : styles.tabLabelInactiveClientsText,
            ]}
            numberOfLines={1}
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
    paddingTop: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
    width: '100%',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: '100%',
    maxWidth: 390,
    minHeight: 64,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.98)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  // Side tabs: Home (Left) & Clients (Right)
  sideTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9999,
    minHeight: 46,
    marginHorizontal: 4,
    gap: 6,
  },
  tabButtonInactive: {
    backgroundColor: 'rgba(240, 235, 248, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(142, 138, 171, 0.15)',
  },
  tabButtonInactiveClients: {
    backgroundColor: 'rgba(240, 235, 248, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(142, 138, 171, 0.18)',
  },
  tabButtonActiveHome: {
    backgroundColor: THEME.colors.mintLight,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 210, 135, 0.35)',
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  tabButtonActiveClients: {
    backgroundColor: THEME.colors.purpleLight,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 92, 252, 0.35)',
    shadowColor: THEME.colors.purple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 2,
  },
  // Center Voice Tab: Visually Larger & Prominent
  centerVoiceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    top: -4, // Subtle elevated lift
  },
  centerVoiceButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  centerVoiceButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 210, 135, 0.3)',
  },
  centerVoiceButtonActive: {
    backgroundColor: THEME.colors.mint,
    borderColor: '#FFFFFF',
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  voiceInnerRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 210, 135, 0.12)',
  },
  voiceInnerRingActive: {
    backgroundColor: 'transparent',
  },
  voiceLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  voiceLabelInactive: {
    fontWeight: '700',
    color: THEME.colors.mintDark,
  },
  voiceLabelActive: {
    fontWeight: '900',
    color: THEME.colors.mintDark,
  },
  // Side Tab Labels
  tabLabel: {
    fontSize: 13,
  },
  tabLabelInactive: {
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabLabelInactiveClientsText: {
    fontWeight: '600',
    color: '#7D789B',
  },
  tabLabelActiveHome: {
    fontWeight: '800',
    color: THEME.colors.mintDark,
  },
  tabLabelActiveClients: {
    fontWeight: '800',
    color: THEME.colors.purpleDark,
  },
});
