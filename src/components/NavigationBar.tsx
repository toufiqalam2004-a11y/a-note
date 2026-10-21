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
    <View style={[styles.navWrapper, { paddingBottom: bottomInset + 8 }]}>
      <View style={styles.navBar}>
        {/* 1. Home Tab Button */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            isHomeActive ? styles.tabButtonActiveHome : styles.tabButtonInactive,
          ]}
          onPress={() => onTabChange('home')}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Home Tab"
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

        {/* 2. Clients Tab Button */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            isClientsActive
              ? styles.tabButtonActiveClients
              : styles.tabButtonInactiveClients,
          ]}
          onPress={() => onTabChange('clients')}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Clients Tab"
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

        {/* 3. Voice Tab Button */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            isVoiceSelected
              ? styles.tabButtonActiveVoice
              : styles.tabButtonInactiveVoice,
          ]}
          onPress={() => {
            if (onVoicePress) {
              onVoicePress();
            } else {
              onTabChange('voice');
            }
          }}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Voice Control"
          accessibilityState={{ selected: isVoiceSelected }}
        >
          <Ionicons
            name="mic"
            size={22}
            color={THEME.colors.mint}
          />
          <Text
            style={[
              styles.tabLabel,
              isVoiceSelected
                ? styles.tabLabelActiveVoice
                : styles.tabLabelInactiveVoice,
            ]}
            numberOfLines={1}
          >
            Voice
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navWrapper: {
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: 6,
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
    paddingHorizontal: 6,
    paddingVertical: 6,
    width: '100%',
    maxWidth: 390,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.98)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 9999,
    minHeight: 46,
    marginHorizontal: 3,
    gap: 6,
  },
  // Inactive base states: distinct tappable button surfaces
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
  tabButtonInactiveVoice: {
    backgroundColor: 'rgba(0, 210, 135, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 135, 0.22)',
  },
  // Active pill states: vibrant claymorphic accents with soft elevation
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
  tabButtonActiveVoice: {
    backgroundColor: THEME.colors.mintLight,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 210, 135, 0.4)',
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  // Tab labels
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
  tabLabelInactiveVoice: {
    fontWeight: '700',
    color: THEME.colors.mintDark,
  },
  tabLabelActiveHome: {
    fontWeight: '800',
    color: THEME.colors.mintDark,
  },
  tabLabelActiveClients: {
    fontWeight: '800',
    color: THEME.colors.purpleDark,
  },
  tabLabelActiveVoice: {
    fontWeight: '800',
    color: THEME.colors.mintDark,
  },
});
