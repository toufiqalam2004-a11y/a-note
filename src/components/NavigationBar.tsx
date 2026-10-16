import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

export type TabKey = 'home' | 'clients' | 'voice' | 'reports' | 'more';

interface NavigationBarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onVoicePress?: () => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentTab,
  onTabChange,
  onVoicePress,
}) => {
  return (
    <View style={styles.navWrapper}>
      <View style={styles.navBar}>
        {/* 1. Home Tab (Visually prominent with larger touch area) */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            styles.prominentTab,
            currentTab === 'home' && styles.tabButtonActiveHome,
          ]}
          onPress={() => onTabChange('home')}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Home Tab"
        >
          <Ionicons
            name={currentTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={currentTab === 'home' ? THEME.colors.mint : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'home' && styles.tabLabelActiveHome,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* 2. Clients Tab (Directly beside Home) */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            styles.clientsTab,
            currentTab === 'clients' && styles.tabButtonActiveClients,
          ]}
          onPress={() => onTabChange('clients')}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Clients Tab"
        >
          <Ionicons
            name={currentTab === 'clients' ? 'people' : 'people-outline'}
            size={20}
            color={currentTab === 'clients' ? THEME.colors.purple : THEME.colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'clients' && styles.tabLabelActiveClients,
            ]}
          >
            Clients
          </Text>
        </TouchableOpacity>

        {/* 3. Voice Tab (Visually prominent with 3D mint claymorphic badge) */}
        <TouchableOpacity
          style={[
            styles.tabButton,
            styles.prominentTab,
            styles.voiceTabPill,
          ]}
          onPress={() => {
            if (onVoicePress) onVoicePress();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Voice Control"
        >
          <View style={styles.voiceMicCircle}>
            <Ionicons name="mic" size={17} color="#FFFFFF" />
          </View>
          <Text style={styles.voiceLabel}>Voice</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navWrapper: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 16,
    paddingTop: 4,
    backgroundColor: 'transparent',
    alignItems: 'center',
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
    maxWidth: 380,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9999,
  },
  prominentTab: {
    paddingHorizontal: 16,
    gap: 6,
    minHeight: 44,
  },
  clientsTab: {
    paddingHorizontal: 14,
    gap: 6,
    minHeight: 44,
  },
  tabButtonActiveHome: {
    backgroundColor: '#E8FBF2', // Mint pastel pill
  },
  tabButtonActiveClients: {
    backgroundColor: '#F3EEFD', // Soft purple pastel pill
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabLabelActiveHome: {
    color: THEME.colors.mint,
    fontWeight: '800',
  },
  tabLabelActiveClients: {
    color: THEME.colors.purple,
    fontWeight: '800',
  },
  voiceTabPill: {
    backgroundColor: '#E8FBF2',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 135, 0.3)',
  },
  voiceMicCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.mint,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  voiceLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.mintDark,
  },
});
