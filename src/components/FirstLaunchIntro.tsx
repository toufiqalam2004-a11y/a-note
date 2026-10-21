import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../constants/theme';

export const INTRO_STORAGE_KEY = '@anote_has_completed_intro';

interface FirstLaunchIntroProps {
  visible: boolean;
  onGetStarted: () => void;
}

const { width } = Dimensions.get('window');

export const FirstLaunchIntro: React.FC<FirstLaunchIntroProps> = ({
  visible,
  onGetStarted,
}) => {
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Top Brand Header */}
          <View style={styles.topHeader}>
            <View style={styles.badgePill}>
              <Ionicons name="sparkles" size={14} color="#00D287" />
              <Text style={styles.badgeText}>WELCOME TO A NOTE</Text>
            </View>

            <View style={styles.brandTitleRow}>
              <Text style={styles.brandA}>A </Text>
              <Text style={styles.brandNote}>Note</Text>
            </View>
            <Text style={styles.tagline}>
              Client Video Quotas &bull; Revenue Reconciliation &bull; Offline
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
                  Set client payment advances and per-video rates. A Note automatically calculates video capacity and tracks completed vs. remaining workload.
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
                  Payments received are treated as advances. Track real earned revenue as videos are delivered, and monitor unused advance balances with zero guesswork.
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
                  Generate clean vector PDF statements and genuine multi-sheet Excel (.xlsx) workbooks. Share instantly via WhatsApp, email, or Google Drive.
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
                  Fast local SQLite storage keeps all your data strictly on your device. Complete videos hands-free using natural voice recognition.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handlePressGetStarted}
              activeOpacity={0.88}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <View style={styles.arrowCircle}>
                <Ionicons name="arrow-forward" size={18} color="#00D287" />
              </View>
            </TouchableOpacity>
            <Text style={styles.footerSubtext}>
              All client records are saved locally &amp; private on your phone.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0EBF8',
  },
  container: {
    flex: 1,
    backgroundColor: '#F0EBF8',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 20,
  },
  topHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
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
    marginBottom: 12,
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
    fontSize: 36,
    fontWeight: '900',
    color: '#1E1B38',
    letterSpacing: -0.5,
  },
  brandNote: {
    fontSize: 36,
    fontWeight: '900',
    color: '#00D287',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8AAB',
    marginTop: 6,
    textAlign: 'center',
  },
  featuresScroll: {
    flex: 1,
    marginVertical: 8,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: THEME.colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1B38',
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6B6684',
    lineHeight: 17,
  },
  footerContainer: {
    paddingTop: 12,
    alignItems: 'center',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#00D287',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#00D287',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  footerSubtext: {
    fontSize: 11,
    color: '#A09CB8',
    marginTop: 10,
    fontWeight: '500',
  },
});
