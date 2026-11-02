import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../constants/theme';
import { PressableScale } from './PressableScale';

export const INTRO_STORAGE_KEY = '@anote_has_completed_intro';

interface FirstLaunchIntroProps {
  visible: boolean;
  onGetStarted: () => void;
}

export const FirstLaunchIntro: React.FC<FirstLaunchIntroProps> = ({
  visible,
  onGetStarted,
}) => {
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => setReduceMotion(enabled))
      .catch(() => {});

    if (visible) {
      if (reduceMotion) {
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
        logoScale.setValue(1);
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 6,
            tension: 45,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible, reduceMotion, fadeAnim, slideAnim, logoScale]);

  const handlePressGetStarted = async () => {
    try {
      await AsyncStorage.setItem(INTRO_STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('[A Note] Could not persist intro status:', e);
    }
    onGetStarted();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={handlePressGetStarted}
    >
      <View style={[styles.rootContainer, { paddingTop: insets.top }]}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top Brand Header */}
          <View style={styles.topHeader}>
            <Animated.View
              style={[
                styles.logoWrapper,
                { transform: [{ scale: logoScale }] },
              ]}
            >
              <Image
                source={require('../../assets/images/anote-logo.png')}
                style={styles.introLogo}
                resizeMode="contain"
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.badgePill,
                { transform: [{ scale: logoScale }] },
              ]}
            >
              <Ionicons name="sparkles" size={13} color="#00D287" />
              <Text style={styles.badgeText}>WELCOME TO A NOTE</Text>
            </Animated.View>

            <View style={styles.brandTitleRow}>
              <Text style={styles.brandA}>A </Text>
              <Text style={styles.brandNote}>Note</Text>
            </View>
            <Text style={styles.tagline}>
              Client Video Quotas &bull; Revenue Tracking &bull; Offline
            </Text>
          </View>

          {/* Feature Highlights Cards */}
          <ScrollView
            style={styles.featuresScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Feature 1 */}
            <View style={styles.featureCard}>
              <View style={[styles.iconBox, { backgroundColor: '#EBFBF5' }]}>
                <Ionicons name="videocam" size={22} color="#00D287" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Auto Video Quotas</Text>
                <Text style={styles.featureDesc}>
                  Set client payment advances and per-video rates. A Note automatically calculates video capacity and tracks remaining workload.
                </Text>
              </View>
            </View>

            {/* Feature 2 */}
            <View style={styles.featureCard}>
              <View style={[styles.iconBox, { backgroundColor: '#F3EFFF' }]}>
                <Ionicons name="cash-outline" size={22} color="#7C5CFC" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Advance Reconciliation</Text>
                <Text style={styles.featureDesc}>
                  Payments received are tracked as advances. Money is officially earned as videos are delivered, with zero revenue guesswork.
                </Text>
              </View>
            </View>

            {/* Feature 3 */}
            <View style={styles.featureCard}>
              <View style={[styles.iconBox, { backgroundColor: '#FFF7E6' }]}>
                <Ionicons name="document-text-outline" size={22} color="#F59E0B" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Real PDF &amp; Excel Reports</Text>
                <Text style={styles.featureDesc}>
                  Export genuine vector PDF statements and multi-sheet Excel (.xlsx) workbooks directly to WhatsApp, Drive, or email.
                </Text>
              </View>
            </View>

            {/* Feature 4 */}
            <View style={styles.featureCard}>
              <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="mic" size={22} color="#3B82F6" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Offline &amp; Voice Commands</Text>
                <Text style={styles.featureDesc}>
                  Say “Rahul, video 5 is done” or type commands to mark deliveries without touching checkboxes.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <PressableScale
              style={styles.getStartedButton}
              onPress={handlePressGetStarted}
              activeScale={0.96}
              accessibilityRole="button"
              accessibilityLabel="Get Started with A Note"
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <View style={styles.arrowCircle}>
                <Ionicons name="arrow-forward" size={18} color="#00D287" />
              </View>
            </PressableScale>
            <Text style={styles.footerSubtext}>
              All data is saved locally on your phone &bull; 100% private
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#F0EBF8',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topHeader: {
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 12,
  },
  logoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  introLogo: {
    width: 64,
    height: 64,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E1B38',
    letterSpacing: 1.2,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandA: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1E1B38',
    letterSpacing: -0.5,
  },
  brandNote: {
    fontSize: 34,
    fontWeight: '900',
    color: '#00D287',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    color: '#8E8AAB',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  featuresScroll: {
    flex: 1,
    marginVertical: 4,
  },
  scrollContent: {
    gap: 10,
    paddingVertical: 4,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B38',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 11,
    color: '#6E6A8A',
    lineHeight: 16,
  },
  footerContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  getStartedButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1B38',
    paddingVertical: 14,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#1E1B38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  arrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSubtext: {
    fontSize: 11,
    color: '#8E8AAB',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
});
