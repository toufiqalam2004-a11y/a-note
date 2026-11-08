import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { PressableScale } from './PressableScale';
import { SPRING_PRESETS } from '../utils/motion';

import { GlassView } from './GlassView';

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
  const bottomInset = Math.max(insets.bottom, 12);
  const { theme, isDark } = useTheme();

  const isHomeActive = currentTab === 'home';
  const isClientsActive = currentTab === 'clients';
  const isVoiceSelected = isVoiceActive || currentTab === 'voice';

  // Micro spring bounce on tab icons when selected
  const homeIconScale = useRef(new Animated.Value(1)).current;
  const clientsIconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isHomeActive) {
      Animated.sequence([
        Animated.spring(homeIconScale, {
          toValue: 1.15,
          ...SPRING_PRESETS.bouncy,
        }),
        Animated.spring(homeIconScale, {
          toValue: 1,
          ...SPRING_PRESETS.snappy,
        }),
      ]).start();
    }
  }, [isHomeActive, homeIconScale]);

  useEffect(() => {
    if (isClientsActive) {
      Animated.sequence([
        Animated.spring(clientsIconScale, {
          toValue: 1.15,
          ...SPRING_PRESETS.bouncy,
        }),
        Animated.spring(clientsIconScale, {
          toValue: 1,
          ...SPRING_PRESETS.snappy,
        }),
      ]).start();
    }
  }, [isClientsActive, clientsIconScale]);

  return (
    <View style={[styles.navWrapper, { paddingBottom: bottomInset + 6 }]}>
      <GlassView
        style={[
          styles.navBar,
          {
            shadowColor: theme.colors.shadowColor,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.95)',
          },
        ]}
        intensity={isDark ? 65 : 55}
        borderRadius={9999}
        borderWidth={1.5}
        borderColor={isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.95)'}
        backgroundColor={isDark ? 'rgba(24, 28, 43, 0.92)' : 'rgba(255, 255, 255, 0.85)'}
      >
        {/* 1. LEFT TAB: Home */}
        <View style={styles.sideTabContainer}>
          <PressableScale
            style={[
              styles.sideTabButton,
              isHomeActive
                ? [styles.tabButtonActiveHome, { backgroundColor: theme.colors.mintLight, borderColor: theme.colors.mintBorder }]
                : [
                    styles.tabButtonInactive,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(240, 235, 248, 0.45)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(142, 138, 171, 0.15)',
                    },
                  ],
            ]}
            onPress={() => onTabChange('home')}
            activeScale={0.94}
            accessibilityRole="button"
            accessibilityLabel="Home Dashboard"
            accessibilityState={{ selected: isHomeActive }}
          >
            <Animated.View style={{ transform: [{ scale: homeIconScale }] }}>
              <Ionicons
                name={isHomeActive ? 'home' : 'home-outline'}
                size={20}
                color={isHomeActive ? theme.colors.mint : theme.colors.textMuted}
              />
            </Animated.View>
            <Text
              style={[
                styles.tabLabel,
                isHomeActive
                  ? [styles.tabLabelActiveHome, { color: theme.colors.mintDark }]
                  : [styles.tabLabelInactive, { color: theme.colors.textMuted }],
              ]}
              numberOfLines={1}
            >
              Home
            </Text>
          </PressableScale>
        </View>

        {/* 2. CENTER TAB: Prominent Circular Voice Button with tactile spring */}
        <View style={styles.centerVoiceContainer}>
          <PressableScale
            style={[
              styles.centerVoiceButton,
              isVoiceSelected
                ? [
                    styles.centerVoiceButtonActive,
                    {
                      backgroundColor: theme.colors.mint,
                      borderColor: '#FFFFFF',
                      shadowColor: theme.colors.mint,
                    },
                  ]
                : [
                    styles.centerVoiceButtonInactive,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.mintBorder,
                      shadowColor: theme.colors.mint,
                    },
                  ],
            ]}
            onPress={() => {
              if (onVoicePress) {
                onVoicePress();
              } else {
                onTabChange('voice');
              }
            }}
            activeScale={0.90}
            accessibilityRole="button"
            accessibilityLabel="Voice Control Assistant"
            accessibilityState={{ selected: isVoiceSelected }}
          >
            <View
              style={[
                styles.voiceInnerRing,
                isVoiceSelected
                  ? styles.voiceInnerRingActive
                  : { backgroundColor: theme.colors.mintLight },
              ]}
            >
              <Ionicons
                name="mic"
                size={26}
                color={isVoiceSelected ? '#FFFFFF' : theme.colors.mint}
              />
            </View>
          </PressableScale>
          <Text
            style={[
              styles.voiceLabel,
              isVoiceSelected
                ? [styles.voiceLabelActive, { color: theme.colors.mintDark }]
                : [styles.voiceLabelInactive, { color: theme.colors.mintDark }],
            ]}
          >
            Voice
          </Text>
        </View>

        {/* 3. RIGHT TAB: Clients */}
        <View style={styles.sideTabContainer}>
          <PressableScale
            style={[
              styles.sideTabButton,
              isClientsActive
                ? [styles.tabButtonActiveClients, { backgroundColor: theme.colors.purpleLight, borderColor: theme.colors.purpleBorder }]
                : [
                    styles.tabButtonInactiveClients,
                    {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(240, 235, 248, 0.55)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(142, 138, 171, 0.18)',
                    },
                  ],
            ]}
            onPress={() => onTabChange('clients')}
            activeScale={0.94}
            accessibilityRole="button"
            accessibilityLabel="Clients Directory"
            accessibilityState={{ selected: isClientsActive }}
          >
            <Animated.View style={{ transform: [{ scale: clientsIconScale }] }}>
              <Ionicons
                name={isClientsActive ? 'people' : 'people-outline'}
                size={20}
                color={isClientsActive ? theme.colors.purple : theme.colors.textMuted}
              />
            </Animated.View>
            <Text
              style={[
                styles.tabLabel,
                isClientsActive
                  ? [styles.tabLabelActiveClients, { color: theme.colors.purpleDark }]
                  : [styles.tabLabelInactiveClientsText, { color: theme.colors.textMuted }],
              ]}
              numberOfLines={1}
            >
              Clients
            </Text>
          </PressableScale>
        </View>
      </GlassView>
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
  sideTabContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  sideTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9999,
    minHeight: 46,
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
  centerVoiceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    minWidth: 46,
    top: -4,
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
    textAlign: 'center',
    includeFontPadding: false,
  },
  voiceLabelInactive: {
    fontWeight: '700',
    color: THEME.colors.mintDark,
  },
  voiceLabelActive: {
    fontWeight: '900',
    color: THEME.colors.mintDark,
  },
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
